import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TierBadge } from "@/components/tier/TierBadge";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

export default function AdminRevenueShareScreen() {
  const router = useRouter();

  const tierRatios = useQuery(api.revenueShare.getTierRevenueShareConfig);
  const updateTierConfigMut = useMutation(api.revenueShare.updateTierRevenueShareConfig);
  const setCustomShareMut = useMutation(api.revenueShare.setProviderCustomRevenueShare);

  const searchResults = useQuery(api.providerSearch.searchProviders, {} as any) || [];

  // Local draft state for default tier ratios
  const [sapphireRatio, setSapphireRatio] = useState("70");
  const [silverRatio, setSilverRatio] = useState("75");
  const [goldRatio, setGoldRatio] = useState("80");
  const [platinumRatio, setPlatinumRatio] = useState("85");
  const [diamondRatio, setDiamondRatio] = useState("90");

  // Local state for provider override modal/form
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [customRatioInput, setCustomRatioInput] = useState<string>("");
  const [reasonInput, setReasonInput] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSaveTierDefaults = async () => {
    try {
      setLoading(true);
      await updateTierConfigMut({
        ratios: {
          sapphire: parseInt(sapphireRatio, 10) || 70,
          silver: parseInt(silverRatio, 10) || 75,
          gold: parseInt(goldRatio, 10) || 80,
          platinum: parseInt(platinumRatio, 10) || 85,
          diamond: parseInt(diamondRatio, 10) || 90,
        },
      });

      Alert.alert("Success", "Standard tier revenue share defaults updated!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update default ratios");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomOverride = async () => {
    if (!selectedUserId) return;

    try {
      setLoading(true);
      const ratioNum = customRatioInput.trim() ? parseInt(customRatioInput, 10) : null;
      await setCustomShareMut({
        userId: selectedUserId as any,
        ratio: ratioNum,
        reason: reasonInput.trim() || undefined,
      });

      Alert.alert("Saved", `Custom revenue share updated for ${selectedName}.`);
      setSelectedUserId(null);
      setCustomRatioInput("");
      setReasonInput("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to set custom override");
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = searchResults.filter((p) =>
    (p.profile?.name || p.profile?.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.screen}>
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Revenue Share & Overrides</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Section 1: Standard Tier Defaults */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Standard Tier Revenue Share Defaults</Text>
          <Text style={styles.cardSub}>
            Define default provider payout percentage (%) allocated per recognition tier.
          </Text>

          <View style={styles.tierRow}>
            <TierBadge tier="sapphire" size="small" />
            <TextInput
              style={styles.tierInput}
              keyboardType="number-pad"
              value={sapphireRatio}
              onChangeText={setSapphireRatio}
            />
            <Text style={styles.percentText}>% payout</Text>
          </View>

          <View style={styles.tierRow}>
            <TierBadge tier="silver" size="small" />
            <TextInput
              style={styles.tierInput}
              keyboardType="number-pad"
              value={silverRatio}
              onChangeText={setSilverRatio}
            />
            <Text style={styles.percentText}>% payout</Text>
          </View>

          <View style={styles.tierRow}>
            <TierBadge tier="gold" size="small" />
            <TextInput
              style={styles.tierInput}
              keyboardType="number-pad"
              value={goldRatio}
              onChangeText={setGoldRatio}
            />
            <Text style={styles.percentText}>% payout</Text>
          </View>

          <View style={styles.tierRow}>
            <TierBadge tier="platinum" size="small" />
            <TextInput
              style={styles.tierInput}
              keyboardType="number-pad"
              value={platinumRatio}
              onChangeText={setPlatinumRatio}
            />
            <Text style={styles.percentText}>% payout</Text>
          </View>

          <View style={styles.tierRow}>
            <TierBadge tier="diamond" size="small" />
            <TextInput
              style={styles.tierInput}
              keyboardType="number-pad"
              value={diamondRatio}
              onChangeText={setDiamondRatio}
            />
            <Text style={styles.percentText}>% payout</Text>
          </View>

          <TouchableOpacity style={styles.saveDefaultsBtn} onPress={handleSaveTierDefaults} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.saveDefaultsText}>Save Default Tier Shares</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Section 2: Individual Provider Override Form */}
        {selectedUserId && (
          <View style={styles.overrideCard}>
            <Text style={styles.overrideTitle}>Set Custom Payout Share for {selectedName}</Text>

            <Text style={styles.label}>Custom Payout Percentage (0 - 100%)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 82 (Leave blank to reset to tier standard)"
              placeholderTextColor="#6B7280"
              keyboardType="number-pad"
              value={customRatioInput}
              onChangeText={setCustomRatioInput}
            />

            <Text style={styles.label}>Rationale / Note</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Special partnership agreement"
              placeholderTextColor="#6B7280"
              value={reasonInput}
              onChangeText={setReasonInput}
            />

            <View style={styles.overrideActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedUserId(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmBtn} onPress={handleSaveCustomOverride} disabled={loading}>
                <Text style={styles.confirmText}>Save Custom Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Section 3: Provider List & Override Status */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Provider Payout Ratio Override Registry</Text>
          <Text style={styles.cardSub}>
            Select any provider to set an individual revenue share override.
          </Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Search provider by name..."
            placeholderTextColor="#6B7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {filteredProviders.map((p) => {
            const providerName = p.profile?.name || p.profile?.username || "Provider";
            const customShare = p.tierData?.customRevenueShare;
            const isOverride = customShare !== undefined && customShare !== null;

            return (
              <View key={p.subscriber.userId} style={styles.providerRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.providerNameGroup}>
                    <Text style={styles.providerName}>{providerName}</Text>
                    <TierBadge tier={p.tier} size="small" />
                  </View>
                  <Text style={styles.providerSub}>
                    {p.subscriber.jobTitle} • {p.subscriber.specialization}
                  </Text>
                  {isOverride && (
                    <Text style={styles.overrideBadgeText}>
                      Custom Share: {customShare}% (Reason: {p.tierData?.customRevenueShareReason || "Admin set"})
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.editShareBtn}
                  onPress={() => {
                    setSelectedUserId(p.subscriber.userId);
                    setSelectedName(providerName);
                    setCustomRatioInput(customShare !== undefined ? String(customShare) : "");
                    setReasonInput(p.tierData?.customRevenueShareReason || "");
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#00BFA6" />
                  <Text style={styles.editShareText}>{isOverride ? "Edit" : "Override"}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A15",
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "#0F101D",
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
  },
  navBack: {
    padding: 4,
  },
  navTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.md,
  },
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
    marginTop: 2,
    marginBottom: spacing.md,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  tierInput: {
    backgroundColor: "#0F101D",
    color: "#00BFA6",
    fontWeight: "700",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    width: 60,
    textAlign: "center",
  },
  percentText: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
  },
  saveDefaultsBtn: {
    backgroundColor: "#00BFA6",
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveDefaultsText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  overrideCard: {
    backgroundColor: "#00BFA615",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#00BFA6",
    marginBottom: spacing.md,
  },
  overrideTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.xs,
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
  overrideActions: {
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
  confirmBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  confirmText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  searchInput: {
    backgroundColor: "#0F101D",
    color: "#FFFFFF",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
  },
  providerNameGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  providerName: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  providerSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  overrideBadgeText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
    marginTop: 2,
  },
  editShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA615",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#00BFA630",
  },
  editShareText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
    fontWeight: "700",
  },
});
