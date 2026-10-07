import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface ScoreBreakdownProps {
  scores: {
    qualificationScore: number;
    experienceScore: number;
    verificationScore: number;
    referralPerformanceScore: number;
    patientExperienceScore: number;
    knowledgeContributionScore: number;
    communityImpactScore: number;
  };
}

const CATEGORIES = [
  { key: "qualificationScore", name: "Qualifications & Degrees", weight: "30%", maxPts: 30, icon: "school-outline" },
  { key: "experienceScore", name: "Years of Practice", weight: "20%", maxPts: 20, icon: "time-outline" },
  { key: "verificationScore", name: "Verification Documents", weight: "15%", maxPts: 15, icon: "shield-checkmark-outline" },
  { key: "referralPerformanceScore", name: "Referral Performance", weight: "10%", maxPts: 10, icon: "people-outline" },
  { key: "patientExperienceScore", name: "Patient Experience", weight: "10%", maxPts: 10, icon: "star-outline" },
  { key: "knowledgeContributionScore", name: "Knowledge & Content", weight: "10%", maxPts: 10, icon: "document-text-outline" },
  { key: "communityImpactScore", name: "Community & Badges", weight: "5%", maxPts: 5, icon: "ribbon-outline" },
];

export function ScoreBreakdown({ scores }: ScoreBreakdownProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Weighted Score Breakdown</Text>
      <Text style={styles.cardSub}>
        Each category is weighted to compute your overall 100-point PRS.
      </Text>

      {CATEGORIES.map((cat) => {
        const val = (scores as any)[cat.key] || 0;
        const weightedContrib = ((val / 100) * cat.maxPts).toFixed(1);

        return (
          <View key={cat.key} style={styles.row}>
            <View style={styles.rowTop}>
              <View style={styles.nameGroup}>
                <Ionicons name={cat.icon as any} size={16} color="#00BFA6" />
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.weightBadge}>{cat.weight}</Text>
              </View>
              <Text style={styles.scoreVal}>
                {val}/100 <Text style={styles.contribText}>({weightedContrib} pts)</Text>
              </Text>
            </View>

            <View style={styles.track}>
              <View style={[styles.fill, { width: `${val}%` }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  cardSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginBottom: spacing.md,
    marginTop: 2,
  },
  row: {
    marginBottom: spacing.sm,
  },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  nameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  catName: {
    ...typeScale.bodyMedium,
    color: "#FFFFFF",
  },
  weightBadge: {
    ...typeScale.labelSmall,
    color: "#6B7280",
    backgroundColor: "#0F101D",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  scoreVal: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  contribText: {
    color: "#00BFA6",
    fontWeight: "700",
  },
  track: {
    height: 6,
    backgroundColor: "#0F101D",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#00BFA6",
    borderRadius: 3,
  },
});
