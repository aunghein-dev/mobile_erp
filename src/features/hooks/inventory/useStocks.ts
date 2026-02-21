import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/shared/lib/api/client";
import { getWithFallback } from "@/shared/lib/api/fallback";
import { postMultipartWithFallback } from "@/shared/lib/api/multipart";
import { queryKeys } from "@/shared/lib/api/queryKeys";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import type { StockGroup, StockItem, WholesaleTier } from "@/shared/types/stock";
import type { PaginatedResponse } from "@/shared/types/common";
import { routes } from "@/shared/lib/api/routes";

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSafeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeTier(raw: unknown): WholesaleTier {
  const tier = (raw ?? {}) as Partial<WholesaleTier>;
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    id: tier.id != null ? toSafeNumber(tier.id) : record.tierId != null ? toSafeNumber(record.tierId) : undefined,
    minQuantity: toSafeNumber(tier.minQuantity ?? record.minQty ?? record.quantity ?? 0),
    price: toSafeNumber(tier.price ?? record.unitPrice ?? record.tierPrice ?? 0),
  };
}

function normalizeStockItem(raw: unknown): StockItem {
  const item = (raw ?? {}) as Partial<StockItem>;
  const record = (raw ?? {}) as Record<string, unknown>;
  return {
    itemId: toSafeNumber(item.itemId ?? record.stkItemId ?? record.id),
    itemImage: toSafeString(item.itemImage ?? record.image ?? record.stkItemImage),
    itemColorHex: toSafeString(item.itemColorHex ?? record.colorHex ?? record.itemColorHexCode ?? record.color),
    itemQuantity: toSafeNumber(
      item.itemQuantity ??
        record.quantity ??
        record.qty ??
        record.stockQty ??
        record.remainingQty ??
        record.leftQty
    ),
    barcodeNo: toSafeString(item.barcodeNo ?? record.barcode ?? record.code),
    sizing: toSafeString(item.sizing ?? record.size ?? record.itemSize),
    subPrice:
      item.subPrice == null && record.price == null && record.itemPrice == null
        ? null
        : toSafeNumber(item.subPrice ?? record.price ?? record.itemPrice, 0),
  };
}

function normalizeStockGroup(raw: unknown): StockGroup {
  const group = (raw ?? {}) as Partial<StockGroup>;
  const record = (raw ?? {}) as Record<string, unknown>;
  const rawItems =
    record.items ??
    record.stkItems ??
    record.stockItems ??
    record.itemList ??
    record.variants ??
    [];
  const rawWholesalePrices =
    record.wholesalePrices ??
    record.wholesaleTiers ??
    record.wholesalePriceList ??
    record.tiers ??
    [];

  return {
    groupId: toSafeNumber(group.groupId ?? record.stkGroupId ?? record.id),
    groupImage: toSafeString(group.groupImage ?? record.image ?? record.stkGroupImage),
    groupName: toSafeString(group.groupName ?? record.stkGroupName ?? record.name),
    groupUnitPrice: toSafeNumber(group.groupUnitPrice ?? record.unitPrice ?? record.sellPrice),
    releasedDate: toSafeString(group.releasedDate ?? record.createdAt ?? record.releaseDate),
    isColorless: Boolean(group.isColorless ?? record.colorless ?? record.isSingleColor),
    groupOriginalPrice: toSafeNumber(group.groupOriginalPrice ?? record.originalPrice ?? record.costPrice),
    shopId: toSafeNumber(group.shopId ?? record.shopId ?? record.shop),
    items: asArray(rawItems).map(normalizeStockItem),
    wholesalePrices: asArray(rawWholesalePrices).map(normalizeTier),
  };
}

function extractStockGroups(payload: unknown): StockGroup[] {
  const knownListKeys = [
    "content",
    "data",
    "items",
    "list",
    "records",
    "stocks",
    "stockGroups",
    "result",
    "rows",
  ] as const;

  if (Array.isArray(payload)) {
    return payload.map(normalizeStockGroup);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  for (const key of knownListKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.map(normalizeStockGroup);
    }
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      for (const nestedKey of knownListKeys) {
        const nestedValue = nested[nestedKey];
        if (Array.isArray(nestedValue)) {
          return nestedValue.map(normalizeStockGroup);
        }
      }
    }
  }

  return [];
}

function hasPositiveQty(group: StockGroup) {
  if (!Array.isArray(group.items) || group.items.length === 0) return true;
  return group.items.some((item) => toSafeNumber(item.itemQuantity) > 0);
}

export function useStocks() {
  const bizId = useBusinessStore((s) => s.bizId);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.stocks(bizId),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<unknown>(routes.inventory.stocks(bizId as number), {
        withCredentials: true,
      });
      return extractStockGroups(response.data);
    },
  });

  const removeStockItem = (groupId: number, itemId: number) => {
    queryClient.setQueryData<StockGroup[]>(queryKeys.stocks(bizId), (previous) =>
      (previous ?? []).map((stock) =>
        stock.groupId === groupId
          ? {
              ...stock,
              items: stock.items.filter((item) => item.itemId !== itemId),
            }
          : stock
      )
    );
  };

  return {
    items: query.data ?? [],
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
    removeStockItem,
  };
}

