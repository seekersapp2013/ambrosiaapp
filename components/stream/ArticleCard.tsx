/**
 * ArticleCard
 * Feed card for an article item.
 * Cover image (16:9), title, author row, read time, tags, gated badge,
 * + ArticleEngagementRow at the bottom (access-gated).
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
import { ArticleEngagementRow } from "./ArticleEngagementRow";

export interface ArticleCardItem {
  _id: string;
  title: string;
  subtitle?: string;
  coverImage?: string;
  readTimeMin?: number;
  tags?: string[];
  isGated?: boolean;
  createdAt: number;
  author?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
}

interface ArticleCardProps {
  article: ArticleCardItem;
  onPress: () => void;
  /** Called instead of onPress when the article is gated and the user has no access */
  onGatedPress?: () => void;
}

export function ArticleCard({ article, onPress, onGatedPress }: ArticleCardProps) {
  const authorName = article.author?.name ?? article.author?.username ?? "Unknown";
  const timeAgo = formatTimeAgo(article.createdAt);

  // If gated AND caller supplied onGatedPress, intercept the tap
  const handlePress = article.isGated && onGatedPress ? onGatedPress : onPress;

  return (
    <View style={styles.card}>
      {/* ── Tappable content area ─────────────────────────────────── */}
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Article: ${article.title}`}
      >
        {/* Cover image */}
        {article.coverImage ? (
          <Image
            source={{ uri: article.coverImage }}
            style={styles.cover}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="newspaper-outline" size={32} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        <View style={styles.body}>
          {/* Gated badge */}
          {article.isGated && (
            <View style={styles.gatedBadge}>
              <Ionicons name="lock-closed" size={10} color={Colors.statusWarning} />
              <Text style={styles.gatedText}>Premium</Text>
            </View>
          )}

          <Text style={styles.title} numberOfLines={2}>
            {article.title}
          </Text>

          {article.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {article.subtitle}
            </Text>
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
                  color={Colors.textMuted}
                />
              )}
            </View>
            <Text style={styles.authorName} numberOfLines={1}>
              {authorName}
            </Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.timestamp}>{timeAgo}</Text>
            {article.readTimeMin ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.readTime}>{article.readTimeMin} min read</Text>
              </>
            ) : null}
          </View>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {article.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
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
    // Visual container is now MobileCard — no border/bg/radius here
    overflow: "hidden",
    marginBottom: 0,
  },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  coverPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 14,
    gap: 6,
  },
  gatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: Colors.amberSurface,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    marginBottom: 2,
  },
  gatedText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.statusWarning,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
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
    color: Colors.textSecondary,
    maxWidth: 100,
  },
  dot: { fontSize: 12, color: Colors.textMuted },
  timestamp: { fontSize: 11, color: Colors.textMuted },
  readTime: { fontSize: 11, color: Colors.textMuted },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 2,
  },
  tag: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: { fontSize: 10, color: Colors.textMuted },
});
