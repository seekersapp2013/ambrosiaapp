import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

const STRENGTH_LABELS: Record<string, string> = {
  professionalism: "Professionalism",
  communication: "Clear Communication",
  punctuality: "Punctuality",
  compassion: "Compassion & Empathy",
  clarity: "Clarity of Advice",
  followUp: "Thorough Follow-up",
  respect: "Respect & Dignity",
  confidentiality: "Confidentiality",
};

interface ReviewSummaryProps {
  summary: {
    totalReviews: number;
    averageRating: number;
    distribution: Record<number, number>;
    strengthFrequency: Record<string, number>;
  };
}

export function ReviewSummary({ summary }: ReviewSummaryProps) {
  const { totalReviews, averageRating, distribution, strengthFrequency } = summary;

  // Top 4 strengths sorted by frequency
  const sortedStrengths = Object.entries(strengthFrequency || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.mainScoreBox}>
        <Text style={styles.scoreNumber}>{averageRating.toFixed(1)}</Text>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.round(averageRating) ? "star" : "star-outline"}
              size={18}
              color={star <= Math.round(averageRating) ? "#FFD700" : "#4B5563"}
            />
          ))}
        </View>
        <Text style={styles.totalText}>Based on {totalReviews} patient reviews</Text>
      </View>

      <View style={styles.divider} />

      {/* Distribution Bars */}
      <View style={styles.distSection}>
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = distribution[rating] || 0;
          const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <View key={rating} style={styles.distRow}>
              <Text style={styles.ratingNum}>{rating} ★</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${percentage}%` }]} />
              </View>
              <Text style={styles.countText}>{count}</Text>
            </View>
          );
        })}
      </View>

      {/* Top Highlighted Strengths */}
      {sortedStrengths.length > 0 && (
        <View style={styles.strengthsSection}>
          <Text style={styles.strengthsTitle}>Top Patient-Rated Strengths</Text>
          <View style={styles.strengthsGrid}>
            {sortedStrengths.map(([key, count]) => (
              <View key={key} style={styles.strengthTag}>
                <Ionicons name="ribbon-outline" size={14} color="#00BFA6" />
                <Text style={styles.strengthTagText}>
                  {STRENGTH_LABELS[key] || key} ({count})
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  mainScoreBox: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  scoreNumber: {
    fontSize: 38,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  starRow: {
    flexDirection: "row",
    gap: 4,
    marginVertical: 4,
  },
  totalText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
  },
  divider: {
    height: 1,
    backgroundColor: "#262945",
    marginVertical: spacing.sm,
  },
  distSection: {
    gap: 4,
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  ratingNum: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
    width: 28,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#0F101D",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#FFD700",
    borderRadius: 3,
  },
  countText: {
    ...typeScale.labelSmall,
    color: "#6B7280",
    width: 24,
    textAlign: "right",
  },
  strengthsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#262945",
  },
  strengthsTitle: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
    marginBottom: spacing.xs,
  },
  strengthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  strengthTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA615",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  strengthTagText: {
    ...typeScale.bodySmall,
    color: "#00BFA6",
    fontWeight: "600",
  },
});
