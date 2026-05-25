/**
 * Ambrosia Design System — Badge, Chip, Tag, Rating Stars, Dividers
 * Phase 14: Micro-interaction components
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { radius } from '@/tokens/radius';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';

// ─────────────────────────────────────────────────────────────────────────────
// StandardBadge — red pill chip
// ─────────────────────────────────────────────────────────────────────────────
interface BadgeProps {
  label: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function StandardBadge({ label, style, textStyle }: BadgeProps) {
  return (
    <View style={[styles.standardBadge, style]}>
      <Text style={[styles.standardBadgeText, textStyle]} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge — online/open indicator with dot
// ─────────────────────────────────────────────────────────────────────────────
interface StatusBadgeProps {
  label: string;
  online?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function StatusBadge({ label, online = true, style }: StatusBadgeProps) {
  return (
    <View style={[styles.statusBadge, style]}>
      <View style={[styles.statusDot, { backgroundColor: online ? Colors.statusSuccess : Colors.textDisabled }]} />
      <Text
        style={[styles.statusBadgeText, { color: online ? Colors.statusSuccess : Colors.textDisabled }]}
        allowFontScaling={false}
      >
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UnreadBadge — notification count circle
// ─────────────────────────────────────────────────────────────────────────────
interface UnreadBadgeProps {
  count: number;
  style?: StyleProp<ViewStyle>;
}

export function UnreadBadge({ count, style }: UnreadBadgeProps) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);

  return (
    <View style={[styles.unreadBadge, style]}>
      <Text style={styles.unreadBadgeText} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InfoBadge — experience / info chip (blue)
// ─────────────────────────────────────────────────────────────────────────────
export function InfoBadge({ label, style }: BadgeProps) {
  return (
    <View style={[styles.infoBadge, style]}>
      <Text style={styles.infoBadgeText} allowFontScaling={false}>
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RatingStars — filled / half / empty stars
// Phase 14
// ─────────────────────────────────────────────────────────────────────────────
interface RatingStarsProps {
  rating: number;
  max?: number;
  size?: 'list' | 'detail';
  style?: StyleProp<ViewStyle>;
}

export function RatingStars({
  rating,
  max = 5,
  size = 'list',
  style,
}: RatingStarsProps) {
  const starSize = size === 'detail' ? 28 : 20;

  return (
    <View style={[styles.starsRow, style]}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = rating >= i + 1;
        const half = !filled && rating >= i + 0.5;
        return (
          <Ionicons
            key={i}
            name={filled ? 'star' : half ? 'star-half' : 'star-outline'}
            size={starSize}
            color={filled || half ? Colors.statusWarning : Colors.palette.gray37}
          />
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dividers — Phase 14
// ─────────────────────────────────────────────────────────────────────────────
export function FullDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.fullDivider, style]} />;
}

export function InsetDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.insetDivider, style]} />;
}

export function SectionDivider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.sectionDivider, style]} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  standardBadge: {
    backgroundColor: Colors.bgPrimaryMid,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  standardBadgeText: {
    ...typeScale.caption,
    fontWeight: '600',
    color: Colors.actionPrimary,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.statusSuccessBg,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    ...typeScale.caption,
    fontWeight: '600',
  },

  unreadBadge: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: radius.radiusFull,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  infoBadge: {
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusXS,
    paddingHorizontal: spacing.space2,
    paddingVertical: 3,
  },
  infoBadgeText: {
    ...typeScale.caption,
    fontWeight: '600',
    color: Colors.statusInfo,
  },

  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },

  fullDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: 4,
  },
  insetDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 68,
  },
  sectionDivider: {
    height: 8,
    backgroundColor: Colors.bgElevated,
  },
});
