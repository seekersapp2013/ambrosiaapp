/**
 * MobileCard
 *
 * Floating card panel that replicates the login screen's
 * "card on dark background" pattern. All screen content lives
 * inside this card — bordered, rounded, with a subtle red glow.
 *
 * Global toggle:
 *   Set MOBILE_CARD_ENABLED = false to render children unwrapped
 *   on every screen that uses this component.
 *
 * Per-instance override:
 *   <MobileCard enabled={false}> — disables just that instance
 *
 * useCardInsets:
 *   Returns { left, right } pixel insets so that absolutely-positioned
 *   overlays (modals, sticky CTAs, FABs, toasts) rendered OUTSIDE the card
 *   can still align to the card boundary. This keeps everything visually
 *   within the 500px card column on large screens (web/tablet).
 *
 *   Usage:
 *     const { left: cardLeft, right: cardRight } = useCardInsets();
 *     // Then in a style: { position:"absolute", left: cardLeft, right: cardRight }
 */

import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle, Dimensions, Platform } from "react-native";

// ─── Global feature flag ──────────────────────────────────────────────────────
export const MOBILE_CARD_ENABLED = true;

// ─── Card geometry constants (must mirror StyleSheet values below) ────────────
export const CARD_MAX_WIDTH = 500;
export const CARD_PADDING_H = 16; // container paddingHorizontal

/**
 * Returns the left and right pixel insets that align an absolutely-positioned
 * overlay (sheet, toast, FAB, sticky CTA) to the card boundary.
 *
 * When MobileCard is disabled, returns { left: 0, right: 0 }.
 *
 * Call this at render time (not in a hook) — it reads Dimensions synchronously.
 * Re-render on window resize is handled naturally because the component
 * re-renders when state/props change.
 */
export function useCardInsets(): { left: number; right: number } {
  if (!MOBILE_CARD_ENABLED) return { left: 0, right: 0 };
  const screenW = Dimensions.get("window").width;
  const cardW = Math.min(screenW - CARD_PADDING_H * 2, CARD_MAX_WIDTH);
  const sideInset = (screenW - cardW) / 2;
  return { left: sideInset, right: sideInset };
}

// ─── Component ────────────────────────────────────────────────────────────────
interface MobileCardProps {
  children: React.ReactNode;
  /** Per-instance override. Defaults to MOBILE_CARD_ENABLED. */
  enabled?: boolean;
  /** Extra styles on the card panel */
  style?: StyleProp<ViewStyle>;
  /** Extra styles on the outer centering container */
  containerStyle?: StyleProp<ViewStyle>;
}

export function MobileCard({
  children,
  enabled,
  style,
  containerStyle,
}: MobileCardProps) {
  const active = enabled !== undefined ? enabled : MOBILE_CARD_ENABLED;

  if (!active) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.card, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: CARD_PADDING_H,
    paddingVertical: 16,
  },
  card: {
    width: "100%",
    maxWidth: CARD_MAX_WIDTH,
    backgroundColor: "rgba(10, 10, 21, 0.97)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(198, 34, 41, 0.3)",
    shadowColor: "#C62229",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
    overflow: "hidden",
  },
});
