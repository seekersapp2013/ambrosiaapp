/**
 * EmptyState
 * Icon + title + subtitle + optional CTA button.
 *
 * ✅ Phase 0: Uses useColors() for theme-aware rendering.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({
  icon = "document-outline",
  title,
  subtitle,
  ctaLabel,
  onCta,
}: EmptyStateProps) {
  const C = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: C.bgElevated }]}>
        <Ionicons name={icon} size={40} color={C.textMuted} />
      </View>
      <Text style={[styles.title, { color: C.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: C.textMuted }]}>{subtitle}</Text> : null}
      {ctaLabel && onCta ? (
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: C.actionPrimary }]}
          onPress={onCta}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 10,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  ctaBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
