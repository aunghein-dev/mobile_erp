import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import axios from "axios";
import { AppPressable } from "@/shared/components/ui/AppPressable";
import { FlashList } from "@shopify/flash-list";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Screen } from "@/shared/components/layout/Screen";
import { AppInput } from "@/shared/components/ui/AppInput";
import { AppButton } from "@/shared/components/ui/AppButton";
import { Card } from "@/shared/components/ui/Card";
import { DrawerSheet } from "@/shared/components/ui/DrawerSheet";
import { SectionTitle } from "@/shared/components/ui/SectionTitle";
import { QuantityBadge } from "@/shared/components/ui/QuantityBadge";
import { EmptyState, ErrorState, LoadingState } from "@/shared/components/ui/StateViews";
import { brandImages } from "@/shared/assets/branding/images";
import { useFilteredStocks } from "@/features/hooks/inventory/useStocks";
import { useStockCheck } from "@/features/hooks/inventory/useStockCheck";
import { useCustomer } from "@/features/hooks/inventory/useCustomer";
import { useCurrency } from "@/features/hooks/business/useCurrency";
import { useUser } from "@/features/hooks/user/useUser";
import { useShops } from "@/features/hooks/business/useShops";
import { useInfo } from "@/features/hooks/business/useInfo";
import { useTranslation } from "@/features/hooks/useTranslation";
import { ENV } from "@/app/config/env";
import { rawApi } from "@/shared/lib/api/rawClient";
import { getErrorMessage } from "@/shared/lib/api/errors";
import { routes } from "@/shared/lib/api/routes";
import { formatBatchId } from "@/shared/lib/utils/format";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useCartStore } from "@/shared/store/useCartStore";
import { useCheckoutCustomerStore } from "@/shared/store/useCheckoutCustomerStore";
import { useDiscountStore } from "@/shared/store/useDiscountStore";
import { usePaymentStore, type PaymentMethodStore } from "@/shared/store/usePaymentStore";
import { useCheckoutPaymentStore } from "@/shared/store/useCheckoutPaymentStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import { useRememberLoginStore } from "@/shared/store/useRememberLoginStore";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { DEFAULT_LIST_PERFORMANCE_PROPS } from "@/shared/constants/listPerformance";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import type { RouteProp } from "@react-navigation/native";
import type { AppDrawerParamList } from "@/app/navigation/types";
import type { CartGroup, CartItem, WholesaleTier } from "@/shared/types/cart";
import type { StockGroup, StockItem } from "@/shared/types/stock";
import type { Customer } from "@/shared/types/customer";

type ProductSelection = {
  color: string;
  size: string | null;
};

type RemainingVariant = {
  variant: StockItem;
  remainingQty: number;
};

type ReceiptLine = {
  key: string;
  groupName: string;
  itemId: number;
  sizing: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
};

type CheckoutResult = {
  orderNo: string;
  lines: ReceiptLine[];
  soldQty: number;
  grandTotal: number;
};

type WholesaleStatus = {
  totalQty: number;
  activeTier: WholesaleTier | null;
  nextTier: WholesaleTier | null;
  activeTierIndex: number | null;
  nextTierIndex: number | null;
  appliedPrice: number;
  isWholesale: boolean;
  qtyToNext: number;
};

type PaymentOption = {
  key: PaymentMethodStore;
  label: string;
  description: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
};

type VoucherAction = "print" | "save" | "share" | null;

const HOME_STOCK_PAGE_SIZE = 8;

type HeaderShape = {
  get?: (name: string) => string | null | undefined;
  [key: string]: unknown;
};

function createOrderNo() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function normalizeTokenCandidate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

function escapeVoucherHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isNetworkAxiosError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  const code = String(error.code ?? "").toUpperCase();
  return (
    !status &&
    (code === "ERR_NETWORK" ||
      code === "ECONNABORTED" ||
      code === "ENOTFOUND" ||
      code === "ETIMEDOUT" ||
      String(error.message ?? "").toLowerCase().includes("network error"))
  );
}

function getHttpStatus(error: unknown) {
  if (axios.isAxiosError(error)) {
    return Number(error.response?.status ?? 0) || null;
  }
  if (!error || typeof error !== "object") return null;
  const status = (error as { status?: unknown }).status;
  const numericStatus = Number(status);
  return Number.isFinite(numericStatus) && numericStatus > 0 ? numericStatus : null;
}

function toHeaderString(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
      .filter(Boolean)
      .join("; ");
  }
  return null;
}

function getHeaderValue(headers: HeaderShape | undefined, name: string) {
  if (!headers) return null;
  const fromGetterRaw =
    typeof headers.get === "function" ? headers.get(name) ?? headers.get(name.toLowerCase()) : null;
  const fromGetter = toHeaderString(fromGetterRaw);
  if (fromGetter) return fromGetter;
  return (
    toHeaderString(headers[name]) ??
    toHeaderString(headers[name.toLowerCase()]) ??
    toHeaderString(headers[name.toUpperCase()])
  );
}

function extractCookieToken(headers: HeaderShape | undefined) {
  const raw = getHeaderValue(headers, "set-cookie");
  if (!raw) return null;
  const match = raw.match(/(?:^|[;,]\s*)token=([^;,\s]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function extractCookieTokenFromRawHeaderString(rawHeaders: unknown) {
  if (typeof rawHeaders !== "string" || !rawHeaders.trim()) return null;
  const cookieMatches = rawHeaders.match(/set-cookie:\s*([^\r\n]+)/gi) ?? [];
  for (const line of cookieMatches) {
    const cookiePart = line.replace(/^set-cookie:\s*/i, "");
    const tokenMatch = cookiePart.match(/(?:^|[;,]\s*)token=([^;,\s]+)/i);
    if (!tokenMatch?.[1]) continue;
    try {
      return decodeURIComponent(tokenMatch[1]);
    } catch {
      return tokenMatch[1];
    }
  }
  return null;
}

function extractCookieTokenFromRequest(request: unknown) {
  if (!request || typeof request !== "object") return null;
  const source = request as {
    getAllResponseHeaders?: () => string;
    responseHeaders?: string;
    _responseHeaders?: string;
    _headers?: string;
  };
  const fromGetter =
    typeof source.getAllResponseHeaders === "function" ? source.getAllResponseHeaders() : null;
  const fromNamed =
    source.responseHeaders ?? source._responseHeaders ?? source._headers ?? null;
  return (
    extractCookieTokenFromRawHeaderString(fromGetter) ??
    extractCookieTokenFromRawHeaderString(fromNamed)
  );
}

function resolveCheckoutAuthToken() {
  const sessionToken = normalizeTokenCandidate(useAuthStore.getState().sessionToken);
  return sessionToken ?? ENV.AUTH_TOKEN ?? null;
}

function normalizeColorHex(value?: string) {
  if (!value) return "#9AA4B2";
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "NULL") return "#9AA4B2";
  const validHex = /^#([0-9A-Fa-f]{3}){1,2}$/.test(trimmed);
  return validHex ? trimmed : "#9AA4B2";
}

function normalizeImageUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "NULL") return null;
  return trimmed;
}

function appendCheckoutPart(formData: FormData, field: string, value: unknown) {
  const payload = JSON.stringify(value);
  try {
    const blob = new Blob([payload], { type: "application/json" });
    formData.append(field, blob);
  } catch {
    formData.append(field, payload);
  }
}

