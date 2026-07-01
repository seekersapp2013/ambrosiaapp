/**
 * LiveStreamRoom.web.tsx
 * Full web video session powered by livekit-client (browser SDK).
 * Identical UX to the native version — same controls, chat, participant grid.
 *
 * Key design decisions:
 * - adaptiveStream: false — avoids the ElementInfo visibility requirement
 * - Always render <video> elements; show/hide with opacity so attach() has a
 *   DOM node ready immediately (avoids the "track published before DOM ready" race)
 * - Listen on ParticipantEvent (not RoomEvent) per participant for track changes
 * - Use callback refs so attach fires the instant the element mounts
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  memo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  Room,
  RoomEvent,
  ParticipantEvent,
  ConnectionState,
  Track,
  LocalParticipant,
  RemoteParticipant,
  type Participant,
  type LocalTrackPublication,
  type RemoteTrackPublication,
} from "livekit-client";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { LiveStreamControls } from "./LiveStreamControls";
import { LiveStreamChat } from "./LiveStreamChat";
import { ParticipantGrid, type ParticipantInfo } from "./ParticipantGrid";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LiveStreamRoomProps {
  token: string;
  wsUrl: string;
  roomName: string;
  bookingId: string;
  isProvider: boolean;
  onEnd: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildParticipantInfo(
  p: Participant,
  isLocal: boolean,
  camOn?: boolean,
  micOn?: boolean,
): ParticipantInfo {
  return {
    identity: p.identity,
    name: p.name ?? p.identity,
    isCameraEnabled: isLocal
      ? (camOn ?? false)
      : !!(p as RemoteParticipant).isCameraEnabled,
    isMicrophoneEnabled: isLocal
      ? (micOn ?? false)
      : !!(p as RemoteParticipant).isMicrophoneEnabled,
    isSpeaking: p.isSpeaking ?? false,
    isLocal,
  };
}

/** Get the video track from any participant (local or remote) */
function getVideoTrack(p: Participant | null) {
  if (!p) return null;
  const pub = p.getTrackPublication(Track.Source.Camera);
  return (pub?.videoTrack ?? pub?.track ?? null) as any;
}

// ─── LIVE pulsing dot ─────────────────────────────────────────────────────────
function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return <Animated.View style={[styles.liveDot, { opacity: pulse }]} />;
}

// ─── VideoTile ────────────────────────────────────────────────────────────────
// Always renders the <video> element (invisible until a track attaches).
// Uses a callback ref so `track.attach(el)` fires the moment the DOM node exists.
const VideoTile = memo(function VideoTile({
  participant,
  muted = false,
  mirror = false,
  style,
}: {
  participant: Participant | null;
  muted?: boolean;
  mirror?: boolean;
  style?: object;
}) {
  const [hasVideo, setHasVideo] = useState(false);
  // We use a regular ref to hold the element; the callback ref triggers attachment
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  // Ref to the current video track so we can detach on cleanup
  const trackRef = useRef<any>(null);

  const name = participant?.name ?? participant?.identity ?? "?";
  const initial = name.charAt(0).toUpperCase();

  /** Attach the current camera track to the video element if both exist */
  const attachCurrentTrack = useCallback(() => {
    const el = videoElRef.current;
    if (!el || !participant) return;

    const track = getVideoTrack(participant);

    // Detach stale track
    if (trackRef.current && trackRef.current !== track) {
      try { trackRef.current.detach(el); } catch {}
      trackRef.current = null;
    }

    if (track) {
      try {
        track.attach(el);
        trackRef.current = track;
        setHasVideo(true);
      } catch {}
    } else {
      setHasVideo(false);
    }
  }, [participant]);

  // Callback ref — fires whenever the <video> element mounts or unmounts
  const videoCallbackRef = useCallback(
    (el: HTMLVideoElement | null) => {
      videoElRef.current = el;
      if (el) attachCurrentTrack();
    },
    [attachCurrentTrack],
  );

  // Subscribe to participant track events to re-attach when tracks change
  useEffect(() => {
    if (!participant) return;

    // Try immediately (track may already be published)
    attachCurrentTrack();

    const onTrackChange = () => attachCurrentTrack();

    participant.on(ParticipantEvent.TrackSubscribed, onTrackChange);
    participant.on(ParticipantEvent.LocalTrackPublished, onTrackChange);
    participant.on(ParticipantEvent.TrackUnsubscribed, onTrackChange);
    participant.on(ParticipantEvent.LocalTrackUnpublished, onTrackChange);
    participant.on(ParticipantEvent.TrackMuted, onTrackChange);
    participant.on(ParticipantEvent.TrackUnmuted, onTrackChange);

    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, onTrackChange);
      participant.off(ParticipantEvent.LocalTrackPublished, onTrackChange);
      participant.off(ParticipantEvent.TrackUnsubscribed, onTrackChange);
      participant.off(ParticipantEvent.LocalTrackUnpublished, onTrackChange);
      participant.off(ParticipantEvent.TrackMuted, onTrackChange);
      participant.off(ParticipantEvent.TrackUnmuted, onTrackChange);

      // Detach on unmount
      if (trackRef.current && videoElRef.current) {
        try { trackRef.current.detach(videoElRef.current); } catch {}
        trackRef.current = null;
      }
    };
  }, [participant, attachCurrentTrack]);

  return (
    <View style={[styles.tile, style]}>
      {/* <video> is always in the DOM — opacity hides it until a track attaches */}
      {/* @ts-ignore – valid HTML element on web */}
      <video
        ref={videoCallbackRef}
        autoPlay
        playsInline
        muted={muted}
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          // Mirror local preview
          transform: mirror ? "scaleX(-1)" : "none",
          opacity: hasVideo ? 1 : 0,
        } as any}
      />

      {/* Avatar fallback — shown when no video track */}
      {!hasVideo && (
        <View style={styles.tileFallback}>
          <Text style={styles.tileInitial}>{initial}</Text>
        </View>
      )}

      {/* Name bar */}
      <View style={styles.tileNameBar}>
        <Text style={styles.tileName} numberOfLines={1}>
          {name}
          {participant instanceof LocalParticipant ? " (You)" : ""}
        </Text>
        {!(participant instanceof LocalParticipant) &&
          !(participant as RemoteParticipant)?.isMicrophoneEnabled && (
            <Ionicons name="mic-off" size={11} color="#FFF" />
          )}
      </View>
    </View>
  );
});

