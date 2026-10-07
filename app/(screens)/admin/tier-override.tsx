import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useColors } from "@/hooks/useColors";
import { AppBackground } from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TierBadge, TierType } from "@/components/tier/TierBadge";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

const TIERS: TierType[] = ["sapphire", "silver", "gold", "platinum", "diamond"];

export default function AdminTierOverrideScreen() {
  const router = useRouter();
  const C = useColors();

  const [username, setUsername] = useState("");
  const [selectedTier, setSelectedTier] = useState<TierType>("gold");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const overrideMutation = useMutation(api.tierAdmin.adminOverrideTier);

  // Query user profile data when searching
  const profileData = useQuery(
    api.profiles.getProfileByUsername,
    username.trim() ? { username: username.trim().toLowerCase() } : "skip"
  );

  const handleOverride = async () => {
    if (!profileData) {
      Alert.alert("Error", "Please enter a valid provider username.");
      return;
    }
    if (!reason.trim()) {
      Alert.alert("Required", "Please provide a reason for the manual tier override.");
      return;
    }

    try {
      setLoading(true);
      await overrideMutation({
        userId: profileData.userId as any,
        newTier: selectedTier,
        reason: reason.trim(),
      });
      Alert.alert("Success", `Provider tier updated to ${selectedTier.toUpperCase()} successfully.`);
      setReason("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to override provider tier");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppBackground>
      <ScreenHeader
        title="Manual Tier Override"
        onBack={() => router.back()}
      />

      <ScrollView style={styles.flex1} contentContainerStyle={styles.scrollContent}>
        {/* Search Provider Card */}
        <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Find Provider</Text>
          <Text style={[styles.cardSub, { color: C.textMuted }]}>Enter the exact username of the provider to override:</Text>

          <View style={[styles.searchRow, { backgroundColor: C.bgInput, borderColor: C.borderSubtle }]}>
            <Text style={[styles.atSymbol, { color: C.actionPrimary }]}>@</Text>
            <TextInput
              style={[styles.searchInput, { color: C.textPrimary }]}
              placeholder="e.g. dr_johnson"
              placeholderTextColor={C.textMuted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {profileData ? (
            <View style={[styles.foundCard, { backgroundColor: C.isDark ? "rgba(198,34,41,0.08)" : "rgba(198,34,41,0.06)" }]}>
              <Ionicons name="checkmark-circle" size={20} color={C.actionPrimary} />
              <View style={styles.foundTextGroup}>
                <Text style={[styles.foundName, { color: C.textPrimary }]}>{profileData.name || profileData.username}</Text>
                <Text style={[styles.foundUsername, { color: C.textMuted }]}>@{profileData.username}</Text>
              </View>
            </View>
          ) : username.trim() ? (
            <Text style={[styles.notFoundText, { color: C.textDanger }]}>No profile found for @{username}</Text>
          ) : null}
        </View>

        {/* Tier Selector Card */}
        <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Select New Tier</Text>
          <View style={styles.tierSelectorGrid}>
            {TIERS.map((t) => {
              const isSelected = selectedTier === t;
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tierOption,
                    {
                      backgroundColor: isSelected
                        ? C.isDark ? "rgba(198,34,41,0.15)" : "rgba(198,34,41,0.1)"
                        : C.bgElevated,
                      borderColor: isSelected ? C.actionPrimary : C.borderSubtle,
                    },
                  ]}
                  onPress={() => setSelectedTier(t)}
                  activeOpacity={0.8}
                >
                  <TierBadge tier={t} size="small" />
                  {isSelected && <Ionicons name="checkmark-circle" size={16} color={C.actionPrimary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Reason Card */}
        <View style={[styles.card, { backgroundColor: C.bgSurface, borderColor: C.borderSubtle }]}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]}>Override Reason</Text>
          <Text style={[styles.cardSub, { color: C.textMuted }]}>Mandatory audit explanation for manual tier assignment:</Text>

          <TextInput
            style={[styles.reasonInput, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.borderSubtle }]}
            placeholder="e.g. Outstanding clinical leadership award & verified international consultant status..."
            placeholderTextColor={C.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
          />
        </View>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: C.actionPrimary },
            (!profileData || !reason.trim() || loading) && styles.submitBtnDisabled,
          ]}
          disabled={!profileData || !reason.trim() || loading}
          onPress={handleOverride}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="shield-checkmark-outline" size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>Apply Tier Override</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.md, paddingBottom: 40 },
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
  },
  cardTitle: { ...typeScale.titleMedium, fontWeight: "700", marginBottom: spacing.xs },
  cardSub: { ...typeScale.bodySmall, marginBottom: spacing.md },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
  },
  atSymbol: { ...typeScale.titleMedium, fontWeight: "700" },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    fontSize: 14,
  },
  foundCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  foundTextGroup: { flex: 1 },
  foundName: { ...typeScale.labelMedium, fontWeight: "700" },
  foundUsername: { ...typeScale.bodySmall },
  notFoundText: { ...typeScale.bodySmall, marginTop: spacing.sm },
  tierSelectorGrid: { gap: spacing.sm },
  tierOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  reasonInput: {
    borderRadius: radius.md,
    padding: spacing.sm,
    fontSize: 13,
    minHeight: 80,
    borderWidth: 1,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    gap: spacing.xs,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { ...typeScale.labelMedium, color: "#FFFFFF", fontWeight: "700" },
});
