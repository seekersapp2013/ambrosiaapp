import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TierBadge } from "@/components/tier/TierBadge";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface LeaderboardCardProps {
  rank: number;
  name: string;
  username?: string;
  avatar?: string;
  jobTitle: string;
  specialization: string;
  tier: string;
  displayExp: number;
  onPress?: () => void;
}

export function LeaderboardCard({
  rank,
  name,
  username,
  avatar,
  jobTitle,
  specialization,
  tier,
  displayExp,
  onPress,
}: LeaderboardCardProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (username) {
      router.push(`/${username}` as any);
    }
  };
  const getRankBadgeColor = () => {
    if (rank === 1) return "#FFD700";
    if (rank === 2) return "#B0BEC5";
    if (rank === 3) return "#CD7F32";
    return "#374151";
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <View style={[styles.rankBox, { backgroundColor: getRankBadgeColor() }]}>
        <Text style={styles.rankText}>#{rank}</Text>
      </View>

      <View style={styles.avatarWrap}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.initialText}>{(name || "P")[0].toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>
          <TierBadge tier={tier} size="small" />
        </View>
        <Text style={styles.titleText} numberOfLines={1}>
          {jobTitle} • {specialization}
        </Text>
      </View>

      <View style={styles.expBox}>
        <Ionicons name="sparkles" size={14} color="#00BFA6" />
        <Text style={styles.expText}>{displayExp.toLocaleString()} EXP</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#16182B",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  rankBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  rankText: {
    ...typeScale.labelSmall,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#262945",
    justifyContent: "center",
    alignItems: "center",
  },
  initialText: {
    ...typeScale.titleSmall,
    color: "#00BFA6",
    fontWeight: "700",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  name: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  titleText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  expBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA615",
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#00BFA630",
  },
  expText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "800",
  },
});
