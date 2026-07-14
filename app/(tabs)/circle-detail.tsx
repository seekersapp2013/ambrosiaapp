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
  Modal,
  TextInput,
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

function timeAgoShort(ts?: number): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d`;
}

export default function CircleDetailScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [isJoining, setIsJoining] = useState(false);
  const [showAddCircleModal, setShowAddCircleModal] = useState(false);
  const [newSubCircleName, setNewSubCircleName] = useState("");
  const [newSubCirclePosting, setNewSubCirclePosting] = useState<"EVERYONE" | "ADMINS_ONLY">("EVERYONE");
  const [isCreatingSubCircle, setIsCreatingSubCircle] = useState(false);
  const [addMode, setAddMode] = useState<"create" | "adopt">("create");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState("");
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
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

  // Sub-circles query (skip for consultation/referral circles)
  const isSpecialCircle = (circle as any)?.isConsultationCircle || (circle as any)?.isReferralCircle;
  const subCircles = useQuery(
    api.subCircles.getSubCircles,
    circleId && circle && !isSpecialCircle
      ? { parentCircleId: circleId as Id<"circles"> }
      : "skip"
  );

  // Adoptable circles (only fetch when modal is open in adopt mode)
  const adoptableCircles = useQuery(
    api.subCircles.getAdoptableCircles,
    showAddCircleModal && addMode === "adopt" && circleId
      ? { parentCircleId: circleId as Id<"circles"> }
      : "skip"
  );

  const joinCircle = useMutation(api.circles.joinCircle);
  const createSubCircle = useMutation(api.subCircles.createSubCircle);
  const adoptCircle = useMutation(api.subCircles.adoptCircleAsSubCircle);
  const inviteUserMutation = useMutation(api.circleInvitations.inviteUser);

  // Search users to invite (only active when modal is open)
  const searchResults = useQuery(
    api.circleInvitations.searchUsersToInvite,
    showInviteModal && circleId && inviteSearch.trim().length >= 2
      ? { circleId: circleId as Id<"circles">, searchTerm: inviteSearch.trim() }
      : "skip"
  );

  // Circle events (publicly visible)
  const circleEventsResult = useQuery(
    api.events.getCircleEvents,
    circleId ? { circleId: circleId as Id<"circles">, status: "ACTIVE", limit: 3 } : "skip"
  );
  const circleEvents = circleEventsResult?.events ?? [];

  // Circle practitioners (publicly visible)
  const circlePractitionersResult = useQuery(
    api.circlePractitioners.getCirclePractitioners,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip"
  );
  const circlePractitioners = circlePractitionersResult?.practitioners ?? [];

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
                    params: { circleId, action: "create" },
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
            {/* Referral circle banner — shown above badges */}
            {(circle as any).isReferralCircle && (
              <TouchableOpacity
                style={styles.referralBanner}
                activeOpacity={0.82}
                onPress={() =>
                  (circle as any).referralId
                    ? router.push({
                        pathname: "/(tabs)/booking/referral-detail",
                        params: { referralId: (circle as any).referralId },
                      } as any)
                    : null
                }
                accessibilityRole="button"
                accessibilityLabel="View referral"
              >
                <View style={styles.referralBannerIcon}>
                  <Ionicons name="git-network-outline" size={16} color={Colors.statusWarning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.referralBannerTitle} allowFontScaling={false}>
                    Referral Circle
                  </Text>
                  <Text style={styles.referralBannerSub} allowFontScaling={false}>
                    Private space for a 3-way referral
                  </Text>
                </View>
                {(circle as any).referralId && (
                  <View style={styles.referralBannerCta}>
                    <Text style={styles.referralBannerCtaText} allowFontScaling={false}>
                      View Referral
                    </Text>
                    <Ionicons name="chevron-forward" size={12} color={Colors.actionPrimary} />
                  </View>
                )}
              </TouchableOpacity>
            )}

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

          {/* ── Invite Link (public: all members, private: admin only) ──── */}
          {circle.isMember && (!isPrivate || isAdmin) && (
            <View style={styles.inviteLinkSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invite Link</Text>
              </View>
              <TouchableOpacity
                style={styles.inviteLinkBtn}
                activeOpacity={0.8}
                onPress={async () => {
                  const baseUrl = process.env.EXPO_PUBLIC_APP_URL || "https://app.ambrosia.africa";
                  const link = `${baseUrl}/circle-detail?circleId=${circleId}`;
                  await Clipboard.setStringAsync(link);
                  Alert.alert("Link Copied!", "Share this link to invite others to the circle.");
                }}
                accessibilityRole="button"
                accessibilityLabel="Copy invite link"
              >
                <Ionicons name="link-outline" size={18} color={Colors.primary} />
                <Text style={styles.inviteLinkBtnText}>Copy Invite Link</Text>
                <Ionicons name="copy-outline" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.inviteLinkHint}>
                {isPrivate
                  ? "Only admins can share this link. Users will join via invite."
                  : "Anyone with this link can view and join the circle."}
              </Text>
            </View>
          )}

          {/* ── Admin: Invite Users directly ─────────────────────────────── */}
          {isAdmin && (
            <View style={styles.inviteUsersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Invite Users</Text>
              </View>
              <TouchableOpacity
                style={styles.inviteUsersBtn}
                activeOpacity={0.8}
                onPress={() => setShowInviteModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Search and invite users"
              >
                <Ionicons name="person-add-outline" size={18} color={Colors.primary} />
                <Text style={styles.inviteUsersBtnText}>Search & Invite Users</Text>
              </TouchableOpacity>
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
                      params: { circleId, action: "create" },
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
                    params: { circleId, action: "create" },
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
                    pathname: "/(tabs)/circle-chat",
                    params: { circleId, action: "create" },
                  } as any)
                }
                accessibilityRole="button"
                accessibilityLabel="Chat"
              >
                <Ionicons name="chatbubbles-outline" size={20} color={Colors.statusSuccess} />
                <Text style={styles.quickActionText}>Chat</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Admin: Create Content actions ────────────────────────────── */}
          {isAdmin && (
            <View style={styles.adminCreateSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Create Content</Text>
              </View>
              <View style={styles.adminCreateRow}>
                <TouchableOpacity
                  style={styles.adminCreateBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/write-article",
                      params: { circleId, action: "create" },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Write article for this circle"
                >
                  <View style={[styles.adminCreateIcon, { backgroundColor: Colors.statusInfoBg }]}>
                    <Ionicons name="document-text-outline" size={18} color={Colors.statusInfo} />
                  </View>
                  <Text style={styles.adminCreateBtnText}>Write Article</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adminCreateBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/create-pulse",
                      params: { circleId, action: "create" },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Create pulse for this circle"
                >
                  <View style={[styles.adminCreateIcon, { backgroundColor: Colors.bgPrimaryMid }]}>
                    <Ionicons name="videocam-outline" size={18} color={Colors.primary} />
                  </View>
                  <Text style={styles.adminCreateBtnText}>Create Pulse</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.adminCreateBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/booking/events",
                      params: { circleId, action: "create" },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Create event for this circle"
                >
                  <View style={[styles.adminCreateIcon, { backgroundColor: Colors.statusSuccessBg }]}>
                    <Ionicons name="calendar-outline" size={18} color={Colors.statusSuccess} />
                  </View>
                  <Text style={styles.adminCreateBtnText}>Create Event</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Circle Events section ───────────────────────────────────── */}
          {circleEvents.length > 0 && (
            <View style={styles.circleEventsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Events</Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/circle-events",
                      params: { circleId, action: "create" },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="View all events"
                >
                  <Text style={styles.seeAll}>View All</Text>
                </TouchableOpacity>
              </View>

              {/* Admin: Create Event button */}
              {isAdmin && (
                <TouchableOpacity
                  style={styles.createEventBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/booking/events",
                      params: { circleId, action: "create" },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Create circle event"
                >
                  <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                  <Text style={styles.createEventBtnText}>Create Event</Text>
                </TouchableOpacity>
              )}

              {circleEvents.slice(0, 3).map((event: any) => (
                <View key={event._id} style={styles.eventCardMini}>
                  <View style={styles.eventCardMiniLeft}>
                    <View style={styles.eventDateBadge}>
                      <Ionicons name="calendar-outline" size={14} color={Colors.statusSuccess} />
                    </View>
                    <View style={styles.eventCardMiniInfo}>
                      <Text style={styles.eventCardMiniTitle} numberOfLines={1}>{event.title}</Text>
                      <Text style={styles.eventCardMiniMeta}>
                        {event.sessionDate} · {event.sessionTime} · {event.currentParticipants}/{event.maxParticipants}
                      </Text>
                    </View>
                  </View>
                  {circle.isMember ? (
                    event.userHasBooked ? (
                      <View style={styles.attendedBadge}>
                        <Ionicons name="checkmark-circle" size={12} color={Colors.statusSuccess} />
                        <Text style={styles.attendedBadgeText}>Joined</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.attendBtn}
                        onPress={() =>
                          router.push({
                            pathname: "/(tabs)/booking/event-detail",
                            params: { eventId: event._id },
                          } as any)
                        }
                        accessibilityRole="button"
                        accessibilityLabel="Attend event"
                      >
                        <Text style={styles.attendBtnText}>Attend</Text>
                      </TouchableOpacity>
                    )
                  ) : (
                    <View style={styles.joinGateBadge}>
                      <Ionicons name="lock-closed" size={10} color={Colors.textMuted} />
                      <Text style={styles.joinGateText}>Join to attend</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Admin: show Create Event even if no events yet */}
          {circleEvents.length === 0 && isAdmin && (
            <View style={styles.circleEventsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Events</Text>
              </View>
              <TouchableOpacity
                style={styles.createEventBtn}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/booking/events",
                    params: { circleId, action: "create" },
                  } as any)
                }
                accessibilityRole="button"
                accessibilityLabel="Create circle event"
              >
                <Ionicons name="add-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.createEventBtnText}>Create Event</Text>
              </TouchableOpacity>
              <Text style={styles.emptyHint}>No events yet. Create one for your circle!</Text>
            </View>
          )}

          {/* ── Circle Practitioners section ─────────────────────────────── */}
          {circlePractitioners.length > 0 && (
            <View style={styles.circlePractitionersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Practitioners</Text>
                {circlePractitioners.length > 3 && (
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/booking/circle-practitioners",
                        params: { circleId, action: "create" },
                      } as any)
                    }
                    accessibilityRole="button"
                    accessibilityLabel="View all practitioners"
                  >
                    <Text style={styles.seeAll}>View All</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Admin: Invite Practitioner button */}
              {isAdmin && (
                <TouchableOpacity
                  style={styles.createEventBtn}
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/booking/invite-practitioner",
                      params: { circleId, action: "create" },
                    } as any)
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Invite practitioner"
                >
                  <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
                  <Text style={styles.createEventBtnText}>Invite Practitioner</Text>
                </TouchableOpacity>
              )}

              {circlePractitioners.slice(0, 3).map((practitioner: any) => (
                <View key={practitioner._id} style={styles.practitionerCardMini}>
                  <View style={styles.practitionerCardMiniLeft}>
                    <View style={styles.practitionerAvatar}>
                      <Ionicons name="person" size={16} color={Colors.textMuted} />
                    </View>
                    <View style={styles.practitionerCardMiniInfo}>
                      <Text style={styles.practitionerCardMiniName} numberOfLines={1}>
                        {practitioner.profile?.name ?? practitioner.profile?.username ?? "Practitioner"}
                      </Text>
                      <Text style={styles.practitionerCardMiniSpecialty} numberOfLines={1}>
                        {practitioner.specialties?.join(", ") || "General"}
                      </Text>
                    </View>
                  </View>
                  {circle.isMember ? (
                    <TouchableOpacity
                      style={styles.bookBtn}
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/booking/provider-detail",
                          params: { providerId: practitioner.practitionerId, circleId },
                        } as any)
                      }
                      accessibilityRole="button"
                      accessibilityLabel="Book practitioner"
                    >
                      <Text style={styles.bookBtnText}>Book</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.joinGateBadge}>
                      <Ionicons name="lock-closed" size={10} color={Colors.textMuted} />
                      <Text style={styles.joinGateText}>Join to book</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Admin: show Invite Practitioner even if no practitioners yet */}
          {circlePractitioners.length === 0 && isAdmin && (
            <View style={styles.circlePractitionersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Practitioners</Text>
              </View>
              <TouchableOpacity
                style={styles.createEventBtn}
                activeOpacity={0.8}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/booking/invite-practitioner",
                    params: { circleId, action: "create" },
                  } as any)
                }
                accessibilityRole="button"
                accessibilityLabel="Invite practitioner"
              >
                <Ionicons name="person-add-outline" size={16} color={Colors.primary} />
                <Text style={styles.createEventBtnText}>Invite Practitioner</Text>
              </TouchableOpacity>
              <Text style={styles.emptyHint}>No practitioners yet. Invite one to your circle!</Text>
            </View>
          )}

          {/* ── Sub-circles section (not for consultation/referral) ────── */}
          {circle.isMember && !isSpecialCircle && subCircles && subCircles.length > 0 && (
            <View style={styles.subCirclesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Community · {subCircles.length} group{subCircles.length !== 1 ? "s" : ""}
                </Text>
              </View>

              {/* Announcements — always first */}
              {subCircles
                .filter((sc: any) => sc.subCircleType === "ANNOUNCEMENT")
                .map((sc: any) => (
                  <TouchableOpacity
                    key={sc._id}
                    style={styles.subCircleRow}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/circle-chat",
                        params: { circleId: sc._id },
                      } as any)
                    }
                  >
                    <View style={[styles.subCircleAvatar, { backgroundColor: Colors.bgPrimaryMid }]}>
                      <Ionicons name="megaphone-outline" size={20} color={Colors.primary} />
                    </View>
                    <View style={styles.subCircleInfo}>
                      <View style={styles.subCircleTopRow}>
                        <Text style={styles.subCircleName}>{sc.name}</Text>
                        {sc.lastMessage && (
                          <Text style={styles.subCircleTime}>
                            {timeAgoShort(sc.lastMessage.createdAt)}
                          </Text>
                        )}
                      </View>
                      {sc.lastMessage ? (
                        <Text style={styles.subCirclePreview} numberOfLines={1}>
                          ~ {sc.lastMessage.sender?.name}: {sc.lastMessage.messageType === "content_link" ? "📄 New content" : sc.lastMessage.content?.replace(/<[^>]*>/g, "").slice(0, 50)}
                        </Text>
                      ) : (
                        <Text style={styles.subCirclePreview}>No messages yet</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

              {/* Divider */}
              {subCircles.filter((sc: any) => sc.subCircleType !== "ANNOUNCEMENT").length > 0 && (
                <View style={styles.subCircleDivider}>
                  <Text style={styles.subCircleDividerText}>Groups you're in</Text>
                </View>
              )}

              {/* General + adopted + custom sub-circles */}
              {subCircles
                .filter((sc: any) => sc.subCircleType !== "ANNOUNCEMENT")
                .map((sc: any) => (
                  <TouchableOpacity
                    key={sc._id}
                    style={styles.subCircleRow}
                    activeOpacity={0.75}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/circle-chat",
                        params: { circleId: sc._id },
                      } as any)
                    }
                  >
                    <View style={[styles.subCircleAvatar, { backgroundColor: Colors.bgElevated }]}>
                      {sc.coverImage ? (
                        <Image source={{ uri: sc.coverImage }} style={styles.subCircleAvatarImage} />
                      ) : (
                        <Ionicons name="people-outline" size={20} color={Colors.textMuted} />
                      )}
                    </View>
                    <View style={styles.subCircleInfo}>
                      <View style={styles.subCircleTopRow}>
                        <Text style={styles.subCircleName}>{sc.name}</Text>
                        {sc.lastMessage && (
                          <Text style={styles.subCircleTime}>
                            {timeAgoShort(sc.lastMessage.createdAt)}
                          </Text>
                        )}
                      </View>
                      {sc.lastMessage ? (
                        <Text style={styles.subCirclePreview} numberOfLines={1}>
                          ~ {sc.lastMessage.sender?.name}: {sc.lastMessage.messageType === "content_link" ? "📄 New content" : sc.lastMessage.content?.replace(/<[^>]*>/g, "").slice(0, 50)}
                        </Text>
                      ) : (
                        <Text style={styles.subCirclePreview}>No messages yet</Text>
                      )}
                      {sc.accessType === "PAID" && (
                        <View style={styles.subCirclePaidBadge}>
                          <Ionicons name="cash-outline" size={9} color={Colors.statusWarning} />
                          <Text style={styles.subCirclePaidText}>Paid</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}

              {/* + Add Circle button — only for CREATOR/ADMIN */}
              {isAdmin && (
                <TouchableOpacity
                  style={styles.addCircleBtn}
                  activeOpacity={0.8}
                  onPress={() => setShowAddCircleModal(true)}
                >
                  <Ionicons name="add" size={16} color={Colors.textPrimary} />
                  <Text style={styles.addCircleBtnText}>Add Circle</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom padding for sticky CTA */}
          <View style={{ height: 80 }} />
        </MobileCard>
      </ScrollView>

      {/* ── Add Circle Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showAddCircleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddCircleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Circle</Text>
              <TouchableOpacity onPress={() => setShowAddCircleModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Mode toggle */}
            <View style={styles.modalToggle}>
              <TouchableOpacity
                style={[styles.modalToggleBtn, addMode === "create" && styles.modalToggleBtnActive]}
                onPress={() => setAddMode("create")}
              >
                <Text style={[styles.modalToggleText, addMode === "create" && styles.modalToggleTextActive]}>
                  Create New
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalToggleBtn, addMode === "adopt" && styles.modalToggleBtnActive]}
                onPress={() => setAddMode("adopt")}
              >
                <Text style={[styles.modalToggleText, addMode === "adopt" && styles.modalToggleTextActive]}>
                  Add Existing
                </Text>
              </TouchableOpacity>
            </View>

            {addMode === "create" ? (
              <View style={styles.modalForm}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Sub-circle name"
                  placeholderTextColor={Colors.textMuted}
                  value={newSubCircleName}
                  onChangeText={setNewSubCircleName}
                />
                <View style={styles.modalPostingRow}>
                  <Text style={styles.modalLabel}>Posting:</Text>
                  <TouchableOpacity
                    style={[styles.modalPostingOption, newSubCirclePosting === "EVERYONE" && styles.modalPostingOptionActive]}
                    onPress={() => setNewSubCirclePosting("EVERYONE")}
                  >
                    <Text style={[styles.modalPostingOptionText, newSubCirclePosting === "EVERYONE" && styles.modalPostingOptionTextActive]}>
                      Everyone
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalPostingOption, newSubCirclePosting === "ADMINS_ONLY" && styles.modalPostingOptionActive]}
                    onPress={() => setNewSubCirclePosting("ADMINS_ONLY")}
                  >
                    <Text style={[styles.modalPostingOptionText, newSubCirclePosting === "ADMINS_ONLY" && styles.modalPostingOptionTextActive]}>
                      Admins Only
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  disabled={isCreatingSubCircle || !newSubCircleName.trim()}
                  onPress={async () => {
                    if (!circleId || !newSubCircleName.trim()) return;
                    setIsCreatingSubCircle(true);
                    try {
                      await createSubCircle({
                        parentCircleId: circleId as Id<"circles">,
                        name: newSubCircleName.trim(),
                        postingPermission: newSubCirclePosting,
                      });
                      setNewSubCircleName("");
                      setShowAddCircleModal(false);
                      Alert.alert("Created", "Sub-circle created successfully.");
                    } catch (e: any) {
                      Alert.alert("Error", e?.message ?? "Failed to create sub-circle.");
                    } finally {
                      setIsCreatingSubCircle(false);
                    }
                  }}
                >
                  {isCreatingSubCircle ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.adoptList}>
                {adoptableCircles === undefined ? (
                  <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
                ) : adoptableCircles.length === 0 ? (
                  <Text style={styles.adoptEmptyText}>
                    No eligible circles to add. Create a circle first.
                  </Text>
                ) : (
                  adoptableCircles.map((ac: any) => (
                    <TouchableOpacity
                      key={ac._id}
                      style={styles.adoptRow}
                      activeOpacity={0.75}
                      onPress={async () => {
                        if (!circleId) return;
                        try {
                          await adoptCircle({
                            parentCircleId: circleId as Id<"circles">,
                            circleToAdoptId: ac._id as Id<"circles">,
                          });
                          setShowAddCircleModal(false);
                          Alert.alert("Added", `${ac.name} has been added to this circle.`);
                        } catch (e: any) {
                          Alert.alert("Error", e?.message ?? "Failed to add circle.");
                        }
                      }}
                    >
                      <View style={styles.adoptRowAvatar}>
                        {ac.coverImage ? (
                          <Image source={{ uri: ac.coverImage }} style={styles.adoptRowAvatarImage} />
                        ) : (
                          <Ionicons name="people-circle-outline" size={24} color={Colors.primary} />
                        )}
                      </View>
                      <View style={styles.adoptRowInfo}>
                        <Text style={styles.adoptRowName}>{ac.name}</Text>
                        <Text style={styles.adoptRowMeta}>
                          {ac.accessType} · {ac.currentMembers} members
                        </Text>
                      </View>
                      <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Invite Users Modal ───────────────────────────────────────────── */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Users</Text>
              <TouchableOpacity onPress={() => { setShowInviteModal(false); setInviteSearch(""); }}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Search by name or username..."
              placeholderTextColor={Colors.textMuted}
              value={inviteSearch}
              onChangeText={setInviteSearch}
              autoFocus
            />

            {inviteSearch.trim().length < 2 ? (
              <Text style={styles.inviteSearchHint}>Type at least 2 characters to search</Text>
            ) : searchResults === undefined ? (
              <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : searchResults.length === 0 ? (
              <Text style={styles.inviteSearchHint}>No users found or all matched users are already members</Text>
            ) : (
              <ScrollView style={styles.inviteResultsList}>
                {searchResults.map((user: any) => (
                  <View key={user.userId} style={styles.inviteResultRow}>
                    <View style={styles.inviteResultAvatar}>
                      <Ionicons name="person" size={16} color={Colors.textMuted} />
                    </View>
                    <View style={styles.inviteResultInfo}>
                      <Text style={styles.inviteResultName} numberOfLines={1}>
                        {user.name ?? user.username ?? "User"}
                      </Text>
                      {user.username && (
                        <Text style={styles.inviteResultUsername}>@{user.username}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.inviteResultBtn}
                      disabled={invitingUserId === user.userId}
                      onPress={async () => {
                        setInvitingUserId(user.userId);
                        try {
                          await inviteUserMutation({
                            circleId: circleId as Id<"circles">,
                            inviteeId: user.userId,
                          });
                          Alert.alert("Invited!", `${user.name ?? user.username} has been invited.`);
                        } catch (e: any) {
                          Alert.alert("Error", e?.message ?? "Failed to invite user.");
                        } finally {
                          setInvitingUserId(null);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      {invitingUserId === user.userId ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.inviteResultBtnText}>Invite</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Sticky bottom CTA ────────────────────────────────────────────── */}
      <View style={[styles.stickyBar, { left: cardInsets.left, right: cardInsets.right }]}>
        {circle.isMember ? (
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/circle-chat",
                params: { circleId, action: "create" },
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
  // Referral circle banner
  referralBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: Colors.amberSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    marginBottom: 4,
  },
  referralBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  referralBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.statusWarning,
  },
  referralBannerSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  referralBannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  referralBannerCtaText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.actionPrimary,
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

  // ── Admin Create Content section ────────────────────────────────────────────
  adminCreateSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  adminCreateRow: {
    flexDirection: "row",
    gap: 8,
  },
  adminCreateBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  adminCreateIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  adminCreateBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },

  // ── Invite Link section ────────────────────────────────────────────────────
  inviteLinkSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inviteLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  inviteLinkBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  inviteLinkHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 6,
    paddingHorizontal: 4,
  },

  // ── Invite Users section ───────────────────────────────────────────────────
  inviteUsersSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  inviteUsersBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderStyle: "dashed",
  },
  inviteUsersBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  inviteSearchHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 20,
  },
  inviteResultsList: {
    maxHeight: 300,
    marginTop: 12,
  },
  inviteResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  inviteResultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteResultInfo: {
    flex: 1,
    gap: 2,
  },
  inviteResultName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  inviteResultUsername: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  inviteResultBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    minWidth: 60,
    alignItems: "center",
  },
  inviteResultBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Circle Events section ──────────────────────────────────────────────────
  circleEventsSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  createEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderStyle: "dashed",
  },
  createEventBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 4,
  },
  eventCardMini: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  eventCardMiniLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  eventDateBadge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.statusSuccessBg,
    alignItems: "center",
    justifyContent: "center",
  },
  eventCardMiniInfo: {
    flex: 1,
    gap: 2,
  },
  eventCardMiniTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  eventCardMiniMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  attendedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    backgroundColor: Colors.statusSuccessBg,
  },
  attendedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.statusSuccess,
  },
  attendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  attendBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  joinGateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  joinGateText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textMuted,
  },

  // ── Circle Practitioners section ───────────────────────────────────────────
  circlePractitionersSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  practitionerCardMini: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  practitionerCardMiniLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  practitionerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  practitionerCardMiniInfo: {
    flex: 1,
    gap: 2,
  },
  practitionerCardMiniName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  practitionerCardMiniSpecialty: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  bookBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: Colors.statusInfo,
  },
  bookBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
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

  // ── Sub-circles section ────────────────────────────────────────────────────
  subCirclesSection: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
  },
  subCircleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  subCircleAvatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  subCircleAvatarImage: {
    width: "100%",
    height: "100%",
  },
  subCircleInfo: {
    flex: 1,
    gap: 2,
  },
  subCircleTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subCircleName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  subCircleTime: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  subCirclePreview: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  subCirclePaidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  subCirclePaidText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.statusWarning,
  },
  subCircleDivider: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
    marginTop: 4,
  },
  subCircleDividerText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  addCircleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderStyle: "dashed",
  },
  addCircleBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // ── Add Circle Modal ───────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  modalToggle: {
    flexDirection: "row",
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    padding: 2,
    marginBottom: 16,
  },
  modalToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  modalToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  modalToggleText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  modalToggleTextActive: {
    color: "#fff",
  },
  modalForm: {
    gap: 14,
  },
  modalInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  modalPostingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  modalPostingOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  modalPostingOptionActive: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.redBorder,
  },
  modalPostingOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  modalPostingOptionTextActive: {
    color: Colors.primary,
  },
  modalSubmitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  modalSubmitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  adoptList: {
    maxHeight: 300,
  },
  adoptEmptyText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 20,
  },
  adoptRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  adoptRowAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  adoptRowAvatarImage: {
    width: "100%",
    height: "100%",
  },
  adoptRowInfo: {
    flex: 1,
    gap: 2,
  },
  adoptRowName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  adoptRowMeta: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
