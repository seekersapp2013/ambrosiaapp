/**
 * appStorage — lightweight cross-platform key/value persistence.
 *
 * Mirrors the storage pattern used by ThemeContext: SecureStore on native,
 * localStorage on web. Use for small UI flags like "has seen onboarding".
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const appStorage = {
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

// ─── Onboarding first-launch flag ─────────────────────────────────────────────
const ONBOARDING_KEY = "ambrosia_has_seen_onboarding";

export async function hasSeenOnboarding(): Promise<boolean> {
  const v = await appStorage.getItem(ONBOARDING_KEY);
  return v === "true";
}

export async function markOnboardingSeen(): Promise<void> {
  await appStorage.setItem(ONBOARDING_KEY, "true");
}
