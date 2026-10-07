import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typeScale } from "@/tokens/typography";

interface BadgeIconProps {
  displayName: string;
  color: string;
  backgroundColor?: string;
  size?: "small" | "medium" | "large";
}

export function BadgeIcon({
  displayName,
  color,
  backgroundColor,
  size = "medium",
}: BadgeIconProps) {
  const isSmall = size === "small";
  const isLarge = size === "large";

  const dimension = isSmall ? 24 : isLarge ? 48 : 36;
  const iconSize = isSmall ? 14 : isLarge ? 26 : 20;

  return (
    <View
      style={[
        styles.iconBox,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor: backgroundColor || `${color}20`,
          borderColor: color,
        },
      ]}
    >
      <Ionicons name={"ribbon-outline" as any} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBox: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
});
