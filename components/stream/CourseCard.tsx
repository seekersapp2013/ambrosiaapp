/**
 * CourseCard
 * Card for displaying a published course.
 * Cover image or gradient placeholder, title, author, content count, price/free badge.
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

export interface CourseCardItem {
  _id: string;
  title: string;
  description: string;
  coverImage?: string;
  category?: string;
  tags?: string[];
  totalPrice?: number;
  priceCurrency?: string;
  isPublished?: boolean;
  contentCount?: number;
  enrollmentCount?: number;
  author?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
}

interface CourseCardProps {
  course: CourseCardItem;
  onPress: () => void;
}

export function CourseCard({ course, onPress }: CourseCardProps) {
  const isFree = !course.totalPrice || course.totalPrice === 0;
  const authorName = course.author?.name ?? course.author?.username ?? "Unknown";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Course: ${course.title}`}
    >
      {/* Cover */}
      <View style={styles.coverWrap}>
        {course.coverImage ? (
          <Image source={{ uri: course.coverImage }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons name="school-outline" size={28} color="rgba(255,255,255,0.4)" />
          </View>
        )}

        {/* Price badge */}
        <View style={[styles.priceBadge, isFree ? styles.freeBadge : styles.paidBadge]}>
          <Text style={[styles.priceBadgeText, isFree ? styles.freeBadgeText : styles.paidBadgeText]}>
            {isFree
              ? "Free"
              : `${course.priceCurrency ?? ""} ${course.totalPrice}`.trim()}
          </Text>
        </View>

        {/* Course type icon */}
        <View style={styles.courseIconBadge}>
          <Ionicons name="school" size={10} color={Colors.palette.blue} />
        </View>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {course.title}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {course.description}
        </Text>

        {/* Author row */}
        <View style={styles.authorRow}>
          <View style={styles.authorAvatar}>
            {course.author?.avatar ? (
              <Image source={{ uri: course.author.avatar }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
            )}
          </View>
          <Text style={styles.authorName} numberOfLines={1}>
            {authorName}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          {course.contentCount != null && (
            <View style={styles.statItem}>
              <Ionicons name="layers-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.statText}>{course.contentCount} items</Text>
            </View>
          )}
          {course.enrollmentCount != null && (
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={11} color={Colors.textMuted} />
              <Text style={styles.statText}>{course.enrollmentCount} enrolled</Text>
            </View>
          )}
        </View>

        {/* Category */}
        {course.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{course.category}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
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
    backgroundColor: Colors.blueSurface,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.blueBorder,
  },
  priceBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  freeBadge: {
    backgroundColor: Colors.statusInfoBg,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },
  paidBadge: {
    backgroundColor: Colors.amberSurface,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
  },
  priceBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  freeBadgeText: { color: Colors.statusInfo },
  paidBadgeText: { color: Colors.statusWarning },
  courseIconBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.blueSurface,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 12,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  authorAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  authorName: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgElevated,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 2,
  },
  categoryText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});
