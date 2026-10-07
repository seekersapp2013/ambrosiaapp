import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

const CATEGORIES = [
  { label: "Basic Professional Degree (e.g. MBBS, BDS, B.Pharm)", value: "basic_degree" },
  { label: "Additional Certification (e.g. ACLS, BLS, ATLS)", value: "additional_certification" },
  { label: "Professional Fellowship (e.g. FWACS, FMCP)", value: "fellowship" },
  { label: "Residency Training", value: "residency" },
  { label: "Consultant Status", value: "consultant_status" },
  { label: "Master's Degree (e.g. MSc, MPH)", value: "masters" },
  { label: "PhD / Doctorate", value: "doctorate" },
];

export function QualificationManager() {
  const qualifications = useQuery(api.qualifications.getMyQualifications) || [];
  const addQual = useMutation(api.qualifications.addQualification);
  const removeQual = useMutation(api.qualifications.removeQualification);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("basic_degree");
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [yearObtained, setYearObtained] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) {
      Alert.alert("Required", "Please enter the title of your qualification.");
      return;
    }

    try {
      setLoading(true);
      await addQual({
        category: selectedCategory as any,
        name: name.trim(),
        institution: institution.trim() || undefined,
        yearObtained: yearObtained ? parseInt(yearObtained, 10) : undefined,
      });

      setName("");
      setInstitution("");
      setYearObtained("");
      setIsAdding(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add qualification");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = (id: any, nameStr: string) => {
    Alert.alert("Delete Qualification", `Remove "${nameStr}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeQual({ qualificationId: id });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Qualifications & Degrees</Text>
          <Text style={styles.subtitle}>
            Verified credentials contribute up to 30% of your recognition score.
          </Text>
        </View>
        {!isAdding && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setIsAdding(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {isAdding && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Add New Qualification</Text>

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryPickerContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat.value && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat.value && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Title / Degree Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. MBBS, FWACS, BLS Certificate"
            placeholderTextColor="#6B7280"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Institution (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. University of Lagos, West African College of Surgeons"
            placeholderTextColor="#6B7280"
            value={institution}
            onChangeText={setInstitution}
          />

          <Text style={styles.label}>Year Obtained (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2018"
            placeholderTextColor="#6B7280"
            keyboardType="number-pad"
            value={yearObtained}
            onChangeText={setYearObtained}
          />

          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsAdding(false)}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAdd}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveText}>Save Credential</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {qualifications.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="school-outline" size={36} color="#6B7280" />
          <Text style={styles.emptyText}>No qualifications added yet.</Text>
          <Text style={styles.emptySubtext}>
            Tap "Add" above to register your medical degrees and certifications.
          </Text>
        </View>
      ) : (
        qualifications.map((item) => (
          <View key={item._id} style={styles.qualCard}>
            <View style={styles.qualMain}>
              <View style={styles.qualHeaderRow}>
                <Text style={styles.qualName}>{item.name}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.isVerified ? styles.verifiedBadge : styles.pendingBadge,
                  ]}
                >
                  <Ionicons
                    name={item.isVerified ? "checkmark-circle" : "time-outline"}
                    size={14}
                    color={item.isVerified ? "#10B981" : "#F59E0B"}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: item.isVerified ? "#10B981" : "#F59E0B" },
                    ]}
                  >
                    {item.isVerified ? "Verified" : "Pending Verification"}
                  </Text>
                </View>
              </View>

              {item.institution ? (
                <Text style={styles.qualInstitution}>{item.institution}</Text>
              ) : null}

              <View style={styles.qualFooter}>
                {item.yearObtained ? (
                  <Text style={styles.qualMeta}>Obtained: {item.yearObtained}</Text>
                ) : null}
                <Text style={styles.pointsBadge}>+{item.points} pts</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleRemove(item._id, item.name)}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  title: {
    ...typeScale.titleMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  subtitle: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
    maxWidth: 260,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    gap: 4,
  },
  addButtonText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  formTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  label: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#0F101D",
    color: "#FFFFFF",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    ...typeScale.bodyMedium,
  },
  categoryPickerContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: spacing.xs,
  },
  categoryChip: {
    backgroundColor: "#0F101D",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
  },
  categoryChipSelected: {
    backgroundColor: "#00BFA620",
    borderColor: "#00BFA6",
  },
  categoryChipText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
  },
  categoryChipTextSelected: {
    color: "#00BFA6",
    fontWeight: "600",
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
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
  saveButton: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  saveText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  qualCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qualMain: {
    flex: 1,
  },
  qualHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  qualName: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  qualInstitution: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  qualFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 6,
  },
  qualMeta: {
    ...typeScale.labelSmall,
    color: "#6B7280",
  },
  pointsBadge: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
    backgroundColor: "#00BFA615",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  verifiedBadge: {
    backgroundColor: "#10B98115",
  },
  pendingBadge: {
    backgroundColor: "#F59E0B15",
  },
  statusText: {
    ...typeScale.labelSmall,
    fontWeight: "600",
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  emptyCard: {
    backgroundColor: "#16182B",
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    alignItems: "center",
  },
  emptyText: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    marginTop: spacing.xs,
  },
  emptySubtext: {
    ...typeScale.bodySmall,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
});
