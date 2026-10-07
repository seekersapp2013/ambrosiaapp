import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

const STRENGTH_OPTIONS = [
  { id: "professionalism", label: "Professionalism" },
  { id: "communication", label: "Clear Communication" },
  { id: "punctuality", label: "Punctuality" },
  { id: "compassion", label: "Compassion & Empathy" },
  { id: "clarity", label: "Clarity of Advice" },
  { id: "followUp", label: "Thorough Follow-up" },
  { id: "respect", label: "Respect & Dignity" },
  { id: "confidentiality", label: "Confidentiality" },
];

interface ReviewFormProps {
  providerId: Id<"users">;
  bookingId: Id<"bookings">;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({ providerId, bookingId, onSuccess, onCancel }: ReviewFormProps) {
  const createRev = useMutation(api.providerReviews.createReview);

  const [rating, setRating] = useState(5);
  const [selectedStrengths, setSelectedStrengths] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleStrength = (id: string) => {
    if (selectedStrengths.includes(id)) {
      setSelectedStrengths(selectedStrengths.filter((s) => s !== id));
    } else {
      if (selectedStrengths.length >= 3) {
        Alert.alert("Limit Reached", "You can highlight up to 3 top strengths.");
        return;
      }
      setSelectedStrengths([...selectedStrengths, id]);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await createRev({
        providerId,
        bookingId,
        overallRating: rating,
        comment: comment.trim() || undefined,
        isAnonymous,
        highlightedStrengths: selectedStrengths as any,
      });

      Alert.alert("Thank You", "Your feedback has been submitted!");
      onSuccess?.();
    } catch (err: any) {
      Alert.alert("Submission Error", err.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate Your Consultation</Text>
      <Text style={styles.subtitle}>
        Your feedback helps improve healthcare quality and trust.
      </Text>

      {/* Star Rating */}
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity key={star} onPress={() => setRating(star)}>
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={36}
              color={star <= rating ? "#FFD700" : "#4B5563"}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Top Strengths (Pick up to 3) */}
      <Text style={styles.sectionLabel}>Highlight Top Strengths (Select up to 3)</Text>
      <View style={styles.pillsContainer}>
        {STRENGTH_OPTIONS.map((opt) => {
          const isSelected = selectedStrengths.includes(opt.id);
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => toggleStrength(opt.id)}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Comment */}
      <Text style={styles.sectionLabel}>Written Review (Optional)</Text>
      <TextInput
        style={styles.commentInput}
        multiline
        numberOfLines={4}
        placeholder="Share details about your experience..."
        placeholderTextColor="#6B7280"
        value={comment}
        onChangeText={setComment}
      />

      {/* Anonymous Toggle */}
      <View style={styles.anonymousRow}>
        <View>
          <Text style={styles.anonymousTitle}>Post Anonymously</Text>
          <Text style={styles.anonymousSub}>Hide your name on the public review</Text>
        </View>
        <Switch
          value={isAnonymous}
          onValueChange={setIsAnonymous}
          trackColor={{ false: "#374151", true: "#00BFA6" }}
          thumbColor="#FFFFFF"
        />
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitText}>Submit Feedback</Text>
          )}
        </TouchableOpacity>
      </View>
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
  },
  title: {
    ...typeScale.titleMedium,
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 2,
    marginBottom: spacing.md,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  pillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing.xs,
  },
  pill: {
    backgroundColor: "#0F101D",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#262945",
  },
  pillSelected: {
    backgroundColor: "#00BFA620",
    borderColor: "#00BFA6",
  },
  pillText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
  },
  pillTextSelected: {
    color: "#00BFA6",
    fontWeight: "600",
  },
  commentInput: {
    backgroundColor: "#0F101D",
    color: "#FFFFFF",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    textAlignVertical: "top",
    minHeight: 80,
    ...typeScale.bodyMedium,
  },
  anonymousRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#262945",
  },
  anonymousTitle: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
  },
  anonymousSub: {
    ...typeScale.bodySmall,
    color: "#6B7280",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#374151",
  },
  cancelText: {
    ...typeScale.labelMedium,
    color: "#9CA3AF",
  },
  submitBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  submitText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
