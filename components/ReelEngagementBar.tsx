/**
 * ReelEngagementBar
 * Vertical right-side action column shown over every reel.
 * Like · Comment · Message · Bookmark · Share
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { ReelCommentsSheet } from "@/components/ReelCommentsSheet";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReelAuthor {
  id?: Id<"users">;
  name?: string;
  username?: string;
  avatar?: string;
}

interface ReelData {
  _id: Id<"reels">;
  caption?: string;
  isGated?: boolean;
  author: ReelAuthor;
}

interface ReelEngagementBarProps {
  reel: ReelData;
  hasAccess?: boolean | null;
  disabled?: boolean;
  /** Pre-resolved avatar URL — avoids a duplicate getFileUrl query */
  resolvedAvatarUrl?: string | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ReelEngagementBar({
  reel,
  hasAccess,
  disabled = false,
  resolvedAvatarUrl,
}: ReelEngagementBarProps) {
  const router = useRouter();
  const [shareLoading, setShareLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────
  const isLiked = useQuery(api.engagement.isLiked, {
    contentType: "reel",
    contentId: reel._id,
  });
  const isBookmarked = useQuery(api.engagement.isBookmarked, {
    contentType: "reel",
    contentId: reel._id,
  });
  const likeCount = useQuery(api.engagement.getReelLikeCount, {
    reelId: reel._id,
  });
  const avatarUrlFromQuery = useQuery(
    api.files.getFileUrl,
    !resolvedAvatarUrl && reel.author.avatar ? { storageId: reel.author.avatar } : "skip"
  );
  // Prefer the pre-resolved URL passed from parent; fall back to own query
  const avatarUrl = resolvedAvatarUrl ?? avatarUrlFromQuery;
  const isFollowing = useQuery(
    api.follows.isFollowing,
    reel.author.id ? { userId: reel.author.id } : "skip"
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const likeReel = useMutation(api.engagement.likeReel);
  const bookmarkReel = useMutation(api.engagement.bookmarkReel);
  const followUser = useMutation(api.follows.followUser);
  const startChat = useMutation(api.chat.startChatWithAuthor);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    if (disabled) return;
    if (reel.isGated && !hasAccess) {
      Alert.alert("Unlock required", "Unlock this reel to like it.");
      return;
    }
    try {
      await likeReel({ reelId: reel._id });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to like reel");
    }
  }, [disabled, reel, hasAccess, likeReel]);

  const handleBookmark = useCallback(async () => {
    if (disabled) return;
    try {
      await bookmarkReel({ reelId: reel._id });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to bookmark reel");
    }
  }, [disabled, reel, bookmarkReel]);

  const handleComment = useCallback(() => {
    if (disabled) return;
    if (reel.isGated && !hasAccess) {
      Alert.alert("Unlock required", "Unlock this reel to comment.");
      return;
    }
    setCommentsOpen(true);
  }, [disabled, reel, hasAccess]);

  const handleMessage = useCallback(async () => {
    if (disabled || !reel.author.id) return;
    try {
      const result = await startChat({
        authorId: reel.author.id,
        contentType: "reel",
        contentId: reel._id,
        initialMessage: "Hi! I saw your reel and wanted to chat.",
      });
      if ((result as any)?.conversationId) {
        router.push(`/(tabs)/notification`);
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to start chat");
    }
  }, [disabled, reel, startChat, router]);

  const handleFollow = useCallback(async () => {
    if (!reel.author.id) return;
    try {
      await followUser({ followingId: reel.author.id });
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to follow");
    }
  }, [reel.author.id, followUser]);

  const handleShare = useCallback(async () => {
    if (shareLoading) return;
    setShareLoading(true);
    try {
      await Share.share({
        message: `Check out this reel by @${reel.author.username ?? reel.author.name ?? "creator"} on Ambrosia`,
        title: reel.caption ?? "Ambrosia Reel",
      });
    } catch {
      // user cancelled — no-op
    } finally {
      setShareLoading(false);
    }
  }, [shareLoading, reel]);

  const isGatedNoAccess = reel.isGated && !hasAccess;

  return (
    <View style={styles.container}>
      {/* Author avatar + follow badge */}
      <View style={styles.avatarWrap}>
        <View style={styles.avatarRing}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatar}
              accessibilityLabel={`${reel.author.username ?? "Author"}'s avatar`}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={20} color={Colors.iconSecondary} />
            </View>
          )}
        </View>
        {/* Follow / Following badge */}
        {reel.author.id && (
          <TouchableOpacity
            style={[
              styles.followBadge,
              isFollowing && styles.followBadgeActive,
            ]}
            onPress={handleFollow}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
          >
            <Ionicons
              name={isFollowing ? "checkmark" : "add"}
              size={12}
              color="#fff"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Like */}
      <TouchableOpacity
        style={[styles.btn, (disabled || isGatedNoAccess) && styles.btnDisabled]}
        onPress={handleLike}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={isLiked ? "Unlike" : "Like"}
      >
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={28}
          color={isLiked ? "#FF3B5C" : "#fff"}
        />
        <Text style={styles.btnLabel} allowFontScaling={false}>
          {likeCount ?? 0}
        </Text>
      </TouchableOpacity>

      {/* Comment */}
      <TouchableOpacity
        style={[styles.btn, (disabled || isGatedNoAccess) && styles.btnDisabled]}
        onPress={handleComment}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Comments"
      >
        <Ionicons name="chatbubble-ellipses-outline" size={26} color="#fff" />
        <Text style={styles.btnLabel} allowFontScaling={false}>
          Comment
        </Text>
      </TouchableOpacity>

      {/* Message author */}
      <TouchableOpacity
        style={[styles.btn, disabled && styles.btnDisabled]}
        onPress={handleMessage}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Message author"
      >
        <Ionicons name="paper-plane-outline" size={26} color="#fff" />
        <Text style={styles.btnLabel} allowFontScaling={false}>
          Message
        </Text>
      </TouchableOpacity>

      {/* Bookmark */}
      <TouchableOpacity
        style={[styles.btn, disabled && styles.btnDisabled]}
        onPress={handleBookmark}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={isBookmarked ? "Remove bookmark" : "Bookmark"}
      >
        <Ionicons
          name={isBookmarked ? "bookmark" : "bookmark-outline"}
          size={26}
          color={isBookmarked ? Colors.actionPrimary : "#fff"}
        />
        <Text style={styles.btnLabel} allowFontScaling={false}>
          Save
        </Text>
      </TouchableOpacity>

      {/* Share */}
      <TouchableOpacity
        style={styles.btn}
        onPress={handleShare}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Share"
      >
        {shareLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="share-social-outline" size={26} color="#fff" />
        )}
        <Text style={styles.btnLabel} allowFontScaling={false}>
          Share
        </Text>
      </TouchableOpacity>

      {/* Comments bottom sheet */}
      <ReelCommentsSheet
        reelId={reel._id}
        visible={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 20,
    paddingBottom: 8,
  },

  // Avatar
  avatarWrap: {
    alignItems: "center",
    marginBottom: 4,
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  followBadge: {
    position: "absolute",
    bottom: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#000",
  },
  followBadgeActive: {
    backgroundColor: Colors.bgElevated,
  },

  // Buttons
  btn: {
    alignItems: "center",
    gap: 4,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnLabel: {
    ...typeScale.caption,
    color: "#fff",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
