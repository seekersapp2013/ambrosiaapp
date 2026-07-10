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
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { EmptyStateCard } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

// ─── Types & constants ────────────────────────────────────────────────────────
type FilterStatus = "ALL" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "PENDING" | "REJECTED";

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: "ALL",       label: "All" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "PENDING",   label: "Pending" },
];

const STATUS_COLOR: Record<string, string> = {
  CONFIRMED:  Colors.statusInfo,
  PENDING:    Colors.statusWarning,
  COMPLETED:  Colors.statusSuccess,
  CANCELLED:  Colors.statusDanger,
  REJECTED:   Colors.statusDanger,
};

const STATUS_BG: Record<string, string> = {
  CONFIRMED:  Colors.statusInfoBg,
  PENDING:    Colors.statusWarningBg,
  COMPLETED:  Colors.statusSuccessBg,
  CANCELLED:  Colors.statusDangerBg,
  REJECTED:   Colors.statusDangerBg,
};

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  CONFIRMED:  "checkmark-circle-outline",
  PENDING:    "time-outline",
  COMPLETED:  "checkmark-done-outline",
  CANCELLED:  "close-circle-outline",
  REJECTED:   "close-circle-outline",
};

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED:  "Confirmed",
  PENDING:    "Pending",
  COMPLETED:  "Completed",
  CANCELLED:  "Cancelled",
  REJECTED:   "Rejected",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
}

// ─── History Row ──────────────────────────────────────────────────────────────
function HistoryRow({ booking, onPress }: { booking: any; onPress: () => void }) {
  const status      = booking.status as string;
  const statusColor = STATUS_COLOR[status] ?? Colors.iconSecondary;
  const statusBg    = STATUS_BG[status]    ?? Colors.bgElevated;
  const statusIcon  = STATUS_ICON[status]  ?? "ellipse-outline";
  const statusLabel = STATUS_LABEL[status] ?? status;

  const providerName =
    booking.provider?.profile?.name ??
    booking.provider?.profile?.username ??
    "Provider";

  return (
    <TouchableOpacity
      style={styles.historyRow}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Booking with ${providerName} on ${formatDate(booking.sessionDate)}`}
    >
      {/* Left icon */}
      <View style={styles.rowIconWrap}>
        <Ionicons name="calendar" size={18} color={Colors.actionPrimary} />
      </View>

      {/* Center info */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1} allowFontScaling={false}>
          {booking.provider?.subscription?.jobTitle ?? "Session"}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1} allowFontScaling={false}>
          with {providerName}
        </Text>
        <View style={styles.rowMeta}>
          <Ionicons name="calendar-outline" size={11} color={Colors.iconSecondary} />
          <Text style={styles.rowMetaText} allowFontScaling={false}>
            {formatDate(booking.sessionDate)} · {formatTime(booking.sessionTime)}
          </Text>
          <Text style={styles.rowMetaDot}>·</Text>
          <Text style={styles.rowMetaText} allowFontScaling={false}>
            {booking.duration} min
          </Text>
        </View>
      </View>

      {/* Right — amount + status */}
      <View style={styles.rowRight}>
        <Text style={styles.rowAmount} allowFontScaling={false}>
          {booking.totalAmount} {booking.currency}
        </Text>
        <View style={[styles.rowBadge, { backgroundColor: statusBg }]}>
          <Ionicons name={statusIcon} size={9} color={statusColor} />
          <Text style={[styles.rowBadgeText, { color: statusColor }]} allowFontScaling={false}>
            {statusLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("ALL");

  const bookings  = useQuery(api.bookings.getMyBookings, {});
  const isLoading = bookings === undefined;

  const filtered = useMemo(() => {
    if (!bookings) return [];
    if (activeFilter === "ALL") return bookings;
    return bookings.filter((b) => b.status === activeFilter);
  }, [bookings, activeFilter]);

  // Summary counts for the top strip
  const counts = useMemo(() => {
    if (!bookings) return { total: 0, completed: 0, totalSpent: 0 };
    const completed   = bookings.filter((b) => b.status === "COMPLETED");
    const totalSpent  = completed.reduce((sum, b) => sum + (b.totalAmount ?? 0), 0);
    return { total: bookings.length, completed: completed.length, totalSpent };
  }, [bookings]);

  return (
    <AppBackground>
      <ScreenHeader
        title="Booking History"
        onBack={() => router.replace("/(tabs)/booking" as any)}
      />

      <MobileCard>
        {/* ── Summary strip ─────────────────────────────────────────── */}
        {!isLoading && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue} allowFontScaling={false}>
                {counts.total}
              </Text>
              <Text style={styles.summaryLabel} allowFontScaling={false}>Total</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue} allowFontScaling={false}>
                {counts.completed}
              </Text>
              <Text style={styles.summaryLabel} allowFontScaling={false}>Completed</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: Colors.actionPrimary }]} allowFontScaling={false}>
                {counts.totalSpent.toFixed(0)}
              </Text>
              <Text style={styles.summaryLabel} allowFontScaling={false}>Total Spent</Text>
            </View>
          </View>
        )}

        {/* ── Filter chips ──────────────────────────────────────────── */}
        <View>
          <FlatList
            data={FILTER_TABS}
            keyExtractor={(item) => item.key}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
            renderItem={({ item }) => {
              const isActive = activeFilter === item.key;
              return (
                <TouchableOpacity
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setActiveFilter(item.key)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`Filter by ${item.label}`}
                >
                  <Text
                    style={[styles.filterChipText, isActive && styles.filterChipTextActive]}
                    allowFontScaling={false}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* ── List ──────────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.actionPrimary} />
          </View>
        ) : filtered.length === 0 ? (
          <EmptyStateCard
            icon="time-outline"
            title="No bookings found"
            subtitle={
              activeFilter === "ALL"
                ? "Your booking history will appear here."
                : `No ${activeFilter.toLowerCase()} bookings yet.`
            }
            style={styles.emptyState}
          />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <HistoryRow
                booking={item}
                onPress={() =>
                  router.push(`/(tabs)/booking/booking-detail?bookingId=${item._id}` as any)
                }
              />
            )}
          />
        )}
      </MobileCard>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Summary strip
  summaryStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: spacing.space3,
  },
  summaryItem: {
    alignItems: "center",
    gap: 3,
  },
  summaryValue: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
  },
  summaryLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.borderSubtle,
  },

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
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.borderFilled,
  },
  filterChipText: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.actionPrimary,
    fontWeight: "600",
  },

  // List
  listContent: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space4,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: 2,
  },

  // History row
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.space3,
    gap: spacing.space3,
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...typeScale.headingSM,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  rowSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  rowMetaText: {
    ...typeScale.caption,
    fontSize: 10,
    color: Colors.textDisabled,
  },
  rowMetaDot: {
    ...typeScale.caption,
    fontSize: 10,
    color: Colors.textDisabled,
  },
  rowRight: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  rowAmount: {
    ...typeScale.labelSM,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  rowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.radiusXS,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rowBadgeText: {
    fontSize: 9,
    fontWeight: "600",
  },

  // Loading / empty
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyState: {
    paddingVertical: spacing.space10,
  },
});
