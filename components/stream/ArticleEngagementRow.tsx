/**
 * ArticleEngagementRow
 * Compact horizontal engagement bar at the bottom of each ArticleCard in feed.
 *
 * VIEW-ONLY: This component displays engagement counts and states but does NOT
 * allow interaction. Users can only interact with engagement through the
 * Article Viewer (ArticleEngagementBar). This ensures a single point of
 * interaction for engagement actions.
 *
 * Displays: Claps, Likes, Comment count, Bookmark state, Share count.
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

interface ArticleEngagementRowProps {
  articleId: string;
  title?: string;
  authorUsername?: string;
  isGated?: boolean;
}

export function ArticleEngagementRow({
  articleId,
  title,
  authorUsername,
  isGated = false,
}: ArticleEngagementRowProps) {
  const C = useColors();
  const id = articleId as Id<"articles">;

  // ── Queries (read-only — for display purposes) ────────────────────────────
  const totalClaps   = useQuery(api.engagement.totalClapsForArticle, { articleId: id });
  const myClaps      = useQuery(api.engagement.myClapsForArticle,    { articleId: id });
  const isLiked      = useQuery(api.engagement.isLiked,      { contentType: "article", contentId: articleId });
  const isBookmarked = useQuery(api.engagement.isBookmarked, { contentType: "article", contentId: articleId });
  const comments     = useQuery(api.engagement.getArticleComments, { articleId: id });

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

        {/* Clap — view only */}
        <View style={styles.btn} accessibilityLabel="Claps">
          <Ionicons
            name="hand-left-outline"
            size={16}
            color={(myClaps ?? 0) > 0 ? C.actionPrimary : engMuted}
          />
          <Text style={[styles.count, { color: engMuted }, (myClaps ?? 0) > 0 && { color: C.actionPrimary }]}>
            {totalClaps ?? 0}
          </Text>
        </View>

        {/* Like — view only */}
        <View style={styles.btn} accessibilityLabel={isLiked ? "Liked" : "Like"}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? "#FF3B5C" : engMuted}
          />
          <Text style={[styles.count, { color: engMuted }, isLiked && { color: "#FF3B5C" }]}>Like</Text>
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
