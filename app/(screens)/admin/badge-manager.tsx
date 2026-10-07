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
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BadgeIcon } from "@/components/tier/BadgeIcon";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

export default function AdminBadgeManagerScreen() {
  const router = useRouter();
  const badges = useQuery(api.badges.getActiveBadges) || [];
  const createBadgeMut = useMutation(api.badges.createBadge);

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#00BFA6");
  const [badgeType, setBadgeType] = useState<"admin_awarded" | "peer_awarded" | "automated" | "hybrid">("admin_awarded");
  const [awardableBy, setAwardableBy] = useState<"platform_admin" | "circle_admin" | "peers" | "system">("platform_admin");

  // Feature-gating / benefits
  const [searchBoost, setSearchBoost] = useState("0");
  const [prsBonus, setPrsBonus] = useState("0");
  const [contentPriority, setContentPriority] = useState(false);
  const [canCreateGated, setCanCreateGated] = useState(false);
  const [canCreateCircles, setCanCreateCircles] = useState(false);

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !displayName.trim() || !description.trim()) {
      Alert.alert("Required", "Please fill in badge name, display title, and description.");
      return;
    }

    try {
      setLoading(true);
      await createBadgeMut({
        name: name.trim().toLowerCase().replace(/\s+/g, "_"),
        displayName: displayName.trim(),
        description: description.trim(),
        iconStorageId: "default_icon",
        color,
        badgeType,
        awardableBy,
        benefits: {
          searchBoost: parseInt(searchBoost, 10) || 0,
          prsBonus: parseInt(prsBonus, 10) || 0,
          contentPriorityBoost: contentPriority,
          canCreateGatedContent: canCreateGated,
          canCreateCircles,
          profileBadgeDisplay: true,
        },
      });

      Alert.alert("Success", "New badge created!");
      setIsCreating(false);
      setName("");
      setDisplayName("");
      setDescription("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create badge");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Admin Badge Engine</Text>
        {!isCreating && (
          <TouchableOpacity style={styles.createBtn} onPress={() => setIsCreating(true)}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>New Badge</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isCreating && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Define New Badge & Perks</Text>

            <Text style={styles.label}>Badge Internal Identifier *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. maternal_health_champion"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Display Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Maternal Health Champion"
              placeholderTextColor="#6B7280"
              value={displayName}
              onChangeText={setDisplayName}
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.input}
              placeholder="Explain why this badge is awarded and its significance"
              placeholderTextColor="#6B7280"
              value={description}
              onChangeText={setDescription}
            />

            <Text style={styles.label}>Badge Theme Color (Hex)</Text>
            <TextInput
              style={styles.input}
              placeholder="#00BFA6"
              placeholderTextColor="#6B7280"
              value={color}
              onChangeText={setColor}
            />

            {/* Awardable By */}
            <Text style={styles.sectionHeader}>Who Can Award This Badge?</Text>
            <View style={styles.chipRow}>
              {[
                { label: "Platform Admin", val: "platform_admin" },
                { label: "Circle Admin", val: "circle_admin" },
                { label: "Peers (Providers)", val: "peers" },
                { label: "Automated System", val: "system" },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.val}
                  style={[styles.chip, awardableBy === opt.val && styles.chipActive]}
                  onPress={() => setAwardableBy(opt.val as any)}
                >
                  <Text style={[styles.chipText, awardableBy === opt.val && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Unlocked Benefits & Perks (Feature Gating) */}
            <Text style={styles.sectionHeader}>Unlocked Feature Perks & Benefits</Text>

            <Text style={styles.label}>Search Rank Score Boost (0 - 20 pts)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={searchBoost}
              onChangeText={setSearchBoost}
            />

            <Text style={styles.label}>PRS Score Bonus (0 - 5 pts)</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={prsBonus}
              onChangeText={setPrsBonus}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Feed Content Priority Boost</Text>
              <Switch
                value={contentPriority}
                onValueChange={setContentPriority}
                trackColor={{ false: "#374151", true: "#00BFA6" }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Unlock Gated Content Creation</Text>
              <Switch
                value={canCreateGated}
                onValueChange={setCanCreateGated}
                trackColor={{ false: "#374151", true: "#00BFA6" }}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Unlock Community Circle Creation</Text>
              <Switch
                value={canCreateCircles}
                onValueChange={setCanCreateCircles}
                trackColor={{ false: "#374151", true: "#00BFA6" }}
              />
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsCreating(false)}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveText}>Save Badge Definition</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.listTitle}>Active Badge Definitions ({badges.length})</Text>

        {badges.map((b) => (
          <View key={b._id} style={styles.badgeItem}>
            <BadgeIcon
              displayName={b.displayName}
              color={b.color}
              backgroundColor={b.backgroundColor}
              size="medium"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{b.displayName}</Text>
              <Text style={styles.itemDesc}>{b.description}</Text>
              <View style={styles.itemMetaRow}>
                <Text style={styles.metaText}>Awarded by: {b.awardableBy.replace("_", " ")}</Text>
                <Text style={styles.metaText}>Awards count: {b.currentTotalAwards}</Text>
              </View>
            </View>
          </View>
        ))}
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
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  createBtnText: {
    ...typeScale.labelSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.md,
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
  sectionHeader: {
    ...typeScale.labelMedium,
    color: "#00BFA6",
    fontWeight: "700",
    marginTop: spacing.md,
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#0F101D",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
  },
  chipActive: {
    backgroundColor: "#00BFA620",
    borderColor: "#00BFA6",
  },
  chipText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
  },
  chipTextActive: {
    color: "#00BFA6",
    fontWeight: "600",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  switchLabel: {
    ...typeScale.bodyMedium,
    color: "#FFFFFF",
  },
  formActions: {
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
  listTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  badgeItem: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  itemTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  itemDesc: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  itemMetaRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 4,
  },
  metaText: {
    ...typeScale.labelSmall,
    color: "#6B7280",
  },
});
