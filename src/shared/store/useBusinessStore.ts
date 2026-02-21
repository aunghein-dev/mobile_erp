import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";

type BusinessState = {
  bizId: number | null;
  businessName: string | null;
  setBusiness: (bizId: number | null, businessName?: string | null) => void;
  clearBusiness: () => void;
};

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      bizId: null,
      businessName: null,
      setBusiness: (bizId, businessName = null) => set({ bizId, businessName }),
      clearBusiness: () => set({ bizId: null, businessName: null }),
    }),
    {
      name: "erp.biz",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
