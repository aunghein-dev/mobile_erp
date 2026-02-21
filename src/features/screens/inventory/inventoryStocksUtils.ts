import type { StockGroup, StockItem } from "@/shared/types/stock";

export type EditableStockItem = {
  itemId: number;
  itemColorHex: string;
  itemQuantity: string;
  barcodeNo: string;
  sizing: string;
  subPrice: string;
  itemImage: string;
};

export type StockEditDraft = {
  groupId: number;
  groupName: string;
  groupUnitPrice: string;
  groupOriginalPrice: string;
  releasedDate: string;
  isColorless: boolean;
  shopId: number;
  wholesalePrices: StockGroup["wholesalePrices"];
  items: EditableStockItem[];
};

export type GroupSummary = {
  variantCount: number;
  totalQty: number;
  lowStockCount: number;
  minVariantPrice: number;
  maxVariantPrice: number;
};

export function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeImageUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "NULL") return null;
  return trimmed;
}

export function normalizeColorHex(value?: string | null) {
  if (!value) return "#8D9AAF";
  const trimmed = value.trim();
  if (!trimmed || trimmed.toUpperCase() === "NULL") return "#8D9AAF";
  return /^#([0-9A-Fa-f]{3}){1,2}$/.test(trimmed) ? trimmed : "#8D9AAF";
}

export function resolveVariantPrice(group: StockGroup, item: StockItem) {
  const itemPrice = toSafeNumber(item.subPrice);
  return itemPrice > 0 ? itemPrice : toSafeNumber(group.groupUnitPrice);
}

export function summarizeGroup(group: StockGroup): GroupSummary {
  const variants = group.items ?? [];
  let totalQty = 0;
  let lowStockCount = 0;
  let minVariantPrice = Number.POSITIVE_INFINITY;
  let maxVariantPrice = 0;

  variants.forEach((item) => {
    const quantity = toSafeNumber(item.itemQuantity);
    const price = resolveVariantPrice(group, item);
    totalQty += quantity;
    if (quantity <= 3) lowStockCount += 1;
    if (price < minVariantPrice) minVariantPrice = price;
    if (price > maxVariantPrice) maxVariantPrice = price;
  });

  return {
    variantCount: variants.length,
    totalQty,
    lowStockCount,
    minVariantPrice: Number.isFinite(minVariantPrice) ? minVariantPrice : 0,
    maxVariantPrice,
  };
}

export function createDraftFromGroup(group: StockGroup): StockEditDraft {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    groupUnitPrice: String(group.groupUnitPrice ?? 0),
    groupOriginalPrice: String(group.groupOriginalPrice ?? 0),
    releasedDate: group.releasedDate?.slice(0, 10) || "",
    isColorless: group.isColorless,
    shopId: group.shopId ?? 0,
    wholesalePrices: (group.wholesalePrices ?? []).map((tier) => ({
      id: tier.id,
      minQuantity: tier.minQuantity,
      price: tier.price,
    })),
    items: group.items.map((item) => ({
      itemId: item.itemId,
      itemColorHex: item.itemColorHex || "#000000",
      itemQuantity: String(item.itemQuantity ?? 0),
      barcodeNo: item.barcodeNo || "",
      sizing: item.sizing || "",
      subPrice: item.subPrice == null ? "" : String(item.subPrice),
      itemImage: item.itemImage || "",
    })),
  };
}
