/**
 * Ambrosia Design System — Skeleton Loader
 * Phase 14: Shimmer animation
 * Phase 17: Motion tokens + reduced motion support
 * Phase 21: Accessibility
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors } from '@/tokens/colors';
import { radius } from '@/tokens/radius';
import { useReducedMotion } from '@/tokens/motion';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radius.radiusSM,
  style,
}: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    if (reduceMotion) return;

    const anim = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer, reduceMotion]);

  const translateX = shimmer.interpolate({
    inputRange: [-1, 1],
    outputRange: [-300, 300],
  });

  return (
    <View
      style={[
        styles.base,
        { width: width as any, height, borderRadius },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {!reduceMotion && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.shimmer,
            { transform: [{ translateX }] },
          ]}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonCard — pre-built card-shaped skeleton
// ─────────────────────────────────────────────────────────────────────────────
export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.skeletonCard, style]}>
      <Skeleton width={64} height={64} borderRadius={10} />
      <View style={styles.skeletonContent}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={12} width="50%" style={{ marginTop: 6 }} />
        <Skeleton height={10} width="35%" style={{ marginTop: 4 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.bgElevated,
    overflow: 'hidden',
  },
  shimmer: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    width: 200,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 12,
  },
  skeletonContent: {
    flex: 1,
    gap: 0,
  },
});
