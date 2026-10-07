import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TierBadge } from "./TierBadge";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface TierChangeNotificationProps {
  type: "TIER_PROMOTION" | "TIER_DEMOTION";
  newTier: string;
  prsScore: number;
  onViewDashboard?: () => void;
}

export function TierChangeNotification({
  type,
  newTier,
  prsScore,
  onViewDashboard,
}: TierChangeNotificationProps) {
  const C = useColors();
  const isPromo = type === "TIER_PROMOTION";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: C.bgSurface, borderColor: isPromo ? "#FFD700" : C.statusWarning },
        isPromo ? styles.promoCard : styles.demotionCard,
      ]}
    >
      {isPromo && (
        <View style={styles.celebrationBanner}>
          <Text style={styles.celebrationText}>🎉 INSTANT REWARD & TIER UPGRADE 🎉</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <Ionicons
          name={isPromo ? "trophy" : "alert-circle"}
          size={24}
          color={isPromo ? "#FFD700" : C.statusWarning}
        />
        <Text style={[styles.titleText, { color: C.textPrimary }]}>
          {isPromo ? "Tier Promoted!" : "Recognition Tier Updated"}
        </Text>
      </View>

      <View style={styles.badgeRow}>
        <Text style={[styles.subText, { color: C.textMuted }]}>
          {isPromo ? "Congratulations! Your new level:" : "Your current professional level:"}
        </Text>
        <TierBadge tier={newTier as any} size="medium" showScore prsScore={prsScore} />
      </View>

      {onViewDashboard && (
        <TouchableOpacity
          style={[styles.dashboardBtn, { backgroundColor: C.actionPrimary }]}
          onPress={onViewDashboard}
          activeOpacity={0.8}
        >
          <Text style={styles.dashboardBtnText}>View Recognition Dashboard</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  promoCard: {
    backgroundColor: "rgba(255, 215, 0, 0.08)",
  },
  demotionCard: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
  },
  celebrationBanner: {
    backgroundColor: "#FFD70025",
    paddingVertical: 4,
    marginHorizontal: -spacing.md,
    marginTop: -spacing.md,
    marginBottom: spacing.sm,
    alignItems: "center",
  },
  celebrationText: {
    ...typeScale.labelSmall,
    color: "#FFD700",
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  titleText: {
    ...typeScale.titleSmall,
    fontWeight: "700",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: spacing.xs,
  },
  subText: {
    ...typeScale.bodySmall,
  },
  dashboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  dashboardBtnText: {
    ...typeScale.labelSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
