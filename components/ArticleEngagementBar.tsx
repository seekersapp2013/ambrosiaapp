/**
 * ArticleEngagementBar
 * Horizontal bar inside article-viewer MobileCard.
 *
 * Lock rule:
 *   Gated  → must have purchased (hasAccess === true)
 *   Free   → must have read the article (hasReadArticle === true)
 *
 * Cross-platform: pointerEvents in style (not prop) + Btn swaps
 * TouchableOpacity → View when locked, giving zero click surface on web too.
 * Share is always available regardless of lock state.
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
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { ArticleCommentsSheet } from "@/components/ArticleCommentsSheet";

interface ArticleEngagementBarProps {
  articleId: Id<"articles">;
  title?: string;
  authorUsername?: string;
  isGated?: boolean;
  /** True when the current user has paid for or owns the article */
  hasAccess?: boolean;
}

export function ArticleEngagementBar({
  articleId,
  title,
  authorUsername,
  isGated = false,
  hasAccess = false,
}: ArticleEngagementBarProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [clapLoading, setClapLoading]   = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

  // For free articles: require a read record before engagement is unlocked
  const hasReadResult = useQuery(
    api.engagement.hasReadArticle,
    !isGated ? { articleId } : "skip"
  );

  // Lock determination:
  //   Gated  → must have access (paid / author)
  //   Free   → must have read (hasReadResult === true); loading = locked
  const locked = isGated ? !hasAccess : hasReadResult !== true;

  // ── Queries ───────────────────────────────────────────────────────────────
  const myClaps      = useQuery(api.engagement.myClapsForArticle, { articleId });
  const totalClaps   = useQuery(api.engagement.totalClapsForArticle, { articleId });
  const isLiked      = useQuery(api.engagement.isLiked,      { contentType: "article", contentId: articleId });
  const isBookmarked = useQuery(api.engagement.isBookmarked, { contentType: "article", contentId: articleId });
  const commentCount = useQuery(api.engagement.getArticleComments, { articleId });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const clapArticle     = useMutation(api.engagement.clapArticle);
  const likeArticle     = useMutation(api.engagement.likeArticle);
  const bookmarkArticle = useMutation(api.engagement.bookmarkArticle);

  // ── Handlers (only reachable when unlocked) ───────────────────────────────
  const handleClap = useCallback(async () => {
    if (clapLoading) return;
    setClapLoading(true);
    try {
      await clapArticle({ articleId, delta: 1 });
    } catch { /* server will reject if read record missing */ }
    finally { setClapLoading(false); }
  }, [clapLoading, articleId, clapArticle]);

  const handleLike = useCallback(async () => {
    try { await likeArticle({ articleId }); } catch { /* silent */ }
  }, [articleId, likeArticle]);

  const handleBookmark = useCallback(async () => {
    try { await bookmarkArticle({ articleId }); } catch { /* silent */ }
  }, [articleId, bookmarkArticle]);

  const handleShare = useCallback(async () => {
    if (shareLoading) return;
    setShareLoading(true);
    try {
      await Share.share({
        message: `Check out "${title ?? "this article"}" by @${authorUsername ?? "creator"} on Ambrosia`,
        title: title ?? "Ambrosia Article",
      });
    } catch { /* user cancelled */ }
    finally { setShareLoading(false); }
  }, [shareLoading, title, authorUsername]);

  // ── Btn helper — TouchableOpacity when unlocked, plain View when locked ───
  const Btn = locked
    ? ({ children, style }: any) => <View style={[styles.btn, style]}>{children}</View>
    : ({ children, style, onPress, label }: any) => (
        <TouchableOpacity
          style={[styles.btn, style]}
          onPress={onPress}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          {children}
        </TouchableOpacity>
      );

  const lockReason = isGated
    ? "Purchase to engage"
    : hasReadResult === undefined
    ? "Checking access…"
    : "Read the article to engage";

  return (
    <View style={styles.wrapper}>
      {/* Lock tooltip */}
      {locked && (
        <View style={styles.lockTooltip}>
          <Ionicons name="lock-closed" size={10} color={Colors.statusWarning} />
          <Text style={styles.lockTooltipText} allowFontScaling={false}>
            {lockReason}
          </Text>
        </View>
      )}

      {/* Bar — style-level pointerEvents for web compatibility */}
      <View style={[styles.container, locked && styles.containerLocked]}>

        {/* Clap */}
        <Btn onPress={handleClap} label={`Clap (${myClaps ?? 0})`}>
          {clapLoading ? (
            <ActivityIndicator size="small" color={Colors.actionPrimary} />
          ) : (
            <Ionicons
              name="hand-left-outline"
              size={22}
              color={(myClaps ?? 0) > 0 ? Colors.actionPrimary : Colors.iconSecondary}
            />
          )}
          <Text style={[styles.btnLabel, (myClaps ?? 0) > 0 && styles.btnLabelActive]}
            allowFontScaling={false}>
            {totalClaps ?? 0}
          </Text>
        </Btn>

        {/* Like */}
        <Btn onPress={handleLike} label={isLiked ? "Unlike" : "Like"}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={22}
            color={isLiked ? "#FF3B5C" : Colors.iconSecondary}
          />
          <Text style={[styles.btnLabel, isLiked && { color: "#FF3B5C" }]}
            allowFontScaling={false}>
            Like
          </Text>
        </Btn>

        {/* Comment */}
        <Btn onPress={() => setCommentsOpen(true)} label="Comments">
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.iconSecondary} />
          <Text style={styles.btnLabel} allowFontScaling={false}>
            {commentCount !== undefined ? commentCount.length : "–"}
          </Text>
        </Btn>

        {/* Bookmark */}
        <Btn onPress={handleBookmark} label={isBookmarked ? "Remove bookmark" : "Bookmark"}>
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={isBookmarked ? Colors.actionPrimary : Colors.iconSecondary}
          />
          <Text style={[styles.btnLabel, isBookmarked && styles.btnLabelActive]}
            allowFontScaling={false}>
            Save
          </Text>
        </Btn>

        {/* Share — always available */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleShare}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          {shareLoading ? (
            <ActivityIndicator size="small" color={Colors.iconSecondary} />
          ) : (
            <Ionicons name="share-social-outline" size={22} color={Colors.iconSecondary} />
          )}
          <Text style={styles.btnLabel} allowFontScaling={false}>Share</Text>
        </TouchableOpacity>

      </View>

      {/* Comments sheet — only mounts when unlocked */}
      {!locked && (
        <ArticleCommentsSheet
          articleId={articleId}
          visible={commentsOpen}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },

  lockTooltip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "center",
    backgroundColor: Colors.amberSurface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    marginBottom: 2,
  },
  lockTooltipText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.statusWarning,
  },

  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: Colors.bgSurface,
    marginBottom: spacing.space4,
    borderRadius: 12,
  },
  containerLocked: {
    opacity: 0.35,
    // style-level pointerEvents — the only way to block clicks on web
    pointerEvents: "none" as any,
  },

  btn: {
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.space2,
    minWidth: 48,
  },
  btnLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  btnLabelActive: {
    color: Colors.actionPrimary,
  },
});
