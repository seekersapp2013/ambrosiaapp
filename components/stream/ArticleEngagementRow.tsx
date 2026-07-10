/**
 * ArticleEngagementRow
 * Compact horizontal engagement bar at the bottom of each ArticleCard in feed.
 *
 * Lock rule:
 *   - Gated article + no purchase → entire row non-interactive (opacity 0.35,
 *     pointerEvents:'none' in style, no TouchableOpacity rendered at all)
 *   - Free article + not yet read  → same lock (hasReadArticle = false)
 *   - Otherwise → fully interactive
 *
 * Cross-platform note: pointerEvents must be in the STYLE object to work on
 * web (React Native Web ignores it as a prop). Buttons are also conditionally
 * replaced with plain Views when locked so there is zero click surface.
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
import { ArticleCommentsSheet } from "@/components/ArticleCommentsSheet";

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
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [clapLoading, setClapLoading]   = useState(false);
  const C = useColors();

  const id = articleId as Id<"articles">;

  // ── Access & read checks ───────────────────────────────────────────────────
  const hasAccessResult = useQuery(api.payments.hasAccess, {
    contentType: "article",
    contentId: id,
  });
  const hasReadResult = useQuery(api.engagement.hasReadArticle, { articleId: id });

  // Lock rule:
  //   Gated   → must have purchased (hasAccessResult === true)
  //   Free    → must have read (hasReadResult === true)
  // While either query is loading (undefined) we treat as locked to be safe.
  const locked = isGated
    ? hasAccessResult !== true
    : hasReadResult !== true;

  // ── Queries ───────────────────────────────────────────────────────────────
  const totalClaps   = useQuery(api.engagement.totalClapsForArticle, { articleId: id });
  const myClaps      = useQuery(api.engagement.myClapsForArticle,    { articleId: id });
  const isLiked      = useQuery(api.engagement.isLiked,      { contentType: "article", contentId: articleId });
  const isBookmarked = useQuery(api.engagement.isBookmarked, { contentType: "article", contentId: articleId });
  const comments     = useQuery(api.engagement.getArticleComments, { articleId: id });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const clapArticle     = useMutation(api.engagement.clapArticle);
  const likeArticle     = useMutation(api.engagement.likeArticle);
  const bookmarkArticle = useMutation(api.engagement.bookmarkArticle);

  // ── Handlers (only called when unlocked) ──────────────────────────────────
  const handleClap = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    if (clapLoading) return;
    setClapLoading(true);
    try {
      await clapArticle({ articleId: id, delta: 1 });
    } catch { /* silent */ }
    finally { setClapLoading(false); }
  }, [clapLoading, id, clapArticle]);

  const handleLike = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    try { await likeArticle({ articleId: id }); } catch { /* silent */ }
  }, [id, likeArticle]);

  const handleBookmark = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    try { await bookmarkArticle({ articleId: id }); } catch { /* silent */ }
  }, [id, bookmarkArticle]);

  const handleComment = useCallback((e: any) => {
    e?.stopPropagation?.();
    setCommentsOpen(true);
  }, []);

  const handleShare = useCallback(async (e: any) => {
    e?.stopPropagation?.();
    try {
      await Share.share({
        message: `Check out "${title ?? "this article"}" by @${authorUsername ?? "creator"} on Ambrosia`,
        title: title ?? "Ambrosia Article",
      });
    } catch { /* user cancelled */ }
  }, [title, authorUsername]);

  // ── Render helpers ────────────────────────────────────────────────────────
  // When locked, render a plain View instead of TouchableOpacity — zero click surface
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
      {/* Row — style-level pointerEvents works on both native and web */}
      <View style={[
        styles.row,
        locked && styles.rowLocked,
        {
          borderTopColor:  engBorder,
          backgroundColor: C.bgEngagement ?? C.bgSurface,
        },
      ]}>

        {/* Clap */}
        <Btn onPress={handleClap} accessibilityLabel="Clap">
          {clapLoading ? (
            <ActivityIndicator size="small" color={C.actionPrimary} />
          ) : (
            <Ionicons
              name="hand-left-outline"
              size={16}
              color={(myClaps ?? 0) > 0 ? C.actionPrimary : engMuted}
            />
          )}
          <Text style={[styles.count, { color: engMuted }, (myClaps ?? 0) > 0 && { color: C.actionPrimary }]}>
            {totalClaps ?? 0}
          </Text>
        </Btn>

        {/* Like */}
        <Btn onPress={handleLike} accessibilityLabel={isLiked ? "Unlike" : "Like"}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={16}
            color={isLiked ? "#FF3B5C" : engMuted}
          />
          <Text style={[styles.count, { color: engMuted }, isLiked && { color: "#FF3B5C" }]}>Like</Text>
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

        {/* Share — always available regardless of lock */}
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

      {/* Comments sheet — only mounts when unlocked */}
      {!locked && (
        <ArticleCommentsSheet
          articleId={id}
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