export function useFilteredStocks() {
  const bizId = useBusinessStore((s) => s.bizId);
  const user = useOfflineUserStore((s) => s.user);
  const shopId = Number.isFinite(Number(user?.shopId)) ? Number(user?.shopId) : 0;

  const query = useQuery({
    queryKey: queryKeys.stockPool(bizId, shopId),
    enabled: !!bizId,
    queryFn: async () => {
      if (!bizId) return [];

      const candidateShopIds = Array.from(new Set([shopId, 0])).filter(
        (value) => Number.isFinite(value) && value >= 0
      );

      for (const candidateShopId of candidateShopIds) {
        try {
          const nonZeroResponse = await api.get<unknown>(
            routes.inventory.stockPoolNonZero(bizId, candidateShopId),
            { withCredentials: true }
          );
          const nonZeroItems = extractStockGroups(nonZeroResponse.data).filter(hasPositiveQty);
          if (nonZeroItems.length) return nonZeroItems;
        } catch {
        }
      }

      const pagedParams = new URLSearchParams({
        page: "0",
        size: "300",
      });

      try {
        const pagedResponse = await getWithFallback<unknown>(
          [
            routes.inventory.stocksPaginated(bizId, pagedParams.toString()),
            routes.inventory.stocksPaginatedAll(bizId, pagedParams.toString()),
          ],
          { withCredentials: true }
        );
        const pagedItems = extractStockGroups(pagedResponse.data).filter(hasPositiveQty);
        if (pagedItems.length) return pagedItems;
      } catch {
      }

      try {
        const allStocksResponse = await api.get<unknown>(routes.inventory.stocks(bizId), {
          withCredentials: true,
        });
        const allItems = extractStockGroups(allStocksResponse.data).filter(hasPositiveQty);
        if (allItems.length) return allItems;
      } catch {
      }

      for (const candidateShopId of candidateShopIds) {
        try {
          const mainPaginated = await api.get<unknown>(
            routes.inventory.stocksMainShopPaginated(candidateShopId, bizId, pagedParams.toString()),
            { withCredentials: true }
          );
          const shopItems = extractStockGroups(mainPaginated.data).filter(hasPositiveQty);
          if (shopItems.length) return shopItems;
        } catch {
        }
      }

      return [];
    },
  });

  return {
    items: query.data ?? [],
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}

export function usePaginationStocks(
  page: number,
  pageSize: number,
  search: string,
  startDate?: string | null,
  endDate?: string | null
) {
  const bizId = useBusinessStore((s) => s.bizId);

  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(pageSize));
  if (search) params.set("search", search);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);

  const query = useQuery({
    queryKey: queryKeys.stocksPaginated(bizId, page, pageSize, search, startDate, endDate),
    enabled: !!bizId,
    queryFn: async () => {
      const response = await getWithFallback<unknown>(
        [
          routes.inventory.stocksPaginated(bizId as number, params.toString()),
          routes.inventory.stocksPaginatedAll(bizId as number, params.toString()),
        ],
        { withCredentials: true }
      );
      const payload = response.data as Record<string, unknown>;
      const content = extractStockGroups(payload?.content);
      return {
        content,
        totalElements: toSafeNumber(payload?.totalElements),
        totalPages: toSafeNumber(payload?.totalPages),
      } as PaginatedResponse<StockGroup>;
    },
    placeholderData: (previousData) => previousData,
  });

  return {
    items: query.data?.content ?? [],
    total: query.data?.totalElements ?? 0,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}

export function useShopStockPagination(
  bizId: number,
  shopId: number,
  page: number,
  pageSize: number,
  search: string
) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(pageSize));
  if (search) params.set("search", search);

  const query = useQuery({
    queryKey: ["stocks", "shop", bizId, shopId, page, pageSize, search],
    enabled: !!bizId,
    queryFn: async () => {
      const response = await api.get<unknown>(
        routes.inventory.stocksMainShopPaginated(shopId, bizId, params.toString()),
        { withCredentials: true }
      );
      const payload = response.data as Record<string, unknown>;
      const content = extractStockGroups(payload?.content);
      return {
        content,
        totalElements: toSafeNumber(payload?.totalElements),
        totalPages: toSafeNumber(payload?.totalPages),
      } as PaginatedResponse<StockGroup>;
    },
    placeholderData: (previousData) => previousData,
  });

  return {
    items: query.data?.content ?? [],
    total: query.data?.totalElements ?? 0,
    totalPages: query.data?.totalPages ?? 0,
    error: query.error,
    isLoading: query.isLoading,
    refresh: query.refetch,
  };
}

export function useSubmitStockEntry() {
  const bizId = useBusinessStore((s) => s.bizId);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FormData) => {
      if (!bizId) {
        throw new Error("Business is not selected");
      }

      await postMultipartWithFallback(routes.inventory.stocks(bizId), payload, true);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.stocks(bizId) });
    },
  });
}
