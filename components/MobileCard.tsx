/**
 * MobileCard
 *
 * Floating card panel used as the main content container across all screens.
 *
 * Theme behaviour:
 *   Dark  — deep dark `#0F0F1E` with crimson border + red-tinted shadow
 *           (same visual as before — no regression)
 *   Light — solid pure white `#FFFFFF` on the #F5F6FA page background.
 *           Border is a near-invisible hairline `rgba(0,0,0,0.08)`.
 *           Shadow is a soft neutral lift — no coloured glow on light bg.
 *
 * Global toggle:
 *   Set MOBILE_CARD_ENABLED = false to render children unwrapped.
 *
 * Per-instance override:
 *   <MobileCard enabled={false}> — disables just that instance.
 *
 * useCardInsets:
 *   Returns { left, right } insets to align absolutely-positioned overlays
 *   (FABs, toasts, sticky CTAs) to the card boundary on large screens.
 */

import React from "react";
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Dimensions,
} from "react-native";
import { useAppTheme } from "@/context/ThemeContext";

// ─── Global feature flag ──────────────────────────────────────────────────────
export const MOBILE_CARD_ENABLED = true;

// ─── Card geometry ────────────────────────────────────────────────────────────
export const CARD_MAX_WIDTH  = 500;
export const CARD_PADDING_H  = 16;

export function useCardInsets(): { left: number; right: number } {
  if (!MOBILE_CARD_ENABLED) return { left: 0, right: 0 };
  const screenW = Dimensions.get("window").width;
  const cardW   = Math.min(screenW - CARD_PADDING_H * 2, CARD_MAX_WIDTH);
  return { left: (screenW - cardW) / 2, right: (screenW - cardW) / 2 };
}

// ─── Theme-specific card surface styles ───────────────────────────────────────

const darkCardStyle: ViewStyle = {
  backgroundColor: "#0F0F1E",
  borderColor:     "rgba(198,34,41,0.30)",
  // Red-tinted shadow — brand shadow on dark backgrounds
  shadowColor:     "#C62229",
  shadowOffset:    { width: 0, height: 20 },
  shadowOpacity:   0.15,
  shadowRadius:    40,
  elevation:       8,
};

const lightCardStyle: ViewStyle = {
  backgroundColor: "#FFFFFF",          // solid white — pops on #F5F6FA page
  borderColor:     "rgba(0,0,0,0.08)", // near-invisible hairline
  // Neutral shadow — no colour noise on the light background
  shadowColor:     "#000000",
  shadowOffset:    { width: 0, height: 4 },
  shadowOpacity:   0.08,
  shadowRadius:    20,
  elevation:       4,
};

// ─── Component ────────────────────────────────────────────────────────────────
interface MobileCardProps {
  children:       React.ReactNode;
  enabled?:       boolean;
  style?:         StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

export function MobileCard({
  children,
  enabled,
  style,
  containerStyle,
}: MobileCardProps) {
  const active    = enabled !== undefined ? enabled : MOBILE_CARD_ENABLED;
  const { isDark } = useAppTheme();

  if (!active) return <>{children}</>;

  const themedCard = isDark ? darkCardStyle : lightCardStyle;

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.cardBase, themedCard, style]}>
        {children}
      </View>
    </View>
  );
}

// ─── Base styles (geometry only — colours come from themedCard above) ─────────
const styles = StyleSheet.create({
  container: {
    width:            "100%",
    alignItems:       "center",
    paddingHorizontal: CARD_PADDING_H,
    paddingVertical:   16,
  },
  cardBase: {
    width:      "100%",
    maxWidth:   CARD_MAX_WIDTH,
    borderRadius: 20,
    borderWidth:  1,
    overflow:     "hidden",
  },
});
