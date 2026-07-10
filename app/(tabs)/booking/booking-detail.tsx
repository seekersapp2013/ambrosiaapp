/**
 * booking-detail.tsx
 * Single booking detail — works for both client and provider.
 * Route: /(tabs)/booking/booking-detail?bookingId=<id>
 *
 * Client sees: session info, status, cancel button (with refund)
 * Provider sees: same, plus Confirm/Decline buttons if PENDING
 */
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton, DestructiveButton, SecondaryButton } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ReferralCreationForm } from "@/components/booking/ReferralCreationForm";

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED: Colors.statusSuccess, PENDING:   Colors.statusWarning,
  COMPLETED: Colors.statusInfo,    CANCELLED: Colors.statusDanger,
  REJECTED:  Colors.statusDanger,
};
const STATUS_BG: Record<string, string> = {
  CONFIRMED: Colors.statusSuccessBg, PENDING:   Colors.statusWarningBg,
  COMPLETED: Colors.statusInfoBg,    CANCELLED: Colors.statusDangerBg,
  REJECTED:  Colors.statusDangerBg,
};

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric", year:"numeric" }); }
  catch { return d; }
}
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2,"0")} ${h >= 12 ? "PM" : "AM"}`;
}

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={16} color={Colors.actionPrimary}/>
      </View>
      <View style={styles.detailText}>
        <Text style={styles.detailLabel} allowFontScaling={false}>{label}</Text>
        <Text style={styles.detailValue} allowFontScaling={false}>{value}</Text>
      </View>
    </View>
  );
}

export default function BookingDetailScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [showCancel,   setShowCancel]   = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [showDecline,  setShowDecline]  = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [processing,   setProcessing]   = useState(false);
  const [actionError,  setActionError]  = useState("");

  const booking     = useQuery(api.bookings.getBookingById, bookingId ? { bookingId: bookingId as any } : "skip");
  const updateStatus = useMutation(api.bookings.updateBookingStatus);
  const cancelBooking = useMutation(api.bookings.cancelBooking);
  const refundPayment = useMutation(api.bookingPayment.refundBookingPayment);

  const isLoading = booking === undefined;

  if (isLoading) {
    return (
      <AppBackground>
        <ScreenHeader title="Booking Details" onBack={() => router.replace("/(tabs)/booking" as any)}/>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.actionPrimary}/>
        </View>
      </AppBackground>
    );
  }

  if (!booking) {
    return (
      <AppBackground>
        <ScreenHeader title="Booking Details" onBack={() => router.replace("/(tabs)/booking" as any)}/>
        <MobileCard>
          <View style={styles.loadingWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.statusDanger}/>
            <Text style={styles.notFoundText} allowFontScaling={false}>Booking not found</Text>
            <SecondaryButton label="Go Back" onPress={() => router.replace("/(tabs)/booking" as any)} style={{ marginTop: spacing.space4 }}/>
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  const status        = (booking as any).status as string;
  const statusColor   = STATUS_COLOR[status] ?? Colors.iconSecondary;
  const statusBg      = STATUS_BG[status]    ?? Colors.bgElevated;
  const isProvider    = (booking as any).isProvider ?? false;
  const isPending     = status === "PENDING";
  const isConfirmed   = status === "CONFIRMED";
  const canCancel     = status === "PENDING" || status === "CONFIRMED";
  const hasPayment    = !!(booking as any).paymentTxHash?.startsWith("bkp_");

  // ── Join Live Streaming logic ─────────────────────────────────────────────
  const DISABLE_TIME_RESTRICTION =
    process.env.EXPO_PUBLIC_DISABLE_STREAM_TIME_RESTRICTION === "true";
  const streamStatus  = (booking as any).liveStreamStatus as string | undefined;
  const sessionDate   = (booking as any).sessionDate as string;
  const sessionTime   = (booking as any).sessionTime as string;
  const hasStreamEnded = streamStatus === "ENDED";

  function isWithinJoinWindow(date: string, time: string): boolean {
    if (DISABLE_TIME_RESTRICTION) return true;
    try {
      const now = Date.now();
      const sessionMs = new Date(`${date}T${time}`).getTime();
      const diffMin = (sessionMs - now) / 60000;
      return diffMin <= 15 && diffMin >= -90;
    } catch {
      return false;
    }
  }

  const canJoinNow = isConfirmed && !hasStreamEnded && isWithinJoinWindow(sessionDate, sessionTime);
  const isBeforeWindow = isConfirmed && !hasStreamEnded && !isWithinJoinWindow(sessionDate, sessionTime);
  const showJoinBlock  = isConfirmed || hasStreamEnded;

  const providerName = (booking as any).provider?.name ?? "Provider";
  const clientName   = (booking as any).client?.name   ?? "Client";
  const otherParty   = isProvider ? clientName : providerName;

  // ── Confirm ──────────────────────────────────────────────────────────────
  async function handleConfirm() {
    setProcessing(true); setActionError("");
    try {
      await updateStatus({ bookingId: bookingId as any, status: "CONFIRMED" });
      setShowConfirm(false);
    } catch (err: any) { setActionError(err?.message ?? "Failed to confirm."); }
    finally { setProcessing(false); }
  }

  // ── Decline (provider) ───────────────────────────────────────────────────
  async function handleDecline() {
    setProcessing(true); setActionError("");
    try {
      if (hasPayment) await refundPayment({ bookingId: bookingId as any });
      await updateStatus({ bookingId: bookingId as any, status: "CANCELLED" });
      setShowDecline(false);
    } catch (err: any) { setActionError(err?.message ?? "Failed to decline."); }
    finally { setProcessing(false); }
  }

  // ── Cancel (client) ──────────────────────────────────────────────────────
  async function handleCancel() {
    setProcessing(true); setActionError("");
    try {
      if (hasPayment) await refundPayment({ bookingId: bookingId as any });
      await cancelBooking({ bookingId: bookingId as any });
      setShowCancel(false);
      router.replace("/(tabs)/booking" as any);
    } catch (err: any) { setActionError(err?.message ?? "Failed to cancel."); }
    finally { setProcessing(false); }
  }

  return (
    <AppBackground>
      <ScreenHeader title="Booking Details" onBack={() => router.replace("/(tabs)/booking" as any)}/>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MobileCard>
          {/* ── Status banner ──────────────────────────────────── */}
          <View style={[styles.statusBanner, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusBannerText, { color: statusColor }]} allowFontScaling={false}>
              {status}
            </Text>
            {isPending && !isProvider && (
              <Text style={styles.statusSub} allowFontScaling={false}>
                Awaiting provider confirmation
              </Text>
            )}
            {isPending && isProvider && (
              <Text style={styles.statusSub} allowFontScaling={false}>
                Review and respond to this request
              </Text>
            )}
          </View>

          {/* ── Session info ───────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>Session Details</Text>
            <DetailRow icon="person-outline"    label={isProvider ? "Client" : "Provider"} value={otherParty}/>
            <View style={styles.rowDivider}/>
            <DetailRow icon="calendar-outline"  label="Date"      value={formatDate((booking as any).sessionDate)}/>
            <View style={styles.rowDivider}/>
            <DetailRow icon="time-outline"      label="Time"      value={formatTime((booking as any).sessionTime)}/>
            <View style={styles.rowDivider}/>
            <DetailRow icon="hourglass-outline" label="Duration"  value={`${(booking as any).duration} minutes`}/>
            <View style={styles.rowDivider}/>
            <DetailRow icon="people-outline"    label="Type"      value={(booking as any).sessionType === "ONE_TO_MANY" ? "Group Session" : "1-on-1 Session"}/>
          </View>

          {/* ── Payment info ───────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>Payment</Text>
            <DetailRow icon="wallet-outline"    label="Amount"   value={`${(booking as any).currency} ${(booking as any).totalAmount}`}/>
            <View style={styles.rowDivider}/>
            <DetailRow icon="receipt-outline"   label="Method"   value={hasPayment ? "Wallet payment" : "Pending"}/>
            {hasPayment && (
              <>
                <View style={styles.rowDivider}/>
                <DetailRow icon="shield-checkmark-outline" label="Tx Reference" value={(booking as any).paymentTxHash}/>
              </>
            )}
          </View>

          {/* ── Join Live Streaming ────────────────────────────── */}
          {showJoinBlock && (
            <View style={styles.joinSection}>
              <View style={styles.joinSectionHeader}>
                <View style={styles.joinIconWrap}>
                  <Ionicons name="videocam-outline" size={16} color={Colors.actionPrimary} />
                </View>
                <Text style={styles.joinSectionTitle} allowFontScaling={false}>
                  Live Session
                </Text>
                {streamStatus === "LIVE" && (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText} allowFontScaling={false}>LIVE</Text>
                  </View>
                )}
              </View>

              {hasStreamEnded ? (
                /* Session ended state */
                <View style={styles.joinEndedWrap}>
                  <Ionicons name="checkmark-done-circle-outline" size={18} color={Colors.textDisabled} />
                  <Text style={styles.joinEndedText} allowFontScaling={false}>Session has ended</Text>
                </View>
              ) : canJoinNow ? (
                /* Active join button */
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => router.push(`/(tabs)/booking/live-session?bookingId=${bookingId}` as any)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Join live streaming session"
                >
                  <Ionicons name="videocam" size={18} color="#FFFFFF" />
                  <Text style={styles.joinBtnText} allowFontScaling={false}>Join Live Streaming</Text>
                </TouchableOpacity>
              ) : (
                /* Before window — disabled with start time label */
                <View>
                  <TouchableOpacity
                    style={styles.joinBtnDisabled}
                    disabled
                    accessibilityRole="button"
                    accessibilityLabel={`Session starts at ${formatTime(sessionTime)}`}
                  >
                    <Ionicons name="time-outline" size={18} color={Colors.textDisabled} />
                    <Text style={styles.joinBtnDisabledText} allowFontScaling={false}>
                      Starts at {formatTime(sessionTime)}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.joinHint} allowFontScaling={false}>
                    Button activates 15 minutes before your session starts.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Refund notice ──────────────────────────────────── */}
          {canCancel && hasPayment && (
            <View style={styles.refundNotice}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo}/>
              <Text style={styles.refundNoticeText} allowFontScaling={false}>
                {isProvider
                  ? "Declining will automatically refund the client's wallet."
                  : "Cancelling will automatically refund your wallet."}
              </Text>
            </View>
          )}

          {/* ── Provider actions: Confirm / Decline ────────────── */}
          {isProvider && isPending && (
            <View style={styles.actionBlock}>
              <DestructiveButton label="Decline & Refund"
                onPress={() => { setShowDecline(true); setActionError(""); }}
                icon={<Ionicons name="close-circle-outline" size={18} color="#FFF"/>}
                style={styles.actionBtn}
                accessibilityLabel="Decline booking and refund client"/>
              <PrimaryButton label="Confirm Booking"
                onPress={() => { setShowConfirm(true); setActionError(""); }}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFF"/>}
                style={styles.actionBtn}
                accessibilityLabel="Confirm this booking"/>
            </View>
          )}

          {/* ── Client action: Cancel ──────────────────────────── */}
          {!isProvider && canCancel && (
            <View style={styles.actionBlock}>
              <DestructiveButton
                label={hasPayment ? "Cancel & Get Refund" : "Cancel Booking"}
                onPress={() => { setShowCancel(true); setActionError(""); }}
                icon={<Ionicons name="close-circle-outline" size={18} color="#FFF"/>}
                accessibilityLabel="Cancel this booking"/>
            </View>
          )}

          {/* ── Provider: Create Referral (COMPLETED bookings only) ── */}
          {isProvider && status === "COMPLETED" && (
            <View style={styles.actionBlock}>
              <TouchableOpacity
                style={styles.referralBtn}
                onPress={() => setShowReferral(true)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Create a referral for this patient"
              >
                <Ionicons name="git-network-outline" size={18} color={Colors.actionPrimary} />
                <View style={styles.referralBtnText}>
                  <Text style={styles.referralBtnTitle} allowFontScaling={false}>
                    Create Referral
                  </Text>
                  <Text style={styles.referralBtnSub} allowFontScaling={false}>
                    Refer this patient to another expert and earn 10% commission
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.iconSecondary} />
              </TouchableOpacity>
            </View>
          )}
        </MobileCard>
      </ScrollView>

      {/* ── Confirm dialog ─────────────────────────────────────── */}
      <BottomSheet visible={showConfirm} onClose={() => setShowConfirm(false)}
        title="Confirm Booking" variant="dialog" dismissable={!processing}>
        <View style={styles.dialogBody}>
          <Text style={styles.dialogMsg} allowFontScaling={false}>
            Confirm this session with <Text style={styles.dialogEmphasis}>{clientName}</Text> on {formatDate((booking as any).sessionDate)}?
          </Text>
          {actionError !== "" && <Text style={styles.dialogError} allowFontScaling={false}>{actionError}</Text>}
          <View style={styles.dialogBtns}>
            <SecondaryButton label="Cancel" onPress={() => setShowConfirm(false)} style={{ flex:1 }}/>
            <PrimaryButton label="Confirm" onPress={handleConfirm} loading={processing} style={{ flex:1 }}
              icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFF"/>}/>
          </View>
        </View>
      </BottomSheet>

      {/* ── Decline dialog ─────────────────────────────────────── */}
      <BottomSheet visible={showDecline} onClose={() => setShowDecline(false)}
        title="Decline & Refund" variant="dialog" dismissable={!processing}>
        <View style={styles.dialogBody}>
          <View style={styles.refundChip}>
            <Ionicons name="wallet-outline" size={14} color={Colors.statusSuccess}/>
            <Text style={styles.refundChipText} allowFontScaling={false}>
              {(booking as any).currency} {(booking as any).totalAmount} will be refunded automatically
            </Text>
          </View>
          <Text style={styles.dialogMsg} allowFontScaling={false}>
            Decline the booking from <Text style={styles.dialogEmphasis}>{clientName}</Text>?
          </Text>
          {actionError !== "" && <Text style={styles.dialogError} allowFontScaling={false}>{actionError}</Text>}
          <View style={styles.dialogBtns}>
            <SecondaryButton label="Keep" onPress={() => setShowDecline(false)} style={{ flex:1 }}/>
            <DestructiveButton label="Decline & Refund" onPress={handleDecline} loading={processing} style={{ flex:1 }}/>
          </View>
        </View>
      </BottomSheet>

      {/* ── Cancel dialog ──────────────────────────────────────── */}
      <BottomSheet visible={showCancel} onClose={() => setShowCancel(false)}
        title="Cancel Booking" variant="dialog" dismissable={!processing}>
        <View style={styles.dialogBody}>
          {hasPayment && (
            <View style={styles.refundChip}>
              <Ionicons name="wallet-outline" size={14} color={Colors.statusSuccess}/>
              <Text style={styles.refundChipText} allowFontScaling={false}>
                {(booking as any).currency} {(booking as any).totalAmount} will be refunded to your wallet
              </Text>
            </View>
          )}
          <Text style={styles.dialogMsg} allowFontScaling={false}>
            Cancel your session on {formatDate((booking as any).sessionDate)}?
          </Text>
          {actionError !== "" && <Text style={styles.dialogError} allowFontScaling={false}>{actionError}</Text>}
          <View style={styles.dialogBtns}>
            <SecondaryButton label="Keep" onPress={() => setShowCancel(false)} style={{ flex:1 }}/>
            <DestructiveButton label="Yes, Cancel" onPress={handleCancel} loading={processing} style={{ flex:1 }}/>
          </View>
        </View>
      </BottomSheet>

      {/* ── Referral creation sheet ────────────────────────────── */}
      <BottomSheet
        visible={showReferral}
        onClose={() => setShowReferral(false)}
        title="Create Referral"
        dismissable
      >
        {booking && isProvider && (
          <ReferralCreationForm
            booking={{
              _id:        bookingId!,
              clientId:   (booking as any).clientId,
              clientName: clientName,
            }}
            onSuccess={() => {
              setShowReferral(false);
            }}
            onCancel={() => setShowReferral(false)}
          />
        )}
      </BottomSheet>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },
  loadingWrap: { flex:1, alignItems:"center", justifyContent:"center", gap:spacing.space3, paddingVertical:spacing.space10 },
  notFoundText: { ...typeScale.headingMD, color:Colors.textMuted, marginTop:spacing.space3 },

  statusBanner: { margin:spacing.space4, borderRadius:radius.radiusMD, padding:spacing.space4, alignItems:"center", gap:4 },
  statusBannerText: { ...typeScale.headingMD, fontWeight:"700" },
  statusSub: { ...typeScale.bodySM, color:Colors.textMuted },

  section: { paddingHorizontal:spacing.space4, marginBottom:spacing.space5 },
  sectionTitle: { ...typeScale.labelSM, color:Colors.textSecondary, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.7, marginBottom:spacing.space3 },
  detailRow: { flexDirection:"row", alignItems:"flex-start", gap:spacing.space3, paddingVertical:spacing.space3 },
  detailIcon: { width:28, height:28, borderRadius:8, backgroundColor:Colors.bgPrimaryMid, alignItems:"center", justifyContent:"center", flexShrink:0 },
  detailText: { flex:1, gap:2 },
  detailLabel: { ...typeScale.caption, color:Colors.textMuted },
  detailValue: { ...typeScale.bodyMD, color:Colors.textPrimary, fontWeight:"500" },
  rowDivider: { height:1, backgroundColor:Colors.borderSubtle },

  refundNotice: { flexDirection:"row", alignItems:"flex-start", gap:spacing.space2, backgroundColor:Colors.statusInfoBg, borderRadius:radius.radiusMD, borderWidth:1, borderColor:Colors.borderSubtle, padding:spacing.space3, marginHorizontal:spacing.space4, marginBottom:spacing.space4 },
  refundNoticeText: { ...typeScale.bodySM, color:Colors.statusInfo, flex:1, lineHeight:18 },

  actionBlock: { paddingHorizontal:spacing.space4, paddingBottom:spacing.space5, gap:spacing.space3 },
  actionBtn: { width:"100%" },

  dialogBody: { paddingTop:spacing.space2, gap:spacing.space3 },
  dialogMsg: { ...typeScale.bodyMD, color:Colors.textMuted, textAlign:"center", lineHeight:22 },
  dialogEmphasis: { color:Colors.textPrimary, fontWeight:"600" },
  dialogError: { ...typeScale.bodySM, color:Colors.statusDanger, textAlign:"center" },
  dialogBtns: { flexDirection:"row", gap:spacing.space3, marginTop:spacing.space2 },
  refundChip: { flexDirection:"row", alignItems:"flex-start", gap:spacing.space2, backgroundColor:Colors.statusSuccessBg, borderRadius:radius.radiusMD, borderWidth:1, borderColor:Colors.statusSuccess, padding:spacing.space3 },
  refundChipText: { ...typeScale.bodySM, color:Colors.statusSuccess, flex:1, lineHeight:18 },

  // Referral button
  referralBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
    padding: spacing.space4,
  },
  referralBtnText: { flex: 1, gap: 3 },
  referralBtnTitle: { ...typeScale.headingSM, fontSize: 13, color: Colors.actionPrimary, fontWeight: "700" },
  referralBtnSub: { ...typeScale.caption, color: Colors.textMuted, lineHeight: 15 },

  // Join Live Streaming block
  joinSection: {
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
  },
  joinSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  joinIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
  },
  joinSectionTitle: {
    ...typeScale.headingSM,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "700",
    flex: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.statusDangerBg,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.statusDanger,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.statusDanger,
    letterSpacing: 0.8,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    paddingVertical: 12,
    paddingHorizontal: spacing.space4,
  },
  joinBtnText: {
    ...typeScale.labelMD,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  joinBtnDisabled: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    backgroundColor: Colors.bgPrimaryMid,
    borderRadius: radius.radiusFull,
    paddingVertical: 12,
    paddingHorizontal: spacing.space4,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  joinBtnDisabledText: {
    ...typeScale.labelMD,
    color: Colors.textDisabled,
    fontWeight: "600",
  },
  joinHint: {
    ...typeScale.caption,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: spacing.space2,
    lineHeight: 16,
  },
  joinEndedWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    paddingVertical: spacing.space3,
  },
  joinEndedText: {
    ...typeScale.bodyMD,
    color: Colors.textDisabled,
  },
});
