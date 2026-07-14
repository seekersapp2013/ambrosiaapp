/**
 * CommunityBadge — Reusable component for community content attribution
 *
 * Displays circle name + "Community" label + Join/Joined button.
 * Used in article cards, article viewer, reel cards, and pulse engagement bar
 * to replace Follow/Unfollow when content has a circleId.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useColors } from "@/hooks/useColors";

interface CircleInfo {
  circleId: string;
  circleName: string;
  parentCircleId?: string;
  parentCircleName?: string;
  coverImage?: string;
}

interface CommunityBadgeProps {
  circleInfo: CircleInfo;
  /** "inline" for feed cards (small row), "banner" for article-viewer (full-width card) */
  variant?: "inline" | "banner";
}

export function CommunityBadge({ circleInfo, variant = "inline" }: CommunityBadgeProps) {
  const C = useColors();
  const router = useRouter();
  const [joining, setJoining] = useState(false);

  const joinCircle = useMutation(api.circles.joinCircle);

  // Check membership — use the parent circle ID if available (for sub-circle content)
  const targetCircleId = circleInfo.parentCircleId ?? circleInfo.circleId;
  const displayName = circleInfo.parentCircleName ?? circleInfo.circleName;

  // We need to check if user is a member of this circle
  // Use getCircleById which returns isMember
  const circleData = useQuery(
    api.circles.getCircleById,
    targetCircleId ? { circleId: targetCircleId as Id<"circles"> } : "skip"
  );

  const isMember = circleData?.isMember ?? false;

  const handleJoin = async () => {
    if (joining || isMember) return;
    setJoining(true);
    try {
      await joinCircle({ circleId: targetCircleId as Id<"circles"> });
    } catch {
      // Silent fail — user sees unchanged state
    } finally {
      setJoining(false);
    }
  };

  const handleNavigateToCircle = () => {
    router.push({
      pathname: "/(tabs)/circle-detail",
      params: { circleId: targetCircleId },
    } as any);
  };

  if (variant === "banner") {
    return (
      <View style={[styles.banner, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
        <TouchableOpacity
          style={styles.bannerLeft}
          onPress={handleNavigateToCircle}
          activeOpacity={0.75}
        >
          <View style={[styles.bannerIcon, { backgroundColor: C.bgPrimarySubtle }]}>
            {circleInfo.coverImage ? (
              <Image source={{ uri: circleInfo.coverImage }} style={styles.bannerIconImage} />
            ) : (
              <Ionicons name="people-circle" size={20} color={C.primary} />
            )}
          </View>
          <View style={styles.bannerInfo}>
            <Text style={[styles.bannerLabel, { color: C.textMuted }]}>From community</Text>
            <Text style={[styles.bannerName, { color: C.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
          </View>
        </TouchableOpacity>

        {isMember ? (
          <View style={[styles.joinedBtn, { borderColor: C.borderSubtle }]}>
            <Ionicons name="checkmark-circle" size={12} color={C.statusSuccess} />
            <Text style={[styles.joinedText, { color: C.statusSuccess }]}>Joined</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.joinBtn, { backgroundColor: C.actionPrimary }]}
            onPress={handleJoin}
            disabled={joining}
            activeOpacity={0.8}
          >
            {joining ? (
              <ActivityIndicator size={10} color="#fff" />
            ) : (
              <Text style={styles.joinText}>Join</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Inline variant (for feed cards)
  return (
    <View style={styles.inline}>
      <TouchableOpacity
        style={styles.inlineLeft}
        onPress={handleNavigateToCircle}
        activeOpacity={0.75}
      >
        <Ionicons name="people-circle" size={14} color={C.primary} />
        <Text style={[styles.inlineName, { color: C.textMuted }]} numberOfLines={1}>
          {displayName}
        </Text>
        <Text style={[styles.inlineDot, { color: C.textDisabled }]}>·</Text>
        <Text style={[styles.inlineCommunity, { color: C.textMuted }]}>Community</Text>
      </TouchableOpacity>

      {isMember ? (
        <View style={[styles.inlineJoinedPill, { borderColor: C.borderSubtle }]}>
          <Ionicons name="checkmark-circle" size={10} color={C.statusSuccess} />
          <Text style={[styles.inlineJoinedText, { color: C.statusSuccess }]}>Joined</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.inlineJoinPill, { backgroundColor: C.actionPrimary }]}
          onPress={handleJoin}
          disabled={joining}
          activeOpacity={0.8}
        >
          {joining ? (
            <ActivityIndicator size={8} color="#fff" />
          ) : (
            <Text style={styles.inlineJoinText}>Join</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Banner variant (article-viewer) ────────────────────────────────────────
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  bannerIconImage: {
    width: "100%",
    height: "100%",
  },
  bannerInfo: {
    flex: 1,
    gap: 1,
  },
  bannerLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  bannerName: {
    fontSize: 14,
    fontWeight: "700",
  },
  joinBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  joinText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  joinedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  joinedText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // ── Inline variant (feed cards) ────────────────────────────────────────────
  inline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  inlineLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  inlineName: {
    fontSize: 11,
    fontWeight: "600",
    maxWidth: 120,
  },
  inlineDot: {
    fontSize: 11,
  },
  inlineCommunity: {
    fontSize: 11,
    fontWeight: "500",
  },
  inlineJoinPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  inlineJoinText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  inlineJoinedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  inlineJoinedText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
