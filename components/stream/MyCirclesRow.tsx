/**
 * MyCirclesRow
 *
 * Full-width row for the "My Circles" list view.
 * Shows circle name, role badge, member count, last message preview, chevron.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

type Role = "CREATOR" | "ADMIN" | "MODERATOR" | "MEMBER";

interface MyCirclesRowProps {
  circle: {
    _id: string;
    name: string;
    currentMembers: number;
    membership?: {
      role: Role;
    };
    lastMessage?: {
      content?: string;
      createdAt?: number;
    } | null;
  };
  onPress: () => void;
}

const ROLE_COLORS: Record<Role, { bg: string; border: string; text: string }> = {
  CREATOR: { bg: "rgba(139,92,246,0.12)", border: Colors.purpleBorder, text: Colors.purple },
  ADMIN: { bg: Colors.statusInfoBg, border: Colors.blueBorder, text: Colors.statusInfo },
  MODERATOR: { bg: Colors.statusSuccessBg, border: Colors.greenBorder, text: Colors.statusSuccess },
  MEMBER: { bg: Colors.bgElevated, border: Colors.borderSubtle, text: Colors.textMuted },
};

function timeAgo(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function MyCirclesRow({ circle, onPress }: MyCirclesRowProps) {
  const role = (circle.membership?.role ?? "MEMBER") as Role;
  const roleStyle = ROLE_COLORS[role] ?? ROLE_COLORS.MEMBER;
  const lastContent = circle.lastMessage?.content ?? "No messages yet";

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Circle: ${circle.name}`}
    >
      {/* Avatar placeholder */}
      <View style={styles.avatar}>
        <Ionicons name="people-circle-outline" size={26} color={Colors.primary} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>
            {circle.name}
          </Text>
          <Text style={styles.time}>{timeAgo(circle.lastMessage?.createdAt)}</Text>
        </View>

        <View style={styles.bottomRow}>
          {/* Role badge */}
          <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg, borderColor: roleStyle.border }]}>
            <Text style={[styles.roleText, { color: roleStyle.text }]}>{role}</Text>
          </View>

          {/* Last message */}
          <Text style={styles.lastMessage} numberOfLines={1}>
            {lastContent.replace(/<[^>]*>/g, "").slice(0, 60)}
          </Text>
        </View>

        <Text style={styles.memberCount}>
          <Ionicons name="people-outline" size={11} color={Colors.textMuted} /> {circle.currentMembers} members
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={Colors.iconSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  lastMessage: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
  memberCount: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
