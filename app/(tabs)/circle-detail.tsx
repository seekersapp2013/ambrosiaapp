/**
 * Circle Detail Screen
 *
 * Shows circle info, members preview, join/open-chat CTA.
 * Phase 8 — PLAN.MD
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard, useCardInsets } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

export default function CircleDetailScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [isJoining, setIsJoining] = useState(false);
  const cardInsets = useCardInsets();

  // ── Data ────────────────────────────────────────────────────────────────────
  const circle = useQuery(
    api.circles.getCircleById,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip"
  );

  const members = useQuery(
    api.circleMembers.getCircleMembers,
    circle?.isMember && circleId
      ? { circleId: circleId as Id<"circles">, limit: 5 }
      : "skip"
  );

  const joinCircle = useMutation(api.circles.joinCircle);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isAdmin =
    circle?.membership?.role === "CREATOR" ||
    circle?.membership?.role === "ADMIN";

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!circleId) return;
    setIsJoining(true);
    try {
      await joinCircle({ circleId: circleId as Id<"circles"> });
      Alert.alert("Joined!", "Welcome to the circle.");
    } catch (err: any) {
      Alert.alert("Could not join", err?.message ?? "Something went wrong.");
    } finally {
      setIsJoining(false);
    }
  };

  const copyInviteCode = async () => {
    if (circle?.inviteCode) {
      await Clipboard.setStringAsync(circle.inviteCode);
      Alert.alert("Copied", "Invite code copied to clipboard.");
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (circle === undefined) {
    return (
      <AppBackground>
        <View style={styles.centeredWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </AppBackground>
    );
  }

  if (circle === null) {
    return (
      <AppBackground>
        <View style={styles.centeredWrap}>
          <Text style={styles.errorText}>Circle not found.</Text>
          <TouchableOpacity onPress={() => history.goBack(router, "/(tabs)/circle")} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </AppBackground>
    );
  }

  // ── Pending approval wall ─────────────────────────────────────────────────
  // isActive is false until an admin approves. Only the creator lands here
  // (getCircleById returns null for non-members of inactive circles).
  if (!circle.isActive) {
    return (
      <AppBackground>
        <MobileCard>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => history.goBack(router, "/(tabs)/circle")}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back to circles"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{circle.name}</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.pendingContainer}>
            <View style={styles.pendingIconWrap}>
              <Ionicons name="time-outline" size={52} color={Colors.statusWarning} />
            </View>

            <Text style={styles.pendingTitle}>Pending Admin Review</Text>
            <Text style={styles.pendingCircleName}>{circle.name}</Text>

            <View style={styles.pendingNotice}>
              <Ionicons name="shield-checkmark-outline" size={16} color={Colors.statusWarning} />
              <Text style={styles.pendingNoticeText}>
                Your circle has been submitted and is awaiting admin approval. It will appear
                publicly and be accessible to other members once approved.
              </Text>
            </View>

            <View style={styles.pendingDetails}>
              <View style={styles.pendingDetailRow}>
                <Ionicons name="globe-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.pendingDetailText}>
                  Type: {circle.type === "PUBLIC" ? "Public" : "Private"}
                </Text>
              </View>
              <View style={styles.pendingDetailRow}>
                <Ionicons name="gift-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.pendingDetailText}>
                  Access: {circle.accessType === "FREE" ? "Free" : `Paid — ${circle.priceCurrency} ${circle.price}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.pendingBackBtn}
              onPress={() => history.goBack(router, "/(tabs)/circle")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Back to circles"
            >
              <Ionicons name="people-circle-outline" size={16} color="#fff" />
              <Text style={styles.pendingBackBtnText}>Back to Circles</Text>
            </TouchableOpacity>
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  const isPaid = circle.accessType === "PAID";
  const isPrivate = circle.type === "PRIVATE";

  return (
    <AppBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 160 }}
      >
        <MobileCard>
          {/* ── Header ────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => history.goBack(router, "/(tabs)/circle")}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back to circles"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {circle.name}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/circle-settings",
                    params: { circleId },
                  } as any)
                }
                style={styles.settingsBtn}
                accessibilityRole="button"
                accessibilityLabel="Circle settings"
              >
                <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Cover image ──────────────────────────────────────────────── */}
          <View style={styles.cover}>
            {circle.coverImage ? (
              <Image source={{ uri: circle.coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverGradient}>
                <Ionicons name="people-circle-outline" size={52} color="rgba(255,255,255,0.4)" />
              </View>
            )}
          </View>

          {/* ── Info card ────────────────────────────────────────────────── */}
          <View style={styles.infoCard}>
            {/* Badges row */}
            <View style={styles.badgesRow}>
              <View style={[styles.badge, isPrivate ? styles.privateBadge : styles.publicBadge]}>
                <Ionicons
                  name={isPrivate ? "lock-closed" : "globe-outline"}
                  size={11}
                  color={isPrivate ? Colors.statusWarning : Colors.statusInfo}
                />
                <Text style={[styles.badgeText, isPrivate ? styles.privateBadgeText : styles.publicBadgeText]}>
                  {isPrivate ? "Private" : "Public"}
                </Text>
              </View>

              <View style={[styles.badge, isPaid ? styles.paidBadge : styles.freeBadge]}>
                <Ionicons
                  name={isPaid ? "cash-outline" : "gift-outline"}
                  size={11}
                  color={isPaid ? Colors.statusWarning : Colors.statusSuccess}
                />
                <Text style={[styles.badgeText, isPaid ? styles.paidBadgeText : styles.freeBadgeText]}>
                  {isPaid
                    ? `${circle.priceCurrency ?? ""} ${circle.price ?? ""}`.trim()
                    : "Free"}
                </Text>
              </View>
            </View>

            {/* Description */}
            <Text style={styles.description}>{circle.description}</Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="people-outline" size={15} color={Colors.textMuted} />
                <Text style={styles.statText}>
                  {circle.currentMembers}
                  {circle.maxMembers ? `/${circle.maxMembers}` : ""} members
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons
                  name={circle.postingPermission === "ADMINS_ONLY" ? "shield-outline" : "chatbubbles-outline"}
                  size={15}
                  color={Colors.textMuted}
                />
                <Text style={styles.statText}>
                  {circle.postingPermission === "ADMINS_ONLY" ? "Admins post" : "Open posting"}
                </Text>
              </View>
            </View>

            {/* Tags */}
            {circle.tags && circle.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {circle.tags.map((tag: string) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Creator */}
            <View style={styles.creatorRow}>
              <Ionicons name="person-circle-outline" size={18} color={Colors.textMuted} />
              <Text style={styles.creatorText}>
                By{" "}
                <Text style={{ color: Colors.textSecondary, fontWeight: "600" }}>
                  {circle.creator?.name ?? circle.creator?.username ?? "Unknown"}
                </Text>
              </Text>
            </View>
          </View>

          {/* ── Invite code (private + admin) ────────────────────────────── */}
          {isPrivate && isAdmin && circle.inviteCode && (
            <View style={styles.inviteCard}>
              <View style={styles.inviteCardAccent} />
              <Text style={styles.inviteLabel}>INVITE CODE</Text>
              <View style={styles.inviteRow}>
                <Text style={styles.inviteCode}>{circle.inviteCode}</Text>
                <TouchableOpacity
                  onPress={copyInviteCode}
                  style={styles.copyBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Copy invite code"
                >
                  <Ionicons name="copy-outline" size={14} color={Colors.statusInfo} />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.inviteHint}>
                Share this code with people you want to invite.
              </Text>
            </View>
          )}

          {/* ── Members preview (if member) ─────────────────────────────── */}
          {circle.isMember && members && members.members.length > 0 && (
            <View style={styles.membersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Members</Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/circle-members",
                      params: { circleId },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="View all members"
                >
                  <Text style={styles.seeAll}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.avatarRow}>
                {members.members.slice(0, 5).map((m: any) => (
                  <View key={m._id} style={styles.avatarCircle}>
                    <Ionicons name="person" size={16} color={Colors.textMuted} />
                  </View>
                ))}
                {members.total > 5 && (
                  <View style={[styles.avatarCircle, styles.avatarExtra]}>
                    <Text style={styles.avatarExtraText}>+{members.total - 5}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Quick actions (if member) ────────────────────────────────── */}
          {circle.isMember && (
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/circle-members",
                    params: { circleId },
                  } as any)
                }
                accessibilityRole="button"
                accessibilityLabel="Members"
              >
                <Ionicons name="people-outline" size={20} color={Colors.statusInfo} />
                <Text style={styles.quickActionText}>Members</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/circle-events",
                    params: { circleId },
                  } as any)
                }
                accessibilityRole="button"
                accessibilityLabel="Events"
              >
                <Ionicons name="calendar-outline" size={20} color={Colors.statusSuccess} />
                <Text style={styles.quickActionText}>Events</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAction}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/expert-requests",
                    params: { circleId },
                  } as any)
                }
                accessibilityRole="button"
                accessibilityLabel="Expert requests"
              >
                <Ionicons name="briefcase-outline" size={20} color={Colors.statusWarning} />
                <Text style={styles.quickActionText}>Requests</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom padding for sticky CTA */}
          <View style={{ height: 80 }} />
        </MobileCard>
      </ScrollView>

      {/* ── Sticky bottom CTA ────────────────────────────────────────────── */}
      <View style={[styles.stickyBar, { left: cardInsets.left, right: cardInsets.right }]}>
        {circle.isMember ? (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/circle-chat",
                params: { circleId },
              } as any)
            }
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Open chat"
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#fff" />
            <Text style={styles.ctaBtnText}>Open Chat</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.ctaBtn, styles.joinBtn]}
            onPress={handleJoin}
            disabled={isJoining}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isPaid ? `Join for ${circle.priceCurrency ?? ""} ${circle.price ?? ""}` : "Join circle"}
          >
            {isJoining ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={18} color="#fff" />
                <Text style={styles.ctaBtnText}>
                  {isPaid
                    ? `Join for ${circle.priceCurrency ?? ""} ${circle.price ?? ""}`.trim()
                    : "Join Circle"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  centeredWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 15,

  // ── Pending approval wall ─────────────────────────────────────────────────
  pendingContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 16,
  },
  pendingIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.statusWarningBg,
    borderWidth: 2,
    borderColor: Colors.amberBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  pendingCircleName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
  },
  pendingNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    backgroundColor: Colors.statusWarningBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    width: "100%",
  },
  pendingNoticeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.statusWarning,
    lineHeight: 20,
  },
  pendingDetails: {
    width: "100%",
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    gap: 8,
  },
  pendingDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingDetailText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  pendingBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 50,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    marginTop: 4,
  },
  pendingBackBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
    color: Colors.textMuted,
  },
  backLink: { marginTop: 8 },
  backLinkText: { fontSize: 14, color: Colors.primary },

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
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },

  cover: {
    height: 160,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverGradient: {
    flex: 1,
    backgroundColor: Colors.palette.primaryCrimson,
    alignItems: "center",
    justifyContent: "center",
  },

  infoCard: {
    padding: 16,
    gap: 10,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  publicBadge: { backgroundColor: Colors.statusInfoBg, borderColor: Colors.blueBorder },
  privateBadge: { backgroundColor: Colors.statusWarningBg, borderColor: Colors.amberBorder },
  freeBadge: { backgroundColor: Colors.statusSuccessBg, borderColor: Colors.greenBorder },
  paidBadge: { backgroundColor: Colors.amberSurface, borderColor: Colors.amberBorder },
  badgeText: { fontSize: 11, fontWeight: "600" },
  publicBadgeText: { color: Colors.statusInfo },
  privateBadgeText: { color: Colors.statusWarning },
  freeBadgeText: { color: Colors.statusSuccess },
  paidBadgeText: { color: Colors.statusWarning },

  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  creatorText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Invite code
  inviteCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: Colors.amberSurface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    overflow: "hidden",
    position: "relative",
  },
  inviteCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.statusWarning,
  },
  inviteLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  inviteCode: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: 4,
    fontVariant: ["tabular-nums"],
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.statusInfo,
  },
  inviteHint: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },

  // Members
  membersSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  seeAll: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
  avatarRow: {
    flexDirection: "row",
    gap: 6,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarExtra: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.redBorder,
  },
  avatarExtraText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
  },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  quickAction: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    gap: 5,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },

  // Sticky CTA
  stickyBar: {
    position: "absolute",
    bottom: 0,
    padding: 16,
    paddingBottom: 88, // clears tab bar (64px) + safe area buffer
    backgroundColor: "rgba(10,10,21,0.97)",
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  joinBtn: {
    backgroundColor: Colors.statusSuccess,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
