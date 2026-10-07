/**
 * GradientButton — v2 "Navy Health" primary action button.
 *
 * Per brand-design-guide Phase 4:
 *   - primary:     vertical red gradient #D60A1D → #7A000A, white label
 *   - success:     green #00E600 (final CTA: Create Account / Start)
 *   - destructive: flat #EF4444
 * Soft-rect 12px radius (NOT a full pill), 56px tall by default.
 * States: default / pressed (scale 0.96) / disabled (35% opacity) / loading (spinner).
 *
 * Usage:
 *   <GradientButton label="Sign in" onPress={...} />
 *   <GradientButton label="Create Account" variant="success" onPress={...} />
 *   <GradientButton label="Continue" trailingIcon={<Ionicons .../>} loading={submitting} />
 */

import React from "react";
import {
  Pressable,
  Text,
  View,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColors } from "@/hooks/useColors";
import { radius } from "@/tokens/radius";
import { fontFamily } from "@/tokens/typography";
import { coloredShadow } from "@/tokens/shadows";

export type GradientButtonVariant = "primary" | "success" | "destructive";

interface GradientButtonProps {
  label: string;
  onPress?: () => void;
  variant?: GradientButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Fill the available width (default) or size to content. */
  fullWidth?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function GradientButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  leadingIcon,
  trailingIcon,
  fullWidth = true,
  height = 56,
  style,
  accessibilityLabel,
  testID,
}: GradientButtonProps) {
  const C = useColors();
  const isDisabled = disabled || loading;

  // Gradient / fill colors per variant
  const gradientColors: readonly string[] =
    variant === "primary"
      ? C.palette.gradientPrimary
      : variant === "success"
        ? C.palette.gradientSuccess
        : [C.actionDestructive, C.actionDestructive];

  const shadow =
    variant === "primary"
      ? coloredShadow.shadowPrimary
      : variant === "success"
        ? coloredShadow.shadowSuccess
        : coloredShadow.shadowDestructive;

  // Success CTA uses navy text for AA contrast on bright green; others use white.
  const labelColor = variant === "success" ? C.palette.navyBase : "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
      style={({ pressed }) => [
        styles.pressable,
        fullWidth && styles.fullWidth,
        { opacity: isDisabled ? 0.35 : 1 },
        pressed && !isDisabled && styles.pressed,
        !isDisabled && shadow,
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors as string[]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.gradient, { height, borderRadius: radius.radiusMD }]}
      >
        {loading ? (
          <ActivityIndicator color={labelColor} />
        ) : (
          <View style={styles.content}>
            {leadingIcon ? <View style={styles.icon}>{leadingIcon}</View> : null}
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={[styles.label, { color: labelColor }]}
            >
              {label}
            </Text>
            {trailingIcon ? <View style={styles.icon}>{trailingIcon}</View> : null}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    borderRadius: radius.radiusMD,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  gradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
  icon: {
    alignItems: "center",
    justifyContent: "center",
  },
});
