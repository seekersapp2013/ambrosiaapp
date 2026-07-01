/**
 * Circle Members Screen
 *
 * Search + FlatList of members. Admins can manage roles, remove, ban.
 * Phase 8 — PLAN.MD
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";

type Role = "CREATOR" | "ADMIN" | "MODERATOR" | "MEMBER";

const ROLE_CONFIG: Record<Role, { bg: string; border: string; text: string }> = {
  CREATOR: { bg: "rgba(139,92,246,0.12)", border: Colors.purpleBorder, text: Colors.purple },
  ADMIN: { bg: Colors.statusInfoBg, border: Colors.blueBorder, text: Colors.statusInfo },
  MODERATOR: { bg: Colors.statusSuccessBg, border: Colors.greenBorder, text: Colors.statusSuccess },
  MEMBER: { bg: Colors.bgElevated, border: Colors.borderSubtle, text: Colors.textMuted },
};

export default function CircleMembersScreen() {
  const router = useRouter();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [searchText, setSearchText] = useState("");

  // ── Data ────────────────────────────────────────────────────────────────────
  const membersResult = useQuery(
    api.circleMembers.getCircleMembers,
    circleId ? { circleId: circleId as Id<"circles">, limit: 100 } : "skip"
  );
  const circle = useQuery(
    api.circles.getCircleById,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip"
  );

  const updateRole = useMutation(api.circleMembers.updateMemberRole);
  const removeMember = useMutation(api.circleMembers.removeMember);
  const banMember = useMutation(api.circleMembers.banMember);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isAdmin =
    circle?.membership?.role === "CREATOR" ||
    circle?.membership?.role === "ADMIN";

  const allMembers = membersResult?.members ?? [];
  const filteredMembers = searchText.trim()
    ? allMembers.filter((m: any) => {
        const name = (m.profile?.name ?? "").toLowerCase();
        const username = (m.profile?.username ?? "").toLowerCase();
        const q = searchText.toLowerCase();
        return name.includes(q) || username.includes(q);
      })
    : allMembers;

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleMenu = useCallback(
    (member: any) => {
      const role = member.role as Role;
      if (!isAdmin || role === "CREATOR") return;

      Alert.alert(
        member.profile?.name ?? "Member",
        `Current role: ${role}`,
        [
          { text: "Make Admin", onPress: async () => {
            try { await updateRole({ circleId: circleId as Id<"circles">, memberId: member.userId as Id<"users">, newRole: "ADMIN" }); }
            catch (err: any) { Alert.alert("Error", err?.message); }
          }},
          { text: "Make Moderator", onPress: async () => {
            try { await updateRole({ circleId: circleId as Id<"circles">, memberId: member.userId as Id<"users">, newRole: "MODERATOR" }); }
            catch (err: any) { Alert.alert("Error", err?.message); }
          }},
          { text: "Make Member", onPress: async () => {
            try { await updateRole({ circleId: circleId as Id<"circles">, memberId: member.userId as Id<"users">, newRole: "MEMBER" }); }
            catch (err: any) { Alert.alert("Error", err?.message); }
          }},
          { text: "Remove", style: "destructive", onPress: () => {
            Alert.alert("Remove Member", "Remove this member from the circle?", [
              { text: "Cancel", style: "cancel" },
              { text: "Remove", style: "destructive", onPress: async () => {
                try { await removeMember({ circleId: circleId as Id<"circles">, memberId: member.userId as Id<"users"> }); }
                catch (err: any) { Alert.alert("Error", err?.message); }
              }},
            ]);
          }},
          { text: "Ban", style: "destructive", onPress: () => {
            Alert.alert("Ban Member", "Ban this member from the circle?", [
              { text: "Cancel", style: "cancel" },
              { text: "Ban", style: "destructive", onPress: async () => {
                try { await banMember({ circleId: circleId as Id<"circles">, memberId: member.userId as Id<"users"> }); }
                catch (err: any) { Alert.alert("Error", err?.message); }
              }},
            ]);
          }},
          { text: "Cancel", style: "cancel" },
        ]
      );
    },
    [isAdmin, circleId, updateRole, removeMember, banMember]
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  const renderMember = useCallback(
    ({ item }: { item: any }) => {
      const role = (item.role ?? "MEMBER") as Role;
      const roleConf = ROLE_CONFIG[role] ?? ROLE_CONFIG.MEMBER;
      const joinedDate = new Date(item.joinedAt).toLocaleDateString([], {
        month: "short",
        year: "numeric",
      });

      return (
        <View style={styles.memberRow}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Ionicons name="person" size={18} color={Colors.textMuted} />
          </View>

          {/* Info */}
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>
                {item.profile?.name ?? item.profile?.username ?? "Unknown"}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: roleConf.bg, borderColor: roleConf.border }]}>
                <Text style={[styles.roleText, { color: roleConf.text }]}>{role}</Text>
              </View>
            </View>
            {item.profile?.username && (
              <Text style={styles.username}>@{item.profile.username}</Text>
            )}
            <Text style={styles.joinDate}>Joined {joinedDate}</Text>
          </View>

          {/* Menu (admin only, not for CREATOR) */}
          {isAdmin && role !== "CREATOR" && (
            <TouchableOpacity
              onPress={() => handleMenu(item)}
              style={styles.menuBtn}
              accessibilityRole="button"
              accessibilityLabel="Member options"
            >
              <Ionicons name="ellipsis-vertical" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [isAdmin, handleMenu]
  );

  if (membersResult === undefined) {
    return (
      <AppBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <MobileCard>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Members ({membersResult?.total ?? 0})
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members…"
              placeholderTextColor={Colors.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              accessibilityLabel="Search members"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={15} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <FlatList
            data={filteredMembers}
            renderItem={renderMember}
            keyExtractor={(item: any) => item._id}
            scrollEnabled={false}
            removeClippedSubviews={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No members found.</Text>
              </View>
            }
          />
        </ScrollView>
      </MobileCard>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.bgElevated,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
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
  username: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  joinDate: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
});
