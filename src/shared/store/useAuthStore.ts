import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { zustandStorage } from "@/shared/lib/storage/zustandStorage";

type AuthState = {
  isAuthenticated: boolean;
  sessionToken: string | null;
  unauthorized: boolean;
  setSession: (params: { authenticated: boolean; token?: string | null }) => void;
  signOut: () => void;
  markUnauthorized: () => void;
  clearUnauthorized: () => void;
};

function normalizeTokenCandidate(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const token = trimmed.replace(/^Bearer\s+/i, "").trim();
  return token || null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      sessionToken: null,
      unauthorized: false,
      setSession: ({ authenticated, token }) => {
        const normalizedToken = normalizeTokenCandidate(token);
        set({
          isAuthenticated: authenticated && !!normalizedToken,
          sessionToken: normalizedToken,
          unauthorized: false,
        });
      },
      signOut: () =>
        set({
          isAuthenticated: false,
          sessionToken: null,
          unauthorized: false,
        }),
      markUnauthorized: () => set({ unauthorized: true, isAuthenticated: false }),
      clearUnauthorized: () => set({ unauthorized: false }),
    }),
    {
      name: "erp.auth",
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        sessionToken: state.sessionToken,
      }),
    }
  )
);
