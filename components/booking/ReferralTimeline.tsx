/**
 * ReferralTimeline.tsx
 * Visual Referral Timeline Component
 *
 * Displays the complete referral lifecycle in chronological order:
 * 1. The session that started the referral (Originating Session context)
 * 2. Referral creation & 3 suggested experts offered
 * 3. Chosen provider selection (or pending state / decline)
 * 4. 3-way Private Care Team Circle setup
 * 5. Follow-up session booking with chosen provider
 * 6. Follow-up session conducted
 * 7. 10% Referral commission calculation & settlement
 *
 * Implemented according to Ambrosia Mobile Design System (DESIGN_GUIDE.md).
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { MobileCard } from "@/components/MobileCard";

// ─── Types ───────────────────────────────────────────────────────────────────
export interface ReferralTimelineProps {
  referralId: string;
  onNavigateToCircle?: (circleId: string) => void;
  onNavigateToBooking?: (providerId: string) => void;
}

interface TimelineEvent {
  id: string;
  title: string;
  category: string;
  timestamp: number;
  formattedDate: string;
  formattedTime: string;
  relativeLabel: string;
  status: "COMPLETED" | "ACTIVE" | "PENDING" | "DECLINED";
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  accentColor: string;
  details: React.ReactNode;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatFullDate(ts: number): { date: string; time: string } {
  try {
    const d = new Date(ts);
    const date = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date, time };
  } catch {
    return { date: "Date unavailable", time: "" };
  }
}

function displayName(profile: any): string {
  return profile?.name ?? profile?.username ?? "Unknown Provider";
}

function formatPrice(p: number, currency: string = "USD"): string {
  const symbol = currency === "USD" ? "$" : currency === "GBP" ? "£" : currency === "EUR" ? "€" : `${currency} `;
  return `${symbol}${p.toFixed(2)}`;
}

export function ReferralTimeline({
  referralId,
  onNavigateToCircle,
  onNavigateToBooking,
}: ReferralTimelineProps) {
  const router = useRouter();

  const data = useQuery(
    api.referrals.getReferralTimelineData,
    referralId ? { referralId: referralId as any } : "skip"
  );

  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>({
    "originating-session": true,
    "referral-created": true,
    "provider-chosen": true,
    "care-circle": true,
    "followup-booking": true,
    "commission-paid": true,
  });

  const toggleExpand = (id: string) => {
    setExpandedSteps((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (data === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={Colors.actionPrimary} />
        <Text style={styles.loadingText} allowFontScaling={false}>
          Building visual referral timeline…
        </Text>
      </View>
    );
  }

  if (!data || !data.referral) {
    return null;
  }

  const {
    referral,
    patient,
    referringExpert,
    selectedExpert,
    suggestedExpertsDetails,
    originatingSession,
    followUpBooking,
    referralCircle,
    transaction,
  } = data;

  // Build events array in strict chronological order
  const events: TimelineEvent[] = [];

  // ─── 1. Originating Session Event (The session that started the referral) ─
  const hasOriginatingSession = !!originatingSession || referral.referralSource === "FROM_BOOKING";
  const origTs = originatingSession?.createdAt ?? (referral.createdAt - 1000 * 60 * 60 * 24);
  const origDate = formatFullDate(origTs);

  events.push({
    id: "originating-session",
    title: hasOriginatingSession
      ? "Originating Session Conducted"
      : "Direct Referral Initiated",
    category: "SESSION THAT STARTED REFERRAL",
    timestamp: origTs,
    formattedDate: origDate.date,
    formattedTime: origDate.time,
    relativeLabel: "Step 1",
    status: "COMPLETED",
    icon: "videocam-outline",
    iconBg: "rgba(59, 130, 246, 0.15)",
    iconColor: Colors.statusInfo,
    accentColor: Colors.statusInfo,
    details: (
      <View style={styles.eventDetailCard}>
        {hasOriginatingSession && originatingSession ? (
          <>
            <View style={styles.originatingBadgeRow}>
              <View style={styles.originatingTag}>
                <Ionicons name="sparkles" size={11} color={Colors.statusInfo} />
                <Text style={styles.originatingTagText} allowFontScaling={false}>
                  Originating Consultation Session
                </Text>
              </View>
              <View style={styles.completedPill}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.statusSuccess} />
                <Text style={styles.completedPillText} allowFontScaling={false}>Completed</Text>
              </View>
            </View>

            <View style={styles.personRow}>
              <View style={styles.avatarMini}>
                <Text style={styles.avatarInitial} allowFontScaling={false}>
                  {displayName(referringExpert.profile).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.personNameBold} allowFontScaling={false}>
                  {displayName(referringExpert.profile)}
                </Text>
                <Text style={styles.personSubtext} allowFontScaling={false}>
                  Referring Provider · {referringExpert.subscription?.jobTitle ?? "Expert Provider"}
                </Text>
              </View>
            </View>

            <View style={styles.sessionMetaGrid}>
              <View style={styles.metaBox}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaValue} allowFontScaling={false}>
                  {originatingSession.sessionDate || "Completed Session"}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Ionicons name="time-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaValue} allowFontScaling={false}>
                  {originatingSession.duration ? `${originatingSession.duration} mins` : "60 mins"}
                </Text>
              </View>
              <View style={styles.metaBox}>
                <Ionicons name="pricetag-outline" size={13} color={Colors.textMuted} />
                <Text style={styles.metaValue} allowFontScaling={false}>
                  {originatingSession.totalAmount
                    ? formatPrice(originatingSession.totalAmount, originatingSession.currency)
                    : "Consultation"}
                </Text>
              </View>
            </View>

            <Text style={styles.originatingNote} allowFontScaling={false}>
              During this initial session, {displayName(referringExpert.profile)} identified key patient care needs and initiated a specialized referral workflow.
            </Text>
          </>
        ) : (
          <View style={styles.standaloneWrap}>
            <Ionicons name="git-pull-request-outline" size={20} color={Colors.statusInfo} />
            <Text style={styles.standaloneTitle} allowFontScaling={false}>
              Standalone Provider Referral
            </Text>
            <Text style={styles.standaloneText} allowFontScaling={false}>
              {displayName(referringExpert.profile)} created a direct patient referral for {displayName(patient.profile)}.
            </Text>
          </View>
        )}
      </View>
    ),
  });

  // ─── 2. Referral Created Event ─────────────────────────────────────────────
  const refCreatedDate = formatFullDate(referral.createdAt);
  events.push({
    id: "referral-created",
    title: "Referral Issued & 3 Experts Suggested",
    category: "REFERRAL CREATION",
    timestamp: referral.createdAt,
    formattedDate: refCreatedDate.date,
    formattedTime: refCreatedDate.time,
    relativeLabel: "Step 2",
    status: "COMPLETED",
    icon: "git-network-outline",
    iconBg: "rgba(198, 34, 41, 0.15)",
    iconColor: Colors.actionPrimary,
    accentColor: Colors.actionPrimary,
    details: (
      <View style={styles.eventDetailCard}>
        <Text style={styles.referralTitleBold} allowFontScaling={false}>
          {referral.title}
        </Text>

        <View style={styles.rateBadgeRow}>
          <View style={styles.commissionRatePill}>
            <Ionicons name="cash-outline" size={12} color={Colors.actionPrimary} />
            <Text style={styles.commissionRateText} allowFontScaling={false}>
              {(referral.commissionRate * 100).toFixed(0)}% Commission Terms
            </Text>
          </View>
          <View style={styles.expertsCountPill}>
            <Ionicons name="people-outline" size={12} color={Colors.textPrimary} />
            <Text style={styles.expertsCountText} allowFontScaling={false}>
              {suggestedExpertsDetails.length} Curated Options
            </Text>
          </View>
        </View>

        <Text style={styles.suggestedHeader} allowFontScaling={false}>
          Suggested Specialist Options Provided to Patient:
        </Text>
        <View style={styles.suggestedExpertsList}>
          {suggestedExpertsDetails.map((exp: any, idx: number) => {
            const isChosen = exp.id === referral.selectedExpertId;
            return (
              <View
                key={exp.id || idx}
                style={[
                  styles.suggestedExpertChip,
                  isChosen && styles.suggestedExpertChipChosen,
                ]}
              >
                <View style={styles.avatarTiny}>
                  <Text style={styles.avatarTinyText} allowFontScaling={false}>
                    {displayName(exp.profile).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestedName} numberOfLines={1} allowFontScaling={false}>
                    {displayName(exp.profile)}
                  </Text>
                  <Text style={styles.suggestedJob} numberOfLines={1} allowFontScaling={false}>
                    {exp.subscription?.jobTitle ?? "Specialist"}
                  </Text>
                </View>
                {isChosen && (
                  <View style={styles.chosenTag}>
                    <Ionicons name="checkmark-circle" size={10} color={Colors.statusSuccess} />
                    <Text style={styles.chosenTagText} allowFontScaling={false}>CHOSEN</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </View>
    ),
  });

  // ─── 3. Chosen Provider Selection Event ───────────────────────────────────
  const isDeclined = referral.status === "DECLINED";
  const isAccepted = !!referral.selectedExpertId || referral.status === "ACCEPTED" || referral.status === "COMPLETED";
  const chosenTs = referral.respondedAt ?? referral.updatedAt ?? referral.createdAt;
  const chosenDate = formatFullDate(chosenTs);

  events.push({
    id: "provider-chosen",
    title: isDeclined
      ? "Referral Declined by Patient"
      : isAccepted
      ? `Chosen Provider Selected: ${selectedExpert ? displayName(selectedExpert.profile) : "Specialist Selected"}`
      : "Awaiting Patient Provider Selection",
    category: "CHOSEN PROVIDER SELECTION",
    timestamp: chosenTs,
    formattedDate: chosenDate.date,
    formattedTime: chosenDate.time,
    relativeLabel: "Step 3",
    status: isDeclined ? "DECLINED" : isAccepted ? "COMPLETED" : "ACTIVE",
    icon: isDeclined ? "close-circle-outline" : isAccepted ? "checkmark-circle-outline" : "time-outline",
    iconBg: isDeclined
      ? "rgba(239, 68, 68, 0.15)"
      : isAccepted
      ? "rgba(34, 197, 94, 0.15)"
      : "rgba(245, 158, 11, 0.15)",
    iconColor: isDeclined ? Colors.statusDanger : isAccepted ? Colors.statusSuccess : Colors.statusWarning,
    accentColor: isDeclined ? Colors.statusDanger : isAccepted ? Colors.statusSuccess : Colors.statusWarning,
    details: (
      <View style={styles.eventDetailCard}>
        {isDeclined ? (
          <View style={styles.declinedBox}>
            <Ionicons name="alert-circle-outline" size={20} color={Colors.statusDanger} />
            <Text style={styles.declinedTitle} allowFontScaling={false}>
              Patient opted not to proceed with offered providers
            </Text>
            {referral.declineReason && (
              <Text style={styles.declinedReason} allowFontScaling={false}>
                "{referral.declineReason}"
              </Text>
            )}
          </View>
        ) : isAccepted && selectedExpert ? (
          <View style={styles.chosenProviderCard}>
            <View style={styles.chosenHeader}>
              <View style={styles.chosenAvatar}>
                <Text style={styles.chosenAvatarInitial} allowFontScaling={false}>
                  {displayName(selectedExpert.profile).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.chosenBadgeRow}>
                  <Text style={styles.chosenRoleTag} allowFontScaling={false}>CHOSEN PROVIDER</Text>
                  <Ionicons name="checkmark-circle" size={14} color={Colors.statusSuccess} />
                </View>
                <Text style={styles.chosenName} allowFontScaling={false}>
                  {displayName(selectedExpert.profile)}
                </Text>
                <Text style={styles.chosenTitle} allowFontScaling={false}>
                  {selectedExpert.subscription?.jobTitle ?? "Selected Health Specialist"}
                </Text>
              </View>
            </View>
            {selectedExpert.subscription?.oneOnOnePrice != null && (
              <View style={styles.rateRow}>
                <Text style={styles.rateLabel} allowFontScaling={false}>Standard Consultation Rate:</Text>
                <Text style={styles.rateValue} allowFontScaling={false}>
                  {formatPrice(selectedExpert.subscription.oneOnOnePrice)} / session
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.pendingSelectionBox}>
            <Ionicons name="hourglass-outline" size={22} color={Colors.statusWarning} />
            <Text style={styles.pendingSelectionTitle} allowFontScaling={false}>
              Patient review in progress
            </Text>
            <Text style={styles.pendingSelectionSub} allowFontScaling={false}>
              The patient has received the 3 provider options and will make a selection shortly.
            </Text>
          </View>
        )}
      </View>
    ),
  });

  // ─── 4. Care Team Private Circle Event ─────────────────────────────────────
  const circleReady = !!referralCircle || (isAccepted && !isDeclined);
  const circleTs = referralCircle?.createdAt ?? chosenTs;
  const circleDate = formatFullDate(circleTs);

  events.push({
    id: "care-circle",
    title: referralCircle
      ? `3-Way Private Care Circle: ${referralCircle.name}`
      : isAccepted
      ? "Setting up Private 3-Way Care Circle…"
      : "Care Team Circle Pending Provider Selection",
    category: "CARE TEAM CIRCLE",
    timestamp: circleTs,
    formattedDate: circleDate.date,
    formattedTime: circleDate.time,
    relativeLabel: "Step 4",
    status: referralCircle ? "COMPLETED" : isAccepted ? "ACTIVE" : "PENDING",
    icon: "chatbubbles-outline",
    iconBg: "rgba(139, 104, 48, 0.2)",
    iconColor: Colors.amber,
    accentColor: Colors.amber,
    details: (
      <View style={styles.eventDetailCard}>
        {referralCircle ? (
          <View style={styles.circleDetailsWrap}>
            <View style={styles.circleHeaderRow}>
              <Ionicons name="lock-closed" size={14} color={Colors.amber} />
              <Text style={styles.circleTypeLabel} allowFontScaling={false}>
                PRIVATE 3-WAY CARE CIRCLE
              </Text>
              <View style={styles.membersCountTag}>
                <Ionicons name="people" size={10} color={Colors.textSecondary} />
                <Text style={styles.membersCountText} allowFontScaling={false}>
                  {referralCircle.currentMembers} Members
                </Text>
              </View>
            </View>

            <Text style={styles.circleDesc} allowFontScaling={false}>
              Collaborative workspace connecting {displayName(patient.profile)}, referring provider {displayName(referringExpert.profile)}, and chosen provider {selectedExpert ? displayName(selectedExpert.profile) : "selected expert"}.
            </Text>

            <TouchableOpacity
              style={styles.openChatBtn}
              onPress={() => {
                if (onNavigateToCircle) {
                  onNavigateToCircle(referralCircle._id);
                } else {
                  router.push({
                    pathname: "/(tabs)/circle-chat",
                    params: { circleId: referralCircle._id },
                  } as any);
                }
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open Private Care Circle Chat"
            >
              <Ionicons name="chatbubbles" size={16} color="#FFFFFF" />
              <Text style={styles.openChatBtnText} allowFontScaling={false}>
                Open Care Circle Chat
              </Text>
              <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.mutedStepNote} allowFontScaling={false}>
            A private care team circle will be automatically provisioned as soon as provider selection is confirmed.
          </Text>
        )}
      </View>
    ),
  });

  // ─── 5. Follow-Up Booking Event ────────────────────────────────────────────
  const bookingTs = followUpBooking?.createdAt ?? (followUpBooking?.sessionDate ? new Date(followUpBooking.sessionDate).getTime() : chosenTs);
  const bookingDate = formatFullDate(bookingTs);
  const isBooked = !!followUpBooking || !!referral.bookingId;

  events.push({
    id: "followup-booking",
    title: followUpBooking
      ? `Follow-Up Consultation Scheduled`
      : "Follow-Up Consultation Booking",
    category: "FOLLOW-UP SESSION",
    timestamp: bookingTs,
    formattedDate: bookingDate.date,
    formattedTime: bookingDate.time,
    relativeLabel: "Step 5",
    status: followUpBooking ? (followUpBooking.status === "COMPLETED" ? "COMPLETED" : "ACTIVE") : "PENDING",
    icon: "calendar-clear-outline",
    iconBg: "rgba(59, 130, 246, 0.15)",
    iconColor: Colors.statusInfo,
    accentColor: Colors.statusInfo,
    details: (
      <View style={styles.eventDetailCard}>
        {followUpBooking ? (
          <View style={styles.bookingBox}>
            <View style={styles.bookingHeader}>
              <Ionicons name="checkmark-done-circle" size={16} color={Colors.statusSuccess} />
              <Text style={styles.bookingStatusText} allowFontScaling={false}>
                BOOKED & CONFIRMED
              </Text>
            </View>
            <View style={styles.bookingRow}>
              <Ionicons name="calendar" size={14} color={Colors.statusInfo} />
              <Text style={styles.bookingValue} allowFontScaling={false}>
                {followUpBooking.sessionDate} at {followUpBooking.sessionTime}
              </Text>
            </View>
            <View style={styles.bookingRow}>
              <Ionicons name="pricetag" size={14} color={Colors.statusInfo} />
              <Text style={styles.bookingValue} allowFontScaling={false}>
                Total Paid: {formatPrice(followUpBooking.totalAmount, followUpBooking.currency)}
              </Text>
            </View>
          </View>
        ) : isAccepted && selectedExpert ? (
          <View style={styles.bookCTAWrap}>
            <Text style={styles.bookCTAPrompt} allowFontScaling={false}>
              Patient is ready to schedule their follow-up appointment with {displayName(selectedExpert.profile)}.
            </Text>
            <TouchableOpacity
              style={styles.bookActionBtn}
              onPress={() => {
                if (onNavigateToBooking) {
                  onNavigateToBooking(selectedExpert.id);
                } else {
                  router.push({
                    pathname: "/(tabs)/booking/[id]",
                    params: { id: selectedExpert.id, referralId: referral._id },
                  } as any);
                }
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Book session with chosen expert"
            >
              <Ionicons name="calendar-outline" size={16} color="#FFFFFF" />
              <Text style={styles.bookActionBtnText} allowFontScaling={false}>
                Book Session Now
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.mutedStepNote} allowFontScaling={false}>
            Booking will open once the patient confirms their expert selection.
          </Text>
        )}
      </View>
    ),
  });

  // ─── 6. Referral Commission Settlement Event ──────────────────────────────
  const isCommissionPaid = referral.commissionPaid;
  const commTs = referral.completedAt ?? referral.updatedAt ?? bookingTs;
  const commDate = formatFullDate(commTs);

  events.push({
    id: "commission-paid",
    title: isCommissionPaid
      ? "10% Referral Commission Settled & Paid"
      : referral.commissionAmount
      ? "10% Referral Commission Calculated"
      : "Referral Commission Pending",
    category: "COMMISSION SETTLEMENT",
    timestamp: commTs,
    formattedDate: commDate.date,
    formattedTime: commDate.time,
    relativeLabel: "Step 6",
    status: isCommissionPaid ? "COMPLETED" : referral.commissionAmount ? "ACTIVE" : "PENDING",
    icon: "cash-outline",
    iconBg: isCommissionPaid ? "rgba(34, 197, 94, 0.15)" : "rgba(198, 34, 41, 0.12)",
    iconColor: isCommissionPaid ? Colors.statusSuccess : Colors.actionPrimary,
    accentColor: isCommissionPaid ? Colors.statusSuccess : Colors.actionPrimary,
    details: (
      <View style={styles.eventDetailCard}>
        <View style={styles.commissionGrid}>
          <View style={styles.commBox}>
            <Text style={styles.commKey} allowFontScaling={false}>Commission Rate</Text>
            <Text style={styles.commVal} allowFontScaling={false}>
              {(referral.commissionRate * 100).toFixed(0)}%
            </Text>
          </View>

          <View style={styles.commBox}>
            <Text style={styles.commKey} allowFontScaling={false}>Payout Amount</Text>
            <Text style={[styles.commVal, { color: Colors.statusSuccess }]} allowFontScaling={false}>
              {referral.commissionAmount
                ? formatPrice(referral.commissionAmount, referral.commissionCurrency ?? "USD")
                : "Pending Booking"}
            </Text>
          </View>
        </View>

        <View style={styles.commStatusBanner}>
          <Ionicons
            name={isCommissionPaid ? "checkmark-circle" : "time"}
            size={14}
            color={isCommissionPaid ? Colors.statusSuccess : Colors.statusWarning}
          />
          <Text
            style={[
              styles.commStatusBannerText,
              { color: isCommissionPaid ? Colors.statusSuccess : Colors.statusWarning },
            ]}
            allowFontScaling={false}
          >
            {isCommissionPaid
              ? `Paid directly to ${displayName(referringExpert.profile)}'s wallet`
              : "Commission automatically settles upon completion of the follow-up session"}
          </Text>
        </View>

        {transaction && (
          <View style={styles.txIdRow}>
            <Text style={styles.txIdLabel} allowFontScaling={false}>Tx ID:</Text>
            <Text style={styles.txIdVal} numberOfLines={1} allowFontScaling={false}>
              {transaction.id}
            </Text>
          </View>
        )}
      </View>
    ),
  });

  // Calculate overall completion count
  const completedCount = events.filter((e) => e.status === "COMPLETED").length;
  const progressPercent = (completedCount / events.length) * 100;

  return (
    <MobileCard style={styles.container}>
      {/* ── Header & Progress Bar ───────────────────────────────────── */}
      <View style={styles.timelineHeader}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconBg}>
            <Ionicons name="git-network" size={18} color={Colors.actionPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle} allowFontScaling={false}>
              Referral Visual Timeline
            </Text>
            <Text style={styles.headerSubtitle} allowFontScaling={false}>
              Chronological lifecycle & care handoff tracking
            </Text>
          </View>
          <View style={styles.stageChip}>
            <Text style={styles.stageChipText} allowFontScaling={false}>
              {completedCount}/{events.length} Completed
            </Text>
          </View>
        </View>

        {/* Progress Track */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* ── Chronological Event Nodes ───────────────────────────────── */}
      <View style={styles.timelineList}>
        {events.map((event, index) => {
          const isLast = index === events.length - 1;
          const isExpanded = expandedSteps[event.id] ?? true;

          return (
            <View key={event.id} style={styles.timelineItem}>
              {/* Vertical Track Line */}
              {!isLast && (
                <View
                  style={[
                    styles.verticalLine,
                    event.status === "COMPLETED" && styles.verticalLineCompleted,
                  ]}
                />
              )}

              {/* Node Icon */}
              <View style={[styles.nodeCircle, { backgroundColor: event.iconBg, borderColor: event.accentColor }]}>
                <Ionicons name={event.icon} size={16} color={event.iconColor} />
              </View>

              {/* Event Content Container */}
              <View style={styles.eventContent}>
                {/* Event Header Bar */}
                <TouchableOpacity
                  style={styles.eventHeaderTouch}
                  onPress={() => toggleExpand(event.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Toggle event ${event.title}`}
                >
                  <View style={styles.eventCategoryRow}>
                    <Text style={[styles.categoryPill, { color: event.accentColor }]} allowFontScaling={false}>
                      {event.category}
                    </Text>
                    <View style={styles.dateStampTag}>
                      <Ionicons name="calendar-outline" size={11} color={Colors.textMuted} />
                      <Text style={styles.dateStampText} allowFontScaling={false}>
                        {event.formattedDate}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.titleRow}>
                    <Text style={styles.eventTitle} allowFontScaling={false}>
                      {event.title}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.textMuted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Collapsible Details */}
                {isExpanded && <View style={styles.detailsWrap}>{event.details}</View>}
              </View>
            </View>
          );
        })}
      </View>
    </MobileCard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    padding: spacing.space4,
    marginVertical: spacing.space2,
  },
  loadingContainer: {
    padding: spacing.space5,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  timelineHeader: {
    marginBottom: spacing.space4,
    gap: spacing.space3,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: "rgba(198, 34, 41, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  stageChip: {
    paddingHorizontal: spacing.space2,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  stageChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.full,
  },

  // Timeline list & nodes
  timelineList: {
    paddingLeft: spacing.space2,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: spacing.space4,
    position: "relative",
  },
  verticalLine: {
    position: "absolute",
    left: 15,
    top: 32,
    bottom: -24,
    width: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    zIndex: 1,
  },
  verticalLineCompleted: {
    backgroundColor: "rgba(34, 197, 94, 0.4)",
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.space3,
    zIndex: 2,
  },
  eventContent: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  eventHeaderTouch: {
    padding: spacing.space3,
    gap: spacing.space1,
  },
  eventCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryPill: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dateStampTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateStampText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.space2,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
  detailsWrap: {
    paddingHorizontal: spacing.space3,
    paddingBottom: spacing.space3,
  },
  eventDetailCard: {
    backgroundColor: Colors.surface,
    padding: spacing.space3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    gap: spacing.space2,
  },

  // Originating Session styles
  originatingBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  originatingTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(59, 130, 246, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  originatingTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.statusInfo,
  },
  completedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  completedPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.statusSuccess,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  personNameBold: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  personSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  sessionMetaGrid: {
    flexDirection: "row",
    gap: spacing.space2,
    marginTop: spacing.space1,
  },
  metaBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  metaValue: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  originatingNote: {
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 16,
    fontStyle: "italic",
  },
  standaloneWrap: {
    alignItems: "center",
    padding: spacing.space2,
    gap: 4,
  },
  standaloneTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  standaloneText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Referral Created styles
  referralTitleBold: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  rateBadgeRow: {
    flexDirection: "row",
    gap: spacing.space2,
  },
  commissionRatePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(198, 34, 41, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  commissionRateText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.actionPrimary,
  },
  expertsCountPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  expertsCountText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  suggestedHeader: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
    marginTop: spacing.space1,
  },
  suggestedExpertsList: {
    gap: spacing.space1,
  },
  suggestedExpertChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: spacing.space2,
    borderRadius: radius.sm,
  },
  suggestedExpertChipChosen: {
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderWidth: 1,
  },
  avatarTiny: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.borderNeutral,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTinyText: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  suggestedName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  suggestedJob: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  chosenTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  chosenTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.statusSuccess,
  },

  // Chosen provider styles
  chosenProviderCard: {
    gap: spacing.space2,
  },
  chosenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  chosenAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.statusSuccess,
    alignItems: "center",
    justifyContent: "center",
  },
  chosenAvatarInitial: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  chosenBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chosenRoleTag: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.statusSuccess,
    letterSpacing: 0.5,
  },
  chosenName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  chosenTitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  rateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: spacing.space2,
    borderRadius: radius.xs,
  },
  rateLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  rateValue: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  declinedBox: {
    alignItems: "center",
    gap: 4,
    padding: spacing.space2,
  },
  declinedTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.statusDanger,
  },
  declinedReason: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  pendingSelectionBox: {
    alignItems: "center",
    gap: 4,
    padding: spacing.space2,
  },
  pendingSelectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.statusWarning,
  },
  pendingSelectionSub: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Care Team Circle styles
  circleDetailsWrap: {
    gap: spacing.space2,
  },
  circleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  circleTypeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.amber,
    flex: 1,
  },
  membersCountTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  membersCountText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  circleDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  openChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    backgroundColor: Colors.actionPrimary,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radius.md,
    marginTop: spacing.space1,
  },
  openChatBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  mutedStepNote: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: "italic",
  },

  // Booking & Followup styles
  bookingBox: {
    gap: spacing.space1,
  },
  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.statusSuccess,
  },
  bookingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bookingValue: {
    fontSize: 12,
    color: Colors.textPrimary,
  },
  bookCTAWrap: {
    gap: spacing.space2,
  },
  bookCTAPrompt: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  bookActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    backgroundColor: Colors.actionPrimary,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radius.md,
  },
  bookActionBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  // Commission styles
  commissionGrid: {
    flexDirection: "row",
    gap: spacing.space2,
  },
  commBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: spacing.space2,
    borderRadius: radius.xs,
  },
  commKey: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  commVal: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 2,
  },
  commStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: spacing.space2,
    borderRadius: radius.xs,
  },
  commStatusBannerText: {
    fontSize: 11,
    flex: 1,
  },
  txIdRow: {
    flexDirection: "row",
    gap: 4,
  },
  txIdLabel: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  txIdVal: {
    fontSize: 10,
    color: Colors.textDim,
    fontFamily: "monospace",
  },
});
