/**
 * PatientReferralsList
 * Shows referrals sent TO the current user as a patient.
 * Pending referrals expand to show suggested experts with "Select & Book" actions.
 */

import React, { useState } from "react";
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
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { EmptyStateCard } from "@/components/ui/Card";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PrimaryButton, DestructiveButton, SecondaryButton } from "@/components/ui/Button";

// ─── Types ────────────────────────────────────────────────────────────────────
type FilterKey = "ALL" | "PENDING" | "ACCEPTED" | "COMPLETED" | "DECLINED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL",       label: "All" },
  { key: "PENDING",   label: "Pending" },
  { key: "ACCEPTED",  label: "Accepted" },
  { key: "COMPLETED", label: "Completed" },
  { key: "DECLINED",  label: "Declined" },
];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

function formatPrice(p: number): string {
  return p >= 1000 ? `$${(p / 1000).toFixed(1)}k` : `$${p}`;
}

// ─── Mini expert card ─────────────────────────────────────────────────────────
function ExpertMiniCard({
  expert,
  onSelectBook,
  selecting,
}: {
  expert: any;
  onSelectBook: () => void;
  selecting: boolean;
}) {
  const name = expert.profile?.name ?? expert.profile?.username ?? "Provider";
  const price = expert.subscription?.oneOnOnePrice ?? expert.subscription?.sessionPrice ?? 0;

  return (
    <View style={styles.expertCard}>
      <View style={styles.expertAvatarWrap}>
        <Text style={styles.expertAvatarInitial} allowFontScaling={false}>
          {name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.expertInfo}>
        <Text style={styles.expertName} numberOfLines={1} allowFontScaling={false}>{name}</Text>
        <Text style={styles.expertTitle} numberOfLines={1} allowFontScaling={false}>
          {expert.subscription?.jobTitle ?? "Provider"}
        </Text>
        <Text style={styles.expertPrice} allowFontScaling={false}>
          {formatPrice(price)}/hr
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.selectBtn, selecting && styles.selectBtnDisabled]}
        onPress={onSelectBook}
        disabled={selecting}
        activeOpacity={0.82}
        accessibilityRole="button"
        accessibilityLabel={`Select and book ${name}`}
      >
        {selecting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.selectBtnText} allowFontScaling={false}>Select &amp; Book</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ─── Referral card ────────────────────────────────────────────────────────────
