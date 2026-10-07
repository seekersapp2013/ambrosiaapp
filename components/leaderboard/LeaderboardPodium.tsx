import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TierBadge } from "@/components/tier/TierBadge";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface PodiumItem {
  rank: number;
  userId: string;
  name: string;
  username?: string;
  avatar?: string;
  jobTitle: string;
  tier: string;
  displayExp: number;
}

interface LeaderboardPodiumProps {
  items: PodiumItem[];
  onSelectProvider?: (userId: string, username?: string) => void;
}

export function LeaderboardPodium({ items, onSelectProvider }: LeaderboardPodiumProps) {
  const router = useRouter();
  if (!items || items.length === 0) return null;

  const first = items.find((i) => i.rank === 1);
  const second = items.find((i) => i.rank === 2);
  const third = items.find((i) => i.rank === 3);

  const renderPodiumSpot = (item?: PodiumItem, place: 1 | 2 | 3 = 1) => {
    if (!item) return <View style={styles.emptySpot} />;

    const colors = {
      1: { border: "#FFD700", bg: "#FFD70015", crownColor: "#FFD700" },
      2: { border: "#B0BEC5", bg: "#B0BEC515", crownColor: "#B0BEC5" },
      3: { border: "#CD7F32", bg: "#CD7F3215", crownColor: "#CD7F32" },
    }[place];

    const isFirst = place === 1;

    return (
      <TouchableOpacity
        style={[styles.podiumItem, isFirst && styles.podiumItemFirst]}
        onPress={() => {
          if (onSelectProvider) {
            onSelectProvider(item.userId, item.username);
          } else if (item.username) {
            router.push(`/${item.username}` as any);
          }
        }}
        activeOpacity={0.8}
      >
        <View style={styles.crownRow}>
          <Ionicons
            name={isFirst ? "trophy" : "ribbon"}
            size={isFirst ? 26 : 20}
            color={colors.crownColor}
          />
        </View>

        <View style={[styles.avatarBorder, { borderColor: colors.border }]}>
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initialText}>{(item.name || "P")[0].toUpperCase()}</Text>
            </View>
          )}
          <View style={[styles.rankBadge, { backgroundColor: colors.border }]}>
            <Text style={styles.rankNum}>#{place}</Text>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <TierBadge tier={item.tier} size="small" />

        <View style={styles.expPill}>
          <Text style={styles.expText}>{item.displayExp.toLocaleString()} EXP</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.podiumContainer}>
      <View style={styles.podiumRow}>
        {/* 2nd Place */}
        {renderPodiumSpot(second, 2)}
        {/* 1st Place */}
        {renderPodiumSpot(first, 1)}
        {/* 3rd Place */}
        {renderPodiumSpot(third, 3)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  podiumContainer: {
    backgroundColor: "#16182B",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  podiumItem: {
    alignItems: "center",
    flex: 1,
  },
  podiumItemFirst: {
    marginBottom: spacing.xs,
  },
  emptySpot: {
    flex: 1,
  },
  crownRow: {
    marginBottom: 4,
  },
  avatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    padding: 2,
    position: "relative",
    marginBottom: spacing.xs,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
    backgroundColor: "#262945",
    justifyContent: "center",
    alignItems: "center",
  },
  initialText: {
    ...typeScale.titleMedium,
    color: "#00BFA6",
    fontWeight: "700",
  },
  rankBadge: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
  },
  rankNum: {
    ...typeScale.labelSmall,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  name: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  expPill: {
    backgroundColor: "#00BFA615",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginTop: 4,
  },
  expText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "800",
  },
});
