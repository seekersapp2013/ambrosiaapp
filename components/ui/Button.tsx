/**
 * Ambrosia Design System — Button Components
 * Phase 4: All button variants with full state matrix (Phase 20)
 * Accessibility: Phase 21
 * Motion: Phase 17
 */

import React, { useRef } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Colors } from '@/tokens/colors';
import { radius } from '@/tokens/radius';
import { typeScale } from '@/tokens/typography';
import { elevation, coloredShadow } from '@/tokens/shadows';
import { duration } from '@/tokens/motion';

// ─────────────────────────────────────────────────────────────────────────────
// Shared press animation hook
// ─────────────────────────────────────────────────────────────────────────────
function usePressAnimation(scaleTarget: number, opacityTarget: number) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.parallel([
      Animated.timing(scale, {
        toValue: scaleTarget,
        duration: duration.fast,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: opacityTarget,
        duration: duration.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onPressOut = () => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: duration.fast,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return { scale, opacity, onPressIn, onPressOut };
}

// ─────────────────────────────────────────────────────────────────────────────
// PrimaryButton
// Phase 4: 56px tall, full-width pill, #C62229 background
// ─────────────────────────────────────────────────────────────────────────────
interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  icon?: React.ReactNode;
  /** Override the button background color */
  color?: string;
}

export function PrimaryButton({
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
  labelStyle,
  icon,
  color,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation(0.96, 0.85);
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          styles.primary,
          color ? { backgroundColor: color } : null,
          elevation.elevation2,
          coloredShadow.shadowPrimary,
          isDisabled && styles.primaryDisabled,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.btnInner}>
            {icon}
            <Text
              style={[styles.primaryLabel, isDisabled && styles.primaryLabelDisabled, labelStyle]}
              allowFontScaling={false}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SecondaryButton (Outline)
// Phase 4: transparent bg, white border, 56px
// ─────────────────────────────────────────────────────────────────────────────
export function SecondaryButton({
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
  labelStyle,
  icon,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation(0.96, 1);
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [
          styles.secondary,
          pressed && styles.secondaryPressed,
          isDisabled && styles.secondaryDisabled,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={Colors.textPrimary} size="small" />
        ) : (
          <View style={styles.btnInner}>
            {icon}
            <Text
              style={[styles.secondaryLabel, isDisabled && styles.secondaryLabelDisabled, labelStyle]}
              allowFontScaling={false}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GhostButton (Text button)
// Phase 4: transparent, red text, 14px SemiBold
// ─────────────────────────────────────────────────────────────────────────────
interface GhostButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function GhostButton({
  label,
  disabled = false,
  onPress,
  style,
  labelStyle,
  accessibilityLabel,
  ...rest
}: GhostButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.ghost,
        pressed && styles.ghostPressed,
        style,
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      {...rest}
    >
      <Text
        style={[styles.ghostLabel, disabled && styles.ghostLabelDisabled, labelStyle]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SmallPillButton
// Phase 4: 36px height, pill, #C62229, 14px SemiBold
// ─────────────────────────────────────────────────────────────────────────────
interface SmallPillButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function SmallPillButton({
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
  labelStyle,
  accessibilityLabel,
  ...rest
}: SmallPillButtonProps) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation(0.96, 0.85);
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[styles.smallPill, isDisabled && styles.primaryDisabled]}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text
            style={[styles.smallPillLabel, isDisabled && styles.primaryLabelDisabled, labelStyle]}
            allowFontScaling={false}
          >
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DestructiveButton
// Phase 4: #EF4444 background, 56px, full-width pill
// ─────────────────────────────────────────────────────────────────────────────
export function DestructiveButton({
  label,
  loading = false,
  disabled = false,
  onPress,
  style,
  labelStyle,
  icon,
  accessibilityLabel,
  ...rest
}: ButtonProps) {
  const { scale, opacity, onPressIn, onPressOut } = usePressAnimation(0.96, 0.85);
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[{ transform: [{ scale }], opacity }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={[
          styles.destructive,
          elevation.elevation2,
          coloredShadow.shadowDestructive,
          isDisabled && styles.destructiveDisabled,
        ]}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <View style={styles.btnInner}>
            {icon}
            <Text
              style={[styles.primaryLabel, labelStyle]}
              allowFontScaling={false}
            >
              {label}
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IconButton (circular)
// Phase 4: 40×40px circle, rgba(255,255,255,0.08) bg
// ─────────────────────────────────────────────────────────────────────────────
interface IconButtonProps extends Omit<PressableProps, 'style'> {
  icon: React.ReactNode;
  size?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
}

export function IconButton({
  icon,
  size = 40,
  onPress,
  style,
  accessibilityLabel,
  ...rest
}: IconButtonProps) {
  const { scale, onPressIn, onPressOut } = usePressAnimation(0.96, 1);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
        style={({ pressed }) => [
          styles.iconBtn,
          { width: size, height: size, borderRadius: size / 2 },
          pressed && styles.iconBtnPressed,
          style,
        ]}
        {...rest}
      >
        {icon}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Primary
  primary: {
    height: 56,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primaryDisabled: {
    backgroundColor: Colors.actionPrimaryDisabled,
  },
  primaryLabel: {
    ...typeScale.labelLG,
    color: '#FFFFFF',
  },
  primaryLabelDisabled: {
    color: 'rgba(255,255,255,0.40)',
  },

  // Secondary
  secondary: {
    height: 56,
    borderRadius: radius.radiusFull,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.actionSecondaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    minWidth: 120,
  },
  secondaryPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  secondaryDisabled: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  secondaryLabel: {
    ...typeScale.labelLG,
    color: Colors.textPrimary,
  },
  secondaryLabelDisabled: {
    color: Colors.textDisabled,
  },

  // Ghost
  ghost: {
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 4,
  },
  ghostPressed: {
    opacity: 0.70,
  },
  ghostLabel: {
    ...typeScale.labelMD,
    color: Colors.textLink,
  },
  ghostLabelDisabled: {
    color: Colors.textDisabled,
  },

  // Small pill
  smallPill: {
    height: 36,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.actionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    minWidth: 80,
  },
  smallPillLabel: {
    ...typeScale.labelMD,
    color: '#FFFFFF',
  },

  // Destructive
  destructive: {
    height: 56,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.actionDestructive,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  destructiveDisabled: {
    backgroundColor: 'rgba(239,68,68,0.35)',
  },

  // Icon button
  iconBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