// ─── Engagement strip ─────────────────────────────────────────────────────────
function EngagementStrip({
  bookingId,
  onChatToggle,
  chatOpen,
}: {
  bookingId: string;
  onChatToggle: () => void;
  chatOpen: boolean;
}) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const likeStream = useMutation(api.engagement.likeStream);
  const bookmarkStream = useMutation(api.engagement.bookmarkStream);

  return (
    <View style={styles.engagementStrip}>
      <TouchableOpacity
        style={styles.engBtn}
        onPress={async () => {
          try { const r = await likeStream({ streamId: bookingId as any }); setLiked(r.liked); } catch {}
        }}
        accessibilityRole="button"
        accessibilityLabel={liked ? "Unlike stream" : "Like stream"}
      >
        <Ionicons name={liked ? "heart" : "heart-outline"} size={24} color={liked ? Colors.statusDanger : "#FFF"} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.engBtn}
        onPress={async () => {
          try { const r = await bookmarkStream({ streamId: bookingId as any }); setBookmarked(r.bookmarked); } catch {}
        }}
        accessibilityRole="button"
        accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark stream"}
      >
        <Ionicons name={bookmarked ? "bookmark" : "bookmark-outline"} size={24} color={bookmarked ? Colors.statusWarning : "#FFF"} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.engBtn, chatOpen && styles.engBtnActive]}
        onPress={onChatToggle}
        accessibilityRole="button"
        accessibilityLabel={chatOpen ? "Close chat" : "Open chat"}
      >
        <Ionicons name="chatbubble-outline" size={24} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LiveStreamRoom({
  token,
  wsUrl,
  bookingId,
  isProvider,
  onEnd,
}: LiveStreamRoomProps) {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [gridOpen, setGridOpen] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  // Tick forces re-render when participant list changes
  const [, setTick] = useState(0);

  const roomRef = useRef<Room | null>(null);

  const stopSessionMutation = useMutation(api.bookings.stopSession);
  const updateStreamStatus = useMutation(api.livekit.updateStreamStatus);
  const startRecordingAction = useAction(api.livekitActions.startRecording);
  const stopRecordingAction = useAction(api.livekitActions.stopRecording);

  // ── Connect ────────────────────────────────────────────────────────────────
  useEffect(() => {
    // adaptiveStream: false — avoids the ElementInfo visibility requirement
    // dynacast: false — simpler for 1-on-1 sessions
    const room = new Room({ adaptiveStream: false, dynacast: false });
    roomRef.current = room;

    const bump = () => setTick((n) => n + 1);

    room.on(RoomEvent.ParticipantConnected, bump);
    room.on(RoomEvent.ParticipantDisconnected, bump);
    room.on(RoomEvent.TrackSubscribed, bump);
    room.on(RoomEvent.TrackUnsubscribed, bump);
    room.on(RoomEvent.LocalTrackPublished, bump);
    room.on(RoomEvent.LocalTrackUnpublished, bump);
    room.on(RoomEvent.TrackMuted, bump);
    room.on(RoomEvent.TrackUnmuted, bump);
    room.on(RoomEvent.ActiveSpeakersChanged, bump);
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (state === ConnectionState.Connected) {
        setConnecting(false);
        bump();
      }
    });
    room.on(RoomEvent.Disconnected, () => {
      if (!isProvider) onEnd();
    });

    room
      .connect(wsUrl, token)
      .then(async () => {
        await room.localParticipant.setCameraEnabled(true);
        await room.localParticipant.setMicrophoneEnabled(true);
        bump();
      })
      .catch(() => setConnecting(false));

    return () => {
      room.disconnect();
      roomRef.current = null;
    };
  }, [wsUrl, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Snapshot live data from the room (re-computed on every tick) ───────────
  const room = roomRef.current;
  const localParticipant = room?.localParticipant ?? null;
  const remoteParticipants = room
    ? Array.from(room.remoteParticipants.values())
    : [];

  // ── Controls ───────────────────────────────────────────────────────────────
  const handleToggleCamera = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.localParticipant.setCameraEnabled(!isCameraOn);
      setIsCameraOn((v) => !v);
    } catch {}
  }, [isCameraOn]);

  const handleToggleMic = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(!isMicOn);
      setIsMicOn((v) => !v);
    } catch {}
  }, [isMicOn]);

  const handleToggleRecord = useCallback(async () => {
    if (loadingRecord) return;
    setLoadingRecord(true);
    try {
      if (isRecording) {
        await stopRecordingAction({ bookingId: bookingId as any });
        setIsRecording(false);
      } else {
        await startRecordingAction({ bookingId: bookingId as any });
        setIsRecording(true);
      }
    } catch (err: any) {
      Alert.alert("Recording Error", err?.message ?? "Could not toggle recording.");
    } finally {
      setLoadingRecord(false);
    }
  }, [loadingRecord, isRecording, bookingId, startRecordingAction, stopRecordingAction]);

  const handleEndCall = useCallback(() => {
    const doEnd = async () => {
      try {
        if (isProvider) {
          if (isRecording) await stopRecordingAction({ bookingId: bookingId as any });
          await stopSessionMutation({ bookingId: bookingId as any });
          await updateStreamStatus({ bookingId: bookingId as any, status: "ENDED" });
        }
        roomRef.current?.disconnect();
        onEnd();
      } catch {
        roomRef.current?.disconnect();
        onEnd();
      }
    };

    if (isProvider) {
      Alert.alert(
        "End Session",
        "This will end the session for everyone. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "End Session", style: "destructive", onPress: doEnd },
        ]
      );
    } else {
      doEnd();
    }
  }, [isProvider, isRecording, bookingId, stopRecordingAction, stopSessionMutation, updateStreamStatus, onEnd]);

  // ── Participant info for grid modal ────────────────────────────────────────
  const allParticipants: ParticipantInfo[] = [
    ...(localParticipant ? [buildParticipantInfo(localParticipant, true, isCameraOn, isMicOn)] : []),
    ...remoteParticipants.map((p) => buildParticipantInfo(p, false)),
  ];

  const focusedParticipant: RemoteParticipant | null = focusedId
    ? (remoteParticipants.find((p) => p.identity === focusedId) ?? remoteParticipants[0] ?? null)
    : remoteParticipants[0] ?? null;

  return (
    <View style={styles.root}>
      {/* ── Connecting overlay ──────────────────────────────────── */}
      {connecting && (
        <View style={styles.connectingOverlay}>
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
          <Text style={styles.connectingText}>Connecting to session…</Text>
        </View>
      )}

      {/* ── Video area ──────────────────────────────────────────── */}
      <View style={styles.videoArea}>
        {/* Main tile — focused remote or local when alone */}
        {focusedParticipant ? (
          <VideoTile
            participant={focusedParticipant}
            style={StyleSheet.absoluteFillObject}
          />
        ) : localParticipant ? (
          <VideoTile
            participant={localParticipant}
            muted
            mirror
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <View style={styles.waitingWrap}>
            <Ionicons name="person-circle-outline" size={72} color={Colors.iconDisabled} />
            <Text style={styles.waitingText}>Waiting for others to join…</Text>
          </View>
        )}

        {/* Secondary strip — other remote participants */}
        {remoteParticipants.length > 1 && (
          <ScrollView
            horizontal
            style={styles.secondaryList}
            contentContainerStyle={styles.secondaryListContent}
            showsHorizontalScrollIndicator={false}
          >
            {remoteParticipants
              .filter((p) => p.identity !== focusedParticipant?.identity)
              .map((p) => (
                <TouchableOpacity
                  key={p.identity}
                  onPress={() => setFocusedId(p.identity)}
                  style={styles.secondaryTileWrap}
                  accessibilityRole="button"
                  accessibilityLabel={`Focus on ${p.name ?? p.identity}`}
                >
                  <VideoTile participant={p} />
                </TouchableOpacity>
              ))}
          </ScrollView>
        )}

        {/* Local PiP — shown when a remote participant is the main tile */}
        {focusedParticipant && localParticipant && (
          <View style={styles.localPip}>
            <VideoTile
              participant={localParticipant}
              muted
              mirror
              style={{ flex: 1 }}
            />
            {!isMicOn && (
              <View style={styles.localMicOff}>
                <Ionicons name="mic-off" size={10} color="#FFF" />
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Top bar ──────────────────────────────────────────────── */}
      <View style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleEndCall}
            style={styles.topBackBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Leave session"
          >
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topCenter}>
            <LiveDot />
            <Text style={styles.topLiveLabel}>LIVE</Text>
            <View style={styles.topDivider} />
            <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.topParticipantCount}>{allParticipants.length}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setGridOpen(true)}
            style={styles.topGridBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="View all participants"
          >
            <Ionicons name="grid-outline" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Engagement ───────────────────────────────────────────── */}
      <EngagementStrip
        bookingId={bookingId}
        onChatToggle={() => setChatOpen((v) => !v)}
        chatOpen={chatOpen}
      />

      {/* ── Chat ─────────────────────────────────────────────────── */}
      <LiveStreamChat
        bookingId={bookingId}
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* ── Controls ─────────────────────────────────────────────── */}
      <View style={styles.controlsWrap}>
        <LiveStreamControls
          isProvider={isProvider}
          isCameraOn={isCameraOn}
          isMicOn={isMicOn}
          isRecording={isRecording}
          isLoadingRecord={loadingRecord}
          participantCount={remoteParticipants.length}
          onToggleCamera={handleToggleCamera}
          onToggleMic={handleToggleMic}
          onToggleGrid={() => setGridOpen(true)}
          onToggleRecord={handleToggleRecord}
          onEndCall={handleEndCall}
        />
      </View>

      {/* ── Participant grid ──────────────────────────────────────── */}
      <ParticipantGrid
        visible={gridOpen}
        participants={allParticipants}
        onFocus={(id) => setFocusedId(id)}
        onClose={() => setGridOpen(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center", justifyContent: "center",
    zIndex: 100, gap: 16,
  },
  connectingText: { ...typeScale.headingMD, color: Colors.textSecondary },

  videoArea: { flex: 1, position: "relative", backgroundColor: "#111" },
  waitingWrap: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.space3,
  },
  waitingText: { ...typeScale.bodyMD, color: Colors.textDisabled },

  // Generic tile (used by VideoTile and the wrappers below)
  tile: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    position: "relative",
    overflow: "hidden",
  },
  tileFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },
  tileInitial: { fontSize: 56, fontWeight: "700", color: Colors.iconDisabled },
  tileNameBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: spacing.space3, paddingVertical: 6,
    flexDirection: "row", alignItems: "center", gap: 4,
  },
  tileName: { ...typeScale.labelSM, color: "#FFF", flex: 1 },

  secondaryList: {
    position: "absolute", bottom: 0, left: 0, right: 90, height: 100,
  },
  secondaryListContent: {
    paddingHorizontal: spacing.space2, gap: spacing.space2,
    paddingBottom: spacing.space2, paddingTop: spacing.space2,
  },
  secondaryTileWrap: {
    width: 80, height: 100,
    borderRadius: radius.radiusSM, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },

  localPip: {
    position: "absolute", bottom: spacing.space3, right: spacing.space3,
    width: 80, height: 110,
    borderRadius: radius.radiusMD, overflow: "hidden",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: Colors.bgElevated,
  },
  localMicOff: {
    position: "absolute", top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center", justifyContent: "center",
  },

  topBarSafe: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.space4, paddingVertical: spacing.space3,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topBackBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },
  topCenter: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.statusDanger },
  topLiveLabel: { fontSize: 11, fontWeight: "800", color: "#FFF", letterSpacing: 1.2 },
  topDivider: { width: 1, height: 12, backgroundColor: "rgba(255,255,255,0.25)" },
  topParticipantCount: { fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: "600" },
  topGridBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center",
  },

  engagementStrip: {
    position: "absolute", right: spacing.space3, bottom: 100,
    gap: spacing.space3, alignItems: "center", zIndex: 15,
  },
  engBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  engBtnActive: { backgroundColor: Colors.bgPrimaryMid, borderColor: Colors.borderFilled },

  controlsWrap: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20 },
});
