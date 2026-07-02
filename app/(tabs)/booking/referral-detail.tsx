/**
 * referral-detail.tsx
 * Route: /(tabs)/booking/referral-detail?referralId=<id>
 *
 * Full detail view for a single referral. Accessible to:
 *   - Patient          — sees status, referring expert, chosen expert, booking CTA
 *   - Referring expert — sees patient, status, commission info
 *   - Selected expert  — sees patient, health note, and referral context
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
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

// ─── Status tokens ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  PENDING:   Colors.statusWarning,
  ACCEPTED:  Colors.statusInfo,
  COMPLETED: Colors.statusSuccess,
  DECLINED:  Colors.statusDanger,
};
const STATUS_BG: Record<string, string> = {
  PENDING:   Colors.statusWarningBg,
  ACCEPTED:  Colors.statusInfoBg,
  COMPLETED: Colors.statusSuccessBg,
  DECLINED:  Colors.statusDangerBg,
};
const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  PENDING:   "time-outline",
  ACCEPTED:  "checkmark-circle-outline",
  COMPLETED: "checkmark-done-outline",
  DECLINED:  "close-circle-outline",
};
const STATUS_LABEL: Record<string, string> = {
  PENDING:   "Awaiting your choice",
  ACCEPTED:  "Expert selected — book a session",
  COMPLETED: "Session completed",
  DECLINED:  "Referral declined",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return ""; }
}

function displayName(profile: any): string {
  return profile?.name ?? profile?.username ?? "Unknown";
}

function formatPrice(p: number): string {
  return p >= 1000 ? `$${(p / 1000).toFixed(1)}k` : `$${p}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={styles.sectionTitle} allowFontScaling={false}>
      {title}
    </Text>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={Colors.actionPrimary} />
      </View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel} allowFontScaling={false}>{label}</Text>
        <Text
          style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}
          allowFontScaling={false}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function PersonCard({
  title,
  profile,
  subscription,
  accent,
}: {
  title: string;
  profile: any;
  subscription?: any;
  accent?: boolean;
}) {
  const name = displayName(profile);
  const jobTitle = subscription?.jobTitle ?? null;
  return (
    <View style={[styles.personCard, accent && styles.personCardAccent]}>
      <View style={styles.personAvatar}>
        <Text style={styles.personAvatarInitial} allowFontScaling={false}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.personInfo}>
        <Text style={styles.personRole} allowFontScaling={false}>{title}</Text>
        <Text style={styles.personName} numberOfLines={1} allowFontScaling={false}>
          {name}
        </Text>
        {jobTitle && (
          <Text style={styles.personTitle} numberOfLines={1} allowFontScaling={false}>
            {jobTitle}
          </Text>
        )}
      </View>
      {accent && (
        <Ionicons name="checkmark-circle" size={20} color={Colors.statusSuccess} />
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ReferralDetailScreen() {
  const router = useRouter();
  const { referralId } = useLocalSearchParams<{ referralId: string }>();

  const referral = useQuery(
    api.referrals.getReferralById,
    referralId ? { referralId: referralId as any } : "skip"
  );
  const me = useQuery(api.profiles.getMyProfile, {});

  const isLoading = referral === undefined || me === undefined;

  if (isLoading) {
    return (
      <AppBackground>
        <ScreenHeader title="Referral Detail" onBack={() => router.back()} />
        <View style={styles.centeredWrap}>
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      </AppBackground>
    );
  }

  if (!referral) {
    return (
      <AppBackground>
        <ScreenHeader title="Referral Detail" onBack={() => router.back()} />
        <MobileCard>
          <View style={styles.centeredWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.statusDanger} />
            <Text style={styles.errorText} allowFontScaling={false}>
              Referral not found
            </Text>
            <SecondaryButton
              label="Go Back"
              onPress={() => router.back()}
              style={{ marginTop: spacing.space4 }}
            />
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  const status      = referral.status as string;
  const statusColor = STATUS_COLOR[status] ?? Colors.textMuted;
  const statusBg    = STATUS_BG[status]    ?? Colors.bgElevated;
  const statusIcon  = STATUS_ICON[status]  ?? "ellipse-outline";
  const statusLabel = STATUS_LABEL[status] ?? status;

  const isPatient         = referral.patient?.id  === (me as any)?.userId;
  const isReferringExpert = referral.referringExpert?.id === (me as any)?.userId;
  const isSelectedExpert  = referral.selectedExpert?.id  === (me as any)?.userId;

  const canBook =
    isPatient &&
    status === "ACCEPTED" &&
    referral.selectedExpert &&
    !referral.bookingId;

  return (
    <AppBackground>
      <ScreenHeader title="Referral Detail" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <MobileCard>
          {/* ── Status banner ─────────────────────────────────── */}
          <View style={[styles.statusBanner, { backgroundColor: statusBg }]}>
            <Ionicons name={statusIcon} size={20} color={statusColor} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.statusLabel, { color: statusColor }]} allowFontScaling={false}>
                {status}
              </Text>
              <Text style={styles.statusSub} allowFontScaling={false}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* ── Title & meta ───────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.referralTitle} allowFontScaling={false}>
              {referral.title}
            </Text>
            <InfoRow
              icon="calendar-outline"
              label="Created"
              value={formatDate(referral.createdAt)}
            />
            <InfoRow
              icon="git-network-outline"
              label="Commission rate"
              value={`${(referral.commissionRate * 100).toFixed(0)}%`}
            />
          </View>

          {/* ── People ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionTitle title="People" />
            {referral.patient?.profile && (
              <PersonCard
                title="Patient"
                profile={referral.patient.profile}
              />
            )}
            {referral.referringExpert?.profile && (
              <PersonCard
                title="Referring Expert"
                profile={referral.referringExpert.profile}
                subscription={referral.referringExpert.subscription}
              />
            )}
            {referral.selectedExpert?.profile && (
              <PersonCard
                title="Selected Expert"
                profile={referral.selectedExpert.profile}
                subscription={referral.selectedExpert.subscription}
                accent
              />
            )}
          </View>

          {/* ── Health note (only shown to the selected expert) ── */}
          {isSelectedExpert && referral.healthNote && (
            <View style={styles.section}>
              <SectionTitle title="Health Note" />
              <View style={styles.healthNoteCard}>
                <View style={styles.healthNoteHeader}>
                  <Ionicons name="lock-closed-outline" size={14} color={Colors.statusInfo} />
                  <Text style={styles.healthNotePrivacy} allowFontScaling={false}>
                    Private — only visible to you
                  </Text>
                </View>
                <Text style={styles.healthNoteText} allowFontScaling={false}>
                  {referral.healthNote}
                </Text>
              </View>
            </View>
          )}

          {/* ── Commission info (referring expert & selected expert) ── */}
          {(isReferringExpert || isSelectedExpert) && (
            <View style={styles.section}>
              <SectionTitle title="Commission" />
              {referral.commissionAmount != null ? (
                <View style={styles.commissionCard}>
                  <View style={styles.commissionRow}>
                    <Text style={styles.commissionKey} allowFontScaling={false}>
                      Amount
                    </Text>
                    <Text style={styles.commissionValue} allowFontScaling={false}>
                      {referral.commissionCurrency}{" "}
                      {referral.commissionAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.commissionRow}>
                    <Text style={styles.commissionKey} allowFontScaling={false}>
                      Status
                    </Text>
                    <View
                      style={[
                        styles.commissionBadge,
                        referral.commissionPaid
                          ? styles.commissionPaid
                          : styles.commissionPending,
                      ]}
                    >
                      <Ionicons
                        name={referral.commissionPaid ? "checkmark-circle-outline" : "time-outline"}
                        size={11}
                        color={referral.commissionPaid ? Colors.statusSuccess : Colors.statusWarning}
                      />
                      <Text
                        style={[
                          styles.commissionBadgeText,
                          {
                            color: referral.commissionPaid
                              ? Colors.statusSuccess
                              : Colors.statusWarning,
                          },
                        ]}
                        allowFontScaling={false}
                      >
                        {referral.commissionPaid ? "Paid" : "Pending"}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <Text style={styles.commissionPendingNote} allowFontScaling={false}>
                  Commission will be calculated once the patient books a session.
                </Text>
              )}
            </View>
          )}

          {/* ── Suggested experts list (patient view, pending only) ── */}
          {isPatient && status === "PENDING" && (referral as any).suggestedExpertsDetails?.length > 0 && (
            <View style={styles.section}>
              <SectionTitle title="Suggested Experts" />
              {((referral as any).suggestedExpertsDetails ?? []).map((expert: any) => {
                const price =
                  expert.subscription?.oneOnOnePrice ??
                  expert.subscription?.sessionPrice ??
                  0;
                return (
                  <TouchableOpacity
                    key={expert.id}
                    style={styles.expertCard}
                    onPress={() =>
                      router.push(
                        `/(tabs)/booking/${expert.id}?referralId=${referralId}` as any
                      )
                    }
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${displayName(expert.profile)}`}
                  >
                    <View style={styles.expertAvatar}>
                      <Text style={styles.expertAvatarInitial} allowFontScaling={false}>
                        {displayName(expert.profile).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.expertInfo}>
                      <Text style={styles.expertName} numberOfLines={1} allowFontScaling={false}>
                        {displayName(expert.profile)}
                      </Text>
                      <Text style={styles.expertJobTitle} numberOfLines={1} allowFontScaling={false}>
                        {expert.subscription?.jobTitle ?? "Provider"}
                      </Text>
                      <Text style={styles.expertPrice} allowFontScaling={false}>
                        {formatPrice(price)}/hr
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={Colors.iconSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ── Book session CTA (patient, accepted) ─────────── */}
          {canBook && (
            <View style={styles.ctaSection}>
              <PrimaryButton
                label="Book Session Now"
                onPress={() =>
                  router.push(
                    `/(tabs)/booking/${referral.selectedExpert!.id}?referralId=${referralId}` as any
                  )
                }
                icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
              />
            </View>
          )}

          {/* ── Already booked notice ─────────────────────────── */}
          {isPatient && referral.bookingId && (
            <View style={styles.bookedBanner}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.statusSuccess} />
              <Text style={styles.bookedBannerText} allowFontScaling={false}>
                Session booked. Check your booking history for details.
              </Text>
            </View>
          )}
        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.scrollBottomPadding },

  centeredWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.space8,
    gap: spacing.space4,
  },
  errorText: { ...typeScale.bodyMD, color: Colors.textMuted, textAlign: "center" },

  // Status banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    borderRadius: radius.radiusMD,
    padding: spacing.space4,
    marginBottom: spacing.space4,
  },
  statusLabel: { ...typeScale.headingSM, fontWeight: "700", fontSize: 13 },
  statusSub: { ...typeScale.caption, color: Colors.textMuted, marginTop: 2 },

  // Section
  section: { marginBottom: spacing.space5, gap: spacing.space3 },
  sectionTitle: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },

  // Referral title
  referralTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing.space2,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoText: { flex: 1, justifyContent: "center" },
  infoLabel: { ...typeScale.caption, color: Colors.textMuted },
  infoValue: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600" },

  // Person card
  personCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
  },
  personCardAccent: {
    borderColor: Colors.statusSuccess,
    backgroundColor: Colors.statusSuccessBg,
  },
  personAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  personAvatarInitial: { ...typeScale.headingSM, color: Colors.actionPrimary, fontWeight: "700" },
  personInfo: { flex: 1, gap: 2 },
  personRole: { ...typeScale.caption, color: Colors.textMuted },
  personName: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600" },
  personTitle: { ...typeScale.caption, color: Colors.textMuted, fontSize: 10 },

  // Health note
  healthNoteCard: {
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
  },
  healthNoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  healthNotePrivacy: { ...typeScale.caption, color: Colors.statusInfo, fontStyle: "italic" },
  healthNoteText: { ...typeScale.bodyMD, color: Colors.textPrimary, lineHeight: 22 },

  // Commission
  commissionCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
  },
  commissionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  commissionKey: { ...typeScale.bodySM, color: Colors.textMuted },
  commissionValue: {
    ...typeScale.headingSM,
    color: Colors.statusSuccess,
    fontWeight: "700",
    fontSize: 15,
  },
  commissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: radius.radiusXS,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  commissionPaid: { backgroundColor: Colors.statusSuccessBg },
  commissionPending: { backgroundColor: Colors.statusWarningBg },
  commissionBadgeText: { fontSize: 11, fontWeight: "600" },
  commissionPendingNote: { ...typeScale.bodySM, color: Colors.textMuted, fontStyle: "italic" },

  // Expert card (suggested list)
  expertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
  },
  expertAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expertAvatarInitial: { ...typeScale.headingSM, color: Colors.actionPrimary, fontWeight: "700" },
  expertInfo: { flex: 1, gap: 2 },
  expertName: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600" },
  expertJobTitle: { ...typeScale.caption, color: Colors.textMuted, fontSize: 10 },
  expertPrice: { fontSize: 11, fontWeight: "700", color: Colors.statusSuccess },

  // CTA
  ctaSection: { marginTop: spacing.space2, marginBottom: spacing.space4 },

  // Already booked
  bookedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    backgroundColor: Colors.statusSuccessBg,
    borderRadius: radius.radiusMD,
    padding: spacing.space3,
    marginTop: spacing.space2,
  },
  bookedBannerText: { ...typeScale.bodySM, color: Colors.statusSuccess, flex: 1 },
});
