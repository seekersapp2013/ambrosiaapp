/**
 * my-sessions.tsx
 * Provider view: all bookings made WITH them.
 * Shows Pending requests with Confirm / Decline actions.
 * Decline triggers refundBookingPayment before cancelling the booking.
 */
import React, { useState, useMemo } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, Image,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyStateCard } from "@/components/ui/Card";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PrimaryButton, DestructiveButton, SecondaryButton } from "@/components/ui/Button";

// ─── Status tokens ────────────────────────────────────────────────────────────
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

type FilterKey = "ALL" | "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL",       label: "All" },
  { key: "PENDING",   label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}
function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// ─── Session Request Card ─────────────────────────────────────────────────────
function SessionCard({
  booking, onConfirm, onDecline, onView,
}: {
  booking: any;
  onConfirm: () => void;
  onDecline: () => void;
  onView: () => void;
}) {
  const status      = booking.status as string;
  const color       = STATUS_COLOR[status] ?? Colors.iconSecondary;
  const bg          = STATUS_BG[status]    ?? Colors.bgElevated;
  const clientName  = booking.client?.profile?.name ?? booking.client?.profile?.username ?? "Client";
  const isPending   = status === "PENDING";
  const isConfirmed = status === "CONFIRMED";

  return (
    <TouchableOpacity style={styles.card} onPress={onView} activeOpacity={0.85}
      accessibilityRole="button" accessibilityLabel={`Session with ${clientName}`}>
      {/* Header */}
      <View style={styles.cardHead}>
        {/* Client avatar */}
        <View style={styles.clientAvatar}>
          {booking.client?.profile?.avatar ? (
            <Image source={{ uri: booking.client.profile.avatar }} style={styles.avatarImg}
              accessibilityLabel={`${clientName} avatar`}/>
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial} allowFontScaling={false}>
                {clientName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName} numberOfLines={1} allowFontScaling={false}>{clientName}</Text>
          <Text style={styles.sessionType} allowFontScaling={false}>
            {booking.sessionType === "ONE_TO_MANY" ? "Group" : "1-on-1"} · {booking.duration} min
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color }]} allowFontScaling={false}>{status}</Text>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={Colors.iconSecondary}/>
          <Text style={styles.metaText} allowFontScaling={false}>{formatDate(booking.sessionDate)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={Colors.iconSecondary}/>
          <Text style={styles.metaText} allowFontScaling={false}>{formatTime(booking.sessionTime)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="wallet-outline" size={12} color={Colors.iconSecondary}/>
          <Text style={styles.metaText} allowFontScaling={false}>
            {booking.currency} {booking.totalAmount}
          </Text>
        </View>
      </View>

      {/* Pending actions */}
      {isPending && (
        <View style={styles.actionRow}>
          <DestructiveButton label="Decline & Refund" onPress={onDecline}
            style={styles.actionBtnDecline}
            icon={<Ionicons name="close-circle-outline" size={16} color="#FFF"/>}
            accessibilityLabel="Decline booking and refund client"/>
          <PrimaryButton label="Confirm" onPress={onConfirm}
            style={styles.actionBtnConfirm}
            icon={<Ionicons name="checkmark-circle-outline" size={16} color="#FFF"/>}
            accessibilityLabel="Confirm booking"/>
        </View>
      )}

      {/* Join session (provider side) */}
      {isConfirmed && (
        <View style={styles.joinRow}>
          <Ionicons name="videocam-outline" size={14} color={Colors.statusInfo}/>
          <Text style={styles.joinHint} allowFontScaling={false}>
            Join button activates 15 min before the session
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MySessionsScreen() {
  const router = useRouter();
  const [filter, setFilter]           = useState<FilterKey>("ALL");
  const [confirmTarget, setConfirmTarget] = useState<any>(null);
  const [declineTarget, setDeclineTarget] = useState<any>(null);
  const [processing, setProcessing]   = useState(false);
  const [actionError, setActionError] = useState("");

  const providerBookings = useQuery(api.bookings.getProviderBookings, {});
  const mySubscription   = useQuery(api.bookingSubscribers.getMySubscription, {});
  const updateStatus     = useMutation(api.bookings.updateBookingStatus);
  const refundPayment    = useMutation(api.bookingPayment.refundBookingPayment);

  const isLoading  = providerBookings === undefined;
  const isProvider = !!mySubscription?.isActive;

  const filtered = useMemo(() => {
    if (!providerBookings) return [];
    if (filter === "ALL") return providerBookings;
    return providerBookings.filter(b => b.status === filter);
  }, [providerBookings, filter]);

  const pendingCount = (providerBookings ?? []).filter(b => b.status === "PENDING").length;

  // ── Confirm booking ───────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!confirmTarget) return;
    setProcessing(true);
    setActionError("");
    try {
      await updateStatus({ bookingId: confirmTarget._id, status: "CONFIRMED" });
      setConfirmTarget(null);
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to confirm. Try again.");
    } finally {
      setProcessing(false);
    }
  }

  // ── Decline + refund ──────────────────────────────────────────────────────
  async function handleDecline() {
    if (!declineTarget) return;
    setProcessing(true);
    setActionError("");
    try {
      // 1. Refund wallet (reverses the payment made at booking time)
      if (declineTarget.paymentTxHash?.startsWith("bkp_")) {
        await refundPayment({ bookingId: declineTarget._id });
      }
      // 2. Mark booking as CANCELLED
      await updateStatus({ bookingId: declineTarget._id, status: "CANCELLED" });
      setDeclineTarget(null);
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to decline. Try again.");
    } finally {
      setProcessing(false);
    }
  }

  // Not a provider gate
  if (mySubscription !== undefined && !isProvider) {
    return (
      <AppBackground>
        <ScreenHeader title="My Sessions" onBack={() => router.back()}/>
        <MobileCard>
          <EmptyStateCard icon="ribbon-outline" title="Provider account required"
            subtitle="Set up your provider profile to receive and manage booking requests."
            action={
              <PrimaryButton label="Become a Provider"
                onPress={() => router.push("/(tabs)/booking/become-provider" as any)}
                icon={<Ionicons name="ribbon-outline" size={18} color="#FFF"/>}
                style={{ marginTop: spacing.space3 }}/>
            }/>
        </MobileCard>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScreenHeader title="My Sessions" onBack={() => router.back()}
        trailing={
          <View style={styles.headerTrailing}>
            {pendingCount > 0 && (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText} allowFontScaling={false}>{pendingCount}</Text>
              </View>
            )}
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/booking/settings" as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Provider settings"
            >
              <Ionicons name="settings-outline" size={22} color={Colors.iconPrimary} />
            </TouchableOpacity>
          </View>
        }
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <MobileCard>
            {/* Summary strip */}
            {!isLoading && (
              <View style={styles.summaryStrip}>
                {[
                  { label: "Pending",   count: (providerBookings??[]).filter(b=>b.status==="PENDING").length,   color: Colors.statusWarning },
                  { label: "Confirmed", count: (providerBookings??[]).filter(b=>b.status==="CONFIRMED").length, color: Colors.statusSuccess },
                  { label: "Completed", count: (providerBookings??[]).filter(b=>b.status==="COMPLETED").length, color: Colors.statusInfo    },
                  { label: "Total",     count: (providerBookings??[]).length,                                   color: Colors.textPrimary   },
                ].map(item => (
                  <View key={item.label} style={styles.summaryItem}>
                    <Text style={[styles.summaryCount, { color: item.color }]} allowFontScaling={false}>
                      {item.count}
                    </Text>
                    <Text style={styles.summaryLabel} allowFontScaling={false}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Pending alert banner */}
            {pendingCount > 0 && (
              <View style={styles.pendingBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.statusWarning}/>
                <Text style={styles.pendingBannerText} allowFontScaling={false}>
                  {pendingCount} booking request{pendingCount > 1 ? "s" : ""} awaiting your response
                </Text>
              </View>
            )}

            {/* Filter chips */}
            <FlatList
              data={FILTERS} keyExtractor={i => i.key} horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => {
                const active = filter === item.key;
                return (
                  <TouchableOpacity
                    style={[styles.filterChip, active && styles.filterChipActive]}
                    onPress={() => setFilter(item.key)} activeOpacity={0.8}
                    accessibilityRole="button" accessibilityState={{ selected: active }}>
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}
                      allowFontScaling={false}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />

            {isLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.actionPrimary}/>
              </View>
            )}
            {!isLoading && filtered.length === 0 && (
              <EmptyStateCard icon="calendar-outline"
                title={filter === "ALL" ? "No sessions yet" : `No ${filter.toLowerCase()} sessions`}
                subtitle={filter === "PENDING" ? "New booking requests will appear here." : "Sessions will appear here as clients book with you."}
                style={{ paddingVertical: spacing.space8 }}/>
            )}
          </MobileCard>
        }
        renderItem={({ item }) => (
          <View style={styles.cardPad}>
            <SessionCard
              booking={item}
              onView={() => router.push(`/(tabs)/booking/booking-detail?bookingId=${item._id}` as any)}
              onConfirm={() => { setConfirmTarget(item); setActionError(""); }}
              onDecline={() => { setDeclineTarget(item); setActionError(""); }}
            />
          </View>
        )}
        ListFooterComponent={<View style={{ height: spacing.scrollBottomPadding }}/>}
      />

      {/* ── Confirm dialog ─────────────────────────────────────── */}
      <BottomSheet visible={!!confirmTarget} onClose={() => setConfirmTarget(null)}
        title="Confirm Booking" variant="dialog" dismissable={!processing}>
        {confirmTarget && (
          <View style={styles.dialogBody}>
            <Text style={styles.dialogMsg} allowFontScaling={false}>
              Confirm the session with{" "}
              <Text style={styles.dialogEmphasis}>
                {confirmTarget.client?.profile?.name ?? "this client"}
              </Text>{" "}
              on {formatDate(confirmTarget.sessionDate)} at {formatTime(confirmTarget.sessionTime)}?
            </Text>
            <Text style={styles.dialogSub} allowFontScaling={false}>
              They will receive a confirmation notification immediately.
            </Text>
            {actionError !== "" && (
              <Text style={styles.dialogError} allowFontScaling={false}>{actionError}</Text>
            )}
            <View style={styles.dialogBtns}>
              <SecondaryButton label="Cancel" onPress={() => setConfirmTarget(null)}
                style={{ flex: 1 }} accessibilityLabel="Cancel"/>
              <PrimaryButton label="Yes, Confirm" onPress={handleConfirm}
                loading={processing} style={{ flex: 1 }}
                icon={<Ionicons name="checkmark-circle-outline" size={18} color="#FFF"/>}
                accessibilityLabel="Confirm this booking"/>
            </View>
          </View>
        )}
      </BottomSheet>

      {/* ── Decline + refund dialog ────────────────────────────── */}
      <BottomSheet visible={!!declineTarget} onClose={() => setDeclineTarget(null)}
        title="Decline & Refund" variant="dialog" dismissable={!processing}>
        {declineTarget && (
          <View style={styles.dialogBody}>
            <View style={styles.refundInfo}>
              <Ionicons name="wallet-outline" size={16} color={Colors.statusSuccess}/>
              <Text style={styles.refundInfoText} allowFontScaling={false}>
                {declineTarget.currency} {declineTarget.totalAmount} will be refunded to the client's wallet immediately.
              </Text>
            </View>
            <Text style={styles.dialogMsg} allowFontScaling={false}>
              Decline the booking from{" "}
              <Text style={styles.dialogEmphasis}>
                {declineTarget.client?.profile?.name ?? "this client"}
              </Text>{" "}
              on {formatDate(declineTarget.sessionDate)}?
            </Text>
            {actionError !== "" && (
              <Text style={styles.dialogError} allowFontScaling={false}>{actionError}</Text>
            )}
            <View style={styles.dialogBtns}>
              <SecondaryButton label="Keep" onPress={() => setDeclineTarget(null)}
                style={{ flex: 1 }} accessibilityLabel="Keep the booking request"/>
              <DestructiveButton label="Decline & Refund" onPress={handleDecline}
                loading={processing} style={{ flex: 1 }}
                icon={<Ionicons name="close-circle-outline" size={18} color="#FFF"/>}
                accessibilityLabel="Decline booking and refund client"/>
            </View>
          </View>
        )}
      </BottomSheet>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  listContent: { paddingBottom: 0 },

  // Session card
  card: { backgroundColor: Colors.bgElevated, borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.borderSubtle, padding: spacing.space4 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: spacing.space3, marginBottom: spacing.space3 },
  clientAvatar: { flexShrink: 0 },
  avatarImg: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: Colors.borderFilled },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bgPrimaryMid, borderWidth: 1, borderColor: Colors.borderFilled, alignItems: "center", justifyContent: "center" },
  avatarInitial: { ...typeScale.headingSM, color: Colors.actionPrimary, fontWeight: "700" },
  clientInfo: { flex: 1, gap: 3 },
  clientName: { ...typeScale.headingSM, fontSize: 14, color: Colors.textPrimary },
  sessionType: { ...typeScale.caption, color: Colors.textMuted },
  statusBadge: { borderRadius: radius.radiusXS, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: "700" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.space4, marginBottom: spacing.space2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { ...typeScale.caption, color: Colors.textMuted },
  actionRow: { flexDirection: "row", gap: spacing.space2, marginTop: spacing.space3, borderTopWidth: 1, borderTopColor: Colors.borderSubtle, paddingTop: spacing.space3 },
  actionBtnDecline: { flex: 1 },
  actionBtnConfirm: { flex: 1 },
  joinRow: { flexDirection: "row", alignItems: "center", gap: spacing.space2, marginTop: spacing.space3, paddingTop: spacing.space3, borderTopWidth: 1, borderTopColor: Colors.borderSubtle },
  joinHint: { ...typeScale.caption, color: Colors.statusInfo, flex: 1 },

  // Header trailing
  headerTrailing: { flexDirection: "row", alignItems: "center", gap: spacing.space3 },

  // Header badge
  pendingBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: Colors.statusWarning, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  pendingBadgeText: { fontSize: 11, fontWeight: "700", color: "#000" },

  // Summary strip
  summaryStrip: { flexDirection: "row", justifyContent: "space-around", paddingVertical: spacing.space4, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  summaryItem: { alignItems: "center", gap: 3 },
  summaryCount: { ...typeScale.headingLG, fontWeight: "700" },
  summaryLabel: { ...typeScale.caption, color: Colors.textMuted },

  // Pending banner
  pendingBanner: { flexDirection: "row", alignItems: "center", gap: spacing.space2, backgroundColor: Colors.statusWarningBg, borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.statusWarning, paddingHorizontal: spacing.space3, paddingVertical: spacing.space2, margin: spacing.space4, marginBottom: 0 },
  pendingBannerText: { ...typeScale.bodySM, color: Colors.statusWarning, flex: 1 },

  // Filter chips
  filterList: { paddingHorizontal: spacing.space4, paddingVertical: spacing.space3, gap: spacing.space2 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.radiusFull, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderSubtle },
  filterChipActive: { backgroundColor: Colors.bgPrimaryMid, borderColor: Colors.borderFilled },
  filterChipText: { ...typeScale.labelSM, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.actionPrimary, fontWeight: "600" },

  loadingWrap: { paddingVertical: spacing.space10, alignItems: "center" },
  cardPad: { paddingHorizontal: spacing.space4, paddingTop: spacing.space3 },

  // Dialogs
  dialogBody: { paddingTop: spacing.space2, gap: spacing.space3 },
  dialogMsg: { ...typeScale.bodyMD, color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
  dialogEmphasis: { color: Colors.textPrimary, fontWeight: "600" },
  dialogSub: { ...typeScale.caption, color: Colors.textDisabled, textAlign: "center" },
  dialogError: { ...typeScale.bodySM, color: Colors.statusDanger, textAlign: "center" },
  dialogBtns: { flexDirection: "row", gap: spacing.space3, marginTop: spacing.space2 },
  refundInfo: { flexDirection: "row", alignItems: "flex-start", gap: spacing.space2, backgroundColor: Colors.statusSuccessBg, borderRadius: radius.radiusMD, borderWidth: 1, borderColor: Colors.statusSuccess, padding: spacing.space3 },
  refundInfoText: { ...typeScale.bodySM, color: Colors.statusSuccess, flex: 1, lineHeight: 18 },
});
