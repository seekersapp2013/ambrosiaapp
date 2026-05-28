import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useEffect } from "react";
import { Platform, View, TouchableOpacity, Text, StyleSheet, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/Colors";
import { AppLoader } from "@/components/AppLoader";
import { useTabBarHeight } from "@/utils/useDeviceClass";
import { zIndex } from "@/tokens/zIndex";
import { MOBILE_CARD_ENABLED } from "@/components/MobileCard";

function RedirectToSignIn() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, []);
  return null;
}

// ── Visible tabs config ───────────────────────────────────────────────────────
const TABS = [
  { name: "home",    label: "Home",    icon: "home-outline"        as const },
  { name: "pulse",   label: "Pulse",   icon: "play-circle-outline" as const },
  { name: "wallet",  label: "Wallet",  icon: "wallet-outline"      as const },
  { name: "profile", label: "Profile", icon: "person-outline"      as const },
] as const;

// ── Custom tab bar that sits inside the card boundary ─────────────────────────
function CardTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const baseHeight = useTabBarHeight();
  const paddingBottom = Platform.OS === "android" ? insets.bottom + 4 : 8;
  const barHeight = baseHeight + (Platform.OS === "android" ? insets.bottom : 0);
  const screenWidth = Dimensions.get("window").width;

  // Mirror the card's maxWidth + horizontal padding from MobileCard
  const cardMaxWidth = 500;
  const cardPadding = 16;
  const cardWidth = Math.min(screenWidth - cardPadding * 2, cardMaxWidth);
  const sideOffset = (screenWidth - cardWidth) / 2;

  if (!MOBILE_CARD_ENABLED) {
    // Fallback: standard full-width bar
    return (
      <View
        style={[
          tabStyles.barBase,
          {
            height: barHeight,
            paddingBottom,
            left: 0,
            right: 0,
            borderRadius: 0,
            borderLeftWidth: 0,
            borderRightWidth: 0,
          },
        ]}
      >
        {renderItems(state, navigation, barHeight, paddingBottom)}
      </View>
    );
  }

  return (
    <View
      style={[
        tabStyles.barBase,
        {
          height: barHeight,
          paddingBottom,
          left: sideOffset,
          right: sideOffset,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        },
      ]}
    >
      {renderItems(state, navigation, barHeight, paddingBottom)}
    </View>
  );
}

function renderItems(state: any, navigation: any, barHeight: number, paddingBottom: number) {
  // Only render the 3 visible tabs
  const visibleRoutes = state.routes.filter((r: any) =>
    TABS.some((t) => t.name === r.name)
  );

  return visibleRoutes.map((route: any) => {
    const tabConfig = TABS.find((t) => t.name === route.name)!;
    const isFocused = state.index === state.routes.indexOf(route);

    const onPress = () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        style={tabStyles.tabItem}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={tabConfig.label}
        accessibilityState={{ selected: isFocused }}
      >
        <Ionicons
          name={tabConfig.icon}
          size={22}
          color={isFocused ? Colors.iconAccent : Colors.iconDisabled}
        />
        <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
          {tabConfig.label}
        </Text>
        {isFocused && <View style={tabStyles.activeDot} />}
      </TouchableOpacity>
    );
  });
}

const tabStyles = StyleSheet.create({
  barBase: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 10, 21, 0.97)",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(198, 34, 41, 0.3)",
    shadowColor: "#C62229",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    zIndex: zIndex.header,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    position: "relative",
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.iconDisabled,
  },
  labelActive: {
    color: Colors.iconAccent,
  },
  activeDot: {
    position: "absolute",
    top: -9,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.iconAccent,
  },
});

// ── Layout ────────────────────────────────────────────────────────────────────
export default function TabsLayout() {
  return (
    <>
      <AuthLoading>
        <AppLoader />
      </AuthLoading>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
      <Authenticated>
        <Tabs
          tabBar={(props) => <CardTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="home"    options={{ title: "Home" }} />
          <Tabs.Screen name="pulse"   options={{ title: "Pulse" }} />
          <Tabs.Screen name="wallet"  options={{ title: "Wallet" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
          <Tabs.Screen name="deposit"      options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="transfer"     options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="withdraw"     options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="reel-viewer"  options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="reel-comments" options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="write-reel"   options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="admin"        options={{ href: null, headerShown: false }} />
          <Tabs.Screen name="notification" options={{ href: null, headerShown: false }} />
        </Tabs>
      </Authenticated>
    </>
  );
}
