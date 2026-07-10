/**
 * Ambrosia Design System — Card Components
 * Phase 6: All card variants with press states (Phase 20)
 * Accessibility: Phase 21
 * Motion: Phase 17 (card press scale 0.97)
 *
 * ✅ Phase 0: Fully theme-aware — reads colors from useColors() hook.
 *    All color values respond to light/dark mode automatically.
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Image,
  type StyleProp,
  type ViewStyle,
  type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radius } from '@/tokens/radius';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { duration } from '@/tokens/motion';

// ─────────────────────────────────────────────────────────────────────────────
// Shared press animation
// ─────────────────────────────────────────────────────────────────────────────
function useCardPress() {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.timing(scale, {
      toValue: 0.97,
      duration: duration.fast,
      useNativeDriver: true,
    }).start();

  const onPressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
    }).start();

  return { scale, onPressIn, onPressOut };
}

// ─────────────────────────────────────────────────────────────────────────────
// BaseCard — shared wrapper used by all card variants
// ─────────────────────────────────────────────────────────────────────────────
interface BaseCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  elevated?: boolean;
}

export function BaseCard({
  children,
  onPress,
  style,
  accessibilityLabel,
  elevated = false,
}: BaseCardProps) {
  const { scale, onPressIn, onPressOut } = useCardPress();
  const C = useColors();
  const themed = useThemedStyles(C, (colors) => ({
    card: {
      backgroundColor: colors.bgSurface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.isDark ? colors.redBorder : colors.borderDefault,
      shadowColor: colors.isDark ? '#C62229' : '#000000',
      shadowOffset: { width: 0, height: colors.isDark ? 20 : 4 },
      shadowOpacity: colors.isDark ? 0.15 : 0.08,
      shadowRadius: colors.isDark ? 40 : 16,
      elevation: colors.isDark ? 8 : 4,
      padding: spacing.space4,
      marginBottom: spacing.space3,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
    },
    cardPressed: {
      backgroundColor: colors.bgElevated,
    },
  }));

  if (!onPress) {
    return (
      <View style={[themed.card, style]}>
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          themed.card,
          pressed && themed.cardPressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ListCard — Standard list card with thumbnail + content + trailing
// Phase 6: 64×64 thumbnail, 16px radius, borderSubtle
// ─────────────────────────────────────────────────────────────────────────────
interface ListCardProps {
  title: string;
  subtitle?: string;
  meta?: string;
  thumbnail?: ImageSourcePropType | string;
  thumbnailFallbackIcon?: keyof typeof Ionicons.glyphMap;
  trailing?: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function ListCard({
  title,
  subtitle,
  meta,
  thumbnail,
  thumbnailFallbackIcon = 'image-outline',
  trailing,
  onPress,
  style,
  accessibilityLabel,
}: ListCardProps) {
  const C = useColors();
  const thumbSource =
    typeof thumbnail === 'string' ? { uri: thumbnail } : thumbnail;

  return (
    <BaseCard
      onPress={onPress}
      style={[staticStyles.listCard, style]}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {/* Thumbnail */}
      <View style={staticStyles.listThumb}>
        {thumbSource ? (
          <Image
            source={thumbSource}
            style={staticStyles.listThumbImg}
            resizeMode="cover"
            accessible={false}
          />
        ) : (
          <View style={[staticStyles.listThumbPlaceholder, { backgroundColor: C.bgElevated }]}>
            <Ionicons name={thumbnailFallbackIcon} size={24} color={C.iconSecondary} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={staticStyles.listContent}>
        <Text style={[staticStyles.listTitle, { color: C.textPrimary }]} numberOfLines={1} allowFontScaling={true}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[staticStyles.listSubtitle, { color: C.textMuted }]} numberOfLines={1} allowFontScaling={true}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[staticStyles.listMeta, { color: C.textDisabled }]} numberOfLines={1} allowFontScaling={true}>
            {meta}
          </Text>
        ) : null}
      </View>

      {/* Trailing */}
      {trailing ? (
        <View style={staticStyles.listTrailing}>{trailing}</View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={C.iconDisabled} />
      )}
    </BaseCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsRowCard — Profile screen menu items
