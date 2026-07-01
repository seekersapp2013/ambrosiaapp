/**
 * live-session.tsx
 * Route: /(tabs)/booking/live-session?bookingId=<id>
 *
 * States:
 *   "join"       — session summary, join button
 *   "connecting" — token fetch + room creation in progress
 *   "live"       — renders LiveStreamRoom full-screen
 *   "ended"      — session over, optional recording download
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Image,
  Alert,
  Platform,
  PermissionsAndroid,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton, SecondaryButton, DestructiveButton } from "@/components/ui/Button";
import { LiveStreamRoom } from "@/components/booking/LiveStreamRoom";
import { AudioRoomView } from "@/components/booking/AudioRoomView";

// ─── Types ────────────────────────────────────────────────────────────────────
type SessionView = "join" | "connecting" | "live" | "ended";

interface TokenData {
  token: string;
  wsUrl: string;
  roomName: string;
}

interface AudioTokenData extends TokenData {
  role: string; // "HOST" | "SPEAKER" | "LISTENER"
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const DISABLE_TIME_RESTRICTION =
  process.env.EXPO_PUBLIC_DISABLE_STREAM_TIME_RESTRICTION === "true";

function isJoinable(sessionDate: string, sessionTime: string): boolean {
  if (DISABLE_TIME_RESTRICTION) return true;
  try {
    const now = Date.now();
    const sessionMs = new Date(`${sessionDate}T${sessionTime}`).getTime();
    const diffMin = (sessionMs - now) / 60000;
    // Allow from 15 min before up to 90 min after session start
    return diffMin <= 15 && diffMin >= -90;
  } catch {
    return false;
  }
}

function formatDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
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

// ─── Runtime permission helper (Android 6+) ───────────────────────────────────
/**
 * Requests CAMERA + RECORD_AUDIO on Android at runtime.
 * Returns true if both are granted (or if we're on iOS where no runtime
 * request is needed for these via LiveKit RN).
 */
async function requestMediaPermissions(audioOnly: boolean): Promise<boolean> {
  if (Platform.OS !== "android") return true;

  try {
    const permissions: string[] = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    if (!audioOnly) {
      permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
    }

    const results = await PermissionsAndroid.requestMultiple(permissions as any);

    const allGranted = permissions.every(
      (p) => results[p as keyof typeof results] === PermissionsAndroid.RESULTS.GRANTED
    );

    if (!allGranted) {
      Alert.alert(
        "Permissions Required",
        audioOnly
          ? "Microphone access is required to join the audio room. Please grant it in your device settings."
          : "Camera and microphone access are required to join the session. Please grant them in your device settings.",
        [{ text: "OK" }]
      );
    }

    return allGranted;
  } catch {
    return false;
  }
}

// ─── Status badge for stream state ───────────────────────────────────────────
function StreamStatusBadge({ status }: { status: string | undefined }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
    NOT_STARTED: { label: "Not Started", color: Colors.textMuted,      bg: Colors.bgElevated,      icon: "time-outline" },
    LIVE:        { label: "LIVE",        color: Colors.statusDanger,    bg: Colors.statusDangerBg,  icon: "radio-outline" },
    ENDED:       { label: "Ended",       color: Colors.textDisabled,    bg: Colors.bgElevated,      icon: "checkmark-done-outline" },
  };
  const s = map[status ?? "NOT_STARTED"] ?? map.NOT_STARTED;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={12} color={s.color} />
      <Text style={[styles.statusBadgeText, { color: s.color }]} allowFontScaling={false}>
        {s.label}
      </Text>
    </View>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────
