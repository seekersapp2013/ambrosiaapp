/**
 * notificationNavigation.ts
 * Centralized deep-linking & action handler for notifications.
 * Handles navigation to exact targets (articles, reels, bookings, referrals, circles, wallet, courses, user profiles)
 * or triggers a rich context modal when target content is missing or deleted.
 */

import { Router } from "expo-router";

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead?: boolean;
  category?: string;
  priority?: string;
  relatedContentType?: string;
  relatedContentId?: string;
  relatedId?: string;
  actorUserId?: string;
  actor?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
  createdAt?: number;
}

export interface NotificationContextModalData {
  notification: NotificationItem;
  reason?: string;
}

/**
 * Main navigation action for notification clicks.
 */
export function navigateToNotificationTarget(
  router: Router,
  notification: NotificationItem,
  setContextModal?: (data: NotificationContextModalData | null) => void,
  onMarkRead?: (id: string) => void
) {
  if (!notification) return;

  // 1. Mark as read immediately if unread
  if (!notification.isRead && onMarkRead) {
    onMarkRead(notification._id);
  }

  const type = notification.type || "";
  const meta = notification.metadata || {};
  const contentType = notification.relatedContentType || meta.contentType || "";
  const contentId = notification.relatedContentId || notification.relatedId || meta.contentId || meta.id || "";

  // ── 1. Referral Notifications ──────────────────────────────────────────────
  if (
    type.startsWith("referral_") ||
    type === "referral_new_received" ||
    type === "referral_expert_selected" ||
    type === "referral_selected_expert" ||
    type === "referral_declined" ||
    type === "referral_completed"
  ) {
    const referralId = meta.referralId || contentId;
    if (referralId) {
      router.push({
        pathname: "/(tabs)/booking/referral-detail",
        params: { referralId },
      } as any);
      return;
    }
  }

  // ── 2. Circle Notifications ────────────────────────────────────────────────
  if (type === "referral_circle_created" || meta.circleId || contentType === "circle") {
    const circleId = meta.circleId || contentId;
    if (circleId) {
      router.push({
        pathname: "/(tabs)/circle-chat",
        params: { circleId },
      } as any);
      return;
    }
  }

  // ── 3. Booking & Live Session Notifications ────────────────────────────────
  if (
    type.startsWith("booking_") ||
    type.startsWith("session_") ||
    type === "booking_confirmed" ||
    type === "booking_new" ||
    type === "booking_cancelled" ||
    type === "booking_reminder" ||
    type === "session_started" ||
    type === "session_ended"
  ) {
    const bookingId = meta.bookingId || contentId;

    if (type === "session_started") {
      if (meta.liveStreamRoomName || meta.roomName) {
        if (meta.eventType === "AUDIO_ONLY" || meta.isAudioOnly) {
          router.push({
            pathname: "/(tabs)/booking/audio-room",
            params: { bookingId, roomName: meta.liveStreamRoomName || meta.roomName },
          } as any);
          return;
        }
        router.push({
          pathname: "/(tabs)/booking/live-room",
          params: { bookingId, roomName: meta.liveStreamRoomName || meta.roomName },
        } as any);
        return;
      }
    }

    if (bookingId) {
      router.push({
        pathname: "/(tabs)/booking/booking-detail",
        params: { bookingId },
      } as any);
      return;
    }

    // Fallback: Booking hub
    router.push("/(tabs)/booking" as any);
    return;
  }

  // ── 4. Wallet & Financial Notifications ─────────────────────────────────────
  if (
    type.startsWith("WALLET_") ||
    type === "WALLET_DEPOSIT" ||
    type === "WALLET_WITHDRAWAL" ||
    type === "WALLET_TRANSFER_SENT" ||
    type === "WALLET_TRANSFER_RECEIVED" ||
    type === "CONTENT_PAYMENT"
  ) {
    router.push("/(tabs)/wallet" as any);
    return;
  }

  // ── 5. Content Notifications (Articles & Reels) ────────────────────────────
  const articleId = meta.articleId || (contentType === "article" ? contentId : null);
  const reelId = meta.reelId || (contentType === "reel" ? contentId : null);

  if (articleId) {
    router.push({
      pathname: "/(tabs)/article-viewer",
      params: { articleId },
    } as any);
    return;
  }

  if (reelId) {
    router.push({
      pathname: "/(tabs)/reel-viewer",
      params: { reelId },
    } as any);
    return;
  }

  // General content engagement fallback (liked, clapped, commented, mention, follow post)
  if (
    type === "CONTENT_LIKED" ||
    type === "CONTENT_CLAPPED" ||
    type === "CONTENT_COMMENTED" ||
    type === "COMMENT_REPLY" ||
    type === "FOLLOWER_NEW_POST" ||
    type === "USER_MENTIONED"
  ) {
    if (contentId) {
      // Default to article-viewer if unspecified
      router.push({
        pathname: "/(tabs)/article-viewer",
        params: { articleId: contentId },
      } as any);
      return;
    }
  }

  // ── 6. Course Notifications ────────────────────────────────────────────────
  if (type.startsWith("COURSE_") || type === "NEW_COURSE") {
    const courseId = meta.courseId || contentId;
    if (courseId) {
      router.push({
        pathname: "/(tabs)/for-you",
        params: { courseId },
      } as any);
      return;
    }
  }

  // ── 7. Social & Follower Notifications ─────────────────────────────────────
  if (type === "NEW_FOLLOWER") {
    router.push("/(tabs)/profile" as any);
    return;
  }

  // ── 8. System & Fallback (Display Context Modal) ───────────────────────────
  if (setContextModal) {
    setContextModal({
      notification,
      reason: meta.reason || "This notification provides status context for your account.",
    });
  }
}
