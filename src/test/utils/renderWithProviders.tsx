import React, { PropsWithChildren } from "react";
import { render, type RenderOptions } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { NavigationContainer } from "@react-navigation/native";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { LocaleProvider } from "@/shared/contexts/LocaleContext";
import { createTestQueryClient } from "./createTestQueryClient";

type CustomRenderOptions = Omit<RenderOptions, "wrapper">;

export function renderWithProviders(ui: React.ReactElement, options?: CustomRenderOptions) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <NavigationContainer>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <LocaleProvider>{children}</LocaleProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </NavigationContainer>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
