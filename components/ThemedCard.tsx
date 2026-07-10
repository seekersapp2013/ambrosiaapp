/**
 * ThemedCard
 *
 * A lightweight general-purpose card surface used for content items,
 * transaction rows, notification items, list entries, and any other
 * raised surface that is NOT the main MobileCard wrapper.
 *
 * Design:
 *   Dark  — bgElevated (#171730) surface with a subtle white-12 border
 *           and soft red-tinted shadow for depth.
 *   Light — pure white (#FFFFFF) surface on the #F5F6FA page background
 *           with a near-invisible hairline border and a neutral soft shadow.
 *           This matches the card pattern from the reference health-app samples.
 *
 * Props:
 *   style          — override the card wrapper style
 *   contentStyle   — override the inner content padding wrapper style
 *   padded         — apply standard 16px inner padding (default: true)
 *   children       — card content
 *
 * Usage:
 *   <ThemedCard>
 *     <Text>Card content</Text>
 *   </ThemedCard>
 *
 *   <ThemedCard padded={false}>
 *     <Image ... />
 *   </ThemedCard>
 */

import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";

interface ThemedCardProps {
  children:      React.ReactNode;
  style?:        StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  padded?:       boolean;
}

export function ThemedCard({
  children,
  style,
  contentStyle,
  padded = true,
}: ThemedCardProps) {
  const { isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        isDark ? styles.darkCard : styles.lightCard,
        style,
      ]}
    >
      <View style={[padded && styles.padding, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth:  1,
    overflow:     "hidden",
  },

  // ── Dark ───────────────────────────────────────────────────────────────────
  darkCard: {
    backgroundColor: "#171730",
    borderColor:     "rgba(255,255,255,0.10)",
    shadowColor:     "#C62229",
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.12,
    shadowRadius:    16,
    elevation:       4,
  },

  // ── Light ──────────────────────────────────────────────────────────────────
  lightCard: {
    backgroundColor: "#FFFFFF",
    borderColor:     "rgba(0,0,0,0.08)",
    shadowColor:     "#000000",
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    12,
    elevation:       2,
  },

  padding: {
    padding: 16,
  },
});
