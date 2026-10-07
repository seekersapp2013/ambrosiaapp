import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
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

interface ReviewCardProps {
  review: {
    _id: string;
    overallRating: number;
    comment?: string;
    isAnonymous: boolean;
    reviewerName?: string;
    reviewerAvatar?: string;
    highlightedStrengths?: string[];
    createdAt: number;
  };
}

export function ReviewCard({ review }: ReviewCardProps) {
  const formattedDate = new Date(review.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>
              {(review.reviewerName || "A")[0].toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.userName}>{review.reviewerName}</Text>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= review.overallRating ? "star" : "star-outline"}
              size={16}
              color={star <= review.overallRating ? "#FFD700" : "#4B5563"}
            />
          ))}
        </View>
      </View>

      {review.highlightedStrengths && review.highlightedStrengths.length > 0 && (
        <View style={styles.pillsRow}>
          {review.highlightedStrengths.map((s) => (
            <View key={s} style={styles.strengthPill}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#00BFA6" />
              <Text style={styles.strengthPillText}>
                {STRENGTH_LABELS[s] || s}
              </Text>
            </View>
          ))}
        </View>
      )}

      {review.comment ? (
        <Text style={styles.commentText}>{review.comment}</Text>
      ) : null}
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
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#262945",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    ...typeScale.labelMedium,
    color: "#00BFA6",
    fontWeight: "700",
  },
  userName: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
  },
  dateText: {
    ...typeScale.bodySmall,
    color: "#6B7280",
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  strengthPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA615",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  strengthPillText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "600",
  },
  commentText: {
    ...typeScale.bodyMedium,
    color: "#D1D5DB",
    marginTop: 4,
  },
});
