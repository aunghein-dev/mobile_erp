import { create } from "zustand";

type DiscountState = {
  discountAmt: number;
  setDiscountAmt: (amount: number) => void;
  resetDiscount: () => void;
};

export const useDiscountStore = create<DiscountState>((set) => ({
  discountAmt: 0,
  setDiscountAmt: (discountAmt) => set({ discountAmt }),
  resetDiscount: () => set({ discountAmt: 0 }),
}));
