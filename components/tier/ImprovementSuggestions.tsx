import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface Suggestion {
  id: string;
  area: string;
  title: string;
  description: string;
  potentialGain: number;
  actionLink: string;
}

interface ImprovementSuggestionsProps {
  suggestions: Suggestion[];
  onActionPress?: (actionLink: string) => void;
}

export function ImprovementSuggestions({
  suggestions,
  onActionPress,
}: ImprovementSuggestionsProps) {
  if (!suggestions || suggestions.length === 0) {
    return (
      <View style={styles.card}>
        <Ionicons name="sparkles" size={24} color="#FFD700" />
        <Text style={styles.emptyTitle}>Excellent Performance!</Text>
        <Text style={styles.emptySub}>
          You are maximizing score contributions across all categories.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Smart Improvement Suggestions</Text>

      {suggestions.map((sug) => (
        <View key={sug.id} style={styles.sugCard}>
          <View style={styles.topRow}>
            <View style={styles.areaBadge}>
              <Text style={styles.areaText}>{sug.area}</Text>
            </View>
            <Text style={styles.gainText}>+{sug.potentialGain} pts potential</Text>
          </View>

          <Text style={styles.sugTitle}>{sug.title}</Text>
          <Text style={styles.sugDesc}>{sug.description}</Text>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onActionPress?.(sug.actionLink)}
          >
            <Text style={styles.actionBtnText}>Take Action</Text>
            <Ionicons name="arrow-forward" size={14} color="#00BFA6" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  sugCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  areaBadge: {
    backgroundColor: "#0F101D",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  areaText: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
  },
  gainText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
  },
  sugTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  sugDesc: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  actionBtnText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    marginTop: 4,
  },
  emptySub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 2,
  },
});
