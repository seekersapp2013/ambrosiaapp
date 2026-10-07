import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TierDashboardHeader } from "@/components/tier/TierDashboardHeader";
import { PRSProgressBar } from "@/components/tier/PRSProgressBar";
import { ScoreBreakdown } from "@/components/tier/ScoreBreakdown";
import { ImprovementSuggestions } from "@/components/tier/ImprovementSuggestions";
import { TierRequirements } from "@/components/tier/TierRequirements";
import { TierHistory } from "@/components/tier/TierHistory";
import { QualificationManager } from "@/components/tier/QualificationManager";
import { VerificationManager } from "@/components/tier/VerificationManager";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

export default function TierDashboardScreen() {
  const router = useRouter();
  const dashboard = useQuery(api.tierDashboard.getMyTierDashboard);
  const [activeTab, setActiveTab] = React.useState<"overview" | "credentials" | "verification">(
    "overview"
  );

  if (dashboard === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
        <Text style={styles.loadingText}>Loading Provider Recognition Dashboard...</Text>
      </View>
    );
  }

  if (!dashboard) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#F59E0B" />
        <Text style={styles.errorTitle}>Provider Subscription Required</Text>
        <Text style={styles.errorSub}>
          You must be an active registered provider to view recognition tiers.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Navigation Header */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Provider Tier Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sub-tab Filter Pills */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabChip, activeTab === "overview" && styles.tabChipActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === "credentials" && styles.tabChipActive]}
          onPress={() => setActiveTab("credentials")}
        >
          <Text style={[styles.tabText, activeTab === "credentials" && styles.tabTextActive]}>
            Degrees & Certs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabChip, activeTab === "verification" && styles.tabChipActive]}
          onPress={() => setActiveTab("verification")}
        >
          <Text style={[styles.tabText, activeTab === "verification" && styles.tabTextActive]}>
            Verification
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === "overview" && (
          <>
            <TierDashboardHeader
              currentTier={dashboard.currentTier}
              prsScore={dashboard.prsScore}
              lastCalculated={dashboard.lastCalculated}
            />

            {/* EXP & Revenue Share Summary Card */}
            <ExpAndRevenueShareCard
              prsScore={dashboard.prsScore}
              tier={dashboard.currentTier}
              onOpenLeaderboard={() => router.push("/(screens)/leaderboard" as any)}
            />

            <PRSProgressBar
              prsScore={dashboard.prsScore}
              nextTier={dashboard.progressToNextTier.nextTier}
              pointsNeeded={dashboard.progressToNextTier.pointsNeeded}
              progressPercentage={dashboard.progressToNextTier.progressPercentage}
            />

            <ScoreBreakdown scores={dashboard.componentScores} />

            <ImprovementSuggestions
              suggestions={dashboard.improvementSuggestions}
              onActionPress={(link) => {
                if (link === "qualifications") setActiveTab("credentials");
                else if (link === "verification") setActiveTab("verification");
              }}
            />

            <TierRequirements
              nextTier={dashboard.progressToNextTier.nextTier}
              prsScore={dashboard.prsScore}
              verificationScore={dashboard.componentScores.verificationScore}
              qualificationScore={dashboard.componentScores.qualificationScore}
            />

            <TierHistory logs={dashboard.tierHistory} />
          </>
        )}

        {activeTab === "credentials" && <QualificationManager />}

        {activeTab === "verification" && <VerificationManager />}
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
  errorTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    marginTop: spacing.sm,
  },
  errorSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    marginBottom: spacing.md,
  },
  backBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  backBtnText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
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
  navTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: "#0F101D",
    gap: spacing.xs,
  },
  tabChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "#16182B",
  },
  tabChipActive: {
    backgroundColor: "#00BFA6",
  },
  tabText: {
    ...typeScale.labelMedium,
    color: "#9CA3AF",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.md,
  },
  expCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  expHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  expTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  expTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  leaderboardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA615",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#00BFA630",
  },
  leaderboardBtnText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
  },
  revShareBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#10B98115",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#10B98130",
  },
  revShareTitle: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
  },
  revShareSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
});

function ExpAndRevenueShareCard({
  prsScore,
  tier,
  onOpenLeaderboard,
}: {
  prsScore: number;
  tier: string;
  onOpenLeaderboard: () => void;
}) {
  const revShare = useQuery(api.revenueShare.getMyRevenueShare);

  const effectiveRatio = revShare?.effectiveRevenueShareRatio ?? 80;
  const isOverride = revShare?.isCustomOverride ?? false;

  return (
    <View style={styles.expCard}>
      <View style={styles.expHeaderRow}>
        <View style={styles.expTitleGroup}>
          <Ionicons name="sparkles" size={20} color="#00BFA6" />
          <Text style={styles.expTitle}>Experience & Earnings</Text>
        </View>

        <TouchableOpacity style={styles.leaderboardBtn} onPress={onOpenLeaderboard}>
          <Ionicons name="trophy-outline" size={14} color="#00BFA6" />
          <Text style={styles.leaderboardBtnText}>Live Leaderboard</Text>
        </TouchableOpacity>
      </View>

      {/* Revenue Share Banner */}
      <View style={styles.revShareBanner}>
        <Ionicons name="cash-outline" size={20} color="#10B981" />
        <View style={{ flex: 1 }}>
          <Text style={styles.revShareTitle}>
            Your Payout Share: <Text style={{ color: "#10B981", fontWeight: "800" }}>{effectiveRatio}%</Text>
          </Text>
          <Text style={styles.revShareSub}>
            {isOverride
              ? "Custom provider payout rate set by admin"
              : `Standard payout share for ${tier.toUpperCase()} Tier`}
          </Text>
        </View>
      </View>
    </View>
  );
}
