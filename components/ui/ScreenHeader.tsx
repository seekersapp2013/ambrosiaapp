/**
 * Ambrosia Design System — Screen Header
 * Phase 7: Top navigation bar, 56px height
 * Accessibility: Phase 21
 *
 * When `onBack` is not provided the header uses history.goBack() so that
 * the user is always returned to the actual previous screen rather than
 * whatever tab the Tabs navigator last focused.
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
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { elevation } from '@/tokens/shadows';
import { zIndex } from '@/tokens/zIndex';
import { IconButton } from './Button';
import { useNavigationHistory } from '@/context/NavigationHistoryContext';

interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  /** Fallback route used when history stack is empty and no onBack provided */
  backFallback?: string;
  trailing?: React.ReactNode;
  transparent?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  onBack,
  backFallback = '/(tabs)/for-you',
  trailing,
  transparent = false,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useNavigationHistory();
  const C = useColors();

  // Screen headers always use dark surface in light mode for contrast
  const headerBg = C.isDark ? C.bgBase : '#0F0F1E';
  const headerTextColor = C.isDark ? C.textPrimary : '#FFFFFF';
  const headerIconColor = C.isDark ? C.iconPrimary : '#D1D5DB';

  // Determine the back handler:
  // 1. Use the explicitly provided onBack if given.
  // 2. Otherwise, use history.goBack() so we always return to the real previous screen.
  const handleBack = onBack ?? (() => history.goBack(router, backFallback));

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 8, minHeight: 56 + insets.top, backgroundColor: headerBg },
        !transparent && elevation.elevation1,
        transparent && styles.transparent,
        { zIndex: zIndex.header },
        style,
      ]}
    >
      {/* Left — back button */}
      <View style={styles.side}>
        <IconButton
          icon={
            <Ionicons name="chevron-back" size={24} color={headerIconColor} />
          }
          onPress={handleBack}
          accessibilityLabel="Go back"
          size={36}
        />
      </View>

      {/* Center — title */}
      {title ? (
        <Text style={[styles.title, { color: headerTextColor }]} numberOfLines={1} allowFontScaling={false}>
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
  const C = useColors();
  const pct = Math.min(step / total, 1);

  return (
    <View style={[styles.progressTrack, { backgroundColor: C.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }, style]}>
      <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: C.actionPrimary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    paddingHorizontal: spacing.screenPaddingH,
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
    textAlign: 'center',
  },
  titlePlaceholder: {
    flex: 1,
  },
  // Progress bar
  progressTrack: {
    height: 4,
    borderRadius: 999,
    marginHorizontal: spacing.screenPaddingH,
    marginBottom: spacing.space6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 999,
  },
});
