/**
 * Circle Events Screen
 *
 * Status filter + events FlatList for a given circle.
 * Phase 8 — PLAN.MD
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";

type StatusFilter = "ACTIVE" | "CANCELLED";

function formatDate(date: string, time: string): string {
  try {
    const d = new Date(`${date}T${time}`);
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) +
      " at " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return `${date} ${time}`;
  }
}

export default function CircleEventsScreen() {
  const router = useRouter();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");

  // ── Data ────────────────────────────────────────────────────────────────────
  const eventsResult = useQuery(
    api.events.getCircleEvents,
    circleId
      ? { circleId: circleId as Id<"circles">, status: statusFilter, limit: 30 }
      : "skip"
  );

  const events = eventsResult?.events ?? [];
  const isLoading = eventsResult === undefined;

  // ── Render event card ──────────────────────────────────────────────────────
  const renderEvent = ({ item }: { item: any }) => {
    const isPaid = item.pricePerPerson > 0;
    const isFull = item.availableSpots === 0;
    const providerName =
      item.provider?.profile?.name ?? item.provider?.profile?.username ?? "Provider";

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventCardAccent} />

        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.status === "CANCELLED" && (
            <View style={styles.cancelledBadge}>
              <Text style={styles.cancelledBadgeText}>Cancelled</Text>
            </View>
          )}
        </View>

        <View style={styles.eventMeta}>
          <Ionicons name="person-circle-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.eventMetaText}>{providerName}</Text>
        </View>

        <View style={styles.eventMeta}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.eventMetaText}>
            {formatDate(item.sessionDate, item.sessionTime)}
          </Text>
        </View>

        <View style={styles.eventMeta}>
          <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.eventMetaText}>{item.duration} min</Text>
        </View>

        <View style={styles.eventStatsRow}>
          <View style={styles.eventStat}>
            <Ionicons name="people-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.eventStatText}>
              {item.currentParticipants}/{item.maxParticipants} spots
            </Text>
          </View>
          <View style={[styles.eventStat, { marginLeft: "auto" as any }]}>
            <Text style={[styles.eventPrice, isPaid ? styles.paidPrice : styles.freePrice]}>
              {isPaid
                ? `${item.priceCurrency} ${item.pricePerPerson}`
                : "Free"}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Join button */}
        {item.status === "ACTIVE" && (
          <TouchableOpacity
            style={[styles.joinBtn, (isFull || item.userHasBooked) && styles.joinBtnDisabled]}
            disabled={isFull || item.userHasBooked}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/booking" as any,
                params: { eventId: item._id },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={
              item.userHasBooked ? "Already joined" : isFull ? "Event full" : "Join event"
            }
          >
            <Text style={styles.joinBtnText}>
              {item.userHasBooked ? "Joined ✓" : isFull ? "Full" : "Join Event"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <AppBackground>
      <MobileCard>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Circle Events</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Filter */}
        <View style={styles.filterRow}>
          {(["ACTIVE", "CANCELLED"] as StatusFilter[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
              onPress={() => setStatusFilter(s)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: statusFilter === s }}
            >
              <Text style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}>
                {s === "ACTIVE" ? "Active" : "Cancelled"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* List */}
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : events.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No events</Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter === "ACTIVE"
                  ? "No active events for this circle yet."
                  : "No cancelled events."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={events}
              renderItem={renderEvent}
              keyExtractor={(item: any) => item._id}
              contentContainerStyle={styles.listContent}
              scrollEnabled={false}
              removeClippedSubviews={false}
            />
          )}

          {/* Stats strip */}
          {eventsResult && eventsResult.total > 0 && (
            <View style={styles.statsStrip}>
              <Text style={styles.statsText}>
                {eventsResult.total} total event{eventsResult.total !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </ScrollView>
      </MobileCard>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.redBorder,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },

  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  listContent: {
    padding: 12,
    gap: 12,
  },

  eventCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    gap: 8,
    overflow: "hidden",
    position: "relative",
  },
  eventCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.statusSuccess,
    opacity: 0.7,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  cancelledBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.statusDangerBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  cancelledBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.statusDanger,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  eventMetaText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  eventStatsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventStatText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  eventPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  paidPrice: { color: Colors.statusWarning },
  freePrice: { color: Colors.statusSuccess },
  eventDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
  },
  joinBtn: {
    marginTop: 4,
    height: 40,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  joinBtnDisabled: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  joinBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  statsStrip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    alignItems: "center",
  },
  statsText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
