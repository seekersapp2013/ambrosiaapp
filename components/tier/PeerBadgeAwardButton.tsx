import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Modal,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { BadgeIcon } from "./BadgeIcon";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface PeerBadgeAwardButtonProps {
  targetUserId: Id<"users">;
  targetName?: string;
}

export function PeerBadgeAwardButton({
  targetUserId,
  targetName = "Colleague",
}: PeerBadgeAwardButtonProps) {
  const activeBadges = useQuery(api.badges.getActiveBadges) || [];
  const awardMut = useMutation(api.badges.awardBadge);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<Id<"badges"> | null>(null);
  const [loading, setLoading] = useState(false);

  const peerBadges = activeBadges.filter((b) => b.awardableBy === "peers");

  const handleEndorse = async () => {
    if (!selectedBadgeId) {
      Alert.alert("Select Badge", "Please choose an endorsement badge.");
      return;
    }

    try {
      setLoading(true);
      await awardMut({
        userId: targetUserId,
        badgeId: selectedBadgeId,
        reason: "Peer endorsement",
      });

      Alert.alert("Endorsed!", `You endorsed ${targetName}.`);
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to endorse peer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.endorseBtn}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="ribbon-outline" size={16} color="#00BFA6" />
        <Text style={styles.endorseBtnText}>Endorse Peer</Text>
      </TouchableOpacity>

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Endorse {targetName}</Text>
            <Text style={styles.modalSub}>
              Select a professional recognition badge to grant to your colleague.
            </Text>

            {peerBadges.length === 0 ? (
              <Text style={styles.emptyText}>No peer-to-peer badges available currently.</Text>
            ) : (
              peerBadges.map((b) => {
                const isSelected = selectedBadgeId === b._id;
                return (
                  <TouchableOpacity
                    key={b._id}
                    style={[styles.badgeItem, isSelected && styles.badgeItemSelected]}
                    onPress={() => setSelectedBadgeId(b._id)}
                  >
                    <BadgeIcon
                      displayName={b.displayName}
                      color={b.color}
                      backgroundColor={b.backgroundColor}
                      size="small"
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.badgeTitle}>{b.displayName}</Text>
                      <Text style={styles.badgeDesc} numberOfLines={1}>
                        {b.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleEndorse}
                disabled={loading || peerBadges.length === 0}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmText}>Grant Endorsement</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  endorseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA615",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#00BFA630",
  },
  endorseBtnText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
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
    maxWidth: 380,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#262945",
  },
  modalTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typeScale.bodySmall,
    color: "#6B7280",
    marginBottom: spacing.md,
  },
  badgeItem: {
    backgroundColor: "#0F101D",
    padding: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  badgeItemSelected: {
    backgroundColor: "#00BFA615",
    borderColor: "#00BFA6",
  },
  badgeTitle: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
  },
  badgeDesc: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
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
  confirmBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  confirmText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
