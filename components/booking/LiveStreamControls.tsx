/**
 * LiveStreamControls
 * Bottom control bar for a live video session.
 * Rendered inside LiveStreamRoom — all state is owned there and passed as props.
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LiveStreamControlsProps {
  isProvider: boolean;
  isCameraOn: boolean;
  isMicOn: boolean;
  isRecording: boolean;
  isLoadingRecord: boolean;
  participantCount: number;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleGrid: () => void;
  onToggleRecord: () => void;
  onEndCall: () => void;
  /** Provider-only: leave temporarily without ending the session */
  onHold?: () => void;
}

// ─── Icon button helper ───────────────────────────────────────────────────────
function ControlBtn({
  icon,
  label,
  onPress,
  active = true,
  danger = false,
  disabled = false,
  badge,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  badge?: string;
  accessibilityLabel: string;
}) {
  const bg = danger
    ? Colors.statusDanger
    : active
    ? Colors.bgElevated
    : "rgba(255,255,255,0.12)";

  const iconColor = danger ? "#FFFFFF" : active ? Colors.iconPrimary : Colors.iconDisabled;

  return (
    <TouchableOpacity
      style={styles.ctrlWrap}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
    >
      <View style={[styles.ctrlBtn, { backgroundColor: bg }, disabled && styles.ctrlBtnDisabled]}>
        <Ionicons name={icon} size={22} color={iconColor} />
        {badge && (
          <View style={styles.ctrlBadge}>
            <Text style={styles.ctrlBadgeText} allowFontScaling={false}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.ctrlLabel, !active && styles.ctrlLabelDim]} allowFontScaling={false}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Recording indicator ──────────────────────────────────────────────────────
function RecordingBtn({
  isRecording,
  isLoading,
  onPress,
}: {
  isRecording: boolean;
  isLoading: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [isRecording, pulse]);

  return (
    <TouchableOpacity
      style={styles.ctrlWrap}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
    >
      <View style={[styles.ctrlBtn, isRecording && styles.ctrlBtnRecording]}>
        <Animated.View style={isRecording ? { opacity: pulse } : undefined}>
          <Ionicons
            name={isRecording ? "radio-button-on" : "radio-button-off"}
            size={22}
            color={isRecording ? Colors.statusDanger : Colors.iconPrimary}
          />
        </Animated.View>
      </View>
      <Text style={styles.ctrlLabel} allowFontScaling={false}>
        {isLoading ? "Wait…" : isRecording ? "Stop Rec" : "Record"}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LiveStreamControls({
  isProvider,
  isCameraOn,
  isMicOn,
  isRecording,
  isLoadingRecord,
  participantCount,
  onToggleCamera,
  onToggleMic,
  onToggleGrid,
  onToggleRecord,
  onEndCall,
  onHold,
}: LiveStreamControlsProps) {
  return (
    <View style={styles.bar}>
      {/* Mic */}
      <ControlBtn
        icon={isMicOn ? "mic-outline" : "mic-off-outline"}
        label={isMicOn ? "Mute" : "Unmute"}
        onPress={onToggleMic}
        active={isMicOn}
        accessibilityLabel={isMicOn ? "Mute microphone" : "Unmute microphone"}
      />

      {/* Camera */}
      <ControlBtn
        icon={isCameraOn ? "videocam-outline" : "videocam-off-outline"}
        label={isCameraOn ? "Camera" : "Cam Off"}
        onPress={onToggleCamera}
        active={isCameraOn}
        accessibilityLabel={isCameraOn ? "Turn off camera" : "Turn on camera"}
      />

      {/* Participants / Grid */}
      <ControlBtn
        icon="people-outline"
        label="People"
        onPress={onToggleGrid}
        badge={participantCount > 0 ? String(participantCount) : undefined}
        accessibilityLabel={`View participants. ${participantCount} in call`}
      />

      {/* Record — provider only */}
      {isProvider && (
        <RecordingBtn
          isRecording={isRecording}
          isLoading={isLoadingRecord}
          onPress={onToggleRecord}
        />
      )}

      {/* Hold — provider only: leave temporarily without ending session */}
      {isProvider && onHold && (
        <ControlBtn
          icon="pause-circle-outline"
          label="Hold"
          onPress={onHold}
          accessibilityLabel="Put session on hold and rejoin later"
        />
      )}

      {/* End call (provider) / Leave (client) */}
      <ControlBtn
        icon="call-outline"
        label={isProvider ? "End" : "Leave"}
        onPress={onEndCall}
        danger
        accessibilityLabel={isProvider ? "End session for everyone" : "Leave session"}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    backgroundColor: "rgba(0,0,0,0.85)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  ctrlWrap: {
    alignItems: "center",
    gap: 5,
    minWidth: 52,
  },
  ctrlBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    position: "relative",
  },
  ctrlBtnDisabled: {
    opacity: 0.4,
  },
  ctrlBtnRecording: {
    backgroundColor: Colors.statusDangerBg,
    borderColor: Colors.statusDanger,
  },
  ctrlBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  ctrlBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctrlLabel: {
    ...typeScale.caption,
    fontSize: 10,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  ctrlLabelDim: {
    color: Colors.textDisabled,
  },
});
