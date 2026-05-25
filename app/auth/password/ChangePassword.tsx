import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { AppBackground } from "@/components/AppBackground";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const { signIn } = useAuthActions();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }
    setIsLoading(true);
    try {
      Alert.alert("Coming Soon", "Password change will be available in the next update.");
    } catch {
      Alert.alert("Error", "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppBackground style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>Update your account password below</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.cardAccent} />

          {/* Current password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CURRENT PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={Colors.textFaint}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                <Ionicons name={showCurrent ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          {/* New password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>NEW PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={Colors.textFaint}
                secureTextEntry={!showNew}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                <Ionicons name={showNew ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.textFaint}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Ionicons name={showConfirm ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hint */}
          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.blue} />
            <Text style={styles.hintText}>Password must be at least 8 characters</Text>
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, isLoading && styles.submitBtnDisabled]}
          onPress={handleChangePassword}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color={Colors.textPrimary} />
            : (
              <>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.textPrimary} />
                <Text style={styles.submitBtnText}>Update Password</Text>
              </>
            )}
        </TouchableOpacity>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 60 },

  header: { marginTop: 52, marginBottom: 24 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 20 },
  backText: { color: Colors.textSecondary, fontSize: 15 },
  title: { fontSize: 26, fontWeight: "700", color: Colors.textPrimary, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted },

  card: {
    backgroundColor: Colors.redSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    padding: 20,
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
  },
  cardAccent: {
    position: "absolute", top: 0, left: 0, right: 0, height: 3,
    backgroundColor: Colors.primary, opacity: 0.6,
  },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "600", color: Colors.textMuted, letterSpacing: 0.6, marginBottom: 8, textTransform: "uppercase" },
  inputWrapper: { position: "relative" },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderRadius: 10,
    padding: 13,
    paddingRight: 44,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  eyeBtn: { position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" },

  hint: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: Colors.blueSurface,
    borderRadius: 8, borderWidth: 1, borderColor: Colors.blueBorder,
    padding: 10, marginTop: 4,
  },
  hintText: { color: Colors.textMuted, fontSize: 12, flex: 1 },

  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: Colors.textPrimary, fontSize: 16, fontWeight: "600" },
});
