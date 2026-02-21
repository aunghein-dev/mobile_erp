export const queryKeys = {
  info: ["business", "info"] as const,
  user: ["user", "me"] as const,
  shops: (bizId?: number | null) => ["business", "shops", bizId ?? 0] as const,
  billing: (bizId?: number | null) => ["billing", bizId ?? 0] as const,
  invoices: (bizId?: number | null) => ["invoices", bizId ?? 0] as const,
  batchPayment: (
    bizId?: number | null,
    page = 0,
    size = 20,
    search = "",
    startDate?: string | null,
    endDate?: string | null
  ) => ["batch-payment", bizId ?? 0, page, size, search, startDate ?? "", endDate ?? ""] as const,
  stocks: (bizId?: number | null) => ["stocks", bizId ?? 0] as const,
  stocksPaginated: (
    bizId?: number | null,
    page = 0,
    size = 20,
    search = "",
    startDate?: string | null,
    endDate?: string | null
  ) => ["stocks", "pagination", bizId ?? 0, page, size, search, startDate ?? "", endDate ?? ""] as const,
  stockPool: (bizId?: number | null, shopId?: number | null) => ["stocks", "pool", bizId ?? 0, shopId ?? 0] as const,
  customers: (bizId?: number | null) => ["customers", bizId ?? 0] as const,
  customerDashboard: (bizId?: number | null) => ["customers", "dashboard", bizId ?? 0] as const,
  sales: (
    bizId?: number | null,
    page = 0,
    size = 20,
    search = "",
    startDate?: string | null,
    endDate?: string | null
  ) => ["sales", bizId ?? 0, page, size, search, startDate ?? "", endDate ?? ""] as const,
  reports: (
    bizId?: number | null,
    page = 0,
    size = 20,
    search = "",
    startDate?: string | null,
    endDate?: string | null
  ) => ["sales", "reports", bizId ?? 0, page, size, search, startDate ?? "", endDate ?? ""] as const,
  currencySales: (
    bizId?: number | null,
    page = 0,
    size = 20,
    search = "",
    startDate?: string | null,
    endDate?: string | null
  ) => ["sales", "currency", bizId ?? 0, page, size, search, startDate ?? "", endDate ?? ""] as const,
  expenses: (bizId?: number | null) => ["expenses", bizId ?? 0] as const,
  expense: (bizId?: number | null, expenseId?: string) => ["expense", bizId ?? 0, expenseId ?? ""] as const,
  expenseHeadings: (bizId?: number | null) => ["expenses", "headings", bizId ?? 0] as const,
  tellers: (bizId?: number | null) => ["tellers", bizId ?? 0] as const,
  dashboard: (bizId?: number | null) => ["dashboard", bizId ?? 0] as const,
};
