/**
 * NavigationHistoryContext
 *
 * A lightweight history stack that tracks which screen the user came FROM.
 * This solves the core navigation issue: all sub-screens live inside a flat
 * Tabs navigator (href: null), so `router.back()` sometimes falls back to the
 * last focused tab instead of the actual previous screen.
 *
 * Usage:
 *   // Before navigating TO a sub-screen, push the current route:
 *   history.push("/(tabs)/wallet");
 *   router.push("/(tabs)/deposit");
 *
 *   // In the sub-screen back button:
 *   history.goBack(router, "/(tabs)/for-you");   // fallback if stack is empty
 *
 * The stack is stored in a ref so pushes don't trigger re-renders.
 * The exposed `stackDepth` state value does change on push/pop so consumers
 * that need to know whether a back button should be shown can subscribe to it.
 */

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type Router } from "expo-router";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface NavigationHistoryContextValue {
  /** Push the current route before navigating away from it. */
  push: (route: string) => void;

  /**
   * Navigate back.
   * Pops the stack and pushes the previous route.
   * If the stack is empty, navigates to `fallback`.
   */
  goBack: (router: Router, fallback?: string) => void;

  /** Number of entries in the history stack — useful for showing/hiding a back button. */
  stackDepth: number;

  /** Peek at the top of the stack without popping. */
  peek: () => string | undefined;

  /** Clear the entire history stack (call on tab press). */
  clear: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────────
const NavigationHistoryContext = createContext<NavigationHistoryContextValue | null>(null);

// ─── Provider ──────────────────────────────────────────────────────────────────
export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  // Stack stored in a ref — mutations don't cause re-renders on their own.
  const stackRef = useRef<string[]>([]);

  // stackDepth is state so consumers can react to changes.
  const [stackDepth, setStackDepth] = useState(0);

  const push = useCallback((route: string) => {
    stackRef.current.push(route);
    setStackDepth(stackRef.current.length);
  }, []);

  const goBack = useCallback((router: Router, fallback = "/(tabs)/for-you") => {
    if (stackRef.current.length > 0) {
      const previous = stackRef.current.pop()!;
      setStackDepth(stackRef.current.length);
      router.push(previous as any);
    } else {
      router.push(fallback as any);
    }
  }, []);

  const peek = useCallback((): string | undefined => {
    return stackRef.current[stackRef.current.length - 1];
  }, []);

  const clear = useCallback(() => {
    stackRef.current = [];
    setStackDepth(0);
  }, []);

  return (
    <NavigationHistoryContext.Provider value={{ push, goBack, stackDepth, peek, clear }}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────
export function useNavigationHistory() {
  const ctx = useContext(NavigationHistoryContext);
  if (!ctx) {
    throw new Error("useNavigationHistory must be used within a NavigationHistoryProvider");
  }
  return ctx;
}
