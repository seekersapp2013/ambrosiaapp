/**
 * BookingConfirmation
 *
 * Final step before creating the booking.
 * Flow:
 *   1. Shows summary + wallet balance check (checkBookingAffordability)
 *   2. "Confirm & Pay" → payForBooking (wallet debit + tx record)
 *   3. createBooking  (booking record with paymentTxHash = transactionId)
 *   4. Success screen with "View My Bookings" CTA
 *
 * Access after payment is controlled by booking.status === "CONFIRMED",
 * which then allows generateAccessToken to be called for the session.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { useTabBarHeight } from "@/utils/useDeviceClass";
import type { CalendarSelection } from "./BookingCalendar";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProviderInfo {
  userId: string;
  name: string;
  jobTitle: string;
  specialization: string;
  avatar?: string;
  currency: string;
  oneOnOnePrice: number;
}

interface BookingConfirmationProps {
  provider: ProviderInfo;
  selection: CalendarSelection;
  onBack: () => void;
  onSuccess: (bookingId: string) => void;
  /** Optional: if present, booking is linked to this referral after creation */
  referralId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDateLong(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function BookingConfirmation({
  provider,
  selection,
  onBack,
  onSuccess,
  referralId,
}: BookingConfirmationProps) {
  const [step, setStep] = useState<"summary" | "processing" | "success" | "error">(
    "summary"
  );
  const [errorMsg, setErrorMsg]   = useState("");
  const [bookingId, setBookingId] = useState("");

  // Tab-bar-aware bottom inset so the sticky footer clears the nav bar (fix #5)
  const insets       = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const footerBottom = tabBarHeight + insets.bottom;

  // ── Computed values ────────────────────────────────────────────────────────
  const totalAmount = parseFloat(
    ((selection.duration / 60) * provider.oneOnOnePrice).toFixed(2)
  );
  const currency = provider.currency;

  // ── Queries ────────────────────────────────────────────────────────────────
  const affordability = useQuery(api.bookingPayment.checkBookingAffordability, {
    amount: totalAmount,
    currency,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const payForBooking       = useMutation(api.bookingPayment.payForBooking);
  const createBooking       = useMutation(api.bookings.createBooking);
  const linkBookingToReferral = useMutation(api.referrals.linkBookingToReferral);

  // ── Payment handler ────────────────────────────────────────────────────────
  async function handleConfirmAndPay() {
    if (!affordability?.canAfford) return;
    setStep("processing");
    setErrorMsg("");

    try {
      // Step 1 — Debit wallet & create transaction record
      const payResult = await payForBooking({
        providerId: provider.userId as any,
        amount: totalAmount,
        currency,
        sessionDate: selection.date,
        sessionTime: selection.time,
        duration: selection.duration,
        sessionType: "ONE_ON_ONE",
      });

      // Step 2 — Create booking record with payment tx hash
      const newBookingId = await createBooking({
        providerId: provider.userId as any,
        sessionDate: selection.date,
        sessionTime: selection.time,
        duration: selection.duration,
        paymentTxHash: payResult.transactionId,
      });

      // Step 3 — Link to referral if this booking came from a referral flow
      if (referralId) {
        try {
          await linkBookingToReferral({
            referralId: referralId as any,
            bookingId:  newBookingId as any,
          });
        } catch {
          // Non-fatal — booking is still created successfully
        }
      }

      setBookingId(newBookingId as string);
      setStep("success");
      onSuccess(newBookingId as string);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Something went wrong. Please try again.");
      setStep("error");
    }
  }

  // ── Retry ──────────────────────────────────────────────────────────────────
  function handleRetry() {
    setStep("summary");
    setErrorMsg("");
  }

  // ── PROCESSING ─────────────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <View style={styles.centeredWrap}>
        <ActivityIndicator size="large" color={Colors.actionPrimary} />
        <Text style={styles.processingText} allowFontScaling={false}>
          Processing payment…
        </Text>
        <Text style={styles.processingSubText} allowFontScaling={false}>
          Debiting {currency} {totalAmount.toFixed(2)} from your wallet
        </Text>
      </View>
    );
  }

  // ── SUCCESS ─────────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <View style={styles.centeredWrap}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.statusSuccess} />
        </View>
        <Text style={styles.successTitle} allowFontScaling={false}>
          Booking Confirmed!
        </Text>
        <Text style={styles.successSubtitle} allowFontScaling={false}>
          Your session with {provider.name} is scheduled.
        </Text>

        <View style={styles.successDetails}>
          <View style={styles.successRow}>
            <Ionicons name="calendar-outline" size={16} color={Colors.iconSecondary} />
            <Text style={styles.successDetailText} allowFontScaling={false}>
              {formatDateLong(selection.date)}
            </Text>
          </View>
          <View style={styles.successRow}>
            <Ionicons name="time-outline" size={16} color={Colors.iconSecondary} />
            <Text style={styles.successDetailText} allowFontScaling={false}>
              {formatTime(selection.time)} · {selection.duration} min
            </Text>
          </View>
          <View style={styles.successRow}>
            <Ionicons name="wallet-outline" size={16} color={Colors.iconSecondary} />
            <Text style={styles.successDetailText} allowFontScaling={false}>
              {currency} {totalAmount.toFixed(2)} paid from wallet
            </Text>
          </View>
        </View>

        <View style={styles.accessInfo}>
          <Ionicons name="videocam-outline" size={18} color={Colors.statusInfo} />
          <Text style={styles.accessInfoText} allowFontScaling={false}>
            The "Join Session" button will activate 15 minutes before your session starts.
          </Text>
        </View>
      </View>
    );
  }

  // ── ERROR ───────────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <View style={styles.centeredWrap}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle" size={56} color={Colors.statusDanger} />
        </View>
        <Text style={styles.errorTitle} allowFontScaling={false}>Payment Failed</Text>
        <Text style={styles.errorMsg} allowFontScaling={false}>{errorMsg}</Text>
        <View style={styles.errorBtns}>
          <SecondaryButton label="Go Back" onPress={onBack} style={styles.errorBtn} />
          <PrimaryButton label="Try Again" onPress={handleRetry} style={styles.errorBtn} />
        </View>
      </View>
    );
  }

  // ── SUMMARY (default) ───────────────────────────────────────────────────────
  const isLoadingAffordability = affordability === undefined;
  const canAfford = affordability?.canAfford ?? false;
  const walletBalance = affordability?.balance ?? 0;
  const shortfall = affordability?.shortfall ?? 0;

  return (
    <View style={styles.summaryRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      {/* ── Provider summary ──────────────────────────────────── */}
      <View style={styles.providerCard}>
        {provider.avatar ? (
          <Image
            source={{ uri: provider.avatar }}
            style={styles.providerAvatar}
            accessibilityLabel={`${provider.name} avatar`}
          />
        ) : (
          <View style={styles.providerAvatarFallback}>
            <Text style={styles.providerInitial} allowFontScaling={false}>
              {provider.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.providerInfo}>
          <Text style={styles.providerName} numberOfLines={1} allowFontScaling={false}>
            {provider.name}
          </Text>
          <Text style={styles.providerTitle} numberOfLines={1} allowFontScaling={false}>
            {provider.jobTitle}
          </Text>
          <View style={styles.specBadge}>
            <Text style={styles.specText} numberOfLines={1} allowFontScaling={false}>
              {provider.specialization}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Session details ───────────────────────────────────── */}
      <View style={styles.detailsCard}>
        <Text style={styles.cardSectionTitle} allowFontScaling={false}>
          Session Details
        </Text>
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="calendar-outline" size={16} color={Colors.actionPrimary} />
          </View>
          <View>
            <Text style={styles.detailLabel} allowFontScaling={false}>Date</Text>
            <Text style={styles.detailValue} allowFontScaling={false}>
              {formatDateLong(selection.date)}
            </Text>
          </View>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="time-outline" size={16} color={Colors.actionPrimary} />
          </View>
          <View>
            <Text style={styles.detailLabel} allowFontScaling={false}>Time</Text>
            <Text style={styles.detailValue} allowFontScaling={false}>
              {formatTime(selection.time)}
            </Text>
          </View>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailRow}>
          <View style={styles.detailIconWrap}>
            <Ionicons name="hourglass-outline" size={16} color={Colors.actionPrimary} />
          </View>
          <View>
            <Text style={styles.detailLabel} allowFontScaling={false}>Duration</Text>
            <Text style={styles.detailValue} allowFontScaling={false}>
              {selection.duration} minutes · 1-on-1 session
            </Text>
          </View>
        </View>
      </View>

      {/* ── Pricing breakdown ─────────────────────────────────── */}
      <View style={styles.pricingCard}>
        <Text style={styles.cardSectionTitle} allowFontScaling={false}>
          Payment Breakdown
        </Text>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel} allowFontScaling={false}>
            Rate ({provider.oneOnOnePrice} {currency}/hr)
          </Text>
          <Text style={styles.pricingValue} allowFontScaling={false}>
            {currency} {provider.oneOnOnePrice}
          </Text>
        </View>
        <View style={styles.pricingRow}>
          <Text style={styles.pricingLabel} allowFontScaling={false}>
            Duration
          </Text>
          <Text style={styles.pricingValue} allowFontScaling={false}>
            × {(selection.duration / 60).toFixed(2)} hr
          </Text>
        </View>
        <View style={styles.pricingDivider} />
        <View style={styles.pricingRow}>
          <Text style={styles.pricingTotalLabel} allowFontScaling={false}>
            Total Due
          </Text>
          <Text style={styles.pricingTotalValue} allowFontScaling={false}>
            {currency} {totalAmount.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* ── Wallet balance ────────────────────────────────────── */}
      <View style={[styles.walletCard, !canAfford && !isLoadingAffordability && styles.walletCardInsufficient]}>
        <View style={styles.walletRow}>
          <Ionicons
            name="wallet-outline"
            size={18}
            color={canAfford ? Colors.statusSuccess : Colors.statusDanger}
          />
          <Text style={styles.walletLabel} allowFontScaling={false}>
            Wallet Balance ({currency})
          </Text>
          {isLoadingAffordability ? (
            <ActivityIndicator size="small" color={Colors.actionPrimary} />
          ) : (
            <Text
              style={[
                styles.walletBalance,
                { color: canAfford ? Colors.statusSuccess : Colors.statusDanger },
              ]}
              allowFontScaling={false}
            >
              {currency} {walletBalance.toFixed(2)}
            </Text>
          )}
        </View>
        {!isLoadingAffordability && !canAfford && (
          <View style={styles.insufficientWrap}>
            <Ionicons name="alert-circle-outline" size={14} color={Colors.statusDanger} />
            <Text style={styles.insufficientText} allowFontScaling={false}>
              Insufficient balance. You need {currency} {shortfall.toFixed(2)} more. Please fund your wallet.
            </Text>
          </View>
        )}
      </View>

      {/* ── Action buttons — sticky footer, always visible ────── */}
      </ScrollView>
      <View style={[styles.actionBtns, { paddingBottom: footerBottom }]}>
        <SecondaryButton
          label="Back"
          onPress={onBack}
          style={styles.backBtn}
          accessibilityLabel="Go back to calendar"
        />
        <PrimaryButton
          label={`Confirm & Pay ${currency} ${totalAmount.toFixed(2)}`}
          onPress={handleConfirmAndPay}
          disabled={!canAfford || isLoadingAffordability}
          loading={step === "processing"}
          style={styles.payBtn}
          icon={<Ionicons name="lock-closed-outline" size={18} color="#FFFFFF" />}
          accessibilityLabel={`Confirm and pay ${currency} ${totalAmount.toFixed(2)}`}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  summaryRoot: {
    flex: 1,
    // Buttons sit outside the scroll as a sticky footer
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space2,
    paddingBottom: spacing.space4,
  },

  // Centered states
  centeredWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.space6,
    paddingVertical: spacing.space10,
    gap: spacing.space3,
  },
  processingText: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    marginTop: spacing.space4,
  },
  processingSubText: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Success
  successIconWrap: {
    marginBottom: spacing.space2,
  },
  successTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  successSubtitle: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },
  successDetails: {
    width: "100%",
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
    marginTop: spacing.space4,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
  },
  successDetailText: {
    ...typeScale.bodyMD,
    color: Colors.textSecondary,
    flex: 1,
  },
  accessInfo: {
    flexDirection: "row",
    gap: spacing.space3,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
    marginTop: spacing.space2,
    alignItems: "flex-start",
  },
  accessInfoText: {
    ...typeScale.bodySM,
    color: Colors.statusInfo,
    flex: 1,
    lineHeight: 18,
  },

  // Error
  errorIconWrap: { marginBottom: spacing.space2 },
  errorTitle: {
    ...typeScale.headingMD,
    color: Colors.statusDanger,
    fontWeight: "700",
  },
  errorMsg: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  errorBtns: {
    flexDirection: "row",
    gap: spacing.space3,
    marginTop: spacing.space4,
    width: "100%",
  },
  errorBtn: { flex: 1 },

  // Provider card
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space3,
    marginTop: spacing.space2,
  },
  providerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.borderFilled,
    flexShrink: 0,
  },
  providerAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 2,
    borderColor: Colors.borderFilled,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  providerInitial: {
    ...typeScale.headingMD,
    color: Colors.actionPrimary,
    fontWeight: "700",
  },
  providerInfo: { flex: 1, gap: 3 },
  providerName: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  providerTitle: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  specBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
  },
  specText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.actionPrimary,
  },

  // Details card
  detailsCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space3,
  },
  cardSectionTitle: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.space3,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
    paddingVertical: spacing.space2,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  detailLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },

  // Pricing card
  pricingCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space3,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.space2,
  },
  pricingLabel: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
  },
  pricingValue: {
    ...typeScale.bodyMD,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  pricingDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: spacing.space2,
  },
  pricingTotalLabel: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  pricingTotalValue: {
    ...typeScale.headingMD,
    color: Colors.actionPrimary,
    fontWeight: "700",
  },

  // Wallet card
  walletCard: {
    backgroundColor: Colors.statusSuccessBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.statusSuccess,
    padding: spacing.space4,
    marginBottom: spacing.space3,
  },
  walletCardInsufficient: {
    backgroundColor: Colors.statusDangerBg,
    borderColor: Colors.statusDanger,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  walletLabel: {
    ...typeScale.bodyMD,
    color: Colors.textSecondary,
    flex: 1,
  },
  walletBalance: {
    ...typeScale.headingSM,
    fontWeight: "700",
  },
  insufficientWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    marginTop: spacing.space2,
  },
  insufficientText: {
    ...typeScale.bodySM,
    color: Colors.statusDanger,
    flex: 1,
    lineHeight: 17,
  },

  // What to Expect
  expectCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space4,
    gap: spacing.space3,
  },
  expectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
  },
  expectText: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },

  // Action buttons — sticky footer
  actionBtns: {
    flexDirection: "row",
    gap: spacing.space3,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    paddingBottom: spacing.space3, // base; dynamic footerBottom added inline
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    backgroundColor: "transparent",
  },
  backBtn: { flex: 1 },
  payBtn:  { flex: 2 },
});
