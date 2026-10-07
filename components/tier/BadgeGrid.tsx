import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BadgeIcon } from "./BadgeIcon";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface BadgeGridProps {
  badges: Array<{
    _id: string;
    earnedAt: number;
    awardedByRole?: string;
    badgeDef?: {
      displayName: string;
      description: string;
      color: string;
      backgroundColor?: string;
      benefits?: any;
    } | null;
  }>;
}

export function BadgeGrid({ badges }: BadgeGridProps) {
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  if (!badges || badges.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="ribbon-outline" size={28} color="#6B7280" />
        <Text style={styles.emptyText}>No special badges awarded yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recognized Badges & Honors</Text>

      <View style={styles.grid}>
        {badges.map((b) => {
          const def = b.badgeDef;
          if (!def) return null;

          return (
            <TouchableOpacity
              key={b._id}
              style={styles.badgeCard}
              onPress={() => setSelectedBadge(b)}
            >
              <BadgeIcon
                displayName={def.displayName}
                color={def.color}
                backgroundColor={def.backgroundColor}
                size="medium"
              />
              <Text style={styles.badgeName} numberOfLines={1}>
                {def.displayName}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Detail Modal */}
      {selectedBadge && selectedBadge.badgeDef && (
        <Modal transparent animationType="fade" visible={!!selectedBadge}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <BadgeIcon
                  displayName={selectedBadge.badgeDef.displayName}
                  color={selectedBadge.badgeDef.color}
                  backgroundColor={selectedBadge.badgeDef.backgroundColor}
                  size="large"
                />
                <Text style={styles.modalTitle}>
                  {selectedBadge.badgeDef.displayName}
                </Text>
                <Text style={styles.modalSub}>
                  Awarded: {new Date(selectedBadge.earnedAt).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.modalDesc}>
                {selectedBadge.badgeDef.description}
              </Text>

              {selectedBadge.badgeDef.benefits?.prsBonus ? (
                <View style={styles.perkRow}>
                  <Ionicons name="sparkles" size={16} color="#00BFA6" />
                  <Text style={styles.perkText}>
                    PRS Score Bonus: +{selectedBadge.badgeDef.benefits.prsBonus} pts
                  </Text>
                </View>
              ) : null}

              {selectedBadge.badgeDef.benefits?.searchBoost ? (
                <View style={styles.perkRow}>
                  <Ionicons name="arrow-up-circle" size={16} color="#00BFA6" />
                  <Text style={styles.perkText}>
                    Search Rank Boost: +{selectedBadge.badgeDef.benefits.searchBoost} rank pts
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedBadge(null)}
              >
                <Text style={styles.closeBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  badgeCard: {
    backgroundColor: "#16182B",
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    alignItems: "center",
    width: 90,
  },
  badgeName: {
    ...typeScale.labelSmall,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
  },
  emptyContainer: {
    padding: spacing.md,
    alignItems: "center",
  },
  emptyText: {
    ...typeScale.bodySmall,
    color: "#6B7280",
    marginTop: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: "#16182B",
    width: "100%",
    maxWidth: 360,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#262945",
    alignItems: "center",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  modalSub: {
    ...typeScale.bodySmall,
    color: "#6B7280",
    marginTop: 2,
  },
  modalDesc: {
    ...typeScale.bodyMedium,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: spacing.md,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  perkText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "600",
  },
  closeBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginTop: spacing.md,
  },
  closeBtnText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
