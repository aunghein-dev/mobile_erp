import { create } from "zustand";

type CheckoutPaymentState = {
  discountAmt: number;
  change: number;
  paid: number;
  setDiscountAmt: (value: number) => void;
  setChange: (value: number) => void;
  setPaid: (value: number) => void;
};

export const useCheckoutPaymentStore = create<CheckoutPaymentState>((set) => ({
  discountAmt: 0,
  change: 0,
  paid: 0,
  setDiscountAmt: (discountAmt) => set({ discountAmt }),
  setChange: (change) => set({ change }),
  setPaid: (paid) => set({ paid }),
}));
