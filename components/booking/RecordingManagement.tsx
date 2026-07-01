/**
 * RecordingManagement
 * Lists all ended live sessions and their recording status.
 * Auto-polls "processing" recordings every 30s via getRecordingStatus action.
 */

import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { EmptyStateCard } from "@/components/ui/Card";

// ─── Types ────────────────────────────────────────────────────────────────────
type RecordingStatus = "available" | "processing" | "none";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRecordingStatusType(recordingUrl: string | undefined | null): RecordingStatus {
  if (!recordingUrl) return "none";
  if (recordingUrl.startsWith("pending-") || recordingUrl.startsWith("processing-")) {
    return "processing";
  }
  return "available";
}

function formatDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatTime(t: string): string {
  try {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  } catch {
    return t;
  }
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function RecordingBadge({ status }: { status: RecordingStatus }) {
  const map = {
    available:  { label: "Available",  color: Colors.statusSuccess, bg: Colors.statusSuccessBg, icon: "cloud-done-outline"   as const },
    processing: { label: "Processing", color: Colors.statusWarning, bg: Colors.statusWarningBg, icon: "sync-outline"          as const },
    none:       { label: "No Recording", color: Colors.textDisabled, bg: Colors.bgElevated,     icon: "radio-button-off-outline" as const },
  };
  const s = map[status];
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={11} color={s.color} />
      <Text style={[styles.badgeText, { color: s.color }]} allowFontScaling={false}>
        {s.label}
      </Text>
    </View>
  );
}

