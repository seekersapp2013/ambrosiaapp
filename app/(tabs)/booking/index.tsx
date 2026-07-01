import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
import { PrimaryButton } from "@/components/ui/Button";
import { EmptyStateCard } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

// ─── Types ────────────────────────────────────────────────────────────────────
type BookingTab = "upcoming" | "completed" | "cancelled";

// Maps Convex status strings to our display tabs
const STATUS_TO_TAB: Record<string, BookingTab | null> = {
  CONFIRMED:  "upcoming",
  PENDING:    "upcoming",
  COMPLETED:  "completed",
  CANCELLED:  "cancelled",
  REJECTED:   "cancelled",
};

// ─── Status design tokens ─────────────────────────────────────────────────────
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

const SCREEN_TABS: { key: BookingTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "upcoming",  label: "Upcoming",  icon: "calendar-outline" },
  { key: "completed", label: "Completed", icon: "checkmark-done-outline" },
  { key: "cancelled", label: "Cancelled", icon: "ban-outline" },
];

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

function isSessionJoinable(sessionDate: string, sessionTime: string): boolean {
  try {
    const now = Date.now();
    const sessionMs = new Date(`${sessionDate}T${sessionTime}`).getTime();
    const diffMinutes = (sessionMs - now) / 60000;
    // Joinable from 15 min before until 60 min after start
    return diffMinutes <= 15 && diffMinutes >= -60;
  } catch {
    return false;
  }
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({
  booking,
  onPress,
  onJoin,
}: {
  booking: any;
  onPress: () => void;
  onJoin?: () => void;
}) {
  const status = booking.status as string;
  const statusColor = STATUS_COLOR[status] ?? Colors.iconSecondary;
  const statusBg    = STATUS_BG[status]    ?? Colors.bgElevated;
  const statusIcon  = STATUS_ICON[status]  ?? "ellipse-outline";
  const statusLabel = STATUS_LABEL[status] ?? status;

  const providerName =
    booking.provider?.profile?.name ??
    booking.provider?.profile?.username ??
    "Provider";

  // Allow join if time restriction is disabled
  const disableTimeRestriction =
    process.env.EXPO_PUBLIC_DISABLE_STREAM_TIME_RESTRICTION === "true";

  const canJoin =
    status === "CONFIRMED" &&
    (disableTimeRestriction || isSessionJoinable(booking.sessionDate, booking.sessionTime));

  return (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Booking with ${providerName}`}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="calendar" size={20} color={Colors.actionPrimary} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={1} allowFontScaling={false}>
            {booking.provider?.subscription?.jobTitle ?? "Session"}
          </Text>
          <Text style={styles.cardProvider} numberOfLines={1} allowFontScaling={false}>
            with {providerName}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Ionicons name={statusIcon} size={11} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]} allowFontScaling={false}>
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Meta row */}
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>
            {formatDate(booking.sessionDate)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>
            {formatTime(booking.sessionTime)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="pricetag-outline" size={13} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>
            {booking.totalAmount} {booking.currency}
          </Text>
        </View>
      </View>

      {/* Duration chip + join button row */}
      <View style={styles.cardFooter}>
        <View style={styles.categoryChip}>
          <Text style={styles.categoryText} allowFontScaling={false}>
            {booking.duration} min · {booking.sessionType === "ONE_TO_MANY" ? "Group" : "1-on-1"}
          </Text>
        </View>
        {canJoin && onJoin && (
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={onJoin}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Join live session"
          >
            <Ionicons name="videocam" size={13} color="#FFFFFF" />
            <Text style={styles.joinBtnText} allowFontScaling={false}>Join Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────
function StatBadge({
  count,
  label,
  icon,
  color,
  bg,
}: {
  count: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.statBadge, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.statCount, { color }]} allowFontScaling={false}>
        {count}
      </Text>
      <Text style={styles.statLabel} allowFontScaling={false}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");

  // ── Convex queries ────────────────────────────────────────────────────────
  const bookings = useQuery(api.bookings.getMyBookings, {});
  const mySubscription = useQuery(api.bookingSubscribers.getMySubscription, {});
  const isLoading = bookings === undefined;

  // ── Derived data ──────────────────────────────────────────────────────────
  const { filtered, upcomingCount, completedCount, cancelledCount, upcomingPreview } =
    useMemo(() => {
      if (!bookings) {
        return {
          filtered: [],
          upcomingCount: 0,
          completedCount: 0,
          cancelledCount: 0,
          upcomingPreview: [],
        };
      }

      const upcoming  = bookings.filter((b) => STATUS_TO_TAB[b.status] === "upcoming");
      const completed = bookings.filter((b) => STATUS_TO_TAB[b.status] === "completed");
      const cancelled = bookings.filter((b) => STATUS_TO_TAB[b.status] === "cancelled");

      const tabMap: Record<BookingTab, typeof bookings> = {
        upcoming,
        completed,
        cancelled,
      };

      return {
        filtered: tabMap[activeTab] ?? [],
        upcomingCount:  upcoming.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        upcomingPreview: upcoming.slice(0, 3),
      };
    }, [bookings, activeTab]);

  const isProvider = !!mySubscription?.isActive;

  // ── Empty state per tab ───────────────────────────────────────────────────
  const EMPTY_STATE: Record<BookingTab, { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = {
    upcoming:  { icon: "calendar-outline",      title: "No upcoming bookings",  subtitle: "Browse providers and book your first session." },
    completed: { icon: "checkmark-done-outline", title: "No completed bookings", subtitle: "Sessions you attend will appear here." },
    cancelled: { icon: "ban-outline",            title: "No cancelled bookings", subtitle: "Any cancelled appointments will appear here." },
  };

  return (
    <AppBackground>
      <ScreenHeader
        title="My Bookings"
        trailing={
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/booking/providers" as any)}
            accessibilityRole="button"
            accessibilityLabel="Find providers"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search-outline" size={26} color={Colors.actionPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MobileCard>
          {/* ── Page intro ─────────────────────────────────────────────── */}
          <View style={styles.introBlock}>
            <Text style={styles.introTitle}>Bookings</Text>
            <Text style={styles.introSubtitle}>Manage your appointments & sessions</Text>
          </View>

          {/* ── Stats strip ───────────────────────────────────────────── */}
          {!isLoading && (
            <View style={styles.statsStrip}>
              <StatBadge
                count={upcomingCount}
                label="Upcoming"
                icon="calendar-outline"
                color={Colors.statusInfo}
                bg={Colors.statusInfoBg}
              />
              <StatBadge
                count={completedCount}
                label="Completed"
                icon="checkmark-done-outline"
                color={Colors.statusSuccess}
                bg={Colors.statusSuccessBg}
              />
              <StatBadge
                count={cancelledCount}
                label="Cancelled"
                icon="ban-outline"
                color={Colors.statusDanger}
                bg={Colors.statusDangerBg}
              />
              {isProvider && (
                <View style={[styles.statBadge, { backgroundColor: Colors.bgPrimaryMid }]}>
                  <Ionicons name="star" size={16} color={Colors.actionPrimary} />
                  <Text style={[styles.statLabel, { color: Colors.actionPrimary, fontWeight: "600" }]} allowFontScaling={false}>
                    Provider
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Upcoming preview (top 3 confirmed) ───────────────────── */}
          {!isLoading && upcomingPreview.length > 0 && (
            <View style={styles.previewSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Coming Up</Text>
                <TouchableOpacity
                  onPress={() => setActiveTab("upcoming")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                >
                  <Text style={styles.sectionLink}>See all</Text>
                </TouchableOpacity>
              </View>
              {upcomingPreview.map((booking) => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  onPress={() => router.push(`/(tabs)/booking/booking-detail?bookingId=${booking._id}` as any)}
                  onJoin={() => router.push(`/(tabs)/booking/live-session?bookingId=${booking._id}` as any)}
                />
              ))}
            </View>
          )}

          {/* ── Quick actions ─────────────────────────────────────────── */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/booking/providers" as any)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Book a session"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.bgPrimaryMid }]}>
                <Ionicons name="add-circle" size={22} color={Colors.actionPrimary} />
              </View>
              <Text style={styles.quickActionLabel} allowFontScaling={false}>Book Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/booking/providers" as any)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Browse providers"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.statusInfoBg }]}>
                <Ionicons name="search" size={22} color={Colors.statusInfo} />
              </View>
              <Text style={styles.quickActionLabel} allowFontScaling={false}>Find Providers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/booking/history" as any)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Booking history"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.statusSuccessBg }]}>
                <Ionicons name="time" size={22} color={Colors.statusSuccess} />
              </View>
              <Text style={styles.quickActionLabel} allowFontScaling={false}>History</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/booking/events" as any)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="My events"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.statusInfoBg }]}>
                <Ionicons name="calendar-outline" size={22} color={Colors.statusInfo} />
              </View>
              <Text style={styles.quickActionLabel} allowFontScaling={false}>Events</Text>
            </TouchableOpacity>

            {isProvider && (
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push("/(tabs)/booking/recordings" as any)}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="My recordings"
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.purpleSurface }]}>
                  <Ionicons name="radio-outline" size={22} color={Colors.palette.purple} />
                </View>
                <Text style={styles.quickActionLabel} allowFontScaling={false}>Recordings</Text>
              </TouchableOpacity>
            )}

            {isProvider ? (
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push("/(tabs)/booking/my-sessions" as any)}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="My sessions as provider"
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.statusWarningBg }]}>
                  <Ionicons name="people-outline" size={22} color={Colors.statusWarning} />
                </View>
                <Text style={styles.quickActionLabel} allowFontScaling={false}>My Sessions</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.quickActionBtn}
                onPress={() => router.push("/(tabs)/booking/become-provider" as any)}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Become a provider"
              >
                <View style={[styles.quickActionIcon, { backgroundColor: Colors.statusWarningBg }]}>
                  <Ionicons name="ribbon-outline" size={22} color={Colors.statusWarning} />
                </View>
                <Text style={styles.quickActionLabel} allowFontScaling={false}>Go Pro</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/booking/referrals" as any)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="View referrals"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.greenSurface }]}>
                <Ionicons name="git-network-outline" size={22} color={Colors.statusSuccess} />
              </View>
              <Text style={styles.quickActionLabel} allowFontScaling={false}>Referrals</Text>
            </TouchableOpacity>
          </View>

          {/* ── Tab bar ───────────────────────────────────────────────── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
          >
            {SCREEN_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={tab.label}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={isActive ? Colors.actionPrimary : Colors.iconDisabled}
                  />
                  <Text
                    style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                    allowFontScaling={false}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Tab content ───────────────────────────────────────────── */}
          <View style={styles.tabContent}>
            {isLoading ? (
              <ActivityIndicator
                color={Colors.actionPrimary}
                style={{ marginTop: 40 }}
              />
            ) : filtered.length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptyStateCard
                  icon={EMPTY_STATE[activeTab].icon}
                  title={EMPTY_STATE[activeTab].title}
                  subtitle={EMPTY_STATE[activeTab].subtitle}
                  action={
                    activeTab === "upcoming" ? (
                      <PrimaryButton
                        label="Find a Provider"
                        onPress={() => router.push("/(tabs)/booking/providers" as any)}
                        icon={<Ionicons name="search-outline" size={18} color="#FFFFFF" />}
                      />
                    ) : undefined
                  }
                />
              </View>
            ) : (
              <View style={styles.bookingList}>
                {filtered.map((booking) => (
                  <BookingCard
                    key={booking._id}
                    booking={booking}
                    onPress={() =>
                      router.push(`/(tabs)/booking/booking-detail?bookingId=${booking._id}` as any)
                    }
                    onJoin={() =>
                      router.push(`/(tabs)/booking/live-session?bookingId=${booking._id}` as any)
                    }
                  />
                ))}
              </View>
            )}
          </View>

          {/* ── CTA + Provider Dashboard ──────────────────────────────── */}
          {activeTab === "upcoming" && (
            <View style={styles.ctaWrap}>
              {filtered.length > 0 && (
                <PrimaryButton
                  label="Book a New Session"
                  onPress={() => router.push("/(tabs)/booking/providers" as any)}
                  icon={<Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />}
                />
              )}
              {isProvider && (
                <TouchableOpacity
                  style={styles.providerDashBtn}
                  onPress={() => router.push("/(tabs)/booking/my-sessions" as any)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Open provider dashboard"
                >
                  <View style={styles.providerDashLeft}>
                    <View style={styles.providerDashIconWrap}>
                      <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
                    </View>
                    <View style={styles.providerDashTextWrap}>
                      <Text style={styles.providerDashTitle} allowFontScaling={false}>
                        Provider Dashboard
                      </Text>
                      <Text style={styles.providerDashSub} allowFontScaling={false}>
                        Manage sessions, confirm requests &amp; track earnings
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },

  introBlock: {
    alignItems: "center",
    paddingTop: spacing.space6,
    paddingBottom: spacing.space5,
    paddingHorizontal: spacing.space4,
  },
  introTitle: {
    ...typeScale.headingXL,
    color: Colors.textPrimary,
  },
  introSubtitle: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.space2,
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space5,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.radiusFull,
  },
  statCount: {
    ...typeScale.labelSM,
    fontWeight: "700",
  },
  statLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },

  // Upcoming preview section
  previewSection: {
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.space3,
  },
  sectionTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
  },
  sectionLink: {
    ...typeScale.labelSM,
    color: Colors.actionPrimary,
  },

  // Quick actions
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space5,
    gap: spacing.space2,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.radiusMD,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    ...typeScale.caption,
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
    textAlign: "center",
  },

  // Tab bar
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  tabBarContent: {
    paddingHorizontal: spacing.space2,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: Colors.actionPrimary,
  },
  tabLabel: {
    ...typeScale.labelSM,
    color: Colors.iconDisabled,
  },
  tabLabelActive: {
    color: Colors.actionPrimary,
    fontWeight: "600",
  },

  // Tab content
  tabContent: {
    minHeight: 240,
  },
  emptyWrap: {
    paddingVertical: spacing.space4,
  },
  bookingList: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space4,
    gap: spacing.space3,
  },

  // Booking card
  bookingCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
  },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  cardProvider: {
    ...typeScale.bodySM,
    fontSize: 12,
    color: Colors.textMuted,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.radiusXS,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: spacing.space3,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space4,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.space3,
  },
  categoryChip: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgPrimarySubtle,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  categoryText: {
    ...typeScale.caption,
    fontSize: 11,
    fontWeight: "600",
    color: Colors.actionPrimary,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  joinBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // CTA
  ctaWrap: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    paddingBottom: spacing.space4,
    gap: spacing.space3,
  },

  // Provider Dashboard button — solid blue, provider-only
  providerDashBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space4,
    paddingVertical: 16,
    backgroundColor: Colors.statusInfo,
    borderRadius: radius.radiusFull,
  },
  providerDashLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    flex: 1,
  },
  providerDashIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  providerDashTextWrap: {
    flex: 1,
    gap: 1,
  },
  providerDashTitle: {
    ...typeScale.labelLG,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  providerDashSub: {
    ...typeScale.caption,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 14,
  },
});
