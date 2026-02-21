export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type AppDrawerParamList = {
  Home: { openCartAt?: number } | undefined;
  Dashboard: undefined;
  SalesTransactions: undefined;
  SalesReports: undefined;
  SalesBatchPayments: undefined;
  InventoryStocks: undefined;
  InventoryBulkEntry: undefined;
  InventoryCustomers: undefined;
  ExpensesList: undefined;
  ExpensesApprovals: undefined;
  BarcodeScanner: undefined;
  BarcodeIntake: undefined;
  BarcodeSettings: undefined;
  CurrencyReport: undefined;
  Settings: undefined;
  Profile: undefined;
  PrivacyPolicy: undefined;
};
