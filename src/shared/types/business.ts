export type BusinessInfo = {
  businessId: number;
  businessLogo?: string | null;
  businessName: string;
  businessNameShortForm?: string | null;
  registeredBy?: string | null;
  registeredAt?: string | null;
  defaultCurrency?: string | null;
  taxRate?: number | null;
  showLogoOnInvoice?: boolean | null;
  autoPrintAfterCheckout?: boolean | null;
  invoiceFooterMessage?: string | null;
  streets?: string | null;
  township?: string | null;
  city?: string | null;
  phoneNum1?: string | null;
  phoneNum2?: string | null;
  usdRate?: number | null;
  thbRate?: number | null;
};

export type Shop = {
  shopId: number;
  bizId: number;
  shopName: string;
  shopAddress: string;
  phoneNum1: string;
  phoneNum2: string;
  shopTownship: string;
  shopCity: string;
};

export type CurrencyRateResponse = {
  baseCurrency: string;
  baseInRate: number;
  baseInDefault: number;
  defaultCurrency: string;
};

export type CurrencyState = {
  defaultCurrency: string;
  rates: Record<
    string,
    {
      baseInRate: number;
      baseInDefault: number;
    }
  >;
};
