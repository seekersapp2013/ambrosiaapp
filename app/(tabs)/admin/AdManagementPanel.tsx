/**
 * AdManagementPanel — React Native component
 * Manages ad zone placements and the global ads kill-switch.
 * Used inside AdminDashboard screen.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Switch,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AD_ZONES } from "@/convex/ads";
import { Colors } from "@/tokens/colors";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { typeScale } from "@/tokens/typography";
import { SmallPillButton } from "@/components/ui/Button";

// ─── Zone grouping ────────────────────────────────────────────────────────────

const ZONE_GROUPS = [
  { label: "Feed",              prefix: "feed_" },
  { label: "Articles",          prefix: "article_" },
  { label: "Reels",             prefix: "reels_" },
  { label: "Learn",             prefix: "learn_" },
  { label: "Community",         prefix: "community_" },
  { label: "Booking / Events",  prefix: "booking_|events_" },
  { label: "Profile",           prefix: "profile_" },
  { label: "Wallet",            prefix: "wallet_" },
  { label: "Notifications",     prefix: "notifications_" },
];

function getGroup(zoneId: string): string {
  for (const group of ZONE_GROUPS) {
    const prefixes = group.prefix.split("|");
    if (prefixes.some((p) => zoneId.startsWith(p))) return group.label;
  }
  return "Other";
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZoneFormState {
  publisherId: string;
  adSlotId: string;
  isEnabled: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdManagementPanel() {
  const allPlacements = useQuery(api.ads.getAllPlacements);
  const adSettings    = useQuery(api.ads.getAdSettings);
  const upsertPlacement  = useMutation(api.ads.upsertPlacement);
  const togglePlacement  = useMutation(api.ads.togglePlacement);
  const setGlobalEnabled = useMutation(api.ads.setGlobalAdsEnabled);

  const [formState, setFormState] = useState<Record<string, ZoneFormState>>({});
  const [saving, setSaving]       = useState<Record<string, boolean>>({});
  const [globalSaving, setGlobalSaving] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const getPlacement = (zoneId: string) =>
    allPlacements?.find((p) => p.zoneId === zoneId);

  const getForm = (zoneId: string): ZoneFormState => {
    if (formState[zoneId]) return formState[zoneId];
    const existing = getPlacement(zoneId);
    return {
      publisherId: existing?.publisherId ?? "",
      adSlotId:    existing?.adSlotId    ?? "",
      isEnabled:   existing?.isEnabled   ?? false,
    };
  };

  const updateForm = (zoneId: string, patch: Partial<ZoneFormState>) => {
    setFormState((prev) => ({
      ...prev,
      [zoneId]: { ...getForm(zoneId), ...patch },
    }));
  };

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSave = async (zone: (typeof AD_ZONES)[number]) => {
    const form = getForm(zone.zoneId);
    if (!form.publisherId.trim() || !form.adSlotId.trim()) {
      Alert.alert("Missing Fields", "Publisher ID and Ad Slot ID are required.");
      return;
    }
    setSaving((prev) => ({ ...prev, [zone.zoneId]: true }));
    try {
      await upsertPlacement({
        zoneId:      zone.zoneId,
        label:       zone.label,
        description: zone.description,
        publisherId: form.publisherId.trim(),
        adSlotId:    form.adSlotId.trim(),
        isEnabled:   form.isEnabled,
      });
      setFormState((prev) => {
        const next = { ...prev };
        delete next[zone.zoneId];
        return next;
      });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to save");
    } finally {
      setSaving((prev) => ({ ...prev, [zone.zoneId]: false }));
    }
  };

  const handleToggle = async (zoneId: string, isEnabled: boolean) => {
    try {
      await togglePlacement({ zoneId, isEnabled });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to toggle");
    }
  };

  const handleGlobalToggle = async (enabled: boolean) => {
    setGlobalSaving(true);
    try {
      await setGlobalEnabled({ enabled });
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to update global setting");
    } finally {
      setGlobalSaving(false);
    }
  };

  // ── Group zones ───────────────────────────────────────────────────────────────

  const grouped: Record<string, typeof AD_ZONES[number][]> = {};
  for (const zone of AD_ZONES) {
    const group = getGroup(zone.zoneId);
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(zone);
  }

  const adsSetUp      = adSettings !== undefined && adSettings !== null;
  const globalEnabled = adSettings?.adsGloballyEnabled ?? false;

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (allPlacements === undefined || adSettings === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.actionPrimary} />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.scrollRoot}
      contentContainerStyle={styles.root}
      showsVerticalScrollIndicator={false}
    >
      {/* Global Kill-Switch */}
      <View
        style={[
          styles.globalCard,
          !adsSetUp
            ? styles.globalCardWarning
            : globalEnabled
            ? styles.globalCardSuccess
            : styles.globalCardDanger,
        ]}
      >
        <View style={styles.globalCardInner}>
          <View style={styles.globalCardText}>
            <Text style={styles.globalCardTitle} allowFontScaling={false}>
              Global Ads Switch
            </Text>
            <Text style={styles.globalCardDesc} allowFontScaling={true}>
              {!adsSetUp
                ? "Ads have not been set up yet. Configure at least one zone to get started."
                : globalEnabled
                ? "Ads are currently enabled across the app."
                : "All ads are disabled globally."}
            </Text>
            {!adsSetUp && (
              <Text style={styles.globalCardWarningText} allowFontScaling={false}>
                ⚠ Ads are disabled by default and require manual setup.
              </Text>
            )}
          </View>
          {globalSaving ? (
            <ActivityIndicator color={Colors.actionPrimary} />
          ) : (
            <Switch
              value={globalEnabled}
              onValueChange={handleGlobalToggle}
              trackColor={{
                false: Colors.borderDefault,
                true:  Colors.statusSuccess,
              }}
              thumbColor={Colors.textPrimary}
              accessibilityLabel="Toggle global ads"
            />
          )}
        </View>
      </View>

      {/* Zone Groups */}
      {Object.entries(grouped).map(([groupLabel, zones]) => (
        <View
          key={groupLabel}
          style={[
            styles.groupCard,
            !globalEnabled && styles.groupCardDimmed,
          ]}
        >
          {/* Group header */}
          <View style={styles.groupHeader}>
            <Text style={styles.groupHeaderLabel} allowFontScaling={false}>
              {groupLabel}
            </Text>
            {!globalEnabled && (
              <Text style={styles.groupHeaderInactive} allowFontScaling={false}>
                Inactive
              </Text>
            )}
          </View>

          {/* Zones */}
          {zones.map((zone, idx) => {
            const form     = getForm(zone.zoneId);
            const existing = getPlacement(zone.zoneId);
            const isSaving = saving[zone.zoneId] ?? false;
            const isDirty  =
              formState[zone.zoneId] !== undefined &&
              (form.publisherId !== (existing?.publisherId ?? "") ||
               form.adSlotId    !== (existing?.adSlotId    ?? ""));

            return (
              <View
                key={zone.zoneId}
                style={[
                  styles.zoneRow,
                  idx < zones.length - 1 && styles.zoneRowDivider,
                ]}
              >
                {/* Zone info + toggle */}
                <View style={styles.zoneHeader}>
                  <View style={styles.zoneInfo}>
                    <Text style={styles.zoneLabel} allowFontScaling={false}>
                      {zone.label}
                    </Text>
                    <Text style={styles.zoneDesc} allowFontScaling={true}>
                      {zone.description}
                    </Text>
                    <View style={styles.zoneIdBadge}>
                      <Text style={styles.zoneIdText} allowFontScaling={false}>
                        {zone.zoneId}
                      </Text>
                    </View>
                  </View>
                  {existing && (
                    <Switch
                      value={existing.isEnabled}
                      onValueChange={(val) => handleToggle(zone.zoneId, val)}
                      trackColor={{
                        false: Colors.borderDefault,
                        true:  Colors.statusSuccess,
                      }}
                      thumbColor={Colors.textPrimary}
                      accessibilityLabel={`Toggle ${zone.label}`}
                    />
                  )}
                </View>

                {/* Form fields */}
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      Publisher ID
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                      placeholderTextColor={Colors.textDisabled}
                      value={form.publisherId}
                      onChangeText={(t) => updateForm(zone.zoneId, { publisherId: t })}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Publisher ID"
                    />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.fieldLabel} allowFontScaling={false}>
                      Ad Slot ID
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="XXXXXXXXXX"
                      placeholderTextColor={Colors.textDisabled}
                      value={form.adSlotId}
                      onChangeText={(t) => updateForm(zone.zoneId, { adSlotId: t })}
                      autoCapitalize="none"
                      autoCorrect={false}
                      accessibilityLabel="Ad Slot ID"
                    />
                  </View>
                </View>

                {/* Footer: enable checkbox (new zones) + save button */}
                <View style={styles.zoneFooter}>
                  {!existing ? (
                    <View style={styles.enableRow}>
                      <Switch
                        value={form.isEnabled}
                        onValueChange={(val) => updateForm(zone.zoneId, { isEnabled: val })}
                        trackColor={{
                          false: Colors.borderDefault,
                          true:  Colors.statusSuccess,
                        }}
                        thumbColor={Colors.textPrimary}
                        accessibilityLabel="Enable immediately"
                      />
                      <Text style={styles.enableLabel} allowFontScaling={false}>
                        Enable immediately
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}

                  <SmallPillButton
                    label={
                      isSaving
                        ? "Saving…"
                        : existing
                        ? isDirty
                          ? "Save Changes"
                          : "Saved"
                        : "Save Zone"
                    }
                    onPress={() => handleSave(zone)}
                    disabled={isSaving || (!isDirty && !!existing)}
                    loading={isSaving}
                    accessibilityLabel={`Save ${zone.label}`}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollRoot: {
    flex: 1,
  },
  root: {
    padding: spacing.screenPaddingH,
    paddingBottom: spacing.scrollBottomPadding,
    gap: spacing.space4,
  },
  loadingWrap: {
    paddingVertical: spacing.space10,
    alignItems: "center",
  },

  // Global card
  globalCard: {
    borderRadius: radius.radiusMD,
    borderWidth: 1.5,
    padding: spacing.space4,
  },
  globalCardWarning: {
    borderColor: Colors.statusWarning,
    backgroundColor: Colors.statusWarningBg,
  },
  globalCardSuccess: {
    borderColor: Colors.statusSuccess,
    backgroundColor: Colors.statusSuccessBg,
  },
  globalCardDanger: {
    borderColor: Colors.statusDanger,
    backgroundColor: Colors.statusDangerBg,
  },
  globalCardInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space4,
  },
  globalCardText: {
    flex: 1,
    gap: 4,
  },
  globalCardTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
  },
  globalCardDesc: {
    ...typeScale.bodySM,
    color: Colors.textSecondary,
  },
  globalCardWarningText: {
    ...typeScale.caption,
    color: Colors.statusWarning,
    marginTop: 4,
  },

  // Group card
  groupCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  groupCardDimmed: {
    opacity: 0.6,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  groupHeaderLabel: {
    ...typeScale.headingSM,
    color: Colors.textSecondary,
  },
  groupHeaderInactive: {
    ...typeScale.caption,
    color: Colors.statusDanger,
    fontWeight: "600",
  },

  // Zone row
  zoneRow: {
    padding: spacing.space4,
    gap: spacing.space3,
  },
  zoneRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  zoneHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
  },
  zoneInfo: {
    flex: 1,
    gap: 4,
  },
  zoneLabel: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  zoneDesc: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  zoneIdBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: radius.radiusXS,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
  },
  zoneIdText: {
    ...typeScale.caption,
    fontSize: 10,
    color: Colors.actionPrimary,
    fontFamily: "SpaceMono-Regular",
  },

  // Form
  formRow: {
    flexDirection: "row",
    gap: spacing.space3,
  },
  formField: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    ...typeScale.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  textInput: {
    height: 40,
    borderRadius: radius.radiusSM,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgElevated,
    paddingHorizontal: spacing.space3,
    ...typeScale.bodySM,
    color: Colors.textPrimary,
  },

  // Footer
  zoneFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  enableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  enableLabel: {
    ...typeScale.bodySM,
    color: Colors.textSecondary,
  },
});
