/**
 * StandaloneReferralCreationForm
 *
 * 4-step wizard for creating a referral from anywhere in the app.
 * Follows the same wizard design pattern as SignUpWizard — progress bar,
 * step title, back/next nav — but uses the booking UI token system
 * (Colors, typeScale, spacing, radius) instead of Tamagui.
 *
 * Step 1 — Patient        select who is being referred
 * Step 2 — Details        referral title + private health note
 * Step 3 — Suggest Experts  add 3–10 providers for the patient to choose from
 * Step 4 — Review         optional past-session link + summary → submit
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppInput, TextareaInput } from "@/components/ui/Input";
import { WizardProgressBar } from "@/components/ui/ScreenHeader";
import { useTabBarHeight } from "@/utils/useDeviceClass";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SelectedPatient {
  userId: string;
  name: string;
  username: string;
}

interface SelectedExpert {
  userId: string;
  name: string;
  jobTitle: string;
}

interface SelectedSession {
  bookingId: string;
  label: string;
}

export interface StandaloneReferralCreationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 4;
const STEP_LABELS = ["Patient", "Details", "Suggest Experts", "Review"];
const STEP_SUBTITLES = [
  "Who are you referring?",
  "What is this referral about?",
  "Which providers should the patient choose from?",
  "Confirm and send the referral",
];

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatSessionLabel(s: {
  sessionDate: string;
  sessionTime: string;
  status: string;
}): string {
  try {
    const d = new Date(`${s.sessionDate}T${s.sessionTime}`);
    const dateStr = d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${dateStr} · ${s.sessionTime} (${s.status})`;
  } catch {
    return `${s.sessionDate} ${s.sessionTime}`;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
export function StandaloneReferralCreationForm({
  onSuccess,
  onCancel,
}: StandaloneReferralCreationFormProps) {
  // ── Wizard state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);

  // Tab-bar-aware bottom padding so nav buttons never sit behind the nav bar
  const insets       = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  // The BottomSheet already pads `space5 + insets.bottom`; we add the tab bar
  // height on top so the scroll content ends well above the nav bar on Android.
  const bottomPad = tabBarHeight + insets.bottom + spacing.space8;

  // ── Step 1: Patient ──────────────────────────────────────────────────────
  const [patientSearch,          setPatientSearch]          = useState("");
  const [debouncedPatientSearch, setDebouncedPatientSearch] = useState("");
  const [selectedPatient,        setSelectedPatient]        = useState<SelectedPatient | null>(null);
  const [showPatientDropdown,    setShowPatientDropdown]    = useState(false);
  const [patientError,           setPatientError]           = useState("");

  // ── Step 2: Details ──────────────────────────────────────────────────────
  const [title,      setTitle]      = useState("");
  const [healthNote, setHealthNote] = useState("");
  const [titleError, setTitleError] = useState("");
  const [noteError,  setNoteError]  = useState("");

  // ── Step 3: Experts ──────────────────────────────────────────────────────
  const [expertSearch,       setExpertSearch]       = useState("");
  const [debouncedExpert,    setDebouncedExpert]    = useState("");
  const [selectedExperts,    setSelectedExperts]    = useState<SelectedExpert[]>([]);
  const [showExpertDropdown, setShowExpertDropdown] = useState(false);
  const [expertsError,       setExpertsError]       = useState("");

  // ── Step 4: Review / session ─────────────────────────────────────────────
  const [selectedSession,   setSelectedSession]   = useState<SelectedSession | null>(null);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [submitting,        setSubmitting]        = useState(false);
  const [submitError,       setSubmitError]       = useState("");

  // ── Debounce refs ─────────────────────────────────────────────────────────
  const patientDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expertDebounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scroll ref — reset to top on step change ──────────────────────────────
  const scrollRef = useRef<ScrollView>(null);

  // ── Convex ────────────────────────────────────────────────────────────────
  const patientResults = useQuery(
    api.profiles.searchProfiles,
    debouncedPatientSearch.length >= 2 ? { query: debouncedPatientSearch } : "skip"
  );

  const expertResults = useQuery(
    api.bookingSubscribers.getProvidersWithPagination,
    debouncedExpert.length >= 2
      ? { searchTerm: debouncedExpert, limit: 8, offset: 0 }
      : "skip"
  );

  const pastSessions = useQuery(
    api.bookings.getProviderSessionsWithPatient,
    selectedPatient ? { patientId: selectedPatient.userId as any } : "skip"
  );

  const createReferral = useMutation(api.referrals.createReferral);

  // ── Search debounces ──────────────────────────────────────────────────────
  function handlePatientSearch(text: string) {
    setPatientSearch(text);
    setShowPatientDropdown(text.length >= 2);
    if (patientDebounce.current) clearTimeout(patientDebounce.current);
    patientDebounce.current = setTimeout(() => setDebouncedPatientSearch(text), 350);
  }

  function handleExpertSearch(text: string) {
    setExpertSearch(text);
    setShowExpertDropdown(text.length >= 2);
    if (expertDebounce.current) clearTimeout(expertDebounce.current);
    expertDebounce.current = setTimeout(() => setDebouncedExpert(text), 350);
  }

  // ── Patient selection ─────────────────────────────────────────────────────
  function handleSelectPatient(profile: any) {
    const name = profile.name ?? profile.username ?? "Patient";
    setSelectedPatient({ userId: profile.userId, name, username: profile.username ?? "" });
    setPatientSearch("");
    setDebouncedPatientSearch("");
    setShowPatientDropdown(false);
    setPatientError("");
    setSelectedSession(null);
  }

  // ── Expert selection ──────────────────────────────────────────────────────
  const handleAddExpert = useCallback(
    (provider: any) => {
      const userId   = provider.subscriber.userId;
      const name     = provider.profile?.name ?? provider.profile?.username ?? "Provider";
      const jobTitle = provider.subscriber.jobTitle ?? "";
      if (selectedExperts.find((e) => e.userId === userId)) return;
      if (selectedExperts.length >= 10) return;
      setSelectedExperts((prev) => [...prev, { userId, name, jobTitle }]);
      setExpertSearch("");
      setDebouncedExpert("");
      setShowExpertDropdown(false);
      setExpertsError("");
    },
    [selectedExperts]
  );

  const handleRemoveExpert = useCallback((userId: string) => {
    setSelectedExperts((prev) => prev.filter((e) => e.userId !== userId));
  }, []);

  // ── Per-step validation ───────────────────────────────────────────────────
  function validateStep1(): boolean {
    if (!selectedPatient) {
      setPatientError("Please select a patient to refer");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    let ok = true;
    setTitleError("");
    setNoteError("");
    if (!title.trim()) { setTitleError("Title is required"); ok = false; }
    if (!healthNote.trim()) { setNoteError("Health note is required"); ok = false; }
    return ok;
  }

  function validateStep3(): boolean {
    if (selectedExperts.length < 3) {
      setExpertsError(
        `Add at least ${3 - selectedExperts.length} more expert${3 - selectedExperts.length !== 1 ? "s" : ""} (minimum 3)`
      );
      return false;
    }
    return true;
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleNext() {
    const validators: Record<number, () => boolean> = {
      1: validateStep1,
      2: validateStep2,
      3: validateStep3,
    };
    if (validators[step] && !validators[step]()) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS) as any);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  function handleBack() {
    if (step === 1) { onCancel(); return; }
    setStep((s) => Math.max(s - 1, 1) as any);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      await createReferral({
        patientId:        selectedPatient!.userId as any,
        title:            title.trim(),
        healthNote:       healthNote.trim(),
        suggestedExperts: selectedExperts.map((e) => e.userId as any),
        referralSource:   "STANDALONE",
        sessionId:        selectedSession ? (selectedSession.bookingId as any) : undefined,
      });
      onSuccess();
    } catch (err: any) {
      setSubmitError(err?.message ?? "Failed to create referral. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredPatients = (patientResults ?? []).filter(
    (p: any) => !selectedPatient || p.userId !== selectedPatient.userId
  );

  const filteredExperts = (expertResults?.providers ?? []).filter(
    (p: any) =>
      !selectedExperts.find((e) => e.userId === p.subscriber.userId) &&
      (!selectedPatient || p.subscriber.userId !== selectedPatient.userId)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Progress header ──────────────────────────────────── */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text style={styles.stepCounter} allowFontScaling={false}>
              Step {step} of {TOTAL_STEPS}
            </Text>
            <Text style={styles.stepName} allowFontScaling={false}>
              {STEP_LABELS[step - 1]}
            </Text>
          </View>
          <WizardProgressBar step={step} total={TOTAL_STEPS} style={styles.progressBar} />
        </View>

        {/* ── Step title ───────────────────────────────────────── */}
        <View style={styles.stepHeader}>
          <Text style={styles.stepTitle} allowFontScaling={false}>
            {STEP_LABELS[step - 1]}
          </Text>
          <Text style={styles.stepSubtitle} allowFontScaling={false}>
            {STEP_SUBTITLES[step - 1]}
          </Text>
        </View>

        {/* ══════════════════════════════════════════════════════ */}
        {/* STEP 1 — Patient                                       */}
        {/* ══════════════════════════════════════════════════════ */}
        {step === 1 && (
          <View style={styles.stepBody}>
            {selectedPatient ? (
              <View style={styles.selectedPersonCard}>
                <View style={styles.personAvatar}>
                  <Text style={styles.personAvatarInitial} allowFontScaling={false}>
                    {selectedPatient.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.personInfo}>
                  <Text style={styles.personName} numberOfLines={1} allowFontScaling={false}>
                    {selectedPatient.name}
                  </Text>
                  {!!selectedPatient.username && (
                    <Text style={styles.personUsername} allowFontScaling={false}>
                      @{selectedPatient.username}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => { setSelectedPatient(null); setSelectedSession(null); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel="Change patient"
                >
                  <Ionicons name="close-circle" size={22} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.searchWrapHigh}>
                <AppInput
                  forceDark
                  label="Search by name or username"
                  placeholder="Type at least 2 characters…"
                  value={patientSearch}
                  onChangeText={handlePatientSearch}
                  leadingIcon={
                    <Ionicons name="person-search-outline" size={18} color={Colors.iconSecondary} />
                  }
                  error={patientError}
                  returnKeyType="search"
                  autoCapitalize="none"
                  accessibilityLabel="Search for a patient"
                />
                {showPatientDropdown && (
                  <View style={styles.dropdown}>
                    {patientResults === undefined ? (
                      <View style={styles.dropdownLoading}>
                        <ActivityIndicator size="small" color={Colors.actionPrimary} />
                        <Text style={styles.dropdownLoadingText} allowFontScaling={false}>
                          Searching…
                        </Text>
                      </View>
                    ) : filteredPatients.length === 0 ? (
                      <View style={styles.dropdownEmpty}>
                        <Ionicons name="search-outline" size={20} color={Colors.textDisabled} />
                        <Text style={styles.dropdownEmptyText} allowFontScaling={false}>
                          No users found
                        </Text>
                      </View>
                    ) : (
                      filteredPatients.slice(0, 6).map((p: any) => {
                        const name = p.name ?? p.username ?? "User";
                        return (
                          <TouchableOpacity
                            key={p._id}
                            style={styles.dropdownItem}
                            onPress={() => handleSelectPatient(p)}
                            activeOpacity={0.82}
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
                              {p.username && (
                                <Text style={styles.dropdownSub} numberOfLines={1} allowFontScaling={false}>
                                  @{p.username}
                                </Text>
                              )}
                            </View>
                            <Ionicons name="add-circle-outline" size={20} color={Colors.actionPrimary} />
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Helper tip */}
            {!selectedPatient && (
              <View style={styles.tipCard}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.statusInfo} />
                <Text style={styles.tipText} allowFontScaling={false}>
                  Search by the patient's display name or @username. They must have an account on the platform.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* STEP 2 — Details                                       */}
        {/* ══════════════════════════════════════════════════════ */}
        {step === 2 && (
          <View style={styles.stepBody}>
            {/* Patient chip — context reminder */}
            <View style={styles.contextChip}>
              <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.contextChipText} numberOfLines={1} allowFontScaling={false}>
                Referring: {selectedPatient?.name}
              </Text>
            </View>

            <AppInput
              forceDark
              label="Referral Title"
              placeholder="e.g. Anxiety & Depression Support"
              value={title}
              onChangeText={setTitle}
              error={titleError}
              returnKeyType="next"
              accessibilityLabel="Referral title"
            />

            <TextareaInput
              forceDark
              label="Health Note"
              placeholder="Describe the patient's condition and why you're referring them…"
              value={healthNote}
              onChangeText={setHealthNote}
              error={noteError}
              maxLength={600}
              accessibilityLabel="Health note"
            />

            <View style={styles.privacyNote}>
              <Ionicons name="lock-closed-outline" size={13} color={Colors.statusInfo} />
              <Text style={styles.privacyNoteText} allowFontScaling={false}>
                The health note is private — only the expert the patient selects can see it.
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* STEP 3 — Suggest Experts                               */}
        {/* ══════════════════════════════════════════════════════ */}
        {step === 3 && (
          <View style={styles.stepBody}>
            {/* Context chip */}
            <View style={styles.contextChip}>
              <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
              <Text style={styles.contextChipText} numberOfLines={1} allowFontScaling={false}>
                Referring: {selectedPatient?.name}
              </Text>
            </View>

            {/* Expert search */}
            <View style={styles.searchWrapHigh}>
              <AppInput
                forceDark
                label={`Suggest Experts (${selectedExperts.length}/10 · min 3)`}
                placeholder="Search by name or specialization…"
                value={expertSearch}
                onChangeText={handleExpertSearch}
                leadingIcon={
                  <Ionicons name="search-outline" size={18} color={Colors.iconSecondary} />
                }
                returnKeyType="search"
                autoCapitalize="none"
                accessibilityLabel="Search for experts"
              />
              {showExpertDropdown && (
                <View style={styles.dropdown}>
                  {expertResults === undefined ? (
                    <View style={styles.dropdownLoading}>
                      <ActivityIndicator size="small" color={Colors.actionPrimary} />
                      <Text style={styles.dropdownLoadingText} allowFontScaling={false}>
                        Searching…
                      </Text>
                    </View>
                  ) : filteredExperts.length === 0 ? (
                    <View style={styles.dropdownEmpty}>
                      <Ionicons name="search-outline" size={20} color={Colors.textDisabled} />
                      <Text style={styles.dropdownEmptyText} allowFontScaling={false}>
                        No providers found
                      </Text>
                    </View>
                  ) : (
                    filteredExperts.map((p: any) => {
                      const name = p.profile?.name ?? p.profile?.username ?? "Provider";
                      return (
                        <TouchableOpacity
                          key={p.subscriber._id}
                          style={styles.dropdownItem}
                          onPress={() => handleAddExpert(p)}
                          activeOpacity={0.82}
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
                            <Text style={styles.dropdownSub} numberOfLines={1} allowFontScaling={false}>
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

            {/* Selected experts chips */}
            {selectedExperts.length > 0 && (
              <View style={styles.selectedSection}>
                <View style={styles.selectedHeader}>
                  <Text style={styles.selectedCount} allowFontScaling={false}>
                    {selectedExperts.length} selected
                  </Text>
                  {selectedExperts.length < 3 ? (
                    <Text style={styles.selectedNeed} allowFontScaling={false}>
                      Need {3 - selectedExperts.length} more
                    </Text>
                  ) : (
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
                    >
                      <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {expertsError !== "" && (
              <View style={styles.fieldError}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.statusDanger} />
                <Text style={styles.fieldErrorText} allowFontScaling={false}>{expertsError}</Text>
              </View>
            )}

            <View style={styles.tipCard}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.statusInfo} />
              <Text style={styles.tipText} allowFontScaling={false}>
                The patient will choose one expert from this list. You earn a 10% commission when they complete a session.
              </Text>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════ */}
        {/* STEP 4 — Review & Submit                               */}
        {/* ══════════════════════════════════════════════════════ */}
        {step === 4 && (
          <View style={styles.stepBody}>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              {/* Patient row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconWrap}>
                  <Ionicons name="person-outline" size={15} color={Colors.actionPrimary} />
                </View>
                <View style={styles.summaryTextWrap}>
                  <Text style={styles.summaryLabel} allowFontScaling={false}>Patient</Text>
                  <Text style={styles.summaryValue} allowFontScaling={false}>
                    {selectedPatient?.name}
                    {selectedPatient?.username ? ` · @${selectedPatient.username}` : ""}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              {/* Title row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconWrap}>
                  <Ionicons name="document-text-outline" size={15} color={Colors.actionPrimary} />
                </View>
                <View style={styles.summaryTextWrap}>
                  <Text style={styles.summaryLabel} allowFontScaling={false}>Title</Text>
                  <Text style={styles.summaryValue} allowFontScaling={false}>{title}</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              {/* Experts row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconWrap}>
                  <Ionicons name="people-outline" size={15} color={Colors.actionPrimary} />
                </View>
                <View style={styles.summaryTextWrap}>
                  <Text style={styles.summaryLabel} allowFontScaling={false}>
                    Suggested Experts ({selectedExperts.length})
                  </Text>
                  <Text style={styles.summaryValue} allowFontScaling={false}>
                    {selectedExperts.map((e) => e.name).join(", ")}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              {/* Health note row */}
              <View style={styles.summaryRow}>
                <View style={styles.summaryIconWrap}>
                  <Ionicons name="lock-closed-outline" size={15} color={Colors.statusInfo} />
                </View>
                <View style={styles.summaryTextWrap}>
                  <Text style={styles.summaryLabel} allowFontScaling={false}>Health Note</Text>
                  <Text style={[styles.summaryValue, styles.summaryValueMuted]} numberOfLines={3} allowFontScaling={false}>
                    {healthNote}
                  </Text>
                </View>
              </View>
            </View>

            {/* Optional session link */}
            <View style={styles.sessionSection}>
              <View style={styles.sessionLabelRow}>
                <Text style={styles.sessionSectionLabel} allowFontScaling={false}>
                  Link to a Past Session
                </Text>
                <View style={styles.optionalBadge}>
                  <Text style={styles.optionalBadgeText} allowFontScaling={false}>Optional</Text>
                </View>
              </View>

              {selectedSession ? (
                <View style={styles.selectedSessionCard}>
                  <Ionicons name="calendar-outline" size={16} color={Colors.actionPrimary} />
                  <Text style={styles.selectedSessionLabel} numberOfLines={1} allowFontScaling={false}>
                    {selectedSession.label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelectedSession(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.sessionPickerBtn}
                  onPress={() => setShowSessionPicker((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={16} color={Colors.iconSecondary} />
                  <Text style={styles.sessionPickerBtnText} allowFontScaling={false}>
                    {pastSessions === undefined
                      ? "Loading sessions…"
                      : (pastSessions?.length ?? 0) === 0
                      ? "No past sessions with this patient"
                      : showSessionPicker
                      ? "Hide sessions"
                      : `Choose a session (${pastSessions?.length ?? 0} available)`}
                  </Text>
                  {(pastSessions?.length ?? 0) > 0 && (
                    <Ionicons
                      name={showSessionPicker ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={Colors.iconSecondary}
                    />
                  )}
                </TouchableOpacity>
              )}

              {showSessionPicker && !selectedSession && (pastSessions?.length ?? 0) > 0 && (
                <View style={styles.sessionList}>
                  {pastSessions!.map((s: any) => {
                    const label = formatSessionLabel(s);
                    return (
                      <TouchableOpacity
                        key={s._id}
                        style={styles.sessionListItem}
                        onPress={() => {
                          setSelectedSession({ bookingId: s._id, label });
                          setShowSessionPicker(false);
                        }}
                        activeOpacity={0.82}
                      >
                        <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
                        <Text style={styles.sessionListItemText} numberOfLines={1} allowFontScaling={false}>
                          {label}
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={Colors.iconSecondary} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Circle creation notice */}
            <View style={styles.circleNotice}>
              <Ionicons name="people-circle-outline" size={16} color={Colors.statusWarning} />
              <Text style={styles.circleNoticeText} allowFontScaling={false}>
                Once the patient selects an expert, a private circle will be created for all three of you to communicate.
              </Text>
            </View>

            {/* Submit error */}
            {submitError !== "" && (
              <View style={styles.submitError}>
                <Ionicons name="alert-circle-outline" size={15} color={Colors.statusDanger} />
                <Text style={styles.submitErrorText} allowFontScaling={false}>{submitError}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Navigation buttons ────────────────────────────────── */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleBack}
            disabled={submitting}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={step === 1 ? "Cancel" : "Back"}
          >
            <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
            <Text style={styles.backBtnText} allowFontScaling={false}>
              {step === 1 ? "Cancel" : "Back"}
            </Text>
          </TouchableOpacity>

          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={handleNext}
              disabled={submitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Next step"
            >
              <Text style={styles.nextBtnText} allowFontScaling={false}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, submitting && styles.nextBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Send referral"
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.nextBtnText} allowFontScaling={false}>Sending…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="git-network-outline" size={18} color="#fff" />
                  <Text style={styles.nextBtnText} allowFontScaling={false}>Send Referral</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  kav: { flex: 1 },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space2,
    // paddingBottom is applied dynamically via bottomPad (tab-bar + safe-area aware)
  },

  // ── Progress header ───────────────────────────────────────────────────────
  progressSection: { marginBottom: spacing.space5 },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.space2,
  },
  stepCounter: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  stepName: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  progressBar: {
    // WizardProgressBar already has height/radius — just need width
  },

  // ── Step title ────────────────────────────────────────────────────────────
  stepHeader: {
    marginBottom: spacing.space5,
    gap: spacing.space1,
  },
  stepTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  stepSubtitle: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    lineHeight: 22,
  },

  // ── Step body ─────────────────────────────────────────────────────────────
  stepBody: { gap: spacing.space4 },

  // ── Context chip ──────────────────────────────────────────────────────────
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    alignSelf: "flex-start",
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusFull,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  contextChipText: {
    ...typeScale.caption,
    color: Colors.textMuted,
    maxWidth: 200,
  },

  // ── Selected patient card ─────────────────────────────────────────────────
  selectedPersonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
    padding: spacing.space4,
  },
  personAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  personAvatarInitial: { ...typeScale.headingSM, color: Colors.actionPrimary, fontWeight: "700" },
  personInfo: { flex: 1, gap: 3 },
  personName: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600", fontSize: 15 },
  personUsername: { ...typeScale.caption, color: Colors.textMuted },

  // ── Search wrap (needs high zIndex for dropdown) ──────────────────────────
  searchWrapHigh: { position: "relative", zIndex: 30 },

  // ── Dropdown ─────────────────────────────────────────────────────────────
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
    zIndex: 40,
    overflow: "hidden",
    maxHeight: 260,
  },
  dropdownLoading: {
    flexDirection: "row",
    padding: spacing.space4,
    alignItems: "center",
    gap: spacing.space2,
  },
  dropdownLoadingText: { ...typeScale.bodySM, color: Colors.textMuted },
  dropdownEmpty: {
    padding: spacing.space4,
    alignItems: "center",
    gap: spacing.space2,
  },
  dropdownEmptyText: { ...typeScale.bodySM, color: Colors.textDisabled },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  dropdownAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  dropdownAvatarText: { fontSize: 13, fontWeight: "700", color: Colors.actionPrimary },
  dropdownInfo: { flex: 1, gap: 2 },
  dropdownName: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600" },
  dropdownSub: { ...typeScale.caption, color: Colors.textMuted },

  // ── Selected experts ──────────────────────────────────────────────────────
  selectedSection: { gap: spacing.space2 },
  selectedHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCount: { ...typeScale.labelSM, color: Colors.textSecondary, fontWeight: "600" },
  selectedNeed: { ...typeScale.caption, color: Colors.statusWarning },
  selectedOk: { flexDirection: "row", alignItems: "center", gap: 4 },
  selectedOkText: { ...typeScale.caption, color: Colors.statusSuccess, fontWeight: "600" },
  selectedCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.borderSubtle,
    paddingHorizontal: spacing.space3, paddingVertical: spacing.space2,
  },
  selectedAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  selectedAvatarText: { fontSize: 12, fontWeight: "700", color: Colors.actionPrimary },
  selectedInfo: { flex: 1, gap: 2 },
  selectedName: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600", fontSize: 12 },
  selectedTitle: { ...typeScale.caption, color: Colors.textMuted, fontSize: 10 },

  // ── Privacy note ──────────────────────────────────────────────────────────
  privacyNote: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusSM,
    padding: spacing.space3,
  },
  privacyNoteText: { ...typeScale.caption, color: Colors.statusInfo, flex: 1, lineHeight: 16 },

  // ── Tip card ──────────────────────────────────────────────────────────────
  tipCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: spacing.space3,
  },
  tipText: { ...typeScale.caption, color: Colors.statusInfo, flex: 1, lineHeight: 17 },

  // ── Field error ───────────────────────────────────────────────────────────
  fieldError: {
    flexDirection: "row", alignItems: "center", gap: spacing.space2,
  },
  fieldErrorText: { ...typeScale.caption, color: Colors.statusDanger, flex: 1 },

  // ── Review: summary card ──────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  summaryRow: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space3,
    padding: spacing.space4,
  },
  summaryIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
    marginTop: 1,
  },
  summaryTextWrap: { flex: 1, gap: 3 },
  summaryLabel: { ...typeScale.caption, color: Colors.textMuted, fontWeight: "600" },
  summaryValue: { ...typeScale.bodySM, color: Colors.textPrimary, lineHeight: 20 },
  summaryValueMuted: { color: Colors.textSecondary, fontStyle: "italic" },
  summaryDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderSubtle,
    marginHorizontal: spacing.space4,
  },

  // ── Review: session section ───────────────────────────────────────────────
  sessionSection: { gap: spacing.space2 },
  sessionLabelRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.space2,
  },
  sessionSectionLabel: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  optionalBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  optionalBadgeText: { fontSize: 10, color: Colors.textMuted, fontWeight: "600" },
  sessionPickerBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.space2,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: spacing.space3,
  },
  sessionPickerBtnText: { ...typeScale.bodySM, color: Colors.textMuted, flex: 1 },
  selectedSessionCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: spacing.space3,
  },
  selectedSessionLabel: { ...typeScale.bodySM, color: Colors.textPrimary, flex: 1 },
  sessionList: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.borderDefault,
    overflow: "hidden",
  },
  sessionListItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.space2,
    paddingHorizontal: spacing.space3, paddingVertical: spacing.space3,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.borderSubtle,
  },
  sessionListItemText: { ...typeScale.bodySM, color: Colors.textPrimary, flex: 1 },

  // ── Review: circle notice ─────────────────────────────────────────────────
  circleNotice: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.amberSurface,
    borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.amberBorder,
    padding: spacing.space3,
  },
  circleNoticeText: { ...typeScale.caption, color: Colors.statusWarning, flex: 1, lineHeight: 17 },

  // ── Submit error ──────────────────────────────────────────────────────────
  submitError: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.statusDangerBg,
    borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.statusDanger,
    padding: spacing.space3,
  },
  submitErrorText: { ...typeScale.bodySM, color: Colors.statusDanger, flex: 1, lineHeight: 18 },

  // ── Navigation buttons ────────────────────────────────────────────────────
  navRow: {
    flexDirection: "row",
    gap: spacing.space3,
    marginTop: spacing.space6,
  },
  backBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    height: 50,
    borderRadius: radius.radiusMD,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  backBtnText: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "600",
    fontSize: 15,
  },
  nextBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 50,
    borderRadius: radius.radiusMD,
    backgroundColor: Colors.actionPrimary,
  },
  nextBtnDisabled: {
    opacity: 0.7,
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
