/**
 * ReelCardFeed
 * Feed card for a reel item.
 * Thumbnail, caption, author, gated badge.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

export interface ReelCardItem {
  _id: string;
  caption?: string;
  poster?: string;
  tags?: string[];
  isGated?: boolean;
  durationS?: number;
  createdAt: number;
  author?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
}

interface ReelCardFeedProps {
  reel: ReelCardItem;
  onPress: () => void;
}

export function ReelCardFeed({ reel, onPress }: ReelCardFeedProps) {
  const authorName = reel.author?.name ?? reel.author?.username ?? "Unknown";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Pulse by ${authorName}`}
    >
      {/* Thumbnail */}
      <View style={styles.thumbnailWrap}>
        {reel.poster ? (
          <Image source={{ uri: reel.poster }} style={styles.thumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="videocam-outline" size={32} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        {/* Play overlay */}
        <View style={styles.playOverlay}>
          <Ionicons name="play-circle" size={36} color="rgba(255,255,255,0.85)" />
        </View>

        {/* Gated badge */}
        {reel.isGated && (
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

        {/* Pulse type indicator */}
        <View style={styles.reelBadge}>
          <Ionicons name="film-outline" size={10} color={Colors.palette.purple} />
          <Text style={styles.reelBadgeText}>Pulse</Text>
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {reel.caption ? (
          <Text style={styles.caption} numberOfLines={2}>
            {reel.caption}
          </Text>
        ) : (
          <Text style={styles.captionEmpty}>No caption</Text>
        )}

        {/* Author row */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            {reel.author?.avatar ? (
              <Image source={{ uri: reel.author.avatar }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person-circle-outline" size={16} color={Colors.textMuted} />
            )}
          </View>
          <Text style={styles.authorName} numberOfLines={1}>
            {authorName}
          </Text>
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
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    top: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.purpleSurface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  reelBadgeText: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.palette.purple,
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
});
