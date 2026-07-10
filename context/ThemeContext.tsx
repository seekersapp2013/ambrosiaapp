/**
 * ThemeContext
 *
 * Provides app-wide light / dark mode state and a toggle function.
 * The preference is persisted to AsyncStorage so it survives app restarts.
 *
 * Usage:
 *   const { theme, toggleTheme, isDark } = useAppTheme();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// ─── Lightweight cross-platform key-value store ───────────────────────────────
// SecureStore works on native; localStorage on web.
const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === "web") {
        return typeof window !== "undefined"
          ? window.localStorage.getItem(key)
          : null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently ignore storage errors
    }
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppTheme = "dark" | "light";

interface ThemeContextValue {
  theme: AppTheme;
  isDark: boolean;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (t: AppTheme) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  isDark: true,
  isLight: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

const STORAGE_KEY = "@ambrosia_theme";

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("dark");
  const [hydrated, setHydrated] = useState(false);

  // Load persisted preference once on mount
  useEffect(() => {
    storage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark") {
          setThemeState(stored);
        }
      })
      .finally(() => setHydrated(true));
  }, []);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    storage.setItem(STORAGE_KEY, t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: AppTheme = prev === "dark" ? "light" : "dark";
      storage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  // Don't render children until we've read stored preference
  // This avoids a flash of the wrong theme
  if (!hydrated) return null;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        isLight: theme === "light",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ─── Force Dark Mode Override ─────────────────────────────────────────────────
/**
 * Wraps children in a context override that forces dark mode.
 * Use inside bottom sheets, modals, or any overlay that should always
 * render with dark-mode colors regardless of the user's preference.
 *
 * All child components calling useAppTheme() or useColors() will see isDark=true.
 */
export function ForceDarkMode({ children }: { children: React.ReactNode }) {
  const parent = useContext(ThemeContext);
  return (
    <ThemeContext.Provider
      value={{
        theme: "dark",
        isDark: true,
        isLight: false,
        toggleTheme: parent.toggleTheme,
        setTheme: parent.setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
