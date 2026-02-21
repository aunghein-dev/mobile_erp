import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";
import type { CartGroup, CartItem, WholesaleTier } from "@/shared/types/cart";
import type { StockGroup } from "@/shared/types/stock";

type CartState = {
  cart: CartGroup[];
  total: number;
  totalQty: number;
  addItem: (
    groupId: number,
    groupName: string,
    baseUnitPrice: number,
    wholesaleTiers: WholesaleTier[],
    newItem: CartItem
  ) => void;
  addItemByBarcode: (barcode: string, allStocks: StockGroup[]) => boolean;
  removeItem: (groupId: number, itemId: number, colorHex: string) => void;
  deleteItem: (groupId: number, itemId: number, colorHex: string) => void;
  clearCart: () => void;
  getItemPrice: (groupId: number) => number;
};

function applyWholesalePricing(group: CartGroup): CartGroup {
  if (!group.wholesaleTiers.length) {
    return {
      ...group,
      item: group.item.map((item) =>
        item.subPrice == null
          ? { ...item, unitPrice: group.baseUnitPrice }
          : item
      ),
    };
  }

  const totalQty = group.item.reduce((sum, item) => sum + item.boughtQty, 0);
  const sortedTiers = [...group.wholesaleTiers].sort((a, b) => b.minQuantity - a.minQuantity);
  const tier = sortedTiers.find((entry) => entry.minQuantity <= totalQty);
  const price = tier ? tier.price : group.baseUnitPrice;

  return {
    ...group,
    item: group.item.map((item) =>
      item.subPrice == null
        ? { ...item, unitPrice: price }
        : item
    ),
  };
}

function computeTotal(cart: CartGroup[]) {
  return cart.reduce(
    (groupSum, group) =>
      groupSum +
      group.item.reduce((itemSum, item) => {
        const price = item.subPrice == null ? item.unitPrice : item.subPrice;
        return itemSum + price * item.boughtQty;
      }, 0),
    0
  );
}

function computeTotalQty(cart: CartGroup[]) {
  return cart.reduce(
    (groupSum, group) =>
      groupSum + group.item.reduce((itemSum, item) => itemSum + item.boughtQty, 0),
    0
  );
}

function patchTotals(cart: CartGroup[]) {
  return {
    cart,
    total: computeTotal(cart),
    totalQty: computeTotalQty(cart),
  };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: [],
      total: 0,
      totalQty: 0,

      addItem: (groupId, groupName, baseUnitPrice, wholesaleTiers, newItem) => {
        const cart = [...get().cart];
        const groupIndex = cart.findIndex((group) => group.groupId === groupId);

        if (groupIndex >= 0) {
          const currentGroup = cart[groupIndex];
          const itemIndex = currentGroup.item.findIndex(
            (item) => item.itemId === newItem.itemId && item.colorHex === newItem.colorHex
          );

          let updatedGroup: CartGroup;

          if (itemIndex >= 0) {
            const updatedItems = [...currentGroup.item];
            updatedItems[itemIndex] = {
              ...updatedItems[itemIndex],
              boughtQty: updatedItems[itemIndex].boughtQty + 1,
            };
            updatedGroup = { ...currentGroup, item: updatedItems };
          } else {
            updatedGroup = {
              ...currentGroup,
              item: [...currentGroup.item, { ...newItem, boughtQty: 1 }],
            };
          }

          cart[groupIndex] = applyWholesalePricing(updatedGroup);
          set(patchTotals(cart));
          return;
        }

        const addedGroup = applyWholesalePricing({
          groupId,
          groupName,
          baseUnitPrice,
          wholesaleTiers,
          item: [{ ...newItem, boughtQty: 1 }],
        });

        set(patchTotals([...cart, addedGroup]));
      },

      addItemByBarcode: (barcode, allStocks) => {
        const stockGroup = allStocks.find((group) =>
          group.items.some((item) => item.barcodeNo === barcode)
        );

        if (!stockGroup) {
          return false;
        }

        const stockItem = stockGroup.items.find((item) => item.barcodeNo === barcode);
        if (!stockItem) {
          return false;
        }

        const groupInCart = get().cart.find((group) => group.groupId === stockGroup.groupId);
        const itemInCart = groupInCart?.item.find((item) => item.itemId === stockItem.itemId);
        const purchasedQty = itemInCart?.boughtQty ?? 0;

        if (stockItem.itemQuantity - purchasedQty <= 0) {
          return false;
        }

        get().addItem(stockGroup.groupId, stockGroup.groupName, stockGroup.groupUnitPrice, stockGroup.wholesalePrices, {
          itemId: stockItem.itemId,
          itemImage: stockGroup.isColorless ? stockGroup.groupImage : stockItem.itemImage,
          colorHex: stockItem.itemColorHex,
          boughtQty: 1,
          unitPrice: stockItem.subPrice ?? stockGroup.groupUnitPrice,
          barcodeNo: stockItem.barcodeNo,
          isColorless: stockGroup.isColorless,
          subPrice: stockItem.subPrice,
          sizing: stockItem.sizing,
        });

        return true;
      },

      removeItem: (groupId, itemId, colorHex) => {
        const mapped = get()
          .cart.map((group) => {
            if (group.groupId !== groupId) return group;

            const itemMapped = group.item
              .map((item) => {
                if (item.itemId !== itemId || item.colorHex !== colorHex) return item;
                if (item.boughtQty <= 1) return null;
                return { ...item, boughtQty: item.boughtQty - 1 };
              })
              .filter(Boolean) as CartItem[];

            return applyWholesalePricing({ ...group, item: itemMapped });
          })
          .filter((group) => group.item.length > 0);

        set(patchTotals(mapped));
      },

      deleteItem: (groupId, itemId, colorHex) => {
        const mapped = get()
          .cart.map((group) => {
            if (group.groupId !== groupId) return group;
            const itemMapped = group.item.filter(
              (item) => !(item.itemId === itemId && item.colorHex === colorHex)
            );
            return applyWholesalePricing({ ...group, item: itemMapped });
          })
          .filter((group) => group.item.length > 0);

        set(patchTotals(mapped));
      },

      clearCart: () => {
        set({ cart: [], total: 0, totalQty: 0 });
      },

      getItemPrice: (groupId) => {
        const group = get().cart.find((entry) => entry.groupId === groupId);
        if (!group) return 0;
        if (!group.wholesaleTiers.length) return group.baseUnitPrice;

        const qty = group.item.reduce((sum, item) => sum + item.boughtQty, 0);
        const sortedTiers = [...group.wholesaleTiers].sort((a, b) => b.minQuantity - a.minQuantity);
        const tier = sortedTiers.find((entry) => entry.minQuantity <= qty);
        return tier ? tier.price : group.baseUnitPrice;
      },
    }),
    {
      name: "erp.cart",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
