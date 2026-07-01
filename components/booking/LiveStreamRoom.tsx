/**
 * LiveStreamRoom
 * Full-screen video session powered by @livekit/react-native.
 *
 * Layout (top → bottom):
 *   1. Top bar — back, LIVE indicator, participant count, grid toggle
 *   2. Video area — remote participants + local PiP
 *   3. Engagement strip (right side) — like, bookmark, chat toggle
 *   4. LiveStreamChat — slide-up panel
 *   5. LiveStreamControls — bottom bar
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  FlatList,
  SafeAreaView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  LiveKitRoom as Room,
  VideoView,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
  useParticipantTracks,
} from "@livekit/react-native";
import {
  ConnectionState,
  Track,
  ParticipantEvent,
  type Room as RoomType,
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
  /** Called when provider ends session for everyone OR session is detected as ended */
  onEnd: () => void;
  /** Called when client leaves (or provider goes on hold) — returns to join screen */
  onLeave: () => void;
}

// ─── LIVE pulsing dot ─────────────────────────────────────────────────────────
function LiveDot() {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
  );
}

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
  const likeStream     = useMutation(api.engagement.likeStream);
  const bookmarkStream = useMutation(api.engagement.bookmarkStream);

  async function handleLike() {
    try {
      const result = await likeStream({ streamId: bookingId as any });
      setLiked(result.liked);
    } catch { /* ignore */ }
  }

  async function handleBookmark() {
    try {
      const result = await bookmarkStream({ streamId: bookingId as any });
      setBookmarked(result.bookmarked);
    } catch { /* ignore */ }
  }

  return (
    <View style={styles.engagementStrip}>
      <TouchableOpacity
        style={styles.engBtn}
        onPress={handleLike}
        accessibilityRole="button"
        accessibilityLabel={liked ? "Unlike stream" : "Like stream"}
      >
        <Ionicons
          name={liked ? "heart" : "heart-outline"}
          size={24}
          color={liked ? Colors.statusDanger : "#FFFFFF"}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.engBtn}
        onPress={handleBookmark}
        accessibilityRole="button"
        accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark stream"}
      >
        <Ionicons
          name={bookmarked ? "bookmark" : "bookmark-outline"}
          size={24}
          color={bookmarked ? Colors.statusWarning : "#FFFFFF"}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.engBtn, chatOpen && styles.engBtnActive]}
        onPress={onChatToggle}
        accessibilityRole="button"
        accessibilityLabel={chatOpen ? "Close chat" : "Open chat"}
      >
        <Ionicons name="chatbubble-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─── Remote participant tile ──────────────────────────────────────────────────
