import React, { PropsWithChildren } from "react";
import { render, type RenderOptions } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/shared/contexts/ThemeContext";
import { LocaleProvider } from "@/shared/contexts/LocaleContext";
import { createTestQueryClient } from "./createTestQueryClient";

type CustomRenderOptions = Omit<RenderOptions, "wrapper">;

export function renderWithProviders(ui: React.ReactElement, options?: CustomRenderOptions) {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LocaleProvider>{children}</LocaleProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}
