import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";

type RememberLoginState = {
  remember: boolean;
  username: string;
  password: string;
  setRememberLogin: (payload: { remember: boolean; username: string; password: string }) => void;
  clearRememberLogin: () => void;
};

export const useRememberLoginStore = create<RememberLoginState>()(
  persist(
    (set) => ({
      remember: false,
      username: "",
      password: "",
      setRememberLogin: ({ remember, username, password }) =>
        set({ remember, username, password }),
      clearRememberLogin: () => set({ remember: false, username: "", password: "" }),
    }),
    {
      name: "erp.remember-login",
      storage: createJSONStorage(() => zustandStorage),
    }
  )
);
