/**
 * ReelEngagementBar
 * Vertical right-side action column over every reel/pulse.
 *
 * Lock rule: reel.isGated && !hasAccess → entire column non-interactive.
 *
 * Cross-platform: pointerEvents in STYLE (not prop) for web support.
 * Buttons swap to plain Views when locked — zero click surface.
 * Share is always available.
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
  resolvedAvatarUrl?: string | null;
}

export function ReelEngagementBar({
  reel,
  hasAccess,
  disabled = false,
  resolvedAvatarUrl,
}: ReelEngagementBarProps) {
  const router = useRouter();
  const [shareLoading, setShareLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Lock = gated AND no access. disabled prop also locks everything.
  const locked = disabled || (reel.isGated === true && !hasAccess);

  // ── Queries ───────────────────────────────────────────────────────────────
  const isLiked = useQuery(api.engagement.isLiked, {
    contentType: "reel", contentId: reel._id,
  });
  const isBookmarked = useQuery(api.engagement.isBookmarked, {
    contentType: "reel", contentId: reel._id,
  });
  const likeCount = useQuery(api.engagement.getReelLikeCount, { reelId: reel._id });
  const avatarUrlFromQuery = useQuery(
    api.files.getFileUrl,
    !resolvedAvatarUrl && reel.author.avatar ? { storageId: reel.author.avatar } : "skip"
  );
  const avatarUrl  = resolvedAvatarUrl ?? avatarUrlFromQuery;
  const isFollowing = useQuery(
    api.follows.isFollowing,
    reel.author.id ? { userId: reel.author.id } : "skip"
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const likeReel     = useMutation(api.engagement.likeReel);
  const bookmarkReel = useMutation(api.engagement.bookmarkReel);
  const followUser   = useMutation(api.follows.followUser);
  const startChat    = useMutation(api.chat.startChatWithAuthor);

  // ── Handlers (only reachable when not locked) ─────────────────────────────
  const handleLike = useCallback(async () => {
    try { await likeReel({ reelId: reel._id }); }
    catch (e: any) { Alert.alert("Error", e.message ?? "Failed to like"); }
  }, [reel._id, likeReel]);

  const handleBookmark = useCallback(async () => {
    try { await bookmarkReel({ reelId: reel._id }); }
    catch (e: any) { Alert.alert("Error", e.message ?? "Failed to bookmark"); }
  }, [reel._id, bookmarkReel]);

  const handleFollow = useCallback(async () => {
    if (!reel.author.id) return;
    try { await followUser({ followingId: reel.author.id }); }
    catch (e: any) { Alert.alert("Error", e.message ?? "Failed to follow"); }
  }, [reel.author.id, followUser]);

  const handleMessage = useCallback(async () => {
    if (!reel.author.id) return;
    try {
      const result = await startChat({
        authorId: reel.author.id,
        contentType: "reel",
        contentId: reel._id,
        initialMessage: "Hi! I saw your pulse and wanted to chat.",
      });
      if ((result as any)?.conversationId) router.push("/(tabs)/notification");
    } catch (e: any) { Alert.alert("Error", e.message ?? "Failed to start chat"); }
  }, [reel, startChat, router]);

  const handleShare = useCallback(async () => {
    if (shareLoading) return;
    setShareLoading(true);
    try {
      await Share.share({
        message: `Check out this pulse by @${reel.author.username ?? reel.author.name ?? "creator"} on Ambrosia`,
        title: reel.caption ?? "Ambrosia Pulse",
      });
    } catch { /* user cancelled */ }
    finally { setShareLoading(false); }
  }, [shareLoading, reel]);

  // ── Btn helper ────────────────────────────────────────────────────────────
  // When locked: plain View (no tap surface). When unlocked: TouchableOpacity.
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

  return (
    <View style={styles.wrapper}>
      {/* Lock tooltip */}
      {locked && !disabled && (
        <View style={styles.lockTooltip}>
          <Ionicons name="lock-closed" size={10} color={Colors.statusWarning} />
          <Text style={styles.lockTooltipText} allowFontScaling={false}>
            Unlock to engage
          </Text>
        </View>
      )}

      {/* Column — style-level pointerEvents blocks clicks on web */}
      <View style={[styles.container, locked && styles.containerLocked]}>

        {/* Author avatar — follow badge always interactive */}
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
          {reel.author.id && !locked && (
            <TouchableOpacity
              style={[styles.followBadge, isFollowing && styles.followBadgeActive]}
              onPress={handleFollow}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isFollowing ? "Unfollow" : "Follow"}
            >
              <Ionicons name={isFollowing ? "checkmark" : "add"} size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* Like */}
        <Btn onPress={handleLike} label={isLiked ? "Unlike" : "Like"}>
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28}
            color={isLiked ? "#FF3B5C" : "#fff"} />
          <Text style={styles.btnLabel} allowFontScaling={false}>{likeCount ?? 0}</Text>
        </Btn>

        {/* Comment */}
        <Btn onPress={() => setCommentsOpen(true)} label="Comments">
          <Ionicons name="chatbubble-ellipses-outline" size={26} color="#fff" />
          <Text style={styles.btnLabel} allowFontScaling={false}>Comment</Text>
        </Btn>

        {/* Message */}
        <Btn onPress={handleMessage} label="Message author">
          <Ionicons name="paper-plane-outline" size={26} color="#fff" />
          <Text style={styles.btnLabel} allowFontScaling={false}>Message</Text>
        </Btn>

        {/* Bookmark */}
        <Btn onPress={handleBookmark} label={isBookmarked ? "Remove bookmark" : "Bookmark"}>
          <Ionicons
            name={isBookmarked ? "bookmark" : "bookmark-outline"}
            size={26}
            color={isBookmarked ? Colors.actionPrimary : "#fff"}
          />
          <Text style={styles.btnLabel} allowFontScaling={false}>Save</Text>
        </Btn>

        {/* Share — always available */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleShare}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          {shareLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="share-social-outline" size={26} color="#fff" />}
          <Text style={styles.btnLabel} allowFontScaling={false}>Share</Text>
        </TouchableOpacity>

      </View>

      {/* Comments sheet — only mounts when unlocked */}
      {!locked && (
        <ReelCommentsSheet
          reelId={reel._id}
          visible={commentsOpen}
          onClose={() => setCommentsOpen(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: 6 },

  lockTooltip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
  },
  lockTooltipText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.statusWarning,
  },

  container: {
    alignItems: "center",
    gap: 20,
    paddingBottom: 8,
  },
  containerLocked: {
    opacity: 0.35,
    pointerEvents: "none" as any,
  },

  avatarWrap: { alignItems: "center", marginBottom: 4 },
  avatarRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, borderColor: "#fff", overflow: "hidden",
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    backgroundColor: Colors.bgElevated,
    alignItems: "center", justifyContent: "center",
  },
  followBadge: {
    position: "absolute", bottom: -6,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#000",
  },
  followBadgeActive: { backgroundColor: Colors.bgElevated },

  btn: { alignItems: "center", gap: 4 },
  btnLabel: {
    ...typeScale.caption,
    color: "#fff",
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
