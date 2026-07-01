import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator,
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
import { DestructiveButton, SecondaryButton } from "@/components/ui/Button";
import { EventCreationForm } from "@/components/booking/EventCreationForm";

// ─── Status tokens ────────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  ACTIVE:    Colors.statusSuccess,
  FULL:      Colors.statusWarning,
  COMPLETED: Colors.statusInfo,
  CANCELLED: Colors.statusDanger,
};
const STATUS_BG: Record<string, string> = {
  ACTIVE:    Colors.statusSuccessBg,
  FULL:      Colors.statusWarningBg,
  COMPLETED: Colors.statusInfoBg,
  CANCELLED: Colors.statusDangerBg,
};
const STATUS_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  ACTIVE:    "radio-outline",
  FULL:      "people-outline",
  COMPLETED: "checkmark-done-outline",
  CANCELLED: "close-circle-outline",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  } catch { return d; }
}
function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ap = h>=12?"PM":"AM";
  return `${h%12||12}:${m.toString().padStart(2,"0")} ${ap}`;
}

// ─── Event management card ────────────────────────────────────────────────────
function EventManageCard({ event, onEdit, onCancel }: {
  event: any; onEdit: () => void; onCancel: () => void;
}) {
  const statusColor = STATUS_COLOR[event.status] ?? Colors.iconSecondary;
  const statusBg    = STATUS_BG[event.status]    ?? Colors.bgElevated;
  const statusIcon  = STATUS_ICON[event.status]  ?? "ellipse-outline";
  const isAudio     = event.eventType === "AUDIO_ONLY";
  const canEdit     = event.status === "ACTIVE";
  const canCancel   = event.status === "ACTIVE" || event.status === "FULL";

  return (
    <View style={emStyles.card}>
      {/* Header */}
      <View style={emStyles.cardHeader}>
        <View style={[emStyles.typeIcon, { backgroundColor: isAudio ? Colors.statusInfoBg : Colors.bgPrimaryMid }]}>
          <Ionicons name={isAudio ? "mic-outline" : "videocam-outline"} size={18}
            color={isAudio ? Colors.statusInfo : Colors.actionPrimary}/>
        </View>
        <View style={emStyles.cardTitle}>
          <Text style={emStyles.title} numberOfLines={1} allowFontScaling={false}>{event.title}</Text>
          <Text style={emStyles.date} allowFontScaling={false}>
            {formatDate(event.sessionDate)} · {formatTime(event.sessionTime)} · {event.duration} min
          </Text>
        </View>
        <View style={[emStyles.statusBadge, { backgroundColor: statusBg }]}>
          <Ionicons name={statusIcon} size={10} color={statusColor}/>
          <Text style={[emStyles.statusText, { color: statusColor }]} allowFontScaling={false}>
            {event.status}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={emStyles.statsRow}>
        <View style={emStyles.statItem}>
          <Ionicons name="people-outline" size={13} color={Colors.iconSecondary}/>
          <Text style={emStyles.statText} allowFontScaling={false}>
            {event.currentParticipants}/{event.maxParticipants}
          </Text>
        </View>
        <View style={emStyles.statItem}>
          <Ionicons name="pricetag-outline" size={13} color={Colors.iconSecondary}/>
          <Text style={emStyles.statText} allowFontScaling={false}>
            {event.pricePerPerson === 0 ? "Free" : `${event.priceCurrency} ${event.pricePerPerson}`}
          </Text>
        </View>
        {event.tags?.length > 0 && (
          <View style={emStyles.statItem}>
            <Ionicons name="pricetags-outline" size={13} color={Colors.iconSecondary}/>
            <Text style={emStyles.statText} numberOfLines={1} allowFontScaling={false}>
              {event.tags.slice(0,2).join(", ")}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {(canEdit || canCancel) && (
        <View style={emStyles.actions}>
          {canEdit && (
            <TouchableOpacity style={emStyles.actionBtn} onPress={onEdit}
              activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Edit event">
              <Ionicons name="create-outline" size={15} color={Colors.statusInfo}/>
              <Text style={[emStyles.actionBtnText, { color: Colors.statusInfo }]} allowFontScaling={false}>
                Edit
              </Text>
            </TouchableOpacity>
          )}
          {canCancel && (
            <TouchableOpacity style={[emStyles.actionBtn, emStyles.actionBtnDanger]} onPress={onCancel}
              activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Cancel event">
              <Ionicons name="close-circle-outline" size={15} color={Colors.statusDanger}/>
              <Text style={[emStyles.actionBtnText, { color: Colors.statusDanger }]} allowFontScaling={false}>
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const router = useRouter();

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [editingEvent,    setEditingEvent]    = useState<any>(null);
  const [cancelTarget,    setCancelTarget]    = useState<any>(null);
  const [cancelReason,    setCancelReason]    = useState("");
  const [cancelling,      setCancelling]      = useState(false);

  const providerEvents = useQuery(api.events.getProviderEvents, {});
  const cancelEvent    = useMutation(api.events.cancelEvent);
  const mySubscription = useQuery(api.bookingSubscribers.getMySubscription);

  const isLoading  = providerEvents === undefined;
  const isProvider = !!mySubscription?.isActive;

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelEvent({ eventId: cancelTarget._id, reason: cancelReason || undefined });
      setCancelTarget(null);
      setCancelReason("");
    } finally {
      setCancelling(false);
    }
  }

  // Summary counts
  const counts = {
    active:    (providerEvents ?? []).filter(e => e.status === "ACTIVE").length,
    full:      (providerEvents ?? []).filter(e => e.status === "FULL").length,
    completed: (providerEvents ?? []).filter(e => e.status === "COMPLETED").length,
    cancelled: (providerEvents ?? []).filter(e => e.status === "CANCELLED").length,
  };

  return (
    <AppBackground>
      <ScreenHeader
        title="My Events"
        onBack={() => router.back()}
        trailing={
          isProvider ? (
            <TouchableOpacity onPress={() => setShowCreateSheet(true)}
              accessibilityRole="button" accessibilityLabel="Create new event"
              hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="add-circle-outline" size={26} color={Colors.actionPrimary}/>
            </TouchableOpacity>
          ) : null
        }
      />

      <FlatList
        data={providerEvents ?? []}
        keyExtractor={item => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={evStyles.listContent}
        ListHeaderComponent={
          <MobileCard>
            {/* Summary strip */}
            {!isLoading && (
              <View style={evStyles.summaryStrip}>
                {[
                  { label:"Active",    count:counts.active,    color:Colors.statusSuccess },
                  { label:"Full",      count:counts.full,      color:Colors.statusWarning },
                  { label:"Completed", count:counts.completed, color:Colors.statusInfo    },
                  { label:"Cancelled", count:counts.cancelled, color:Colors.statusDanger  },
                ].map(item => (
                  <View key={item.label} style={evStyles.summaryItem}>
                    <Text style={[evStyles.summaryCount, { color: item.color }]} allowFontScaling={false}>
                      {item.count}
                    </Text>
                    <Text style={evStyles.summaryLabel} allowFontScaling={false}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}

            {isLoading && (
              <View style={evStyles.loadingWrap}>
                <ActivityIndicator color={Colors.actionPrimary}/>
              </View>
            )}

            {!isLoading && !isProvider && (
              <View style={evStyles.notProviderWrap}>
                <EmptyStateCard
                  icon="ribbon-outline"
                  title="Provider account required"
                  subtitle="Set up your provider profile to create and manage events."
                  action={
                    <TouchableOpacity style={evStyles.becomeBtn}
                      onPress={() => router.push("/(tabs)/booking/become-provider" as any)}
                      accessibilityRole="button">
                      <Text style={evStyles.becomeBtnText} allowFontScaling={false}>Become a Provider</Text>
                    </TouchableOpacity>
                  }
                />
              </View>
            )}

            {!isLoading && isProvider && providerEvents?.length === 0 && (
              <EmptyStateCard
                icon="calendar-outline"
                title="No events yet"
                subtitle="Create your first event to start hosting group sessions."
                style={evStyles.emptyState}
              />
            )}
          </MobileCard>
        }
        renderItem={({ item }) => (
          <View style={evStyles.cardPad}>
            <EventManageCard
              event={item}
              onEdit={() => setEditingEvent(item)}
              onCancel={() => setCancelTarget(item)}
            />
          </View>
        )}
        ListFooterComponent={<View style={{ height: spacing.scrollBottomPadding }}/>}
      />

      {/* ── FAB ──────────────────────────────────────────────────── */}
      {isProvider && (
        <TouchableOpacity style={evStyles.fab} onPress={() => setShowCreateSheet(true)}
          activeOpacity={0.88} accessibilityRole="button" accessibilityLabel="Create new event">
          <Ionicons name="add" size={28} color="#FFFFFF"/>
        </TouchableOpacity>
      )}

      {/* ── Create / Edit bottom sheet ───────────────────────────── */}
      <BottomSheet
        visible={showCreateSheet || !!editingEvent}
        onClose={() => { setShowCreateSheet(false); setEditingEvent(null); }}
        title={editingEvent ? "Edit Event" : "Create Event"}
        dismissable={false}
      >
        <EventCreationForm
          existingEvent={editingEvent}
          onSuccess={() => { setShowCreateSheet(false); setEditingEvent(null); }}
          onCancel={() => { setShowCreateSheet(false); setEditingEvent(null); }}
        />
      </BottomSheet>

      {/* ── Cancel confirmation dialog ───────────────────────────── */}
      <BottomSheet
        visible={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Event"
        variant="dialog"
        dismissable={!cancelling}
      >
        {cancelTarget && (
          <View style={evStyles.cancelDialog}>
            <Text style={evStyles.cancelMsg} allowFontScaling={false}>
              Cancel "{cancelTarget.title}"? All {cancelTarget.currentParticipants} confirmed
              attendees will be notified and refunded.
            </Text>
            <View style={evStyles.cancelBtns}>
              <SecondaryButton label="Keep Event"
                onPress={() => setCancelTarget(null)}
                style={evStyles.cancelBtn}
                accessibilityLabel="Keep the event"/>
              <DestructiveButton
                label="Yes, Cancel"
                onPress={handleCancel}
                loading={cancelling}
                style={evStyles.cancelBtn}
                accessibilityLabel="Confirm event cancellation"/>
            </View>
          </View>
        )}
      </BottomSheet>
    </AppBackground>
  );
}

// ─── Event manage card styles ─────────────────────────────────────────────────
const emStyles = StyleSheet.create({
  card: { backgroundColor:Colors.bgElevated, borderRadius:radius.radiusMD, borderWidth:1, borderColor:Colors.borderSubtle, padding:spacing.space4 },
  cardHeader: { flexDirection:"row", alignItems:"flex-start", gap:spacing.space3, marginBottom:spacing.space3 },
  typeIcon: { width:38, height:38, borderRadius:radius.radiusSM, alignItems:"center", justifyContent:"center", flexShrink:0 },
  cardTitle: { flex:1, gap:3 },
  title: { ...typeScale.headingSM, fontSize:13, color:Colors.textPrimary },
  date:  { ...typeScale.caption, color:Colors.textMuted },
  statusBadge: { flexDirection:"row", alignItems:"center", gap:3, borderRadius:radius.radiusXS, paddingHorizontal:7, paddingVertical:3 },
  statusText: { fontSize:9, fontWeight:"600" },
  statsRow: { flexDirection:"row", flexWrap:"wrap", gap:spacing.space4, marginBottom:spacing.space3 },
  statItem: { flexDirection:"row", alignItems:"center", gap:4 },
  statText: { ...typeScale.caption, color:Colors.textMuted },
  actions: { flexDirection:"row", gap:spacing.space2, borderTopWidth:1, borderTopColor:Colors.borderSubtle, paddingTop:spacing.space3 },
  actionBtn: { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:12, paddingVertical:6, borderRadius:radius.radiusFull, backgroundColor:Colors.statusInfoBg, borderWidth:1, borderColor:Colors.borderSubtle },
  actionBtnDanger: { backgroundColor:Colors.statusDangerBg },
  actionBtnText: { fontSize:11, fontWeight:"600" },
});

// ─── Screen styles ────────────────────────────────────────────────────────────
const evStyles = StyleSheet.create({
  listContent: { paddingBottom:0 },

  summaryStrip: { flexDirection:"row", alignItems:"center", justifyContent:"space-around", paddingVertical:spacing.space4, paddingHorizontal:spacing.space4, borderBottomWidth:1, borderBottomColor:Colors.borderSubtle },
  summaryItem: { alignItems:"center", gap:3 },
  summaryCount: { ...typeScale.headingLG, fontWeight:"700" },
  summaryLabel: { ...typeScale.caption, color:Colors.textMuted },

  loadingWrap: { paddingVertical:spacing.space10, alignItems:"center" },

  notProviderWrap: { paddingVertical:spacing.space4 },
  becomeBtn: { backgroundColor:Colors.actionPrimary, borderRadius:radius.radiusFull, paddingHorizontal:20, paddingVertical:10 },
  becomeBtnText: { ...typeScale.labelMD, color:"#FFFFFF", fontWeight:"600" },

  emptyState: { paddingVertical:spacing.space10 },
  cardPad: { paddingHorizontal:spacing.space4, paddingTop:spacing.space3 },

  fab: {
    position:"absolute", bottom:100, right:24,
    width:56, height:56, borderRadius:28,
    backgroundColor:Colors.actionPrimary,
    alignItems:"center", justifyContent:"center",
    shadowColor:"#C62229", shadowOffset:{width:0,height:8},
    shadowOpacity:0.35, shadowRadius:16, elevation:10,
  },

  cancelDialog: { paddingTop:spacing.space2 },
  cancelMsg: { ...typeScale.bodyMD, color:Colors.textMuted, textAlign:"center", lineHeight:22, marginBottom:spacing.space5 },
  cancelBtns: { flexDirection:"row", gap:spacing.space3 },
  cancelBtn: { flex:1 },
});
