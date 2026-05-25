/**
 * Ambrosia Design System — Motion & Animation Tokens
 * Phase 17
 *
 * Usage:
 *   import { duration, easing, spring, useReducedMotion } from '@/tokens/motion';
 *
 *   // Reanimated withTiming
 *   withTiming(1, { duration: duration.normal, easing: Easing.bezier(...easing.decelerate) })
 *
 *   // Reanimated withSpring
 *   withSpring(0, spring.default)
 *
 *   // Reduced motion guard
 *   const reduceMotion = useReducedMotion();
 *   const animatedStyle = useAnimatedStyle(() => ({
 *     opacity: withTiming(visible ? 1 : 0, { duration: duration.normal }),
 *     transform: reduceMotion ? [] : [{ scale: withSpring(visible ? 1 : 0.97, spring.default) }],
 *   }));
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Duration tokens (ms)
// ─────────────────────────────────────────────────────────────────────────────
export const duration = {
  fast:   150,
  normal: 250,
  slow:   400,
  xSlow:  600,
} as const;

export type DurationToken = keyof typeof duration;

// ─────────────────────────────────────────────────────────────────────────────
// Easing tokens
// Tuples compatible with Reanimated's Easing.bezier(x1, y1, x2, y2)
// and React Native Animated's Easing.bezier
// ─────────────────────────────────────────────────────────────────────────────
export const easing = {
  /** General UI movement */
  standard:   [0.4, 0, 0.2, 1] as [number, number, number, number],
  /** Elements entering the screen */
  decelerate: [0, 0, 0.2, 1]   as [number, number, number, number],
  /** Elements leaving the screen */
  accelerate: [0.4, 0, 1, 1]   as [number, number, number, number],
  /** Quick snappy interactions */
  sharp:      [0.4, 0, 0.6, 1] as [number, number, number, number],
} as const;

export type EasingToken = keyof typeof easing;

// ─────────────────────────────────────────────────────────────────────────────
// Spring tokens
// Compatible with Reanimated's withSpring config
// ─────────────────────────────────────────────────────────────────────────────
export const spring = {
  /** Card press, OTP fill, toggle */
  default: { damping: 18, stiffness: 180 },
  /** Bottom sheet, modal */
  soft:    { damping: 22, stiffness: 120 },
} as const;

export type SpringToken = keyof typeof spring;

// ─────────────────────────────────────────────────────────────────────────────
// Reduced motion hook (Phase 21)
// Returns true when the user has enabled "Reduce Motion" in system settings.
// Components must:
//   - Disable all scale/translate transforms when true
//   - Keep opacity fades (safe for all users)
//   - Replace skeleton shimmer with a static background
//   - Override all durations to duration.fast
// ─────────────────────────────────────────────────────────────────────────────
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Read initial value
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => subscription.remove();
  }, []);

  return reduceMotion;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reduced motion duration helper
// Returns duration.fast when reduce motion is on, otherwise the requested token.
// ─────────────────────────────────────────────────────────────────────────────
export function getMotionDuration(
  token: DurationToken,
  reduceMotion: boolean,
): number {
  return reduceMotion ? duration.fast : duration[token];
}
