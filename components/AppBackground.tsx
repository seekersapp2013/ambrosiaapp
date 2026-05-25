/**
 * AppBackground
 *
 * A zero-dependency layered background that mimics the web landing page's
 * linear-gradient(135deg, #0a0a15 → #1a0f1f → #0f1420) using stacked Views.
 *
 * Renders as native Views on Android/iOS and plain divs on web.
 * No JS animation, no repaint on scroll — renders once and stays.
 *
 * Usage:
 *   <AppBackground>
 *     {children}
 *   </AppBackground>
 */

import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors } from "@/tokens/colors";

interface AppBackgroundProps {
  children: React.ReactNode;
  style?: object;
}

export function AppBackground({ children, style }: AppBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      {/* Warm purple tint — top-left quadrant */}
      <View style={styles.warmLayer} pointerEvents="none" />
      {/* Cool blue tint — bottom-right quadrant */}
      <View style={styles.coolLayer} pointerEvents="none" />
      {children}
    </View>
  );
}

/**
 * AppBackgroundWithGlow
 *
 * Extends AppBackground with a centered radial glow — used on sign-in
 * and splash screens where a focal "spotlight" effect is appropriate.
 */
export function AppBackgroundWithGlow({ children, style }: AppBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <View style={styles.warmLayer} pointerEvents="none" />
      <View style={styles.coolLayer} pointerEvents="none" />
      <View style={styles.centerGlow} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.bgBase,
    position: "relative",
    overflow: "hidden",
  },

  // Warm dark-purple tint covering top-left ~60% of screen
  warmLayer: {
    position: "absolute",
    top: -120,
    left: -120,
    width: "130%",
    height: "80%",
    backgroundColor: Colors.bgWarmLayer,
    borderRadius: 9999,
    // Soft edge via opacity — no blur needed
    opacity: 0.6,
  },

  // Cool dark-blue tint covering bottom-right ~60% of screen
  coolLayer: {
    position: "absolute",
    bottom: -120,
    right: -120,
    width: "130%",
    height: "80%",
    backgroundColor: Colors.bgCoolLayer,
    borderRadius: 9999,
    opacity: 0.5,
  },

  // Centered radial glow for focal screens (sign-in, splash)
  centerGlow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 500,
    height: 500,
    marginTop: -250,
    marginLeft: -250,
    backgroundColor: Colors.glowRed,
    borderRadius: 9999,
    opacity: 0.8,
  },
});
