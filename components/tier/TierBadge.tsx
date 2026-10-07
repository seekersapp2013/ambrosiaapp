import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { typeScale } from "@/tokens/typography";
import { radius } from "@/tokens/radius";

export type TierType = "sapphire" | "silver" | "gold" | "platinum" | "diamond";

export interface TierBadgeProps {
  tier: TierType | string;
  size?: "small" | "medium" | "large";
  variant?: "medallion" | "pill" | "compact";
  prsScore?: number;
  showScore?: boolean;
}

const TIER_CONFIG: Record<
  string,
  {
    name: string;
    gradient: readonly [string, string, ...string[]];
    accent: string;
    border: string;
    bg: string;
    stars: number;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  sapphire: {
    name: "Sapphire",
    gradient: ["#0F2027", "#203A43", "#2C5364"],
    accent: "#64B5F6",
    border: "rgba(100, 181, 246, 0.4)",
    bg: "rgba(33, 150, 243, 0.15)",
    stars: 1,
    icon: "shield-checkmark-outline",
  },
  silver: {
    name: "Silver",
    gradient: ["#232526", "#414345"],
    accent: "#E0E0E0",
    border: "rgba(224, 224, 224, 0.4)",
    bg: "rgba(176, 190, 197, 0.15)",
    stars: 2,
    icon: "ribbon-outline",
  },
  gold: {
    name: "Gold",
    gradient: ["#3A1C71", "#D76D77", "#FFAF7B"],
    accent: "#FFD700",
    border: "rgba(255, 215, 0, 0.4)",
    bg: "rgba(255, 215, 0, 0.15)",
    stars: 3,
    icon: "star",
  },
  platinum: {
    name: "Platinum",
    gradient: ["#2B5876", "#4E4376"],
    accent: "#E5E4E2",
    border: "rgba(229, 228, 226, 0.4)",
    bg: "rgba(229, 228, 226, 0.18)",
    stars: 4,
    icon: "sparkles",
  },
  diamond: {
    name: "Diamond",
    gradient: ["#000428", "#004E92"],
    accent: "#B9F2FF",
    border: "rgba(185, 242, 255, 0.6)",
    bg: "rgba(185, 242, 255, 0.22)",
    stars: 5,
    icon: "diamond",
  },
};

export function TierBadge({
  tier,
  size = "medium",
  variant = "pill",
  prsScore,
  showScore = false,
}: TierBadgeProps) {
  const normalizedKey = (tier || "sapphire").toLowerCase();
  const meta = TIER_CONFIG[normalizedKey] || TIER_CONFIG.sapphire;

  const isSmall = size === "small";
  const isLarge = size === "large";
  const iconSize = isSmall ? 12 : isLarge ? 20 : 14;

  // Render Michelin-style star row
  const renderStars = () => {
    const starList = [];
    for (let i = 0; i < meta.stars; i++) {
      starList.push(
        <Ionicons
          key={i}
          name="star"
          size={isSmall ? 10 : isLarge ? 14 : 12}
          color={meta.accent}
        />
      );
    }
    return <View style={styles.starRow}>{starList}</View>;
  };

  if (variant === "medallion") {
    return (
      <LinearGradient
        colors={meta.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.medallion, { borderColor: meta.border }]}
      >
        <View style={styles.medallionHeader}>
          <Ionicons name={meta.icon} size={24} color={meta.accent} />
          {renderStars()}
        </View>

        <Text style={[styles.medallionTitle, { color: meta.accent }]}>
          {meta.name} Provider
        </Text>

        {prsScore !== undefined && (
          <View style={[styles.prsPill, { backgroundColor: "rgba(0,0,0,0.3)", borderColor: meta.border }]}>
            <Text style={styles.prsLabel}>PRS Score</Text>
            <Text style={[styles.prsValue, { color: meta.accent }]}>{prsScore}/100</Text>
          </View>
        )}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: meta.bg, borderColor: meta.border },
        isSmall && styles.badgeSmall,
        isLarge && styles.badgeLarge,
      ]}
    >
      <Ionicons name={meta.icon} size={iconSize} color={meta.accent} />
      <Text
        style={[
          styles.badgeText,
          { color: meta.accent },
          isSmall && styles.textSmall,
          isLarge && styles.textLarge,
        ]}
      >
        {meta.name}
      </Text>

      {renderStars()}

      {showScore && prsScore !== undefined ? (
        <Text style={[styles.scoreText, { color: meta.accent }]}>
          ({prsScore})
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  badgeText: {
    ...typeScale.labelMedium,
    fontWeight: "700",
  },
  textSmall: {
    ...typeScale.labelSmall,
    fontSize: 10,
  },
  textLarge: {
    ...typeScale.titleSmall,
    fontWeight: "800",
  },
  scoreText: {
    ...typeScale.labelSmall,
    fontWeight: "800",
    marginLeft: 2,
    opacity: 0.9,
  },
  // Medallion styling
  medallion: {
    padding: 16,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    alignItems: "center",
    gap: 8,
  },
  medallionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  medallionTitle: {
    ...typeScale.titleMedium,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  prsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 4,
  },
  prsLabel: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
  },
  prsValue: {
    ...typeScale.labelMedium,
    fontWeight: "800",
  },
});
