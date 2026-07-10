/**
 * LoadingSpinner
 * Centered activity indicator with optional label.
 *
 * ✅ Phase 0: Uses useColors() for theme-aware rendering.
 */

import React from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface LoadingSpinnerProps {
  label?: string;
  size?: "small" | "large";
}

export function LoadingSpinner({ label, size = "large" }: LoadingSpinnerProps) {
  const C = useColors();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={C.actionPrimary} />
      {label ? <Text style={[styles.label, { color: C.textMuted }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 12,
  },
  label: {
    fontSize: 14,
    textAlign: "center",
  },
});
