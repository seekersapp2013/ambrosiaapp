/**
 * Ambrosia Design System — Border Radius Tokens
 * Phase 3
 *
 * Usage:
 *   import { radius } from '@/tokens/radius';
 *   borderRadius: radius.radiusLG
 */

export const radius = {
  radiusXS:   6,
  radiusSM:   8,
  radiusMD:   12,
  radiusLG:   16,
  radiusXL:   20,
  radius2XL:  24,
  radiusFull: 999,

  // Standard alias tokens
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;
