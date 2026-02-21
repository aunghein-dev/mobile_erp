import { useCartStore } from "./useCartStore";
import type { StockGroup } from "@/shared/types/stock";

const wholesaleTier = [{ minQuantity: 2, price: 80 }];

function resetCart() {
  useCartStore.setState({
    cart: [],
    total: 0,
    totalQty: 0,
  });
}

function addBaseItem() {
  useCartStore.getState().addItem(1, "Shirt", 100, wholesaleTier, {
    itemId: 11,
    itemImage: "",
    colorHex: "#000000",
    boughtQty: 1,
    unitPrice: 100,
    barcodeNo: "CODE-11",
    isColorless: false,
    subPrice: null,
    sizing: "M",
  });
}

describe("useCartStore", () => {
  beforeEach(() => {
    resetCart();
  });

  test("adds items and computes totals", () => {
    addBaseItem();
    expect(useCartStore.getState().totalQty).toBe(1);
    expect(useCartStore.getState().total).toBe(100);

    addBaseItem();
    expect(useCartStore.getState().totalQty).toBe(2);
    expect(useCartStore.getState().total).toBe(160);
    expect(useCartStore.getState().getItemPrice(1)).toBe(80);
  });

  test("removeItem and deleteItem update quantities and totals", () => {
    addBaseItem();
    addBaseItem();

    useCartStore.getState().removeItem(1, 11, "#000000");
    expect(useCartStore.getState().totalQty).toBe(1);
    expect(useCartStore.getState().total).toBe(100);

    useCartStore.getState().deleteItem(1, 11, "#000000");
    expect(useCartStore.getState().cart).toEqual([]);
    expect(useCartStore.getState().totalQty).toBe(0);
    expect(useCartStore.getState().total).toBe(0);
  });

  test("addItemByBarcode respects stock availability", () => {
    const stocks: StockGroup[] = [
      {
        groupId: 12,
        groupImage: "",
        groupName: "Sneaker",
        groupUnitPrice: 50,
        releasedDate: "2026-02-20",
        isColorless: false,
        groupOriginalPrice: 25,
        shopId: 0,
        wholesalePrices: [],
        items: [
          {
            itemId: 300,
            itemImage: "",
            itemColorHex: "#ffffff",
            itemQuantity: 1,
            barcodeNo: "SN-300",
            sizing: "42",
            subPrice: null,
          },
        ],
      },
    ];

    const firstAdd = useCartStore.getState().addItemByBarcode("SN-300", stocks);
    const secondAdd = useCartStore.getState().addItemByBarcode("SN-300", stocks);
    const unknownAdd = useCartStore.getState().addItemByBarcode("NOPE", stocks);

    expect(firstAdd).toBe(true);
    expect(secondAdd).toBe(false);
    expect(unknownAdd).toBe(false);
    expect(useCartStore.getState().totalQty).toBe(1);
  });

  test("clearCart resets everything", () => {
    addBaseItem();
    useCartStore.getState().clearCart();

    expect(useCartStore.getState().cart).toEqual([]);
    expect(useCartStore.getState().total).toBe(0);
    expect(useCartStore.getState().totalQty).toBe(0);
  });
});
