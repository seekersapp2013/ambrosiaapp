/**
 * LoadingSpinner
 * Centered activity indicator with optional label.
 */

import React from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/Colors";

interface LoadingSpinnerProps {
  label?: string;
  size?: "small" | "large";
}

export function LoadingSpinner({ label, size = "large" }: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={Colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
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
    color: Colors.textMuted,
    textAlign: "center",
  },
});
