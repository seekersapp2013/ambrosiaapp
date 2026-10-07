import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { NotificationContextModalData } from "@/utils/notificationNavigation";

interface Props {
  data: NotificationContextModalData | null;
  onClose: () => void;
}

export function NotificationContextModal({ data, onClose }: Props) {
  const C = useColors();
  if (!data) return null;

  const { notification, reason } = data;

  return (
    <Modal
      visible={!!data}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: C.isDark ? "#171728" : "#FFFFFF",
              borderColor: C.borderSubtle,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, { backgroundColor: `${Colors.actionPrimary}20` }]}>
              <Ionicons name="notifications-outline" size={22} color={Colors.actionPrimary} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: C.textPrimary }]}>
            {notification.title}
          </Text>

          <Text style={[styles.message, { color: C.textSecondary }]}>
            {notification.message}
          </Text>

          {reason && (
            <View style={[styles.infoBox, { backgroundColor: C.isDark ? "#222238" : "#F3F4F6" }]}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.actionPrimary} style={{ marginTop: 2 }} />
              <Text style={[styles.infoText, { color: C.textMuted }]}>
                {reason}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.actionPrimary }]}
            onPress={onClose}
          >
            <Text style={styles.actionBtnText}>Got it</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.space4,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    padding: spacing.space5,
    gap: spacing.space3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    ...typeScale.headingSM,
    fontSize: 16,
  },
  message: {
    ...typeScale.bodyMD,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: "row",
    padding: spacing.space3,
    borderRadius: radius.radiusSM,
    gap: spacing.space2,
  },
  infoText: {
    ...typeScale.bodySM,
    flex: 1,
  },
  actionBtn: {
    paddingVertical: 12,
    borderRadius: radius.radiusFull,
    alignItems: "center",
    marginTop: spacing.space2,
  },
  actionBtnText: {
    ...typeScale.labelMD,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
