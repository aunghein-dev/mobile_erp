export type NavItem = {
  id: number;
  key: string;
  titleKey: string;
  route: string;
  group?: "root" | "sales" | "inventory" | "expenses" | "settings";
};

export const NAV_ITEMS: NavItem[] = [
  { id: 1, key: "home", titleKey: "home", route: "Home", group: "root" },
  { id: 2, key: "dashboard", titleKey: "dashboard", route: "Dashboard", group: "root" },

  { id: 31, key: "salesTransactions", titleKey: "salesTransactions", route: "SalesTransactions", group: "sales" },
  { id: 32, key: "salesReports", titleKey: "salesReports", route: "SalesReports", group: "sales" },
  { id: 33, key: "batchpayment", titleKey: "batchpayment", route: "SalesBatchPayments", group: "sales" },

  { id: 41, key: "stocks", titleKey: "stocks", route: "InventoryStocks", group: "inventory" },
  { id: 43, key: "multiStockEntry", titleKey: "multiStockEntry", route: "InventoryBulkEntry", group: "inventory" },
  { id: 42, key: "customers", titleKey: "customers", route: "InventoryCustomers", group: "inventory" },

  { id: 81, key: "expenseList", titleKey: "expenseList", route: "ExpensesList", group: "expenses" },
  { id: 83, key: "managerApprovals", titleKey: "managerApprovals", route: "ExpensesApprovals", group: "expenses" },

  { id: 9, key: "currencyReport", titleKey: "currencyReport", route: "CurrencyReport", group: "root" },
  { id: 6, key: "settings", titleKey: "settings", route: "Settings", group: "settings" },
  { id: 60, key: "profile", titleKey: "hd_profileSettings", route: "Profile", group: "settings" },
  { id: 7, key: "privacyPolicy", titleKey: "privacyPolicy", route: "PrivacyPolicy", group: "settings" },
];

export const DRAWER_GROUPS: Array<{ key: string; title: string }> = [
  { key: "root", title: "Main" },
  { key: "sales", title: "Sales" },
  { key: "inventory", title: "Inventory" },
  { key: "expenses", title: "Expenses" },
  { key: "settings", title: "Settings" },
];
