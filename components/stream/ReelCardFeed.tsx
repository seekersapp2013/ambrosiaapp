/**
 * ReelCardFeed
 * Feed card for a reel/pulse item.
 *
 * Video strategy (Instagram-style):
 *   - VideoView loads and autoplays MUTED in the feed — no audio, saves data intent.
 *   - Tapping navigates to the full Pulse viewer where audio plays.
 *   - Player is paused on unmount so no audio bleeds into the viewer.
 *
 * Engagement:
 *   - ReelEngagementRow sits below the body — same horizontal layout as ArticleCard.
 *
 * Phase 1: Follow/Unfollow pill added to the author row (hidden for own content).
 * Phase 2: Delete button (trash icon) shown for own content or admins.
 * Phase 3: Course indicator badge — shows "Course · Lesson N" when the
 *   reel belongs to a course, using courseInfo from the feed.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { VideoView, useVideoPlayer } from "expo-video";
import { ReelEngagementRow } from "./ReelEngagementRow";
import { AppLogo } from "@/components/AppLogo";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export interface ReelCardItem {
  _id: string;
  caption?: string;
  poster?: string;
  posterUrl?: string;
  videoUrl?: string;
  tags?: string[];
  isGated?: boolean;
  priceAmount?: number;
  priceToken?: string;
  durationS?: number;
  createdAt: number;
  /** The Convex user ID of the reel author — used for the follow button */
  authorId?: string;
  /** If this reel is part of a course, contains the course title and 1-based position */
  courseInfo?: { courseTitle: string; order: number };
  author?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
}

interface ReelCardFeedProps {
  reel: ReelCardItem;
  onPress: () => void;
  isOwnContent?: boolean;
  /** Called when the trash button is tapped — parent opens the confirmation dialog */
  onDeleteRequest?: () => void;
  /** True when the current user has the delete_content moderation permission */
  canDeleteContent?: boolean;
}

// ─── FollowPill ────────────────────────────────────────────────────────────────
interface FollowPillProps {
  authorId: string;
}