async function writeJsonPartFile(field: string, value: unknown) {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return null;
  const fileUri = `${cacheDir}${field}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(value), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
}

async function buildCheckoutFormData(payload: {
  misInfo: Record<string, unknown>;
  tempJson: Array<Record<string, unknown>>;
  paymentRelate: Record<string, unknown>;
}) {
  const formData = new FormData();
  const cleanupUris: string[] = [];

  const filePartFields: Array<{
    name: "misInfo" | "tempJson" | "paymentRelate";
    value: Record<string, unknown> | Array<Record<string, unknown>>;
  }> = [
    { name: "misInfo", value: payload.misInfo },
    { name: "tempJson", value: payload.tempJson },
    { name: "paymentRelate", value: payload.paymentRelate },
  ];

  for (const field of filePartFields) {
    try {
      const fileUri = await writeJsonPartFile(field.name, field.value);
      if (!fileUri) {
        appendCheckoutPart(formData, field.name, field.value);
        continue;
      }
      cleanupUris.push(fileUri);
      const part = {
        uri: fileUri,
        name: `${field.name}.json`,
        type: "application/json",
      };
      formData.append(field.name, part as unknown as Blob);
    } catch {
      appendCheckoutPart(formData, field.name, field.value);
    }
  }

  const cleanup = async () => {
    await Promise.allSettled(
      cleanupUris.map(async (uri) => {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        } catch {}
      })
    );
  };

  return { formData, cleanup };
}

async function postCheckoutMultipart(params: {
  url: string;
  payload: {
    misInfo: Record<string, unknown>;
    tempJson: Array<Record<string, unknown>>;
    paymentRelate: Record<string, unknown>;
  };
  token: string;
}) {
  const { url, payload, token } = params;
  const { formData, cleanup } = await buildCheckoutFormData(payload);
  const absoluteUrl = `${ENV.API_URL}${url}`;

  try {
    await axios.post(absoluteUrl, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: false,
      timeout: 45000,
    });
    return;
  } catch (error) {
    if (!isNetworkAxiosError(error)) {
      throw error;
    }
  }
  try {
    const fetchResponse = await fetch(absoluteUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (fetchResponse.ok) return;

    const raw = await fetchResponse.text().catch(() => "");
    let message = `Checkout failed (HTTP ${fetchResponse.status})`;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { message?: unknown };
        if (parsed?.message) {
          message = `${String(parsed.message)} (HTTP ${fetchResponse.status})`;
        } else {
          message = `${raw} (HTTP ${fetchResponse.status})`;
        }
      } catch {
        message = `${raw} (HTTP ${fetchResponse.status})`;
      }
    }

    const err = new Error(message) as Error & { status?: number };
    err.status = fetchResponse.status;
    throw err;
  } finally {
    await cleanup();
  }
}

async function reauthenticateForCheckout() {
  const remembered = useRememberLoginStore.getState();
  if (!remembered.remember) return false;
  const username = remembered.username.trim();
  const password = remembered.password;
  if (!username || !password) return false;

  try {
    const response = await rawApi.post<{
      token?: string;
      accessToken?: string;
      access_token?: string;
      jwt?: string;
      jwtToken?: string;
      bearerToken?: string;
    }>(
      routes.auth.login,
      { username, password },
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      }
    );
    const nextToken =
      normalizeTokenCandidate(response.data?.token) ??
      normalizeTokenCandidate(response.data?.accessToken) ??
      normalizeTokenCandidate(response.data?.access_token) ??
      normalizeTokenCandidate(response.data?.jwt) ??
      normalizeTokenCandidate(response.data?.jwtToken) ??
      normalizeTokenCandidate(response.data?.bearerToken) ??
      normalizeTokenCandidate(getHeaderValue(response.headers as HeaderShape | undefined, "authorization")) ??
      normalizeTokenCandidate(getHeaderValue(response.headers as HeaderShape | undefined, "x-auth-token")) ??
      normalizeTokenCandidate(getHeaderValue(response.headers as HeaderShape | undefined, "x-access-token")) ??
      normalizeTokenCandidate(getHeaderValue(response.headers as HeaderShape | undefined, "token")) ??
      extractCookieToken(response.headers as HeaderShape | undefined) ??
      extractCookieTokenFromRequest(response.request) ??
      resolveCheckoutAuthToken();
    useAuthStore.getState().setSession({
      authenticated: true,
      token: nextToken,
    });
    return true;
  } catch {
    return false;
  }
}

async function submitCheckoutWebLike(params: {
  url: string;
  payload: {
    misInfo: Record<string, unknown>;
    tempJson: Array<Record<string, unknown>>;
    paymentRelate: Record<string, unknown>;
  };
}) {
  const { url, payload } = params;
  const authToken = resolveCheckoutAuthToken();
  if (!authToken) {
    throw new Error("Session expired. Please sign in again.");
  }

  let initialError: unknown = null;
  try {
    await postCheckoutMultipart({
      url,
      payload,
      token: authToken,
    });
    return;
  } catch (error) {
    initialError = error;
    if (getHttpStatus(error) !== 401) {
      throw error;
    }
  }

  const refreshed = await reauthenticateForCheckout();
  if (!refreshed) {
    throw initialError ?? new Error("Session expired. Please sign in again.");
  }

  const refreshedToken = resolveCheckoutAuthToken();
  if (!refreshedToken) {
    throw new Error("Session expired. Please sign in again.");
  }

  await postCheckoutMultipart({
    url,
    payload,
    token: refreshedToken,
  });
}

async function resolveCheckoutBusinessId(params: {
  preferredBizId: number | null;
  businessIdFromHook?: number | null;
  businessIdFromUser?: number | null;
  businessIdFromOffline?: number | null;
}) {
  const directCandidates = [
    params.businessIdFromHook,
    params.businessIdFromUser,
    params.businessIdFromOffline,
    params.preferredBizId,
  ];

  for (const candidate of directCandidates) {
    const resolved = Number(candidate);
    if (Number.isFinite(resolved) && resolved > 0) {
      return resolved;
    }
  }

  const response = await rawApi.get<Record<string, unknown>>(routes.business.infoMe, {
    withCredentials: true,
  });
  const payload = response.data ?? {};
  const resolved = Number((payload as { businessId?: unknown }).businessId);
  if (!Number.isFinite(resolved) || resolved <= 0) {
    throw new Error("Business is not available for checkout.");
  }
  return resolved;
}

function cartQtyForItem(cart: CartGroup[], groupId: number, itemId: number) {
  const group = cart.find((entry) => entry.groupId === groupId);
  if (!group) return 0;
  return group.item
    .filter((entry) => entry.itemId === itemId)
    .reduce((sum, entry) => sum + entry.boughtQty, 0);
}

function getGroupQty(items: CartItem[]) {
  return items.reduce((sum, entry) => sum + entry.boughtQty, 0);
}

function getGroupQtyFromCart(cart: CartGroup[], groupId: number) {
  const group = cart.find((entry) => entry.groupId === groupId);
  return group ? getGroupQty(group.item) : 0;
}

function getWholesaleStatus(
  wholesaleTiers: WholesaleTier[],
  totalQty: number,
  baseUnitPrice: number
): WholesaleStatus {
  if (!wholesaleTiers.length) {
    return {
      totalQty,
      activeTier: null,
      nextTier: null,
      activeTierIndex: null,
      nextTierIndex: null,
      appliedPrice: baseUnitPrice,
      isWholesale: false,
      qtyToNext: 0,
    };
  }

  const sortedAsc = [...wholesaleTiers].sort((a, b) => a.minQuantity - b.minQuantity);
  const sortedDesc = [...sortedAsc].sort((a, b) => b.minQuantity - a.minQuantity);
  const activeTier = sortedDesc.find((entry) => totalQty >= entry.minQuantity) ?? null;
  const nextTier = sortedAsc.find((entry) => totalQty < entry.minQuantity) ?? null;
  const activeTierIndex =
    activeTier == null
      ? null
      : sortedAsc.findIndex(
          (entry) =>
            entry.minQuantity === activeTier.minQuantity &&
            entry.price === activeTier.price
        ) + 1;
  const nextTierIndex =
    nextTier == null
      ? null
      : sortedAsc.findIndex(
          (entry) => entry.minQuantity === nextTier.minQuantity && entry.price === nextTier.price
        ) + 1;

  return {
    totalQty,
    activeTier,
    nextTier,
    activeTierIndex: activeTierIndex || null,
    nextTierIndex: nextTierIndex || null,
    appliedPrice: activeTier?.price ?? baseUnitPrice,
    isWholesale: activeTier != null,
    qtyToNext: nextTier ? Math.max(0, nextTier.minQuantity - totalQty) : 0,
  };
}

export default function HomeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>();
  const route = useRoute<RouteProp<AppDrawerParamList, "Home">>();
  const bizId = useBusinessStore((s) => s.bizId);
  const businessName = useBusinessStore((s) => s.businessName);
  const { items, isLoading, refresh, error } = useFilteredStocks();
  const { checkStockByBarcode } = useStockCheck();
  const { customers } = useCustomer();
  const { cart, total, totalQty, addItem, removeItem, deleteItem, clearCart } = useCartStore();
  const checkoutCustomer = useCheckoutCustomerStore((s) => s.checkoutCustomer);
  const setCheckoutCustomer = useCheckoutCustomerStore((s) => s.setCheckoutCustomer);
  const clearCheckoutCustomer = useCheckoutCustomerStore((s) => s.clearCheckoutCustomer);
  const discountAmt = useDiscountStore((s) => s.discountAmt);
  const setDiscountAmt = useDiscountStore((s) => s.setDiscountAmt);
  const selectedPayment = usePaymentStore((s) => s.selectedPayment);
  const setSelectedPayment = usePaymentStore((s) => s.setSelectedPayment);
  const setCheckoutPaid = useCheckoutPaymentStore((s) => s.setPaid);
  const setCheckoutChange = useCheckoutPaymentStore((s) => s.setChange);
  const offlineUser = useOfflineUserStore((s) => s.user);
  const { currency, selectedBase, display: displayMoney } = useCurrency();
  const { shops } = useShops();
  const { business } = useInfo();
  const { data: currentUser } = useUser();
  const { t } = useTranslation();

  const [search, setSearch] = useState("");
  const [cartVisible, setCartVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [discountInput, setDiscountInput] = useState("");
  const [paidInput, setPaidInput] = useState("");
  const [stockPage, setStockPage] = useState(0);
  const [selectionByGroup, setSelectionByGroup] = useState<Record<number, ProductSelection>>({});
  const [receipt, setReceipt] = useState<CheckoutResult | null>(null);
  const [voucherAction, setVoucherAction] = useState<VoucherAction>(null);
  const grandTotal = total - discountAmt;
  const selectedCurrencyRate = currency.rates[selectedBase]?.baseInRate ?? 1;
  const paidInSelectedCurrency = Number(paidInput || 0);
  const paidAmount = Number.isFinite(paidInSelectedCurrency)
    ? paidInSelectedCurrency * selectedCurrencyRate
    : 0;
  const changeAmount = paidAmount - total;
  const hasAttachedCustomer = Boolean(checkoutCustomer.cid?.trim());
  const checkoutCustomerName = hasAttachedCustomer ? checkoutCustomer.name : "Walk-in customer";
  const checkoutCustomerMeta = hasAttachedCustomer
    ? `${checkoutCustomer.phoneNo1 || "-"} • ${checkoutCustomer.typeOfCustomer || "-"}`
    : "No customer attached";

  const stockList = useMemo(() => {
    const normalizedItems = Array.isArray(items) ? items : [];
    if (!search.trim()) return normalizedItems;
    const keyword = search.trim().toLowerCase();
    return normalizedItems.filter((stock) => {
      const groupName = String(stock.groupName ?? "").toLowerCase();
      const groupId = String(stock.groupId ?? "");
      const variants = Array.isArray(stock.items) ? stock.items : [];
      const variantMatched = variants.some((item) => {
        const barcode = String(item?.barcodeNo ?? "").toLowerCase();
        const size = String(item?.sizing ?? "").toLowerCase();
        return barcode.includes(keyword) || size.includes(keyword);
      });
      return groupName.includes(keyword) || groupId.includes(keyword) || variantMatched;
    });
  }, [items, search]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const keyword = customerSearch.trim().toLowerCase();
    return customers.filter((entry) => {
      return (
        entry.name.toLowerCase().includes(keyword) ||
        entry.cid.toLowerCase().includes(keyword) ||
        entry.phoneNo1.toLowerCase().includes(keyword) ||
        entry.typeOfCustomer.toLowerCase().includes(keyword)
      );
    });
  }, [customerSearch, customers]);

  const totalStockPages = useMemo(
    () => Math.max(1, Math.ceil(stockList.length / HOME_STOCK_PAGE_SIZE)),
    [stockList.length]
  );

  const pagedStockList = useMemo(() => {
    const start = stockPage * HOME_STOCK_PAGE_SIZE;
    return stockList.slice(start, start + HOME_STOCK_PAGE_SIZE);
  }, [stockList, stockPage]);

  const stockRangeLabel = useMemo(() => {
    if (!stockList.length) return "0 of 0";
    const start = stockPage * HOME_STOCK_PAGE_SIZE + 1;
    const end = Math.min(stockList.length, start + HOME_STOCK_PAGE_SIZE - 1);
    return `${start}-${end} of ${stockList.length}`;
  }, [stockList.length, stockPage]);

  useEffect(() => {
    setDiscountInput(discountAmt ? String(discountAmt) : "");
  }, [discountAmt]);

  useEffect(() => {
    setCheckoutPaid(paidAmount);
    setCheckoutChange(changeAmount);
  }, [changeAmount, paidAmount, setCheckoutChange, setCheckoutPaid]);

  useEffect(() => {
    if (!route.params?.openCartAt) return;
    setCartVisible(true);
  }, [route.params?.openCartAt]);

  useEffect(() => {
    setStockPage(0);
  }, [search]);

  useEffect(() => {
    setStockPage((prev) => {
      const maxPage = Math.max(0, totalStockPages - 1);
      return prev > maxPage ? maxPage : prev;
    });
  }, [totalStockPages]);

  const checkout = useMutation({
    mutationFn: async () => {
      if (!bizId || !cart.length) {
        throw new Error("No cart items available");
      }
      const resolvedBizId = await resolveCheckoutBusinessId({
        preferredBizId: bizId,
        businessIdFromHook: business?.businessId,
        businessIdFromUser: currentUser?.business?.businessId,
        businessIdFromOffline: offlineUser?.business?.businessId,
      });

      const orderNo = createOrderNo();
      const tranDate = new Date().toISOString();
      const userName = currentUser?.username || offlineUser?.username || "";
      const activeShopId = currentUser?.shopId ?? offlineUser?.shopId ?? 0;
      const relateCid = checkoutCustomer.cid?.trim() || "";
      const soldQty = cart.reduce(
        (sum, group) => sum + group.item.reduce((inner, item) => inner + item.boughtQty, 0),
        0
      );

      const tempJson = cart.flatMap((group) =>
        group.item.map((item) => ({
          tranDate,
          batchId: orderNo,
          stkGroupId: group.groupId,
          stkGroupName: group.groupName,
          stkItemId: item.itemId,
          checkoutQty: item.boughtQty,
          itemUnitPrice: item.unitPrice,
          subCheckout: item.unitPrice * item.boughtQty,
          tranUserEmail: userName,
          bizId: resolvedBizId,
        }))
      );

      const soldCurrencyRate = currency.rates[selectedBase]?.baseInDefault ?? 1;
      const selectedCurrency =
        Object.keys(currency.rates).find((key) => currency.rates[key].baseInRate === 1) ??
        selectedBase;
      const checkoutChange = changeAmount + discountAmt;
      const finalIncome = total - discountAmt;

      if (!Number.isFinite(finalIncome) || finalIncome < 0) {
        throw new Error("Final amount is invalid. Check cart and discount values.");
      }

      const paymentRelate = {
        relateBizId: resolvedBizId,
        relateBatchId: orderNo,
        relateCid,
        relateDiscountAmt: discountAmt,
        relatePaymentType: selectedPayment,
        relateChange: checkoutChange,
        relateFinalIncome: finalIncome,
      };

      const misInfo = {
        shopName:
          activeShopId === 0
            ? "Main Shop"
            : shops.find((shop) => shop.shopId === activeShopId)?.shopName || "Main Shop",
        bizId: resolvedBizId,
        batchId: orderNo,
        tranDate,
        soldCurrency: selectedBase,
        baseCurrency: selectedCurrency,
        misCurrencyRate: soldCurrencyRate,
        misReverseRate: currency.rates[selectedBase]?.baseInRate ?? 1,
        disAmtInSoldCurrency: discountAmt * soldCurrencyRate,
        paymentType: selectedPayment,
        changeInSoldCurrency: checkoutChange * soldCurrencyRate,
        incomeInSoldCurrency: finalIncome * soldCurrencyRate,
        teller: userName,
        soldQty,
        updatedAt: null,
      };
      const payload = { misInfo, tempJson, paymentRelate };
      await submitCheckoutWebLike({
        url: routes.sales.checkout(resolvedBizId),
        payload,
      });

      const lines: ReceiptLine[] = cart.flatMap((group) =>
        group.item.map((item) => ({
          key: `${group.groupId}-${item.itemId}-${item.colorHex}-${item.sizing ?? ""}`,
          groupName: group.groupName,
          itemId: item.itemId,
          sizing: item.sizing || item.barcodeNo,
          qty: item.boughtQty,
          unitPrice: item.unitPrice,
          subtotal: item.unitPrice * item.boughtQty,
        }))
      );

      return {
        orderNo,
        lines,
        soldQty,
        grandTotal: finalIncome,
      } satisfies CheckoutResult;
    },
    onSuccess: async (result) => {
      clearCart();
      setSelectionByGroup({});
      setCartVisible(false);
      setPaymentModalVisible(false);
      setCustomerModalVisible(false);
      setReceipt(result);
      setDiscountAmt(0);
      setPaidInput("");
      setCheckoutPaid(0);
      setCheckoutChange(0);
      await queryClient.invalidateQueries({ queryKey: ["stocks"] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      Toast.show({
        type: "success",
        text1: "Checkout success",
        text2: `Batch ${formatBatchId(result.orderNo)} completed.`,
      });
    },
    onError: (error) => {
      const text2 = isNetworkAxiosError(error)
        ? `Network error while connecting to ${ENV.API_URL}. Check internet and reload app.`
        : getErrorMessage(error, "Unable to complete checkout");
      Toast.show({
        type: "error",
        text1: "Checkout failed",
        text2,
      });
    },
  });

  const addSelectedVariantToCart = useCallback(
    (stock: StockGroup, selectedEntry: RemainingVariant | null, inStockVariants: RemainingVariant[]) => {
      const targetEntry = stock.isColorless ? inStockVariants[0] ?? null : selectedEntry;
      if (!targetEntry || targetEntry.remainingQty <= 0) {
        Toast.show({
          type: "error",
          text1: "Out of stock",
          text2: `${stock.groupName} has no available item for current selection`,
        });
        return;
      }

      const target = targetEntry.variant;
      addItem(stock.groupId, stock.groupName, stock.groupUnitPrice, stock.wholesalePrices, {
        itemId: target.itemId,
        itemImage: stock.isColorless
          ? normalizeImageUrl(stock.groupImage) || ""
          : normalizeImageUrl(target.itemImage) || normalizeImageUrl(stock.groupImage) || "",
        colorHex: normalizeColorHex(target.itemColorHex),
        boughtQty: 1,
        unitPrice: target.subPrice ?? stock.groupUnitPrice,
        barcodeNo: target.barcodeNo,
        isColorless: stock.isColorless,
        subPrice: target.subPrice,
        sizing: target.sizing,
      });

      Toast.show({
        type: "success",
        text1: "Added to cart",
        text2: `${stock.groupName} (${target.sizing || target.barcodeNo})`,
      });
    },
    [addItem]
  );

  const handleAddCartLine = useCallback(
    async (group: CartGroup, line: CartItem) => {
      const inCartQty = group.item
        .filter((entry) => entry.itemId === line.itemId && entry.colorHex === line.colorHex)
        .reduce((sum, entry) => sum + entry.boughtQty, 0);

      let availableQty = 0;
      if (line.barcodeNo) {
        availableQty = await checkStockByBarcode(line.barcodeNo);
      } else {
        const stockGroup = items.find((entry) => entry.groupId === group.groupId);
        const stockItem = stockGroup?.items.find((entry) => entry.itemId === line.itemId);
        availableQty = stockItem?.itemQuantity ?? 0;
      }

      if (availableQty - inCartQty <= 0) {
        Toast.show({
          type: "error",
          text1: "Out of stock",
          text2: `${line.sizing || line.barcodeNo} has no more available quantity`,
        });
        return;
      }

      addItem(group.groupId, group.groupName, group.baseUnitPrice, group.wholesaleTiers, {
        ...line,
        boughtQty: 1,
      });
    },
    [addItem, checkStockByBarcode, items]
  );

  const applyDiscount = () => {
    const value = Number(discountInput || 0);
    if (!Number.isFinite(value) || value < 0) {
      Toast.show({
        type: "error",
        text1: "Invalid discount",
        text2: "Enter a valid amount",
      });
      return;
    }
    if (value > total) {
      Toast.show({
        type: "error",
        text1: "Invalid discount",
        text2: "Discount cannot be greater than subtotal",
      });
      return;
    }
    setDiscountAmt(value);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCheckoutCustomer({
      rowId: customer.rowId,
      cid: customer.cid,
      imgUrl: customer.imgUrl || "",
      name: customer.name,
      typeOfCustomer: customer.typeOfCustomer,
      phoneNo1: customer.phoneNo1,
    });
    setCustomerModalVisible(false);
    setCustomerSearch("");
  };

  const handleDetachCustomer = () => {
    if (!hasAttachedCustomer) return;
    clearCheckoutCustomer();
    setCustomerSearch("");
    Toast.show({
      type: "success",
      text1: "Customer removed",
      text2: "Checkout will continue as walk-in customer.",
    });
  };

  const closePaymentModal = () => {
    setPaymentModalVisible(false);
    setCartVisible(true);
  };

  const handlePayNow = () => {
    if (!cart.length || checkout.isPending) return;
    checkout.mutate();
  };

  const canCheckout = cart.length > 0 && !checkout.isPending;

  const selectedPaymentLabel = useMemo(() => {
    if (selectedPayment === "qr") return t("lbl_qr") || "QR";
    if (selectedPayment === "wallet") return t("lbl_wallet") || "Wallet";
    return t("lbl_cash") || "Cash";
  }, [selectedPayment, t]);
  const paymentOptions = useMemo<PaymentOption[]>(
    () => [
      {
        key: "cash",
        label: t("lbl_cash") || "Cash",
        description: t("msg_cash") || "Complete order payment using cash on hand from customers",
        icon: "cash-multiple",
      },
      {
        key: "qr",
        label: t("lbl_qr") || "QR",
        description: t("msg_qr") || "Ask customer to complete payment by scanning e-payment QR code",
        icon: "qrcode-scan",
      },
      {
        key: "wallet",
        label: t("lbl_wallet") || "Wallet",
        description: t("msg_wallet") || "Remind customer to complete payment using their credit wallet",
        icon: "wallet-outline",
      },
    ],
    [t]
  );

  const buildVoucherHtml = useCallback(
    (result: CheckoutResult) => {
      const issuedAt = new Date().toLocaleString();
      const safeBusiness = escapeVoucherHtml(business?.businessName || businessName || "Openware ERP");
      const safeBatch = escapeVoucherHtml(formatBatchId(result.orderNo));
      const safeCustomer = escapeVoucherHtml(checkoutCustomerName);
      const safeCustomerMeta = escapeVoucherHtml(checkoutCustomerMeta);
      const safeTeller = escapeVoucherHtml(currentUser?.username || offlineUser?.username || "-");

      const rows = result.lines
        .map((line, index) => {
          const name = escapeVoucherHtml(line.groupName);
          const meta = escapeVoucherHtml(`${line.sizing} • Qty ${line.qty}`);
          const subtotal = escapeVoucherHtml(displayMoney(line.subtotal, selectedBase));
          return `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;">${index + 1}. ${name}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px;">${meta}</div>
              </td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-size:12px;font-weight:700;color:#0f172a;">
                ${subtotal}
              </td>
            </tr>
          `;
        })
        .join("");

      const safeSoldQty = escapeVoucherHtml(result.soldQty);
      const safeTotal = escapeVoucherHtml(displayMoney(result.grandTotal, selectedBase));
      const safeCurrency = escapeVoucherHtml(selectedBase);
      const safeIssuedAt = escapeVoucherHtml(issuedAt);

      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;padding:24px;}
              .card{border:1px solid #dbe4ef;border-radius:14px;padding:18px 18px 14px;}
              .head{display:flex;justify-content:space-between;gap:14px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:12px;}
              .title{font-size:20px;font-weight:800;letter-spacing:0.2px;margin:0;}
              .meta{font-size:11px;color:#64748b;margin-top:4px;}
              .chip{display:inline-block;border:1px solid #bcd4f6;background:#eef5ff;color:#1665d8;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:700;}
              table{width:100%;border-collapse:collapse;}
              .footer{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #e5e7eb;margin-top:12px;padding-top:12px;}
              .total{font-size:20px;font-weight:900;color:#1665d8;}
              .muted{font-size:11px;color:#64748b;}
            </style>
          </head>
          <body>
            <div class="card">
              <div class="head">
                <div>
                  <p class="title">${safeBusiness}</p>
                  <div class="meta">Batch ${safeBatch}</div>
                  <div class="meta">${safeIssuedAt}</div>
                </div>
                <div style="text-align:right;">
                  <div class="chip">Voucher</div>
                  <div class="meta" style="margin-top:8px;">${safeCurrency}</div>
                </div>
              </div>

              <div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:10px;">
                <div>
                  <div class="muted">Customer</div>
                  <div style="font-size:13px;font-weight:700;">${safeCustomer}</div>
                  <div class="muted">${safeCustomerMeta}</div>
                </div>
                <div style="text-align:right;">
                  <div class="muted">Teller</div>
                  <div style="font-size:13px;font-weight:700;">${safeTeller}</div>
                </div>
              </div>

              <table>
                <tbody>
                  ${rows}
                </tbody>
              </table>

              <div class="footer">
                <div>
                  <div class="muted">Sold Qty</div>
                  <div style="font-size:13px;font-weight:800;">${safeSoldQty}</div>
                </div>
                <div style="text-align:right;">
                  <div class="muted">Grand Total</div>
                  <div class="total">${safeTotal}</div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    },
    [
      business?.businessName,
      businessName,
      checkoutCustomerMeta,
      checkoutCustomerName,
      currentUser?.username,
      offlineUser?.username,
      selectedBase,
    ]
  );

  const createVoucherPdfUri = useCallback(
    async (result: CheckoutResult) => {
      const html = buildVoucherHtml(result);
      const printed = await Print.printToFileAsync({ html });
      const docDir = FileSystem.documentDirectory;
      if (!docDir) return printed.uri;

      const voucherDir = `${docDir}vouchers`;
      await FileSystem.makeDirectoryAsync(voucherDir, { intermediates: true }).catch(() => {});

      const targetFile = `${voucherDir}/voucher-${formatBatchId(result.orderNo).replace(/[^a-zA-Z0-9-]/g, "")}-${Date.now()}.pdf`;
      await FileSystem.copyAsync({ from: printed.uri, to: targetFile }).catch(() => {});
      await FileSystem.deleteAsync(printed.uri, { idempotent: true }).catch(() => {});
      return targetFile;
    },
    [buildVoucherHtml]
  );

  const handlePrintVoucher = useCallback(async () => {
    if (!receipt || voucherAction) return;
    setVoucherAction("print");
    try {
      await Print.printAsync({ html: buildVoucherHtml(receipt) });
      Toast.show({
        type: "success",
        text1: "Voucher opened for printing",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Print failed",
        text2: getErrorMessage(error, "Unable to print voucher"),
      });
    } finally {
      setVoucherAction(null);
    }
  }, [buildVoucherHtml, receipt, voucherAction]);

  const handleSaveVoucher = useCallback(async () => {
    if (!receipt || voucherAction) return;
    setVoucherAction("save");
    try {
      const uri = await createVoucherPdfUri(receipt);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Save voucher PDF",
          UTI: "com.adobe.pdf",
        });
      }
      Toast.show({
        type: "success",
        text1: "Voucher PDF ready",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Save failed",
        text2: getErrorMessage(error, "Unable to save voucher"),
      });
    } finally {
      setVoucherAction(null);
    }
  }, [createVoucherPdfUri, receipt, voucherAction]);

  const handleShareVoucher = useCallback(async () => {
    if (!receipt || voucherAction) return;
    setVoucherAction("share");
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error("Share is not available on this device.");
      }
      const uri = await createVoucherPdfUri(receipt);
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share voucher PDF",
        UTI: "com.adobe.pdf",
      });
      Toast.show({
        type: "success",
        text1: "Voucher shared",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Share failed",
        text2: getErrorMessage(error, "Unable to share voucher"),
      });
    } finally {
      setVoucherAction(null);
    }
  }, [createVoucherPdfUri, receipt, voucherAction]);

  const showInitialLoading = isLoading && stockList.length === 0;
  const listRefreshing = isLoading && stockList.length > 0;

  return (
    <Screen scroll={false} contentContainerStyle={styles.homeContent}>
      <View style={styles.homeStickyControls}>
        <SectionTitle
          title="Retail POS"
          subtitle="Variant selection aligned with web POS"
          right={
            <View style={styles.headerActions}>
              <AppPressable
                style={[styles.headerIconBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => navigation.navigate("BarcodeScanner")}
              >
                <MaterialCommunityIcons name="barcode-scan" size={20} color={theme.primary} />
              </AppPressable>

              <AppPressable
                style={[styles.cartNotifyBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => setCartVisible(true)}
              >
                <MaterialCommunityIcons name="cart-outline" size={21} color={theme.text} />
                {totalQty > 0 ? (
                  <View style={[styles.cartBadge, { backgroundColor: theme.danger }]}>
                    <Text style={styles.cartBadgeText}>{totalQty > 99 ? "99+" : totalQty}</Text>
                  </View>
                ) : null}
              </AppPressable>
            </View>
          }
        />

        <AppInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, group id, barcode, size"
        />
      </View>

      <FlashList
        {...DEFAULT_LIST_PERFORMANCE_PROPS}
        data={pagedStockList}
        drawDistance={700}
        keyExtractor={(item, index) => `${String(item.groupId || "group")}-${index}`}
        style={styles.homeList}
        contentContainerStyle={[
          styles.listWrap,
          stockList.length === 0 ? styles.listWrapEmpty : null,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshing={listRefreshing}
        onRefresh={() => void refresh()}
        ListEmptyComponent={
          showInitialLoading ? (
            <LoadingState label="Loading inventory..." variant="homeProducts" />
          ) : error ? (
            <ErrorState
              title="Unable to load products"
              subtitle={error instanceof Error ? error.message : "Unknown error"}
              onRetry={() => void refresh()}
            />
          ) : (
            <EmptyState title="No stock found" subtitle="Try a different search keyword." />
          )
        }
        renderItem={({ item }) => {
            const selection = selectionByGroup[item.groupId] ?? { color: "", size: null };
            const groupItems = Array.isArray(item.items) ? item.items : [];

            const inStockVariants = groupItems
              .map((variant) => ({
                variant,
                remainingQty: Math.max(0, variant.itemQuantity - cartQtyForItem(cart, item.groupId, variant.itemId)),
              }))
              .filter((entry) => entry.remainingQty > 0) satisfies RemainingVariant[];

            const totalAvailableQty = inStockVariants.reduce((sum, entry) => sum + entry.remainingQty, 0);
            const isGroupOutOfStock = totalAvailableQty <= 0;

            const availableColors = Array.from(
              new Set(inStockVariants.map((entry) => normalizeColorHex(entry.variant.itemColorHex)))
            );

            const selectedColor = item.isColorless
              ? normalizeColorHex(inStockVariants[0]?.variant.itemColorHex)
              : selection.color;

            const variantsForColor = selectedColor
              ? inStockVariants.filter(
                  (entry) => normalizeColorHex(entry.variant.itemColorHex) === selectedColor
                )
              : [];

            const availableSizes = variantsForColor
              .map((entry) => String(entry.variant.sizing ?? ""))
              .filter((size) => Boolean(size?.trim()));

            let selectedEntry: RemainingVariant | null = null;
            if (item.isColorless) {
              selectedEntry = inStockVariants[0] ?? null;
            } else if (selectedColor) {
              if (selection.size) {
                selectedEntry =
                  variantsForColor.find((entry) => entry.variant.sizing === selection.size) ?? null;
              } else if (variantsForColor.length === 1) {
                selectedEntry = variantsForColor[0];
              }
            }

            const selectedVariant = selectedEntry?.variant ?? null;
            const selectedAvailableQty = selectedEntry?.remainingQty ?? 0;
            const previewEntry =
              selectedEntry ??
              (selectedColor
                ? variantsForColor.find((entry) => normalizeImageUrl(entry.variant.itemImage))
                : null) ??
              (selectedColor ? variantsForColor[0] : null) ??
              inStockVariants.find((entry) => normalizeImageUrl(entry.variant.itemImage)) ??
              inStockVariants[0] ??
              null;
            const previewVariant = previewEntry?.variant ?? null;
            const colorAvailableQty = variantsForColor.reduce((sum, entry) => sum + entry.remainingQty, 0);
            const stockQtyLabel = selectedVariant
              ? selectedAvailableQty
              : selectedColor && !item.isColorless
                ? colorAvailableQty
                : totalAvailableQty;
            const stockBadgeTone = isGroupOutOfStock
              ? theme.danger
              : selectedVariant || (selectedColor && !item.isColorless)
                ? theme.success
                : theme.warning;
            const displayImageUrl =
              normalizeImageUrl(selectedVariant?.itemImage) ||
              normalizeImageUrl(previewVariant?.itemImage) ||
              normalizeImageUrl(item.groupImage);
            const groupQtyInCart = getGroupQtyFromCart(cart, item.groupId);
            const wholesaleStatus = getWholesaleStatus(
              item.wholesalePrices,
              groupQtyInCart,
              item.groupUnitPrice
            );
            const displayPrice = selectedVariant?.subPrice ?? wholesaleStatus.appliedPrice;

            const canAdd =
              !isGroupOutOfStock &&
              (item.isColorless
                ? Boolean(selectedEntry)
                : Boolean(selectedColor) &&
                  (availableSizes.length === 0 || Boolean(selection.size)) &&
                  Boolean(selectedEntry));

            const addButtonLabel = (() => {
              if (isGroupOutOfStock) return "Out of Stock";
              if (!item.isColorless && !selectedColor) return "Select Color";
              if (!item.isColorless && availableSizes.length > 0 && !selection.size) return "Select Size";
              if (!canAdd) return "Select Variant";
              return "Add to Cart";
            })();

          return (
            <Card style={styles.stockCard}>
                <View style={[styles.imageWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                  {displayImageUrl ? (
                    <Image source={{ uri: displayImageUrl }} style={styles.image} resizeMode="cover" />
                  ) : (
                    <Image source={brandImages.emptyBox} style={styles.image} resizeMode="contain" />
                  )}

                  <View style={styles.imageBadgeRow}>
                    {isGroupOutOfStock ? (
                      <View
                        style={[
                          styles.stockStateBadge,
                          {
                            backgroundColor: `${stockBadgeTone}14`,
                            borderColor: `${stockBadgeTone}45`,
                          },
                        ]}
                      >
                        <Text style={[styles.stockStateBadgeText, { color: stockBadgeTone }]}>OUT OF STOCK</Text>
                      </View>
                    ) : (
                      <QuantityBadge
                        value={stockQtyLabel}
                        suffix="left"
                        tone={stockQtyLabel <= 3 ? "warning" : "success"}
                        compact
                      />
                    )}

                    <View
                      style={[
                        styles.typeBadge,
                        { borderColor: `${theme.text}24`, backgroundColor: "rgba(255,255,255,0.92)" },
                      ]}
                    >
                      <Text style={[styles.typeBadgeText, { color: theme.text }]}>
                        {item.isColorless ? "Colorless" : "Color + Size"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.stockHeader}>
                  <View style={styles.stockInfo}>
                    <Text style={[styles.stockTitle, { color: theme.text }]} numberOfLines={1}>
                      {item.groupName || `Stock #${item.groupId}`}
                    </Text>
                    <Text style={[styles.stockMeta, { color: theme.muted }]}>#{item.groupId}</Text>
                  </View>
                  <Text style={[styles.stockPrice, { color: theme.primary }]}>
                    {displayMoney(displayPrice, selectedBase)}
                  </Text>
                </View>

                <View style={styles.stockDetailRow}>
                  <QuantityBadge
                    value={stockQtyLabel}
                    prefix="In stock"
                    tone={stockQtyLabel <= 3 ? "warning" : "success"}
                    compact
                  />
                  {selectedVariant ? (
                    <Text style={[styles.stockMeta, { color: theme.muted }]}>
                      {selectedVariant.barcodeNo || "-"}
                    </Text>
                  ) : null}
                </View>

                {!item.isColorless ? (
                  <View style={styles.selectionSummaryRow}>
                    <View
                      style={[
                        styles.selectionSummaryChip,
                        {
                          borderColor: selectedColor ? theme.primary : theme.border,
                          backgroundColor: selectedColor ? `${theme.primary}12` : theme.cardSoft,
                        },
                      ]}
                    >
                      <Text style={[styles.selectionSummaryText, { color: selectedColor ? theme.primary : theme.muted }]}>
                        {selectedColor ? `Color ${selectedColor.toUpperCase()}` : "Pick a color"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.selectionSummaryChip,
                        {
                          borderColor: selection.size ? theme.primary : theme.border,
                          backgroundColor: selection.size ? `${theme.primary}12` : theme.cardSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.selectionSummaryText,
                          { color: selection.size ? theme.primary : theme.muted },
                        ]}
                      >
                        {selection.size ? `Size ${selection.size}` : availableSizes.length > 0 ? "Pick size" : "No size"}
                      </Text>
                    </View>
                  </View>
                ) : null}

                {item.wholesalePrices.length ? (
                  <View
                    style={[
                      styles.tierPanel,
                      { borderColor: theme.border, backgroundColor: theme.cardSoft },
                    ]}
                  >
                    <View style={styles.tierPanelTop}>
                      <View style={styles.tierPanelTitleRow}>
                        <Text style={[styles.tierPanelTitle, { color: theme.muted }]}>{t("hd_wholesaletier")}</Text>
                        <QuantityBadge
                          value={groupQtyInCart}
                          prefix="Qty"
                          tone={groupQtyInCart > 0 ? "primary" : "neutral"}
                          compact
                        />
                      </View>
                      {wholesaleStatus.isWholesale ? (
                        <View
                          style={[
                            styles.tierStateChip,
                            { borderColor: `${theme.success}66`, backgroundColor: `${theme.success}14` },
                          ]}
                        >
                          <Text style={[styles.tierStateChipText, { color: theme.success }]}>
                            {t("wholesale_price")}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={[styles.tierPrimaryText, { color: theme.text }]}>
                      {wholesaleStatus.activeTier && wholesaleStatus.activeTierIndex
                        ? `Tier ${wholesaleStatus.activeTierIndex}: ${wholesaleStatus.activeTier.minQuantity}+ @ ${displayMoney(wholesaleStatus.appliedPrice, selectedBase)}`
                        : `Base price: ${displayMoney(item.groupUnitPrice, selectedBase)}`}
                    </Text>

                    <Text style={[styles.tierSecondaryText, { color: theme.muted }]}>
                      {wholesaleStatus.nextTier && wholesaleStatus.nextTierIndex
                        ? `${wholesaleStatus.qtyToNext} more for Tier ${wholesaleStatus.nextTierIndex} @ ${displayMoney(wholesaleStatus.nextTier.price, selectedBase)}`
                        : "Highest tier reached"}
                    </Text>
                  </View>
                ) : null}

                {!item.isColorless ? (
                  <>
                    <View style={styles.colorsRow}>
                      {availableColors.map((color) => {
                        const isActive = selectedColor === color;
                        return (
                          <AppPressable
                            key={`${item.groupId}-${color}`}
                            onPress={() => {
                              const colorVariants = inStockVariants.filter(
                                (entry) => normalizeColorHex(entry.variant.itemColorHex) === color
                              );
                              const defaultSize =
                                colorVariants.length === 1 && colorVariants[0].variant.sizing
                                  ? colorVariants[0].variant.sizing
                                  : null;

                              setSelectionByGroup((prev) => ({
                                ...prev,
                                [item.groupId]: {
                                  color,
                                  size: defaultSize,
                                },
                              }));
                            }}
                            style={[
                              styles.colorDot,
                              {
                                backgroundColor: color,
                                borderColor: isActive ? theme.primary : theme.border,
                                borderWidth: isActive ? 2 : 1,
                              },
                            ]}
                          />
                        );
                      })}
                    </View>

                    {selectedColor && availableSizes.length > 0 ? (
                      <View style={styles.sizesRow}>
                        {availableSizes.map((size) => {
                          const active = selection.size === size;
                          return (
                            <AppPressable
                              key={`${item.groupId}-${selectedColor}-${size}`}
                              style={[
                                styles.sizeChip,
                                {
                                  borderColor: active ? theme.primary : theme.border,
                                  backgroundColor: active ? `${theme.primary}14` : "#FFFFFF",
                                },
                              ]}
                              onPress={() => {
                                setSelectionByGroup((prev) => ({
                                  ...prev,
                                  [item.groupId]: {
                                    color: selectedColor,
                                    size,
                                  },
                                }));
                              }}
                            >
                              <Text
                                style={[
                                  styles.sizeChipText,
                                  { color: active ? theme.primary : theme.text },
                                ]}
                              >
                                {size}
                              </Text>
                            </AppPressable>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.sizesRowPlaceholder} />
                    )}
                  </>
                ) : (
                  <View style={styles.sizesRowPlaceholder} />
                )}

                <View style={styles.addRow}>
                  {!item.isColorless && selectedColor ? (
                    <AppPressable
                      onPress={() => {
                        setSelectionByGroup((prev) => ({
                          ...prev,
                          [item.groupId]: { color: "", size: null },
                        }));
                      }}
                    >
                      <Text style={[styles.clearText, { color: theme.danger }]}>Clear</Text>
                    </AppPressable>
                  ) : (
                    <View style={styles.clearPlaceholder} />
                  )}

                  <AppButton
                    label={addButtonLabel}
                    onPress={() => addSelectedVariantToCart(item, selectedEntry, inStockVariants)}
                    disabled={!canAdd}
                    style={styles.addButton}
                  />
                </View>
            </Card>
          );
        }}
      />
      {stockList.length ? (
        <View
          style={[
            styles.stockPaginationDock,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
            },
          ]}
        >
          <View style={styles.stockPaginationMetaWrap}>
            <Text style={[styles.stockPaginationMeta, { color: theme.muted }]}>Showing {stockRangeLabel}</Text>
            <Text style={[styles.stockPaginationMetaHint, { color: theme.muted }]}>8 / page</Text>
          </View>

          <View style={styles.stockPaginationControls}>
            <AppPressable
              disabled={stockPage <= 0}
              onPress={() => setStockPage((prev) => Math.max(0, prev - 1))}
              style={[
                styles.stockPaginationIconBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
                stockPage <= 0 ? styles.stockPaginationIconBtnDisabled : null,
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-left"
                size={18}
                color={stockPage <= 0 ? theme.muted : theme.text}
              />
            </AppPressable>

            <View style={[styles.stockPaginationIndexChip, { borderColor: theme.border }]}>
              <Text style={[styles.stockPaginationIndexCurrent, { color: theme.text }]}>{stockPage + 1}</Text>
              <Text style={[styles.stockPaginationIndexTotal, { color: theme.muted }]}>/ {totalStockPages}</Text>
            </View>

            <AppPressable
              disabled={stockPage + 1 >= totalStockPages}
              onPress={() => setStockPage((prev) => Math.min(totalStockPages - 1, prev + 1))}
              style={[
                styles.stockPaginationIconBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
                stockPage + 1 >= totalStockPages ? styles.stockPaginationIconBtnDisabled : null,
              ]}
            >
              <MaterialCommunityIcons
                name="chevron-right"
                size={18}
                color={stockPage + 1 >= totalStockPages ? theme.muted : theme.text}
              />
            </AppPressable>
          </View>
        </View>
      ) : null}

      <DrawerSheet
        visible={cartVisible}
        onClose={() => setCartVisible(false)}
        animationType="fade"
        sheetStyle={[styles.modalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.cartModalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <View
                style={[
                  styles.modalCartIconWrap,
                  { borderColor: theme.border, backgroundColor: theme.cardSoft },
                ]}
              >
                <MaterialCommunityIcons name="cart-outline" size={18} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Cart</Text>
                <View style={styles.modalCaptionRow}>
                  <QuantityBadge value={totalQty} prefix="Qty" tone={totalQty > 0 ? "accent" : "neutral"} compact />
                  <Text style={[styles.modalCaption, { color: theme.muted }]}>items ready for checkout</Text>
                </View>
              </View>
            </View>
            <View style={styles.modalHeaderRight}>
              {cart.length ? (
                <AppPressable
                  onPress={() => {
                    clearCart();
                    setDiscountAmt(0);
                    setPaidInput("");
                    setPaymentModalVisible(false);
                    setCheckoutPaid(0);
                    setCheckoutChange(0);
                  }}
                >
                  <Text style={[styles.clearCartText, { color: theme.danger }]}>Clear</Text>
                </AppPressable>
              ) : null}
            </View>
          </View>

          <Card style={styles.checkoutControlCard}>
            <View style={styles.customerHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkoutControlLabel, { color: theme.muted }]}>Customer</Text>
                <Text style={[styles.customerName, { color: theme.text }]} numberOfLines={1}>
                  {checkoutCustomerName}
                </Text>
                <Text style={[styles.customerMeta, { color: theme.muted }]} numberOfLines={1}>
                  {checkoutCustomerMeta}
                </Text>
              </View>
              <View style={styles.customerActionCol}>
                <AppButton
                  label={hasAttachedCustomer ? "Change" : "Attach"}
                  variant="secondary"
                  onPress={() => setCustomerModalVisible(true)}
                  style={styles.customerActionBtn}
                />
                <AppButton
                  label="Remove"
                  variant="ghost"
                  onPress={handleDetachCustomer}
                  disabled={!hasAttachedCustomer}
                  style={styles.customerActionBtn}
                />
              </View>
            </View>
          </Card>

          {cart.length ? (
            <View style={styles.modalListContent}>
              {cart.map((group) => {
                const groupQty = getGroupQty(group.item);
                const wholesaleStatus = getWholesaleStatus(group.wholesaleTiers, groupQty, group.baseUnitPrice);

                return (
                  <Card key={group.groupId}>
                    <View style={styles.modalGroupHeader}>
                      <Text style={[styles.modalGroupTitle, { color: theme.text }]}>{group.groupName}</Text>
                      <QuantityBadge value={groupQty} prefix="Qty" tone={groupQty > 0 ? "primary" : "neutral"} compact />
                    </View>

                    {group.wholesaleTiers.length ? (
                      <View
                        style={[
                          styles.modalTierBox,
                          { borderColor: theme.border, backgroundColor: theme.cardSoft },
                        ]}
                      >
                        <View style={styles.modalTierTopRow}>
                          <Text style={[styles.modalTierTitle, { color: theme.muted }]}>
                            {t("hd_wholesaletier")}
                          </Text>
                          <Text style={[styles.modalTierPrice, { color: theme.primary }]}>
                            {displayMoney(wholesaleStatus.appliedPrice, selectedBase)}
                          </Text>
                        </View>

                        <Text style={[styles.modalTierText, { color: theme.text }]}>
                          {wholesaleStatus.activeTier && wholesaleStatus.activeTierIndex
                            ? `Tier ${wholesaleStatus.activeTierIndex} active (${wholesaleStatus.activeTier.minQuantity}+)`
                            : "Base price active"}
                        </Text>

                        <Text style={[styles.modalTierText, { color: theme.muted }]}>
                          {wholesaleStatus.nextTier && wholesaleStatus.nextTierIndex
                            ? `${wholesaleStatus.qtyToNext} more for Tier ${wholesaleStatus.nextTierIndex}`
                            : "Highest tier reached"}
                        </Text>
                      </View>
                    ) : null}

                    {group.item.map((line) => (
                      <View key={`${line.itemId}-${line.colorHex}-${line.sizing ?? ""}`} style={styles.modalLineRow}>
                        <View
                          style={[
                            styles.colorDotTiny,
                            { backgroundColor: normalizeColorHex(line.colorHex), borderColor: theme.border },
                          ]}
                        />

                        <View style={{ flex: 1 }}>
                          <Text style={[styles.modalLineTitle, { color: theme.text }]}>
                            {line.sizing || line.barcodeNo}
                          </Text>
                          <Text style={[styles.modalLineMeta, { color: theme.muted }]}>#{line.itemId}</Text>
                          <View style={styles.modalLineMetaRow}>
                            <Text style={[styles.modalLineMeta, { color: theme.muted }]}>
                              {displayMoney(line.unitPrice, selectedBase)} x
                            </Text>
                            <QuantityBadge value={line.boughtQty} tone="accent" compact />
                          </View>
                          {wholesaleStatus.isWholesale && line.subPrice == null ? (
                            <Text style={[styles.modalWholesaleTag, { color: theme.success }]}>
                              {t("wholesale_price")}
                            </Text>
                          ) : null}
                        </View>

                        <View style={styles.modalActions}>
                          <AppPressable
                            style={[styles.iconBtn, { borderColor: theme.border }]}
                            onPress={() => removeItem(group.groupId, line.itemId, line.colorHex)}
                          >
                            <MaterialCommunityIcons name="minus" size={14} color={theme.text} />
                          </AppPressable>
                          <AppPressable
                            style={[styles.iconBtn, { borderColor: theme.border }]}
                            onPress={() => void handleAddCartLine(group, line)}
                          >
                            <MaterialCommunityIcons name="plus" size={14} color={theme.text} />
                          </AppPressable>
                          <AppPressable
                            style={[styles.iconBtn, { borderColor: theme.border }]}
                            onPress={() => deleteItem(group.groupId, line.itemId, line.colorHex)}
                          >
                            <MaterialCommunityIcons name="trash-can-outline" size={14} color={theme.danger} />
                          </AppPressable>
                        </View>
                      </View>
                    ))}
                  </Card>
                );
              })}
            </View>
          ) : (
            <EmptyState title="Cart is empty" />
          )}

          <Card style={styles.cartFooterCard}>
            <View style={styles.cartFooterRow}>
              <Text style={[styles.cartFooterLabel, { color: theme.muted }]}>Subtotal</Text>
              <Text style={[styles.cartFooterValue, { color: theme.text }]}>{displayMoney(total, selectedBase)}</Text>
            </View>
            <View style={styles.cartFooterRow}>
              <Text style={[styles.cartFooterLabel, { color: theme.muted }]}>Discount</Text>
              <Text style={[styles.cartFooterValue, { color: theme.text }]}>
                {displayMoney(discountAmt, selectedBase)}
              </Text>
            </View>
            <View style={styles.cartFooterRow}>
              <Text style={[styles.cartFooterTotalLabel, { color: theme.text }]}>Total</Text>
              <Text style={[styles.cartFooterTotalValue, { color: theme.primary }]}>
                {displayMoney(grandTotal, selectedBase)}
              </Text>
            </View>

            <View style={styles.cartMetaRow}>
              <View style={[styles.cartMetaTag, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                <Text style={[styles.cartMetaTagText, { color: theme.text }]}>Pay: {selectedPaymentLabel}</Text>
              </View>
            </View>

            <AppButton
              label="Proceed to Payment"
              onPress={() => {
                if (!cart.length) return;
                setCartVisible(false);
                setPaymentModalVisible(true);
              }}
              disabled={!cart.length}
            />
          </Card>
        </ScrollView>
      </DrawerSheet>

      <DrawerSheet
        visible={customerModalVisible}
        onClose={() => setCustomerModalVisible(false)}
        animationType="fade"
        sheetStyle={[styles.customerModalCard, { borderColor: theme.border }]}
      >
        <View style={styles.customerModalHeader}>
          <View>
            <Text style={[styles.customerModalTitle, { color: theme.text }]}>Select Customer</Text>
            <Text style={[styles.customerModalSubtitle, { color: theme.muted }]}>
              {filteredCustomers.length} customer(s)
            </Text>
          </View>
        </View>

        <AppInput
          value={customerSearch}
          onChangeText={setCustomerSearch}
          placeholder="Search by customer name, CID, phone"
        />

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.customerListContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {filteredCustomers.length ? (
            filteredCustomers.map((item) => {
              const selected = checkoutCustomer.cid === item.cid;
              return (
                <AppPressable
                  key={item.rowId}
                  onPress={() => handleSelectCustomer(item)}
                  style={[
                    styles.customerRow,
                    {
                      borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? `${theme.primary}10` : theme.card,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.customerName, { color: theme.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={[styles.customerMeta, { color: theme.muted }]} numberOfLines={1}>
                      {item.cid} • {item.phoneNo1}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.customerTypeTag,
                      { borderColor: theme.border, backgroundColor: theme.cardSoft },
                    ]}
                  >
                    <Text style={[styles.customerTypeText, { color: theme.muted }]}>
                      {item.typeOfCustomer}
                    </Text>
                  </View>
                </AppPressable>
              );
            })
          ) : (
            <EmptyState title="No customers found" />
          )}
        </ScrollView>
      </DrawerSheet>

      <DrawerSheet
        visible={paymentModalVisible}
        onClose={closePaymentModal}
        animationType="fade"
        sheetStyle={[styles.paymentModalCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.paymentModalContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.paymentModalHeader}>
            <View>
              <Text style={[styles.paymentModalTitle, { color: theme.text }]}>Payment</Text>
              <View style={styles.paymentSubtitleRow}>
                <QuantityBadge value={totalQty} prefix="Qty" tone={totalQty > 0 ? "accent" : "neutral"} compact />
                <Text style={[styles.paymentModalSubtitle, { color: theme.muted }]}>
                  items • {displayMoney(grandTotal, selectedBase)}
                </Text>
              </View>
            </View>
          </View>

          <Card style={styles.paymentSummaryCard}>
            <View style={styles.paymentSummaryTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkoutControlLabel, { color: theme.muted }]}>Customer</Text>
                <Text style={[styles.paymentSummaryName, { color: theme.text }]} numberOfLines={1}>
                  {checkoutCustomerName}
                </Text>
                <Text style={[styles.paymentSummaryMeta, { color: theme.muted }]} numberOfLines={1}>
                  {checkoutCustomerMeta}
                </Text>
              </View>
              <View style={styles.customerActionCol}>
                <AppButton
                  label={hasAttachedCustomer ? "Change" : "Attach"}
                  variant="secondary"
                  onPress={() => setCustomerModalVisible(true)}
                  style={styles.customerActionBtn}
                />
                <AppButton
                  label="Remove"
                  variant="ghost"
                  onPress={handleDetachCustomer}
                  disabled={!hasAttachedCustomer}
                  style={styles.customerActionBtn}
                />
              </View>
            </View>

            <View style={styles.cartFooterRow}>
              <Text style={[styles.cartFooterLabel, { color: theme.muted }]}>Subtotal</Text>
              <Text style={[styles.cartFooterValue, { color: theme.text }]}>{displayMoney(total, selectedBase)}</Text>
            </View>
            <View style={styles.cartFooterRow}>
              <Text style={[styles.cartFooterLabel, { color: theme.muted }]}>Discount</Text>
              <Text style={[styles.cartFooterValue, { color: theme.text }]}>
                {displayMoney(discountAmt, selectedBase)}
              </Text>
            </View>
            <View style={styles.cartFooterRow}>
              <Text style={[styles.cartFooterTotalLabel, { color: theme.text }]}>Total</Text>
              <Text style={[styles.cartFooterTotalValue, { color: theme.primary }]}>
                {displayMoney(grandTotal, selectedBase)}
              </Text>
            </View>
          </Card>

          <View style={styles.checkoutControlRow}>
            <Text style={[styles.checkoutControlLabel, { color: theme.muted }]}>
              {t("lbl_selectPayment") || "Select payment method"}
            </Text>
            <View style={styles.paymentOptionList}>
              {paymentOptions.map((payment) => {
                const active = selectedPayment === payment.key;
                return (
                  <AppPressable
                    key={payment.key}
                    onPress={() => setSelectedPayment(payment.key)}
                    style={[
                      styles.paymentOptionCard,
                      {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? `${theme.primary}12` : theme.card,
                      },
                    ]}
                  >
                    <View style={styles.paymentOptionLeft}>
                      <View
                        style={[
                          styles.paymentOptionIconWrap,
                          {
                            borderColor: active ? `${theme.primary}40` : theme.border,
                            backgroundColor: active ? `${theme.primary}16` : theme.cardSoft,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={payment.icon}
                          size={18}
                          color={active ? theme.primary : theme.text}
                        />
                      </View>
                      <View style={styles.paymentOptionTextWrap}>
                        <Text style={[styles.paymentOptionTitle, { color: active ? theme.primary : theme.text }]}>
                          {payment.label}
                        </Text>
                        <Text style={[styles.paymentOptionDescription, { color: theme.muted }]}>
                          {payment.description}
                        </Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons
                      name={active ? "check-circle" : "checkbox-blank-circle-outline"}
                      size={20}
                      color={active ? theme.primary : theme.muted}
                    />
                  </AppPressable>
                );
              })}
            </View>
          </View>

          <View style={styles.formRow}>
            <AppInput
              label={t("hd_discount")}
              keyboardType="decimal-pad"
              value={discountInput}
              onChangeText={setDiscountInput}
              style={styles.flexInput}
            />
            <AppButton
              label={t("btnTxt_apply") || "Apply"}
              variant="secondary"
              onPress={applyDiscount}
              style={styles.applyButton}
            />
          </View>

          <AppInput
            label={t("lbl_paid") || "Paid"}
            keyboardType="decimal-pad"
            value={paidInput}
            onChangeText={setPaidInput}
            helperText={`Change: ${displayMoney(changeAmount + discountAmt, selectedBase)}`}
          />

          <Text style={[styles.paymentDeclaration, { color: theme.muted }]}>
            Payment declaration: by pay-now, you confirm customer, payment method, and final totals.
          </Text>

          <View style={styles.paymentActionsRow}>
            <AppButton
              label="Back to Cart"
              variant="secondary"
              onPress={() => {
                setPaymentModalVisible(false);
                setCartVisible(true);
              }}
              style={styles.flexButton}
            />
            <AppButton
              label={checkout.isPending ? "Processing..." : "Pay Now"}
              onPress={handlePayNow}
              disabled={!canCheckout}
              loading={checkout.isPending}
              style={styles.flexButton}
            />
          </View>
        </ScrollView>
      </DrawerSheet>

      <DrawerSheet
        visible={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        animationType="fade"
        sheetStyle={[styles.receiptCard, { borderColor: theme.border }]}
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.receiptContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.receiptHeader}>
            <View style={styles.receiptHeaderLeft}>
              <MaterialCommunityIcons name="check-decagram" size={24} color={theme.success} />
              <View>
                <Text style={[styles.receiptTitle, { color: theme.text }]}>Checkout Complete</Text>
                <Text style={[styles.receiptMeta, { color: theme.muted }]}>
                  Batch {formatBatchId(receipt?.orderNo)}
                </Text>
              </View>
            </View>
          </View>

          {receipt?.lines?.length ? (
            <View style={styles.receiptListContent}>
              {receipt.lines.map((line) => (
                <View key={line.key} style={styles.receiptRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.receiptLineTitle, { color: theme.text }]} numberOfLines={1}>
                      {line.groupName}
                    </Text>
                    <View style={styles.receiptLineMetaRow}>
                      <Text style={[styles.receiptLineMeta, { color: theme.muted }]}>{line.sizing} •</Text>
                      <QuantityBadge value={line.qty} prefix="Qty" tone="accent" compact />
                    </View>
                  </View>
                  <Text style={[styles.receiptLinePrice, { color: theme.text }]}>
                    {displayMoney(line.subtotal, selectedBase)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState title="No receipt lines" />
          )}

          <View style={[styles.receiptFooter, { borderColor: theme.border }]}>
            <View style={styles.receiptQtyRow}>
              <Text style={[styles.receiptMeta, { color: theme.muted }]}>Sold</Text>
              <QuantityBadge value={receipt?.soldQty ?? 0} prefix="Qty" tone="success" compact />
            </View>
            <Text style={[styles.receiptGrand, { color: theme.primary }]}>
              {displayMoney(receipt?.grandTotal ?? 0, selectedBase)}
            </Text>
          </View>

          <View style={styles.receiptActionsRow}>
            <AppPressable
              onPress={() => void handlePrintVoucher()}
              style={[
                styles.receiptActionBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: voucherAction === "print" ? `${theme.primary}12` : theme.cardSoft,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={voucherAction === "print" ? "loading" : "printer-outline"}
                size={16}
                color={voucherAction === "print" ? theme.primary : theme.text}
              />
              <Text
                style={[
                  styles.receiptActionText,
                  { color: voucherAction === "print" ? theme.primary : theme.text },
                ]}
              >
                {voucherAction === "print" ? "Printing..." : "Print"}
              </Text>
            </AppPressable>

            <AppPressable
              onPress={() => void handleSaveVoucher()}
              style={[
                styles.receiptActionBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: voucherAction === "save" ? `${theme.primary}12` : theme.cardSoft,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={voucherAction === "save" ? "loading" : "file-download-outline"}
                size={16}
                color={voucherAction === "save" ? theme.primary : theme.text}
              />
              <Text
                style={[
                  styles.receiptActionText,
                  { color: voucherAction === "save" ? theme.primary : theme.text },
                ]}
              >
                {voucherAction === "save" ? "Preparing..." : "Save PDF"}
              </Text>
            </AppPressable>

            <AppPressable
              onPress={() => void handleShareVoucher()}
              style={[
                styles.receiptActionBtn,
                {
                  borderColor: theme.border,
                  backgroundColor: voucherAction === "share" ? `${theme.primary}12` : theme.cardSoft,
                },
              ]}
            >
              <MaterialCommunityIcons
                name={voucherAction === "share" ? "loading" : "share-variant-outline"}
                size={16}
                color={voucherAction === "share" ? theme.primary : theme.text}
              />
              <Text
                style={[
                  styles.receiptActionText,
                  { color: voucherAction === "share" ? theme.primary : theme.text },
                ]}
              >
                {voucherAction === "share" ? "Sharing..." : "Share"}
              </Text>
            </AppPressable>
          </View>

          <AppButton label="Continue Selling" onPress={() => setReceipt(null)} />
        </ScrollView>
      </DrawerSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  homeContent: {
    flex: 1,
    minHeight: 0,
  },
  homeStickyControls: {
    gap: 14,
  },
  stockPaginationDock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  stockPaginationMetaWrap: {
    flex: 1,
    gap: 1,
  },
  stockPaginationMeta: {
    fontSize: 11,
    fontWeight: "700",
  },
  stockPaginationMetaHint: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  stockPaginationControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stockPaginationIconBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stockPaginationIconBtnDisabled: {
    opacity: 0.5,
  },
  stockPaginationIndexChip: {
    height: 34,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    minWidth: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stockPaginationIndexCurrent: {
    fontSize: 12,
    fontWeight: "800",
  },
  stockPaginationIndexTotal: {
    fontSize: 11,
    fontWeight: "700",
  },
  homeList: {
    flex: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  cartNotifyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  listWrap: {
    gap: 12,
    paddingBottom: 18,
  },
  listWrapEmpty: {
    flexGrow: 1,
  },
  stockCard: {
    gap: 10,
    padding: 10,
    borderRadius: 10,
  },
  imageWrap: {
    height: 206,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageBadgeRow: {
    position: "absolute",
    top: 9,
    left: 9,
    right: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  stockStateBadge: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stockStateBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  typeBadge: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  stockHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  stockInfo: {
    flex: 1,
    gap: 2,
  },
  stockTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  stockMeta: {
    fontSize: 10,
  },
  stockPrice: {
    fontSize: 20,
    fontWeight: "800",
  },
  stockDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  selectionSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectionSummaryChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selectionSummaryText: {
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  tierPanel: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  tierPanelTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tierPanelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    flexWrap: "wrap",
  },
  tierPanelTitle: {
    fontSize: 10,
    fontWeight: "700",
  },
  tierStateChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tierStateChipText: {
    fontSize: 10,
    fontWeight: "700",
  },
  tierPrimaryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tierSecondaryText: {
    fontSize: 10,
    fontWeight: "500",
  },
  colorsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    minHeight: 30,
  },
  colorDot: {
    width: 28,
    height: 28,
    borderRadius: 10,
  },
  sizesRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minHeight: 32,
  },
  sizesRowPlaceholder: {
    minHeight: 32,
  },
  sizeChip: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sizeChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearText: {
    fontSize: 11,
    fontWeight: "700",
  },
  clearPlaceholder: {
    width: 32,
  },
  addButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 26, 42, 0.35)",
    justifyContent: "flex-end",
    paddingTop: 60,
  },
  centerModalKeyboard: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },
  modalScroll: {
    maxHeight: "100%",
  },
  cartModalContent: {
    gap: 10,
    paddingBottom: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "84%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 14,
    gap: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  modalCartIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  modalCaption: {
    fontSize: 10,
    fontWeight: "600",
  },
  modalCaptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  clearCartText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalListContent: {
    gap: 10,
  },
  modalGroupTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 10,
  },
  modalGroupQty: {
    fontSize: 10,
    fontWeight: "600",
  },
  modalTierBox: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    marginBottom: 8,
  },
  modalTierTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalTierTitle: {
    fontSize: 10,
    fontWeight: "700",
  },
  modalTierPrice: {
    fontSize: 11,
    fontWeight: "800",
  },
  modalTierText: {
    fontSize: 10,
    fontWeight: "600",
  },
  modalLineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 5,
  },
  colorDotTiny: {
    width: 14,
    height: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
  },
  modalLineTitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalLineMeta: {
    fontSize: 10,
  },
  modalLineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  modalWholesaleTag: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  modalActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  cartFooterCard: {
    gap: 6,
  },
  cartMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  cartMetaTag: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cartMetaTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  checkoutControlCard: {
    gap: 8,
  },
  checkoutControlRow: {
    gap: 6,
  },
  checkoutControlLabel: {
    fontSize: 10,
    fontWeight: "700",
  },
  paymentOptionList: {
    gap: 8,
  },
  paymentOptionCard: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  paymentOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  paymentOptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentOptionTextWrap: {
    flex: 1,
    gap: 1,
  },
  paymentOptionTitle: {
    fontSize: 11,
    fontWeight: "800",
  },
  paymentOptionDescription: {
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 16,
  },
  customerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerActionCol: {
    width: 96,
    gap: 6,
  },
  customerActionBtn: {
    minHeight: 34,
    paddingHorizontal: 8,
  },
  customerName: {
    fontSize: 12,
    fontWeight: "700",
  },
  customerMeta: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  cartFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cartFooterLabel: {
    fontSize: 11,
  },
  cartFooterValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  cartFooterTotalLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  cartFooterTotalValue: {
    fontSize: 16,
    fontWeight: "900",
  },
  formRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  flexInput: {
    flex: 1,
  },
  applyButton: {
    minWidth: 82,
  },
  paymentDeclaration: {
    fontSize: 10,
    fontWeight: "500",
  },
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 26, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  paymentModalCard: {
    width: "100%",
    maxWidth: 470,
    maxHeight: "84%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 14,
    gap: 10,
  },
  paymentModalContent: {
    gap: 10,
    paddingBottom: 10,
  },
  paymentModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentModalTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  paymentModalSubtitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  paymentSubtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  paymentSummaryCard: {
    gap: 8,
  },
  paymentSummaryTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  paymentSummaryName: {
    fontSize: 12,
    fontWeight: "700",
  },
  paymentSummaryMeta: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  paymentActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flexButton: {
    flex: 1,
  },
  customerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 26, 42, 0.35)",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  customerModalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 14,
    gap: 10,
    maxHeight: "84%",
  },
  customerModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customerModalTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  customerModalSubtitle: {
    fontSize: 10,
    fontWeight: "600",
  },
  customerListContent: {
    gap: 8,
    paddingVertical: 6,
  },
  customerRow: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  customerTypeTag: {
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  customerTypeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 26, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  receiptCard: {
    width: "100%",
    maxHeight: "84%",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    padding: 14,
    gap: 12,
  },
  receiptContent: {
    gap: 12,
    paddingBottom: 6,
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  receiptHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  receiptMeta: {
    fontSize: 11,
    fontWeight: "600",
  },
  receiptListContent: {
    gap: 8,
  },
  receiptRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 6,
  },
  receiptLineTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  receiptLineMeta: {
    fontSize: 10,
  },
  receiptLineMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  receiptLinePrice: {
    fontSize: 11,
    fontWeight: "700",
  },
  receiptFooter: {
    borderTopWidth: 1,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  receiptQtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  receiptGrand: {
    fontSize: 16,
    fontWeight: "900",
  },
  receiptActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  receiptActionBtn: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderColor: "#D8E2ED",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  receiptActionText: {
    fontSize: 11,
    fontWeight: "700",
  },
});