function ReferralCard({
  referral,
  onSelectExpert,
  onDecline,
  onViewDetail,
}: {
  referral: any;
  onSelectExpert: (expertId: string, referralId: string) => void;
  onDecline: (referralId: string) => void;
  onViewDetail: (referralId: string) => void;
}) {
  const [expanded, setExpanded] = useState(referral.status === "PENDING");
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const status      = referral.status as string;
  const statusColor = STATUS_COLOR[status] ?? Colors.textMuted;
  const statusBg    = STATUS_BG[status]    ?? Colors.bgElevated;
  const statusIcon  = STATUS_ICON[status]  ?? "ellipse-outline";

  const expertName = referral.referringExpert?.profile?.name
    ?? referral.referringExpert?.profile?.username
    ?? "Expert";
  const expertTitle = referral.referringExpert?.subscription?.jobTitle ?? "";

  const isPending = status === "PENDING";

  return (
    <View style={styles.referralCard}>
      {/* Header */}
      <TouchableOpacity
        style={styles.referralHeader}
        onPress={() => setExpanded(v => !v)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Referral: ${referral.title}`}
      >
        <View style={styles.referralHeaderLeft}>
          <View style={styles.referralIconWrap}>
            <Ionicons name="git-network-outline" size={18} color={Colors.actionPrimary} />
          </View>
          <View style={styles.referralTitleBlock}>
            <Text style={styles.referralTitle} numberOfLines={2} allowFontScaling={false}>
              {referral.title}
            </Text>
            <Text style={styles.referralFrom} numberOfLines={1} allowFontScaling={false}>
              From {expertName}{expertTitle ? ` · ${expertTitle}` : ""}
            </Text>
            <Text style={styles.referralDate} allowFontScaling={false}>
              {formatDate(referral.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.referralHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
            <Ionicons name={statusIcon} size={10} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]} allowFontScaling={false}>
              {status}
            </Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.iconSecondary}
          />
        </View>
      </TouchableOpacity>

      {/* Expanded: selected expert (ACCEPTED/COMPLETED) */}
      {expanded && status === "ACCEPTED" && referral.selectedExpert && (
        <View style={styles.selectedExpertBanner}>
          <Ionicons name="checkmark-circle-outline" size={16} color={Colors.statusInfo} />
          <Text style={styles.selectedExpertText} allowFontScaling={false}>
            You selected{" "}
            <Text style={{ fontWeight: "700" }}>
              {referral.selectedExpert?.profile?.name ?? "an expert"}
            </Text>
            . Book a session to proceed.
          </Text>
        </View>
      )}

      {/* Expanded: choose an expert (PENDING) */}
      {expanded && isPending && (
        <View style={styles.expertSection}>
          <Text style={styles.expertSectionTitle} allowFontScaling={false}>
            Choose an Expert
          </Text>
          <Text style={styles.expertSectionSub} allowFontScaling={false}>
            Select one of the suggested experts below. Selecting will lock your choice.
          </Text>
          {(referral.suggestedExpertsDetails ?? []).map((expert: any) => (
            <ExpertMiniCard
              key={expert.id}
              expert={expert}
              selecting={selectingId === expert.id}
              onSelectBook={() => {
                setSelectingId(expert.id);
                onSelectExpert(expert.id, referral._id);
              }}
            />
          ))}

          {/* Decline button */}
          <TouchableOpacity
            style={styles.declineLink}
            onPress={() => onDecline(referral._id)}
            accessibilityRole="button"
            accessibilityLabel="Decline this referral"
          >
            <Text style={styles.declineLinkText} allowFontScaling={false}>
              Decline Referral
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* View full details link */}
      <TouchableOpacity
        style={styles.viewDetailLink}
        onPress={() => onViewDetail(referral._id)}
        accessibilityRole="button"
        accessibilityLabel="View referral details"
      >
        <Ionicons name="information-circle-outline" size={14} color={Colors.actionPrimary} />
        <Text style={styles.viewDetailText} allowFontScaling={false}>View Full Details</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.actionPrimary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PatientReferralsList() {
  const router = useRouter();
  const C = useColors();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("ALL");
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);

  const referrals = useQuery(
    api.referrals.getPatientReferrals,
    { status: activeFilter === "ALL" ? undefined : activeFilter }
  );

  const selectExpert   = useMutation(api.referrals.selectExpertFromReferral);
  const declineReferral = useMutation(api.referrals.declineReferral);

  const isLoading = referrals === undefined;

  async function handleSelectExpert(expertId: string, referralId: string) {
    try {
      await selectExpert({
        referralId: referralId as any,
        selectedExpertId: expertId as any,
      });
      // Navigate to the provider's calendar with referralId param
      router.push(`/(tabs)/booking/${expertId}?referralId=${referralId}` as any);
    } catch {
      // silently ignore — card will reset
    }
  }

  async function handleDecline() {
    if (!declineTarget) return;
    setDeclining(true);
    try {
      await declineReferral({ referralId: declineTarget as any });
      setDeclineTarget(null);
    } finally {
      setDeclining(false);
    }
  }

  return (
    <View>
      {/* Filter chips */}
      <FlatList
        data={FILTERS}
        keyExtractor={i => i.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => {
          const active = activeFilter === item.key;
          return (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { backgroundColor: C.bgElevated, borderColor: C.borderSubtle },
                active && { backgroundColor: C.bgPrimaryMid, borderColor: C.borderFilled },
              ]}
              onPress={() => setActiveFilter(item.key)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.filterChipText, { color: C.textMuted }, active && { color: C.actionPrimary, fontWeight: "600" }]} allowFontScaling={false}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={C.actionPrimary} />
        </View>
      ) : !referrals || referrals.length === 0 ? (
        <EmptyStateCard
          icon="git-network-outline"
          title="No referrals yet"
          subtitle="When a provider refers you to another expert, it will appear here."
          style={styles.emptyState}
        />
      ) : (
        <FlatList
          data={referrals}
          keyExtractor={item => item._id}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <ReferralCard
              referral={item}
              onSelectExpert={handleSelectExpert}
              onDecline={(id) => setDeclineTarget(id)}
              onViewDetail={(id) =>
                router.push(`/(tabs)/booking/referral-detail?referralId=${id}` as any)
              }
            />
          )}
        />
      )}

      {/* Decline confirmation */}
      <BottomSheet
        visible={!!declineTarget}
        onClose={() => setDeclineTarget(null)}
        title="Decline Referral"
        variant="dialog"
        dismissable={!declining}
      >
        <View style={styles.dialogBody}>
          <Text style={styles.dialogMsg} allowFontScaling={false}>
            Are you sure you want to decline this referral? You won't be able to undo this.
          </Text>
          <View style={styles.dialogBtns}>
            <SecondaryButton label="Keep" onPress={() => setDeclineTarget(null)} style={{ flex: 1 }} />
            <DestructiveButton
              label="Decline"
              onPress={handleDecline}
              loading={declining}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </BottomSheet>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Filter chips
  filterList: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    gap: spacing.space2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.radiusFull,
    borderWidth: 1,
  },
  filterChipText: { ...typeScale.labelSM },

  // Loading / empty
  loadingWrap: { paddingVertical: spacing.space8, alignItems: "center" },
  emptyState: { paddingVertical: spacing.space8 },

  // List
  listContent: { paddingHorizontal: spacing.space4, paddingBottom: spacing.space4 },
  separator: { height: spacing.space3 },

  // Referral card
  referralCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: "hidden",
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.space4,
    gap: spacing.space3,
  },
  referralHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
    flex: 1,
  },
  referralIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  referralTitleBlock: { flex: 1, gap: 3 },
  referralTitle: { ...typeScale.headingSM, fontSize: 13, color: Colors.textPrimary, fontWeight: "600" },
  referralFrom: { ...typeScale.caption, color: Colors.textMuted },
  referralDate: { ...typeScale.caption, fontSize: 10, color: Colors.textDisabled },
  referralHeaderRight: { alignItems: "flex-end", gap: spacing.space2 },

  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.radiusXS,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: { fontSize: 9, fontWeight: "700" },

  // Selected expert banner
  selectedExpertBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    padding: spacing.space3,
    paddingHorizontal: spacing.space4,
  },
  selectedExpertText: { ...typeScale.bodySM, color: Colors.statusInfo, flex: 1, lineHeight: 17 },

  // Expert section
  expertSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
  },
  expertSectionTitle: { ...typeScale.headingSM, fontSize: 13, color: Colors.textPrimary, fontWeight: "700" },
  expertSectionSub: { ...typeScale.caption, color: Colors.textMuted, lineHeight: 16 },

  // Expert mini card
  expertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
  },
  expertAvatarWrap: {
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
  expertName: { ...typeScale.labelSM, color: Colors.textPrimary, fontWeight: "600", fontSize: 12 },
  expertTitle: { ...typeScale.caption, color: Colors.textMuted, fontSize: 10 },
  expertPrice: { fontSize: 11, fontWeight: "700", color: Colors.statusSuccess },

  // Select button
  selectBtn: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexShrink: 0,
    minWidth: 90,
    alignItems: "center",
  },
  selectBtnDisabled: { backgroundColor: Colors.actionPrimaryDisabled },
  selectBtnText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },

  // Decline link
  declineLink: { alignSelf: "center", paddingVertical: spacing.space2 },
  declineLinkText: { ...typeScale.labelSM, color: Colors.statusDanger, textDecorationLine: "underline" },

  // View detail link
  viewDetailLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space4,
  },
  viewDetailText: { ...typeScale.labelSM, color: Colors.actionPrimary, fontWeight: "600" },

  // Dialog
  dialogBody: { paddingTop: spacing.space2, gap: spacing.space3 },
  dialogMsg: { ...typeScale.bodyMD, color: Colors.textMuted, textAlign: "center", lineHeight: 22 },
  dialogBtns: { flexDirection: "row", gap: spacing.space3, marginTop: spacing.space2 },
});
