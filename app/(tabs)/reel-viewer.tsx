/**
 * Reel / Pulse Viewer
 * Full-screen single pulse with Instagram-style overlay layout.
 *
 * Layout (all absolute, layered over the video):
 *   ┌──────────────────────────────────────┐
 *   │ TOP — brand pill + back + mute        │
 *   │                                       │
 *   │          [  VIDEO  ]                  │
 *   │                                       │
 *   │ BOTTOM-LEFT — author + caption + tags │
 *   │ BOTTOM-RIGHT — engagement bar         │
 *   └──────────────────────────────────────┘
 *
 * Web fix: engagement bar is inside the card (position:absolute relative
 * to the card View), not positioned relative to Dimensions.get("window").
 * This avoids the off-screen clipping that happens on web.
 */

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter, Redirect } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBackground } from "@/components/AppBackground";
import { AppLoader } from "@/components/AppLoader";
import { AppLogo } from "@/components/AppLogo";
import { MobileCard, MOBILE_CARD_ENABLED } from "@/components/MobileCard";
import { ReelEngagementBar } from "@/components/ReelEngagementBar";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Viewer content ───────────────────────────────────────────────────────────
function ViewerContent() {
  const { reelId } = useLocalSearchParams<{ reelId: string }>();
  const router     = useRouter();
  const history    = useNavigationHistory();
  const insets     = useSafeAreaInsets();
  const [showSensitive, setShowSensitive] = useState(false);
  const [isMuted, setIsMuted]             = useState(false);
  const [purchasing, setPurchasing]       = useState(false);
  const lastTapRef = useRef<number>(0);

  // ── Card geometry ─────────────────────────────────────────────────────────
  const cardPaddingH  = MOBILE_CARD_ENABLED ? 16 : 0;
  const cardMaxWidth  = 500;
  const cardWidth     = Math.min(SCREEN_W - cardPaddingH * 2, cardMaxWidth);
  // Height: full screen minus top/bottom card padding
  const cardPaddingV  = MOBILE_CARD_ENABLED ? 16 : 0;
  const cardHeight    = SCREEN_H - cardPaddingV * 2;

  // ── Data ──────────────────────────────────────────────────────────────────
  const reel = useQuery(
    api.reels.getReelById,
    reelId ? { reelId: reelId as Id<"reels"> } : "skip"
  );
  const hasAccess = useQuery(
    api.payments.hasAccess,
    reel?._id ? { contentType: "reel", contentId: reel._id } : "skip"
  );
  const videoUrl = useQuery(
    api.files.getFileUrl,
    reel?.video ? { storageId: reel.video } : "skip"
  );
  const posterUrl = useQuery(
    api.files.getFileUrl,
    reel?.poster ? { storageId: reel.poster } : "skip"
  );
  const authorAvatarUrl = useQuery(
    api.files.getFileUrl,
    (reel as any)?.author?.avatar
      ? { storageId: (reel as any).author.avatar }
      : "skip"
  );

  const purchaseContent = useMutation(api.payments.purchaseContent);

  const canPlay           = !reel?.isGated || hasAccess;
  const showSensitiveGate = reel?.isSensitive && !showSensitive;

  // ── Video player ──────────────────────────────────────────────────────────
  const player = useVideoPlayer(
    videoUrl && canPlay && !showSensitiveGate ? videoUrl : null,
    (p) => { p.loop = true; p.muted = false; }
  );

  useEffect(() => {
    if (!player) return;
    if (videoUrl && canPlay && !showSensitiveGate) player.play();
    else player.pause();
  }, [videoUrl, canPlay, showSensitiveGate, player]);

  useEffect(() => {
    if (player) player.muted = isMuted;
  }, [isMuted, player]);

  // ── Double-tap to pause/play ───────────────────────────────────────────────
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (player) {
        if (player.playing) player.pause();
        else player.play();
      }
    }
    lastTapRef.current = now;
  }, [player]);

  // ── Purchase ──────────────────────────────────────────────────────────────
  const handlePurchase = useCallback(async () => {
    if (!reel || purchasing) return;
    setPurchasing(true);
    try {
      await purchaseContent({
        contentType: "reel",
        contentId: reel._id,
        priceToken: reel.priceToken ?? "USD",
        priceAmount: reel.priceAmount ?? 0,
      });
      Alert.alert("Unlocked!", "You now have access to this pulse.");
    } catch (e: any) {
      Alert.alert("Purchase failed", e.message ?? "Please try again.");
    } finally {
      setPurchasing(false);
    }
  }, [reel, purchasing, purchaseContent]);

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (d > 0) return `${d}d ago`;
    if (h > 0) return `${h}h ago`;
    return "just now";
  };

  // ── Loading / not found ───────────────────────────────────────────────────
  if (reel === undefined) {
    return (
      <AppBackground style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.actionPrimary} size="large" />
        </View>
      </AppBackground>
    );
  }

  if (reel === null) {
    return (
      <AppBackground style={styles.root}>
        <View style={styles.centered}>
          <Ionicons name="warning-outline" size={48} color={Colors.statusWarning} />
          <Text style={styles.notFoundText}>Pulse not found</Text>
          <TouchableOpacity onPress={() => history.goBack(router)} style={styles.backLink}>
            <Text style={styles.backLinkText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </AppBackground>
    );
  }

  const author = (reel as any).author ?? {};
  // Bottom clearance — give enough room above tab bar
  const bottomClearance = insets.bottom + 80;

  return (
    <AppBackground style={styles.root}>
      <MobileCard
        style={[styles.videoCard, { height: cardHeight }]}
        containerStyle={styles.videoCardContainer}
      >
        {showSensitiveGate ? (
          /* ── Sensitive gate ──────────────────────────────────────────── */
          <View style={styles.sensitiveGate}>
            <Ionicons name="warning-outline" size={48} color={Colors.statusWarning} />
            <Text style={styles.sensitiveTitle}>Sensitive Content</Text>
            <Text style={styles.sensitiveBody}>
              This pulse contains content that some may find sensitive.
            </Text>
            <TouchableOpacity
              style={styles.sensitiveBtn}
              onPress={() => setShowSensitive(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.sensitiveBtnText}>View Content</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Video / poster ────────────────────────────────────────── */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={handleTap}
              activeOpacity={1}
              accessibilityLabel="Double-tap to play or pause"
            >
              {videoUrl && canPlay ? (
                <VideoView
                  player={player}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  nativeControls={false}
                  accessibilityLabel="Pulse video"
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, styles.posterBg]}>
                  {posterUrl ? (
                    <Image
                      source={{ uri: posterUrl }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                      accessible={false}
                    />
                  ) : (
                    <View style={styles.posterPlaceholder}>
                      <Ionicons
                        name="play-circle-outline"
                        size={72}
                        color="rgba(255,255,255,0.25)"
                      />
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* ── Gated overlay ─────────────────────────────────────────── */}
            {reel.isGated && !hasAccess && (
              <View style={styles.gatedOverlay}>
                <View style={styles.gatedCard}>
                  <Ionicons name="lock-closed" size={36} color={Colors.actionPrimary} />
                  <Text style={styles.gatedTitle}>Premium Pulse</Text>
                  {reel.priceAmount != null && (
                    <Text style={styles.gatedPrice}>
                      {reel.priceToken} {reel.priceAmount}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={[styles.unlockBtn, purchasing && styles.unlockBtnDisabled]}
                    onPress={handlePurchase}
                    disabled={purchasing}
                    activeOpacity={0.85}
                  >
                    {purchasing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.unlockBtnText}>Unlock Now</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => router.push("/(tabs)/wallet")}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.fundWalletLink}>Fund Wallet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Bottom gradient scrim ─────────────────────────────────── */}
            <View style={styles.bottomScrim} pointerEvents="none" />

            {/* ── TOP BAR — brand + back + mute ─────────────────────────── */}
            <View
              style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}
              pointerEvents="box-none"
            >
              <View style={styles.topBar}>
                {/* Back */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => history.goBack(router)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Brand pill — "Ambrosia Pulse" */}
                <View style={styles.brandPill}>
                  <AppLogo size={18} />
                  <Text style={styles.brandText} allowFontScaling={false}>
                    Pulse
                  </Text>
                </View>

                {/* Mute */}
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => setIsMuted((m) => !m)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={isMuted ? "Unmute" : "Mute"}
                >
                  <Ionicons
                    name={isMuted ? "volume-mute-outline" : "volume-high-outline"}
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── BOTTOM-LEFT — author + caption + tags ─────────────────── */}
            <View
              style={[styles.bottomLeft, { bottom: bottomClearance }]}
              pointerEvents="box-none"
            >
              {/* Author identity row */}
              <View style={styles.authorRow}>
                <View style={styles.authorAvatarWrap}>
                  {authorAvatarUrl ? (
                    <Image
                      source={{ uri: authorAvatarUrl }}
                      style={styles.authorAvatar}
                      accessible={false}
                    />
                  ) : (
                    <Ionicons name="person" size={16} color={Colors.iconSecondary} />
                  )}
                </View>
                <View style={styles.authorTextCol}>
                  {/* Display name */}
                  {(author.name || author.username) && (
                    <Text style={styles.authorName} allowFontScaling={false}>
                      {author.name ?? author.username}
                    </Text>
                  )}
                  {/* @username */}
                  <Text style={styles.authorHandle} allowFontScaling={false}>
                    @{author.username ?? author.name ?? "unknown"}
                  </Text>
                </View>
                {/* Time */}
                <Text style={styles.authorTime} allowFontScaling={false}>
                  {formatTime(reel.createdAt)}
                </Text>
              </View>

              {/* Caption / title */}
              {reel.caption ? (
                <Text style={styles.caption} numberOfLines={3} allowFontScaling={false}>
                  {reel.caption}
                </Text>
              ) : null}

              {/* Tags */}
              {(reel as any).tags?.length > 0 && (
                <View style={styles.tagsRow}>
                  {((reel as any).tags as string[]).slice(0, 4).map((tag: string, i: number) => (
                    <Text key={i} style={styles.tag} allowFontScaling={false}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}
            </View>

            {/* ── BOTTOM-RIGHT — engagement bar (inside card = no clip) ─── */}
            <View
              style={[styles.engagementColumn, { bottom: bottomClearance }]}
              pointerEvents="box-none"
            >
              <ReelEngagementBar
                reel={reel as any}
                hasAccess={hasAccess}
                disabled={false}
                resolvedAvatarUrl={authorAvatarUrl}
              />
            </View>
          </>
        )}
      </MobileCard>
    </AppBackground>
  );
}

export default function ReelViewerScreen() {
  return (
    <>
      <AuthLoading><AppLoader /></AuthLoading>
      <Unauthenticated><Redirect href="/" /></Unauthenticated>
      <Authenticated><ViewerContent /></Authenticated>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space4,
  },
  notFoundText: { ...typeScale.headingSM, color: Colors.textMuted },
  backLink: { marginTop: spacing.space2 },
  backLinkText: { ...typeScale.bodyMD, color: Colors.actionPrimary },

  // ── Card ─────────────────────────────────────────────────────────────────
  videoCardContainer: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  videoCard: {
    padding: 0,
    backgroundColor: "#000",
    // overflow:hidden is set by MobileCard already — engagement bar is
    // now inside the card so it won't be clipped
    overflow: "hidden",
  },

  // ── Sensitive gate ────────────────────────────────────────────────────────
  sensitiveGate: {
    flex: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.space8,
    gap: spacing.space3,
  },
  sensitiveTitle: { ...typeScale.headingLG, color: Colors.textPrimary, textAlign: "center" },
  sensitiveBody: { ...typeScale.bodyMD, color: Colors.textMuted, textAlign: "center" },
  sensitiveBtn: {
    marginTop: spacing.space4,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    paddingHorizontal: spacing.space6,
    paddingVertical: spacing.space3,
  },
  sensitiveBtnText: { ...typeScale.labelMD, color: Colors.textPrimary },

  posterBg: { backgroundColor: "#111" },
  posterPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Gated overlay ─────────────────────────────────────────────────────────
  gatedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  gatedCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    padding: spacing.space6,
    alignItems: "center",
    gap: spacing.space3,
    width: 260,
  },
  gatedTitle: { ...typeScale.headingSM, color: Colors.textPrimary },
  gatedPrice: { ...typeScale.bodyMD, color: Colors.textMuted },
  unlockBtn: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: 12,
    paddingHorizontal: spacing.space5,
    paddingVertical: spacing.space3,
    marginTop: spacing.space2,
    minWidth: 140,
    alignItems: "center",
  },
  unlockBtnDisabled: { opacity: 0.6 },
  unlockBtnText: { ...typeScale.labelMD, color: "#fff" },
  fundWalletLink: { ...typeScale.bodySM, color: Colors.actionPrimary, marginTop: spacing.space1 },

  // ── Bottom scrim (gradient illusion) ─────────────────────────────────────
  bottomScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 320,
    // Solid dark fade — no expo-linear-gradient dependency
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  // ── Top overlay ───────────────────────────────────────────────────────────
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: spacing.space4,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Brand pill
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.50)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(198,34,41,0.45)",
  },
  brandText: {
    ...typeScale.labelMD,
    color: "#fff",
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // ── Bottom-left: author + caption + tags ──────────────────────────────────
  bottomLeft: {
    position: "absolute",
    left: spacing.space4,
    // Leave room for the engagement bar on the right (60px wide + gap)
    right: 72,
    gap: 6,
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  authorAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bgElevated,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  authorAvatar: { width: 36, height: 36, borderRadius: 18 },
  authorTextCol: { flex: 1, gap: 1 },
  authorName: {
    ...typeScale.labelSM,
    color: "#fff",
    fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  authorHandle: {
    ...typeScale.caption,
    color: "rgba(255,255,255,0.75)",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  authorTime: {
    ...typeScale.caption,
    color: "rgba(255,255,255,0.55)",
    flexShrink: 0,
  },

  caption: {
    ...typeScale.bodyMD,
    color: "#fff",
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: {
    ...typeScale.caption,
    color: "rgba(255,255,255,0.80)",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ── Bottom-right: engagement bar ─────────────────────────────────────────
  engagementColumn: {
    position: "absolute",
    right: spacing.space3,
    alignItems: "center",
  },
});
