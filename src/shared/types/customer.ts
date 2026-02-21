export type Customer = {
  rowId: number;
  customerLastDueDate?: string | null;
  address1: string;
  bizId: number;
  boughtAmt: number;
  boughtCnt: number;
  cid: string;
  city: string;
  customerDueAmt: number;
  lastShopDate?: string | null;
  name: string;
  phoneNo1: string;
  phoneNo2: string;
  township: string;
  typeOfCustomer: string;
  imgUrl?: string | null;
};

export type CustomerDashboard = {
  retailerCnt: number;
  wholesalerCnt: number;
  totalCustomers: number;
  totalDue: number;
};
