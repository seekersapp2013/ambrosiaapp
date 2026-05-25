import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { AppLogo } from "@/components/AppLogo";
import { AppBackgroundWithGlow } from "@/components/AppBackground";
import { Colors } from "@/tokens/colors";
import { radius } from "@/tokens/radius";
import { typeScale } from "@/tokens/typography";
import { duration } from "@/tokens/motion";
import { elevation, coloredShadow } from "@/tokens/shadows";

export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
    // Phase 8: fade in + scale 0.85 → 1.0 over 600ms easeDecelerate
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.xSlow,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 22,
        stiffness: 120,
      }),
    ]).start();
  }, [opacity, scale]);

  return (
    <AppBackgroundWithGlow style={styles.container}>
      <Animated.View style={[{ opacity, transform: [{ scale }] }]}>
        <View style={[styles.logoContainer, elevation.elevation3, coloredShadow.shadowPrimaryStrong]}>
          <AppLogo size={80} />
        </View>
      </Animated.View>
      <Animated.View style={{ opacity }}>
        <Text style={styles.appName} allowFontScaling={false}>Ambrosia</Text>
        <Text style={styles.motto} allowFontScaling={true}>A Safe Haven For Health Information</Text>
      </Animated.View>
    </AppBackgroundWithGlow>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: radius.radius2XL,
    backgroundColor: Colors.bgSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  appName: {
    ...typeScale.displayMedium,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  motto: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
