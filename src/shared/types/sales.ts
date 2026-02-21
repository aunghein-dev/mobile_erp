export type SalesTransaction = {
  tranId: number;
  batchId: string;
  tranDate: string;
  stkGroupId: string;
  stkGroupName: string;
  stkItemId: string;
  checkoutQty: number;
  itemUnitPrice: number;
  subCheckout: number;
  tranUserEmail: string;
  bizId: string;
  barcodeNo: string;
  groupOriginalPrice: number;
  subOriginal: number;
};

export type BatchReport = {
  batchId: string;
  totalQty?: number;
  stkItemCnt?: number;
  checkoutTotal?: number;
  tranDate?: string;
  tranUserEmail?: string;
  bizId?: number;
  profit?: number;

  // Legacy fields kept for backward compatibility with older API responses.
  batchDate?: string;
  totalAmount?: number;
  soldQty?: number;
  teller?: string;
};

export type CurrencySalesRecord = {
  id?: string;
  batchId: string;
  tranDate: string;
  soldCurrency: string;
  incomeInSoldCurrency: number;
  soldQty: number;
  paymentType?: string;
  teller?: string;
  shopName?: string;
};
