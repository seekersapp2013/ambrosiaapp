/**
 * BookingSettingsForm
 * Provider-only settings form.
 *
 * Sections:
 *   1. Confirmation type  — Automatic / Manual radio cards
 *   2. Buffer time        — numeric input (minutes)
 *   3. Max advance booking — numeric input (days)
 *   4. Cancellation policy — custom dropdown
 *   5. Session instructions — textarea
 *   6. Save + Reset to Defaults buttons
 *   7. Tips info card
 *
 * APIs: getMySettings, createOrUpdateSettings, resetToDefaults
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppInput, TextareaInput } from "@/components/ui/Input";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";

// ─── Cancellation policy options ──────────────────────────────────────────────
const CANCELLATION_OPTIONS = [
  { value: "1",    label: "1 hour before" },
  { value: "6",    label: "6 hours before" },
  { value: "12",   label: "12 hours before" },
  { value: "24",   label: "24 hours before" },
  { value: "48",   label: "48 hours before" },
  { value: "72",   label: "72 hours before" },
  { value: "168",  label: "1 week before" },
  { value: "none", label: "No cancellations allowed" },
];

// ─── Confirmation type card ────────────────────────────────────────────────────
function ConfirmationCard({
  type, selected, onSelect,
}: {
  type: "AUTOMATIC" | "MANUAL";
  selected: boolean;
  onSelect: () => void;
}) {
  const isAuto = type === "AUTOMATIC";
  return (
    <TouchableOpacity
      style={[styles.confirmCard, selected && styles.confirmCardActive]}
      onPress={onSelect}
      activeOpacity={0.85}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${isAuto ? "Automatic" : "Manual"} confirmation`}
    >
      <View style={[styles.confirmIconWrap, { backgroundColor: isAuto ? Colors.statusSuccessBg : Colors.statusInfoBg }]}>
        <Ionicons
          name={isAuto ? "flash-outline" : "hand-left-outline"}
          size={22}
          color={isAuto ? Colors.statusSuccess : Colors.statusInfo}
        />
      </View>
      <View style={styles.confirmContent}>
        <Text style={styles.confirmTitle} allowFontScaling={false}>
          {isAuto ? "Automatic" : "Manual"}
        </Text>
        <Text style={styles.confirmDesc} allowFontScaling={false}>
          {isAuto
            ? "Bookings are confirmed instantly without your review."
            : "You review and approve each booking request individually."}
        </Text>
      </View>
      <View style={[styles.confirmRadio, selected && styles.confirmRadioActive]}>
        {selected && <View style={styles.confirmRadioDot} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Dropdown modal ────────────────────────────────────────────────────────────
function CancellationDropdown({
  visible, value, onSelect, onClose,
}: {
  visible: boolean;
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.ddOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.ddSheet}>
          <View style={styles.ddHeader}>
            <Text style={styles.ddTitle} allowFontScaling={false}>Cancellation Policy</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.iconPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={CANCELLATION_OPTIONS}
            keyExtractor={(i) => i.value}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.space6 }}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <TouchableOpacity
                  style={[styles.ddOption, active && styles.ddOptionActive]}
                  onPress={() => { onSelect(item.value); onClose(); }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.ddOptionText, active && styles.ddOptionTextActive]} allowFontScaling={false}>
                    {item.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={Colors.actionPrimary} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface BookingSettingsFormProps {
  onSaved?: () => void;
}

export function BookingSettingsForm({ onSaved }: BookingSettingsFormProps) {
  const mySettings         = useQuery(api.bookingSettings.getMySettings);
  const saveSettings       = useMutation(api.bookingSettings.createOrUpdateSettings);
  const resetToDefaults    = useMutation(api.bookingSettings.resetToDefaults);

  // ── Local form state (initialised from query once loaded) ─────────────────
  const [confirmationType,   setConfirmationType]   = useState<"AUTOMATIC" | "MANUAL">("AUTOMATIC");
  const [bufferTime,         setBufferTime]         = useState("15");
  const [maxAdvanceBooking,  setMaxAdvanceBooking]  = useState("30");
  const [cancellationPolicy, setCancellationPolicy] = useState("24");
  const [sessionInstructions,setSessionInstructions]= useState("");

  const [showDropdown, setShowDropdown] = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [resetting,    setResetting]    = useState(false);
  const [saveError,    setSaveError]    = useState("");
  const [savedBanner,  setSavedBanner]  = useState(false);

  // Seed form once settings load
  useEffect(() => {
    if (!mySettings) return;
    setConfirmationType((mySettings.confirmationType as "AUTOMATIC" | "MANUAL") ?? "AUTOMATIC");
    setBufferTime(String(mySettings.bufferTime ?? 15));
    setMaxAdvanceBooking(String(mySettings.maxAdvanceBooking ?? 30));
    setCancellationPolicy(mySettings.cancellationPolicy ?? "24");
    setSessionInstructions(mySettings.sessionInstructions ?? "");
  }, [mySettings]);

  // ── Field errors ──────────────────────────────────────────────────────────
  const bufferErr     = parseInt(bufferTime, 10) < 0  || parseInt(bufferTime, 10) > 120 ? "Must be 0–120 minutes" : "";
  const advanceErr    = parseInt(maxAdvanceBooking, 10) < 1 || parseInt(maxAdvanceBooking, 10) > 365 ? "Must be 1–365 days" : "";
  const hasFieldError = !!bufferErr || !!advanceErr;

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (hasFieldError) return;
    setSaving(true);
    setSaveError("");
    try {
      await saveSettings({
        confirmationType,
        bufferTime:        parseInt(bufferTime, 10),
        maxAdvanceBooking: parseInt(maxAdvanceBooking, 10),
        cancellationPolicy,
        sessionInstructions: sessionInstructions.trim() || undefined,
      });
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
      onSaved?.();
    } catch (err: any) {
      setSaveError(err?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  async function handleReset() {
    setResetting(true);
    setSaveError("");
    try {
      await resetToDefaults();
      setConfirmationType("AUTOMATIC");
      setBufferTime("15");
      setMaxAdvanceBooking("30");
      setCancellationPolicy("24");
      setSessionInstructions("");
      setSavedBanner(true);
      setTimeout(() => setSavedBanner(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message ?? "Failed to reset.");
    } finally {
      setResetting(false);
    }
  }

  const cancellationLabel =
    CANCELLATION_OPTIONS.find((o) => o.value === cancellationPolicy)?.label ?? "24 hours before";

  if (mySettings === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.actionPrimary} />
        <Text style={styles.loadingText} allowFontScaling={false}>Loading settings…</Text>
      </View>
    );
  }

  return (
    <View style={styles.flatContent}>
      {/* ── Saved banner ────────────────────────────────────────── */}
      {savedBanner && (
        <View style={styles.savedBanner}>
          <Ionicons name="checkmark-circle-outline" size={16} color={Colors.statusSuccess} />
          <Text style={styles.savedBannerText} allowFontScaling={false}>Settings saved</Text>
        </View>
      )}

      {/* ── 1. Confirmation type ────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Booking Confirmation</Text>
      <View style={styles.confirmRow}>
        <ConfirmationCard
          type="AUTOMATIC"
          selected={confirmationType === "AUTOMATIC"}
          onSelect={() => setConfirmationType("AUTOMATIC")}
        />
        <ConfirmationCard
          type="MANUAL"
          selected={confirmationType === "MANUAL"}
          onSelect={() => setConfirmationType("MANUAL")}
        />
      </View>

      {/* ── 2. Buffer time ──────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Buffer Between Sessions</Text>
      <View style={styles.numericRow}>
        <View style={styles.numericInput}>
          <AppInput
            label=""
            placeholder="15"
            value={bufferTime}
            onChangeText={setBufferTime}
            keyboardType="number-pad"
            error={bufferErr}
            accessibilityLabel="Buffer time in minutes"
          />
        </View>
        <View style={styles.numericUnit}>
          <Text style={styles.unitText} allowFontScaling={false}>minutes</Text>
        </View>
      </View>
      <Text style={styles.fieldHint} allowFontScaling={false}>
        Gap added before and after each session to prevent back-to-back bookings.
      </Text>

      {/* ── 3. Max advance booking ──────────────────────────────── */}
      <Text style={styles.sectionLabel}>How Far Ahead Can Clients Book?</Text>
      <View style={styles.numericRow}>
        <View style={styles.numericInput}>
          <AppInput
            label=""
            placeholder="30"
            value={maxAdvanceBooking}
            onChangeText={setMaxAdvanceBooking}
            keyboardType="number-pad"
            error={advanceErr}
            accessibilityLabel="Maximum advance booking days"
          />
        </View>
        <View style={styles.numericUnit}>
          <Text style={styles.unitText} allowFontScaling={false}>days in advance</Text>
        </View>
      </View>
      <Text style={styles.fieldHint} allowFontScaling={false}>
        Clients can only book sessions within this window from today.
      </Text>

      {/* ── 4. Cancellation policy ──────────────────────────────── */}
      <Text style={styles.sectionLabel}>Cancellation Policy</Text>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setShowDropdown(true)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Cancellation policy: ${cancellationLabel}`}
      >
        <Ionicons name="shield-checkmark-outline" size={18} color={Colors.iconSecondary} />
        <Text style={styles.dropdownBtnText} allowFontScaling={false}>{cancellationLabel}</Text>
        <Ionicons name="chevron-down" size={16} color={Colors.iconSecondary} />
      </TouchableOpacity>
      <Text style={styles.fieldHint} allowFontScaling={false}>
        Minimum notice required from clients to cancel without penalty.
      </Text>

      {/* ── 5. Session instructions ─────────────────────────────── */}
      <Text style={styles.sectionLabel}>Default Session Instructions</Text>
      <TextareaInput
        label=""
        placeholder="e.g. Please join 2 minutes early. Have a notepad ready. Use headphones for best audio quality…"
        value={sessionInstructions}
        onChangeText={setSessionInstructions}
        maxLength={500}
        accessibilityLabel="Default session instructions"
      />

      {/* ── Save error ──────────────────────────────────────────── */}
      {saveError !== "" && (
        <View style={styles.saveError}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.statusDanger} />
          <Text style={styles.saveErrorText} allowFontScaling={false}>{saveError}</Text>
        </View>
      )}

      {/* ── Action buttons ──────────────────────────────────────── */}
      <View style={styles.btnRow}>
        <SecondaryButton
          label="Reset Defaults"
          onPress={handleReset}
          loading={resetting}
          style={styles.btnReset}
          accessibilityLabel="Reset settings to defaults"
        />
        <PrimaryButton
          label="Save Settings"
          onPress={handleSave}
          loading={saving}
          disabled={hasFieldError}
          style={styles.btnSave}
          icon={<Ionicons name="save-outline" size={18} color="#FFFFFF" />}
          accessibilityLabel="Save booking settings"
        />
      </View>

      {/* ── Tips card ───────────────────────────────────────────── */}
      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Ionicons name="bulb-outline" size={18} color={Colors.statusWarning} />
          <Text style={styles.tipsTitle} allowFontScaling={false}>Tips</Text>
        </View>
        {[
          "Use Manual confirmation if you want to screen clients before accepting.",
          "A 15-minute buffer helps you prepare between back-to-back sessions.",
          "A 24-hour cancellation policy protects against last-minute no-shows.",
          "Session instructions are sent automatically in every booking confirmation.",
        ].map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <View style={styles.tipDot} />
            <Text style={styles.tipText} allowFontScaling={false}>{tip}</Text>
          </View>
        ))}
      </View>

      <CancellationDropdown
        visible={showDropdown}
        value={cancellationPolicy}
        onSelect={setCancellationPolicy}
        onClose={() => setShowDropdown(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll:       { flex: 1 },
  content:      { paddingHorizontal: spacing.space4, paddingBottom: spacing.space10 },
  flatContent:  { paddingHorizontal: spacing.space4, paddingBottom: spacing.space10 },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.space3, paddingVertical: spacing.space10 },
  loadingText: { ...typeScale.bodyMD, color: Colors.textMuted },

  // Saved banner
  savedBanner: {
    flexDirection: "row", alignItems: "center", gap: spacing.space2,
    backgroundColor: Colors.statusSuccessBg, borderRadius: radius.radiusMD,
    borderWidth: 1, borderColor: Colors.statusSuccess,
    paddingHorizontal: spacing.space3, paddingVertical: spacing.space2,
    marginBottom: spacing.space4,
  },
  savedBannerText: { ...typeScale.labelSM, color: Colors.statusSuccess, fontWeight: "600" },

  sectionLabel: {
    ...typeScale.labelSM, color: Colors.textSecondary, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 0.7,
    marginBottom: spacing.space3, marginTop: spacing.space5,
  },

  // Confirmation cards
  confirmRow: { gap: spacing.space3, marginBottom: spacing.space2 },
  confirmCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.space3,
    backgroundColor: Colors.bgElevated, borderRadius: radius.radiusMD,
    borderWidth: 1.5, borderColor: Colors.borderSubtle,
    padding: spacing.space4,
  },
  confirmCardActive: {
    borderColor: Colors.actionPrimary,
    backgroundColor: Colors.bgPrimarySubtle,
  },
  confirmIconWrap: {
    width: 44, height: 44, borderRadius: radius.radiusMD,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  confirmContent: { flex: 1, gap: 3 },
  confirmTitle: { ...typeScale.headingSM, fontSize: 14, color: Colors.textPrimary, fontWeight: "600" },
  confirmDesc:  { ...typeScale.caption,   color: Colors.textMuted, lineHeight: 16 },
  confirmRadio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.borderSubtle,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  confirmRadioActive: { borderColor: Colors.actionPrimary },
  confirmRadioDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.actionPrimary,
  },

  // Numeric row
  numericRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.space3, marginBottom: 0 },
  numericInput: { width: 100 },
  numericUnit: { flex: 1, justifyContent: "center", paddingTop: 16 },
  unitText: { ...typeScale.bodyMD, color: Colors.textMuted },

  fieldHint: {
    ...typeScale.caption, color: Colors.textMuted,
    marginBottom: spacing.space3, marginTop: -spacing.space2, lineHeight: 16,
  },

  // Dropdown
  dropdownBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.space2,
    height: 56, borderRadius: radius.radiusMD, borderWidth: 1.5,
    borderColor: Colors.borderDefault, backgroundColor: Colors.bgSurface,
    paddingHorizontal: spacing.space4, marginBottom: spacing.space2,
  },
  dropdownBtnText: { ...typeScale.bodyMD, color: Colors.textPrimary, flex: 1 },

  // Dropdown modal
  ddOverlay: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: "flex-end" },
  ddSheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: radius.radius2XL, borderTopRightRadius: radius.radius2XL,
    paddingHorizontal: spacing.screenPaddingH, paddingTop: spacing.space4,
    maxHeight: "55%",
  },
  ddHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.space3 },
  ddTitle: { ...typeScale.headingSM, color: Colors.textPrimary, fontWeight: "700" },
  ddOption: {
    height: 52, flexDirection: "row", alignItems: "center",
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  ddOptionActive: { backgroundColor: Colors.bgPrimarySubtle },
  ddOptionText: { ...typeScale.bodyMD, color: Colors.textSecondary, flex: 1 },
  ddOptionTextActive: { color: Colors.actionPrimary, fontWeight: "600" },

  // Save error
  saveError: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.statusDangerBg, borderRadius: radius.radiusMD,
    borderWidth: 1, borderColor: Colors.statusDanger,
    padding: spacing.space3, marginBottom: spacing.space4,
  },
  saveErrorText: { ...typeScale.bodySM, color: Colors.statusDanger, flex: 1, lineHeight: 18 },

  // Buttons
  btnRow: { flexDirection: "row", gap: spacing.space3, marginTop: spacing.space4 },
  btnReset: { flex: 1 },
  btnSave:  { flex: 2 },

  // Tips card
  tipsCard: {
    backgroundColor: Colors.statusWarningBg, borderRadius: radius.radiusMD,
    borderWidth: 1, borderColor: Colors.statusWarning,
    padding: spacing.space4, marginTop: spacing.space5, gap: spacing.space3,
  },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: spacing.space2 },
  tipsTitle:  { ...typeScale.headingSM, color: Colors.statusWarning, fontWeight: "700" },
  tipRow:  { flexDirection: "row", alignItems: "flex-start", gap: spacing.space3 },
  tipDot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.statusWarning, marginTop: 6, flexShrink: 0 },
  tipText: { ...typeScale.bodySM, color: Colors.textMuted, flex: 1, lineHeight: 18 },
});
