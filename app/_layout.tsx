import "react-native-get-random-values";
import "@ethersproject/shims";
import { Stack } from "expo-router";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { TamaguiProvider, createTamagui } from "tamagui";
import { config } from "@tamagui/config/v3";
import { Toasts } from "./Toasts";
import { ErrorBoundary } from "./ErrorBoundary";
import { useEffect } from "react";
import { LogBox } from "react-native";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

const secureStorage = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: any) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

const tamaguiConfig = createTamagui(config);

export default function RootLayout() {
  useEffect(() => {
    // Suppress keep awake errors in development
    LogBox.ignoreLogs([
      'Unable to activate keep awake',
      'Error: Unable to activate keep awake',
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
          >
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false }} />
            </Stack>
          </ConvexAuthProvider>
        </Toasts>
      </TamaguiProvider>
    </ErrorBoundary>
  );
}
