export const routes = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    info: "/auth/info",
    editName: (userId: number | string) => `/auth/edit/name/${userId}`,
    editProfilePicture: (userId: number | string) => `/auth/profilePics/edit/${userId}`,
    resetPassword: (userId: number | string) => `/auth/reset/password/${userId}`,
  },
  business: {
    infoMe: "/info/me",
    infoMeAccount: "/info/me/account",
    editInfo: (businessId: number | string) => `/info/edit/${businessId}`,
    uploadLogo: (businessId: number | string) => `/info/upload/logo/${businessId}`,
    shopsAll: (bizId: number | string) => `/shop/all/${bizId}`,
    shopUpsert: "/shop",
    shopDelete: (shopId: number | string) => `/shop/${shopId}`,
  },
  users: {
    tellers: (bizId: number | string) => `/teller/${bizId}`,
    createTeller: (bizId: number | string) => `/teller/create/${bizId}`,
  },
  inventory: {
    stocks: (bizId: number | string) => `/stkG/biz/${bizId}`,
    stocksPaginated: (bizId: number | string, query: string) =>
      `/pagination/stkG/biz/${bizId}?${query}`,
    stocksPaginatedAll: (bizId: number | string, query: string) =>
      `/pagination/stkG/biz/all/${bizId}?${query}`,
    stockPoolNonZero: (bizId: number | string, shopId: number | string) =>
      `/stkG/biz/nonZero/${bizId}/${shopId}`,
    stocksMainShopPaginated: (shopId: number | string, bizId: number | string, query: string) =>
      `/pagination/stkG/main/${shopId}/${bizId}?${query}`,
    stockEditGroup: (groupId: number | string) => `/edit/stkG/${groupId}`,
    stockDeleteItem: (groupId: number | string, itemId: number | string) =>
      `/delete/stkItem/${groupId}/${itemId}`,
    stockDeleteGroup: (groupId: number | string, bizId: number | string) =>
      `/stkG/${groupId}/biz/${bizId}`,
    stockByBarcode: (bizId: number | string, barcode: string) =>
      `/stk/item/barcode/${bizId}?barcode=${encodeURIComponent(barcode)}`,
    suppliers: (bizId: number | string) => `/supplier/biz/${bizId}`,
    customers: (bizId: number | string) => `/customer/biz/${bizId}`,
    customersDashboard: (bizId: number | string) => `/customer/dash/biz/${bizId}`,
    createCustomer: (bizId: number | string) => `/customer/new/biz/${bizId}`,
    updateCustomer: (bizId: number | string) => `/customer/update/biz/${bizId}`,
    deleteCustomer: (bizId: number | string, cid: string) =>
      `/customer/delete/biz/${bizId}/cid/${cid}`,
  },
  expense: {
    list: (bizId: number | string) => `/expense/${bizId}/expenses`,
    detail: (bizId: number | string, expenseId: string) => `/expense/${bizId}/expenses/${expenseId}`,
    update: (bizId: number | string, expenseId: string) => `/expense/${bizId}/expenses/${expenseId}`,
    remove: (bizId: number | string, expenseId: string) => `/expense/${bizId}/expenses/${expenseId}`,
    approve: (bizId: number | string, expenseId: string) =>
      `/expense/${bizId}/expenses/${expenseId}/approve`,
    reject: (bizId: number | string, expenseId: string) =>
      `/expense/${bizId}/expenses/${expenseId}/reject`,
    transaction: (bizId: number | string, expenseId: string) =>
      `/expense/${bizId}/expenses/${expenseId}/transaction`,
    headings: (bizId: number | string) => `/expense/headings/${bizId}`,
    upsertHeading: "/expense/headings/upsert",
    deleteHeading: (id: number | string) => `/expense/headings/${id}`,
  },
  sales: {
    checkout: (bizId: number | string) => `/checkout/${bizId}`,
    checkoutPaginated: (bizId: number | string, query: string) =>
      `/pagination/checkout/${bizId}?${query}`,
    checkoutPaginatedAll: (bizId: number | string, query: string) =>
      `/pagination/checkout/all/${bizId}?${query}`,
    refund: (bizId: number | string, tranId: number | string, newQty: number | string) =>
      `/checkout/refund/${bizId}/${tranId}/${newQty}`,
    cancel: (bizId: number | string, tranId: number | string) =>
      `/checkout/cancel/${bizId}/${tranId}`,
    batch: (bizId: number | string) => `/batch/${bizId}`,
    batchPaginated: (bizId: number | string, query: string) =>
      `/pagination/batch/${bizId}?${query}`,
    batchPaginatedAll: (bizId: number | string, query: string) =>
      `/pagination/batch/all/${bizId}?${query}`,
    currencySales: (bizId: number | string) => `/mis/currency-sales/${bizId}`,
    currencySalesPaginated: (bizId: number | string, query: string) =>
      `/pagination/mis/currency-sales/${bizId}?${query}`,
    currencySalesPaginatedAll: (bizId: number | string, query: string) =>
      `/pagination/mis/currency-sales/all/${bizId}?${query}`,
    batchPayment: (bizId: number | string) => `/batch/payment/${bizId}`,
    batchPaymentPaginated: (bizId: number | string, query: string) =>
      `/pagination/batch/payment/${bizId}?${query}`,
    batchPaymentPaginatedAll: (bizId: number | string, query: string) =>
      `/pagination/batch/payment/all/${bizId}?${query}`,
  },
  billing: {
    byBiz: (bizId: number | string) => `/billing/biz/${bizId}`,
    invoices: (bizId: number | string) => `/admin/invoices/${bizId}`,
    storage: (bizId: number | string) => `/billing/storage/${bizId}`,
  },
  dashboard: {
    radar: (bizId: number | string) => `/dashboard/radar/${bizId}`,
    miniCard: (bizId: number | string) => `/dashboard/minicard/${bizId}`,
    storage: (bizId: number | string) => `/dashboard/storage/${bizId}`,
    pie: (bizId: number | string) => `/dashboard/pie/${bizId}`,
    line: (bizId: number | string) => `/dashboard/linechart/${bizId}`,
    barSet: (bizId: number | string) => `/dashboard/barset/${bizId}`,
  },
} as const;
