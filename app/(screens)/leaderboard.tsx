import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { LeaderboardPodium } from "@/components/leaderboard/LeaderboardPodium";
import { LeaderboardCard } from "@/components/leaderboard/LeaderboardCard";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

export default function LeaderboardScreen() {
  const router = useRouter();

  const [timeframe, setTimeframe] = useState<"all_time" | "monthly">("all_time");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>(undefined);

  // Real-time reactive query for leaderboard (automatically updates when any provider earns EXP)
  const leaderboard = useQuery(api.providerExp.getPublicExpLeaderboard, {
    timeframe,
    specialization: selectedSpecialty,
    limit: 50,
  });

  const specializations = useQuery(api.bookingSubscribers.getSpecializations) || [];

  if (leaderboard === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
        <Text style={styles.loadingText}>Connecting to Live Leaderboard...</Text>
      </View>
    );
  }

  const topThree = leaderboard.filter((item) => item.rank <= 3);
  const rest = leaderboard.filter((item) => item.rank > 3);

  return (
    <View style={styles.screen}>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.titleGroup}>
          <Text style={styles.navTitle}>Provider Leaderboard</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>REAL-TIME LIVE</Text>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Timeframe Filter Tabs */}
      <View style={styles.timeframeBar}>
        <TouchableOpacity
          style={[styles.timeframeTab, timeframe === "all_time" && styles.timeframeTabActive]}
          onPress={() => setTimeframe("all_time")}
        >
          <Text style={[styles.timeframeText, timeframe === "all_time" && styles.timeframeTextActive]}>
            All-Time EXP
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.timeframeTab, timeframe === "monthly" && styles.timeframeTabActive]}
          onPress={() => setTimeframe("monthly")}
        >
          <Text style={[styles.timeframeText, timeframe === "monthly" && styles.timeframeTextActive]}>
            This Month's EXP
          </Text>
        </TouchableOpacity>
      </View>

      {/* Specialization Filter Pills */}
      <View style={styles.specialtyContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.specialtyScroll}>
          <TouchableOpacity
            style={[styles.specialtyChip, !selectedSpecialty && styles.specialtyChipActive]}
            onPress={() => setSelectedSpecialty(undefined)}
          >
            <Text style={[styles.specialtyText, !selectedSpecialty && styles.specialtyTextActive]}>
              All Specialties
            </Text>
          </TouchableOpacity>

          {specializations.map((spec) => (
            <TouchableOpacity
              key={spec}
              style={[styles.specialtyChip, selectedSpecialty === spec && styles.specialtyChipActive]}
              onPress={() => setSelectedSpecialty(spec)}
            >
              <Text style={[styles.specialtyText, selectedSpecialty === spec && styles.specialtyTextActive]}>
                {spec}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top 3 Podium */}
        {topThree.length > 0 && (
          <LeaderboardPodium
            items={topThree}
            onSelectProvider={(userId, username) => {
              if (username) {
                router.push(`/${username}` as any);
              }
            }}
          />
        )}

        {/* Remaining Ranks List */}
        {rest.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Top Ranked Practitioners</Text>
            {rest.map((item) => (
              <LeaderboardCard
                key={item.userId}
                rank={item.rank}
                name={item.name}
                username={item.username}
                avatar={item.avatar}
                jobTitle={item.jobTitle}
                specialization={item.specialization}
                tier={item.tier}
                displayExp={item.displayExp}
                onPress={() => {
                  if (item.username) {
                    router.push(`/${item.username}` as any);
                  }
                }}
              />
            ))}
          </View>
        )}

        {leaderboard.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>No Rankings Available</Text>
            <Text style={styles.emptySub}>
              Be the first provider to earn Experience Points by publishing articles or conducting sessions!
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A15",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A15",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: "#9CA3AF",
    marginTop: spacing.md,
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "#0F101D",
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
  },
  navBack: {
    padding: 4,
  },
  titleGroup: {
    alignItems: "center",
  },
  navTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  timeframeBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "#0F101D",
    gap: spacing.sm,
  },
  timeframeTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: "#16182B",
  },
  timeframeTabActive: {
    backgroundColor: "#00BFA6",
  },
  timeframeText: {
    ...typeScale.labelMedium,
    color: "#9CA3AF",
  },
  timeframeTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  specialtyContainer: {
    backgroundColor: "#0F101D",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
  },
  specialtyScroll: {
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  specialtyChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "#16182B",
  },
  specialtyChipActive: {
    backgroundColor: "#00BFA620",
    borderWidth: 1,
    borderColor: "#00BFA6",
  },
  specialtyText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
  },
  specialtyTextActive: {
    color: "#00BFA6",
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.md,
  },
  listSection: {
    marginTop: spacing.xs,
  },
  listTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    marginTop: spacing.sm,
  },
  emptySub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },
});
