import type { ComponentType } from "react";
import HomeScreen from "@/features/screens/home/HomeScreen";
import DashboardScreen from "@/features/screens/dashboard/DashboardScreen";
import InventoryStocksScreen from "@/features/screens/inventory/InventoryStocksScreen";
import InventoryBulkEntryScreen from "@/features/screens/inventory/InventoryBulkEntryScreen";
import InventoryCustomersScreen from "@/features/screens/inventory/InventoryCustomersScreen";
import SalesTransactionsScreen from "@/features/screens/sales/SalesTransactionsScreen";
import SalesReportsScreen from "@/features/screens/sales/SalesReportsScreen";
import SalesBatchPaymentsScreen from "@/features/screens/sales/SalesBatchPaymentsScreen";
import ExpensesListScreen from "@/features/screens/expenses/ExpensesListScreen";
import ExpensesApprovalsScreen from "@/features/screens/expenses/ExpensesApprovalsScreen";
import BarcodeScannerScreen from "@/features/screens/barcode/BarcodeScannerScreen";
import BarcodeIntakeScreen from "@/features/screens/barcode/BarcodeIntakeScreen";
import BarcodeSettingsScreen from "@/features/screens/barcode/BarcodeSettingsScreen";
import CurrencyReportScreen from "@/features/screens/reports/CurrencyReportScreen";
import SettingsScreen from "@/features/screens/settings/SettingsScreen";
import ProfileScreen from "@/features/screens/settings/ProfileScreen";
import PrivacyPolicyScreen from "@/features/screens/legal/PrivacyPolicyScreen";
import type { AppDrawerParamList } from "./types";

export type DrawerScreenDefinition = {
  name: keyof AppDrawerParamList;
  component: ComponentType<object>;
};

export const drawerScreens: DrawerScreenDefinition[] = [
  { name: "Home", component: HomeScreen as ComponentType<object> },
  { name: "Dashboard", component: DashboardScreen as ComponentType<object> },
  { name: "SalesTransactions", component: SalesTransactionsScreen as ComponentType<object> },
  { name: "SalesReports", component: SalesReportsScreen as ComponentType<object> },
  { name: "SalesBatchPayments", component: SalesBatchPaymentsScreen as ComponentType<object> },
  { name: "InventoryStocks", component: InventoryStocksScreen as ComponentType<object> },
  { name: "InventoryBulkEntry", component: InventoryBulkEntryScreen as ComponentType<object> },
  { name: "InventoryCustomers", component: InventoryCustomersScreen as ComponentType<object> },
  { name: "ExpensesList", component: ExpensesListScreen as ComponentType<object> },
  { name: "ExpensesApprovals", component: ExpensesApprovalsScreen as ComponentType<object> },
  { name: "BarcodeScanner", component: BarcodeScannerScreen as ComponentType<object> },
  { name: "BarcodeIntake", component: BarcodeIntakeScreen as ComponentType<object> },
  { name: "BarcodeSettings", component: BarcodeSettingsScreen as ComponentType<object> },
  { name: "CurrencyReport", component: CurrencyReportScreen as ComponentType<object> },
  { name: "Settings", component: SettingsScreen as ComponentType<object> },
  { name: "Profile", component: ProfileScreen as ComponentType<object> },
  { name: "PrivacyPolicy", component: PrivacyPolicyScreen as ComponentType<object> },
];
