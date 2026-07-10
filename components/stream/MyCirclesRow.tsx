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
import { useColors } from "@/hooks/useColors";

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
    /** True when this circle was auto-created by the referral system */
    isReferralCircle?: boolean;
    /** The referral this circle belongs to — used for deep-linking */
    referralId?: string | null;
  };
  onPress: () => void;
}

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
  const C = useColors();

  const ROLE_COLORS: Record<Role, { bg: string; border: string; text: string }> = {
    CREATOR: { bg: "rgba(139,92,246,0.12)", border: C.purpleBorder, text: C.purple },
    ADMIN: { bg: C.statusInfoBg, border: C.blueBorder, text: C.statusInfo },
    MODERATOR: { bg: C.statusSuccessBg, border: C.greenBorder, text: C.statusSuccess },
    MEMBER: { bg: C.bgElevated, border: C.borderSubtle, text: C.textMuted },
  };

  const role = (circle.membership?.role ?? "MEMBER") as Role;
  const roleStyle = ROLE_COLORS[role] ?? ROLE_COLORS.MEMBER;
  const lastContent = circle.lastMessage?.content ?? "No messages yet";
  const isReferral = circle.isReferralCircle === true;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: C.bgSurface, borderBottomColor: C.borderSubtle }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`Circle: ${circle.name}`}
    >
      {/* Avatar placeholder — referral circles use a distinct icon */}
      <View style={[styles.avatar, { backgroundColor: C.bgElevated, borderColor: C.redBorder }, isReferral && [styles.avatarReferral, { borderColor: C.amberBorder, backgroundColor: C.amberSurface }]]}>
        <Ionicons
          name={isReferral ? "git-network-outline" : "people-circle-outline"}
          size={26}
          color={isReferral ? C.statusWarning : C.primary}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: C.textPrimary }]} numberOfLines={1}>
            {circle.name}
          </Text>
          <Text style={[styles.time, { color: C.textMuted }]}>{timeAgo(circle.lastMessage?.createdAt)}</Text>
        </View>

        <View style={styles.bottomRow}>
          {/* Referral badge — shown instead of (or alongside) role badge */}
          {isReferral ? (
            <View style={[styles.referralBadge, { borderColor: C.amberBorder, backgroundColor: C.amberSurface }]}>
              <Ionicons name="git-network-outline" size={9} color={C.statusWarning} />
              <Text style={[styles.referralBadgeText, { color: C.statusWarning }]}>Referral</Text>
            </View>
          ) : (
            <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg, borderColor: roleStyle.border }]}>
              <Text style={[styles.roleText, { color: roleStyle.text }]}>{role}</Text>
            </View>
          )}

          {/* Last message */}
          <Text style={[styles.lastMessage, { color: C.textMuted }]} numberOfLines={1}>
            {lastContent.replace(/<[^>]*>/g, "").slice(0, 60)}
          </Text>
        </View>

        <Text style={[styles.memberCount, { color: C.textDisabled }]}>
          <Ionicons name="people-outline" size={11} color={C.textMuted} /> {circle.currentMembers} members
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={C.iconSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  // Referral circles get an amber border to distinguish them
  avatarReferral: {},
  content: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  time: {
    fontSize: 12,
    flexShrink: 0,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  lastMessage: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  memberCount: {
    fontSize: 11,
  },
  // Referral badge
  referralBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  referralBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
