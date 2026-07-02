/**
 * ExpertReferralsList
 * Provider-only view. Two tabs:
 *   Sent     — referrals this provider created for their patients
 *   Received — referrals where this provider was selected by a patient
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { EmptyStateCard } from "@/components/ui/Card";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

// ─── Sent referral row ────────────────────────────────────────────────────────
function SentRow({ referral, onPress }: { referral: any; onPress: () => void }) {
  const status       = referral.status as string;
  const statusColor  = STATUS_COLOR[status] ?? Colors.textMuted;
  const statusBg     = STATUS_BG[status]    ?? Colors.bgElevated;
  const patientName  = referral.patient?.profile?.name ?? referral.patient?.profile?.username ?? "Patient";
  const selectedName = referral.selectedExpert?.profile?.name ?? referral.selectedExpert?.profile?.username;
  const commission   = referral.commissionAmount;
  const isPaid       = referral.commissionPaid;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`View referral: ${referral.title}`}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="git-network-outline" size={16} color={Colors.actionPrimary} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowTitle} numberOfLines={1} allowFontScaling={false}>
            {referral.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]} allowFontScaling={false}>
              {status}
            </Text>
          </View>
        </View>
        <Text style={styles.rowSub} numberOfLines={1} allowFontScaling={false}>
          Patient: {patientName}
        </Text>
        {selectedName && (
          <Text style={styles.rowSub} numberOfLines={1} allowFontScaling={false}>
            Expert: {selectedName}
          </Text>
        )}
        <View style={styles.rowFooter}>
          <Text style={styles.rowDate} allowFontScaling={false}>{formatDate(referral.createdAt)}</Text>
          {commission != null && (
            <View style={[
              styles.commissionBadge,
              isPaid ? styles.commissionBadgePaid : styles.commissionBadgePending,
            ]}>
              <Ionicons
                name={isPaid ? "checkmark-circle-outline" : "time-outline"}
                size={10}
                color={isPaid ? Colors.statusSuccess : Colors.statusWarning}
              />
              <Text style={[
                styles.commissionText,
                { color: isPaid ? Colors.statusSuccess : Colors.statusWarning },
              ]} allowFontScaling={false}>
                {referral.commissionCurrency} {commission.toFixed(2)} {isPaid ? "paid" : "pending"}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Received referral row ────────────────────────────────────────────────────
function ReceivedRow({ referral, onPress }: { referral: any; onPress: () => void }) {
  const status          = referral.status as string;
  const statusColor     = STATUS_COLOR[status] ?? Colors.textMuted;
  const statusBg        = STATUS_BG[status]    ?? Colors.bgElevated;
  const patientName     = referral.patient?.profile?.name ?? referral.patient?.profile?.username ?? "Patient";
  const referringName   = referral.referringExpert?.profile?.name ?? referral.referringExpert?.profile?.username ?? "Expert";
  const commission      = referral.commissionAmount;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`View referral: ${referral.title}`}
    >
      <View style={[styles.rowIcon, { backgroundColor: Colors.statusInfoBg }]}>
        <Ionicons name="arrow-down-circle-outline" size={16} color={Colors.statusInfo} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTitleRow}>
          <Text style={styles.rowTitle} numberOfLines={1} allowFontScaling={false}>
            {referral.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.statusText, { color: statusColor }]} allowFontScaling={false}>
              {status}
            </Text>
          </View>
        </View>
        <Text style={styles.rowSub} numberOfLines={1} allowFontScaling={false}>
          Patient: {patientName}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1} allowFontScaling={false}>
          Referred by: {referringName}
        </Text>
        <View style={styles.rowFooter}>
          <Text style={styles.rowDate} allowFontScaling={false}>{formatDate(referral.createdAt)}</Text>
          {commission != null && (
            <View style={styles.commissionBadge}>
              <Ionicons name="cash-outline" size={10} color={Colors.statusSuccess} />
              <Text style={[styles.commissionText, { color: Colors.statusSuccess }]} allowFontScaling={false}>
                Earn {referral.commissionCurrency} {commission.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function ExpertReferralsList() {
  const router = useRouter();
  const [tab, setTab] = useState<"sent" | "received">("sent");

  const sentReferrals     = useQuery(api.referrals.getReferringExpertReferrals, {});
  const receivedReferrals = useQuery(api.referrals.getSelectedExpertReferrals,  {});

  const isLoading = sentReferrals === undefined || receivedReferrals === undefined;

  // Commission summary for sent tab
  const commissionSummary = useMemo(() => {
    if (!sentReferrals) return { earned: 0, pending: 0, currency: "USD" };
    const completed = sentReferrals.filter(r => r.status === "COMPLETED" && r.commissionPaid);
    const pending   = sentReferrals.filter(r => r.status !== "COMPLETED" && r.commissionAmount);
    const currency  = completed[0]?.commissionCurrency ?? pending[0]?.commissionCurrency ?? "USD";
    return {
      earned:   completed.reduce((s, r) => s + (r.commissionAmount ?? 0), 0),
      pending:  pending.reduce((s, r) => s + (r.commissionAmount ?? 0), 0),
      currency,
    };
  }, [sentReferrals]);

  return (
    <View>
      {/* Tab toggle */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "sent" && styles.tabActive]}
          onPress={() => setTab("sent")}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "sent" }}
        >
          <Text style={[styles.tabText, tab === "sent" && styles.tabTextActive]} allowFontScaling={false}>
            Sent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "received" && styles.tabActive]}
          onPress={() => setTab("received")}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === "received" }}
        >
          <Text style={[styles.tabText, tab === "received" && styles.tabTextActive]} allowFontScaling={false}>
            Received
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.actionPrimary} />
        </View>
      ) : tab === "sent" ? (
        <>
          {/* Commission summary */}
          {(sentReferrals?.length ?? 0) > 0 && (
            <View style={styles.commissionCard}>
              <View style={styles.commissionItem}>
                <Text style={styles.commissionAmount} allowFontScaling={false}>
                  {commissionSummary.currency} {commissionSummary.earned.toFixed(2)}
                </Text>
                <Text style={styles.commissionLabel} allowFontScaling={false}>Earned</Text>
              </View>
              <View style={styles.commissionDivider} />
              <View style={styles.commissionItem}>
                <Text style={[styles.commissionAmount, { color: Colors.statusWarning }]} allowFontScaling={false}>
                  {commissionSummary.currency} {commissionSummary.pending.toFixed(2)}
                </Text>
                <Text style={styles.commissionLabel} allowFontScaling={false}>Pending</Text>
              </View>
              <View style={styles.commissionDivider} />
              <View style={styles.commissionItem}>
                <Text style={styles.commissionAmount} allowFontScaling={false}>
                  {sentReferrals?.length ?? 0}
                </Text>
                <Text style={styles.commissionLabel} allowFontScaling={false}>Total</Text>
              </View>
            </View>
          )}

          {sentReferrals?.length === 0 ? (
            <EmptyStateCard
              icon="git-network-outline"
              title="No sent referrals"
              subtitle="Referrals you create for your patients will appear here."
              style={styles.emptyState}
            />
          ) : (
            <FlatList
              data={sentReferrals}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <SentRow
                  referral={item}
                  onPress={() =>
                    router.push(
                      `/(tabs)/booking/referral-detail?referralId=${item._id}` as any
                    )
                  }
                />
              )}
            />
          )}
        </>
      ) : (
        <>
          {receivedReferrals?.length === 0 ? (
            <EmptyStateCard
              icon="arrow-down-circle-outline"
              title="No received referrals"
              subtitle="When a patient selects you from a referral, it will appear here."
              style={styles.emptyState}
            />
          ) : (
            <FlatList
              data={receivedReferrals}
              keyExtractor={item => item._id}
              scrollEnabled={false}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <ReceivedRow
                  referral={item}
                  onPress={() =>
                    router.push(
                      `/(tabs)/booking/referral-detail?referralId=${item._id}` as any
                    )
                  }
                />
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Tab toggle
  tabRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: spacing.space3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.space3,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.actionPrimary },
  tabText: { ...typeScale.labelSM, color: Colors.textMuted },
  tabTextActive: { color: Colors.actionPrimary, fontWeight: "700" },

  // Loading / empty
  loadingWrap: { paddingVertical: spacing.space8, alignItems: "center" },
  emptyState: { paddingVertical: spacing.space8 },

  // Commission summary card
  commissionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
  },
  commissionItem: { alignItems: "center", gap: 3 },
  commissionAmount: {
    ...typeScale.headingMD,
    color: Colors.statusSuccess,
    fontWeight: "700",
    fontSize: 16,
  },
  commissionLabel: { ...typeScale.caption, color: Colors.textMuted },
  commissionDivider: { width: 1, height: 32, backgroundColor: Colors.borderSubtle },

  // List
  listContent: { paddingHorizontal: spacing.space4, paddingBottom: spacing.space4 },
  separator: { height: spacing.space3 },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  rowBody: { flex: 1, gap: 4 },
  rowTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.space2,
  },
  rowTitle: { ...typeScale.headingSM, fontSize: 13, color: Colors.textPrimary, fontWeight: "600", flex: 1 },
  rowSub: { ...typeScale.caption, color: Colors.textMuted },
  rowFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  rowDate: { fontSize: 10, color: Colors.textDisabled },

  // Status badge
  statusBadge: {
    borderRadius: radius.radiusXS,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  statusText: { fontSize: 9, fontWeight: "700" },

  // Commission badge
  commissionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.statusSuccessBg,
    borderRadius: radius.radiusXS,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  commissionBadgePaid: { backgroundColor: Colors.statusSuccessBg },
  commissionBadgePending: { backgroundColor: Colors.statusWarningBg },
  commissionText: { fontSize: 9, fontWeight: "600" },
});
