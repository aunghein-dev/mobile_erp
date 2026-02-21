import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";

export type StorageInfo = {
  limitStorageKb: number;
  limitStorageTxt: string;
  longName: string;
};

const defaultStorage: StorageInfo = {
  limitStorageKb: 512000,
  limitStorageTxt: "500 MB",
  longName: "Free Plan",
};

type StorageState = {
  storage: StorageInfo;
  setStorage: (storage: StorageInfo) => void;
  clearStorage: () => void;
};

export const useStorageStore = create<StorageState>()(
  persist(
    (set) => ({
      storage: defaultStorage,
      setStorage: (storage) => set({ storage }),
      clearStorage: () => set({ storage: defaultStorage }),
    }),
    {
      name: "erp.storage",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
