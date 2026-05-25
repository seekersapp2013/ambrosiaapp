/**
 * Ambrosia Design System — Screen Header
 * Phase 7: Top navigation bar, 56px height
 * Accessibility: Phase 21
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/tokens/colors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { elevation } from '@/tokens/shadows';
import { zIndex } from '@/tokens/zIndex';
import { IconButton } from './Button';

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  trailing?: React.ReactNode;
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  onBack,
  trailing,
  transparent = false,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 8, minHeight: 56 + insets.top },
        !transparent && elevation.elevation1,
        transparent && styles.transparent,
        { zIndex: zIndex.header },
        style,
      ]}
    >
      {/* Left — back button */}
      <View style={styles.side}>
        {onBack ? (
          <IconButton
            icon={
              <Ionicons name="chevron-back" size={24} color={Colors.iconPrimary} />
            }
            onPress={onBack}
            accessibilityLabel="Go back"
            size={36}
          />
        ) : null}
      </View>

      {/* Center — title */}
      {title ? (
        <Text style={styles.title} numberOfLines={1} allowFontScaling={false}>
          {title}
        </Text>
      ) : (
        <View style={styles.titlePlaceholder} />
      )}

      {/* Right — trailing action */}
      <View style={[styles.side, styles.sideRight]}>
        {trailing ?? null}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WizardProgressBar — Phase 7
// ─────────────────────────────────────────────────────────────────────────────
interface ProgressBarProps {
  step: number;
  total: number;
  style?: StyleProp<ViewStyle>;
}

export function WizardProgressBar({ step, total, style }: ProgressBarProps) {
  const pct = Math.min(step / total, 1);

  return (
    <View style={[styles.progressTrack, style]}>
      <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: spacing.screenPaddingH,
    backgroundColor: Colors.bgBase,
  },
  transparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  side: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    ...typeScale.headingMD,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  titlePlaceholder: {
    flex: 1,
  },
  // Progress bar
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 999,
    marginHorizontal: spacing.screenPaddingH,
    marginBottom: spacing.space6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.actionPrimary,
    borderRadius: 999,
  },
});
