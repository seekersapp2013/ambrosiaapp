import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ImageBackground, Image } from "react-native";
import { duration } from "@/tokens/motion";

const BG = require("@/assets/images/bg.png");
const LOGO = require("@/assets/images/logo.png");

/**
 * SplashScreen (v2 "Navy Health")
 *
 * Full-bleed navy health-pattern background (bg.png) with the red Ambrosia
 * logo centered on top. Logo fades in + scales 0.85 → 1.0 on mount.
 */
export default function SplashScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;

  useEffect(() => {
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
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <View style={styles.center}>
        <Animated.View style={{ opacity, transform: [{ scale }] }}>
          <Image
            source={LOGO}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Ambrosia"
          />
        </Animated.View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
});
