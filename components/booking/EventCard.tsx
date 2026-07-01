/**
 * EventCard
 * Compact card for a public booking event.
 * Used in the provider browser's events section and events.tsx screen.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EventData {
  _id: string;
  title: string;
  description: string;
  sessionDate: string;
  sessionTime: string;
  duration: number;
  maxParticipants: number;
  currentParticipants: number;
  pricePerPerson: number;
  priceCurrency: string;
  availableSpots: number;
  status: string;
  tags?: string[];
  eventType?: string;
  provider?: {
    subscription?: { jobTitle?: string } | null;
    profile?: { name?: string; username?: string; avatar?: string } | null;
  } | null;
}

interface EventCardProps {
  event: EventData;
  onPress: () => void;
  /** When true the card shows as already booked */
  alreadyBooked?: boolean;
  onBook?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
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

// ─── Component ────────────────────────────────────────────────────────────────
export function EventCard({
  event,
  onPress,
  alreadyBooked = false,
  onBook,
}: EventCardProps) {
  const [loading, setLoading] = React.useState(false);
  const createEventBooking = useMutation(api.bookings.createEventBooking);

  const isFull = event.availableSpots <= 0;
  const isAudio = event.eventType === "AUDIO_ONLY";
  const providerName =
    event.provider?.profile?.name ??
    event.provider?.profile?.username ??
    "Provider";

  async function handleBook() {
    if (alreadyBooked || isFull || loading) return;
    try {
      setLoading(true);
      await createEventBooking({
        eventId: event._id as any,
        paymentTxHash: "wallet_payment",
      });
      onBook?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Event: ${event.title}`}
    >
      {/* ── Type badge ──────────────────────────────────────────────── */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: isAudio ? Colors.statusInfoBg : Colors.bgPrimarySubtle },
          ]}
        >
          <Ionicons
            name={isAudio ? "mic-outline" : "videocam-outline"}
            size={11}
            color={isAudio ? Colors.statusInfo : Colors.actionPrimary}
          />
          <Text
            style={[
              styles.typeBadgeText,
              { color: isAudio ? Colors.statusInfo : Colors.actionPrimary },
            ]}
            allowFontScaling={false}
          >
            {isAudio ? "Audio" : "Live"}
          </Text>
        </View>

        {/* Spots left */}
        <View
          style={[
            styles.spotsBadge,
            isFull && { backgroundColor: Colors.statusDangerBg },
          ]}
        >
          <Ionicons
            name="people-outline"
            size={11}
            color={isFull ? Colors.statusDanger : Colors.iconSecondary}
          />
          <Text
            style={[
              styles.spotsText,
              isFull && { color: Colors.statusDanger },
            ]}
            allowFontScaling={false}
          >
            {isFull ? "Full" : `${event.availableSpots} left`}
          </Text>
        </View>
      </View>

      {/* ── Title ───────────────────────────────────────────────────── */}
      <Text style={styles.title} numberOfLines={2} allowFontScaling={false}>
        {event.title}
      </Text>

      {/* ── Provider ────────────────────────────────────────────────── */}
      <View style={styles.providerRow}>
        {event.provider?.profile?.avatar ? (
          <Image
            source={{ uri: event.provider.profile.avatar }}
            style={styles.providerAvatar}
            accessibilityLabel={`${providerName} avatar`}
          />
        ) : (
          <View style={styles.providerAvatarFallback}>
            <Text style={styles.providerInitial} allowFontScaling={false}>
              {providerName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.providerName} numberOfLines={1} allowFontScaling={false}>
          {providerName}
        </Text>
      </View>

      {/* ── Meta ────────────────────────────────────────────────────── */}
      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>
            {formatDate(event.sessionDate)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>
            {formatTime(event.sessionTime)}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="hourglass-outline" size={12} color={Colors.iconSecondary} />
          <Text style={styles.metaText} allowFontScaling={false}>
            {event.duration} min
          </Text>
        </View>
      </View>

      {/* ── Tags ────────────────────────────────────────────────────── */}
      {event.tags && event.tags.length > 0 && (
        <View style={styles.tags}>
          {event.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText} allowFontScaling={false}>
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* ── Footer: price + join button ──────────────────────────────── */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.price} allowFontScaling={false}>
            {event.pricePerPerson === 0
              ? "Free"
              : `${event.priceCurrency} ${event.pricePerPerson}`}
          </Text>
          <Text style={styles.priceSub} allowFontScaling={false}>
            per person
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.joinBtn,
            (isFull || alreadyBooked) && styles.joinBtnDisabled,
          ]}
          onPress={handleBook}
          disabled={isFull || alreadyBooked || loading}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel={
            alreadyBooked ? "Already joined" : isFull ? "Event full" : "Join event"
          }
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={
                  alreadyBooked
                    ? "checkmark-circle-outline"
                    : isFull
                    ? "close-circle-outline"
                    : "enter-outline"
                }
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.joinBtnText} allowFontScaling={false}>
                {alreadyBooked ? "Joined" : isFull ? "Full" : "Join Event"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    width: 240,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginRight: spacing.space3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    marginBottom: spacing.space2,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.radiusFull,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  spotsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  spotsText: {
    fontSize: 10,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  title: {
    ...typeScale.headingSM,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: spacing.space2,
    lineHeight: 18,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    marginBottom: spacing.space3,
  },
  providerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  providerAvatarFallback: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInitial: {
    fontSize: 9,
    fontWeight: "700",
    color: Colors.actionPrimary,
  },
  providerName: {
    ...typeScale.caption,
    color: Colors.textMuted,
    flex: 1,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.space2,
    marginBottom: spacing.space2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: spacing.space3,
  },
  tag: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "500",
    color: Colors.actionPrimary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.space2,
  },
  price: {
    ...typeScale.headingSM,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  priceSub: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  joinBtnDisabled: {
    backgroundColor: Colors.actionPrimaryDisabled,
  },
  joinBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
