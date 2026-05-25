/**
 * NotificationBanner
 * Horizontal scrollable banner of recent unread notifications.
 * Shown at the top of the home feed.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
} from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { radius } from "@/tokens/radius";
import { spacing } from "@/tokens/spacing";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface NotificationBannerItem {
  _id: string;
  title: string;
  type: string;
  createdAt: number;
  priority?: string;
}

interface NotificationBannerProps {
  notifications: NotificationBannerItem[];
  onNotificationClick: (notificationId: string) => void;
  onNotificationDismiss?: (notificationId: string) => void;
  onDismiss?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getNotificationIcon(type: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "CONTENT_LIKED":         return "heart";
    case "CONTENT_CLAPPED":       return "hand-left";
    case "CONTENT_COMMENTED":     return "chatbubble";
    case "COMMENT_REPLY":         return "return-down-forward";
    case "NEW_FOLLOWER":          return "person-add";
    case "CONTENT_PAYMENT":       return "cash";
    case "USER_MENTIONED":        return "at";
    case "FOLLOWER_NEW_POST":     return "newspaper";
    case "WALLET_DEPOSIT":        return "arrow-down-circle";
    case "WALLET_WITHDRAWAL":     return "arrow-up-circle";
    case "WALLET_TRANSFER_SENT":  return "send";
    case "WALLET_TRANSFER_RECEIVED": return "wallet";
    default:                      return "notifications";
  }
}

function getNotificationIconColor(type: string): string {
  switch (type) {
    case "CONTENT_LIKED":         return Colors.statusDanger;
    case "CONTENT_CLAPPED":       return Colors.statusWarning;
    case "CONTENT_COMMENTED":     return Colors.statusInfo;
    case "COMMENT_REPLY":         return Colors.statusInfo;
    case "NEW_FOLLOWER":          return Colors.statusSuccess;
    case "CONTENT_PAYMENT":       return Colors.statusSuccess;
    case "USER_MENTIONED":        return Colors.palette.purple;
    case "FOLLOWER_NEW_POST":     return Colors.statusInfo;
    case "WALLET_DEPOSIT":        return Colors.statusSuccess;
    case "WALLET_WITHDRAWAL":     return Colors.statusWarning;
    case "WALLET_TRANSFER_SENT":  return Colors.statusInfo;
    case "WALLET_TRANSFER_RECEIVED": return Colors.statusSuccess;
    default:                      return Colors.iconSecondary;
  }
}

function getPriorityBorderColor(priority?: string): string {
  switch (priority) {
    case "high":   return Colors.statusDanger;
    case "medium": return Colors.statusWarning;
    case "low":    return Colors.statusInfo;
    default:       return Colors.borderSubtle;
  }
}

// ─── Animated item ────────────────────────────────────────────────────────────
function BannerItem({
  notification,
  onPress,
  onDismiss,
}: {
  notification: NotificationBannerItem;
  onPress: () => void;
  onDismiss: () => void;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  const scale   = useRef(new Animated.Value(1)).current;

  const fadeOut = (cb: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scale,   { toValue: 0.92, duration: 150, useNativeDriver: true }),
    ]).start(cb);
  };

  const handlePress = () => fadeOut(onPress);
  const handleDismiss = () => fadeOut(onDismiss);

  const borderColor = getPriorityBorderColor(notification.priority);
  const iconName    = getNotificationIcon(notification.type);
  const iconColor   = getNotificationIconColor(notification.type);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={notification.title}
        style={[styles.item, { borderLeftColor: borderColor }]}
      >
        <Ionicons name={iconName} size={14} color={iconColor} style={styles.itemIcon} />
        <Text style={styles.itemTitle} numberOfLines={1} allowFontScaling={false}>
          {notification.title}
        </Text>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={11} color={Colors.iconSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NotificationBanner({
  notifications,
  onNotificationClick,
  onNotificationDismiss,
  onDismiss,
}: NotificationBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [marking,   setMarking]   = useState<Set<string>>(new Set());
  const markAsRead = useMutation(api.notifications.markAsRead);

  // Prune dismissed set when notification list changes
  useEffect(() => {
    const ids = new Set(notifications.map((n) => n._id));
    setDismissed((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => { if (ids.has(id)) next.add(id); });
      return next;
    });
    setMarking((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => { if (ids.has(id)) next.add(id); });
      return next;
    });
  }, [notifications]);

  const visible = notifications.filter(
    (n) => !dismissed.has(n._id) && !marking.has(n._id)
  );

  if (visible.length === 0) return null;

  const handleClick = (id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    onNotificationClick(id);
  };

  const handleDismiss = async (id: string) => {
    setMarking((prev) => new Set([...prev, id]));
    onNotificationDismiss?.(id);
    setTimeout(() => {
      setDismissed((prev) => new Set([...prev, id]));
    }, 160);
    try {
      await markAsRead({ notificationId: id as Id<"notifications"> });
    } catch (err) {
      console.error("Failed to mark as read:", err);
      setDismissed((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } finally {
      setMarking((prev) => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {visible.map((n) => (
          <BannerItem
            key={`${n._id}-${n.createdAt}`}
            notification={n}
            onPress={() => handleClick(n._id)}
            onDismiss={() => handleDismiss(n._id)}
          />
        ))}
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.viewAllBtn}
          accessibilityRole="button"
          accessibilityLabel="View all notifications"
        >
          <Text style={styles.viewAllText}>View all</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingVertical: spacing.space2,
  },
  scroll: {
    paddingHorizontal: spacing.space3,
    gap: spacing.space2,
    alignItems: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusSM,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    maxWidth: 220,
    gap: spacing.space2,
  },
  itemIcon: {
    flexShrink: 0,
  },
  itemTitle: {
    ...typeScale.bodySM,
    color: Colors.textSecondary,
    flex: 1,
  },
  dismissBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.bgBase,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  viewAllBtn: {
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
  },
  viewAllText: {
    ...typeScale.labelSM,
    color: Colors.actionPrimary,
  },
});
