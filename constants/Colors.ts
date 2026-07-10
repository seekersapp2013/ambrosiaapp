/**
 * Ambrosia Design System — Color Constants
 *
 * This file is a compatibility shim.
 * All color values now live in tokens/colors.ts.
 *
 * ⚠️  DEPRECATED: Use `useColors()` hook in components instead.
 * Existing imports of `Colors` from this path continue to work unchanged
 * but always resolve to dark-mode values.
 */

/** @deprecated Use `useColors()` hook instead */
export { Colors, getColors } from '@/tokens/colors';
export type { ColorToken } from '@/tokens/colors';
