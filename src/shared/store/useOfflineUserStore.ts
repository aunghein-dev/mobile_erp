import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";
import type { OfflineUser } from "@/shared/types/user";

type OfflineUserState = {
  user: OfflineUser | null;
  setUser: (user: OfflineUser | null) => void;
  patchUser: (patch: Partial<OfflineUser>) => void;
  clear: () => void;
};

export const useOfflineUserStore = create<OfflineUserState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      patchUser: (patch) => {
        const previous = get().user;
        if (!previous) return;
        set({ user: { ...previous, ...patch } as OfflineUser });
      },
      clear: () => set({ user: null }),
    }),
    {
      name: "erp.offline-user",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
