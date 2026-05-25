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
 */

import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";

// ─── Global feature flag ──────────────────────────────────────────────────────
export const MOBILE_CARD_ENABLED = true;

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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  card: {
    width: "100%",
    maxWidth: 500,
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
