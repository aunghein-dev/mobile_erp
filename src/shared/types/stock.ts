export interface WholesaleTier {
  id?: number;
  minQuantity: number;
  price: number;
}

export interface StockItem {
  itemId: number;
  itemImage: string;
  itemColorHex: string;
  itemQuantity: number;
  barcodeNo: string;
  sizing: string;
  subPrice: number | null;
}

export interface StockGroup {
  groupId: number;
  groupImage: string;
  groupName: string;
  groupUnitPrice: number;
  releasedDate: string;
  isColorless: boolean;
  groupOriginalPrice: number;
  shopId: number;
  items: StockItem[];
  wholesalePrices: WholesaleTier[];
}

export type StockCheckResult = {
  itemId: number;
  itemImage: string;
  itemColorHex: string;
  itemQuantity: number;
  barcodeNo: string;
  sizing: string;
  subPrice: number | null;
};
