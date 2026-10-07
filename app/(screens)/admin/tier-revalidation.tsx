import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useColors } from "@/hooks/useColors";
import { AppBackground } from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TierBadge } from "@/components/tier/TierBadge";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

export default function AdminTierRevalidationScreen() {
  const router = useRouter();
  const C = useColors();

  const pendingItems = useQuery((api as any).tierRevalidation.getPendingRevalidations);
  const resolveMutation = useMutation((api as any).tierRevalidation.resolveRevalidation);

  const [comments, setComments] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleResolve = async (auditLogId: any, action: "confirm" | "reject") => {
    try {
      setProcessingId(auditLogId);
      const comment = comments[auditLogId] || "";
      await resolveMutation({
        auditLogId,
        action,
        comment: comment.trim() || undefined,
      });
      Alert.alert("Success", `Revalidation ${action === "confirm" ? "confirmed" : "rejected"} successfully.`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to resolve revalidation");
    } finally {
      setProcessingId(null);
    }
  };

  if (pendingItems === undefined) {
    return (
      <AppBackground>
        <ScreenHeader title="Tier Revalidation" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.actionPrimary} />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScreenHeader
        title="Tier Revalidation"
        onBack={() => router.back()}
      />

      {pendingItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle-outline" size={64} color={C.statusSuccess} />
          <Text style={[styles.emptyTitle, { color: C.textPrimary }]}>All Clear!</Text>
          <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
            There are no pending provider licence revalidations awaiting manual review.
          </Text>
        </View>
      ) : (
        <FlatList
          data={pendingItems}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const commentVal = comments[item._id] || "";
            const isProcessing = processingId === item._id;

            return (
              <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.providerInfo}>
                    <Text style={[styles.providerName, { color: C.textPrimary }]}>{item.providerName}</Text>
                    <Text style={[styles.providerUsername, { color: C.textMuted }]}>@{item.providerUsername}</Text>
                  </View>
                  <View style={styles.badgeRow}>
                    <TierBadge tier={item.previousTier || "sapphire"} size="small" />
                    <Ionicons name="arrow-forward" size={14} color={C.textMuted} />
                    <TierBadge tier={item.newTier} size="small" />
                  </View>
                </View>

                <View style={[styles.reasonBox, { backgroundColor: C.statusWarningBg }]}>
                  <Ionicons name="alert-circle-outline" size={18} color={C.statusWarning} />
                  <Text style={[styles.reasonText, { color: C.statusWarning }]}>{item.reason}</Text>
                </View>

                <Text style={[styles.inputLabel, { color: C.textSecondary }]}>Admin Offline Verification Note:</Text>
                <TextInput
                  style={[styles.commentInput, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
                  placeholder="e.g. Verified licence renewed via NMCN portal on 2026-08-10..."
                  placeholderTextColor={C.textMuted}
                  value={commentVal}
                  onChangeText={(val) => setComments((prev) => ({ ...prev, [item._id]: val }))}
                  multiline
                />

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: C.actionPrimary }]}
                    disabled={isProcessing}
                    onPress={() => handleResolve(item._id, "confirm")}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                        <Text style={styles.btnText}>Confirm Downgrade</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btn, { backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.borderSubtle }]}
                    disabled={isProcessing}
                    onPress={() => handleResolve(item._id, "reject")}
                  >
                    <Ionicons name="close" size={18} color={C.textPrimary} />
                    <Text style={[styles.btnText, { color: C.textPrimary }]}>Reject (Keep Tier)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    ...typeScale.titleLarge,
    fontWeight: "700",
    marginTop: spacing.md,
  },
  emptySubtitle: {
    ...typeScale.bodyMedium,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    ...typeScale.titleMedium,
    fontWeight: "700",
  },
  providerUsername: {
    ...typeScale.bodySmall,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  reasonBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  reasonText: {
    ...typeScale.bodySmall,
    flex: 1,
  },
  inputLabel: {
    ...typeScale.labelSmall,
    marginBottom: spacing.xs,
  },
  commentInput: {
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    minHeight: 60,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  btnText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
