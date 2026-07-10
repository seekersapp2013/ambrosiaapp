import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Image, ActivityIndicator, Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { BookingCalendar, type CalendarSelection } from "@/components/booking/BookingCalendar";
import { BookingConfirmation } from "@/components/booking/BookingConfirmation";

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = "details" | "calendar" | "confirmation" | "success";

const DAY_LABELS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_SHORT  = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ─── Availability Schedule Row ───────────────────────────────────────────────
function ScheduleRow({ day, schedule }: { day: string; schedule: { start: string; end: string; available: boolean } }) {
  return (
    <View style={styles.scheduleRow}>
      <Text style={[styles.scheduleDay, !schedule.available && styles.scheduleDayOff]} allowFontScaling={false}>
        {day}
      </Text>
      {schedule.available ? (
        <Text style={styles.scheduleHours} allowFontScaling={false}>
          {formatTime(schedule.start)} – {formatTime(schedule.end)}
        </Text>
      ) : (
        <Text style={styles.scheduleOff} allowFontScaling={false}>Unavailable</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingDetailScreen() {
  const router = useRouter();
  const { id, referralId } = useLocalSearchParams<{ id: string; referralId?: string }>();

  const [viewMode, setViewMode] = useState<ViewMode>("details");
  const [selection, setSelection] = useState<CalendarSelection | null>(null);
  const [successBookingId, setSuccessBookingId] = useState("");

  // Guard: only query when id looks like a real Convex ID (not a reserved word)
  // Convex IDs are alphanumeric strings, never plain words like "new", "providers", etc.
  const isValidId = !!id && id.length > 10 && !["new","providers","history","settings","events","become-provider"].includes(id);

  // Try to load as a provider (userId) first
  const providerSubscription = useQuery(
    api.bookingSubscribers.getSubscriberByUserId,
    isValidId ? { userId: id as any } : "skip"
  );
  const providerProfile = useQuery(
    api.profiles.getProfileByUserId,
    isValidId ? { userId: id as any } : "skip"
  );
  const avatarUrl = useQuery(
    api.files.getFileUrl,
    providerProfile?.avatar ? { storageId: providerProfile.avatar } : "skip"
  );

  const isLoading =
    isValidId && (providerSubscription === undefined || providerProfile === undefined);

  // Provider info composite
  const providerInfo = providerSubscription && providerProfile ? {
    userId: id!,
    name: providerProfile.name ?? providerProfile.username ?? "Provider",
    jobTitle: providerSubscription.jobTitle,
    specialization: providerSubscription.specialization,
    avatar: avatarUrl ?? undefined,
    currency: (providerSubscription as any).sessionCurrency ?? "USD",
    oneOnOnePrice: providerSubscription.oneOnOnePrice ?? providerSubscription.sessionPrice,
    groupSessionPrice: providerSubscription.groupSessionPrice,
    aboutUser: providerSubscription.aboutUser,
    offerDescription: providerSubscription.offerDescription,
    openHours: providerSubscription.openHours,
    xLink: providerSubscription.xLink,
    linkedInLink: providerSubscription.linkedInLink,
  } : null;

  // ── Shared back logic ────────────────────────────────────────────────────
  function handleBack() {
    if (viewMode === "calendar")      { setViewMode("details"); return; }
    if (viewMode === "confirmation")  { setViewMode("calendar"); return; }
    if (viewMode === "success")       { router.replace("/(tabs)/booking" as any); return; }
    router.replace("/(tabs)/booking" as any);
  }

  const headerTitle =
    viewMode === "details"      ? "Provider Details" :
    viewMode === "calendar"     ? "Choose a Time"    :
    viewMode === "confirmation" ? "Confirm Booking"  :
                                  "Booking Confirmed";

  if (isLoading) {
    return (
      <AppBackground>
        <ScreenHeader title="Loading…" onBack={() => router.replace("/(tabs)/booking" as any)} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      </AppBackground>
    );
  }

  if (!providerInfo) {
    return (
      <AppBackground>
        <ScreenHeader title="Not Found" onBack={() => router.replace("/(tabs)/booking" as any)} />
        <View style={styles.loadingWrap}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.statusDanger} />
          <Text style={styles.notFoundText} allowFontScaling={false}>Provider not found</Text>
          <SecondaryButton label="Go Back" onPress={() => router.replace("/(tabs)/booking" as any)} style={{ marginTop: spacing.space4 }} />
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScreenHeader title={headerTitle} onBack={handleBack} />

      {/* ── DETAILS VIEW ─────────────────────────────────────────── */}
      {viewMode === "details" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <MobileCard>
            {/* Hero */}
            <View style={styles.hero}>
              {providerInfo.avatar ? (
                <Image source={{ uri: providerInfo.avatar }} style={styles.heroAvatar}
                  accessibilityLabel={`${providerInfo.name} profile photo`} />
              ) : (
                <View style={styles.heroAvatarFallback}>
                  <Text style={styles.heroInitial} allowFontScaling={false}>
                    {providerInfo.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <Text style={styles.heroName} allowFontScaling={false}>{providerInfo.name}</Text>
              <Text style={styles.heroTitle} allowFontScaling={false}>{providerInfo.jobTitle}</Text>
              <View style={styles.heroSpecBadge}>
                <Text style={styles.heroSpecText} allowFontScaling={false}>{providerInfo.specialization}</Text>
              </View>
              {/* Social links */}
              <View style={styles.socialRow}>
                {providerInfo.xLink && (
                  <TouchableOpacity onPress={() => Linking.openURL(providerInfo.xLink!)}
                    accessibilityRole="link" accessibilityLabel="Twitter profile" style={styles.socialBtn}>
                    <Ionicons name="logo-twitter" size={18} color={Colors.iconSecondary} />
                  </TouchableOpacity>
                )}
                {providerInfo.linkedInLink && (
                  <TouchableOpacity onPress={() => Linking.openURL(providerInfo.linkedInLink!)}
                    accessibilityRole="link" accessibilityLabel="LinkedIn profile" style={styles.socialBtn}>
                    <Ionicons name="logo-linkedin" size={18} color={Colors.iconSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Pricing card */}
            <View style={styles.pricingCard}>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel} allowFontScaling={false}>1-on-1 Session</Text>
                <Text style={styles.pricingAmount} allowFontScaling={false}>
                  {providerInfo.currency} {providerInfo.oneOnOnePrice}<Text style={styles.pricingUnit}>/hr</Text>
                </Text>
              </View>
              {providerInfo.groupSessionPrice && (
                <>
                  <View style={styles.pricingDivider} />
                  <View style={styles.pricingItem}>
                    <Text style={styles.pricingLabel} allowFontScaling={false}>Group Session</Text>
                    <Text style={styles.pricingAmount} allowFontScaling={false}>
                      {providerInfo.currency} {providerInfo.groupSessionPrice}<Text style={styles.pricingUnit}>/hr</Text>
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* About */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} allowFontScaling={false}>About</Text>
              <Text style={styles.sectionBody} allowFontScaling={false}>{providerInfo.aboutUser}</Text>
            </View>

            {/* What you'll learn */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} allowFontScaling={false}>What You'll Get</Text>
              <Text style={styles.sectionBody} allowFontScaling={false}>{providerInfo.offerDescription}</Text>
            </View>

            {/* Availability schedule */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle} allowFontScaling={false}>Weekly Availability</Text>
              <View style={styles.scheduleGrid}>
                {DAY_LABELS.map((dayKey, i) => (
                  <ScheduleRow
                    key={dayKey}
                    day={DAY_SHORT[i]}
                    schedule={(providerInfo.openHours as any)[dayKey]}
                  />
                ))}
              </View>
            </View>

            {/* CTA */}
            <View style={styles.ctaWrap}>
              <PrimaryButton
                label="Book a Session"
                onPress={() => setViewMode("calendar")}
                icon={<Ionicons name="calendar-outline" size={20} color="#FFFFFF" />}
                accessibilityLabel="Book a session with this provider"
              />
            </View>
          </MobileCard>
        </ScrollView>
      )}

      {/* ── CALENDAR VIEW ────────────────────────────────────────── */}
      {viewMode === "calendar" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <MobileCard>
            <View style={styles.calHeader}>
              <Text style={styles.calTitle} allowFontScaling={false}>
                Choose a date & time
              </Text>
              <Text style={styles.calSubtitle} allowFontScaling={false}>
                Select an available slot to book with {providerInfo.name}
              </Text>
            </View>
            <BookingCalendar
              providerId={providerInfo.userId}
              oneOnOnePrice={providerInfo.oneOnOnePrice}
              currency={providerInfo.currency}
              onSelect={(sel) => {
                setSelection(sel);
                setViewMode("confirmation");
              }}
            />
          </MobileCard>
        </ScrollView>
      )}

      {/* ── CONFIRMATION VIEW ─────────────────────────────────────── */}
      {viewMode === "confirmation" && selection && (
        <BookingConfirmation
          provider={providerInfo}
          selection={selection}
          referralId={referralId}
          onBack={() => setViewMode("calendar")}
          onSuccess={(bId) => {
            setSuccessBookingId(bId);
            setViewMode("success");
          }}
        />
      )}

      {/* ── SUCCESS VIEW ──────────────────────────────────────────── */}
      {viewMode === "success" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <MobileCard>
            <View style={styles.successWrap}>
              <View style={styles.successIconCircle}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.statusSuccess} />
              </View>
              <Text style={styles.successTitle} allowFontScaling={false}>You're booked!</Text>
              <Text style={styles.successSub} allowFontScaling={false}>
                Your session with {providerInfo.name} has been confirmed and your wallet has been debited.
              </Text>
              <View style={styles.accessNote}>
                <Ionicons name="videocam-outline" size={18} color={Colors.statusInfo} />
                <Text style={styles.accessNoteText} allowFontScaling={false}>
                  The "Join Session" button activates 15 minutes before your session starts.
                </Text>
              </View>
              <PrimaryButton
                label="View My Bookings"
                onPress={() => router.replace("/(tabs)/booking" as any)}
                icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
                style={styles.viewBookingsBtn}
                accessibilityLabel="Go to my bookings"
              />
              {successBookingId && (
                <TouchableOpacity
                  onPress={() => router.push(`/(tabs)/booking/${successBookingId}` as any)}
                  style={styles.viewSessionLink}
                  accessibilityRole="button"
                >
                  <Text style={styles.viewSessionLinkText} allowFontScaling={false}>
                    View booking details
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.actionPrimary} />
                </TouchableOpacity>
              )}
            </View>
          </MobileCard>
        </ScrollView>
      )}
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.space3 },
  notFoundText: { ...typeScale.headingMD, color: Colors.textMuted, marginTop: spacing.space3 },

  // Hero
  hero: { alignItems: "center", paddingTop: spacing.space6, paddingBottom: spacing.space4, paddingHorizontal: spacing.space4 },
  heroAvatar: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: Colors.borderFilled, marginBottom: spacing.space3 },
  heroAvatarFallback: { width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.bgPrimaryMid, borderWidth: 3, borderColor: Colors.borderFilled, alignItems: "center", justifyContent: "center", marginBottom: spacing.space3 },
  heroInitial: { ...typeScale.headingXL, color: Colors.actionPrimary, fontWeight: "700" },
  heroName: { ...typeScale.headingLG, color: Colors.textPrimary, fontWeight: "700", textAlign: "center" },
  heroTitle: { ...typeScale.bodyMD, color: Colors.textMuted, marginTop: 4, textAlign: "center" },
  heroSpecBadge: { marginTop: spacing.space2, backgroundColor: Colors.bgPrimarySubtle, borderRadius: radius.radiusFull, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: Colors.borderFilled },
  heroSpecText: { fontSize: 12, fontWeight: "600", color: Colors.actionPrimary },
  socialRow: { flexDirection: "row", gap: spacing.space3, marginTop: spacing.space3 },
  socialBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderSubtle, alignItems: "center", justifyContent: "center" },

  // Pricing card
  pricingCard: { marginHorizontal: spacing.space4, marginBottom: spacing.space4, backgroundColor: Colors.bgPrimarySubtle, borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.borderFilled, padding: spacing.space4 },
  pricingItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pricingLabel: { ...typeScale.bodyMD, color: Colors.textMuted },
  pricingAmount: { ...typeScale.headingMD, color: Colors.textPrimary, fontWeight: "700" },
  pricingUnit: { ...typeScale.caption, color: Colors.textMuted, fontWeight: "400" },
  pricingDivider: { height: 1, backgroundColor: Colors.borderFilled, marginVertical: spacing.space3 },

  // Sections
  section: { paddingHorizontal: spacing.space4, marginBottom: spacing.space5 },
  sectionTitle: { ...typeScale.headingSM, color: Colors.textPrimary, fontWeight: "700", marginBottom: spacing.space2 },
  sectionBody: { ...typeScale.bodyMD, color: Colors.textMuted, lineHeight: 22 },

  // Schedule
  scheduleGrid: { gap: 4 },
  scheduleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: spacing.space3, backgroundColor: Colors.bgElevated, borderRadius: radius.radiusSM, marginBottom: 2 },
  scheduleDay: { ...typeScale.labelSM, color: Colors.textSecondary, width: 36, fontWeight: "600" },
  scheduleDayOff: { color: Colors.textDisabled },
  scheduleHours: { ...typeScale.bodySM, color: Colors.textMuted },
  scheduleOff: { ...typeScale.caption, color: Colors.textDisabled, fontStyle: "italic" },

  // CTA
  ctaWrap: { paddingHorizontal: spacing.space4, paddingTop: spacing.space2, paddingBottom: spacing.space5 },

  // Calendar header
  calHeader: { alignItems: "center", paddingTop: spacing.space5, paddingBottom: spacing.space4, paddingHorizontal: spacing.space4 },
  calTitle: { ...typeScale.headingMD, color: Colors.textPrimary, fontWeight: "700", textAlign: "center" },
  calSubtitle: { ...typeScale.bodyMD, color: Colors.textMuted, marginTop: 4, textAlign: "center" },

  // Success view
  successWrap: { alignItems: "center", paddingVertical: spacing.space8, paddingHorizontal: spacing.space4, gap: spacing.space3 },
  successIconCircle: { marginBottom: spacing.space2 },
  successTitle: { ...typeScale.headingLG, color: Colors.textPrimary, fontWeight: "700", textAlign: "center" },
  successSub: { ...typeScale.bodyMD, color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
  accessNote: { flexDirection: "row", gap: spacing.space3, backgroundColor: Colors.statusInfoBg, borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.borderSubtle, padding: spacing.space3, alignItems: "flex-start", width: "100%" },
  accessNoteText: { ...typeScale.bodySM, color: Colors.statusInfo, flex: 1, lineHeight: 18 },
  viewBookingsBtn: { width: "100%", marginTop: spacing.space2 },
  viewSessionLink: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.space2 },
  viewSessionLinkText: { ...typeScale.labelSM, color: Colors.actionPrimary },
});