function FollowPill({ authorId }: FollowPillProps) {
  const isFollowing = useQuery(api.follows.isFollowing, {
    userId: authorId as Id<"users">,
  });
  const followUser = useMutation(api.follows.followUser);
  const [pending, setPending] = useState(false);

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
        <ActivityIndicator size={10} color={Colors.textMuted} />
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.75}
      style={[followStyles.pill, isFollowing ? followStyles.pillFollowing : followStyles.pillFollow]}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? "Unfollow creator" : "Follow creator"}
      disabled={pending}
    >
      {pending ? (
        <ActivityIndicator size={10} color={isFollowing ? Colors.textMuted : "#fff"} />
      ) : (
        <Text style={[followStyles.pillText, isFollowing && followStyles.pillTextFollowing]}>
          {isFollowing ? "Following" : "Follow"}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export function ReelCardFeed({ reel, onPress, isOwnContent, onDeleteRequest, canDeleteContent }: ReelCardFeedProps) {
  const authorName = isOwnContent
    ? "You"
    : (reel.author?.name ?? reel.author?.username ?? "Unknown");

  const thumbnailUri = reel.posterUrl || reel.poster;

  // Only use the video player when there is no cover image but there is a video.
  // Passing an empty string when unused avoids initialising a real player.
  const needsVideoPlayer = !thumbnailUri && !!reel.videoUrl;

  // Show delete button for own content or users with delete_content permission
  const showDelete = (isOwnContent || canDeleteContent) && !!onDeleteRequest;

  const player = useVideoPlayer(needsVideoPlayer ? reel.videoUrl! : "", (p) => {
    if (!needsVideoPlayer) return;
    p.muted = true;
    p.loop  = true;
    p.play();
  });

  useEffect(() => {
    if (!needsVideoPlayer) return;
    return () => {
      try { player?.pause(); } catch { /* ignore */ }
    };
  }, [player, needsVideoPlayer]);

  return (
    <View style={styles.card}>
      {/* ── Tappable video / thumbnail ─────────────────────────── */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`Pulse by ${authorName} — tap to watch`}
      >
        <View style={styles.thumbnailWrap}>
          {/* Cover image — shown whenever a poster/thumbnail URL is available */}
          {thumbnailUri && (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbnail} resizeMode="cover" />
          )}

          {/* Legacy fallback: no poster but has video — show muted video preview */}
          {!thumbnailUri && reel.videoUrl && (
            <VideoView
              player={player}
              style={styles.thumbnail}
              contentFit="cover"
              nativeControls={false}
              allowsFullscreen={false}
              allowsPictureInPicture={false}
              accessibilityLabel="Pulse preview"
            />
          )}

          {/* Placeholder: no cover image and no video (pending upload or old draft) */}
          {!thumbnailUri && !reel.videoUrl && (
            <View style={styles.thumbnailPlaceholder}>
              <Ionicons name="videocam-outline" size={32} color="rgba(255,255,255,0.3)" />
            </View>
          )}

          {/* Muted indicator — only shown for legacy video-only content */}
          {!thumbnailUri && reel.videoUrl && (
            <View style={styles.mutedBadge} pointerEvents="none">
              <Ionicons name="volume-mute" size={12} color="#fff" />
            </View>
          )}

          {/* Gated badge — hidden for own content */}
          {reel.isGated && !isOwnContent && (
            <View style={styles.gatedBadge}>
              <Ionicons name="lock-closed" size={10} color={Colors.statusWarning} />
              <Text style={styles.gatedText}>Premium</Text>
            </View>
          )}

          {/* Duration badge */}
          {reel.durationS != null && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(reel.durationS)}</Text>
            </View>
          )}

          {/* Pulse type badge — dark bg, red border, AppLogo apple */}
          <View style={styles.reelBadge}>
            <AppLogo size={16} />
            <Text style={styles.reelBadgeText}>Pulse</Text>
          </View>

          {/* Delete button — top-right, shown for author or admin */}
          {showDelete && (
            <TouchableOpacity
              onPress={() => onDeleteRequest?.()}
              style={styles.deleteButton}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Delete pulse"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Body ─────────────────────────────────────────────── */}
        <View style={styles.body}>
          {reel.caption ? (
            <Text style={styles.caption} numberOfLines={2}>
              {reel.caption}
              {reel.caption.length > 80 ? "..." : ""}
            </Text>
          ) : (
            <Text style={styles.captionEmpty}>No caption</Text>
          )}

          {/* Course indicator badge */}
          {reel.courseInfo && (
            <View style={styles.courseBadge}>
              <Ionicons name="book-outline" size={11} color={Colors.statusInfo} />
              <Text style={styles.courseBadgeText} numberOfLines={1}>
                {reel.courseInfo.courseTitle}
              </Text>
              <View style={styles.courseBadgeSep} />
              <Text style={styles.courseLessonText}>
                Lesson {reel.courseInfo.order}
              </Text>
            </View>
          )}

          {/* Premium price banner — hidden for own content */}
          {reel.isGated && !isOwnContent && reel.priceAmount != null && reel.priceToken ? (
            <View style={styles.priceBanner}>
              <Ionicons name="lock-closed" size={14} color={Colors.primary} />
              <Text style={styles.priceBannerLabel}>Premium Content</Text>
              <Text style={styles.priceBannerAmount}>
                {reel.priceAmount} {reel.priceToken}
              </Text>
            </View>
          ) : null}

          {/* Author row */}
          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              {reel.author?.avatar ? (
                <Image source={{ uri: reel.author.avatar }} style={styles.avatarImg} />
              ) : (
                <Ionicons name="person-circle-outline" size={16} color={Colors.textMuted} />
              )}
            </View>
            <Text style={[styles.authorName, isOwnContent && styles.authorNameSelf]} numberOfLines={1}>
              {authorName}
            </Text>
            {/* Follow pill — only for other people's content */}
            {!isOwnContent && reel.authorId && (
              <FollowPill authorId={reel.authorId} />
            )}
          </View>

          {/* Tags */}
          {reel.tags && reel.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {reel.tags.slice(0, 2).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* ── Engagement row — outside TouchableOpacity so taps don't navigate ── */}
      <ReelEngagementRow
        reelId={reel._id}
        caption={reel.caption}
        authorUsername={reel.author?.username}
        isGated={reel.isGated ?? false}
      />
    </View>
  );
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
    marginBottom: 12,
  },
  thumbnailWrap: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  mutedBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  gatedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.amberSurface,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
  },
  gatedText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.statusWarning,
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
  },
  reelBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.82)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(198,34,41,0.65)",
  },
  reelBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
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
    padding: 12,
    gap: 6,
  },
  caption: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textPrimary,
    lineHeight: 19,
  },
  captionEmpty: {
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: "italic",
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
    color: Colors.primary,
  },
  priceBannerAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.statusInfo,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  authorAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  authorName: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textSecondary,
  },
  authorNameSelf: {
    color: Colors.primary,
    fontWeight: "700",
  },
  tagsRow: {
    flexDirection: "row",
    gap: 5,
  },
  tag: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  // ── Course badge ──────────────────────────────────────────────────────────
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
    marginTop: 2,
    maxWidth: "100%",
  },
  courseBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.statusInfo,
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
    color: Colors.statusInfo,
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
    backgroundColor: Colors.primary,
  },
  pillFollowing: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  pillTextFollowing: {
    color: Colors.textMuted,
  },
});
