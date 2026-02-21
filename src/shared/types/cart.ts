import type { StockGroup } from "./stock";

export type CartItem = {
  itemId: number;
  itemImage: string;
  colorHex: string;
  boughtQty: number;
  unitPrice: number;
  barcodeNo: string;
  isColorless: boolean;
  subPrice?: number | null;
  sizing?: string;
};

export type WholesaleTier = {
  id?: number;
  minQuantity: number;
  price: number;
};

export type CartGroup = {
  groupId: number;
  groupName: string;
  baseUnitPrice: number;
  wholesaleTiers: WholesaleTier[];
  item: CartItem[];
};

export type CheckoutLine = {
  tranDate: string;
  batchId: string;
  stkGroupId: number;
  stkGroupName: string;
  stkItemId: number;
  checkoutQty: number;
  itemUnitPrice: number;
  subCheckout: number;
  tranUserEmail: string;
  bizId: number;
};

export type CheckoutPayload = {
  paymentRelate: {
    relateBizId: number;
    relateBatchId: string;
    relateCid: string;
    relateDiscountAmt: number;
    relatePaymentType: string;
    relateChange: number;
    relateFinalIncome: number;
  };
  misInfo: Record<string, unknown>;
  tempJson: CheckoutLine[];
};

export function mapStockItemToCart(stock: StockGroup, itemId: number) {
  const item = stock.items.find((entry) => entry.itemId === itemId);
  if (!item) return null;

  return {
    groupId: stock.groupId,
    groupName: stock.groupName,
    baseUnitPrice: stock.groupUnitPrice,
    wholesaleTiers: stock.wholesalePrices,
    item: {
      itemId: item.itemId,
      itemImage: stock.isColorless ? stock.groupImage : item.itemImage,
      colorHex: item.itemColorHex,
      boughtQty: 1,
      unitPrice:
        item.subPrice === null || item.subPrice === undefined
          ? stock.groupUnitPrice
          : item.subPrice,
      barcodeNo: item.barcodeNo,
      isColorless: stock.isColorless,
      subPrice: item.subPrice,
      sizing: item.sizing,
    },
  };
}
