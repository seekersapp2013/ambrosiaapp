/**
 * TopNav — Shared top navigation header used across all tab screens.
 *
 * Theme behaviour:
 *   Dark  — bgSurface (#0F0F1E) with crimson-tinted bottom border (unchanged)
 *   Light — solid white (#FFFFFF) with a neutral hairline bottom border
 *           and a mild drop shadow. Clean and flat — matching the reference
 *           health-app navigation style.
 *
 * Features:
 *   - Auto title from route segment (or explicit `title` prop)
 *   - Sun/moon toggle for light/dark mode
 *   - Notification bell with unread badge
 *   - Profile avatar
 *   - Back button when navigation history exists
 */

import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  View as RNView,
  Image,
  Platform,
} from "react-native";
import { View, Text } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import { AppLogo } from "@/components/AppLogo";
import { useAppTheme } from "@/context/ThemeContext";
import { useColors } from "@/hooks/useColors";
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
  const last = [...segments].reverse().find((s) => !s.startsWith("("));
  if (!last) return "";
  return (
    SEGMENT_LABELS[last] ??
    last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

const LOGO_SIZE = 40;

// ─── Props ────────────────────────────────────────────────────────────────────
interface TopNavProps {
  title?:             string;
  hideNotifications?: boolean;
  hideProfile?:       boolean;
  trailing?:          React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────────────────────
export function TopNav({
  title,
  hideNotifications = false,
  hideProfile       = false,
  trailing,
}: TopNavProps) {
  const router   = useRouter();
  const label    = title ?? useRouteTitle();
  const history  = useNavigationHistory();
  const { isDark, toggleTheme } = useAppTheme();
  const C        = useColors();

  const unreadCount     = useQuery(api.notifications.getUnreadCount);
  const profile         = useQuery(api.profiles.getMyProfile) as
    | { avatar?: string | null } | null | undefined;
  const profilePictureUrl = useQuery(
    api.profiles.getProfilePictureUrl,
    profile?.avatar ? { storageId: profile.avatar } : "skip"
  );

  const hasHistory = history.stackDepth > 0;

  // ── nav bar surface ────────────────────────────────────────────────────────
  // Both modes use dark navy — gives the app a strong branded header contrast.
  const navBg          = '#0F0F1E';
  const navBorderColor = 'rgba(198,34,41,0.35)';

  // Text/icon colors are always light on the dark nav surface
  const navTextColor = '#FFFFFF';
  const navIconColor = '#D1D5DB';

  return (
    <View
      backgroundColor={navBg}
      borderBottomWidth={1}
      borderBottomColor={navBorderColor}
      paddingVertical="$3"
      paddingHorizontal="$4"
      // No shadow needed — dark nav on both modes
    >
      <View flexDirection="row" alignItems="center" gap="$3">

        {/* Back button or Logo */}
        {hasHistory ? (
          <TouchableOpacity
            onPress={() => history.goBack(router)}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={24} color={navIconColor} />
          </TouchableOpacity>
        ) : (
          <AppLogo size={LOGO_SIZE} showGlow />
        )}

        {/* Title */}
        <View flex={1} height={LOGO_SIZE} justifyContent="center">
          <Text
            color={navTextColor}
            fontSize={LOGO_SIZE * 0.7}
            fontWeight="800"
            letterSpacing={-0.5}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {label}
          </Text>
        </View>

        {/* Trailing slot */}
        {trailing}

        {/* Light / Dark toggle */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Ionicons
            name={isDark ? "sunny-outline" : "moon-outline"}
            size={20}
            color={navIconColor}
          />
        </TouchableOpacity>

        {/* Notification bell */}
        {!hideNotifications && (
          <TouchableOpacity
            onPress={() => {
              history.push("/(tabs)/for-you");
              router.push("/(tabs)/notification");
            }}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={navIconColor} />
            {(unreadCount ?? 0) > 0 && (
              <RNView
                style={[styles.bellBadge, { backgroundColor: C.actionPrimary }]}
              >
                <Text color="#fff" fontSize={9} fontWeight="700" allowFontScaling={false}>
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
              <Image source={{ uri: profilePictureUrl }} style={styles.avatarImg} accessible={false} />
            ) : (
              <RNView
                style={[
                  styles.avatarPlaceholder,
                  {
                    backgroundColor: C.bgElevated,
                    borderColor:     C.redBorder,
                  },
                ]}
              >
                <Ionicons name="person" size={16} color={navIconColor} />
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
  lightShadow: {
    // Soft downward shadow on light mode nav — separates it from page content
    shadowColor:   "#000000",
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius:  8,
    elevation:     3,
  },
  iconBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    alignItems:      "center",
    justifyContent:  "center",
    position:        "relative",
  },
  bellBadge: {
    position:        "absolute",
    top:             4,
    right:           4,
    minWidth:        16,
    height:          16,
    borderRadius:    8,
    alignItems:      "center",
    justifyContent:  "center",
    paddingHorizontal: 3,
  },
  avatarBtn: {
    width:        34,
    height:       34,
    borderRadius: 17,
    overflow:     "hidden",
  },
  avatarImg: {
    width:        34,
    height:       34,
    borderRadius: 17,
  },
  avatarPlaceholder: {
    width:        34,
    height:       34,
    borderRadius: 17,
    borderWidth:  1,
    alignItems:   "center",
    justifyContent: "center",
  },
});
