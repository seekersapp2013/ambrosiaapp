import React, { useState } from "react";
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
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { EmptyStateCard } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";

// ─── Types ────────────────────────────────────────────────────────────────────
type BookingStatus = "upcoming" | "completed" | "cancelled";
type BookingTab = "upcoming" | "completed" | "cancelled";

interface Booking {
  _id: string;
  title: string;
  providerName: string;
  date: string;
  time: string;
  status: BookingStatus;
  price: string;
  category: string;
}

// ─── Status design tokens ─────────────────────────────────────────────────────
const STATUS_COLOR: Record<BookingStatus, string> = {
  upcoming:  Colors.statusInfo,
  completed: Colors.statusSuccess,
  cancelled: Colors.statusDanger,
};

const STATUS_BG: Record<BookingStatus, string> = {
  upcoming:  Colors.statusInfoBg,
  completed: Colors.statusSuccessBg,
  cancelled: Colors.statusDangerBg,
};

const STATUS_ICON: Record<BookingStatus, keyof typeof Ionicons.glyphMap> = {
  upcoming:  "time-outline",
  completed: "checkmark-circle-outline",
  cancelled: "close-circle-outline",
};

const TABS: { key: BookingTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "upcoming",  label: "Upcoming",  icon: "calendar-outline" },
  { key: "completed", label: "Completed", icon: "checkmark-done-outline" },
  { key: "cancelled", label: "Cancelled", icon: "ban-outline" },
];

// ─── Placeholder data (replace with Convex query) ────────────────────────────
const MOCK_BOOKINGS: Booking[] = [];

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onPress }: { booking: Booking; onPress: () => void }) {
  const statusColor = STATUS_COLOR[booking.status];
  const statusBg    = STATUS_BG[booking.status];
  const statusIcon  = STATUS_ICON[booking.status];

  return (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`Booking: ${booking.title}`}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <Ionicons name="calendar" size={20} color={Colors.actionPrimary} />
        </View>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={1} allowFontScaling={true}>
            {booking.title}
          </Text>
          <Text style={styles.cardProvider} numberOfLines={1} allowFontScaling={true}>
            {booking.providerName}
          </Text>
        </View>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Ionicons name={statusIcon} size={11} color={statusColor} />
          <Text style={[styles.statusText, { color: statusColor }]} allowFontScaling={false}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.cardDivider} />

      {/* Meta row */}
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>{booking.date}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>{booking.time}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="pricetag-outline" size={13} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>{booking.price}</Text>
        </View>
      </View>

      {/* Category chip */}
      <View style={styles.categoryChip}>
        <Text style={styles.categoryText} allowFontScaling={false}>{booking.category}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BookingTab>("upcoming");

  // TODO: Replace with Convex query
  // const bookings = useQuery(api.bookings.getMyBookings, { status: activeTab });
  const bookings: Booking[] | undefined = MOCK_BOOKINGS;
  const isLoading = false;

  const filtered = (bookings ?? []).filter((b) => b.status === activeTab);

  const EMPTY_STATE: Record<BookingTab, { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }> = {
    upcoming:  { icon: "calendar-outline",       title: "No upcoming bookings",  subtitle: "Your scheduled appointments will appear here." },
    completed: { icon: "checkmark-done-outline",  title: "No completed bookings", subtitle: "Bookings you've attended will show up here." },
    cancelled: { icon: "ban-outline",             title: "No cancelled bookings", subtitle: "Any cancelled appointments will appear here." },
  };

  return (
    <AppBackground>
      <ScreenHeader
        title="My Bookings"
        trailing={
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/booking/new" as any)}
            accessibilityRole="button"
            accessibilityLabel="New booking"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add-circle-outline" size={26} color={Colors.actionPrimary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MobileCard>
          {/* Page intro */}
          <View style={styles.introBlock}>
            <Text style={styles.introTitle}>Bookings</Text>
            <Text style={styles.introSubtitle}>Manage your appointments & sessions</Text>
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => router.push("/(tabs)/booking/new" as any)}
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
              onPress={() => router.push("/(tabs)/booking/settings" as any)}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Booking settings"
            >
              <View style={[styles.quickActionIcon, { backgroundColor: Colors.statusWarningBg }]}>
                <Ionicons name="settings-outline" size={22} color={Colors.statusWarning} />
              </View>
              <Text style={styles.quickActionLabel} allowFontScaling={false}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
          >
            {TABS.map((tab) => {
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
                  <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} allowFontScaling={false}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tab content */}
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
                        label="Book a Session"
                        onPress={() => router.push("/(tabs)/booking/new" as any)}
                        icon={<Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />}
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
                      router.push(`/(tabs)/booking/${booking._id}` as any)
                    }
                  />
                ))}
              </View>
            )}
          </View>

          {/* CTA — only shown when there are bookings */}
          {filtered.length > 0 && activeTab === "upcoming" && (
            <View style={styles.ctaWrap}>
              <PrimaryButton
                label="Book a New Session"
                onPress={() => router.push("/(tabs)/booking/new" as any)}
                icon={<Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />}
              />
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

  // Intro
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

  // Quick actions grid
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
  categoryChip: {
    alignSelf: "flex-start",
    marginTop: spacing.space3,
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

  // CTA
  ctaWrap: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    paddingBottom: spacing.space4,
  },
});
