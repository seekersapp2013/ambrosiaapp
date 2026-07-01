/**
 * ProviderSubscriptionForm
 *
 * Multi-section scrollable form to become or update a provider profile.
 * Calls createSubscriber (new) or updateSubscriber (existing).
 *
 * Sections:
 *   1. Profile preview (avatar + name)
 *   2. Job Title + Specialization
 *   3. Pricing (1-on-1 + group)
 *   4. About You + Offer Description
 *   5. Social links
 *   6. Weekly schedule (toggle + time picker per day)
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
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
import { AppSwitch } from "@/components/ui/Toggle";

// ─── Types ────────────────────────────────────────────────────────────────────
const DAYS = [
  { key: "monday",    label: "Monday" },
  { key: "tuesday",   label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday",  label: "Thursday" },
  { key: "friday",    label: "Friday" },
  { key: "saturday",  label: "Saturday" },
  { key: "sunday",    label: "Sunday" },
] as const;

type DayKey = typeof DAYS[number]["key"];

interface DaySchedule {
  available: boolean;
  start: string; // "HH:MM"
  end:   string;
}

type OpenHours = Record<DayKey, DaySchedule>;

interface FormErrors {
  jobTitle?:          string;
  specialization?:    string;
  oneOnOnePrice?:     string;
  groupSessionPrice?: string;
  aboutUser?:         string;
  offerDescription?:  string;
  schedule?:          string;
}

// ─── Time options ─────────────────────────────────────────────────────────────
const HOURS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ["00", "30"]) {
    const hh = h.toString().padStart(2, "0");
    HOURS.push(`${hh}:${m}`);
  }
}

function displayTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ─── Default open hours ───────────────────────────────────────────────────────
const DEFAULT_HOURS: OpenHours = {
  monday:    { available: true,  start: "09:00", end: "17:00" },
  tuesday:   { available: true,  start: "09:00", end: "17:00" },
  wednesday: { available: true,  start: "09:00", end: "17:00" },
  thursday:  { available: true,  start: "09:00", end: "17:00" },
  friday:    { available: true,  start: "09:00", end: "17:00" },
  saturday:  { available: false, start: "10:00", end: "14:00" },
  sunday:    { available: false, start: "10:00", end: "14:00" },
};

function buildInitialHours(existing?: any): OpenHours {
  if (!existing) return DEFAULT_HOURS;
  return {
    monday:    existing.monday    ?? DEFAULT_HOURS.monday,
    tuesday:   existing.tuesday   ?? DEFAULT_HOURS.tuesday,
    wednesday: existing.wednesday ?? DEFAULT_HOURS.wednesday,
    thursday:  existing.thursday  ?? DEFAULT_HOURS.thursday,
    friday:    existing.friday    ?? DEFAULT_HOURS.friday,
    saturday:  existing.saturday  ?? DEFAULT_HOURS.saturday,
    sunday:    existing.sunday    ?? DEFAULT_HOURS.sunday,
  };
}

// ─── Time Picker Modal ────────────────────────────────────────────────────────
function TimePicker({
  visible, value, onSelect, onClose, label,
}: {
  visible: boolean;
  value: string;
  onSelect: (t: string) => void;
  onClose: () => void;
  label: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tpStyles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close time picker" />
        <View style={tpStyles.sheet}>
          <View style={tpStyles.header}>
            <Text style={tpStyles.title} allowFontScaling={false}>{label}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.iconPrimary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={HOURS}
            keyExtractor={(t) => t}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing.space6 }}
            getItemLayout={(_, index) => ({ length: 52, offset: 52 * index, index })}
            initialScrollIndex={Math.max(0, HOURS.indexOf(value))}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[tpStyles.option, item === value && tpStyles.optionActive]}
                onPress={() => { onSelect(item); onClose(); }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={displayTime(item)}
                accessibilityState={{ selected: item === value }}
              >
                <Text style={[tpStyles.optionText, item === value && tpStyles.optionTextActive]} allowFontScaling={false}>
                  {displayTime(item)}
                </Text>
                {item === value && <Ionicons name="checkmark" size={18} color={Colors.actionPrimary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const tpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.bgOverlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: Colors.bgSurface, borderTopLeftRadius: radius.radius2XL, borderTopRightRadius: radius.radius2XL, paddingHorizontal: spacing.screenPaddingH, paddingTop: spacing.space4, maxHeight: "60%" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.space3 },
  title: { ...typeScale.headingSM, color: Colors.textPrimary, fontWeight: "700" },
  option: { height: 52, justifyContent: "center", paddingHorizontal: spacing.space2, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle, flexDirection: "row", alignItems: "center" },
  optionActive: { backgroundColor: Colors.bgPrimarySubtle },
  optionText: { ...typeScale.bodyMD, color: Colors.textSecondary, flex: 1 },
  optionTextActive: { color: Colors.actionPrimary, fontWeight: "600" },
});

// ─── Day Schedule Row ─────────────────────────────────────────────────────────
function DayRow({
  dayKey, label, schedule,
  onToggle, onStartChange, onEndChange,
}: {
  dayKey: DayKey;
  label: string;
  schedule: DaySchedule;
  onToggle: () => void;
  onStartChange: (t: string) => void;
  onEndChange:   (t: string) => void;
}) {
  const [showStart, setShowStart] = useState(false);
  const [showEnd,   setShowEnd]   = useState(false);

  return (
    <View style={drStyles.row}>
      {/* Day label + switch */}
      <View style={drStyles.left}>
        <AppSwitch
          value={schedule.available}
          onValueChange={onToggle}
          accessibilityLabel={`Toggle ${label} availability`}
        />
        <Text
          style={[drStyles.dayLabel, !schedule.available && drStyles.dayLabelOff]}
          allowFontScaling={false}
        >
          {label}
        </Text>
      </View>

      {/* Time pickers — only shown when day is available */}
      {schedule.available ? (
        <View style={drStyles.times}>
          <TouchableOpacity
            style={drStyles.timeBtn}
            onPress={() => setShowStart(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${label} start time: ${displayTime(schedule.start)}`}
          >
            <Text style={drStyles.timeBtnText} allowFontScaling={false}>
              {displayTime(schedule.start)}
            </Text>
          </TouchableOpacity>
          <Text style={drStyles.timeSep} allowFontScaling={false}>–</Text>
          <TouchableOpacity
            style={drStyles.timeBtn}
            onPress={() => setShowEnd(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${label} end time: ${displayTime(schedule.end)}`}
          >
            <Text style={drStyles.timeBtnText} allowFontScaling={false}>
              {displayTime(schedule.end)}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={drStyles.unavailableText} allowFontScaling={false}>Unavailable</Text>
      )}

      <TimePicker
        visible={showStart}
        value={schedule.start}
        onSelect={onStartChange}
        onClose={() => setShowStart(false)}
        label={`${label} — Start time`}
      />
      <TimePicker
        visible={showEnd}
        value={schedule.end}
        onSelect={onEndChange}
        onClose={() => setShowEnd(false)}
        label={`${label} — End time`}
      />
    </View>
  );
}

const drStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  left: { flexDirection: "row", alignItems: "center", gap: spacing.space3, width: 120 },
  dayLabel: { ...typeScale.bodyMD, color: Colors.textSecondary, fontWeight: "500" },
  dayLabelOff: { color: Colors.textDisabled },
  times: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeBtn: { backgroundColor: Colors.bgElevated, borderRadius: radius.radiusSM, borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: 10, paddingVertical: 6 },
  timeBtnText: { ...typeScale.labelSM, color: Colors.textSecondary },
  timeSep: { ...typeScale.caption, color: Colors.textMuted },
  unavailableText: { ...typeScale.caption, color: Colors.textDisabled, fontStyle: "italic" },
});

// ─── Main Component ───────────────────────────────────────────────────────────
interface ProviderSubscriptionFormProps {
  onSuccess: () => void;
  onCancel:  () => void;
}

export function ProviderSubscriptionForm({ onSuccess, onCancel }: ProviderSubscriptionFormProps) {
  // ── Queries ────────────────────────────────────────────────────────────────
  const myProfile      = useQuery(api.profiles.getMyProfile);
  const mySubscription = useQuery(api.bookingSubscribers.getMySubscription);
  const avatarUrl      = useQuery(
    api.files.getFileUrl,
    myProfile?.avatar ? { storageId: myProfile.avatar } : "skip"
  );

  const isEditing = !!mySubscription;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createSubscriber = useMutation(api.bookingSubscribers.createSubscriber);
  const updateSubscriber = useMutation(api.bookingSubscribers.updateSubscriber);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [jobTitle,          setJobTitle]          = useState(mySubscription?.jobTitle          ?? "");
  const [specialization,    setSpecialization]    = useState(mySubscription?.specialization    ?? "");
  const [oneOnOnePrice,     setOneOnOnePrice]     = useState(String(mySubscription?.oneOnOnePrice     ?? mySubscription?.sessionPrice ?? ""));
  const [groupSessionPrice, setGroupSessionPrice] = useState(String(mySubscription?.groupSessionPrice ?? ""));
  const [aboutUser,         setAboutUser]         = useState(mySubscription?.aboutUser         ?? "");
  const [offerDescription,  setOfferDescription]  = useState(mySubscription?.offerDescription  ?? "");
  const [xLink,             setXLink]             = useState(mySubscription?.xLink             ?? "");
  const [linkedInLink,      setLinkedInLink]      = useState(mySubscription?.linkedInLink      ?? "");
  const [openHours,         setOpenHours]         = useState<OpenHours>(() => buildInitialHours(mySubscription?.openHours));
  const [errors,            setErrors]            = useState<FormErrors>({});
  const [submitting,        setSubmitting]        = useState(false);
  const [submitError,       setSubmitError]       = useState("");

  // ── Schedule helpers ──────────────────────────────────────────────────────
  const updateDay = useCallback((dayKey: DayKey, patch: Partial<DaySchedule>) => {
    setOpenHours(prev => ({ ...prev, [dayKey]: { ...prev[dayKey], ...patch } }));
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: FormErrors = {};
    if (!jobTitle.trim())         e.jobTitle         = "Job title is required";
    if (!specialization.trim())   e.specialization   = "Specialization is required";
    if (!aboutUser.trim())        e.aboutUser        = "About you is required";
    if (!offerDescription.trim()) e.offerDescription = "Offer description is required";

    const p1 = parseFloat(oneOnOnePrice);
    if (isNaN(p1) || p1 <= 0)    e.oneOnOnePrice    = "Enter a valid 1-on-1 price";

    const p2 = parseFloat(groupSessionPrice);
    if (groupSessionPrice && (isNaN(p2) || p2 <= 0)) e.groupSessionPrice = "Enter a valid group price";

    const anyAvailable = Object.values(openHours).some(d => d.available);
    if (!anyAvailable) e.schedule = "Enable at least one day";

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");

    const p1 = parseFloat(oneOnOnePrice);
    const p2 = groupSessionPrice ? parseFloat(groupSessionPrice) : Math.round(p1 * 0.7);

    const args = {
      jobTitle:          jobTitle.trim(),
      specialization:    specialization.trim(),
      oneOnOnePrice:     p1,
      groupSessionPrice: p2,
      sessionPrice:      p1,   // legacy field
      aboutUser:         aboutUser.trim(),
      offerDescription:  offerDescription.trim(),
      xLink:             xLink.trim() || undefined,
      linkedInLink:      linkedInLink.trim() || undefined,
      openHours,
    };

    try {
      if (isEditing) {
        await updateSubscriber(args);
      } else {
        await createSubscriber(args);
      }
      onSuccess();
    } catch (err: any) {
      setSubmitError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const displayName  = myProfile?.name ?? myProfile?.username ?? "You";
  const profileReady = myProfile !== undefined && mySubscription !== undefined;

  if (!profileReady) {
    return (
      <View style={fStyles.loadingWrap}>
        <ActivityIndicator color={Colors.actionPrimary} />
      </View>
    );
  }

  return (
    <View
      style={fStyles.flatContent}
    >
      {/* ── Section header helper ──────────────────────────────── */}
      {/* rendered inline below */}

      {/* ── 1. Profile Preview ────────────────────────────────── */}
      <View style={fStyles.profilePreview}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={fStyles.avatar} accessibilityLabel="Your profile photo" />
        ) : (
          <View style={fStyles.avatarFallback}>
            <Text style={fStyles.avatarInitial} allowFontScaling={false}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={fStyles.profileText}>
          <Text style={fStyles.profileName} allowFontScaling={false}>{displayName}</Text>
          <View style={[fStyles.statusPill, isEditing ? fStyles.statusPillActive : fStyles.statusPillNew]}>
            <Ionicons
              name={isEditing ? "star" : "add-circle-outline"}
              size={12}
              color={isEditing ? Colors.actionPrimary : Colors.statusInfo}
            />
            <Text style={[fStyles.statusPillText, isEditing ? fStyles.statusPillTextActive : fStyles.statusPillTextNew]} allowFontScaling={false}>
              {isEditing ? "Updating Profile" : "Becoming a Provider"}
            </Text>
          </View>
        </View>
      </View>

      {/* ── 2. Identity ───────────────────────────────────────── */}
      <Text style={fStyles.sectionLabel}>Professional Identity</Text>
      <AppInput
        label="Job Title"
        placeholder="e.g. Licensed Therapist, Life Coach, Nutritionist"
        value={jobTitle}
        onChangeText={setJobTitle}
        error={errors.jobTitle}
        returnKeyType="next"
        accessibilityLabel="Job title"
      />
      <AppInput
        label="Specialization"
        placeholder="e.g. Anxiety & Stress, Sports Nutrition, Career Growth"
        value={specialization}
        onChangeText={setSpecialization}
        error={errors.specialization}
        returnKeyType="next"
        accessibilityLabel="Specialization"
      />

      {/* ── 3. Pricing ────────────────────────────────────────── */}
      <Text style={fStyles.sectionLabel}>Pricing (per hour)</Text>
      <View style={fStyles.pricingRow}>
        <View style={fStyles.pricingField}>
          <AppInput
            label="1-on-1 Session"
            placeholder="e.g. 100"
            value={oneOnOnePrice}
            onChangeText={setOneOnOnePrice}
            error={errors.oneOnOnePrice}
            keyboardType="decimal-pad"
            returnKeyType="next"
            leadingIcon={<Text style={fStyles.currencySymbol}>$</Text>}
            accessibilityLabel="1-on-1 session price per hour"
          />
        </View>
        <View style={fStyles.pricingField}>
          <AppInput
            label="Group Session"
            placeholder="e.g. 70"
            value={groupSessionPrice}
            onChangeText={setGroupSessionPrice}
            error={errors.groupSessionPrice}
            keyboardType="decimal-pad"
            returnKeyType="next"
            leadingIcon={<Text style={fStyles.currencySymbol}>$</Text>}
            accessibilityLabel="Group session price per hour (optional)"
          />
        </View>
      </View>
      <View style={fStyles.pricingTip}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.statusInfo} />
        <Text style={fStyles.pricingTipText} allowFontScaling={false}>
          Group price defaults to 70% of 1-on-1 price if left blank.
        </Text>
      </View>

      {/* ── 4. About ──────────────────────────────────────────── */}
      <Text style={fStyles.sectionLabel}>About You</Text>
      <TextareaInput
        label="Bio"
        placeholder="Tell potential clients about your background, credentials, and what makes you unique…"
        value={aboutUser}
        onChangeText={setAboutUser}
        error={errors.aboutUser}
        maxLength={500}
        accessibilityLabel="About you"
      />
      <TextareaInput
        label="What Clients Will Get"
        placeholder="Describe what a session with you looks like, what outcomes clients can expect…"
        value={offerDescription}
        onChangeText={setOfferDescription}
        error={errors.offerDescription}
        maxLength={500}
        accessibilityLabel="Offer description"
      />

      {/* ── 5. Social links ───────────────────────────────────── */}
      <Text style={fStyles.sectionLabel}>Social Links (optional)</Text>
      <AppInput
        label="X (Twitter)"
        placeholder="https://x.com/yourhandle"
        value={xLink}
        onChangeText={setXLink}
        keyboardType="url"
        autoCapitalize="none"
        returnKeyType="next"
        leadingIcon={<Ionicons name="logo-twitter" size={18} color={Colors.iconSecondary} />}
        accessibilityLabel="Twitter profile URL"
      />
      <AppInput
        label="LinkedIn"
        placeholder="https://linkedin.com/in/yourprofile"
        value={linkedInLink}
        onChangeText={setLinkedInLink}
        keyboardType="url"
        autoCapitalize="none"
        returnKeyType="done"
        leadingIcon={<Ionicons name="logo-linkedin" size={18} color={Colors.iconSecondary} />}
        accessibilityLabel="LinkedIn profile URL"
      />

      {/* ── 6. Weekly schedule ────────────────────────────────── */}
      <Text style={fStyles.sectionLabel}>Weekly Availability</Text>
      <View style={fStyles.scheduleCard}>
        {DAYS.map(({ key, label }) => (
          <DayRow
            key={key}
            dayKey={key}
            label={label}
            schedule={openHours[key]}
            onToggle={() => updateDay(key, { available: !openHours[key].available })}
            onStartChange={(t) => updateDay(key, { start: t })}
            onEndChange={(t)   => updateDay(key, { end: t })}
          />
        ))}
      </View>
      {errors.schedule && (
        <Text style={fStyles.scheduleError} allowFontScaling={false}>{errors.schedule}</Text>
      )}

      {/* ── Submit error ──────────────────────────────────────── */}
      {submitError !== "" && (
        <View style={fStyles.submitError}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.statusDanger} />
          <Text style={fStyles.submitErrorText} allowFontScaling={false}>{submitError}</Text>
        </View>
      )}

      {/* ── Buttons ───────────────────────────────────────────── */}
      <View style={fStyles.btnRow}>
        <SecondaryButton
          label="Cancel"
          onPress={onCancel}
          style={fStyles.btnCancel}
          accessibilityLabel="Cancel"
        />
        <PrimaryButton
          label={isEditing ? "Save Changes" : "Become a Provider"}
          onPress={handleSubmit}
          loading={submitting}
          style={fStyles.btnSubmit}
          icon={<Ionicons name={isEditing ? "save-outline" : "ribbon-outline"} size={18} color="#FFFFFF" />}
          accessibilityLabel={isEditing ? "Save provider profile changes" : "Submit and become a provider"}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const fStyles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.space4, paddingBottom: spacing.space10 },
  flatContent: { paddingHorizontal: spacing.space4, paddingBottom: spacing.space10 },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.space10 },

  // Profile preview
  profilePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space4,
    paddingVertical: spacing.space5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: spacing.space5,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: Colors.borderFilled, flexShrink: 0 },
  avatarFallback: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.bgPrimaryMid, borderWidth: 2, borderColor: Colors.borderFilled, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarInitial: { ...typeScale.headingLG, color: Colors.actionPrimary, fontWeight: "700" },
  profileText: { flex: 1, gap: spacing.space2 },
  profileName: { ...typeScale.headingMD, color: Colors.textPrimary, fontWeight: "700" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.radiusFull, borderWidth: 1 },
  statusPillActive: { backgroundColor: Colors.bgPrimarySubtle, borderColor: Colors.borderFilled },
  statusPillNew:    { backgroundColor: Colors.statusInfoBg,    borderColor: Colors.borderSubtle },
  statusPillText: { fontSize: 11, fontWeight: "600" },
  statusPillTextActive: { color: Colors.actionPrimary },
  statusPillTextNew:    { color: Colors.statusInfo },

  // Section labels
  sectionLabel: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: spacing.space3,
    marginTop: spacing.space2,
  },

  // Pricing row
  pricingRow: { flexDirection: "row", gap: spacing.space3 },
  pricingField: { flex: 1 },
  currencySymbol: { ...typeScale.bodyMD, color: Colors.textMuted, fontWeight: "600" },
  pricingTip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusSM,
    paddingHorizontal: spacing.space3,
    paddingVertical: spacing.space2,
    marginBottom: spacing.space5,
    marginTop: -spacing.space4,
  },
  pricingTipText: { ...typeScale.caption, color: Colors.statusInfo, flex: 1 },

  // Schedule card
  scheduleCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space2,
    overflow: "hidden",
  },
  scheduleError: { ...typeScale.caption, color: Colors.statusDanger, marginBottom: spacing.space4, marginTop: spacing.space2 },

  // Submit error
  submitError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusDangerBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.statusDanger,
    padding: spacing.space3,
    marginBottom: spacing.space4,
  },
  submitErrorText: { ...typeScale.bodySM, color: Colors.statusDanger, flex: 1, lineHeight: 18 },

  // Buttons
  btnRow: { flexDirection: "row", gap: spacing.space3, marginTop: spacing.space4 },
  btnCancel: { flex: 1 },
  btnSubmit: { flex: 2 },
});
