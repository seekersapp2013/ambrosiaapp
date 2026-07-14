/**
 * event-detail.tsx
 * Route: /(tabs)/booking/event-detail?eventId=<id>
 * Shows event details and allows users to join/attend.
 */

import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
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
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";

function formatDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    });
  } catch { return d; }
}

function formatTime(t: string): string {
  try {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch { return t; }
}

export default function EventDetailScreen() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [joining, setJoining] = useState(false);

  const event = useQuery(
    api.events.getEventById,
    eventId ? { eventId: eventId as any } : "skip"
  );
  const createEventBooking = useMutation(api.bookings.createEventBooking);

  const handleJoin = async () => {
    if (!eventId) return;
    setJoining(true);
    try {
      await createEventBooking({
        eventId: eventId as any,
        paymentTxHash: "wallet_payment",
      });
      Alert.alert("Success", "You've joined the event!", [
        { text: "OK", onPress: () => router.replace("/(tabs)/booking" as any) },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not join event.");
    } finally {
      setJoining(false);
    }
  };

  // Loading
  if (event === undefined) {
    return (
      <AppBackground>
        <ScreenHeader title="Event" onBack={() => router.back()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      </AppBackground>
    );
  }

  if (!event) {
    return (
      <AppBackground>
        <ScreenHeader title="Event" onBack={() => router.back()} />
        <MobileCard>
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.statusDanger} />
            <Text style={styles.errorText}>Event not found</Text>
            <SecondaryButton label="Go Back" onPress={() => router.back()} style={{ marginTop: spacing.space4 }} />
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  const isFull = event.availableSpots <= 0;
  const isAudio = event.eventType === "AUDIO_ONLY";
  const providerName = event.provider?.profile?.name ?? event.provider?.profile?.username ?? "Provider";

  return (
    <AppBackground>
      <ScreenHeader title="Event Details" onBack={() => router.back()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <MobileCard>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.typeIcon, { backgroundColor: isAudio ? Colors.statusInfoBg : Colors.bgPrimaryMid }]}>
              <Ionicons name={isAudio ? "mic-outline" : "videocam-outline"} size={24}
                color={isAudio ? Colors.statusInfo : Colors.actionPrimary} />
            </View>
            <Text style={styles.title} allowFontScaling={false}>{event.title}</Text>
            <Text style={styles.hostName} allowFontScaling={false}>Hosted by {providerName}</Text>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.description} allowFontScaling={false}>{event.description}</Text>
          </View>

          {/* Details grid */}
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color={Colors.actionPrimary} />
              <Text style={styles.detailText} allowFontScaling={false}>{formatDate(event.sessionDate)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={16} color={Colors.actionPrimary} />
              <Text style={styles.detailText} allowFontScaling={false}>{formatTime(event.sessionTime)}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="hourglass-outline" size={16} color={Colors.actionPrimary} />
              <Text style={styles.detailText} allowFontScaling={false}>{event.duration} minutes</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="people-outline" size={16} color={Colors.actionPrimary} />
              <Text style={styles.detailText} allowFontScaling={false}>
                {event.currentParticipants}/{event.maxParticipants} spots filled
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="pricetag-outline" size={16} color={Colors.actionPrimary} />
              <Text style={styles.detailText} allowFontScaling={false}>
                {event.pricePerPerson === 0 ? "Free" : `${event.priceCurrency ?? "USD"} ${event.pricePerPerson}`}
              </Text>
            </View>
          </View>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {event.tags.map((tag: string, i: number) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText} allowFontScaling={false}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Capacity indicator */}
          {isFull && (
            <View style={styles.fullBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.statusWarning} />
              <Text style={styles.fullBannerText} allowFontScaling={false}>
                This event is fully booked.
              </Text>
            </View>
          )}

          {/* Action */}
          <View style={styles.actionWrap}>
            <PrimaryButton
              label={isFull ? "Event Full" : "Join Event"}
              onPress={handleJoin}
              disabled={isFull || joining}
              loading={joining}
              icon={<Ionicons name={isAudio ? "mic-outline" : "videocam-outline"} size={18} color="#FFFFFF" />}
              accessibilityLabel={isFull ? "Event is full" : "Join this event"}
            />
          </View>
        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  center: { flex:1, alignItems:"center", justifyContent:"center", gap:spacing.space3, padding:spacing.space6 },
  errorText: { ...typeScale.headingMD, color:Colors.textMuted, textAlign:"center" },
  scrollContent: { paddingBottom:spacing.scrollBottomPadding },

  header: { alignItems:"center", paddingVertical:spacing.space6, paddingHorizontal:spacing.space4, gap:spacing.space3 },
  typeIcon: { width:56, height:56, borderRadius:28, alignItems:"center", justifyContent:"center", marginBottom:spacing.space2 },
  title: { ...typeScale.headingLG, color:Colors.textPrimary, fontWeight:"700", textAlign:"center" },
  hostName: { ...typeScale.bodyMD, color:Colors.textMuted },

  section: { paddingHorizontal:spacing.space4, paddingBottom:spacing.space4 },
  description: { ...typeScale.bodyMD, color:Colors.textSecondary, lineHeight:22 },

  detailsGrid: { paddingHorizontal:spacing.space4, gap:spacing.space3, marginBottom:spacing.space4 },
  detailItem: { flexDirection:"row", alignItems:"center", gap:spacing.space3 },
  detailText: { ...typeScale.bodyMD, color:Colors.textPrimary },

  tagsRow: { flexDirection:"row", flexWrap:"wrap", gap:spacing.space2, paddingHorizontal:spacing.space4, marginBottom:spacing.space4 },
  tag: { backgroundColor:Colors.bgElevated, borderRadius:radius.radiusFull, paddingHorizontal:12, paddingVertical:5, borderWidth:1, borderColor:Colors.borderSubtle },
  tagText: { ...typeScale.caption, color:Colors.textMuted, fontWeight:"500" },

  fullBanner: { flexDirection:"row", alignItems:"center", gap:spacing.space2, backgroundColor:Colors.statusWarningBg, borderRadius:radius.radiusMD, padding:spacing.space3, marginHorizontal:spacing.space4, marginBottom:spacing.space4 },
  fullBannerText: { ...typeScale.bodySM, color:Colors.statusWarning, flex:1 },

  actionWrap: { paddingHorizontal:spacing.space4, paddingBottom:spacing.space5 },
});
