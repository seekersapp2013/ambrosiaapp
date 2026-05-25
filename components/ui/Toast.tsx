/**
 * Ambrosia Design System — Toast / Snackbar
 * Phase 14: Slide-up + fade animation, auto-dismiss, 4 variants
 * Phase 17: Motion tokens
 * Phase 23: Z-index tokens
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { radius } from '@/tokens/radius';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { elevation } from '@/tokens/shadows';
import { duration } from '@/tokens/motion';
import { zIndex } from '@/tokens/zIndex';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  borderColor: string;
  iconBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
}

const TOAST_CONFIG: Record<ToastVariant, ToastConfig> = {
  success: {
    borderColor: Colors.statusSuccess,
    iconBg: 'rgba(34,197,94,0.15)',
    icon: 'checkmark-circle',
    iconColor: Colors.statusSuccess,
  },
  error: {
    borderColor: Colors.statusDanger,
    iconBg: 'rgba(239,68,68,0.15)',
    icon: 'close-circle',
    iconColor: Colors.statusDanger,
  },
  warning: {
    borderColor: Colors.statusWarning,
    iconBg: 'rgba(245,158,11,0.15)',
    icon: 'warning',
    iconColor: Colors.statusWarning,
  },
  info: {
    borderColor: Colors.statusInfo,
    iconBg: 'rgba(59,130,246,0.15)',
    icon: 'information-circle',
    iconColor: Colors.statusInfo,
  },
};

interface ToastProps {
  message: string;
  variant?: ToastVariant;
  visible: boolean;
  onHide: () => void;
  /** ms before auto-dismiss. 0 = no auto-dismiss */
  autoDismiss?: number;
  /** Bottom offset above tab bar */
  bottomOffset?: number;
}

export function Toast({
  message,
  variant = 'info',
  visible,
  onHide,
  autoDismiss = 3000,
  bottomOffset = 90,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const config = TOAST_CONFIG[variant];

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: duration.normal,
      useNativeDriver: true,
    }).start(() => onHide());
  }, [opacity, onHide]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: duration.normal,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: duration.normal,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoDismiss > 0) {
        timerRef.current = setTimeout(hide, autoDismiss);
      }
    } else {
      translateY.setValue(40);
      opacity.setValue(0);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, autoDismiss, translateY, opacity, hide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        elevation.elevation4,
        { borderLeftColor: config.borderColor },
        { transform: [{ translateY }], opacity },
        { bottom: bottomOffset, zIndex: zIndex.toast },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.iconWrap, { backgroundColor: config.iconBg }]}>
        <Ionicons name={config.icon} size={16} color={config.iconColor} />
      </View>
      <Text style={styles.message} numberOfLines={2} allowFontScaling={true}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: spacing.screenPaddingH,
    right: spacing.screenPaddingH,
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderLeftWidth: 3,
    paddingHorizontal: spacing.space4,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.space3,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  message: {
    ...typeScale.bodySM,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
});
