/**
 * ReelEngagementRow
 * Horizontal engagement bar at the bottom of each ReelCardFeed in the feed.
 * Mirrors ArticleEngagementRow's design exactly — same layout, same lock rules.
 *
 * Lock rule:
 *   Gated reel + no purchase → row non-interactive (opacity 0.35, pointerEvents none)
 *   Free reel → always interactive
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  ActivityIndicator,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { ReelCommentsSheet } from "@/components/ReelCommentsSheet";

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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const C = useColors();

  const id = reelId as Id<"reels">;

  // ── Access check — gated reels require purchase ───────────────────────────
  const hasAccessResult = useQuery(api.payments.hasAccess, {
    contentType: "reel",
    contentId: id,
  });

  const locked = isGated ? hasAccessResult !== true : false;

  // ── Queries ───────────────────────────────────────────────────────────────
  const isLiked      = useQuery(api.engagement.isLiked,      { contentType: "reel", contentId: reelId });
  const isBookmarked = useQuery(api.engagement.isBookmarked, { contentType: "reel", contentId: reelId });
  const likeCount    = useQuery(api.engagement.getReelLikeCount, { reelId: id });
  const comments     = useQuery(api.engagement.getReelComments,  { reelId: id });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const likeReel     = useMutation(api.engagement.likeReel);
  const bookmarkReel = useMutation(api.engagement.bookmarkReel);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLike = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    try { await likeReel({ reelId: id }); } catch { /* silent */ }
  }, [id, likeReel]);

  const handleBookmark = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    try { await bookmarkReel({ reelId: id }); } catch { /* silent */ }
  }, [id, bookmarkReel]);

  const handleComment = useCallback((e: any) => {
    e?.stopPropagation?.();
    setCommentsOpen(true);
  }, []);

  const handleShare = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    try {
      await Share.share({
        message: `Check out this pulse by @${authorUsername ?? "creator"} on Ambrosia`,
        title: caption ?? "Ambrosia Pulse",
      });
    } catch { /* user cancelled */ }
  }, [caption, authorUsername]);

  // ── Render helpers ─────────────────────────────────────────────────────────
  const Btn = locked
    ? ({ children, style }: any) => <View style={[styles.btn, style]}>{children}</View>
    : ({ children, style, onPress, accessibilityLabel }: any) => (
        <TouchableOpacity
          style={[styles.btn, style]}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          {children}
        </TouchableOpacity>
      );

  // Engagement row always sits on a dark surface — use light text/icons
  const engMuted = C.isDark ? C.textMuted : '#9CA3AF';
  const engBorder = C.isDark ? C.borderSubtle : 'rgba(255,255,255,0.08)';

  return (
    <View style={styles.wrapper}>
      <View style={[
        styles.row,
        locked && styles.rowLocked,
        {
          borderTopColor:  engBorder,
          backgroundColor: C.bgEngagement ?? C.bgSurface,
        },
      ]}>

        {/* Like */}
        <Btn onPress={handleLike} accessibilityLabel={isLiked ? "Unlike" : "Like"}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? "#FF3B5C" : engMuted}
          />
          <Text style={[styles.count, { color: engMuted }, isLiked && { color: "#FF3B5C" }]}>
            {likeCount != null ? likeCount : "Like"}
          </Text>
        </Btn>

        {/* Comment */}
        <Btn onPress={handleComment} accessibilityLabel="Comment">
          <Ionicons name="chatbubble-outline" size={16} color={engMuted} />
          <Text style={[styles.count, { color: engMuted }]}>
            {comments !== undefined ? comments.length : "–"}
          </Text>
        </Btn>

        {/* Bookmark */}
        <Btn onPress={handleBookmark} accessibilityLabel={isBookmarked ? "Remove bookmark" : "Bookmark"}>
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={16}
            color={isBookmarked ? C.actionPrimary : engMuted}
          />
          <Text style={[styles.count, { color: engMuted }, isBookmarked && { color: C.actionPrimary }]}>Save</Text>
        </Btn>

        {/* Share — always available */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleShare}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Ionicons name="share-social-outline" size={16} color={engMuted} />
          <Text style={[styles.count, { color: engMuted }]}>Share</Text>
        </TouchableOpacity>

      </View>

      {/* Comments sheet */}
      {!locked && (
        <ReelCommentsSheet
          reelId={id}
          visible={commentsOpen}
          onClose={() => setCommentsOpen(false)}
        />
      )}
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
  rowLocked: {
    opacity: 0.35,
    pointerEvents: "none" as any,
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
