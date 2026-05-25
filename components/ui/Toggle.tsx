/**
 * Ambrosia Design System — Switch/Toggle & Checkbox
 * Phase 14: State matrix (Phase 20), spring animation (Phase 17)
 * Accessibility: Phase 21
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { radius } from '@/tokens/radius';

// ─────────────────────────────────────────────────────────────────────────────
// AppSwitch — Phase 14 toggle
// Track: 48×28px, thumb: 24×24px, spring animation
// ─────────────────────────────────────────────────────────────────────────────
interface SwitchProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function AppSwitch({
  value,
  onValueChange,
  disabled = false,
  style,
  accessibilityLabel = 'Toggle switch',
}: SwitchProps) {
  const thumbX = useRef(new Animated.Value(value ? 20 : 2)).current;

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: value ? 20 : 2,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();
  }, [value, thumbX]);

  const trackColor = disabled
    ? value
      ? 'rgba(198,34,41,0.30)'
      : 'rgba(255,255,255,0.06)'
    : value
    ? Colors.actionPrimary
    : 'rgba(255,255,255,0.15)';

  const thumbColor = disabled
    ? value
      ? 'rgba(255,255,255,0.50)'
      : 'rgba(255,255,255,0.30)'
    : '#FFFFFF';

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={[styles.track, { backgroundColor: trackColor }, style]}
    >
      <Animated.View
        style={[
          styles.thumb,
          { backgroundColor: thumbColor },
          { transform: [{ translateX: thumbX }] },
        ]}
      />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AppCheckbox — Phase 14
// 22×22px, 6px radius, spring scale on check
// ─────────────────────────────────────────────────────────────────────────────
type CheckboxState = 'unchecked' | 'checked' | 'indeterminate';

interface CheckboxProps {
  state?: CheckboxState;
  checked?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function AppCheckbox({
  state,
  checked,
  onPress,
  disabled = false,
  style,
  accessibilityLabel = 'Checkbox',
}: CheckboxProps) {
  const resolvedState: CheckboxState =
    state ?? (checked ? 'checked' : 'unchecked');

  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (disabled) return;
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 0.85,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 18,
        stiffness: 180,
      }),
    ]).start();
    onPress?.();
  };

  const isChecked = resolvedState !== 'unchecked';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: isChecked, disabled }}
        hitSlop={{ top: 11, bottom: 11, left: 11, right: 11 }}
        style={[
          styles.checkbox,
          isChecked && !disabled && styles.checkboxChecked,
          disabled && styles.checkboxDisabled,
          style,
        ]}
      >
        {resolvedState === 'checked' ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : resolvedState === 'indeterminate' ? (
          <View style={styles.indeterminateDash} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Switch
  track: {
    width: 48,
    height: 28,
    borderRadius: radius.radiusFull,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 4,
    elevation: 2,
  },

  // Checkbox
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.radiusXS,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.actionPrimary,
    borderColor: Colors.actionPrimary,
  },
  checkboxDisabled: {
    backgroundColor: Colors.bgElevated,
    borderColor: Colors.borderSubtle,
  },
  indeterminateDash: {
    width: 10,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
});
