/**
 * ArticleCard
 * Feed card for an article item.
 * Cover image (16:9), title, author row, read time, tags, gated badge,
 * + ArticleEngagementRow at the bottom (access-gated).
 *
 * Phase 1: Follow/Unfollow pill added to the author meta row.
 * Phase 2: Delete button (trash icon) shown for own content or admins.
 * Phase 3: Course indicator badge — shows "Course · Lesson N" when the
 *   article belongs to a course, using courseInfo from the feed.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { ArticleEngagementRow } from "./ArticleEngagementRow";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export interface ArticleCardItem {
  _id: string;
  title: string;
  subtitle?: string;
  coverImage?: string;
  /** Resolved public URL for the cover image (preferred over coverImage storage ID) */
  coverImageUrl?: string;
  contentHtml?: string;
  readTimeMin?: number;
  tags?: string[];
  isGated?: boolean;
  priceAmount?: number;
  priceToken?: string;
  createdAt: number;
  /** The Convex user ID of the article author — used for the follow button */
  authorId?: string;
  /** If this article is part of a course, contains the course title and 1-based position */
  courseInfo?: { courseTitle: string; order: number };
  author?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
}

/** Strip HTML tags and decode basic entities for plain-text preview */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── FollowPill ────────────────────────────────────────────────────────────────
// Small inline pill shown next to the author name. Hidden for own content.
interface FollowPillProps {
  authorId: string;
}

