import React from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useColors } from "@/hooks/useColors";
import { AppBackground } from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TierBadge } from "@/components/tier/TierBadge";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

export default function AdminTierAuditLogScreen() {
  const router = useRouter();
  const C = useColors();
  const logs = useQuery((api as any).tierRevalidation.getAllTierAuditLogs, { limit: 100 });

  if (logs === undefined) {
    return (
      <AppBackground>
        <ScreenHeader title="Tier Audit Log" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.actionPrimary} />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScreenHeader
        title="Tier Audit Log"
        onBack={() => router.back()}
      />

      {logs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>No Audit Logs</Text>
          <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
            No tier promotions, demotions, or evaluations logged yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const dateStr = new Date(item.timestamp).toLocaleString();

            return (
              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, { color: C.textPrimary }]}>{item.providerName}</Text>
                    <Text style={[styles.timestampText, { color: C.textMuted }]}>{dateStr}</Text>
                  </View>

                  <View style={[styles.triggerBadge, { backgroundColor: C.bgElevated }]}>
                    <Text style={[styles.triggerText, { color: C.actionPrimary }]}>
                      {(item.triggeredBy || "system").toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.tierChangeRow}>
                  {item.previousTier ? (
                    <>
                      <TierBadge tier={item.previousTier} size="small" />
                      <Ionicons name="arrow-forward" size={14} color={C.textMuted} />
                    </>
                  ) : null}
                  <TierBadge tier={item.newTier} size="small" showScore prsScore={item.newPrs} />
                </View>

                <Text style={[styles.reasonText, { color: C.textSecondary }]}>Reason: {item.reason}</Text>

                {item.aiExplanation && (
                  <View style={[styles.aiBox, { backgroundColor: C.isDark ? "rgba(198,34,41,0.08)" : "rgba(198,34,41,0.06)" }]}>
                    <Ionicons name="sparkles" size={14} color={C.actionPrimary} />
                    <Text style={[styles.aiText, { color: C.actionPrimary }]}>AI Rationale: {item.aiExplanation}</Text>
                  </View>
                )}

                {item.adminComment && (
                  <View style={[styles.adminCommentBox, { backgroundColor: C.bgElevated }]}>
                    <Ionicons name="person" size={14} color={C.textMuted} />
                    <Text style={[styles.adminCommentText, { color: C.textMuted }]}>Admin Note: {item.adminComment}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  emptyTitle: { ...typeScale.titleLarge, fontWeight: "700", marginTop: spacing.md },
  emptySubtitle: { ...typeScale.bodyMedium, textAlign: "center", marginTop: spacing.xs },
  listContent: { padding: spacing.md, gap: spacing.md },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: spacing.sm },
  providerInfo: { flex: 1 },
  providerName: { ...typeScale.titleMedium, fontWeight: "700" },
  timestampText: { ...typeScale.bodySmall, marginTop: 2 },
  triggerBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.xs },
  triggerText: { ...typeScale.labelSmall, fontWeight: "700", fontSize: 10 },
  tierChangeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginVertical: spacing.xs },
  reasonText: { ...typeScale.bodySmall, marginTop: spacing.xs },
  aiBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  aiText: { ...typeScale.bodySmall, flex: 1 },
  adminCommentBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  adminCommentText: { ...typeScale.bodySmall, flex: 1 },
});
