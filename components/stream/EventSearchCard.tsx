/**
 * EventSearchCard
 * Card for displaying an Event search result in stream.
 */

import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

export interface EventSearchItem {
  _id: string;
  title: string;
  description: string;
  category?: string;
  coverImageUrl?: string;
  startDate?: number;
  availableSpots?: number;
  author?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
}

interface EventSearchCardProps {
  event: EventSearchItem;
  onPress: () => void;
}

export function EventSearchCard({ event, onPress }: EventSearchCardProps) {
  const authorName = event.author?.name ?? event.author?.username ?? "Event Host";
  const dateStr = event.startDate
    ? new Date(event.startDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Event: ${event.title}`}
    >
      <View style={styles.headerRow}>
        <View style={styles.badge}>
          <Ionicons name="calendar" size={11} color={Colors.primary} />
          <Text style={styles.badgeText}>EVENT</Text>
        </View>
        {event.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{event.category}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {event.title}
      </Text>
      <Text style={styles.description} numberOfLines={2}>
        {event.description}
      </Text>

      <View style={styles.metaRow}>
        {dateStr && (
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.metaText}>{dateStr}</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>{authorName}</Text>
        </View>
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
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.redSurface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  categoryBadge: {
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
