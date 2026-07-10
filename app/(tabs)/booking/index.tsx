import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useColors } from "@/hooks/useColors";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { TopNav } from "@/components/TopNav";
import { PrimaryButton } from "@/components/ui/Button";
import { EmptyStateCard } from "@/components/ui/Card";

// ─── Types ────────────────────────────────────────────────────────────────────
type BookingTab = "upcoming" | "completed" | "cancelled";

const STATUS_TO_TAB: Record<string, BookingTab | null> = {
  CONFIRMED: "upcoming",
  PENDING:   "upcoming",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REJECTED:  "cancelled",
};

const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  CONFIRMED: "checkmark-circle-outline",
  PENDING:   "time-outline",
  COMPLETED: "checkmark-done-outline",
  CANCELLED: "close-circle-outline",
  REJECTED:  "close-circle-outline",
};
const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confirmed",
  PENDING:   "Pending",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REJECTED:  "Rejected",
};

const SCREEN_TABS: { key: BookingTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "upcoming",  label: "Upcoming",  icon: "calendar-outline" },
  { key: "completed", label: "Completed", icon: "checkmark-done-outline" },
  { key: "cancelled", label: "Cancelled", icon: "ban-outline" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}
function formatTime(timeStr: string): string {
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch { return timeStr; }
}
function isSessionJoinable(sessionDate: string, sessionTime: string): boolean {
  try {
    const now = Date.now();
    const sessionMs = new Date(`${sessionDate}T${sessionTime}`).getTime();
    const diffMinutes = (sessionMs - now) / 60000;
    return diffMinutes <= 15 && diffMinutes >= -60;
  } catch { return false; }
}

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onPress, onJoin }: {
  booking: any; onPress: () => void; onJoin?: () => void;
}) {
  const C = useColors();
  const STATUS_COLOR: Record<string, string> = {
    CONFIRMED: C.statusInfo,
    PENDING:   C.statusWarning,
    COMPLETED: C.statusSuccess,
    CANCELLED: C.statusDanger,
    REJECTED:  C.statusDanger,
  };
  const STATUS_BG: Record<string, string> = {
    CONFIRMED: C.statusInfoBg,
    PENDING:   C.statusWarningBg,
    COMPLETED: C.statusSuccessBg,
    CANCELLED: C.statusDangerBg,
    REJECTED:  C.statusDangerBg,
  };
  const status = booking.status as string;
  const statusColor = STATUS_COLOR[status] ?? C.iconSecondary;
  const statusBg    = STATUS_BG[status]    ?? C.bgElevated;
  const statusIcon  = STATUS_ICON[status]  ?? "ellipse-outline";
  const statusLabel = STATUS_LABEL[status] ?? status;
  const providerName =
    booking.provider?.profile?.name ??
    booking.provider?.profile?.username ?? "Provider";
  const disableTimeRestriction =
    process.env.EXPO_PUBLIC_DISABLE_STREAM_TIME_RESTRICTION === "true";
  const canJoin =
    status === "CONFIRMED" &&
    (disableTimeRestriction || isSessionJoinable(booking.sessionDate, booking.sessionTime));

  return (
    <TouchableOpacity
      style={[styles.bookingCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Booking with ${providerName}`}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconWrap, { backgroundColor: C.bgPrimaryMid }]}>
          <Ionicons name="calendar" size={20} color={C.actionPrimary} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardTitle, { color: C.textPrimary }]} numberOfLines={1} allowFontScaling={false}>
            {booking.provider?.subscription?.jobTitle ?? "Session"}
          </Text>
          <Text style={[styles.cardProvider, { color: C.textMuted }]} numberOfLines={1} allowFontScaling={false}>
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
      <View style={[styles.cardDivider, { backgroundColor: C.borderSubtle }]} />
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={C.iconSecondary} />
          <Text style={[styles.metaText, { color: C.textMuted }]} allowFontScaling={false}>{formatDate(booking.sessionDate)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={C.iconSecondary} />
          <Text style={[styles.metaText, { color: C.textMuted }]} allowFontScaling={false}>{formatTime(booking.sessionTime)}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="pricetag-outline" size={13} color={C.iconSecondary} />
          <Text style={[styles.metaText, { color: C.textMuted }]} allowFontScaling={false}>{booking.totalAmount} {booking.currency}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={[styles.categoryChip, { backgroundColor: C.bgPrimarySubtle, borderColor: C.borderFilled }]}>
          <Text style={[styles.categoryText, { color: C.actionPrimary }]} allowFontScaling={false}>
            {booking.duration} min · {booking.sessionType === "ONE_TO_MANY" ? "Group" : "1-on-1"}
          </Text>
        </View>
        {canJoin && onJoin && (
          <TouchableOpacity style={[styles.joinBtn, { backgroundColor: C.actionPrimary }]} onPress={onJoin} activeOpacity={0.82}
            accessibilityRole="button" accessibilityLabel="Join live session">
            <Ionicons name="videocam" size={13} color="#FFFFFF" />
            <Text style={styles.joinBtnText} allowFontScaling={false}>Join Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, action, actionLabel }: {
  title: string; action?: () => void; actionLabel?: string;
}) {
  const C = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: C.textPrimary }]} allowFontScaling={false}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={action} hitSlop={{ top:8, bottom:8, left:8, right:8 }}
          accessibilityRole="button">
          <Text style={[styles.sectionLink, { color: C.actionPrimary }]} allowFontScaling={false}>{actionLabel ?? "See all"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Action Tile ──────────────────────────────────────────────────────────────
function ActionTile({ icon, label, onPress, iconBg, iconColor }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconBg: string;
  iconColor: string;
}) {
  const C = useColors();
  return (
    <TouchableOpacity style={styles.actionTile} onPress={onPress}
      activeOpacity={0.82} accessibilityRole="button" accessibilityLabel={label}>
      <View style={[styles.actionTileIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.actionTileLabel, { color: C.textSecondary }]} allowFontScaling={false}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Provider Dashboard Banner ────────────────────────────────────────────────
function ProviderDashboardBanner({ onPress }: { onPress: () => void }) {
  const C = useColors();
  return (
    <TouchableOpacity
      style={[styles.providerBanner, { backgroundColor: C.statusInfoBg, borderColor: C.blueBorder }]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Open provider dashboard"
    >
      {/* Left accent strip */}
      <View style={[styles.providerBannerAccent, { backgroundColor: C.statusInfo }]} />

      <View style={[styles.providerBannerIconWrap, { backgroundColor: C.blueSurfaceMid }]}>
        <Ionicons name="grid" size={22} color={C.statusInfo} />
      </View>

      <View style={styles.providerBannerText}>
        <View style={styles.providerBannerTitleRow}>
          <Text style={[styles.providerBannerTitle, { color: C.textPrimary }]} allowFontScaling={false}>
            Provider Dashboard
          </Text>
          <View style={[styles.providerBannerBadge, { backgroundColor: C.statusInfo }]}>
            <Text style={styles.providerBannerBadgeText} allowFontScaling={false}>PRO</Text>
          </View>
        </View>
        <Text style={[styles.providerBannerSub, { color: C.textMuted }]} allowFontScaling={false}>
          Manage sessions · Confirm requests · Track earnings
        </Text>
      </View>

      <View style={[styles.providerBannerChevron, { backgroundColor: C.blueSurfaceMid }]}>
        <Ionicons name="chevron-forward" size={16} color={C.statusInfo} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingScreen() {
  const router = useRouter();
  const C = useColors();
  const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  const bookings       = useQuery(api.bookings.getMyBookings, {});
  const mySubscription = useQuery(api.bookingSubscribers.getMySubscription, {});
  const isLoading      = bookings === undefined;
  const isProvider     = !!mySubscription?.isActive;

  const { filtered, upcomingCount, completedCount, cancelledCount, upcomingPreview } =
    useMemo(() => {
      if (!bookings) return { filtered: [], upcomingCount: 0, completedCount: 0, cancelledCount: 0, upcomingPreview: [] };
      const upcoming  = bookings.filter(b => STATUS_TO_TAB[b.status] === "upcoming");
      const completed = bookings.filter(b => STATUS_TO_TAB[b.status] === "completed");
      const cancelled = bookings.filter(b => STATUS_TO_TAB[b.status] === "cancelled");
      const tabMap: Record<BookingTab, typeof bookings> = { upcoming, completed, cancelled };
      const q = searchQuery.trim().toLowerCase();
      const applySearch = (list: typeof bookings) => {
        if (!q) return list;
        return list.filter(b => {
          const name = (b.provider?.profile?.name ?? b.provider?.profile?.username ?? "").toLowerCase();
          const title = (b.provider?.subscription?.jobTitle ?? "").toLowerCase();
          const date  = (b.sessionDate ?? "").toLowerCase();
          return name.includes(q) || title.includes(q) || date.includes(q);
        });
      };
      return {
        filtered:       applySearch(tabMap[activeTab] ?? []),
        upcomingCount:  upcoming.length,
        completedCount: completed.length,
        cancelledCount: cancelled.length,
        upcomingPreview: upcoming.slice(0, 2),
      };
    }, [bookings, activeTab, searchQuery]);

  const EMPTY_STATE: Record<BookingTab, { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = {
    upcoming:  { icon: "calendar-outline",       title: "No upcoming bookings",  subtitle: "Browse providers and book your first session." },
    completed: { icon: "checkmark-done-outline",  title: "No completed bookings", subtitle: "Sessions you attend will appear here." },
    cancelled: { icon: "ban-outline",             title: "No cancelled bookings", subtitle: "Any cancelled appointments will appear here." },
  };

  return (
    <AppBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MobileCard>
          {/* ── Top nav ─────────────────────────────────────────────── */}
          <TopNav />

          {/* ── Provider Dashboard Banner (providers only) ──────────── */}
          {isProvider && (
            <View style={styles.providerBannerSection}>
              <ProviderDashboardBanner
                onPress={() => router.push("/(tabs)/booking/my-sessions" as any)}
              />
            </View>
          )}

          {/* ── Hero header ─────────────────────────────────────────── */}
          <View style={styles.heroBlock}>
            <Text style={[styles.heroTitle, { color: C.textPrimary }]} allowFontScaling={false}>Your Sessions</Text>
            <Text style={[styles.heroSub, { color: C.textMuted }]} allowFontScaling={false}>
              Book 1-on-1 sessions or join group events
            </Text>
          </View>

          {/* ── Stats strip ─────────────────────────────────────────── */}
          {!isLoading && (
            <View style={styles.statsRow}>
              {[
                { count: upcomingCount,  label: "Upcoming",  color: C.statusInfo,    bg: C.statusInfoBg,    icon: "calendar-outline" as const },
                { count: completedCount, label: "Completed", color: C.statusSuccess, bg: C.statusSuccessBg, icon: "checkmark-done-outline" as const },
                { count: cancelledCount, label: "Cancelled", color: C.statusDanger,  bg: C.statusDangerBg,  icon: "ban-outline" as const },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={16} color={s.color} />
                  <Text style={[styles.statCount, { color: s.color }]} allowFontScaling={false}>{s.count}</Text>
                  <Text style={[styles.statLabel, { color: C.textMuted }]} allowFontScaling={false}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Search ──────────────────────────────────────────────── */}
          <View style={[styles.searchWrap, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
            <Ionicons name="search-outline" size={16} color={C.iconSecondary} />
            <TextInput
              style={[styles.searchInput, { color: C.textPrimary }]}
              placeholder="Search by provider, date…"
              placeholderTextColor={C.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search bookings"
              allowFontScaling={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}
                hitSlop={{ top:6, bottom:6, left:6, right:6 }}
                accessibilityRole="button" accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={16} color={C.iconSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </MobileCard>

        {/* ══════════════════════════════════════════════════════════
            SECTION 1 — 1-ON-1 SESSIONS
        ══════════════════════════════════════════════════════════ */}
        <MobileCard style={styles.sectionCard}>
          {/* Section label */}
          <View style={[styles.sectionLabelRow, { borderBottomColor: C.borderSubtle }]}>
            <View style={[styles.sectionDot, { backgroundColor: C.actionPrimary }]} />
            <Text style={[styles.sectionChipLabel, { color: C.textMuted }]} allowFontScaling={false}>1-ON-1 SESSIONS</Text>
          </View>

          {/* Upcoming preview */}
          {!isLoading && upcomingPreview.length > 0 && (
            <View style={styles.innerSection}>
              <SectionHeader
                title="Coming Up"
                action={() => setActiveTab("upcoming")}
              />
              {upcomingPreview.map(booking => (
                <BookingCard
                  key={booking._id}
                  booking={booking}
                  onPress={() => router.push(`/(tabs)/booking/booking-detail?bookingId=${booking._id}` as any)}
                  onJoin={() => router.push(`/(tabs)/booking/live-session?bookingId=${booking._id}` as any)}
                />
              ))}
            </View>
          )}

          {/* Quick actions for 1-on-1 */}
          <View style={styles.innerSection}>
            <SectionHeader title="Quick Actions" />
            <View style={styles.actionTilesGrid}>
              <ActionTile icon="person-add-outline" label="Book 1-on-1"
                onPress={() => router.push("/(tabs)/booking/providers" as any)}
                iconBg={C.bgPrimaryMid} iconColor={C.actionPrimary} />
              <ActionTile icon="search-outline" label="Find Providers"
                onPress={() => router.push("/(tabs)/booking/providers" as any)}
                iconBg={C.statusInfoBg} iconColor={C.statusInfo} />
              <ActionTile icon="time-outline" label="History"
                onPress={() => router.push("/(tabs)/booking/history" as any)}
                iconBg={C.statusSuccessBg} iconColor={C.statusSuccess} />
              <ActionTile icon="git-network-outline" label="Referrals"
                onPress={() => router.push("/(tabs)/booking/referrals" as any)}
                iconBg={C.greenSurface} iconColor={C.statusSuccess} />
            </View>
          </View>

          {/* Tab + booking list */}
          <View style={styles.innerSection}>
            {/* Tab bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.tabBarContent, { borderBottomColor: C.borderSubtle }]}>
              {SCREEN_TABS.map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity key={tab.key}
                    style={[styles.tabItem, isActive && { borderBottomColor: C.actionPrimary }]}
                    onPress={() => setActiveTab(tab.key)}
                    activeOpacity={0.8} accessibilityRole="tab"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={tab.label}>
                    <Ionicons name={tab.icon} size={14}
                      color={isActive ? C.actionPrimary : C.iconDisabled} />
                    <Text style={[styles.tabLabel, { color: C.iconDisabled }, isActive && { color: C.actionPrimary, fontWeight: "600" }]} allowFontScaling={false}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Tab content */}
            <View style={styles.tabContent}>
              {isLoading ? (
                <ActivityIndicator color={C.actionPrimary} style={{ marginVertical: 40 }} />
              ) : filtered.length === 0 ? (
                <EmptyStateCard
                  icon={EMPTY_STATE[activeTab].icon}
                  title={EMPTY_STATE[activeTab].title}
                  subtitle={EMPTY_STATE[activeTab].subtitle}
                  action={activeTab === "upcoming" ? (
                    <PrimaryButton
                      label="Find a Provider"
                      onPress={() => router.push("/(tabs)/booking/providers" as any)}
                      icon={<Ionicons name="search-outline" size={18} color="#FFFFFF" />}
                    />
                  ) : undefined}
                />
              ) : (
                <View style={styles.bookingList}>
                  {filtered.map(booking => (
                    <BookingCard
                      key={booking._id}
                      booking={booking}
                      onPress={() => router.push(`/(tabs)/booking/booking-detail?bookingId=${booking._id}` as any)}
                      onJoin={() => router.push(`/(tabs)/booking/live-session?bookingId=${booking._id}` as any)}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </MobileCard>

        {/* ══════════════════════════════════════════════════════════
            SECTION 2 — GROUP EVENTS
        ══════════════════════════════════════════════════════════ */}
        <MobileCard style={styles.sectionCard}>
          <View style={[styles.sectionLabelRow, { borderBottomColor: C.borderSubtle }]}>
            <View style={[styles.sectionDot, { backgroundColor: C.statusInfo }]} />
            <Text style={[styles.sectionChipLabel, { color: C.textMuted }]} allowFontScaling={false}>GROUP EVENTS</Text>
          </View>

          <View style={[styles.eventsPromoCard, { backgroundColor: C.statusInfoBg, borderColor: C.blueBorder }]}>
            <View style={styles.eventsPromoLeft}>
              <View style={[styles.eventsPromoIconWrap, { backgroundColor: C.blueSurfaceMid }]}>
                <Ionicons name="people" size={26} color={C.statusInfo} />
              </View>
              <View style={styles.eventsPromoText}>
                <Text style={[styles.eventsPromoTitle, { color: C.textPrimary }]} allowFontScaling={false}>
                  Join a Live Event
                </Text>
                <Text style={[styles.eventsPromoSub, { color: C.textMuted }]} allowFontScaling={false}>
                  Audio & video group sessions with expert providers
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.eventsPromoCta, { backgroundColor: C.blueSurfaceMid, borderColor: C.blueBorder }]}
              onPress={() => router.push("/(tabs)/booking/events" as any)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Browse group events"
            >
              <Text style={[styles.eventsPromoCtaText, { color: C.statusInfo }]} allowFontScaling={false}>Browse</Text>
              <Ionicons name="arrow-forward" size={14} color={C.statusInfo} />
            </TouchableOpacity>
          </View>

          <View style={styles.actionTilesGrid}>
            <ActionTile icon="radio-outline" label="Live Events"
              onPress={() => router.push("/(tabs)/booking/events" as any)}
              iconBg={C.statusInfoBg} iconColor={C.statusInfo} />
            <ActionTile icon="mic-outline" label="Audio Rooms"
              onPress={() => router.push("/(tabs)/booking/events" as any)}
              iconBg={C.purpleSurface} iconColor={C.palette.purple} />
            <ActionTile icon="videocam-outline" label="Recordings"
              onPress={() => router.push("/(tabs)/booking/recordings" as any)}
              iconBg={C.statusWarningBg} iconColor={C.statusWarning} />
            <ActionTile icon="ribbon-outline" label={isProvider ? "My Events" : "Go Pro"}
              onPress={() => router.push(isProvider ? "/(tabs)/booking/events" as any : "/(tabs)/booking/become-provider" as any)}
              iconBg={C.bgPrimaryMid} iconColor={C.actionPrimary} />
          </View>
        </MobileCard>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3 — PROVIDER TOOLS (provider-only)
        ══════════════════════════════════════════════════════════ */}
        {isProvider && (
          <MobileCard style={styles.sectionCard}>
            <View style={[styles.sectionLabelRow, { borderBottomColor: C.borderSubtle }]}>
              <View style={[styles.sectionDot, { backgroundColor: C.statusSuccess }]} />
              <Text style={[styles.sectionChipLabel, { color: C.textMuted }]} allowFontScaling={false}>PROVIDER TOOLS</Text>
            </View>

            <View style={styles.providerToolsGrid}>
              <TouchableOpacity style={[styles.providerToolCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}
                onPress={() => router.push("/(tabs)/booking/my-sessions" as any)}
                activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="My sessions">
                <View style={[styles.providerToolIcon, { backgroundColor: C.statusInfoBg }]}>
                  <Ionicons name="calendar-sharp" size={22} color={C.statusInfo} />
                </View>
                <Text style={[styles.providerToolLabel, { color: C.textPrimary }]} allowFontScaling={false}>My Sessions</Text>
                <Text style={[styles.providerToolSub, { color: C.textMuted }]} allowFontScaling={false}>View &amp; confirm requests</Text>
                <Ionicons name="chevron-forward" size={14} color={C.iconSecondary} style={{ marginTop: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.providerToolCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}
                onPress={() => router.push("/(tabs)/booking/events" as any)}
                activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Manage events">
                <View style={[styles.providerToolIcon, { backgroundColor: C.bgPrimaryMid }]}>
                  <Ionicons name="radio" size={22} color={C.actionPrimary} />
                </View>
                <Text style={[styles.providerToolLabel, { color: C.textPrimary }]} allowFontScaling={false}>Events</Text>
                <Text style={[styles.providerToolSub, { color: C.textMuted }]} allowFontScaling={false}>Create &amp; manage events</Text>
                <Ionicons name="chevron-forward" size={14} color={C.iconSecondary} style={{ marginTop: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.providerToolCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}
                onPress={() => router.push("/(tabs)/booking/recordings" as any)}
                activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Recordings">
                <View style={[styles.providerToolIcon, { backgroundColor: C.purpleSurface }]}>
                  <Ionicons name="cloud-upload-outline" size={22} color={C.palette.purple} />
                </View>
                <Text style={[styles.providerToolLabel, { color: C.textPrimary }]} allowFontScaling={false}>Recordings</Text>
                <Text style={[styles.providerToolSub, { color: C.textMuted }]} allowFontScaling={false}>Manage session recordings</Text>
                <Ionicons name="chevron-forward" size={14} color={C.iconSecondary} style={{ marginTop: 4 }} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.providerToolCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}
                onPress={() => router.push("/(tabs)/booking/referrals" as any)}
                activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Referrals">
                <View style={[styles.providerToolIcon, { backgroundColor: C.greenSurface }]}>
                  <Ionicons name="git-network-outline" size={22} color={C.statusSuccess} />
                </View>
                <Text style={[styles.providerToolLabel, { color: C.textPrimary }]} allowFontScaling={false}>Referrals</Text>
                <Text style={[styles.providerToolSub, { color: C.textMuted }]} allowFontScaling={false}>Track &amp; earn rewards</Text>
                <Ionicons name="chevron-forward" size={14} color={C.iconSecondary} style={{ marginTop: 4 }} />
              </TouchableOpacity>
            </View>
          </MobileCard>
        )}

        {/* ══════════════════════════════════════════════════════════
            GO PRO CTA (non-providers only)
        ══════════════════════════════════════════════════════════ */}
        {!isProvider && !isLoading && (
          <MobileCard style={styles.sectionCard}>
            <TouchableOpacity style={[styles.goProCard, { backgroundColor: C.statusWarningBg, borderColor: C.amberBorder }]}
              onPress={() => router.push("/(tabs)/booking/become-provider" as any)}
              activeOpacity={0.88} accessibilityRole="button" accessibilityLabel="Become a provider">
              <View style={styles.goProLeft}>
                <View style={[styles.goProIconWrap, { backgroundColor: C.amberSurface }]}>
                  <Ionicons name="ribbon" size={24} color={C.statusWarning} />
                </View>
                <View>
                  <Text style={[styles.goProTitle, { color: C.textPrimary }]} allowFontScaling={false}>Become a Provider</Text>
                  <Text style={[styles.goProSub, { color: C.textMuted }]} allowFontScaling={false}>
                    Share your expertise and earn from sessions
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.statusWarning} />
            </TouchableOpacity>
          </MobileCard>
        )}

      </ScrollView>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },

  // ── Provider Banner Section (top of first card) ──────────────────
  providerBannerSection: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space4,
    paddingBottom: 0,
  },
  providerBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: spacing.space3,
    paddingRight: spacing.space3,
  },
  providerBannerAccent: {
    width: 3,
    alignSelf: "stretch",
    marginRight: spacing.space3,
  },
  providerBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.radiusSM,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.space3,
    flexShrink: 0,
  },
  providerBannerText: {
    flex: 1,
    gap: 3,
  },
  providerBannerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  providerBannerTitle: {
    ...typeScale.labelMD,
    fontWeight: "700",
  },
  providerBannerBadge: {
    backgroundColor: Colors.statusInfo,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  providerBannerBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  providerBannerSub: {
    ...typeScale.caption,
  },
  providerBannerChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Hero ─────────────────────────────────────────────────────────
  heroBlock: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space5,
    paddingBottom: spacing.space3,
  },
  heroTitle: {
    ...typeScale.headingXL,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  heroSub: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    marginTop: 4,
  },

  // ── Stats ────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: "row",
    gap: spacing.space2,
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space4,
  },
  statCard: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: spacing.space3,
    borderRadius: radius.radiusMD,
    gap: 4,
  },
  statCount: {
    ...typeScale.headingMD,
    fontWeight: "700",
  },
  statLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },

  // ── Search ───────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusFull,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
  },

  // ── Section Cards ────────────────────────────────────────────────
  sectionCard: {
    paddingBottom: spacing.space4,
    marginTop: 0,
  },
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space5,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: spacing.space4,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionChipLabel: {
    ...typeScale.overline,
    color: Colors.textMuted,
    letterSpacing: 1.2,
  },

  // ── Inner Sections ───────────────────────────────────────────────
  innerSection: {
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space5,
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

  // ── Action Tiles ─────────────────────────────────────────────────
  actionTilesGrid: {
    flexDirection: "row",
    gap: spacing.space3,
  },
  actionTile: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  actionTileIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.radiusMD,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTileLabel: {
    ...typeScale.caption,
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textSecondary,
    textAlign: "center",
  },

  // ── Tab bar ──────────────────────────────────────────────────────
  tabBarContent: {
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 4,
    marginBottom: spacing.space3,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
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
  tabContent: {
    minHeight: 200,
  },

  // ── Booking List ─────────────────────────────────────────────────
  bookingList: {
    gap: spacing.space3,
  },

  // ── Booking Card ─────────────────────────────────────────────────
  bookingCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
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

  // ── Events Promo Card ────────────────────────────────────────────
  eventsPromoCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
  },
  eventsPromoLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    flex: 1,
  },
  eventsPromoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.blueSurfaceMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  eventsPromoText: {
    flex: 1,
    gap: 3,
  },
  eventsPromoTitle: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  eventsPromoSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  eventsPromoCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.blueSurfaceMid,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    flexShrink: 0,
  },
  eventsPromoCtaText: {
    ...typeScale.labelSM,
    color: Colors.statusInfo,
    fontWeight: "600",
  },

  // ── Provider Tools Grid ──────────────────────────────────────────
  providerToolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.space3,
    paddingHorizontal: spacing.space4,
  },
  providerToolCard: {
    width: "47%",
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: 4,
  },
  providerToolIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.radiusSM,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  providerToolLabel: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  providerToolSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
    lineHeight: 15,
  },

  // ── Go Pro Card ──────────────────────────────────────────────────
  goProCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.statusWarningBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginTop: spacing.space3,
    marginBottom: spacing.space2,
  },
  goProLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    flex: 1,
  },
  goProIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.amberSurface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  goProTitle: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  goProSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
});
