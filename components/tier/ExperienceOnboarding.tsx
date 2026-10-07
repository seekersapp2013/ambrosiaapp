import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

interface ExperienceOnboardingProps {
  visible: boolean;
  onClose: () => void;
}

export function ExperienceOnboarding({ visible, onClose }: ExperienceOnboardingProps) {
  const updateExperience = useMutation(api.tierCalculation.updateProviderExperience);

  const [years, setYears] = useState("");
  const [license, setLicense] = useState("");
  const [council, setCouncil] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!years.trim()) {
      Alert.alert("Required", "Please enter your years of professional practice.");
      return;
    }

    const yrsNum = parseInt(years.trim(), 10);
    if (isNaN(yrsNum) || yrsNum < 0) {
      Alert.alert("Invalid input", "Please enter a valid number for years of experience.");
      return;
    }

    try {
      setLoading(true);
      await updateExperience({
        yearsOfExperience: yrsNum,
        licenseNumber: license.trim() || undefined,
        registrationCouncil: council.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="ribbon-outline" size={32} color="#00BFA6" />
          </View>

          <Text style={styles.title}>Provider Recognition Setup</Text>
          <Text style={styles.subtitle}>
            Tell us about your active professional practice to calculate your initial Provider Recognition Score (PRS).
          </Text>

          <Text style={styles.label}>Years in Active Practice *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5"
            placeholderTextColor="#6B7280"
            keyboardType="number-pad"
            value={years}
            onChangeText={setYears}
          />

          <Text style={styles.label}>Professional Licence Number (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. MDCN/R/12345"
            placeholderTextColor="#6B7280"
            value={license}
            onChangeText={setLicense}
          />

          <Text style={styles.label}>Registration Council (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Medical and Dental Council of Nigeria"
            placeholderTextColor="#6B7280"
            value={council}
            onChangeText={setCouncil}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.skipBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveText}>Save & Calculate Tier</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  card: {
    backgroundColor: "#16182B",
    width: "100%",
    maxWidth: 400,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#262945",
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#00BFA615",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    marginBottom: spacing.md,
  },
  label: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
    marginBottom: 4,
    marginTop: spacing.xs,
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
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
  },
  skipBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipText: {
    ...typeScale.labelMedium,
    color: "#6B7280",
  },
  saveBtn: {
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
});
