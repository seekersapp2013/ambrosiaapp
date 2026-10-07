import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typeScale } from "@/tokens/typography";
import { radius } from "@/tokens/radius";

interface VerifiedBadgeProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
}

export function VerifiedBadge({ size = "medium", showText = true }: VerifiedBadgeProps) {
  const iconSize = size === "small" ? 14 : size === "large" ? 20 : 16;

  return (
    <View style={[styles.badge, size === "small" && styles.badgeSmall]}>
      <Ionicons name="checkmark-circle" size={iconSize} color="#10B981" />
      {showText && (
        <Text style={[styles.text, size === "small" && styles.textSmall]}>
          Verified
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B98115",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#10B98130",
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 2,
  },
  text: {
    ...typeScale.labelSmall,
    color: "#10B981",
    fontWeight: "700",
  },
  textSmall: {
    fontSize: 10,
  },
});
