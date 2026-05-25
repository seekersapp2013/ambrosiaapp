import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, ActivityIndicator } from "react-native";
import { AppBackgroundWithGlow } from "@/components/AppBackground";
import { AppLogo } from "@/components/AppLogo";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";

export function AppLoader() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  return (
    <AppBackgroundWithGlow style={styles.container}>
      {/* Phase 14: full screen loader — overlay + spinner + label */}
      <Animated.View style={[styles.inner, { opacity }]}>
        <AppLogo size={56} />
      </Animated.View>
      <ActivityIndicator
        color={Colors.actionPrimary}
        size={32 as any}
        style={{ marginTop: spacing.space4 }}
      />
      <Text style={styles.label} allowFontScaling={true}>
        Loading…
      </Text>
    </AppBackgroundWithGlow>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inner: {
    alignItems: "center",
  },
  label: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    marginTop: spacing.space3,
  },
});
