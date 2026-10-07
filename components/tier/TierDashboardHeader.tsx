import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TierBadge } from "./TierBadge";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface TierDashboardHeaderProps {
  currentTier: string;
  prsScore: number;
  lastCalculated?: number;
}

export function TierDashboardHeader({
  currentTier,
  prsScore,
  lastCalculated,
}: TierDashboardHeaderProps) {
  const formattedDate = lastCalculated
    ? new Date(lastCalculated).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badgeContainer}>
          <TierBadge tier={currentTier as any} size="large" showScore={false} />
        </View>

        <View style={styles.scoreGauge}>
          <Text style={styles.prsLabel}>Professional Recognition Score</Text>
          <Text style={styles.prsNumber}>{prsScore}</Text>
          <Text style={styles.prsMax}>out of 100 PRS</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.updatedText}>Last calculated: {formattedDate}</Text>
        <Text style={styles.autoText}>Auto-calculated daily</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeContainer: {
    flex: 1,
    alignItems: "flex-start",
  },
  scoreGauge: {
    alignItems: "flex-end",
  },
  prsLabel: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
    textTransform: "uppercase",
  },
  prsNumber: {
    fontSize: 42,
    fontWeight: "800",
    color: "#00BFA6",
    lineHeight: 48,
  },
  prsMax: {
    ...typeScale.bodySmall,
    color: "#6B7280",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#262945",
  },
  updatedText: {
    ...typeScale.labelSmall,
    color: "#6B7280",
  },
  autoText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
  },
});
