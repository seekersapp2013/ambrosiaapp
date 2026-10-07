/**
 * Ambrosia Design System — Spacing Tokens
 * Phase 3: 4px base grid
 *
 * All margins, paddings, and gaps must reference these tokens.
 * No raw pixel values in component code.
 */

export const spacing = {
  space1:  4,
  space2:  8,
  space3:  12,
  space4:  16,
  space5:  20,
  space6:  24,
  space8:  32,
  space10: 40,
  space12: 48,

  // Standard alias tokens
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,

  // Screen-level layout constants
  screenPaddingH:      20,   // standard horizontal screen padding
  scrollBottomPadding: 100,  // clears tab bar + safe area on standard devices
} as const;

export type SpacingToken = keyof typeof spacing;
