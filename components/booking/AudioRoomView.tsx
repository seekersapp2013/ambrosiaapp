/**
 * AudioRoomView
 * Full-screen audio-only room powered by @livekit/react-native.
 * Used for AUDIO_ONLY events — no video, podcast-style layout.
 *
 * Layout:
 *   ┌─────────────────────────────────┐
 *   │  Top bar (title + leave)        │
 *   ├─────────────────────────────────┤
 *   │  STAGE — speaker avatar grid    │  ~50%
 *   ├─────────────────────────────────┤
 *   │  AUDIENCE — listener chips      │  ~30%
 *   ├─────────────────────────────────┤
 *   │  Controls bar                   │
 *   └─────────────────────────────────┘
 *   Hand-raise side panel (host only, slides in from right)
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  SafeAreaView,
  ScrollView,
  FlatList,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  LiveKitRoom as Room,
  useConnectionState,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/react-native";
import {
  ConnectionState,
  type Room as RoomType,
} from "livekit-client";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AudioRoomViewProps {
  token: string;
  wsUrl: string;
  roomName: string;
  bookingId: string;
  eventId: string;
  isHost: boolean;
  role: string; // "HOST" | "SPEAKER" | "LISTENER"
  onLeave: () => void;
}

// ─── Speaking ring animation ──────────────────────────────────────────────────
function SpeakingRing({ active }: { active: boolean }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      const anim = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale,   { toValue: 1.18, duration: 600, useNativeDriver: true }),
            Animated.timing(scale,   { toValue: 1,    duration: 600, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.9,  duration: 300, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,    duration: 900, useNativeDriver: true }),
          ]),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      scale.setValue(1);
      opacity.setValue(0);
    }
  }, [active, scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.speakingRing,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ─── Speaker card (stage) ─────────────────────────────────────────────────────
function SpeakerCard({
  name,
  identity,
  isSpeaking,
  isMuted,
  isLocal,
  isHost,
  onDemote,
}: {
  name: string;
  identity: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
  isHost: boolean;
  onDemote?: () => void;
}) {
  const initial = name.charAt(0).toUpperCase();

  return (
    <View style={styles.speakerCard}>
      {/* Speaking ring */}
      <SpeakingRing active={isSpeaking && !isMuted} />

      {/* Avatar */}
      <View style={[styles.speakerAvatar, isSpeaking && !isMuted && styles.speakerAvatarActive]}>
        <Text style={styles.speakerInitial} allowFontScaling={false}>
          {initial}
        </Text>
      </View>

      {/* Mic icon */}
      <View style={[styles.speakerMicBadge, isMuted && styles.speakerMicBadgeMuted]}>
        <Ionicons
          name={isMuted ? "mic-off" : "mic"}
          size={11}
          color={isMuted ? Colors.statusDanger : "#FFFFFF"}
        />
      </View>

      {/* Name */}
      <Text style={styles.speakerName} numberOfLines={1} allowFontScaling={false}>
        {name}{isLocal ? " (You)" : ""}
      </Text>

      {/* Host demote button */}
      {isHost && !isLocal && onDemote && (
        <TouchableOpacity
          style={styles.demoteBtn}
          onPress={onDemote}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel={`Demote ${name} to listener`}
        >
          <Ionicons name="arrow-down-circle-outline" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Listener chip (audience) ─────────────────────────────────────────────────
function ListenerChip({ name, handRaised }: { name: string; handRaised: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <View style={[styles.listenerChip, handRaised && styles.listenerChipHandRaised]}>
      <View style={styles.listenerAvatar}>
        <Text style={styles.listenerInitial} allowFontScaling={false}>{initial}</Text>
      </View>
      <Text style={styles.listenerName} numberOfLines={1} allowFontScaling={false}>
        {name}
      </Text>
      {handRaised && (
        <Ionicons name="hand-left" size={12} color={Colors.statusWarning} />
      )}
    </View>
  );
}

// ─── Hand raise panel ─────────────────────────────────────────────────────────
function HandRaisePanel({
  visible,
  raisedHands,
  onPromote,
  onClose,
}: {
  visible: boolean;
  raisedHands: { identity: string; name: string }[];
  onPromote: (identity: string) => void;
  onClose: () => void;
}) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : 300,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [visible, slideAnim]);

  if (!visible && slideAnim._value === 300) return null;

  return (
    <Animated.View
      style={[styles.handPanel, { transform: [{ translateX: slideAnim }] }]}
    >
      <View style={styles.handPanelHeader}>
        <View style={styles.handPanelTitle}>
          <Ionicons name="hand-left" size={16} color={Colors.statusWarning} />
          <Text style={styles.handPanelTitleText} allowFontScaling={false}>
            Raised Hands ({raisedHands.length})
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close hand raise panel"
        >
          <Ionicons name="close" size={20} color={Colors.iconSecondary} />
        </TouchableOpacity>
      </View>

      {raisedHands.length === 0 ? (
        <View style={styles.handPanelEmpty}>
          <Text style={styles.handPanelEmptyText} allowFontScaling={false}>
            No raised hands
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {raisedHands.map((p) => (
            <View key={p.identity} style={styles.handPanelRow}>
              <View style={styles.handPanelAvatar}>
                <Text style={styles.handPanelAvatarText} allowFontScaling={false}>
                  {p.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.handPanelName} numberOfLines={1} allowFontScaling={false}>
                {p.name}
              </Text>
              <TouchableOpacity
                style={styles.promoteBtn}
                onPress={() => onPromote(p.identity)}
                accessibilityRole="button"
                accessibilityLabel={`Promote ${p.name} to speaker`}
              >
                <Ionicons name="mic-outline" size={13} color="#FFFFFF" />
                <Text style={styles.promoteBtnText} allowFontScaling={false}>
                  Promote
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

// ─── Inner content — must live INSIDE <Room> so LiveKit hooks have context ────
interface AudioRoomContentProps {
  bookingId: string;
  eventId: string;
  isHost: boolean;
  role: string;
  onLeave: () => void;
  roomRef: React.RefObject<RoomType | null>;
}

function AudioRoomContent({
  bookingId,
  eventId,
  isHost,
  role,
  onLeave,
  roomRef,
}: AudioRoomContentProps) {
  const [isMuted,       setIsMuted]       = useState(role === "LISTENER");
  const [handRaised,    setHandRaised]    = useState(false);
  const [handPanelOpen, setHandPanelOpen] = useState(false);
  const [connecting,    setConnecting]    = useState(true);

  // Convex mutations
  const raiseHandMutation = useMutation(api.events.raiseHand);
  const lowerHandMutation = useMutation(api.events.lowerHand);
  const promoteToSpeaker  = useMutation(api.events.promoteToSpeaker);
  const demoteToListener  = useMutation(api.events.demoteToListener);
  const updateMutedStatus = useMutation(api.events.updateMutedStatus);

  // LiveKit hooks — safe here because this component is rendered inside <LiveKitRoom>
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants   = useRemoteParticipants();
  const connectionState      = useConnectionState();

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) setConnecting(false);
  }, [connectionState]);

  // Parse participant metadata
  function getMeta(participant: any): { role: string; handRaised: boolean } {
    try {
      return JSON.parse(participant.metadata ?? "{}");
    } catch {
      return { role: "LISTENER", handRaised: false };
    }
  }

  // Classify participants
  const speakers = remoteParticipants.filter(
    (p) => getMeta(p).role === "SPEAKER" || getMeta(p).role === "HOST"
  );
  const listeners = remoteParticipants.filter(
    (p) => getMeta(p).role === "LISTENER"
  );
  const raisedHands = remoteParticipants
    .filter((p) => getMeta(p).handRaised)
    .map((p) => ({ identity: p.identity, name: p.name ?? p.identity }));

  const localIsSpeaker = role === "HOST" || role === "SPEAKER";

  // ── Toggle mute ──────────────────────────────────────────────────────────
  const handleToggleMic = useCallback(async () => {
    if (!localParticipant || !localIsSpeaker) return;
    const newMuted = !isMuted;
    try {
      await localParticipant.setMicrophoneEnabled(!newMuted);
      setIsMuted(newMuted);
      if (eventId) {
        await updateMutedStatus({ eventId: eventId as any, isMuted: newMuted });
      }
    } catch { /* ignore */ }
  }, [localParticipant, localIsSpeaker, isMuted, eventId, updateMutedStatus]);

  // ── Raise / lower hand ────────────────────────────────────────────────────
  const handleHandRaise = useCallback(async () => {
    try {
      if (handRaised) {
        await lowerHandMutation({ bookingId: bookingId as any });
        setHandRaised(false);
      } else {
        await raiseHandMutation({ bookingId: bookingId as any });
        setHandRaised(true);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not update hand raise.");
    }
  }, [handRaised, bookingId, raiseHandMutation, lowerHandMutation]);

  // ── Promote to speaker ────────────────────────────────────────────────────
  const handlePromote = useCallback(async (targetIdentity: string) => {
    if (!eventId) return;
    try {
      await promoteToSpeaker({
        eventId: eventId as any,
        targetUserId: targetIdentity as any,
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not promote participant.");
    }
  }, [eventId, promoteToSpeaker]);

  // ── Demote to listener ────────────────────────────────────────────────────
  const handleDemote = useCallback(async (targetIdentity: string) => {
    if (!eventId) return;
    Alert.alert(
      "Demote Speaker",
      "Move this speaker back to the audience?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Demote",
          style: "destructive",
          onPress: async () => {
            try {
              await demoteToListener({
                eventId: eventId as any,
                targetUserId: targetIdentity as any,
              });
            } catch (err: any) {
              Alert.alert("Error", err?.message ?? "Could not demote participant.");
            }
          },
        },
      ]
    );
  }, [eventId, demoteToListener]);

  // ── Leave ─────────────────────────────────────────────────────────────────
  const handleLeave = useCallback(() => {
    roomRef.current?.disconnect();
    onLeave();
  }, [onLeave, roomRef]);

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      {/* Background gradient layers */}
      <View style={styles.bgLayer1} pointerEvents="none" />
      <View style={styles.bgLayer2} pointerEvents="none" />
      <View style={styles.bgLayer3} pointerEvents="none" />

      {/* Connecting overlay */}
      {connecting && (
        <View style={styles.connectingOverlay}>
          <Ionicons name="mic-outline" size={48} color="rgba(255,255,255,0.4)" />
          <Text style={styles.connectingText} allowFontScaling={false}>
            Joining audio room…
          </Text>
        </View>
      )}

      <SafeAreaView style={styles.safeArea}>
        {/* ── Top bar ──────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText} allowFontScaling={false}>AUDIO</Text>
            </View>
          </View>
          <Text style={styles.topTitle} numberOfLines={1} allowFontScaling={false}>
            Audio Room
          </Text>
          <View style={styles.topRight}>
            <View style={styles.participantCount}>
              <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.participantCountText} allowFontScaling={false}>
                {remoteParticipants.length + 1}
              </Text>
            </View>
            {isHost && raisedHands.length > 0 && (
              <TouchableOpacity
                style={styles.handBtn}
                onPress={() => setHandPanelOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`${raisedHands.length} raised hands`}
              >
                <Ionicons name="hand-left" size={18} color={Colors.statusWarning} />
                <View style={styles.handBadge}>
                  <Text style={styles.handBadgeText} allowFontScaling={false}>
                    {raisedHands.length}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Stage — speakers ─────────────────────────────────────── */}
        <View style={styles.stageSection}>
          <Text style={styles.sectionLabel} allowFontScaling={false}>ON STAGE</Text>
          <View style={styles.speakerGrid}>
            {localIsSpeaker && localParticipant && (
              <SpeakerCard
                name={localParticipant.name ?? localParticipant.identity ?? "You"}
                identity={localParticipant.identity}
                isSpeaking={localParticipant.isSpeaking ?? false}
                isMuted={isMuted}
                isLocal
                isHost={isHost}
              />
            )}
            {speakers.map((p) => (
              <SpeakerCard
                key={p.identity}
                name={p.name ?? p.identity}
                identity={p.identity}
                isSpeaking={p.isSpeaking ?? false}
                isMuted={!(p.isMicrophoneEnabled ?? true)}
                isLocal={false}
                isHost={isHost}
                onDemote={isHost ? () => handleDemote(p.identity) : undefined}
              />
            ))}
            {!localIsSpeaker && speakers.length === 0 && (
              <View style={styles.emptyStage}>
                <Ionicons name="mic-outline" size={32} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyStageText} allowFontScaling={false}>
                  No speakers yet
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Divider */}
        <View style={styles.stageDivider} />

        {/* ── Audience — listeners ──────────────────────────────────── */}
        <View style={styles.audienceSection}>
          <Text style={styles.sectionLabel} allowFontScaling={false}>
            AUDIENCE ({listeners.length + (!localIsSpeaker ? 1 : 0)})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.audienceScroll}
          >
            {!localIsSpeaker && localParticipant && (
              <ListenerChip
                name={(localParticipant.name ?? localParticipant.identity ?? "You") + " (You)"}
                handRaised={handRaised}
              />
            )}
            {listeners.map((p) => (
              <ListenerChip
                key={p.identity}
                name={p.name ?? p.identity}
                handRaised={getMeta(p).handRaised}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Controls bar ─────────────────────────────────────────── */}
        <View style={styles.controlsBar}>
          {localIsSpeaker ? (
            <>
              <TouchableOpacity
                style={[styles.ctrlBtn, isMuted && styles.ctrlBtnMuted]}
                onPress={handleToggleMic}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? "Unmute microphone" : "Mute microphone"}
              >
                <Ionicons
                  name={isMuted ? "mic-off-outline" : "mic-outline"}
                  size={22}
                  color={isMuted ? Colors.statusDanger : "#FFFFFF"}
                />
                <Text style={[styles.ctrlLabel, isMuted && styles.ctrlLabelMuted]} allowFontScaling={false}>
                  {isMuted ? "Unmute" : "Mute"}
                </Text>
              </TouchableOpacity>

              {isHost && (
                <TouchableOpacity
                  style={[styles.ctrlBtn, raisedHands.length > 0 && styles.ctrlBtnActive]}
                  onPress={() => setHandPanelOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Raised hands: ${raisedHands.length}`}
                >
                  <Ionicons name="hand-left-outline" size={22} color={raisedHands.length > 0 ? Colors.statusWarning : "#FFFFFF"} />
                  {raisedHands.length > 0 && (
                    <View style={styles.ctrlBadge}>
                      <Text style={styles.ctrlBadgeText} allowFontScaling={false}>
                        {raisedHands.length}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.ctrlLabel} allowFontScaling={false}>Hands</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlBtnLeave]}
                onPress={handleLeave}
                accessibilityRole="button"
                accessibilityLabel="Leave audio room"
              >
                <Ionicons name="call-outline" size={22} color="#FFFFFF" />
                <Text style={styles.ctrlLabel} allowFontScaling={false}>Leave</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.ctrlBtn, handRaised && styles.ctrlBtnHandRaised]}
                onPress={handleHandRaise}
                accessibilityRole="button"
                accessibilityLabel={handRaised ? "Lower hand" : "Raise hand to speak"}
              >
                <Ionicons
                  name={handRaised ? "hand-left" : "hand-left-outline"}
                  size={22}
                  color={handRaised ? Colors.statusWarning : "#FFFFFF"}
                />
                <Text style={[styles.ctrlLabel, handRaised && { color: Colors.statusWarning }]} allowFontScaling={false}>
                  {handRaised ? "Lower Hand" : "Raise Hand"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctrlBtn, styles.ctrlBtnLeave]}
                onPress={handleLeave}
                accessibilityRole="button"
                accessibilityLabel="Leave audio room"
              >
                <Ionicons name="call-outline" size={22} color="#FFFFFF" />
                <Text style={styles.ctrlLabel} allowFontScaling={false}>Leave</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* ── Hand raise panel ─────────────────────────────────────── */}
      {isHost && (
        <HandRaisePanel
          visible={handPanelOpen}
          raisedHands={raisedHands}
          onPromote={handlePromote}
          onClose={() => setHandPanelOpen(false)}
        />
      )}
    </View>
  );
}

// ─── Outer wrapper — sets up <LiveKitRoom> context, then renders AudioRoomContent ────
export function AudioRoomView({
  token,
  wsUrl,
  roomName,
  bookingId,
  eventId,
  isHost,
  role,
  onLeave,
}: AudioRoomViewProps) {
  const roomRef = useRef<RoomType | null>(null);

  // Create the Room instance once. adaptiveStream: false avoids ElementInfo requirement.
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
      onDisconnected={onLeave}
    >
      <AudioRoomContent
        bookingId={bookingId}
        eventId={eventId}
        isHost={isHost}
        role={role}
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
    backgroundColor: "#0D0820",
    position: "relative",
  },

  // Background gradient layers (simulate purple → dark gradient)
  bgLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1A0A35",
    opacity: 1,
  },
  bgLayer2: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "#2D1060",
    opacity: 0.45,
  },
  bgLayer3: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    backgroundColor: "#080515",
    opacity: 0.7,
  },

  // Connecting
  connectingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space3,
    zIndex: 50,
    backgroundColor: "rgba(10,5,25,0.80)",
  },
  connectingText: {
    ...typeScale.headingSM,
    color: "rgba(255,255,255,0.7)",
  },

  safeArea: {
    flex: 1,
    zIndex: 10,
  },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    width: 80,
  },
  topTitle: {
    ...typeScale.headingSM,
    color: "#FFFFFF",
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    width: 80,
    justifyContent: "flex-end",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(139,92,246,0.25)",
    borderRadius: radius.radiusFull,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.50)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.palette.purple,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.palette.purple,
    letterSpacing: 0.8,
  },
  participantCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  participantCountText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  handBtn: {
    position: "relative",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(245,158,11,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  handBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.statusWarning,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  handBadgeText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#000",
  },

  // Section labels
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1.2,
    marginBottom: spacing.space3,
    paddingHorizontal: spacing.space4,
  },

  // Stage
  stageSection: {
    flex: 1,
    paddingTop: spacing.space5,
  },
  speakerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: spacing.space4,
    gap: spacing.space4,
  },
  emptyStage: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    paddingVertical: spacing.space8,
    width: "100%",
  },
  emptyStageText: {
    ...typeScale.bodySM,
    color: "rgba(255,255,255,0.25)",
  },

  // Speaker card
  speakerCard: {
    alignItems: "center",
    gap: 6,
    width: 80,
    position: "relative",
  },
  speakerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(139,92,246,0.25)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(139,92,246,0.30)",
  },
  speakerAvatarActive: {
    borderColor: Colors.palette.purple,
    backgroundColor: "rgba(139,92,246,0.35)",
  },
  speakerInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.palette.purple,
  },
  speakingRing: {
    position: "absolute",
    top: -4,
    left: "50%",
    marginLeft: -36,
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: Colors.palette.purple,
  },
  speakerMicBadge: {
    position: "absolute",
    bottom: 28,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.70)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  speakerMicBadgeMuted: {
    backgroundColor: Colors.statusDangerBg,
    borderColor: Colors.statusDanger,
  },
  speakerName: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    width: 72,
  },
  demoteBtn: {
    marginTop: 2,
  },

  // Stage divider
  stageDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginHorizontal: spacing.space4,
    marginVertical: spacing.space3,
  },

  // Audience
  audienceSection: {
    paddingBottom: spacing.space4,
    maxHeight: 120,
  },
  audienceScroll: {
    paddingHorizontal: spacing.space4,
    gap: spacing.space2,
  },
  listenerChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radius.radiusFull,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  listenerChipHandRaised: {
    backgroundColor: "rgba(245,158,11,0.10)",
    borderColor: "rgba(245,158,11,0.30)",
  },
  listenerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  listenerInitial: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  listenerName: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "500",
    maxWidth: 80,
  },

  // Controls bar
  controlsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space6,
    paddingVertical: spacing.space4,
    paddingHorizontal: spacing.space6,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  ctrlBtn: {
    alignItems: "center",
    gap: 5,
    minWidth: 60,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    borderRadius: radius.radiusMD,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    position: "relative",
  },
  ctrlBtnMuted: {
    backgroundColor: Colors.statusDangerBg,
    borderColor: Colors.statusDanger,
  },
  ctrlBtnHandRaised: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.40)",
  },
  ctrlBtnActive: {
    backgroundColor: "rgba(245,158,11,0.12)",
    borderColor: "rgba(245,158,11,0.35)",
  },
  ctrlBtnLeave: {
    backgroundColor: Colors.statusDanger,
    borderColor: Colors.statusDanger,
  },
  ctrlLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  ctrlLabelMuted: {
    color: Colors.statusDanger,
  },
  ctrlBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.statusWarning,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  ctrlBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#000",
  },

  // Hand raise panel
  handPanel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 240,
    backgroundColor: "rgba(20,10,40,0.97)",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.08)",
    zIndex: 30,
    paddingTop: spacing.space10,
  },
  handPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    marginBottom: spacing.space3,
  },
  handPanelTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  handPanelTitleText: {
    ...typeScale.headingSM,
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  handPanelEmpty: {
    alignItems: "center",
    paddingVertical: spacing.space6,
  },
  handPanelEmptyText: {
    ...typeScale.caption,
    color: "rgba(255,255,255,0.35)",
  },
  handPanelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  handPanelAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.20)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  handPanelAvatarText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.palette.purple,
  },
  handPanelName: {
    ...typeScale.bodySM,
    color: "rgba(255,255,255,0.80)",
    flex: 1,
    fontSize: 12,
  },
  promoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.palette.purple,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexShrink: 0,
  },
  promoteBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
