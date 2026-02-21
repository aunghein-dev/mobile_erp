import React, { createContext, useContext, useMemo } from "react";

const colors = {
  background: "#F3F7FA",
  card: "#FFFFFF",
  cardSoft: "#F8FCFF",
  text: "#172134",
  muted: "#5B6A82",
  primary: "#0B6CD8",
  accent: "#0FA3B1",
  border: "#D8E2ED",
  success: "#0E8A43",
  warning: "#B67215",
  danger: "#C9363E",
};

const ThemeContext = createContext(colors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo(() => colors, []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
