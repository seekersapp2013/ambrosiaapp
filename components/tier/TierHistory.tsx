import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface TierHistoryProps {
  logs: Array<{
    _id: string;
    previousTier?: string;
    newTier: string;
    previousPrs?: number;
    newPrs: number;
    reason: string;
    timestamp: number;
  }>;
}

export function TierHistory({ logs }: TierHistoryProps) {
  if (!logs || logs.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Tier History</Text>
        <Text style={styles.emptySub}>No tier change events recorded yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Tier History & Activity Log</Text>

      {logs.map((log, idx) => {
        const formattedDate = new Date(log.timestamp).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const isPromo =
          ["sapphire", "silver", "gold", "platinum", "diamond"].indexOf(log.newTier) >
          ["sapphire", "silver", "gold", "platinum", "diamond"].indexOf(
            log.previousTier || "sapphire"
          );

        return (
          <View key={log._id || idx} style={styles.logItem}>
            <View style={styles.leftCol}>
              <Ionicons
                name={isPromo ? "trending-up" : "trending-down"}
                size={18}
                color={isPromo ? "#10B981" : "#F59E0B"}
              />
              <View style={styles.vLine} />
            </View>

            <View style={styles.rightCol}>
              <View style={styles.logHeader}>
                <Text style={styles.tierChangeText}>
                  {(log.previousTier || "sapphire").toUpperCase()} → {log.newTier.toUpperCase()}
                </Text>
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
              <Text style={styles.reasonText}>{log.reason}</Text>
              <Text style={styles.scoreText}>
                PRS Score: {log.newPrs} (was {log.previousPrs ?? 0})
              </Text>
            </View>
          </View>
        );
      })}
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
  title: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  emptySub: {
    ...typeScale.bodySmall,
    color: "#6B7280",
  },
  logItem: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  leftCol: {
    alignItems: "center",
    width: 24,
  },
  vLine: {
    width: 1,
    flex: 1,
    backgroundColor: "#262945",
    marginVertical: 4,
  },
  rightCol: {
    flex: 1,
    paddingBottom: spacing.sm,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tierChangeText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dateText: {
    ...typeScale.bodySmall,
    color: "#6B7280",
  },
  reasonText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  scoreText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    marginTop: 2,
  },
});
