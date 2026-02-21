import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DRAWER_GROUPS, NAV_ITEMS } from "@/shared/constants/navigation";
import type { AppDrawerParamList } from "./types";

export type DrawerRoute = keyof AppDrawerParamList;
export type DrawerIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export const routeIconMap: Record<DrawerRoute, DrawerIconName> = {
  Home: "storefront-outline",
  Dashboard: "view-dashboard-outline",
  SalesTransactions: "cash-register",
  SalesReports: "chart-box-outline",
  SalesBatchPayments: "calendar-check-outline",
  InventoryStocks: "cube-outline",
  InventoryBulkEntry: "playlist-plus",
  InventoryCustomers: "account-group-outline",
  ExpensesList: "receipt-text-outline",
  ExpensesApprovals: "check-decagram-outline",
  BarcodeScanner: "barcode-scan",
  BarcodeIntake: "qrcode-plus",
  BarcodeSettings: "barcode",
  CurrencyReport: "currency-usd",
  Settings: "cog-outline",
  Profile: "account-circle-outline",
  PrivacyPolicy: "shield-lock-outline",
};

export const groupLabelMap: Record<string, string> = {
  root: "Main",
  sales: "Sales",
  inventory: "Inventory",
  expenses: "Expenses",
  settings: "Settings",
};

export const titleKeyByRoute = NAV_ITEMS.reduce((acc, item) => {
  acc[item.route as DrawerRoute] = item.titleKey;
  return acc;
}, {} as Partial<Record<DrawerRoute, string>>);

export const routeGroupMap = NAV_ITEMS.reduce((acc, item) => {
  acc[item.route as DrawerRoute] = item.group;
  return acc;
}, {} as Partial<Record<DrawerRoute, string | undefined>>);

export const drawerGroups = DRAWER_GROUPS;

export const groupedDrawerItems = drawerGroups.map((group) => ({
  group,
  items: NAV_ITEMS.filter((item) => item.group === group.key),
}));

export function normalizeRouteTitle(route: DrawerRoute) {
  return route
    .replace(/([A-Z])/g, " $1")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveRouteTitle(route: DrawerRoute, translate: (key: string) => string) {
  const titleKey = titleKeyByRoute[route];
  if (!titleKey) return normalizeRouteTitle(route);
  return translate(titleKey) || normalizeRouteTitle(route);
}
