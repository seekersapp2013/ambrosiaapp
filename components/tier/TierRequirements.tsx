import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface TierRequirementsProps {
  nextTier?: string | null;
  prsScore: number;
  verificationScore: number;
  qualificationScore: number;
}

export function TierRequirements({
  nextTier,
  prsScore,
  verificationScore,
  qualificationScore,
}: TierRequirementsProps) {
  if (!nextTier) {
    return (
      <View style={styles.card}>
        <Ionicons name="trophy-outline" size={24} color="#FFD700" />
        <Text style={styles.title}>Diamond Level Achieved</Text>
        <Text style={styles.sub}>
          You have achieved the highest professional recognition level on Ambrosia.
        </Text>
      </View>
    );
  }

  const thresholdMap: Record<string, number> = {
    silver: 30,
    gold: 55,
    platinum: 75,
    diamond: 90,
  };

  const targetScore = thresholdMap[nextTier] || 100;
  const isPrsMet = prsScore >= targetScore;
  const isVerifMet = verificationScore > 0;
  const isQualMet = qualificationScore > 0;

  const reqs = [
    {
      title: `Achieve ${targetScore} PRS Overall Score`,
      sub: `Current: ${prsScore} / ${targetScore} PRS`,
      isMet: isPrsMet,
    },
    {
      title: "Verified Professional Licence",
      sub: isVerifMet ? "Professional licence submitted and approved" : "Licence pending approval",
      isMet: isVerifMet,
    },
    {
      title: "Complete Basic Profile & Credentials",
      sub: isQualMet ? "Medical degrees registered" : "Add your medical qualifications",
      isMet: isQualMet,
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Requirements for {nextTier.toUpperCase()}</Text>

      {reqs.map((req, idx) => (
        <View key={idx} style={styles.reqRow}>
          <Ionicons
            name={req.isMet ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={req.isMet ? "#10B981" : "#6B7280"}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.reqTitle, req.isMet && styles.reqTitleMet]}>
              {req.title}
            </Text>
            <Text style={styles.reqSub}>{req.sub}</Text>
          </View>
        </View>
      ))}
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
  title: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  sub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  reqRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  reqTitle: {
    ...typeScale.bodyMedium,
    color: "#9CA3AF",
  },
  reqTitleMet: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  reqSub: {
    ...typeScale.bodySmall,
    color: "#6B7280",
  },
});
