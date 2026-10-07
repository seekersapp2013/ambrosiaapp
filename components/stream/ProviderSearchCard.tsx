/**
 * ProviderSearchCard
 * Card for displaying a Healthcare Provider / Practitioner search result in stream.
 */

import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

export interface ProviderSearchItem {
  _id: string;
  userId: string;
  name: string;
  username?: string;
  jobTitle?: string;
  specialization?: string;
  aboutUser?: string;
  avatarUrl?: string;
  tier?: string;
  sessionPrice?: number;
}

interface ProviderSearchCardProps {
  provider: ProviderSearchItem;
  onPress: () => void;
}

export function ProviderSearchCard({ provider, onPress }: ProviderSearchCardProps) {
  const tierColor =
    provider.tier === "diamond"
      ? "#60A5FA"
      : provider.tier === "platinum"
        ? "#E5E7EB"
        : provider.tier === "gold"
          ? "#FBBF24"
          : provider.tier === "silver"
            ? "#9CA3AF"
            : Colors.primaryCoral;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Provider: ${provider.name}`}
    >
      <View style={styles.contentRow}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {provider.avatarUrl ? (
            <Image source={{ uri: provider.avatarUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="medical" size={20} color={Colors.primary} />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>
              {provider.name}
            </Text>
            {provider.tier && (
              <View style={[styles.tierBadge, { borderColor: tierColor }]}>
                <Ionicons name="ribbon-outline" size={10} color={tierColor} />
                <Text style={[styles.tierText, { color: tierColor }]}>
                  {provider.tier.toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {provider.jobTitle ? (
            <Text style={styles.jobTitle} numberOfLines={1}>
              {provider.jobTitle}
            </Text>
          ) : null}

          {provider.specialization ? (
            <View style={styles.specBadge}>
              <Ionicons name="fitness-outline" size={11} color={Colors.blue} />
              <Text style={styles.specText}>{provider.specialization}</Text>
            </View>
          ) : null}
        </View>

        {/* Action arrow */}
        <View style={styles.arrowCol}>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
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
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: "hidden",
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.redSurface,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  tierBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  tierText: {
    fontSize: 9,
    fontWeight: "700",
  },
  jobTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  specBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.blueSurface,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  specText: {
    fontSize: 11,
    color: Colors.blue,
    fontWeight: "500",
  },
  arrowCol: {
    justifyContent: "center",
  },
});
