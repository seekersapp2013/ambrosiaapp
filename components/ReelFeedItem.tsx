/**
 * ReelFeedItem
 * Full-screen single reel cell — video, overlays, author info.
 * The engagement bar is intentionally NOT rendered here.
 * It is lifted to the parent (reels.tsx) so it sits outside MobileCard's
 * overflow:hidden boundary and is never clipped.
 */

import React, { useRef, useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Image,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ReelItem {
  _id: Id<"reels">;
  video: string;
  poster?: string;
  caption?: string;
  tags: string[];
  isSensitive: boolean;
  isGated: boolean;
  priceToken?: string;
  priceAmount?: number;
  views: number;
  createdAt: number;
  author: {
    id?: Id<"users">;
    name?: string;
    username?: string;
    avatar?: string;
  };
}

interface ReelFeedItemProps {
  reel: ReelItem;
  isActive: boolean;
  tabBarHeight: number;
  cellHeight: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ReelFeedItem({
  reel,
  isActive,
  tabBarHeight,
  cellHeight,
}: ReelFeedItemProps) {
  const router = useRouter();
  const [showSensitive, setShowSensitive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const lastTapRef = useRef<number>(0);

  // ── Data ──────────────────────────────────────────────────────────────────
  const videoUrl = useQuery(api.files.getFileUrl, { storageId: reel.video });
  const posterUrl = useQuery(
    api.files.getFileUrl,
    reel.poster ? { storageId: reel.poster } : "skip"
  );
  const hasAccess = useQuery(api.payments.hasAccess, {
    contentType: "reel",
    contentId: reel._id,
  });
  const myProfile = useQuery(api.profiles.getMyProfile);
  const deleteReel = useMutation(api.reels.deleteReel);

  const isOwnReel = (myProfile as any)?.userId === reel.author.id;
  const canPlay = !reel.isGated || hasAccess;
  const showSensitiveGate = reel.isSensitive && !showSensitive;

  // ── Video player ──────────────────────────────────────────────────────────
  const player = useVideoPlayer(
    videoUrl && canPlay && !showSensitiveGate ? videoUrl : null,
    (p) => {
      p.loop = true;
      p.muted = false;
    }
  );

  useEffect(() => {
    if (!player) return;
    if (isActive && videoUrl && canPlay && !showSensitiveGate) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [isActive, videoUrl, canPlay, showSensitiveGate, player]);

  useEffect(() => {
    if (player) player.muted = isMuted;
  }, [isMuted, player]);

  // ── Double-tap to play/pause ──────────────────────────────────────────────
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (player) {
        if (player.playing) {
          player.pause();
          setIsPlaying(false);
        } else {
          player.play();
          setIsPlaying(true);
        }
      }
    }
    lastTapRef.current = now;
  }, [player]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    Alert.alert("Delete Reel", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteReel({ reelId: reel._id });
          } catch (e: any) {
            Alert.alert("Error", e.message ?? "Failed to delete reel");
          }
        },
      },
    ]);
  }, [reel._id, deleteReel]);

  const handleUnlock = useCallback(() => {
    router.push(`/(tabs)/reel-viewer?reelId=${reel._id}`);
  }, [reel._id, router]);

  const handleExpand = useCallback(() => {
    router.push(`/(tabs)/reel-viewer?reelId=${reel._id}`);
  }, [reel._id, router]);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d}d`;
    if (h > 0) return `${h}h`;
    return "now";
  };

  const infoBottom = tabBarHeight + 20;

  return (
    <View style={[styles.container, { height: cellHeight }]}>
      {showSensitiveGate ? (
        <View style={styles.sensitiveGate}>
          <Ionicons name="warning-outline" size={48} color={Colors.statusWarning} />
          <Text style={styles.sensitiveTitle}>Sensitive Content</Text>
          <Text style={styles.sensitiveBody}>
            This reel contains content that some may find sensitive.
          </Text>
          <TouchableOpacity
            style={styles.sensitiveBtn}
            onPress={() => setShowSensitive(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.sensitiveBtnText}>View Content</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Video tap layer */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={handleTap}
            activeOpacity={1}
            accessibilityLabel="Double-tap to play or pause"
          >
            {videoUrl && canPlay ? (
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                nativeControls={false}
                accessibilityLabel="Reel video"
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.posterBg]}>
                {posterUrl ? (
                  <Image
                    source={{ uri: posterUrl }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    accessible={false}
                  />
                ) : (
                  <View style={styles.posterPlaceholder}>
                    <Ionicons
                      name="play-circle-outline"
                      size={64}
                      color="rgba(255,255,255,0.3)"
                    />
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Play indicator */}
          {!isPlaying && videoUrl && canPlay && (
            <View style={styles.playIndicator} pointerEvents="none">
              <View style={styles.playCircle}>
                <Ionicons name="play" size={28} color="#fff" />
              </View>
            </View>
          )}

          {/* Gated overlay */}
          {reel.isGated && !hasAccess && (
            <View style={styles.gatedOverlay}>
              <View style={styles.gatedCard}>
                <Ionicons name="lock-closed" size={32} color={Colors.actionPrimary} />
                <Text style={styles.gatedTitle}>Premium Reel</Text>
                {reel.priceAmount != null && (
                  <Text style={styles.gatedPrice}>
                    {reel.priceToken} {reel.priceAmount}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.unlockBtn}
                  onPress={handleUnlock}
                  activeOpacity={0.85}
                >
                  <Text style={styles.unlockBtnText}>Unlock to Watch</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Bottom scrim */}
          <View style={styles.bottomScrim} pointerEvents="none" />

          {/* Top-right controls */}
          <View style={styles.topRight}>
            {isOwnReel && (
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Delete reel"
              >
                <Ionicons name="trash-outline" size={18} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => setIsMuted((m) => !m)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={isMuted ? "Unmute" : "Mute"}
            >
              <Ionicons
                name={isMuted ? "volume-mute-outline" : "volume-high-outline"}
                size={18}
                color="#fff"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={handleExpand}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Full screen"
            >
              <Ionicons name="expand-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Author info + caption — right edge stops before engagement bar */}
          <View style={[styles.bottomInfo, { bottom: infoBottom }]}>
            <Text style={styles.authorName} allowFontScaling={false}>
              @{reel.author.username ?? reel.author.name ?? "unknown"}
            </Text>
            <Text style={styles.timeAgo} allowFontScaling={false}>
              {formatTime(reel.createdAt)}
            </Text>
            {reel.caption ? (
              <Text style={styles.caption} numberOfLines={2} allowFontScaling={false}>
                {reel.caption}
              </Text>
            ) : null}
            {reel.tags.length > 0 && (
              <View style={styles.tagsRow}>
                {reel.tags.slice(0, 3).map((tag, i) => (
                  <Text key={i} style={styles.tag} allowFontScaling={false}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    backgroundColor: "#000",
  },

  sensitiveGate: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.space8,
    gap: spacing.space3,
  },
  sensitiveTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  sensitiveBody: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },
  sensitiveBtn: {
    marginTop: spacing.space4,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    paddingHorizontal: spacing.space6,
    paddingVertical: spacing.space3,
  },
  sensitiveBtnText: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
  },

  posterBg: { backgroundColor: "#111" },
  posterPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  playIndicator: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  gatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  gatedCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    padding: spacing.space6,
    alignItems: "center",
    gap: spacing.space3,
    width: 240,
  },
  gatedTitle: { ...typeScale.headingSM, color: Colors.textPrimary },
  gatedPrice: { ...typeScale.bodyMD, color: Colors.textMuted },
  unlockBtn: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: 12,
    paddingHorizontal: spacing.space5,
    paddingVertical: spacing.space3,
    marginTop: spacing.space2,
  },
  unlockBtnText: { ...typeScale.labelMD, color: "#fff" },

  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  topRight: {
    position: "absolute",
    top: 56,
    right: spacing.space4,
    gap: spacing.space2,
    alignItems: "center",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Right edge stops at 76 — engagement bar (rendered outside card) sits there
  bottomInfo: {
    position: "absolute",
    left: spacing.space4,
    right: 76,
    gap: 4,
  },
  authorName: {
    ...typeScale.headingSM,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  timeAgo: { ...typeScale.caption, color: "rgba(255,255,255,0.7)" },
  caption: {
    ...typeScale.bodyMD,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  tag: { ...typeScale.caption, color: "rgba(255,255,255,0.75)" },
});
