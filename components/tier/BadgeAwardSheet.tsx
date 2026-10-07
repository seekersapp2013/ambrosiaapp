import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BadgeIcon } from "./BadgeIcon";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface BadgeAwardSheetProps {
  providerUserId: Id<"users">;
  circleId?: Id<"circles">;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BadgeAwardSheet({
  providerUserId,
  circleId,
  onSuccess,
  onCancel,
}: BadgeAwardSheetProps) {
  const activeBadges = useQuery(api.badges.getActiveBadges) || [];
  const awardMut = useMutation(api.badges.awardBadge);

  const [selectedBadgeId, setSelectedBadgeId] = useState<Id<"badges"> | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter awardable badges
  const awardableList = activeBadges.filter(
    (b) => b.awardableBy === "circle_admin" || b.awardableBy === "platform_admin"
  );

  const handleAward = async () => {
    if (!selectedBadgeId) {
      Alert.alert("Select Badge", "Please select a badge to award.");
      return;
    }

    try {
      setLoading(true);
      await awardMut({
        userId: providerUserId,
        badgeId: selectedBadgeId,
        circleId,
      });

      Alert.alert("Awarded!", "Badge has been granted to the provider.");
      onSuccess?.();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to award badge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.sheetContainer}>
      <Text style={styles.sheetTitle}>Award Provider Badge</Text>
      <Text style={styles.sheetSub}>
        Recognize quality contributions and professional participation.
      </Text>

      {awardableList.length === 0 ? (
        <Text style={styles.emptyText}>No awardable badges configured for your role.</Text>
      ) : (
        <View style={styles.list}>
          {awardableList.map((b) => {
            const isSelected = selectedBadgeId === b._id;
            return (
              <TouchableOpacity
                key={b._id}
                style={[styles.badgeOption, isSelected && styles.badgeOptionSelected]}
                onPress={() => setSelectedBadgeId(b._id)}
              >
                <BadgeIcon
                  displayName={b.displayName}
                  color={b.color}
                  backgroundColor={b.backgroundColor}
                  size="small"
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{b.displayName}</Text>
                  <Text style={styles.optionDesc} numberOfLines={1}>
                    {b.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.actionsRow}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.awardBtn} onPress={handleAward} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.awardText}>Grant Badge</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
  },
  sheetTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sheetSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typeScale.bodySmall,
    color: "#6B7280",
  },
  list: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  badgeOption: {
    backgroundColor: "#0F101D",
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  badgeOptionSelected: {
    backgroundColor: "#00BFA615",
    borderColor: "#00BFA6",
  },
  optionTitle: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
  },
  optionDesc: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#374151",
  },
  cancelText: {
    ...typeScale.labelMedium,
    color: "#9CA3AF",
  },
  awardBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  awardText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
