/**
 * AppBackground
 *
 * Theme-aware full-screen background.
 *
 * Dark mode  — solid #08080F base with warm/cool decorative overlay layers
 *              (existing dark behaviour, slightly deeper base for more depth).
 *
 * Light mode — solid #F5F6FA warm-grey page background.
 *              Solid white cards placed on top of this read cleanly and
 *              professionally (matching the reference health-app design pattern).
 *              The pink→cyan gradient is reserved for the HeroSection band
 *              at the top of main tab screens — NOT used as the page background.
 *
 * Usage:
 *   <AppBackground>{children}</AppBackground>
 *   <AppBackgroundWithGlow>{children}</AppBackgroundWithGlow>
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "@/context/ThemeContext";
import { DarkColors, LightColors } from "@/tokens/colors";

interface AppBackgroundProps {
  children: React.ReactNode;
  style?: object;
}

// ─── Main background ──────────────────────────────────────────────────────────

export function AppBackground({ children, style }: AppBackgroundProps) {
  const { isDark } = useAppTheme();
  const bg = isDark ? DarkColors.bgBase : LightColors.bgBase;

  return (
    <View style={[styles.root, { backgroundColor: bg }, style]}>
      {isDark && (
        <>
          <View style={styles.warmLayerDark} pointerEvents="none" />
          <View style={styles.coolLayerDark} pointerEvents="none" />
        </>
      )}
      {children}
    </View>
  );
}

// ─── Background with center glow (sign-in, splash screens) ───────────────────

export function AppBackgroundWithGlow({ children, style }: AppBackgroundProps) {
  const { isDark } = useAppTheme();
  const bg = isDark ? DarkColors.bgBase : LightColors.bgBase;

  return (
    <View style={[styles.root, { backgroundColor: bg }, style]}>
      {isDark && (
        <>
          <View style={styles.warmLayerDark} pointerEvents="none" />
          <View style={styles.coolLayerDark} pointerEvents="none" />
          <View style={styles.centerGlowDark} pointerEvents="none" />
        </>
      )}
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },

  // ── Dark mode decorative layers ─────────────────────────────────────────────

  warmLayerDark: {
    position: "absolute",
    top: -120,
    left: -120,
    width: "130%",
    height: "80%",
    backgroundColor: DarkColors.bgWarmLayer,
    borderRadius: 9999,
    opacity: 0.6,
  },

  coolLayerDark: {
    position: "absolute",
    bottom: -120,
    right: -120,
    width: "130%",
    height: "80%",
    backgroundColor: DarkColors.bgCoolLayer,
    borderRadius: 9999,
    opacity: 0.5,
  },

  centerGlowDark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 500,
    height: 500,
    marginTop: -250,
    marginLeft: -250,
    backgroundColor: DarkColors.glowRed,
    borderRadius: 9999,
    opacity: 0.8,
  },
});
