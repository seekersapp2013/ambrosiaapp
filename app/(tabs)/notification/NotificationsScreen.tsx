/**
 * NotificationsScreen
 * Main notification list for the authenticated user.
 * Grouped by category, with unread badge, swipe-to-delete,
 * mark-all-read, and a settings gear icon.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Colors } from "@/tokens/colors";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { EmptyStateCard } from "@/components/ui/Card";

// ─── Types ────────────────────────────────────────────────────────────────────
type CategoryFilter = "all" | "engagement" | "social" | "content" | "system";

interface NotificationsScreenProps {
  onBack: () => void;
  onOpenSettings: () => void;
  highlightNotificationId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "CONTENT_LIKED":            return "heart";
    case "CONTENT_CLAPPED":          return "hand-left";
    case "CONTENT_COMMENTED":        return "chatbubble";
    case "COMMENT_REPLY":            return "return-down-forward";
    case "NEW_FOLLOWER":             return "person-add";
    case "CONTENT_PAYMENT":          return "cash";
    case "USER_MENTIONED":           return "at";
    case "FOLLOWER_NEW_POST":        return "newspaper";
    case "WALLET_DEPOSIT":           return "arrow-down-circle";
    case "WALLET_WITHDRAWAL":        return "arrow-up-circle";
    case "WALLET_TRANSFER_SENT":     return "send";
    case "WALLET_TRANSFER_RECEIVED": return "wallet";
    // ── Booking types ────────────────────────────────────────────────────────
    case "booking_confirmed":        return "calendar-outline";
    case "booking_new":              return "calendar";
    case "booking_cancelled":        return "close-circle-outline";
    case "booking_reminder":         return "alarm-outline";
    case "session_started":          return "videocam";
    case "session_ended":            return "videocam-off-outline";
    // ── Referral types ───────────────────────────────────────────────────────
    case "referral_new_received":    return "git-network-outline";
    case "referral_expert_selected": return "checkmark-circle-outline";
    case "referral_selected_expert": return "person-add-outline";
    case "referral_declined":        return "close-circle-outline";
    case "referral_completed":       return "trophy-outline";
    case "referral_circle_created":  return "people-circle-outline";
    default:                         return "notifications";
  }
}

function getNotificationIconColor(type: string): string {
  switch (type) {
    case "CONTENT_LIKED":            return Colors.statusDanger;
    case "CONTENT_CLAPPED":          return Colors.statusWarning;
    case "CONTENT_COMMENTED":        return Colors.statusInfo;
    case "COMMENT_REPLY":            return Colors.statusInfo;
    case "NEW_FOLLOWER":             return Colors.statusSuccess;
    case "CONTENT_PAYMENT":          return Colors.statusSuccess;
    case "USER_MENTIONED":           return Colors.palette.purple;
    case "FOLLOWER_NEW_POST":        return Colors.statusInfo;
    case "WALLET_DEPOSIT":           return Colors.statusSuccess;
    case "WALLET_WITHDRAWAL":        return Colors.statusWarning;
    case "WALLET_TRANSFER_SENT":     return Colors.statusInfo;
    case "WALLET_TRANSFER_RECEIVED": return Colors.statusSuccess;
    // ── Booking types ────────────────────────────────────────────────────────
    case "booking_confirmed":        return Colors.statusSuccess;
    case "booking_new":              return Colors.actionPrimary;
    case "booking_cancelled":        return Colors.statusDanger;
    case "booking_reminder":         return Colors.statusWarning;
    case "session_started":          return Colors.statusSuccess;
    case "session_ended":            return Colors.textMuted;
    // ── Referral types ───────────────────────────────────────────────────────
    case "referral_new_received":    return Colors.actionPrimary;
    case "referral_expert_selected": return Colors.statusSuccess;
    case "referral_selected_expert": return Colors.statusInfo;
    case "referral_declined":        return Colors.statusDanger;
    case "referral_completed":       return Colors.statusSuccess;
    case "referral_circle_created":  return Colors.statusWarning;
    default:                         return Colors.iconSecondary;
  }
}

function getPriorityColor(priority?: string): string {
  switch (priority) {
    case "high":   return Colors.statusDanger;
    case "medium": return Colors.statusWarning;
    case "low":    return Colors.statusInfo;
    default:       return Colors.borderSubtle;
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30)  return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const CATEGORIES: { id: CategoryFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "all",        label: "All",        icon: "notifications-outline" },
  { id: "engagement", label: "Engagement", icon: "heart-outline"         },
  { id: "social",     label: "Social",     icon: "people-outline"        },
  { id: "content",    label: "Content",    icon: "newspaper-outline"     },
  { id: "system",     label: "System",     icon: "settings-outline"      },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function NotificationsScreen({
  onBack,
  onOpenSettings,
  highlightNotificationId,
}: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const C = useColors();
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [refreshing, setRefreshing] = useState(false);

  // Header always uses dark navy for contrast (same as TopNav)
  const headerBg = '#0F0F1E';
  const headerText = '#FFFFFF';
  const headerIcon = '#D1D5DB';
  const headerBorder = 'rgba(198,34,41,0.35)';

  const notifications = useQuery(api.notifications.getMyNotifications, {
    limit: 50,
    category: activeCategory === "all" ? undefined : activeCategory,
  });
  const unreadCount = useQuery(api.notifications.getUnreadCount);

  const markAsRead    = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const deleteNotif   = useMutation(api.notifications.deleteNotification);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      Alert.alert("Error", "Failed to mark all as read");
    }
  }, [markAllAsRead]);

  const handleMarkRead = useCallback(
    async (id: Id<"notifications">) => {
      try {
        await markAsRead({ notificationId: id });
      } catch (err) {
        console.error("Failed to mark as read:", err);
      }
    },
    [markAsRead]
  );

  const handleDelete = useCallback(
    (id: Id<"notifications">) => {
      Alert.alert("Delete Notification", "Remove this notification?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNotif({ notificationId: id });
            } catch (err) {
              Alert.alert("Error", "Failed to delete notification");
            }
          },
        },
      ]);
    },
    [deleteNotif]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Convex queries auto-refresh; just give a brief visual delay
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // ── Deep-link routing based on notification type + metadata ──────────────
  const handleNotificationPress = useCallback(
    (notif: any) => {
      // Mark as read first (non-blocking)
      if (!notif.isRead) {
        handleMarkRead(notif._id).catch(() => {});
      }

      const meta = notif.metadata ?? {};
      const type: string = notif.type ?? "";

      // Referral notifications → referral detail
      if (
        type === "referral_new_received" ||
        type === "referral_expert_selected" ||
        type === "referral_selected_expert" ||
        type === "referral_declined" ||
        type === "referral_completed"
      ) {
        if (meta.referralId) {
          router.push({
            pathname: "/(tabs)/booking/referral-detail",
            params: { referralId: meta.referralId },
          } as any);
          return;
        }
      }

      // Circle-created notification → go to circle chat directly
      if (type === "referral_circle_created") {
        if (meta.circleId) {
          router.push({
            pathname: "/(tabs)/circle-chat",
            params: { circleId: meta.circleId },
          } as any);
          return;
        }
        // Fallback: open the referral if no circleId yet
        if (meta.referralId) {
          router.push({
            pathname: "/(tabs)/booking/referral-detail",
            params: { referralId: meta.referralId },
          } as any);
          return;
        }
      }

      // Booking notifications → booking detail
      if (
        type === "booking_confirmed" ||
        type === "booking_new" ||
        type === "booking_cancelled" ||
        type === "booking_reminder" ||
        type === "session_started" ||
        type === "session_ended"
      ) {
        const bookingId = meta.bookingId ?? notif.relatedContentId;
        if (bookingId) {
          router.push({
            pathname: "/(tabs)/booking/booking-detail",
            params: { bookingId },
          } as any);
          return;
        }
        // Fallback: open booking hub
        router.push("/(tabs)/booking" as any);
        return;
      }

      // Wallet notifications → wallet tab
      if (
        type === "WALLET_DEPOSIT" ||
        type === "WALLET_WITHDRAWAL" ||
        type === "WALLET_TRANSFER_SENT" ||
        type === "WALLET_TRANSFER_RECEIVED"
      ) {
        router.push("/(tabs)/wallet" as any);
        return;
      }

      // Content notifications → article or reel viewer
      const contentId = meta.articleId ?? meta.reelId ?? notif.relatedContentId;
      if (contentId && (type === "CONTENT_LIKED" || type === "CONTENT_CLAPPED" || type === "CONTENT_COMMENTED" || type === "COMMENT_REPLY")) {
        if (meta.articleId) {
          router.push({ pathname: "/(tabs)/article-viewer", params: { articleId: meta.articleId } } as any);
          return;
        }
        if (meta.reelId) {
          router.push({ pathname: "/(tabs)/reel-viewer", params: { reelId: meta.reelId } } as any);
          return;
        }
      }

      // Default: no-op (notification already marked read above)
    },
    [handleMarkRead, router]
  );

  const isLoading = notifications === undefined;

  return (
    <AppBackground style={styles.root}>
      <MobileCard style={styles.mobileCard} containerStyle={styles.mobileCardContainer}>
        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.space3, backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.headerBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={headerIcon} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: headerText }]} allowFontScaling={false}>
              Notifications
            </Text>
            {(unreadCount ?? 0) > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText} allowFontScaling={false}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.headerActions}>
            {(unreadCount ?? 0) > 0 && (
              <TouchableOpacity
                onPress={handleMarkAllRead}
                style={styles.headerBtn}
                accessibilityRole="button"
                accessibilityLabel="Mark all as read"
              >
                <Ionicons name="checkmark-done" size={20} color={C.actionPrimary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onOpenSettings}
              style={styles.headerBtn}
              accessibilityRole="button"
              accessibilityLabel="Notification settings"
            >
              <Ionicons name="settings-outline" size={20} color={headerIcon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Category filter ── */}
        <View style={[styles.categoryBar, { backgroundColor: headerBg, borderBottomColor: headerBorder }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setActiveCategory(cat.id)}
                style={[
                  styles.categoryChip,
                  { backgroundColor: C.isDark ? C.bgElevated : '#171730', borderColor: C.isDark ? C.borderSubtle : 'rgba(255,255,255,0.12)' },
                  activeCategory === cat.id && styles.categoryChipActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
                accessibilityState={{ selected: activeCategory === cat.id }}
              >
                <Ionicons
                  name={cat.icon}
                  size={13}
                  color={activeCategory === cat.id ? '#FFFFFF' : '#9CA3AF'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: '#9CA3AF' },
                    activeCategory === cat.id && { color: '#FFFFFF' },
                  ]}
                  allowFontScaling={false}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── List ── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={C.actionPrimary} size="large" />
            <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading notifications…</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item: any) => item._id}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: insets.bottom + spacing.scrollBottomPadding },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={C.actionPrimary}
              />
            }
            ListEmptyComponent={
              <EmptyStateCard
                icon="notifications-off-outline"
                title="No notifications"
                subtitle={
                  activeCategory === "all"
                    ? "You're all caught up!"
                    : `No ${activeCategory} notifications yet.`
                }
                style={styles.emptyState}
              />
            }
            renderItem={({ item: notif }: { item: any }) => {
              const isHighlighted = notif._id === highlightNotificationId;
              const iconName    = getNotificationIcon(notif.type);
              const iconColor   = getNotificationIconColor(notif.type);
              const borderColor = getPriorityColor(notif.priority);

              return (
                <TouchableOpacity
                  onPress={() => handleNotificationPress(notif)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={notif.title}
                  style={[
                    styles.notifCard,
                    { backgroundColor: C.bgSurface, borderColor: C.borderSubtle },
                    !notif.isRead && { backgroundColor: C.bgPrimarySubtle, borderColor: C.borderFilled },
                    isHighlighted && { borderColor: C.actionPrimary, backgroundColor: C.bgPrimaryMid },
                    { borderLeftColor: borderColor },
                  ]}
                >
                  {/* Icon */}
                  <View style={[styles.notifIconWrap, { backgroundColor: `${iconColor}18` }]}>
                    <Ionicons name={iconName} size={18} color={iconColor} />
                  </View>

                  {/* Content */}
                  <View style={styles.notifContent}>
                    <View style={styles.notifTitleRow}>
                      <Text
                        style={[
                          styles.notifTitle,
                          { color: C.textSecondary },
                          !notif.isRead && { color: C.textPrimary },
                        ]}
                        numberOfLines={1}
                        allowFontScaling={true}
                      >
                        {notif.title}
                      </Text>
                      {!notif.isRead && <View style={[styles.unreadDot, { backgroundColor: C.actionPrimary }]} />}
                    </View>
                    <Text
                      style={[styles.notifMessage, { color: C.textMuted }]}
                      numberOfLines={2}
                      allowFontScaling={true}
                    >
                      {notif.message}
                    </Text>
                    <View style={styles.notifMeta}>
                      {notif.actor?.name && (
                        <Text style={[styles.notifActor, { color: C.textDisabled }]} numberOfLines={1} allowFontScaling={false}>
                          {notif.actor.name}
                        </Text>
                      )}
                      <Text style={[styles.notifTime, { color: C.textDisabled }]} allowFontScaling={false}>
                        {timeAgo(notif.createdAt)}
                      </Text>
                    </View>
                  </View>

                  {/* Delete */}
                  <TouchableOpacity
                    onPress={() => handleDelete(notif._id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Delete notification"
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={15} color={C.iconDisabled} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            }}
          />
        )}
      </MobileCard>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  mobileCardContainer: { flex: 1 },
  mobileCard: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: spacing.space2,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  headerTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
  },
  unreadBadge: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    ...typeScale.caption,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space1,
  },

  // Category bar — fixed height so it never stretches
  categoryBar: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    height: 52,
    justifyContent: "center",
  },
  categoryScroll: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    gap: spacing.space2,
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.space3,
    paddingVertical: 7,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    height: 34,
  },
  categoryChipActive: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  categoryChipText: {
    ...typeScale.labelSM,
    color: Colors.iconSecondary,
  },
  categoryChipTextActive: {
    color: Colors.textPrimary,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.space10,
    gap: spacing.space3,
  },
  loadingText: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
  },

  // List
  list: { flex: 1 },
  listContent: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    gap: spacing.space2,
  },
  emptyState: {
    paddingVertical: spacing.space10,
  },

  // Notification card
  notifCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderLeftWidth: 3,
    padding: spacing.space3,
    gap: spacing.space3,
    marginBottom: spacing.space2,
  },
  notifCardUnread: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderColor: Colors.borderFilled,
  },
  notifCardHighlighted: {
    borderColor: Colors.actionPrimary,
    backgroundColor: Colors.bgPrimaryMid,
  },
  notifIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.radiusSM,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notifContent: {
    flex: 1,
    gap: 3,
  },
  notifTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  notifTitle: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },
  notifTitleUnread: {
    color: Colors.textPrimary,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.actionPrimary,
    flexShrink: 0,
  },
  notifMessage: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  notifMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    marginTop: 2,
  },
  notifActor: {
    ...typeScale.caption,
    color: Colors.textDisabled,
    fontWeight: "600",
  },
  notifTime: {
    ...typeScale.caption,
    color: Colors.textDisabled,
  },
  deleteBtn: {
    padding: 4,
    flexShrink: 0,
  },
});
