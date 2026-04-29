import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

// ─── Theme Definitions ───────────────────────────────────────────────────────
export const THEMES = {
  dark: {
    id: "dark",
    label: "Dark",
    icon: "🌑",
    vars: {
      "--theme-bg":           "#000000",
      "--theme-bg-secondary": "#0a0f1a",
      "--theme-bg-card":      "#111827",
      "--theme-bg-input":     "#0f1419",
      "--theme-border":       "rgba(6,182,212,0.2)",
      "--theme-text":         "#f1f5f9",
      "--theme-text-muted":   "#94a3b8",
      "--theme-accent":       "#06b6d4",
      "--theme-accent-glow":  "rgba(6,182,212,0.35)",
      "--theme-accent-2":     "#7c3aed",
      "--theme-accent-2-glow":"rgba(124,58,237,0.25)",
      "--theme-sidebar":      "#000000",
      "--theme-header":       "rgba(0,0,0,0.6)",
      "--theme-transition":   "background 0.4s ease, color 0.3s ease, border-color 0.3s ease",
    }
  },
  light: {
    id: "light",
    label: "Futuristic Light",
    icon: "☀️",
    vars: {
      "--theme-bg":           "#f0f4ff",
      "--theme-bg-secondary": "#e8edf8",
      "--theme-bg-card":      "#ffffff",
      "--theme-bg-input":     "#f5f7ff",
      "--theme-border":       "rgba(6,182,212,0.3)",
      "--theme-text":         "#0f172a",
      "--theme-text-muted":   "#475569",
      "--theme-accent":       "#0891b2",
      "--theme-accent-glow":  "rgba(8,145,178,0.25)",
      "--theme-accent-2":     "#6d28d9",
      "--theme-accent-2-glow":"rgba(109,40,217,0.15)",
      "--theme-sidebar":      "#e2e8f0",
      "--theme-header":       "rgba(240,244,255,0.85)",
      "--theme-transition":   "background 0.4s ease, color 0.3s ease, border-color 0.3s ease",
    }
  },
  auto: {
    id: "auto",
    label: "Auto",
    icon: "⚡",
  }
};

// ─── Context ─────────────────────────────────────────────────────────────────
const ThemeContext = createContext({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
  themeConfig: THEMES.dark,
});

export function ThemeProvider({ children }) {
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem("safenest-theme") || "auto";
    } catch { return "auto"; }
  });

  const resolvedTheme = theme === "auto" ? getSystemTheme() : theme;
  const themeConfig = THEMES[resolvedTheme] || THEMES.dark;

  const applyTheme = useCallback((resolved) => {
    const cfg = THEMES[resolved] || THEMES.dark;
    const root = document.documentElement;

    // Apply CSS variables
    Object.entries(cfg.vars).forEach(([k, v]) => root.style.setProperty(k, v));

    // Toggle data-theme attribute for global CSS selectors
    root.setAttribute("data-theme", resolved);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    try { localStorage.setItem("safenest-theme", newTheme); } catch {}
  }, []);

  // Apply on mount and theme change
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme, applyTheme]);

  // Listen to system changes for "auto" mode
  useEffect(() => {
    if (theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(mq.matches ? "dark" : "light");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, themeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}