/**
 * ReelEngagementRow
 * Horizontal engagement bar at the bottom of each ReelCardFeed in the feed.
 *
 * VIEW-ONLY: This component displays engagement counts and states but does NOT
 * allow interaction. Users can only interact with engagement through the
 * Pulse Viewer (ReelEngagementBar). This ensures a single point of
 * interaction for engagement actions.
 *
 * Displays: Like count, Comment count, Bookmark state, Share label.
 * All buttons are non-interactive Views — no TouchableOpacity, no mutations.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

interface ReelEngagementRowProps {
  reelId: string;
  caption?: string;
  authorUsername?: string;
  isGated?: boolean;
}

export function ReelEngagementRow({
  reelId,
  caption,
  authorUsername,
  isGated = false,
}: ReelEngagementRowProps) {
  const C = useColors();
  const id = reelId as Id<"reels">;

  // ── Queries (read-only — for display purposes) ────────────────────────────
  const isLiked      = useQuery(api.engagement.isLiked,      { contentType: "reel", contentId: reelId });
  const isBookmarked = useQuery(api.engagement.isBookmarked, { contentType: "reel", contentId: reelId });
  const likeCount    = useQuery(api.engagement.getReelLikeCount, { reelId: id });
  const comments     = useQuery(api.engagement.getReelComments,  { reelId: id });

  // Engagement row always sits on a dark surface — use light text/icons
  const engMuted = C.isDark ? C.textMuted : '#9CA3AF';
  const engBorder = C.isDark ? C.borderSubtle : 'rgba(255,255,255,0.08)';

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.row,
        {
          borderTopColor:  engBorder,
          backgroundColor: C.bgEngagement ?? C.bgSurface,
        },
      ]}>

        {/* Like — view only */}
        <View style={styles.btn} accessibilityLabel={isLiked ? "Liked" : "Like"}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? "#FF3B5C" : engMuted}
          />
          <Text style={[styles.count, { color: engMuted }, isLiked && { color: "#FF3B5C" }]}>
            {likeCount != null ? likeCount : "Like"}
          </Text>
        </View>

        {/* Comment — view only */}
        <View style={styles.btn} accessibilityLabel="Comments">
          <Ionicons name="chatbubble-outline" size={16} color={engMuted} />
          <Text style={[styles.count, { color: engMuted }]}>
            {comments !== undefined ? comments.length : "–"}
          </Text>
        </View>

        {/* Bookmark — view only */}
        <View style={styles.btn} accessibilityLabel={isBookmarked ? "Bookmarked" : "Bookmark"}>
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={16}
            color={isBookmarked ? C.actionPrimary : engMuted}
          />
          <Text style={[styles.count, { color: engMuted }, isBookmarked && { color: C.actionPrimary }]}>Save</Text>
        </View>

        {/* Share — view only */}
        <View style={styles.btn} accessibilityLabel="Share">
          <Ionicons name="share-social-outline" size={16} color={engMuted} />
          <Text style={[styles.count, { color: engMuted }]}>Share</Text>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 4,
    flexWrap: "wrap",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  count: {
    fontSize: 11,
    fontWeight: "500",
  },
});
