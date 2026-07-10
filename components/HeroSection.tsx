/**
 * HeroSection
 *
 * A branded top-of-screen band used on main tab screens (For You, Learn,
 * Circle, Wallet, Booking) to give light mode a colourful, premium feel.
 *
 * Light mode — Pink→lavender→cyan diagonal LinearGradient band (~140px tall).
 *              Renders above the MobileCard / content area.
 *              Inspired by the reference health-app pattern: bold coloured
 *              header → white rounded content sheet below.
 *
 * Dark mode  — The dark brand gradient (deep navy warm/cool layers) already
 *              provides depth via AppBackground. HeroSection renders nothing
 *              extra in dark mode — it returns null so screens are unchanged.
 *
 * Usage (add above MobileCard in any main tab screen):
 *
 *   <AppBackground>
 *     <HeroSection height={140} />
 *     <MobileCard>
 *       ...screen content...
 *     </MobileCard>
 *   </AppBackground>
 *
 * The height prop is optional — defaults to 140.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "@/context/ThemeContext";
import { LightColors } from "@/tokens/colors";

interface HeroSectionProps {
  /** Height of the gradient band in dp. Default: 140 */
  height?: number;
  /** Optional extra style applied to the gradient view */
  style?: object;
}

export function HeroSection({ height = 140, style }: HeroSectionProps) {
  const { isDark } = useAppTheme();

  // Dark mode — no hero band needed; AppBackground handles the background
  if (isDark) return null;

  return (
    <LinearGradient
      colors={[
        LightColors.palette.gradientPink,   // hot pink — top-left
        LightColors.palette.gradientMid,    // soft lavender-white — centre
        LightColors.palette.gradientCyan,   // sky cyan — bottom-right
      ]}
      locations={[0, 0.48, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.hero, { height }, style]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    // Negative margin pulls content up so the MobileCard overlaps the band
    // by ~24px, creating the "card slides up over hero" effect from the references.
    marginBottom: -24,
  },
});
