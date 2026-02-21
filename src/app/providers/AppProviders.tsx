import React, { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import Toast from "react-native-toast-message";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "@/shared/lib/api/queryClient";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { LocaleProvider } from "@/shared/contexts/LocaleContext";
import AppNavigator from "@/app/navigation/AppNavigator";
import { useAuthStore } from "@/shared/store/useAuthStore";
import { AppBootstrap } from "@/app/providers/AppBootstrap";

function UnauthorizedWatcher() {
  const unauthorized = useAuthStore((s) => s.unauthorized);
  const clearUnauthorized = useAuthStore((s) => s.clearUnauthorized);

  useEffect(() => {
    if (!unauthorized) return;
    Toast.show({
      type: "error",
      text1: "Session expired",
      text2: "Please sign in again.",
    });
    clearUnauthorized();
  }, [unauthorized, clearUnauthorized]);

  return null;
}

export function AppProviders() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>
            <UnauthorizedWatcher />
            <AppBootstrap>
              <AppNavigator />
            </AppBootstrap>
            <Toast />
          </LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
