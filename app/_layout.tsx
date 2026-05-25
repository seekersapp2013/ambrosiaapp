import "react-native-get-random-values";
import { Stack } from "expo-router";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { TamaguiProvider } from "tamagui";
import { tamaguiConfig } from "@/utils/tamaguiConfig";
import { Toasts } from "./Toasts";
import { ErrorBoundary } from "./ErrorBoundary";
import { useEffect } from "react";
import { LogBox } from "react-native";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const secureStorage = {
  getItem: async (key: string) => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: any) => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error("SecureStore setItem error:", e);
    }
  },
  removeItem: async (key: string) => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error("SecureStore removeItem error:", e);
    }
  },
};

export default function RootLayout() {
  useEffect(() => {
    LogBox.ignoreLogs([
      "Unable to activate keep awake",
      "Error: Unable to activate keep awake",
    ]);
  }, []);

  return (
    <ErrorBoundary>
      <TamaguiProvider config={tamaguiConfig}>
        <Toasts>
          <ConvexAuthProvider
            client={convex}
            storage={
              typeof window !== "undefined" && window.localStorage
                ? window.localStorage
                : secureStorage
            }
            storageNamespace="ambrosia_auth"
          >
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </ConvexAuthProvider>
        </Toasts>
      </TamaguiProvider>
    </ErrorBoundary>
  );
}
