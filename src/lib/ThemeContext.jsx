import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const DARK_THEME = {
  id: "dark",
  label: "Dark",
  icon: "🌑",
  vars: {
    "--theme-bg": "#000000",
    "--theme-bg-secondary": "#0a0f1a",
    "--theme-bg-card": "#111827",
    "--theme-bg-input": "#0f1419",
    "--theme-border": "rgba(6,182,212,0.2)",
    "--theme-text": "#f1f5f9",
    "--theme-text-muted": "#94a3b8",
    "--theme-accent": "#06b6d4",
    "--theme-accent-glow": "rgba(6,182,212,0.35)",
    "--theme-accent-2": "#7c3aed",
    "--theme-accent-2-glow": "rgba(124,58,237,0.25)",
    "--theme-sidebar": "#000000",
    "--theme-header": "rgba(0,0,0,0.6)",
    "--theme-transition": "background 0.4s ease, color 0.3s ease, border-color 0.3s ease",
  },
};

export const THEMES = { dark: DARK_THEME };

const ThemeContext = createContext({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
  themeConfig: DARK_THEME,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("dark");

  const applyTheme = useCallback(() => {
    const root = document.documentElement;
    Object.entries(DARK_THEME.vars).forEach(([key, value]) => root.style.setProperty(key, value));
    root.setAttribute("data-theme", "dark");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  }, []);

  const setTheme = useCallback(() => {
    // SafeNestT uses one canonical appearance. Ignore legacy light/auto values.
    setThemeState("dark");
    try { localStorage.setItem("safenest-theme", "dark"); } catch {}
    applyTheme();
  }, [applyTheme]);

  useEffect(() => {
    // Migrate any legacy light/auto preference to the canonical dark theme.
    try { localStorage.setItem("safenest-theme", "dark"); } catch {}
    applyTheme();
  }, [applyTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, resolvedTheme: "dark", themeConfig: DARK_THEME }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
