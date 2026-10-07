import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface PRSProgressBarProps {
  prsScore: number;
  nextTier?: string | null;
  pointsNeeded?: number;
  progressPercentage?: number;
}

export function PRSProgressBar({
  prsScore,
  nextTier,
  pointsNeeded = 0,
  progressPercentage = 0,
}: PRSProgressBarProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Progress to Next Tier</Text>
        {nextTier ? (
          <Text style={styles.neededText}>
            <Text style={{ fontWeight: "700", color: "#00BFA6" }}>{pointsNeeded} pts</Text> needed for {nextTier.toUpperCase()}
          </Text>
        ) : (
          <Text style={styles.neededText}>Highest Level Reached!</Text>
        )}
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progressPercentage}%` }]} />
      </View>

      <View style={styles.labelsRow}>
        <Text style={styles.subText}>Current: {prsScore} PRS</Text>
        <Text style={styles.subText}>{progressPercentage}% completed</Text>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  neededText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
  },
  track: {
    height: 10,
    backgroundColor: "#0F101D",
    borderRadius: 5,
    overflow: "hidden",
    marginVertical: 6,
  },
  fill: {
    height: "100%",
    backgroundColor: "#00BFA6",
    borderRadius: 5,
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  subText: {
    ...typeScale.labelSmall,
    color: "#6B7280",
  },
});
