import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";

const API_BASE = "/api/v1";

interface ThemeContextType {
  dark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const syncToBackend = useCallback(async (theme: string) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/auth/me/preferences`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme }),
      });
    } catch { /* ignore */ }
  }, [token]);

  const applyTheme = useCallback((isDark: boolean) => {
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((user) => {
        if (user?.preferences?.theme) {
          applyTheme(user.preferences.theme === "dark");
        }
      })
      .catch(() => {});
  }, [token, applyTheme]);

  const toggleTheme = useCallback(() => {
    const next = !dark;
    applyTheme(next);
    syncToBackend(next ? "dark" : "light");
  }, [dark, applyTheme, syncToBackend]);

  return (
    <ThemeContext.Provider value={{ dark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
