import { routes } from "./routes";

describe("api routes", () => {
  test("auth routes produce expected paths", () => {
    expect(routes.auth.login).toBe("/auth/login");
    expect(routes.auth.logout).toBe("/auth/logout");
    expect(routes.auth.editName(7)).toBe("/auth/edit/name/7");
  });

  test("inventory routes include ids and encoded params", () => {
    expect(routes.inventory.stocks(103)).toBe("/stkG/biz/103");
    expect(routes.inventory.stockPoolNonZero(103, 2)).toBe("/stkG/biz/nonZero/103/2");
    expect(routes.inventory.stocksPaginated(103, "page=0&size=20")).toBe("/pagination/stkG/biz/103?page=0&size=20");
    expect(routes.inventory.stocksPaginatedAll(103, "page=0&size=20")).toBe(
      "/pagination/stkG/biz/all/103?page=0&size=20"
    );
    expect(routes.inventory.stockByBarcode(103, "A/01 23")).toBe("/stk/item/barcode/103?barcode=A%2F01%2023");
  });

  test("sales and business routes build correctly", () => {
    expect(routes.sales.checkout(103)).toBe("/checkout/103");
    expect(routes.sales.batchPaginated(103, "page=1")).toBe("/pagination/batch/103?page=1");
    expect(routes.sales.checkoutPaginatedAll(103, "page=1")).toBe("/pagination/checkout/all/103?page=1");
    expect(routes.sales.batchPaginatedAll(103, "page=1")).toBe("/pagination/batch/all/103?page=1");
    expect(routes.sales.currencySalesPaginatedAll(103, "page=1")).toBe(
      "/pagination/mis/currency-sales/all/103?page=1"
    );
    expect(routes.sales.batchPaymentPaginatedAll(103, "page=1")).toBe(
      "/pagination/batch/payment/all/103?page=1"
    );
    expect(routes.business.shopsAll(103)).toBe("/shop/all/103");
    expect(routes.business.shopDelete(9)).toBe("/shop/9");
  });
});