function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={15} color={Colors.actionPrimary} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel} allowFontScaling={false}>{label}</Text>
        <Text style={styles.detailValue} allowFontScaling={false}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function LiveSessionScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();

  const [view,          setView]          = useState<SessionView>("join");
  const [tokenData,     setTokenData]     = useState<TokenData | null>(null);
  const [audioTokenData,setAudioTokenData]= useState<AudioTokenData | null>(null);
  const [isAudioOnly,   setIsAudioOnly]   = useState(false);
  const [joinError,     setJoinError]     = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const booking = useQuery(
    api.livekit.getBookingForStream,
    bookingId ? { bookingId: bookingId as any } : "skip"
  );

  // ── Mutations / Actions ────────────────────────────────────────────────────
  const createRoom             = useMutation(api.livekit.createLiveStreamRoom);
  const startSession           = useMutation(api.bookings.startSession);
  const downloadRecording      = useMutation(api.livekit.downloadRecording);
  const generateToken          = useAction(api.livekitActions.generateAccessToken);
  const generateAudioToken     = useAction(api.livekitActions.generateAudioEventToken);

  // Avatar URL for the other party
  const otherPartyAvatar = booking?.isProvider
    ? booking?.client?.avatar
    : booking?.provider?.avatar;

  const otherPartyName = booking?.isProvider
    ? (booking?.client?.name ?? booking?.client?.username ?? "Client")
    : (booking?.provider?.name ?? booking?.provider?.username ?? "Provider");

  const isProvider   = booking?.isProvider ?? false;
  const streamStatus = (booking as any)?.liveStreamStatus as string | undefined;
  const hasEnded     = streamStatus === "ENDED";
  const hasRecording =
    !!(booking as any)?.recordingUrl &&
    !(booking as any)?.recordingUrl?.startsWith("pending-") &&
    !(booking as any)?.recordingUrl?.startsWith("processing-");

  const canJoin =
    booking?.status === "CONFIRMED" &&
    !hasEnded &&
    isJoinable((booking as any).sessionDate, (booking as any).sessionTime);

  // Detect audio-only event
  const eventId     = (booking as any)?.eventId as string | undefined;
  const eventType   = (booking as any)?.event?.eventType as string | undefined;
  const isAudioEvent = eventType === "AUDIO_ONLY" || isAudioOnly;

  // ── Join handler ───────────────────────────────────────────────────────────
  const handleJoin = useCallback(async () => {
    if (!bookingId || !booking) return;
    setJoinError("");

    // Determine session type early so we can request the right permissions
    const bAny = booking as any;
    const detectedEventType = bAny?.event?.eventType as string | undefined;
    const bIsAudio = detectedEventType === "AUDIO_ONLY";

    // 0. Request runtime permissions before doing anything else
    const hasPermissions = await requestMediaPermissions(bIsAudio);
    if (!hasPermissions) return; // user denied — stay on join screen

    setView("connecting");

    try {
      // 1. Create room if it doesn't exist yet
      if (!(booking as any).liveStreamRoomName) {
        await createRoom({ bookingId: bookingId as any });
      }

      const participantName =
        isProvider
          ? (booking?.provider?.name ?? booking?.provider?.username ?? "Provider")
          : (booking?.client?.name  ?? booking?.client?.username  ?? "Client");

      // 2. Branch: audio-only event vs regular video session
      if (bIsAudio && eventId) {
        // Audio event — use generateAudioEventToken
        const result = await generateAudioToken({
          eventId:         eventId as any,
          bookingId:       bookingId as any,
          participantName,
        });
        setAudioTokenData(result);
        setIsAudioOnly(true);
      } else {
        // Standard video session
        const result = await generateToken({
          bookingId: bookingId as any,
          participantName,
        });
        setTokenData(result);
        setIsAudioOnly(false);
      }

      // 3. Provider marks session as live
      if (isProvider) {
        await startSession({ bookingId: bookingId as any });
      }

      setView("live");
    } catch (err: any) {
      setJoinError(err?.message ?? "Failed to join session. Please try again.");
      setView("join");
    }
  }, [bookingId, booking, isProvider, eventId, createRoom, generateToken, generateAudioToken, startSession]);

  // ── Download recording ─────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    if (!bookingId) return;
    try {
      const result = await downloadRecording({ bookingId: bookingId as any });
      if (result.downloadUrl) {
        await Linking.openURL(result.downloadUrl);
      }
    } catch (err: any) {
      setJoinError(err?.message ?? "Could not prepare download.");
    }
  }, [bookingId, downloadRecording]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (booking === undefined) {
    return (
      <AppBackground>
        <ScreenHeader title="Session" onBack={() => router.back()} />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
        </View>
      </AppBackground>
    );
  }

  if (!booking) {
    return (
      <AppBackground>
        <ScreenHeader title="Session" onBack={() => router.back()} />
        <MobileCard>
          <View style={styles.centerWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.statusDanger} />
            <Text style={styles.errorText} allowFontScaling={false}>Booking not found</Text>
            <SecondaryButton label="Go Back" onPress={() => router.back()} style={{ marginTop: spacing.space4 }} />
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  // ── LIVE view — full screen, no chrome ────────────────────────────────────
  if (view === "live") {
    // Audio-only event
    if (isAudioEvent && audioTokenData) {
      return (
        <AudioRoomView
          token={audioTokenData.token}
          wsUrl={audioTokenData.wsUrl}
          roomName={audioTokenData.roomName}
          bookingId={bookingId!}
          eventId={eventId ?? ""}
          isHost={isProvider}
          role={audioTokenData.role}
          onLeave={() => setView("ended")}
        />
      );
    }
    // Standard video session
    if (tokenData) {
      return (
        <LiveStreamRoom
          token={tokenData.token}
          wsUrl={tokenData.wsUrl}
          roomName={tokenData.roomName}
          bookingId={bookingId!}
          isProvider={isProvider}
          onEnd={() => setView("ended")}
          onLeave={() => setView("join")}
        />
      );
    }
  }

  // ── CONNECTING view ────────────────────────────────────────────────────────
  if (view === "connecting") {
    return (
      <AppBackground>
        <ScreenHeader title="Joining Session…" onBack={() => { setView("join"); }} />
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
          <Text style={styles.connectingText} allowFontScaling={false}>
            Setting up your session…
          </Text>
          <Text style={styles.connectingSub} allowFontScaling={false}>
            This usually takes a few seconds
          </Text>
        </View>
      </AppBackground>
    );
  }

  // ── ENDED view ─────────────────────────────────────────────────────────────
  if (view === "ended" || hasEnded) {
    return (
      <AppBackground>
        <ScreenHeader title="Session Ended" onBack={() => router.back()} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <MobileCard>
            <View style={styles.endedHero}>
              <View style={styles.endedIconCircle}>
                <Ionicons name="checkmark-done-circle" size={60} color={Colors.statusSuccess} />
              </View>
              <Text style={styles.endedTitle} allowFontScaling={false}>
                Session Complete
              </Text>
              <Text style={styles.endedSub} allowFontScaling={false}>
                Your session with {otherPartyName} has ended.
              </Text>
            </View>

            {/* Recording section */}
            {isProvider && (
              <View style={styles.recordingCard}>
                <View style={styles.recordingHeader}>
                  <Ionicons
                    name={hasRecording ? "cloud-download-outline" : "radio-outline"}
                    size={18}
                    color={hasRecording ? Colors.statusSuccess : Colors.statusWarning}
                  />
                  <Text style={styles.recordingTitle} allowFontScaling={false}>
                    {hasRecording ? "Recording Available" : "Recording Processing"}
                  </Text>
                </View>
                <Text style={styles.recordingDesc} allowFontScaling={false}>
                  {hasRecording
                    ? "Your session recording is ready to download."
                    : "Your recording is being processed. Check back in a few minutes."}
                </Text>
                {hasRecording && (
                  <PrimaryButton
                    label="Download Recording"
                    onPress={handleDownload}
                    icon={<Ionicons name="cloud-download-outline" size={18} color="#FFFFFF" />}
                    style={styles.downloadBtn}
                    accessibilityLabel="Download session recording"
                  />
                )}
              </View>
            )}

            <View style={styles.endedActions}>
              <PrimaryButton
                label="Back to Bookings"
                onPress={() => router.replace("/(tabs)/booking" as any)}
                icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
                accessibilityLabel="Go back to bookings"
              />
            </View>
          </MobileCard>
        </ScrollView>
      </AppBackground>
    );
  }

  // ── JOIN view (default) ────────────────────────────────────────────────────
  const b = booking as any;
  return (
    <AppBackground>
      <ScreenHeader title="Join Session" onBack={() => router.back()} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <MobileCard>
          {/* Other party card */}
          <View style={styles.partyCard}>
            {otherPartyAvatar ? (
              <Image
                source={{ uri: otherPartyAvatar }}
                style={styles.partyAvatar}
                accessibilityLabel={`${otherPartyName} profile photo`}
              />
            ) : (
              <View style={styles.partyAvatarFallback}>
                <Text style={styles.partyAvatarInitial} allowFontScaling={false}>
                  {otherPartyName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.partyInfo}>
              <Text style={styles.partyName} numberOfLines={1} allowFontScaling={false}>
                {otherPartyName}
              </Text>
              <Text style={styles.partyRole} allowFontScaling={false}>
                {isProvider ? "Client" : "Provider"}
              </Text>
            </View>
            <StreamStatusBadge status={streamStatus} />
          </View>

          {/* Session details */}
          <View style={styles.detailsSection}>
            <DetailRow icon="calendar-outline"  label="Date"     value={formatDate(b.sessionDate)} />
            <View style={styles.detailDivider} />
            <DetailRow icon="time-outline"      label="Time"     value={formatTime(b.sessionTime)} />
            <View style={styles.detailDivider} />
            <DetailRow icon="hourglass-outline" label="Duration" value={`${b.duration} minutes`} />
            <View style={styles.detailDivider} />
            <DetailRow
              icon="people-outline"
              label="Type"
              value={b.sessionType === "ONE_TO_MANY" ? "Group Session" : "1-on-1 Session"}
            />
          </View>

          {/* Time restriction notice */}
          {!DISABLE_TIME_RESTRICTION && !canJoin && !hasEnded && (
            <View style={styles.timeNotice}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo} />
              <Text style={styles.timeNoticeText} allowFontScaling={false}>
                The Join button activates 15 minutes before your session starts.
              </Text>
            </View>
          )}

          {/* Join error */}
          {joinError !== "" && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.statusDanger} />
              <Text style={styles.errorBannerText} allowFontScaling={false}>
                {joinError}
              </Text>
            </View>
          )}

          {/* What to expect */}
          {!hasEnded && (
            <View style={styles.expectCard}>
              {(isAudioEvent ? [
                { icon: "mic-outline"             as const, text: "This is an audio-only room — no video." },
                { icon: "people-outline"          as const, text: "Speakers are on stage. Listeners can raise a hand to speak." },
                { icon: "hand-left-outline"       as const, text: "Raise your hand and the host may promote you to speaker." },
                { icon: "shield-checkmark-outline" as const, text: "Only booked participants can join." },
              ] : [
                { icon: "videocam-outline"        as const, text: "Video and audio are enabled by default." },
                { icon: "mic-outline"             as const, text: "You can mute yourself at any time." },
                { icon: "chatbubble-outline"      as const, text: "Live chat is available during the session." },
                { icon: "shield-checkmark-outline" as const, text: "Only you and the other party can join." },
              ]).map((item, i) => (
                <View key={i} style={styles.expectRow}>
                  <Ionicons name={item.icon} size={15} color={Colors.statusInfo} />
                  <Text style={styles.expectText} allowFontScaling={false}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionWrap}>
            {hasEnded ? (
              <SecondaryButton
                label="Back to Bookings"
                onPress={() => router.replace("/(tabs)/booking" as any)}
                accessibilityLabel="Go back to bookings"
              />
            ) : (
              <PrimaryButton
                label={isAudioEvent ? "Join Audio Room" : "Join Session"}
                onPress={handleJoin}
                disabled={!canJoin}
                icon={<Ionicons name={isAudioEvent ? "mic-outline" : "videocam-outline"} size={20} color="#FFFFFF" />}
                accessibilityLabel={canJoin ? "Join the session" : "Session not yet joinable"}
              />
            )}
          </View>
        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },

  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space3,
    paddingHorizontal: spacing.space6,
  },
  errorText: {
    ...typeScale.headingMD,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Connecting
  connectingText: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    marginTop: spacing.space4,
    textAlign: "center",
  },
  connectingSub: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Other party card
  partyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    padding: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  partyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.borderFilled,
    flexShrink: 0,
  },
  partyAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 2,
    borderColor: Colors.borderFilled,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  partyAvatarInitial: {
    ...typeScale.headingMD,
    color: Colors.actionPrimary,
    fontWeight: "700",
  },
  partyInfo: {
    flex: 1,
    gap: 3,
  },
  partyName: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  partyRole: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },

  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.radiusFull,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Details section
  detailsSection: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
    paddingVertical: spacing.space3,
  },
  detailIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  detailTextWrap: {
    flex: 1,
    gap: 2,
  },
  detailLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  detailValue: {
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  detailDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },

  // Time notice
  timeNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space3,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space3,
  },
  timeNoticeText: {
    ...typeScale.bodySM,
    color: Colors.statusInfo,
    flex: 1,
    lineHeight: 18,
  },

  // Error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusDangerBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.statusDanger,
    padding: spacing.space3,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space3,
  },
  errorBannerText: {
    ...typeScale.bodySM,
    color: Colors.statusDanger,
    flex: 1,
    lineHeight: 18,
  },

  // What to expect
  expectCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    gap: spacing.space3,
  },
  expectRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
  },
  expectText: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },

  // Actions
  actionWrap: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space5,
  },

  // Ended view
  endedHero: {
    alignItems: "center",
    paddingVertical: spacing.space8,
    paddingHorizontal: spacing.space4,
    gap: spacing.space3,
  },
  endedIconCircle: {
    marginBottom: spacing.space2,
  },
  endedTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  endedSub: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },

  // Recording card
  recordingCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    gap: spacing.space3,
  },
  recordingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  recordingTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  recordingDesc: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    lineHeight: 20,
  },
  downloadBtn: {
    marginTop: spacing.space2,
  },

  endedActions: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space5,
  },
});