function FollowPill({ authorId }: FollowPillProps) {
  const C = useColors();
  const isFollowing = useQuery(api.follows.isFollowing, {
    userId: authorId as Id<"users">,
  });
  const followUser = useMutation(api.follows.followUser);
  const [pending, setPending] = React.useState(false);

  const handlePress = async () => {
    if (pending) return;
    setPending(true);
    try {
      await followUser({ followingId: authorId as Id<"users"> });
    } finally {
      setPending(false);
    }
  };

  if (isFollowing === undefined) {
    return (
      <View style={followStyles.pill}>
        <ActivityIndicator size={10} color={C.textMuted} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[
        followStyles.pill,
        isFollowing
          ? [followStyles.pillFollowing, { borderColor: C.borderSubtle }]
          : [followStyles.pillFollow, { backgroundColor: C.actionPrimary }],
      ]}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? "Unfollow creator" : "Follow creator"}
      disabled={pending}
    >
      {pending ? (
        <ActivityIndicator size={10} color={isFollowing ? C.textMuted : "#fff"} />
      ) : (
        <Text style={[followStyles.pillText, isFollowing && { color: C.textMuted }]}>
          {isFollowing ? "Following" : "Follow"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

interface ArticleCardProps {
  article: ArticleCardItem;
  onPress: () => void;
  /** Called instead of onPress when the article is gated and the user has no access */
  onGatedPress?: () => void;
  /** True when the current user is the author — bypasses gating, shows "You" */
  isOwnContent?: boolean;
  /** Called when the trash button is tapped — parent opens the confirmation dialog */
  onDeleteRequest?: () => void;
  /** True when the current user has the delete_content moderation permission */
  canDeleteContent?: boolean;
}

export function ArticleCard({ article, onPress, onGatedPress, isOwnContent, onDeleteRequest, canDeleteContent }: ArticleCardProps) {
  const C = useColors();
  // Show "You" for own content, otherwise resolve author name normally
  const authorName = isOwnContent
    ? "You"
    : (article.author?.name ?? article.author?.username ?? "Unknown");
  const timeAgo = formatTimeAgo(article.createdAt);

  // Prefer the resolved URL returned by the feed query; fall back to raw storageId
  const imageUri = article.coverImageUrl || article.coverImage;

  // Extract plain-text body preview (first ~160 chars)
  const bodyPreview = article.contentHtml
    ? stripHtml(article.contentHtml).slice(0, 160)
    : null;

  // Own content always navigates directly — never open the paywall
  const handlePress = !isOwnContent && article.isGated && onGatedPress ? onGatedPress : onPress;

  // Show delete button for own content or users with delete_content permission
  const showDelete = (isOwnContent || canDeleteContent) && !!onDeleteRequest;

  function handleDeletePress() {
    onDeleteRequest?.();
  }

  return (
    <View style={styles.card}>
      {/* ── Tappable content area ─────────────────────────────────── */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Article: ${article.title}`}
      >
        {/* Cover image with Article badge overlay */}
        <View style={styles.coverWrap}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: C.bgElevated }]}>
              <Ionicons name="newspaper-outline" size={32} color={C.isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"} />
            </View>
          )}

          {/* Article type badge — mirrors the Pulse badge in ReelCardFeed */}
          <View style={[styles.articleBadge, { borderColor: C.actionPrimary }]}>
            <Ionicons name="newspaper-outline" size={13} color={C.actionPrimary} />
            <Text style={[styles.articleBadgeText, { color: C.actionPrimary }]}>Article</Text>
          </View>

          {/* Delete button — top-right, shown for author or admin */}
          {showDelete && (
            <TouchableOpacity
              onPress={handleDeletePress}
              style={styles.deleteButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Delete article"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.body, { backgroundColor: C.bgSurface }]}>
          {/* Gated badge — hidden for own content */}
          {article.isGated && !isOwnContent && (
            <View style={[styles.gatedBadge, { backgroundColor: C.amberSurface, borderColor: C.amberBorder }]}>
              <Ionicons name="lock-closed" size={10} color={C.statusWarning} />
              <Text style={[styles.gatedText, { color: C.statusWarning }]}>Premium</Text>
            </View>
          )}

          {/* Course indicator badge */}
          {article.courseInfo && (
            <View style={styles.courseBadge}>
              <Ionicons name="book-outline" size={11} color={C.statusInfo} />
              <Text style={[styles.courseBadgeText, { color: C.statusInfo }]} numberOfLines={1}>
                {article.courseInfo.courseTitle}
              </Text>
              <View style={styles.courseBadgeSep} />
              <Text style={[styles.courseLessonText, { color: C.statusInfo }]}>
                Lesson {article.courseInfo.order}
              </Text>
            </View>
          )}

          <Text style={[styles.title, { color: C.textPrimary }]} numberOfLines={2}>
            {article.title}
          </Text>

          {/* Body text preview ending with ellipsis */}
          {bodyPreview ? (
            <Text style={[styles.bodyPreview, { color: C.textSecondary }]} numberOfLines={3}>
              {bodyPreview}
              {bodyPreview.length >= 160 ? "..." : ""}
            </Text>
          ) : article.subtitle ? (
            <Text style={[styles.subtitle, { color: C.textMuted }]} numberOfLines={2}>
              {article.subtitle}...
            </Text>
          ) : null}

          {/* Premium price banner — hidden for own content */}
          {article.isGated && !isOwnContent && article.priceAmount != null && article.priceToken ? (
            <View style={styles.priceBanner}>
              <Ionicons name="lock-closed" size={14} color={C.actionPrimary} />
              <Text style={[styles.priceBannerLabel, { color: C.actionPrimary }]}>Premium Content</Text>
              <Text style={[styles.priceBannerAmount, { color: C.statusInfo }]}>
                {article.priceAmount} {article.priceToken}
              </Text>
            </View>
          ) : null}

          {/* Author + meta row */}
          <View style={styles.metaRow}>
            <View style={styles.authorAvatar}>
              {article.author?.avatar ? (
                <Image
                  source={{ uri: article.author.avatar }}
                  style={styles.avatarImg}
                />
              ) : (
                <Ionicons
                  name="person-circle-outline"
                  size={16}
                  color={C.textMuted}
                />
              )}
            </View>
            <Text style={[styles.authorName, { color: C.textSecondary }, isOwnContent && { color: C.actionPrimary, fontWeight: "700" }]} numberOfLines={1}>
              {authorName}
            </Text>
            <Text style={[styles.dot, { color: C.textMuted }]}>·</Text>
            <Text style={[styles.timestamp, { color: C.textMuted }]}>{timeAgo}</Text>
            {article.readTimeMin ? (
              <>
                <Text style={[styles.dot, { color: C.textMuted }]}>·</Text>
                <Text style={[styles.readTime, { color: C.textMuted }]}>{article.readTimeMin} min read</Text>
              </>
            ) : null}
            {/* Follow pill — only for other people's content */}
            {!isOwnContent && article.authorId && (
              <FollowPill authorId={article.authorId} />
            )}
          </View>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {article.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: C.bgElevated }]}>
                  <Text style={[styles.tagText, { color: C.textMuted }]}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Engagement row — outside touchable so taps don't navigate ── */}
      <ArticleEngagementRow
        articleId={article._id}
        title={article.title}
        authorUsername={article.author?.username}
        isGated={article.isGated ?? false}
      />
    </View>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    marginBottom: 0,
  },
  coverWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
  },
  cover: {
    width: "100%",
    height: "100%",
  },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  articleBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(10,10,21,0.82)",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderWidth: 1,
  },
  articleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  deleteButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(180,20,20,0.82)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,100,100,0.4)",
  },
  body: {
    padding: 14,
    gap: 6,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    zIndex: 1,
  },
  gatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    marginBottom: 2,
  },
  gatedText: {
    fontSize: 10,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  bodyPreview: {
    fontSize: 13,
    lineHeight: 19,
  },
  priceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(198,34,41,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(198,34,41,0.20)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: 2,
  },
  priceBannerLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  priceBannerAmount: {
    fontSize: 13,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "wrap",
    marginTop: 2,
  },
  authorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 18, height: 18, borderRadius: 9 },
  authorName: {
    fontSize: 12,
    fontWeight: "500",
    maxWidth: 100,
  },
  dot: { fontSize: 12 },
  timestamp: { fontSize: 11 },
  readTime: { fontSize: 11 },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  tag: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10 },
  courseBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(59,130,246,0.10)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.25)",
    marginBottom: 2,
    maxWidth: "100%",
  },
  courseBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    flexShrink: 1,
  },
  courseBadgeSep: {
    width: 1,
    height: 10,
    backgroundColor: "rgba(59,130,246,0.35)",
    marginHorizontal: 2,
  },
  courseLessonText: {
    fontSize: 10,
    fontWeight: "700",
  },
});

// ─── Follow pill styles ───────────────────────────────────────────────────────
const followStyles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginLeft: 4,
    minWidth: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  pillFollow: {
    // backgroundColor set inline via C.actionPrimary
  },
  pillFollowing: {
    backgroundColor: "transparent",
    borderWidth: 1,
    // borderColor set inline via C.borderSubtle
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
});
