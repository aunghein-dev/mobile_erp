import { usePaymentStore } from "./usePaymentStore";

describe("usePaymentStore", () => {
  beforeEach(() => {
    usePaymentStore.setState({ selectedPayment: "cash" });
  });

  test("defaults to cash", () => {
    expect(usePaymentStore.getState().selectedPayment).toBe("cash");
  });

  test("updates selected payment", () => {
    usePaymentStore.getState().setSelectedPayment("qr");
    expect(usePaymentStore.getState().selectedPayment).toBe("qr");

    usePaymentStore.getState().setSelectedPayment("wallet");
    expect(usePaymentStore.getState().selectedPayment).toBe("wallet");
  });
});
