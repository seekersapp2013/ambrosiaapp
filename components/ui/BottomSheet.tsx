/**
 * Ambrosia Design System — Bottom Sheet / Modal
 * Phase 7: Overlay + sheet with drag handle, spring animation
 * Phase 17: Motion tokens
 * Phase 23: Z-index tokens
 * Accessibility: Phase 21 (focus trap)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { ForceDarkMode } from '@/context/ThemeContext';
import { radius } from '@/tokens/radius';
import { typeScale } from '@/tokens/typography';
import { spacing } from '@/tokens/spacing';
import { elevation } from '@/tokens/shadows';
import { duration } from '@/tokens/motion';
import { zIndex } from '@/tokens/zIndex';
import { useCardInsets } from '@/components/MobileCard';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  body?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Prevent closing by tapping the overlay */
  dismissable?: boolean;
  /** 'sheet' slides up from bottom (default); 'dialog' centers on screen */
  variant?: 'sheet' | 'dialog';
}

export function BottomSheet({
  visible,
  onClose,
  title,
  body,
  children,
  style,
  dismissable = true,
  variant = 'sheet',
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const cardInsets = useCardInsets();
  const C = useColors();
  const isDialog = variant === 'dialog';

  // Header uses dark navy, body uses themed surface
  const headerBg = '#0F0F1E';
  const headerText = '#FFFFFF';
  const headerBorder = 'rgba(255,255,255,0.08)';

  // Sheet animation
  const translateY = useRef(new Animated.Value(600)).current;
  // Dialog animation
  const dialogOpacity = useRef(new Animated.Value(0)).current;
  const dialogScale = useRef(new Animated.Value(0.92)).current;
  // Shared overlay
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (isDialog) {
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 1, duration: duration.normal, useNativeDriver: true,
          }),
          Animated.timing(dialogOpacity, {
            toValue: 1, duration: duration.normal, useNativeDriver: true,
          }),
          Animated.spring(dialogScale, {
            toValue: 1, useNativeDriver: true, damping: 20, stiffness: 200,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0, useNativeDriver: true, damping: 22, stiffness: 120,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 1, duration: duration.normal, useNativeDriver: true,
          }),
        ]).start();
      }
    } else {
      if (isDialog) {
        Animated.parallel([
          Animated.timing(overlayOpacity, {
            toValue: 0, duration: duration.fast, useNativeDriver: true,
          }),
          Animated.timing(dialogOpacity, {
            toValue: 0, duration: duration.fast, useNativeDriver: true,
          }),
          Animated.timing(dialogScale, {
            toValue: 0.92, duration: duration.fast, useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 600, duration: duration.slow, useNativeDriver: true,
          }),
          Animated.timing(overlayOpacity, {
            toValue: 0, duration: duration.normal, useNativeDriver: true,
          }),
        ]).start();
      }
    }
  }, [visible]);

  if (isDialog) {
    // ── Centered dialog ──────────────────────────────────────────────────────
    // Single full-screen container: overlay tap-to-dismiss + centered card
    // as siblings so z-ordering and touch handling work correctly.
    return (
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        {/* Full-screen overlay — tapping it dismisses */}
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          {dismissable ? (
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityLabel="Close dialog"
            />
          ) : (
            <View style={StyleSheet.absoluteFill} />
          )}
        </Animated.View>

        {/* Centered card — sits above overlay via absolute centering */}
        <View
          style={[styles.dialogCentering, { paddingHorizontal: cardInsets.left || spacing.screenPaddingH }]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.dialog,
              elevation.elevation4,
              { backgroundColor: C.bgSurface, borderColor: C.borderSubtle },
              {
                opacity: dialogOpacity,
                transform: [{ scale: dialogScale }],
              },
              style,
            ]}
          >
            {title ? (
              <Text style={[styles.sheetTitle, { color: C.textPrimary }]} allowFontScaling={false}>
                {title}
              </Text>
            ) : null}
            {body ? (
              <Text style={[styles.sheetBody, { color: C.textMuted }]} allowFontScaling={true}>
                {body}
              </Text>
            ) : null}
            {children}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // ── Bottom sheet ─────────────────────────────────────────────────────────
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        {dismissable ? (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityLabel="Close sheet"
          />
        ) : (
          <View style={StyleSheet.absoluteFill} />
        )}
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          elevation.elevation4,
          { paddingBottom: spacing.space5 + insets.bottom },
          { left: cardInsets.left, right: cardInsets.right },
          { transform: [{ translateY }], zIndex: zIndex.bottomSheet },
          style,
        ]}
      >
        {/* Dark header section with handle + title */}
        <View style={styles.sheetHeaderSection}>
          <View style={styles.handle} />
          {title ? (
            <Text style={[styles.sheetTitle, { color: headerText }]} allowFontScaling={false}>
              {title}
            </Text>
          ) : null}
        </View>
        <ForceDarkMode>
          {body ? (
            <Text style={[styles.sheetBody, { color: C.textMuted }]} allowFontScaling={true}>
              {body}
            </Text>
          ) : null}
          {children}
        </ForceDarkMode>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.60)',
    zIndex: zIndex.overlay,
  },

  // ── Bottom sheet ──
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F0F1E',
    borderTopLeftRadius: radius.radius2XL,
    borderTopRightRadius: radius.radius2XL,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: 0,
  },
  sheetHeaderSection: {
    marginHorizontal: -spacing.screenPaddingH,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.space3,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderTopLeftRadius: radius.radius2XL,
    borderTopRightRadius: radius.radius2XL,
    marginBottom: spacing.space3,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignSelf: 'center',
    marginBottom: spacing.space3,
  },

  // ── Centered dialog ──
  dialogCentering: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPaddingH,
    zIndex: zIndex.bottomSheet,
  },
  dialog: {
    width: '100%',
    borderRadius: radius.radiusXL,
    paddingHorizontal: spacing.screenPaddingH,
    paddingTop: spacing.space6,
    paddingBottom: spacing.space5,
    borderWidth: 1,
  },

  // ── Shared text ──
  sheetTitle: {
    ...typeScale.headingMD,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.space2,
  },
  sheetBody: {
    ...typeScale.bodyMD,
    textAlign: 'center',
    marginBottom: spacing.space6,
  },
});
