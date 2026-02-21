import React, { PropsWithChildren } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useLogin, useLogout } from "./useAuth";
import { api } from "@/shared/lib/api/client";
import { rawApi } from "@/shared/lib/api/rawClient";
import { routes } from "@/shared/lib/api/routes";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { useBusinessStore } from "@/shared/store/useBusinessStore";
import { useOfflineUserStore } from "@/shared/store/useOfflineUserStore";
import { useCurrencyStore } from "@/shared/store/useCurrencyStore";
import { useStorageStore } from "@/shared/store/useStorageStore";
import { createTestQueryClient } from "@/test/utils/createTestQueryClient";

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("auth hooks", () => {
  beforeEach(() => {
    useAuthStore.getState().signOut();
    useBusinessStore.getState().clearBusiness();
    useOfflineUserStore.getState().clear();
    useCurrencyStore.getState().clearCurrency();
    useStorageStore.getState().clearStorage();
  });

  test("useLogin stores auth token and business details", async () => {
    const postSpy = jest.spyOn(rawApi, "post").mockResolvedValueOnce({
      data: { business: 103, token: "token-123" },
      headers: {},
    } as never);
    const getSpy = jest.spyOn(api, "get").mockResolvedValueOnce({
      data: {
        limitStorageKb: 1024,
        limitStorageTxt: "1 MB",
        longName: "Starter",
      },
    } as never);

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ username: "owner", password: "password123" });
    });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    expect(postSpy).toHaveBeenCalledWith(
      routes.auth.login,
      { username: "owner", password: "password123" },
      expect.objectContaining({ withCredentials: true })
    );
    expect(getSpy).toHaveBeenCalledWith(routes.billing.storage(103), expect.any(Object));
    expect(useAuthStore.getState().sessionToken).toBe("token-123");
    expect(useBusinessStore.getState().bizId).toBe(103);
  });

  test("useLogin falls back to authorization header token", async () => {
    jest.spyOn(rawApi, "post").mockResolvedValueOnce({
      data: { business: 103 },
      headers: { authorization: "Bearer header-token" },
    } as never);
    jest.spyOn(api, "get").mockResolvedValueOnce({ data: {} } as never);

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync({ username: "owner", password: "password123" });
    });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(useAuthStore.getState().sessionToken).toBe("header-token");
  });

  test("useLogin exposes normalized error message", async () => {
    jest.spyOn(rawApi, "post").mockRejectedValueOnce(new Error("Invalid credentials"));

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });
    let thrown: unknown;

    await act(async () => {
      try {
        await result.current.mutateAsync({ username: "owner", password: "wrong-pass" });
      } catch (error) {
        thrown = error;
      }
    });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain("Invalid credentials");
  });

  test("useLogout clears all session stores", async () => {
    useAuthStore.getState().setSession({ authenticated: true, token: "existing-token" });
    useBusinessStore.getState().setBusiness(103, "Demo");
    useOfflineUserStore.getState().setUser({
      accountId: 1,
      fullName: "Admin",
      username: "admin",
      role: "ADMIN",
      shopId: 0,
      business: {
        businessId: 103,
        businessName: "Demo",
      },
    });

    jest.spyOn(api, "post").mockResolvedValueOnce({ data: {} } as never);

    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync();
    });
    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().sessionToken).toBeNull();
    expect(useBusinessStore.getState().bizId).toBeNull();
    expect(useOfflineUserStore.getState().user).toBeNull();
  });
});
