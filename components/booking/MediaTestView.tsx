/**
 * MediaTestView
 * Pre-call device test screen — lets the user verify camera and microphone
 * are working before joining a live session (like Zoom/Google Meet pre-call check).
 *
 * Shows:
 *   • Camera preview (full area, mirrored for front camera)
 *   • Audio level meter (animated bar)
 *   • Camera / Mic status indicators
 *   • Switch camera button
 *   • "Looks Good — Join" and "Go Back" actions
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView } from "@livekit/react-native";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { useMediaDeviceTest } from "@/hooks/useMediaDeviceTest";

// ─── Types ────────────────────────────────────────────────────────────────────
interface MediaTestViewProps {
  /** Whether this is an audio-only session (no video preview) */
  audioOnly?: boolean;
  /** Called when user is satisfied and wants to join */
  onJoin: () => void;
  /** Called when user wants to go back to join screen */
  onBack: () => void;
}

// ─── Audio Level Meter ────────────────────────────────────────────────────────
function AudioLevelMeter({ level }: { level: number }) {
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: level,
      duration: 80,
      useNativeDriver: false,
    }).start();
  }, [level, barWidth]);

  return (
    <View style={meterStyles.container}>
      <View style={meterStyles.track}>
        <Animated.View
          style={[
            meterStyles.fill,
            {
              width: barWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
      {/* Level dots for visual flair */}
      <View style={meterStyles.dotsRow}>
        {Array.from({ length: 10 }).map((_, i) => (
          <View
            key={i}
            style={[
              meterStyles.dot,
              level > (i + 1) / 10 && meterStyles.dotActive,
              level > (i + 1) / 10 && i > 6 && meterStyles.dotHigh,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const meterStyles = StyleSheet.create({
  container: {
    gap: spacing.space2,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: Colors.statusSuccess,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dotActive: {
    backgroundColor: Colors.statusSuccess,
  },
  dotHigh: {
    backgroundColor: Colors.statusWarning,
  },
});

// ─── Status Indicator ─────────────────────────────────────────────────────────
function StatusIndicator({
  label,
  working,
  icon,
}: {
  label: string;
  working: boolean;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={indicatorStyles.row}>
      <View
        style={[
          indicatorStyles.iconCircle,
          working ? indicatorStyles.iconCircleOk : indicatorStyles.iconCircleFail,
        ]}
      >
        <Ionicons name={icon} size={16} color={working ? Colors.statusSuccess : Colors.statusDanger} />
      </View>
      <Text style={indicatorStyles.label} allowFontScaling={false}>
        {label}
      </Text>
      <Ionicons
        name={working ? "checkmark-circle" : "close-circle"}
        size={18}
        color={working ? Colors.statusSuccess : Colors.statusDanger}
      />
    </View>
  );
}

const indicatorStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    paddingVertical: spacing.space2,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleOk: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  iconCircleFail: {
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  label: {
    ...typeScale.bodyMD,
    color: "#FFFFFF",
    flex: 1,
    fontWeight: "500",
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────
export function MediaTestView({ audioOnly = false, onJoin, onBack }: MediaTestViewProps) {
  const {
    videoTrack,
    audioLevel,
    isCameraWorking,
    isMicWorking,
    isLoading,
    error,
    switchCamera,
    isFrontCamera,
    cleanup,
  } = useMediaDeviceTest({ audioOnly });

  // Clean up tracks before joining (LiveKit will create its own)
  const handleJoin = () => {
    cleanup();
    onJoin();
  };

  const handleBack = () => {
    cleanup();
    onBack();
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.root}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
          <Text style={styles.loadingText} allowFontScaling={false}>
            Accessing your {audioOnly ? "microphone" : "camera and microphone"}…
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* ── Camera preview area ──────────────────────────────────────── */}
      {!audioOnly && (
        <View style={styles.previewArea}>
          {isCameraWorking && videoTrack ? (
            <View style={styles.videoContainer}>
              {Platform.OS === "web" ? (
                <WebVideoPreview track={videoTrack} mirror={isFrontCamera} />
              ) : (
                <VideoView
                  style={StyleSheet.absoluteFill as any}
                  videoTrack={videoTrack}
                  objectFit="cover"
                  mirror={isFrontCamera}
                />
              )}
              {/* Switch camera button overlay */}
              <SecondaryButton
                label={isFrontCamera ? "Back Camera" : "Front Camera"}
                onPress={switchCamera}
                icon={<Ionicons name="camera-reverse-outline" size={18} color={Colors.textPrimary} />}
                style={styles.switchBtn}
                accessibilityLabel="Switch camera"
              />
            </View>
          ) : (
            <View style={styles.noVideoWrap}>
              <Ionicons name="videocam-off-outline" size={48} color={Colors.statusDanger} />
              <Text style={styles.noVideoText} allowFontScaling={false}>
                {error ?? "Camera not available"}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── Audio-only hero ──────────────────────────────────────────── */}
      {audioOnly && (
        <View style={styles.audioHero}>
          <View style={styles.audioHeroIcon}>
            <Ionicons
              name={isMicWorking ? "mic" : "mic-off"}
              size={56}
              color={isMicWorking ? Colors.statusSuccess : Colors.statusDanger}
            />
          </View>
          <Text style={styles.audioHeroTitle} allowFontScaling={false}>
            Audio Device Test
          </Text>
          <Text style={styles.audioHeroSub} allowFontScaling={false}>
            Speak into your microphone to verify it's working.
          </Text>
        </View>
      )}

      {/* ── Status panel ────────────────────────────────────────────── */}
      <View style={styles.statusPanel}>
        <Text style={styles.panelTitle} allowFontScaling={false}>
          Device Check
        </Text>

        {!audioOnly && (
          <StatusIndicator
            label="Camera"
            working={isCameraWorking}
            icon="videocam-outline"
          />
        )}

        <StatusIndicator
          label="Microphone"
          working={isMicWorking}
          icon="mic-outline"
        />

        {/* Audio level meter */}
        <View style={styles.meterSection}>
          <Text style={styles.meterLabel} allowFontScaling={false}>
            Audio Level
          </Text>
          <AudioLevelMeter level={audioLevel} />
          <Text style={styles.meterHint} allowFontScaling={false}>
            {isMicWorking
              ? "Speak to see the meter move"
              : "Microphone not detected"}
          </Text>
        </View>

        {/* Error message */}
        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={16} color={Colors.statusDanger} />
            <Text style={styles.errorText} allowFontScaling={false}>{error}</Text>
          </View>
        )}

        {/* Permission denied guidance */}
        {error && !isCameraWorking && !isMicWorking && (
          <View style={styles.settingsGuidance}>
            <Text style={styles.settingsText} allowFontScaling={false}>
              If you denied permission, you can grant access in your device settings.
            </Text>
            <SecondaryButton
              label="Open Settings"
              onPress={() => {
                if (Platform.OS === "android") {
                  Linking.openSettings();
                } else if (Platform.OS === "ios") {
                  Linking.openURL("app-settings:");
                }
              }}
              icon={<Ionicons name="settings-outline" size={16} color={Colors.textPrimary} />}
              style={styles.settingsBtn}
              accessibilityLabel="Open device settings to grant permissions"
            />
          </View>
        )}
      </View>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <View style={styles.actionsWrap}>
        <PrimaryButton
          label="Looks Good — Join Session"
          onPress={handleJoin}
          disabled={!isMicWorking && !isCameraWorking}
          icon={<Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />}
          accessibilityLabel="Confirm device test and join session"
        />
        <SecondaryButton
          label="Go Back"
          onPress={handleBack}
          accessibilityLabel="Return to join screen"
          style={styles.backBtn}
        />
      </View>
    </View>
  );
}

// ─── Web-only video preview (uses <video> element) ────────────────────────────
function WebVideoPreview({ track, mirror }: { track: any; mirror: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !track) return;

    const stream = new MediaStream([track]);
    el.srcObject = stream;
    el.play().catch(() => {});

    return () => {
      el.srcObject = null;
    };
  }, [track]);

  return (
    // @ts-ignore — valid on web
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: mirror ? "scaleX(-1)" : "none",
      } as any}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space4,
  },
  loadingText: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Camera preview
  previewArea: {
    flex: 1,
    minHeight: 280,
    maxHeight: 360,
    borderRadius: radius.radiusMD,
    overflow: "hidden",
    margin: spacing.space4,
    backgroundColor: "#1A1A1A",
  },
  videoContainer: {
    flex: 1,
    position: "relative",
  },
  switchBtn: {
    position: "absolute",
    bottom: spacing.space3,
    right: spacing.space3,
  },
  noVideoWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space3,
  },
  noVideoText: {
    ...typeScale.bodySM,
    color: Colors.statusDanger,
    textAlign: "center",
    paddingHorizontal: spacing.space4,
  },

  // Audio-only hero
  audioHero: {
    alignItems: "center",
    paddingVertical: spacing.space8,
    paddingHorizontal: spacing.space4,
    gap: spacing.space3,
  },
  audioHeroIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(34,197,94,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.space2,
  },
  audioHeroTitle: {
    ...typeScale.headingLG,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  audioHeroSub: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Status panel
  statusPanel: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: spacing.space4,
    marginHorizontal: spacing.space4,
    gap: spacing.space2,
  },
  panelTitle: {
    ...typeScale.headingSM,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.space2,
  },

  // Audio meter section
  meterSection: {
    marginTop: spacing.space3,
    gap: spacing.space2,
  },
  meterLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  meterHint: {
    ...typeScale.caption,
    color: Colors.textMuted,
    fontStyle: "italic",
  },

  // Error
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    marginTop: spacing.space2,
    padding: spacing.space2,
    backgroundColor: "rgba(239,68,68,0.10)",
    borderRadius: radius.radiusSM,
  },
  errorText: {
    ...typeScale.bodySM,
    color: Colors.statusDanger,
    flex: 1,
  },

  // Settings guidance (when permissions denied)
  settingsGuidance: {
    marginTop: spacing.space3,
    gap: spacing.space2,
    padding: spacing.space3,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: radius.radiusSM,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  settingsText: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  settingsBtn: {
    marginTop: spacing.space2,
  },

  // Actions
  actionsWrap: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space5,
    gap: spacing.space3,
  },
  backBtn: {
    // already styled via SecondaryButton
  },
});
