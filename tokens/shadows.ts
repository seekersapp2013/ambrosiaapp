/**
 * Ambrosia Design System — Shadow & Elevation Tokens
 * Phase 18
 *
 * Usage:
 *   import { elevation, coloredShadow } from '@/tokens/shadows';
 *
 *   // Neutral card
 *   style={[styles.card, elevation.elevation2]}
 *
 *   // Primary CTA button
 *   style={[styles.btn, elevation.elevation2, coloredShadow.shadowPrimary]}
 *
 * Rules:
 *   - Never apply a colored shadow to a neutral-background card.
 *   - Never mix elevation4 with a colored shadow.
 *   - On Android, the `elevation` prop (integer) is included as a fallback.
 */

import { Platform } from 'react-native';

// ─────────────────────────────────────────────────────────────────────────────
// Neutral elevation levels
// ─────────────────────────────────────────────────────────────────────────────
export const elevation = {
  elevation0: {},

  elevation1: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.20,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.20,
      shadowRadius: 4,
    },
  }),

  elevation2: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.30,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.30,
      shadowRadius: 8,
    },
  }),

  elevation3: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.40,
      shadowRadius: 20,
    },
    android: { elevation: 6 },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.40,
      shadowRadius: 20,
    },
  }),

  elevation4: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 32,
    },
    android: { elevation: 8 },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.55,
      shadowRadius: 32,
    },
  }),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Colored shadow variants
// Only for use on primary-colored surfaces (buttons, balance card, promo card).
// ─────────────────────────────────────────────────────────────────────────────
export const coloredShadow = {
  shadowPrimary: Platform.select({
    ios: {
      shadowColor: '#C62229',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#C62229',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
    },
  }),

  shadowPrimaryStrong: Platform.select({
    ios: {
      shadowColor: '#C62229',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.30,
      shadowRadius: 32,
    },
    android: { elevation: 6 },
    default: {
      shadowColor: '#C62229',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.30,
      shadowRadius: 32,
    },
  }),

  shadowDestructive: Platform.select({
    ios: {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 16,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 16,
    },
  }),

  shadowGold: Platform.select({
    ios: {
      shadowColor: '#8B6830',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
    android: { elevation: 4 },
    default: {
      shadowColor: '#8B6830',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
  }),
} as const;

export type ElevationToken = keyof typeof elevation;
export type ColoredShadowToken = keyof typeof coloredShadow;
