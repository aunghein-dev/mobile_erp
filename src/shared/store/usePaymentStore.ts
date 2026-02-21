import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";

export type PaymentMethodStore = "cash" | "qr" | "wallet";

type PaymentState = {
  selectedPayment: PaymentMethodStore;
  setSelectedPayment: (method: PaymentMethodStore) => void;
};

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set) => ({
      selectedPayment: "cash",
      setSelectedPayment: (selectedPayment) => set({ selectedPayment }),
    }),
    {
      name: "erp.payment-method",
      storage: createJSONStorage(() => zustandStorage),
      version: 1,
      partialize: (state) => ({ selectedPayment: state.selectedPayment }),
    }
  )
);
