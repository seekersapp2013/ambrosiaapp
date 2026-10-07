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
import { LogBox, Platform, Text as RNText, TextInput as RNTextInput } from "react-native";
import {
  useFonts,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from "@expo-google-fonts/roboto";
import { NavigationHistoryProvider } from "@/context/NavigationHistoryContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { useDeviceNotifications } from "@/hooks/useDeviceNotifications";
import { fontFamily } from "@/tokens/typography";

// ── Global default font (Roboto) ──────────────────────────────────────────────
// Applies Roboto to every <Text>/<TextInput> that doesn't set its own family,
// so the whole app uses Roboto without touching each screen. Weight-specific
// faces (medium/bold) are still opt-in via fontFamily tokens where needed.
let defaultFontApplied = false;
function applyGlobalRobotoDefault() {
  if (defaultFontApplied) return;
  defaultFontApplied = true;
  const applyTo = (Comp: any) => {
    const existing = Comp.defaultProps || {};
    Comp.defaultProps = {
      ...existing,
      style: [{ fontFamily: fontFamily.regular }, existing.style],
    };
  };
  applyTo(RNText);
  applyTo(RNTextInput);
}

function DeviceNotificationInitializer() {
  useDeviceNotifications();
  return null;
}

// LiveKit's registerGlobals() patches the JS environment with WebRTC primitives.
// It must only run on native — it calls requireNativeComponent which doesn't
// exist on web and will crash the bundler/browser if invoked there.
if (Platform.OS === "android" || Platform.OS === "ios") {
  const { registerGlobals } = require("@livekit/react-native");
  registerGlobals();
}

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL || "https://blessed-marlin-14.convex.cloud",
  {
    unsavedChangesWarning: false,
  }
);

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
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  useEffect(() => {
    LogBox.ignoreLogs([
      "Unable to activate keep awake",
      "Error: Unable to activate keep awake",
    ]);
  }, []);

  if (fontsLoaded) {
    applyGlobalRobotoDefault();
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
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
              <NavigationHistoryProvider>
                <DeviceNotificationInitializer />
                <Stack>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="article-viewer" options={{ headerShown: false }} />
                  <Stack.Screen name="pulse-viewer" options={{ headerShown: false }} />
                  <Stack.Screen name="reel-viewer" options={{ headerShown: false }} />
                  <Stack.Screen name="auth" options={{ headerShown: false }} />
                </Stack>
              </NavigationHistoryProvider>
            </ConvexAuthProvider>
          </Toasts>
        </TamaguiProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
