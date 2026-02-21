import type { SalesTransaction } from "@/shared/types/sales";

export type TransactionMeta = {
  qty: number;
  unitPrice: number;
  subtotal: number;
  original: number;
  margin: number;
  tranDateRaw: string | null;
  teller: string;
  barcode: string;
  batchId: string;
  tranId: number;
  itemId: string;
  groupName: string;
};

export function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatTime(dateString?: string | null) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
}

export function transactionMeta(item: SalesTransaction): TransactionMeta {
  const qty = toSafeNumber(item.checkoutQty);
  const unitPrice = toSafeNumber(item.itemUnitPrice);
  const subtotal = toSafeNumber(item.subCheckout);
  const original = toSafeNumber(item.subOriginal);
  const margin = subtotal - original;
  const tranDateRaw = item.tranDate ?? null;
  const teller = (item.tranUserEmail ?? "-").toString().trim() || "-";
  const barcode = (item.barcodeNo ?? "-").toString().trim() || "-";

  return {
    qty,
    unitPrice,
    subtotal,
    original,
    margin,
    tranDateRaw,
    teller,
    barcode,
    batchId: item.batchId,
    tranId: item.tranId,
    itemId: item.stkItemId,
    groupName: item.stkGroupName,
  };
}
