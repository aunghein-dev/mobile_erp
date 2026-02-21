import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";

type BarcodeSettings = {
  barcodeFormat: "CODE_128" | "EAN_13" | "QR";
  scannerBeep: boolean;
  scannerAutoFocus: boolean;
};

type BarcodeState = {
  settings: BarcodeSettings;
  setSettings: (payload: Partial<BarcodeSettings>) => void;
  resetSettings: () => void;
};

const defaultSettings: BarcodeSettings = {
  barcodeFormat: "CODE_128",
  scannerBeep: true,
  scannerAutoFocus: true,
};

export const useBarcodeSettingsStore = create<BarcodeState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (payload) => set((state) => ({ settings: { ...state.settings, ...payload } })),
      resetSettings: () => set({ settings: defaultSettings }),
    }),
    {
      name: "erp.barcode-settings",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
