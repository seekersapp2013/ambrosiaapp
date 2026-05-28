/**
 * Ambrosia Design System — Card Components
 * Phase 6: All card variants with press states (Phase 20)
 * Accessibility: Phase 21
 * Motion: Phase 17 (card press scale 0.97)
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
import { Colors } from '@/tokens/colors';
import { radius } from '@/tokens/radius';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { elevation } from '@/tokens/shadows';
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

  if (!onPress) {
    return (
      <View
        style={[
          styles.card,
          style,
        ]}
      >
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
          styles.card,
          pressed && styles.cardPressed,
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
  const thumbSource =
    typeof thumbnail === 'string' ? { uri: thumbnail } : thumbnail;

  return (
    <BaseCard
      onPress={onPress}
      style={[styles.listCard, style]}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {/* Thumbnail */}
      <View style={styles.listThumb}>
        {thumbSource ? (
          <Image
            source={thumbSource}
            style={styles.listThumbImg}
            resizeMode="cover"
            accessible={false}
          />
        ) : (
          <View style={styles.listThumbPlaceholder}>
            <Ionicons name={thumbnailFallbackIcon} size={24} color={Colors.iconSecondary} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.listContent}>
        <Text style={styles.listTitle} numberOfLines={1} allowFontScaling={true}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listSubtitle} numberOfLines={1} allowFontScaling={true}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.listMeta} numberOfLines={1} allowFontScaling={true}>
            {meta}
          </Text>
        ) : null}
      </View>

      {/* Trailing */}
      {trailing ? (
        <View style={styles.listTrailing}>{trailing}</View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={Colors.iconDisabled} />
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
  iconColor = Colors.iconAccent,
  trailing,
  showChevron = true,
  onPress,
  isLast = false,
  isDestructive = false,
  style,
}: SettingsRowProps) {
  const { scale, onPressIn, onPressOut } = useCardPress();

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
            styles.settingsRow,
            pressed && styles.cardPressed,
            style,
          ]}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
          <Text
            style={[
              styles.settingsLabel,
              isDestructive && { color: Colors.textDanger },
            ]}
            allowFontScaling={true}
          >
            {label}
          </Text>
          {trailing ?? (
            isDestructive ? null : showChevron ? (
              <Ionicons name="chevron-forward" size={16} color={Colors.iconDisabled} />
            ) : null
          )}
        </Pressable>
      </Animated.View>
      {!isLast ? <View style={styles.settingsDivider} /> : null}
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
  amountColor = Colors.actionPrimary,
  status,
  statusColor = Colors.statusSuccess,
  statusBg = Colors.statusSuccessBg,
  icon,
  iconColor = Colors.actionPrimary,
  iconBg = Colors.bgPrimaryMid,
  timestamp,
  onPress,
  style,
}: TransactionCardProps) {
  return (
    <BaseCard onPress={onPress} style={[styles.txCard, style]} accessibilityLabel={title}>
      <View style={[styles.txIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.txContent}>
        <Text style={styles.txTitle} numberOfLines={1} allowFontScaling={true}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.txSubtitle} numberOfLines={1} allowFontScaling={true}>
            {subtitle}
          </Text>
        ) : null}
        {timestamp ? (
          <Text style={styles.txTimestamp} allowFontScaling={true}>
            {timestamp}
          </Text>
        ) : null}
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: amountColor }]} allowFontScaling={false}>
          {amount}
        </Text>
        {status ? (
          <View style={[styles.txBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.txBadgeText, { color: statusColor }]} allowFontScaling={false}>
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
  return (
    <View style={[styles.emptyContainer, style]}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name={icon} size={48} color={Colors.iconSecondary} />
      </View>
      <Text style={styles.emptyTitle} allowFontScaling={true}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.emptySubtitle} allowFontScaling={true}>
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
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

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.quickAction,
          pressed && styles.cardPressed,
        ]}
      >
        <View style={styles.quickActionIcon}>{icon}</View>
        <Text style={styles.quickActionLabel} numberOfLines={2} allowFontScaling={false}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Base card
  card: {
    backgroundColor: 'rgba(10, 10, 21, 0.97)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 34, 41, 0.3)',
    shadowColor: '#C62229',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
    padding: spacing.space4,
    marginBottom: spacing.space3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardPressed: {
    backgroundColor: Colors.bgElevated,
  },

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
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    gap: 4,
  },
  listTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
  },
  listSubtitle: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },
  listMeta: {
    ...typeScale.caption,
    color: Colors.textDisabled,
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
    backgroundColor: 'rgba(10, 10, 21, 0.97)',
  },
  settingsLabel: {
    ...typeScale.bodyMD,
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    color: Colors.textPrimary,
  },
  txSubtitle: {
    ...typeScale.bodySM,
    fontSize: 12,
    color: Colors.textMuted,
  },
  txTimestamp: {
    ...typeScale.caption,
    color: Colors.textDisabled,
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
    backgroundColor: Colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    marginTop: spacing.space6,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    marginTop: spacing.space2,
    textAlign: 'center',
    maxWidth: 260,
  },
  emptyAction: {
    marginTop: spacing.space5,
  },

  // Quick action
  quickAction: {
    backgroundColor: 'rgba(10, 10, 21, 0.97)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(198, 34, 41, 0.3)',
    shadowColor: '#C62229',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 8,
    paddingVertical: 16,
    paddingHorizontal: spacing.space2,
    alignItems: 'center',
  },
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
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
});