// Phase 6: 56px height, leading icon, label, trailing chevron
// ─────────────────────────────────────────────────────────────────────────────
interface SettingsRowProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  trailing?: React.ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  isLast?: boolean;
  isDestructive?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SettingsRow({
  label,
  icon,
  iconColor,
  trailing,
  showChevron = true,
  onPress,
  isLast = false,
  isDestructive = false,
  style,
}: SettingsRowProps) {
  const { scale, onPressIn, onPressOut } = useCardPress();
  const C = useColors();
  const resolvedIconColor = iconColor ?? C.iconAccent;

  return (
    <>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Pressable
          onPress={onPress}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          accessibilityRole="button"
          accessibilityLabel={label}
          style={({ pressed }) => [
            staticStyles.settingsRow,
            { backgroundColor: C.bgSurface },
            pressed && { backgroundColor: C.bgElevated },
            style,
          ]}
        >
          <Ionicons name={icon} size={20} color={resolvedIconColor} />
          <Text
            style={[
              staticStyles.settingsLabel,
              { color: isDestructive ? C.textDanger : C.textPrimary },
            ]}
            allowFontScaling={true}
          >
            {label}
          </Text>
          {trailing ?? (
            isDestructive ? null : showChevron ? (
              <Ionicons name="chevron-forward" size={16} color={C.iconDisabled} />
            ) : null
          )}
        </Pressable>
      </Animated.View>
      {!isLast ? (
        <View style={[staticStyles.settingsDivider, { backgroundColor: C.borderSubtle }]} />
      ) : null}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TransactionCard — Transaction / history row
// Phase 6: 56×56 icon area, title, subtitle, amount, status badge
// ─────────────────────────────────────────────────────────────────────────────
interface TransactionCardProps {
  title: string;
  subtitle?: string;
  amount: string;
  amountColor?: string;
  status?: string;
  statusColor?: string;
  statusBg?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  timestamp?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TransactionCard({
  title,
  subtitle,
  amount,
  amountColor,
  status,
  statusColor,
  statusBg,
  icon,
  iconColor,
  iconBg,
  timestamp,
  onPress,
  style,
}: TransactionCardProps) {
  const C = useColors();
  const resolvedAmountColor = amountColor ?? C.actionPrimary;
  const resolvedStatusColor = statusColor ?? C.statusSuccess;
  const resolvedStatusBg = statusBg ?? C.statusSuccessBg;
  const resolvedIconColor = iconColor ?? C.actionPrimary;
  const resolvedIconBg = iconBg ?? C.bgPrimaryMid;

  return (
    <BaseCard onPress={onPress} style={[staticStyles.txCard, style]} accessibilityLabel={title}>
      <View style={[staticStyles.txIconWrap, { backgroundColor: resolvedIconBg }]}>
        <Ionicons name={icon} size={20} color={resolvedIconColor} />
      </View>
      <View style={staticStyles.txContent}>
        <Text style={[staticStyles.txTitle, { color: C.textPrimary }]} numberOfLines={1} allowFontScaling={true}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[staticStyles.txSubtitle, { color: C.textMuted }]} numberOfLines={1} allowFontScaling={true}>
            {subtitle}
          </Text>
        ) : null}
        {timestamp ? (
          <Text style={[staticStyles.txTimestamp, { color: C.textDisabled }]} allowFontScaling={true}>
            {timestamp}
          </Text>
        ) : null}
      </View>
      <View style={staticStyles.txRight}>
        <Text style={[staticStyles.txAmount, { color: resolvedAmountColor }]} allowFontScaling={false}>
          {amount}
        </Text>
        {status ? (
          <View style={[staticStyles.txBadge, { backgroundColor: resolvedStatusBg }]}>
            <Text style={[staticStyles.txBadgeText, { color: resolvedStatusColor }]} allowFontScaling={false}>
              {status}
            </Text>
          </View>
        ) : null}
      </View>
    </BaseCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyStateCard — No content placeholder
// Phase 6: centered illustration, title, subtitle, optional CTA
// ─────────────────────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyStateCard({
  icon = 'file-tray-outline',
  title,
  subtitle,
  action,
  style,
}: EmptyStateProps) {
  const C = useColors();

  return (
    <View style={[staticStyles.emptyContainer, style]}>
      <View style={[staticStyles.emptyIconWrap, { backgroundColor: C.bgElevated }]}>
        <Ionicons name={icon} size={48} color={C.iconSecondary} />
      </View>
      <Text style={[staticStyles.emptyTitle, { color: C.textPrimary }]} allowFontScaling={true}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[staticStyles.emptySubtitle, { color: C.textMuted }]} allowFontScaling={true}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={staticStyles.emptyAction}>{action}</View> : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickActionCard — 3-column grid action item
// Phase 6: icon + label, bgElevated, 12px radius
// ─────────────────────────────────────────────────────────────────────────────
interface QuickActionCardProps {
  icon: React.ReactNode;
  label: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function QuickActionCard({
  icon,
  label,
  onPress,
  style,
}: QuickActionCardProps) {
  const { scale, onPressIn, onPressOut } = useCardPress();
  const C = useColors();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          {
            backgroundColor: C.bgSurface,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: C.isDark ? C.redBorder : C.borderDefault,
            shadowColor: C.isDark ? '#C62229' : '#000000',
            shadowOffset: { width: 0, height: C.isDark ? 20 : 4 },
            shadowOpacity: C.isDark ? 0.15 : 0.08,
            shadowRadius: C.isDark ? 40 : 16,
            elevation: C.isDark ? 8 : 4,
            paddingVertical: 16,
            paddingHorizontal: spacing.space2,
            alignItems: 'center' as const,
          },
          pressed && { backgroundColor: C.bgElevated },
        ]}
      >
        <View style={staticStyles.quickActionIcon}>{icon}</View>
        <Text
          style={[staticStyles.quickActionLabel, { color: C.textSecondary }]}
          numberOfLines={2}
          allowFontScaling={false}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Static styles — geometry only, no colors (colors are applied inline via hook)
// ─────────────────────────────────────────────────────────────────────────────
const staticStyles = StyleSheet.create({
  // List card
  listCard: {
    gap: spacing.space3,
  },
  listThumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    overflow: 'hidden',
    flexShrink: 0,
  },
  listThumbImg: {
    width: '100%',
    height: '100%',
  },
  listThumbPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    ...typeScale.headingSM,
  },
  listSubtitle: {
    ...typeScale.bodySM,
  },
  listMeta: {
    ...typeScale.caption,
  },
  listTrailing: {
    alignItems: 'flex-end',
  },

  // Settings row
  settingsRow: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.space4,
    gap: spacing.space3,
  },
  settingsLabel: {
    ...typeScale.bodyMD,
    fontSize: 15,
    flex: 1,
  },
  settingsDivider: {
    height: 1,
    marginLeft: 48,
  },

  // Transaction card
  txCard: {
    gap: spacing.space3,
    paddingVertical: 14,
    marginBottom: spacing.space2,
  },
  txIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txContent: {
    flex: 1,
    gap: 2,
  },
  txTitle: {
    ...typeScale.headingSM,
    fontSize: 14,
  },
  txSubtitle: {
    ...typeScale.bodySM,
    fontSize: 12,
  },
  txTimestamp: {
    ...typeScale.caption,
  },
  txRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txAmount: {
    ...typeScale.headingSM,
    fontSize: 14,
    fontWeight: '700',
  },
  txBadge: {
    borderRadius: radius.radiusXS,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  txBadgeText: {
    ...typeScale.caption,
    fontSize: 10,
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.space6,
    paddingVertical: spacing.space10,
  },
  emptyIconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typeScale.headingMD,
    marginTop: spacing.space6,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typeScale.bodyMD,
    marginTop: spacing.space2,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyAction: {
    marginTop: spacing.space5,
  },

  // Quick action
  quickActionIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    ...typeScale.caption,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
});
