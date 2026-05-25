/**
 * Ambrosia Design System — Responsive Device Class Hook
 * Phase 22
 *
 * Returns the current device class based on screen width.
 * Use this to drive responsive padding, grid columns, hero heights, etc.
 *
 * Usage:
 *   import { useDeviceClass, useScreenPadding } from '@/utils/useDeviceClass';
 *
 *   const deviceClass = useDeviceClass();
 *   const paddingH = useScreenPadding();
 */

import { useWindowDimensions } from 'react-native';

export type DeviceClass = 'small' | 'standard' | 'large' | 'tablet';

/**
 * Breakpoints:
 *   small    ≤ 360px  — iPhone SE, older Android
 *   standard 361–430px — iPhone 14, Pixel 7, Galaxy S23
 *   large    431–767px — iPhone 14 Plus/Pro Max
 *   tablet   ≥ 768px  — iPad, large Android tablets
 */
export function useDeviceClass(): DeviceClass {
  const { width } = useWindowDimensions();
  if (width <= 360) return 'small';
  if (width <= 430) return 'standard';
  if (width <= 767) return 'large';
  return 'tablet';
}

// ─────────────────────────────────────────────────────────────────────────────
// Derived responsive values
// ─────────────────────────────────────────────────────────────────────────────

/** Horizontal screen padding per device class */
export function useScreenPadding(): number {
  const cls = useDeviceClass();
  const map: Record<DeviceClass, number> = {
    small:    16,
    standard: 20,
    large:    24,
    tablet:   40,
  };
  return map[cls];
}

/** Scroll content bottom padding per device class */
export function useScrollBottomPadding(): number {
  const cls = useDeviceClass();
  const map: Record<DeviceClass, number> = {
    small:    88,
    standard: 100,
    large:    100,
    tablet:   80,
  };
  return map[cls];
}

/** Hero section height per device class */
export function useHeroHeight(): number {
  const cls = useDeviceClass();
  const map: Record<DeviceClass, number> = {
    small:    180,
    standard: 220,
    large:    260,
    tablet:   300,
  };
  return map[cls];
}

/** Bottom tab bar height per device class (excluding safe area inset) */
export function useTabBarHeight(): number {
  const cls = useDeviceClass();
  const map: Record<DeviceClass, number> = {
    small:    60,
    standard: 64,
    large:    64,
    tablet:   72,
  };
  return map[cls];
}

/** Number of grid columns for specialty/category grids */
export function useGridColumns(
  grid: 'specialty' | 'quickAction' | 'medicine' | 'hospital',
): number {
  const cls = useDeviceClass();

  const maps: Record<typeof grid, Record<DeviceClass, number>> = {
    specialty:   { small: 1, standard: 2, large: 2, tablet: 3 },
    quickAction: { small: 3, standard: 3, large: 3, tablet: 4 },
    medicine:    { small: 1, standard: 2, large: 2, tablet: 3 },
    hospital:    { small: 1, standard: 2, large: 2, tablet: 3 },
  };

  return maps[grid][cls];
}