// ─── Recording row ────────────────────────────────────────────────────────────
function RecordingRow({
  session,
  onDownload,
  onPoll,
}: {
  session: any;
  onDownload: (bookingId: string) => void;
  onPoll: (bookingId: string) => void;
}) {
  const status = getRecordingStatusType(session.recordingUrl);
  const otherName = session.isProvider
    ? (session.client?.name ?? session.client?.username ?? "Client")
    : (session.provider?.name ?? session.provider?.username ?? "Provider");

  // Auto-poll every 30s for processing recordings
  useEffect(() => {
    if (status !== "processing") return;
    const interval = setInterval(() => {
      onPoll(session._id);
    }, 30000);
    return () => clearInterval(interval);
  }, [status, session._id, onPoll]);

  return (
    <View style={styles.row}>
      {/* Left icon */}
      <View style={styles.rowIcon}>
        <Ionicons
          name={session.isProvider ? "videocam-outline" : "person-outline"}
          size={18}
          color={Colors.actionPrimary}
        />
      </View>

      {/* Center info */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1} allowFontScaling={false}>
          Session with {otherName}
        </Text>
        <View style={styles.rowMeta}>
          <Ionicons name="calendar-outline" size={11} color={Colors.iconSecondary} />
          <Text style={styles.rowMetaText} allowFontScaling={false}>
            {formatDate(session.sessionDate)}
          </Text>
          <Text style={styles.rowMetaDot} allowFontScaling={false}>·</Text>
          <Ionicons name="time-outline" size={11} color={Colors.iconSecondary} />
          <Text style={styles.rowMetaText} allowFontScaling={false}>
            {formatTime(session.sessionTime)}
          </Text>
          <Text style={styles.rowMetaDot} allowFontScaling={false}>·</Text>
          <Text style={styles.rowMetaText} allowFontScaling={false}>
            {session.duration} min
          </Text>
        </View>
        <RecordingBadge status={status} />
      </View>

      {/* Right action */}
      <View style={styles.rowAction}>
        {status === "available" && (
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => onDownload(session._id)}
            accessibilityRole="button"
            accessibilityLabel="Download recording"
          >
            <Ionicons name="cloud-download-outline" size={16} color="#FFFFFF" />
            <Text style={styles.downloadBtnText} allowFontScaling={false}>
              Download
            </Text>
          </TouchableOpacity>
        )}
        {status === "processing" && (
          <ActivityIndicator size="small" color={Colors.statusWarning} />
        )}
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function RecordingManagement() {
  const sessions = useQuery(api.livekit.getMyLiveStreams, { status: "ENDED" });

  const downloadRecording  = useMutation(api.livekit.downloadRecording);
  const getRecordingStatus = useAction(api.livekitActions.getRecordingStatus);

  const handleDownload = useCallback(async (bookingId: string) => {
    try {
      const result = await downloadRecording({ bookingId: bookingId as any });
      if (result.downloadUrl) {
        await Linking.openURL(result.downloadUrl);
      }
    } catch (err: any) {
      // silently fail — user can retry
    }
  }, [downloadRecording]);

  const handlePoll = useCallback(async (bookingId: string) => {
    try {
      await getRecordingStatus({ bookingId: bookingId as any });
      // Convex real-time subscription on getMyLiveStreams updates automatically
      // when the recording URL is patched by the action
    } catch {
      // ignore poll errors
    }
  }, [getRecordingStatus]);

  const isLoading = sessions === undefined;

  // Filter to only sessions that had a livestream room
  const streamedSessions = (sessions ?? []).filter(
    (s: any) => !!s.liveStreamRoomName
  );

  if (isLoading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={Colors.actionPrimary} />
        <Text style={styles.loadingText} allowFontScaling={false}>
          Loading recordings…
        </Text>
      </View>
    );
  }

  if (streamedSessions.length === 0) {
    return (
      <EmptyStateCard
        icon="videocam-outline"
        title="No recordings yet"
        subtitle="Recordings from your live sessions will appear here once sessions end."
        style={styles.emptyState}
      />
    );
  }

  return (
    <View>
      {/* Summary strip */}
      <View style={styles.summaryStrip}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryCount} allowFontScaling={false}>
            {streamedSessions.length}
          </Text>
          <Text style={styles.summaryLabel} allowFontScaling={false}>Sessions</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: Colors.statusSuccess }]} allowFontScaling={false}>
            {streamedSessions.filter((s: any) => getRecordingStatusType(s.recordingUrl) === "available").length}
          </Text>
          <Text style={styles.summaryLabel} allowFontScaling={false}>Available</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: Colors.statusWarning }]} allowFontScaling={false}>
            {streamedSessions.filter((s: any) => getRecordingStatusType(s.recordingUrl) === "processing").length}
          </Text>
          <Text style={styles.summaryLabel} allowFontScaling={false}>Processing</Text>
        </View>
      </View>

      {/* Info note */}
      <View style={styles.infoNote}>
        <Ionicons name="information-circle-outline" size={14} color={Colors.statusInfo} />
        <Text style={styles.infoNoteText} allowFontScaling={false}>
          Processing recordings auto-refresh every 30 seconds.
        </Text>
      </View>

      {/* Session list */}
      <FlatList
        data={streamedSessions}
        keyExtractor={(item: any) => item._id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <RecordingRow
            session={item}
            onDownload={handleDownload}
            onPoll={handlePoll}
          />
        )}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  loadingWrap: {
    alignItems: "center",
    paddingVertical: spacing.space10,
    gap: spacing.space3,
  },
  loadingText: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
  },
  emptyState: {
    paddingVertical: spacing.space10,
  },

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
  summaryCount: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    fontWeight: "700",
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

  // Info note
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space3,
  },
  infoNoteText: {
    ...typeScale.caption,
    color: Colors.statusInfo,
    flex: 1,
  },

  // List
  listContent: {
    paddingHorizontal: spacing.space4,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.space4,
    gap: spacing.space3,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    ...typeScale.headingSM,
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 3,
  },
  rowMetaText: {
    ...typeScale.caption,
    fontSize: 10,
    color: Colors.textMuted,
  },
  rowMetaDot: {
    ...typeScale.caption,
    fontSize: 10,
    color: Colors.textDisabled,
  },
  rowAction: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    minWidth: 82,
  },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderRadius: radius.radiusXS,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },

  // Download button
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  downloadBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
