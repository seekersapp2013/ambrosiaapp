/**
 * ReferralCreationForm
 * Provider-only form to refer a patient to other experts.
 * Rendered inside a BottomSheet triggered from booking-detail.tsx on COMPLETED bookings.
 *
 * Rules (enforced in UI and API):
 *   - Minimum 3 suggested experts
 *   - Maximum 10 suggested experts
 *   - Cannot add self
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface BookingInfo {
  _id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
}

interface SelectedExpert {
  userId: string;
  name: string;
  jobTitle: string;
}

interface ReferralCreationFormProps {
  booking: BookingInfo;
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ReferralCreationForm({
  booking,
  onSuccess,
  onCancel,
}: ReferralCreationFormProps) {
  const [title,           setTitle]           = useState("");
  const [healthNote,      setHealthNote]       = useState("");
  const [searchTerm,      setSearchTerm]       = useState("");
  const [debouncedSearch, setDebouncedSearch]  = useState("");
  const [selectedExperts, setSelectedExperts]  = useState<SelectedExpert[]>([]);
  const [showDropdown,    setShowDropdown]     = useState(false);
  const [submitting,      setSubmitting]       = useState(false);
  const [submitError,     setSubmitError]      = useState("");
  const [titleError,      setTitleError]       = useState("");
  const [noteError,       setNoteError]        = useState("");
  const [expertsError,    setExpertsError]     = useState("");

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Convex ─────────────────────────────────────────────────────────────────
  const searchResults = useQuery(
    api.bookingSubscribers.getProvidersWithPagination,
    debouncedSearch.length >= 2
      ? { searchTerm: debouncedSearch, limit: 8, offset: 0 }
      : "skip"
  );
  const createReferral = useMutation(api.referrals.createReferral);

  // ── Search debounce ────────────────────────────────────────────────────────
  function handleSearchChange(text: string) {
    setSearchTerm(text);
    setShowDropdown(text.length >= 2);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(text);
    }, 350);
  }

  // ── Add expert ─────────────────────────────────────────────────────────────
  const handleAddExpert = useCallback((provider: any) => {
    const userId = provider.subscriber.userId;
    const name   = provider.profile?.name ?? provider.profile?.username ?? "Provider";
    const jobTitle = provider.subscriber.jobTitle ?? "";

    // Already selected
    if (selectedExperts.find(e => e.userId === userId)) return;
    // Max 10
    if (selectedExperts.length >= 10) return;

    setSelectedExperts(prev => [...prev, { userId, name, jobTitle }]);
    setSearchTerm("");
    setDebouncedSearch("");
    setShowDropdown(false);
    setExpertsError("");
  }, [selectedExperts]);

  // ── Remove expert ──────────────────────────────────────────────────────────
  const handleRemoveExpert = useCallback((userId: string) => {
    setSelectedExperts(prev => prev.filter(e => e.userId !== userId));
  }, []);

  // ── Validate ───────────────────────────────────────────────────────────────
  function validate(): boolean {
    let valid = true;
    setTitleError("");
    setNoteError("");
    setExpertsError("");

    if (!title.trim()) {
      setTitleError("Title is required");
      valid = false;
    }
    if (!healthNote.trim()) {
      setNoteError("Health note is required");
      valid = false;
    }
    if (selectedExperts.length < 3) {
      setExpertsError(`Add at least ${3 - selectedExperts.length} more expert${3 - selectedExperts.length !== 1 ? "s" : ""} (minimum 3)`);
      valid = false;
    }
    return valid;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");

    try {
      await createReferral({
        patientId:        booking.clientId as any,
        title:            title.trim(),
        healthNote:       healthNote.trim(),
        suggestedExperts: selectedExperts.map(e => e.userId as any),
      });
      onSuccess();
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to create referral. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Providers from search, filtered to exclude already selected and self
  const filteredProviders = (searchResults?.providers ?? []).filter(
    (p: any) =>
      !selectedExperts.find(e => e.userId === p.subscriber.userId) &&
      p.subscriber.userId !== booking.clientId
  );

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Patient info header ───────────────────────────────── */}
      <View style={styles.patientCard}>
        <View style={styles.patientAvatar}>
          <Text style={styles.patientAvatarInitial} allowFontScaling={false}>
            {booking.clientName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.patientInfo}>
          <Text style={styles.patientLabel} allowFontScaling={false}>Referring patient</Text>
          <Text style={styles.patientName} numberOfLines={1} allowFontScaling={false}>
            {booking.clientName}
          </Text>
        </View>
        <View style={styles.referralTypeBadge}>
          <Ionicons name="git-network-outline" size={14} color={Colors.actionPrimary} />
          <Text style={styles.referralTypeBadgeText} allowFontScaling={false}>Referral</Text>
        </View>
      </View>

      {/* ── Title ─────────────────────────────────────────────── */}
      <AppInput
        label="Referral Title"
        placeholder="e.g. Anxiety & Depression Support"
        value={title}
        onChangeText={setTitle}
        error={titleError}
        returnKeyType="next"
        accessibilityLabel="Referral title"
      />

      {/* ── Health note ───────────────────────────────────────── */}
      <TextareaInput
        label="Health Note"
        placeholder="Describe the patient's condition and why you're referring them. This is only shared with the expert they select."
        value={healthNote}
        onChangeText={setHealthNote}
        error={noteError}
        maxLength={600}
        accessibilityLabel="Health note for referred expert"
      />

      {/* Privacy notice */}
      <View style={styles.privacyNote}>
        <Ionicons name="lock-closed-outline" size={13} color={Colors.statusInfo} />
        <Text style={styles.privacyNoteText} allowFontScaling={false}>
          The health note is private — only visible to the expert the patient selects.
        </Text>
      </View>

      {/* ── Expert search ─────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Suggest Experts (min. 3)</Text>
      <View style={styles.searchWrap}>
        <AppInput
          label=""
          placeholder="Search by name, specialization…"
          value={searchTerm}
          onChangeText={handleSearchChange}
          leadingIcon={<Ionicons name="search-outline" size={18} color={Colors.iconSecondary} />}
          returnKeyType="search"
          autoCapitalize="none"
          accessibilityLabel="Search for experts to suggest"
        />

        {/* Dropdown results */}
        {showDropdown && (
          <View style={styles.dropdown}>
            {searchResults === undefined ? (
              <View style={styles.dropdownLoading}>
                <ActivityIndicator size="small" color={Colors.actionPrimary} />
              </View>
            ) : filteredProviders.length === 0 ? (
              <View style={styles.dropdownEmpty}>
                <Text style={styles.dropdownEmptyText} allowFontScaling={false}>
                  No providers found
                </Text>
              </View>
            ) : (
              filteredProviders.map((p: any) => {
                const name = p.profile?.name ?? p.profile?.username ?? "Provider";
                return (
                  <TouchableOpacity
                    key={p.subscriber._id}
                    style={styles.dropdownItem}
                    onPress={() => handleAddExpert(p)}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${name}`}
                  >
                    <View style={styles.dropdownAvatar}>
                      <Text style={styles.dropdownAvatarText} allowFontScaling={false}>
                        {name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.dropdownInfo}>
                      <Text style={styles.dropdownName} numberOfLines={1} allowFontScaling={false}>
                        {name}
                      </Text>
                      <Text style={styles.dropdownTitle} numberOfLines={1} allowFontScaling={false}>
                        {p.subscriber.jobTitle}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={Colors.actionPrimary} />
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </View>

      {/* ── Selected experts ──────────────────────────────────── */}
      {selectedExperts.length > 0 && (
        <View style={styles.selectedSection}>
          <View style={styles.selectedHeader}>
            <Text style={styles.selectedCount} allowFontScaling={false}>
              {selectedExperts.length} selected
            </Text>
            {selectedExperts.length < 3 && (
              <Text style={styles.selectedNeed} allowFontScaling={false}>
                Need {3 - selectedExperts.length} more
              </Text>
            )}
            {selectedExperts.length >= 3 && (
              <View style={styles.selectedOk}>
                <Ionicons name="checkmark-circle" size={13} color={Colors.statusSuccess} />
                <Text style={styles.selectedOkText} allowFontScaling={false}>Minimum reached</Text>
              </View>
            )}
          </View>
          {selectedExperts.map((expert) => (
            <View key={expert.userId} style={styles.selectedCard}>
              <View style={styles.selectedAvatar}>
                <Text style={styles.selectedAvatarText} allowFontScaling={false}>
                  {expert.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedName} numberOfLines={1} allowFontScaling={false}>
                  {expert.name}
                </Text>
                <Text style={styles.selectedTitle} numberOfLines={1} allowFontScaling={false}>
                  {expert.jobTitle}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveExpert(expert.userId)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${expert.name}`}
              >
                <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Experts error */}
      {expertsError !== "" && (
        <View style={styles.expertsError}>
          <Ionicons name="alert-circle-outline" size={14} color={Colors.statusDanger} />
          <Text style={styles.expertsErrorText} allowFontScaling={false}>{expertsError}</Text>
        </View>
      )}

      {/* ── Submit error ──────────────────────────────────────── */}
      {submitError !== "" && (
        <View style={styles.submitError}>
          <Ionicons name="alert-circle-outline" size={15} color={Colors.statusDanger} />
          <Text style={styles.submitErrorText} allowFontScaling={false}>{submitError}</Text>
        </View>
      )}

      {/* ── Info card ─────────────────────────────────────────── */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.statusInfo} />
          <Text style={styles.infoText} allowFontScaling={false}>
            The patient chooses one expert from your list. When they book a session, you earn a 10% referral commission.
          </Text>
        </View>
      </View>

      {/* ── Buttons ───────────────────────────────────────────── */}
      <View style={styles.btnRow}>
        <SecondaryButton
          label="Cancel"
          onPress={onCancel}
          style={styles.btnCancel}
          accessibilityLabel="Cancel referral creation"
        />
        <PrimaryButton
          label="Send Referral"
          onPress={handleSubmit}
          loading={submitting}
          style={styles.btnSubmit}
          icon={<Ionicons name="git-network-outline" size={18} color="#FFFFFF" />}
          accessibilityLabel="Send referral to patient"
        />
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.space4, paddingBottom: spacing.space8 },

  // Patient card
  patientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
    marginBottom: spacing.space4,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  patientAvatarInitial: { ...typeScale.headingSM, color: Colors.actionPrimary, fontWeight: "700" },
  patientInfo: { flex: 1, gap: 2 },
  patientLabel: { ...typeScale.caption, color: Colors.textMuted },
  patientName: { ...typeScale.headingSM, fontSize: 13, color: Colors.textPrimary, fontWeight: "600" },
  referralTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
  },
  referralTypeBadgeText: { fontSize: 10, fontWeight: "600", color: Colors.actionPrimary },

  // Privacy note
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusSM,
    padding: spacing.space2,
    marginTop: -spacing.space3,
    marginBottom: spacing.space4,
  },
  privacyNoteText: { ...typeScale.caption, color: Colors.statusInfo, flex: 1, lineHeight: 16 },

  // Section label
  sectionLabel: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: spacing.space2,
  },

  // Search wrap (relative positioning for dropdown)
  searchWrap: {
    position: "relative",
    zIndex: 20,
  },

  // Dropdown
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 30,
    overflow: "hidden",
    maxHeight: 240,
  },
  dropdownLoading: { padding: spacing.space4, alignItems: "center" },
  dropdownEmpty: { padding: spacing.space4, alignItems: "center" },
  dropdownEmptyText: { ...typeScale.bodySM, color: Colors.textDisabled },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  dropdownAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dropdownAvatarText: { fontSize: 12, fontWeight: "700", color: Colors.actionPrimary },
  dropdownInfo: { flex: 1, gap: 2 },
  dropdownName: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600", fontSize: 12 },
  dropdownTitle: { ...typeScale.caption, color: Colors.textMuted, fontSize: 10 },

  // Selected section
  selectedSection: {
    marginTop: spacing.space3,
    marginBottom: spacing.space2,
    gap: spacing.space2,
  },
  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.space2,
  },
  selectedCount: { ...typeScale.labelSM, color: Colors.textSecondary, fontWeight: "600" },
  selectedNeed: { ...typeScale.caption, color: Colors.statusWarning },
  selectedOk: { flexDirection: "row", alignItems: "center", gap: 4 },
  selectedOkText: { ...typeScale.caption, color: Colors.statusSuccess, fontWeight: "600" },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
  },
  selectedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  selectedAvatarText: { fontSize: 12, fontWeight: "700", color: Colors.actionPrimary },
  selectedInfo: { flex: 1, gap: 2 },
  selectedName: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600", fontSize: 12 },
  selectedTitle: { ...typeScale.caption, color: Colors.textMuted, fontSize: 10 },

  // Errors
  expertsError: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    marginTop: spacing.space2,
    marginBottom: spacing.space2,
  },
  expertsErrorText: { ...typeScale.caption, color: Colors.statusDanger, flex: 1 },
  submitError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusDangerBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.statusDanger,
    padding: spacing.space3,
    marginBottom: spacing.space3,
  },
  submitErrorText: { ...typeScale.bodySM, color: Colors.statusDanger, flex: 1, lineHeight: 18 },

  // Info card
  infoCard: {
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
    marginBottom: spacing.space4,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.space2 },
  infoText: { ...typeScale.caption, color: Colors.statusInfo, flex: 1, lineHeight: 17 },

  // Buttons
  btnRow: { flexDirection: "row", gap: spacing.space3 },
  btnCancel: { flex: 1 },
  btnSubmit: { flex: 2 },
});
