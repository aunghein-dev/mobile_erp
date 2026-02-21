import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";

type OrderNoState = {
  orderNo: string;
  setOrderNo: (orderNo: string) => void;
  clearOrderNo: () => void;
};

export const useOrderNoStore = create<OrderNoState>()(
  persist(
    (set) => ({
      orderNo: "",
      setOrderNo: (orderNo) => set({ orderNo }),
      clearOrderNo: () => set({ orderNo: "" }),
    }),
    {
      name: "erp.order-no",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
