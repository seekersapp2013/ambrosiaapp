/**
 * CircleCard
 *
 * 2-column card for browsing public circles.
 * Used in circle.tsx browse view grid.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

interface CircleCardProps {
  circle: {
    _id: string;
    name: string;
    description: string;
    type: string;
    accessType: string;
    price?: number;
    priceCurrency?: string;
    coverImage?: string;
    currentMembers: number;
    maxMembers?: number;
    tags?: string[];
    isMember?: boolean;
    creator?: {
      name?: string;
      username?: string;
    };
  };
  onPress: () => void;
  onJoin: () => void;
  isJoining?: boolean;
}

export function CircleCard({ circle, onPress, onJoin, isJoining }: CircleCardProps) {
  const isMember = circle.isMember;
  const isPaid = circle.accessType === "PAID";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Circle: ${circle.name}`}
    >
      {/* Cover image / gradient placeholder */}
      <View style={styles.cover}>
        {circle.coverImage ? (
          <Image source={{ uri: circle.coverImage }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverGradient}>
            <Ionicons name="people-circle-outline" size={32} color="rgba(255,255,255,0.5)" />
          </View>
        )}

        {/* Access badge — top right */}
        <View style={[styles.accessBadge, isPaid ? styles.paidBadge : styles.freeBadge]}>
          <Text style={[styles.accessBadgeText, isPaid ? styles.paidBadgeText : styles.freeBadgeText]}>
            {isPaid ? `${circle.priceCurrency ?? ""} ${circle.price ?? ""}`.trim() : "Free"}
          </Text>
        </View>

        {/* Category / type badge — top left */}
        <View style={styles.typeBadge}>
          <Ionicons
            name={circle.type === "PRIVATE" ? "lock-closed" : "globe-outline"}
            size={10}
            color="rgba(255,255,255,0.85)"
          />
        </View>
      </View>

      {/* Card body */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {circle.name}
        </Text>
        <Text style={styles.description} numberOfLines={2}>
          {circle.description}
        </Text>

        {/* Member count */}
        <View style={styles.memberRow}>
          <Ionicons name="people-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.memberCount}>
            {circle.currentMembers}
            {circle.maxMembers ? `/${circle.maxMembers}` : ""} members
          </Text>
        </View>

        {/* Tags */}
        {circle.tags && circle.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {circle.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Join / View button */}
        <TouchableOpacity
          style={[styles.joinBtn, isMember && styles.joinedBtn]}
          onPress={isMember ? onPress : onJoin}
          activeOpacity={0.75}
          disabled={isJoining}
          accessibilityRole="button"
          accessibilityLabel={isMember ? "View circle" : "Join circle"}
        >
          {isMember ? (
            <Ionicons name="checkmark-circle" size={13} color={Colors.statusSuccess} />
          ) : (
            <Ionicons name="add" size={13} color={Colors.textPrimary} />
          )}
          <Text style={[styles.joinBtnText, isMember && styles.joinedBtnText]}>
            {isMember ? "Joined" : isJoining ? "Joining…" : "Join"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
    marginBottom: 12,
  },

  // Cover
  cover: {
    height: 88,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverGradient: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.palette.primaryCrimson,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },

  // Badges
  accessBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 7,
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
  accessBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  freeBadgeText: { color: Colors.statusInfo },
  paidBadgeText: { color: Colors.statusWarning },
  typeBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Body
  body: {
    padding: 10,
    gap: 5,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  description: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  memberCount: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  tag: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 9,
    color: Colors.textMuted,
  },

  // Join button
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 4,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  joinedBtn: {
    backgroundColor: Colors.statusSuccessBg,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
  },
  joinBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  joinedBtnText: {
    color: Colors.statusSuccess,
  },
});
