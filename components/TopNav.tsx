/**
 * TopNav — Shared top navigation header used across all tab screens.
 *
 * - Title is derived automatically from the active route segment so it
 *   matches the current bottom-nav label (e.g. "For You", "Wallet", …).
 * - Pass `title` explicitly to override the auto-detected label.
 * - Notification bell with unread badge is included by default.
 * - Profile avatar button navigates to the profile screen.
 * - Back button appears automatically when there is navigation history
 *   (i.e. the user arrived here from another screen via history.push).
 */

import React from "react";
import { TouchableOpacity, StyleSheet, View as RNView, Image } from "react-native";
import { View, Text } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { AppLogo } from "@/components/AppLogo";
import { Colors } from "@/constants/Colors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

// ─── Segment → human-readable label map ──────────────────────────────────────
const SEGMENT_LABELS: Record<string, string> = {
  "for-you":        "For You",
  wallet:           "Wallet",
  learn:            "Learn",
  circle:           "Circle",
  profile:          "Profile",
  booking:          "Booking",
  community:        "Community",
  notification:     "Notifications",
  "write-article":  "Write Article",
  "write-reel":     "Create Pulse",
  "article-viewer": "Article",
  "reel-viewer":    "Pulse",
};

function useRouteTitle(): string {
  const segments = useSegments();
  // segments looks like ["(tabs)", "for-you"] — grab the last meaningful part
  const last = [...segments].reverse().find((s) => !s.startsWith("("));
  if (!last) return "";
  return SEGMENT_LABELS[last] ?? last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Logo size — keeps title height consistent with the logo ─────────────────
const LOGO_SIZE = 40;

// ─── Props ────────────────────────────────────────────────────────────────────
interface TopNavProps {
  /** Override the auto-detected route title */
  title?: string;
  /** Hide the notification bell (default: false) */
  hideNotifications?: boolean;
  /** Hide the profile avatar button (default: false) */
  hideProfile?: boolean;
  /** Extra element(s) rendered between the title and the bell/avatar buttons */
  trailing?: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TopNav({ title, hideNotifications = false, hideProfile = false, trailing }: TopNavProps) {
  const router = useRouter();
  const routeTitle = useRouteTitle();
  const label = title ?? routeTitle;
  const history = useNavigationHistory();

  const unreadCount = useQuery(api.notifications.getUnreadCount);

  // Fetch current user's profile for the avatar
  const profile = useQuery(api.profiles.getMyProfile) as
    | { avatar?: string | null; name?: string | null; username?: string | null }
    | null
    | undefined;
  const profilePictureUrl = useQuery(
    api.profiles.getProfilePictureUrl,
    profile?.avatar ? { storageId: profile.avatar } : "skip"
  );

  // Show a back button only when the user arrived here via history.push
  const hasHistory = history.stackDepth > 0;

  return (
    <View
      backgroundColor={Colors.surface}
      borderBottomWidth={1}
      borderBottomColor={Colors.redBorder}
      paddingVertical="$3"
      paddingHorizontal="$4"
    >
      <View flexDirection="row" alignItems="center" gap="$3">
        {/* Back button — only shown when there's history */}
        {hasHistory ? (
          <TouchableOpacity
            onPress={() => history.goBack(router)}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          /* Logo — shown when no back button */
          <AppLogo size={LOGO_SIZE} showGlow />
        )}

        {/* Title — same height as the logo so they sit flush */}
        <View flex={1} height={LOGO_SIZE} justifyContent="center">
          <Text
            color={Colors.textPrimary}
            fontSize={LOGO_SIZE * 0.7}   // 28px — visually balanced with 40px logo
            fontWeight="800"
            letterSpacing={-0.5}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {label}
          </Text>
        </View>

        {/* Trailing slot — extra actions before bell/avatar */}
        {trailing}

        {/* Notification bell */}
        {!hideNotifications && (
          <TouchableOpacity
            onPress={() => {
              // Track navigation before going to notifications
              history.push("/(tabs)/for-you");
              router.push("/(tabs)/notification");
            }}
            style={styles.bellBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={Colors.textSecondary}
            />
            {(unreadCount ?? 0) > 0 && (
              <RNView style={styles.bellBadge}>
                <Text
                  color="#fff"
                  fontSize={9}
                  fontWeight="700"
                  allowFontScaling={false}
                >
                  {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                </Text>
              </RNView>
            )}
          </TouchableOpacity>
        )}

        {/* Profile avatar */}
        {!hideProfile && (
          <TouchableOpacity
            onPress={() => {
              history.push("/(tabs)/for-you");
              (router.push as any)("/(tabs)/profile");
            }}
            style={styles.avatarBtn}
            accessibilityRole="button"
            accessibilityLabel="Profile"
          >
            {profilePictureUrl ? (
              <Image
                source={{ uri: profilePictureUrl }}
                style={styles.avatarImg}
                accessible={false}
              />
            ) : (
              <RNView style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={16} color={Colors.textSecondary} />
              </RNView>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: "hidden",
  },
  avatarImg: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    alignItems: "center",
    justifyContent: "center",
  },
});