// Uses useParticipantTracks so the component re-renders whenever a track
// is published, subscribed, or changes — fixing the "blank video" bug on Android.
function RemoteTile({ participant, focused, onPress }: {
  participant: any;
  focused: boolean;
  onPress?: () => void;
}) {
  // useParticipantTracks subscribes to participant track events and triggers
  // re-renders when tracks attach/detach — this is the key fix for issues 1 & 2.
  const tracks = useParticipantTracks(
    [Track.Source.Camera],
    participant.identity
  );

  const initial = (participant.name ?? participant.identity ?? "?")
    .charAt(0).toUpperCase();

  // Prefer the video track from the reactive hook; fall back to direct access
  const trackRef = tracks.find(
    (t) => t.publication.source === Track.Source.Camera
  );
  const videoTrack = trackRef?.publication?.videoTrack ?? undefined;
  const hasVideo = !!videoTrack;

  const content = (
    <View style={[styles.remoteTile, focused && styles.remoteTileFocused]}>
      {hasVideo && (
        <VideoView
          style={StyleSheet.absoluteFill}
          videoTrack={videoTrack}
          objectFit="cover"
        />
      )}
      {!hasVideo && (
        <View style={styles.remoteTileFallback}>
          <Text style={styles.remoteTileInitial} allowFontScaling={false}>
            {initial}
          </Text>
        </View>
      )}
      <View style={styles.remoteTileNameBar}>
        <Text style={styles.remoteTileName} numberOfLines={1} allowFontScaling={false}>
          {participant.name ?? participant.identity}
        </Text>
        {!participant.isMicrophoneEnabled && (
          <Ionicons name="mic-off" size={11} color="#FFFFFF" />
        )}
      </View>
      {/* Tap hint on focused tile */}
      {focused && onPress && (
        <View style={styles.remoteTileTapHint} pointerEvents="none">
          <Ionicons name="expand-outline" size={14} color="rgba(255,255,255,0.5)" />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.remoteTile, focused && styles.remoteTileFocused]}
        onPress={onPress}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${participant.name ?? participant.identity} video`}
      >
        {hasVideo && (
          <VideoView
            style={StyleSheet.absoluteFill}
            videoTrack={videoTrack}
            objectFit="cover"
          />
        )}
        {!hasVideo && (
          <View style={styles.remoteTileFallback}>
            <Text style={styles.remoteTileInitial} allowFontScaling={false}>
              {initial}
            </Text>
          </View>
        )}
        <View style={styles.remoteTileNameBar}>
          <Text style={styles.remoteTileName} numberOfLines={1} allowFontScaling={false}>
            {participant.name ?? participant.identity}
          </Text>
          {!participant.isMicrophoneEnabled && (
            <Ionicons name="mic-off" size={11} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return content;
}

// ─── Inner content — must live INSIDE <Room> so LiveKit hooks have context ────
interface RoomContentProps {
  bookingId: string;
  isProvider: boolean;
  onEnd: () => void;
  onLeave: () => void;
  roomRef: React.RefObject<RoomType | null>;
}

function RoomContent({ bookingId, isProvider, onEnd, onLeave, roomRef }: RoomContentProps) {
  const [isCameraOn,    setIsCameraOn]    = useState(true);
  const [isMicOn,       setIsMicOn]       = useState(true);
  const [isRecording,   setIsRecording]   = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [chatOpen,      setChatOpen]      = useState(false);
  const [gridOpen,      setGridOpen]      = useState(false);
  const [focusedId,     setFocusedId]     = useState<string | null>(null);
  const [connecting,    setConnecting]    = useState(true);

  // Safe-area insets for controls bar bottom padding (fixes issue 3)
  const insets = useSafeAreaInsets();

  // Convex mutations / actions
  const stopSessionMutation  = useMutation(api.bookings.stopSession);
  const updateStreamStatus   = useMutation(api.livekit.updateStreamStatus);
  const startRecordingAction = useAction(api.livekitActions.startRecording);
  const stopRecordingAction  = useAction(api.livekitActions.stopRecording);

  // LiveKit hooks
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants   = useRemoteParticipants();
  const connectionState      = useConnectionState();

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) setConnecting(false);
  }, [connectionState]);

  // ── Toggle camera (with rollback on error) ────────────────────────────────
  const handleToggleCamera = useCallback(async () => {
    const next = !isCameraOn;
    setIsCameraOn(next); // optimistic
    try {
      await localParticipant?.setCameraEnabled(next);
    } catch {
      setIsCameraOn(!next); // rollback
    }
  }, [localParticipant, isCameraOn]);

  // ── Toggle mic (with rollback on error) ──────────────────────────────────
  const handleToggleMic = useCallback(async () => {
    const next = !isMicOn;
    setIsMicOn(next); // optimistic
    try {
      await localParticipant?.setMicrophoneEnabled(next);
    } catch {
      setIsMicOn(!next); // rollback
    }
  }, [localParticipant, isMicOn]);

  // ── Toggle record (provider only) ─────────────────────────────────────────
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

  // ── End session (provider only — ends for everyone) ───────────────────────
  const handleEndSession = useCallback(() => {
    const doEnd = async () => {
      try {
        if (isRecording) {
          await stopRecordingAction({ bookingId: bookingId as any });
        }
        await stopSessionMutation({ bookingId: bookingId as any });
        await updateStreamStatus({ bookingId: bookingId as any, status: "ENDED" });
      } catch { /* best-effort */ } finally {
        roomRef.current?.disconnect();
        onEnd();
      }
    };
    Alert.alert(
      "End Session",
      "This will end the session for everyone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "End Session", style: "destructive", onPress: doEnd },
      ]
    );
  }, [isRecording, bookingId, stopRecordingAction, stopSessionMutation, updateStreamStatus, onEnd, roomRef]);

  // ── Leave session (client — disconnects but can rejoin) ───────────────────
  const handleLeave = useCallback(() => {
    Alert.alert(
      "Leave Session",
      "You can rejoin while the session is still active.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          onPress: () => {
            roomRef.current?.disconnect();
            onLeave(); // returns to join screen
          },
        },
      ]
    );
  }, [roomRef, onLeave]);

  // ── Hold (provider — leaves temporarily, session stays active) ───────────
  const handleHold = useCallback(() => {
    Alert.alert(
      "Put Session on Hold",
      "The session stays active. You can rejoin from the booking screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Go on Hold",
          onPress: () => {
            roomRef.current?.disconnect();
            onLeave(); // returns to join screen without ending session
          },
        },
      ]
    );
  }, [roomRef, onLeave]);

  // Build participant info list for the grid
  const allParticipants: ParticipantInfo[] = [
    ...(localParticipant ? [{
      identity: localParticipant.identity,
      name: localParticipant.name ?? localParticipant.identity,
      isCameraEnabled: isCameraOn,
      isMicrophoneEnabled: isMicOn,
      isSpeaking: localParticipant.isSpeaking ?? false,
      isLocal: true,
    }] : []),
    ...remoteParticipants.map(p => ({
      identity: p.identity,
      name: p.name ?? p.identity,
      isCameraEnabled: p.isCameraEnabled ?? false,
      isMicrophoneEnabled: p.isMicrophoneEnabled ?? false,
      isSpeaking: p.isSpeaking ?? false,
      isLocal: false,
    })),
  ];

  const focusedParticipant = focusedId
    ? remoteParticipants.find(p => p.identity === focusedId) ?? null
    : remoteParticipants[0] ?? null;

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* Connecting overlay */}
      {connecting && (
        <View style={styles.connectingOverlay}>
          <Text style={styles.connectingText} allowFontScaling={false}>
            Connecting to session…
          </Text>
        </View>
      )}

      {/* ── Main video area ────────────────────────────────────────── */}
      <View style={styles.videoArea}>
        {focusedParticipant ? (
          // Tapping the focused tile cycles through remotes (fix for issue 2)
          <RemoteTile
            participant={focusedParticipant}
            focused
            onPress={() => {
              if (remoteParticipants.length > 1) {
                const currentIdx = remoteParticipants.findIndex(
                  p => p.identity === focusedParticipant.identity
                );
                const nextIdx = (currentIdx + 1) % remoteParticipants.length;
                setFocusedId(remoteParticipants[nextIdx].identity);
              }
            }}
          />
        ) : (
          <View style={styles.waitingWrap}>
            <Ionicons name="person-circle-outline" size={72} color={Colors.iconDisabled} />
            <Text style={styles.waitingText} allowFontScaling={false}>
              Waiting for others to join…
            </Text>
          </View>
        )}

        {/* Secondary remote tiles (small strip when > 1) */}
        {remoteParticipants.length > 1 && (
          <FlatList
            data={remoteParticipants.filter(p => p.identity !== focusedParticipant?.identity)}
            keyExtractor={p => p.identity}
            horizontal
            style={styles.secondaryList}
            contentContainerStyle={styles.secondaryListContent}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setFocusedId(item.identity)}
                style={styles.secondaryTileWrap}
                accessibilityRole="button"
                accessibilityLabel={`Focus on ${item.name ?? item.identity}`}
              >
                <RemoteTile participant={item} focused={false} />
              </TouchableOpacity>
            )}
          />
        )}

        {/* Local PiP */}
        <View style={styles.localPip} pointerEvents="none">
          {isCameraOn && localParticipant ? (
            <VideoView
              style={StyleSheet.absoluteFill}
              videoTrack={
                localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack ?? undefined
              }
              objectFit="cover"
              mirror
            />
          ) : (
            <View style={styles.localPipFallback}>
              <Ionicons name="person" size={22} color={Colors.iconDisabled} />
            </View>
          )}
          {!isMicOn && (
            <View style={styles.localMicOff}>
              <Ionicons name="mic-off" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>
      </View>

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <SafeAreaView style={styles.topBarSafe}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={isProvider ? handleHold : handleLeave}
            style={styles.topBackBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={isProvider ? "Put on hold" : "Leave session"}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <LiveDot />
            <Text style={styles.topLiveLabel} allowFontScaling={false}>LIVE</Text>
            <View style={styles.topDivider} />
            <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.topParticipantCount} allowFontScaling={false}>
              {allParticipants.length}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => setGridOpen(true)}
            style={styles.topGridBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="View all participants"
          >
            <Ionicons name="grid-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Right engagement strip ─────────────────────────────────── */}
      <EngagementStrip
        bookingId={bookingId}
        onChatToggle={() => setChatOpen(v => !v)}
        chatOpen={chatOpen}
      />

      {/* ── Chat panel ──────────────────────────────────────────────── */}
      <LiveStreamChat
        bookingId={bookingId}
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      {/* ── Controls bar — safe-area aware (fixes issue 3) ──────────── */}
      <View style={[styles.controlsWrap, { paddingBottom: insets.bottom }]}>
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
          onEndCall={isProvider ? handleEndSession : handleLeave}
          onHold={isProvider ? handleHold : undefined}
        />
      </View>

      {/* ── Participant grid modal ───────────────────────────────────── */}
      <ParticipantGrid
        visible={gridOpen}
        participants={allParticipants}
        onFocus={(id) => setFocusedId(id)}
        onClose={() => setGridOpen(false)}
      />
    </View>
  );
}

// ─── Outer wrapper — sets up <LiveKitRoom> context, then renders RoomContent inside ─
export function LiveStreamRoom({
  token,
  wsUrl,
  roomName,
  bookingId,
  isProvider,
  onEnd,
  onLeave,
}: LiveStreamRoomProps) {
  const roomRef = useRef<RoomType | null>(null);

  // Create the Room instance once (stable across re-renders).
  // adaptiveStream: false avoids the ElementInfo visibility requirement.
  if (!roomRef.current) {
    const { Room: LKRoom } = require("livekit-client");
    roomRef.current = new LKRoom({ adaptiveStream: false, dynacast: false });
  }

  return (
    <Room
      room={roomRef.current ?? undefined}
      serverUrl={wsUrl}
      token={token}
      connect
      audio
      video
      // Only auto-navigate on unexpected disconnect if the session was ended server-side.
      // Clients who voluntarily leave use handleLeave which calls onLeave() before disconnect.
      // This prevents network blips from sending the client to the ended screen.
      onDisconnected={() => {
        // No-op — navigation is handled explicitly by handleEndSession / handleLeave / handleHold
      }}
    >
      <RoomContent
        bookingId={bookingId}
        isProvider={isProvider}
        onEnd={onEnd}
        onLeave={onLeave}
        roomRef={roomRef}
      />
    </Room>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000000",
  },

  // Connecting overlay
  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  connectingText: {
    ...typeScale.headingMD,
    color: Colors.textSecondary,
  },

  // Video area
  videoArea: {
    flex: 1,
    position: "relative",
  },
  waitingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space3,
  },
  waitingText: {
    ...typeScale.bodyMD,
    color: Colors.textDisabled,
  },

  // Remote tiles
  remoteTile: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    position: "relative",
  },
  remoteTileFocused: {},
  remoteTileFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },
  remoteTileInitial: {
    fontSize: 56,
    fontWeight: "700",
    color: Colors.iconDisabled,
  },
  remoteTileNameBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: spacing.space3,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  remoteTileName: {
    ...typeScale.labelSM,
    color: "#FFFFFF",
    flex: 1,
  },
  remoteTileTapHint: {
    position: "absolute",
    top: spacing.space2,
    right: spacing.space2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Secondary strip
  secondaryList: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 90, // leave room for PiP
    height: 100,
  },
  secondaryListContent: {
    paddingHorizontal: spacing.space2,
    gap: spacing.space2,
    paddingBottom: spacing.space2,
    paddingTop: spacing.space2,
  },
  secondaryTileWrap: {
    width: 80,
    height: 100,
    borderRadius: radius.radiusSM,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },

  // Local PiP
  localPip: {
    position: "absolute",
    bottom: spacing.space3,
    right: spacing.space3,
    width: 80,
    height: 110,
    borderRadius: radius.radiusMD,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: Colors.bgElevated,
  },
  localPipFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },
  localMicOff: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Top bar
  topBarSafe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  topCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.statusDanger,
  },
  topLiveLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1.2,
  },
  topDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  topParticipantCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  topGridBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Engagement strip
  engagementStrip: {
    position: "absolute",
    right: spacing.space3,
    bottom: 100,
    gap: spacing.space3,
    alignItems: "center",
    zIndex: 15,
  },
  engBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  engBtnActive: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.borderFilled,
  },

  // Controls wrap
  controlsWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
});
