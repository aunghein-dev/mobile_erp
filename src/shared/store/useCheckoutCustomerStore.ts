import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";

export type CheckoutCustomer = {
  rowId: number;
  cid: string;
  imgUrl: string;
  name: string;
  typeOfCustomer: string;
  phoneNo1: string;
};

const defaultCustomer: CheckoutCustomer = {
  rowId: 0,
  cid: "",
  imgUrl: "",
  name: "Default",
  typeOfCustomer: "Default",
  phoneNo1: "Unknown",
};

type State = {
  checkoutCustomer: CheckoutCustomer;
  setCheckoutCustomer: (customer: CheckoutCustomer) => void;
  clearCheckoutCustomer: () => void;
};

export const useCheckoutCustomerStore = create<State>()(
  persist(
    (set) => ({
      checkoutCustomer: defaultCustomer,
      setCheckoutCustomer: (checkoutCustomer) => set({ checkoutCustomer }),
      clearCheckoutCustomer: () => set({ checkoutCustomer: defaultCustomer }),
    }),
    {
      name: "erp.checkout-customer",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
