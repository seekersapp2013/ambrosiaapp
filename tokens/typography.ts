/**
 * Ambrosia Design System — Typography Tokens
 * Phase 2: Type scale, font family, and font scaling policy
 *
 * Usage:
 *   import { typeScale, fontFamily, allowFontScaling } from '@/tokens/typography';
 *
 *   <Text
 *     style={[typeScale.bodyMD, { color: Colors.textSecondary }]}
 *     allowFontScaling={allowFontScaling.bodyMD}
 *   />
 */

// ─────────────────────────────────────────────────────────────────────────────
// Font family
// ─────────────────────────────────────────────────────────────────────────────
// Roboto (v2 "Navy Health" rebrand). Roboto has no 600 weight, so `semiBold`
// maps to the 500 Medium face. Loaded via @expo-google-fonts/roboto in _layout.
export const fontFamily = {
  regular:  'Roboto_400Regular',
  medium:   'Roboto_500Medium',
  semiBold: 'Roboto_500Medium',
  bold:     'Roboto_700Bold',
} as const;

// Maps a numeric/string fontWeight to the matching Roboto family name.
// Use when you need the correct Roboto face for a given weight.
export function robotoFamilyForWeight(
  weight?: string | number
): string {
  const w = typeof weight === 'number' ? String(weight) : weight;
  switch (w) {
    case '700':
    case 'bold':
      return fontFamily.bold;
    case '600':
    case '500':
    case 'medium':
      return fontFamily.medium;
    default:
      return fontFamily.regular;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type scale
// Each entry is a plain style object — spread directly into StyleSheet or Text.
// ─────────────────────────────────────────────────────────────────────────────
export const typeScale = {
  displayLarge: {
    fontSize:      32,
    fontWeight:    '700' as const,
    lineHeight:    40,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize:      28,
    fontWeight:    '700' as const,
    lineHeight:    36,
    letterSpacing: -0.3,
  },
  headingXL: {
    fontSize:      24,
    fontWeight:    '700' as const,
    lineHeight:    32,
    letterSpacing: -0.2,
  },
  headingLG: {
    fontSize:      20,
    fontWeight:    '700' as const,
    lineHeight:    28,
    letterSpacing: -0.1,
  },
  headingMD: {
    fontSize:      18,
    fontWeight:    '600' as const,
    lineHeight:    26,
    letterSpacing: 0,
  },
  headingSM: {
    fontSize:      16,
    fontWeight:    '600' as const,
    lineHeight:    24,
    letterSpacing: 0,
  },
  bodyLG: {
    fontSize:      16,
    fontWeight:    '400' as const,
    lineHeight:    24,
    letterSpacing: 0,
  },
  bodyMD: {
    fontSize:      14,
    fontWeight:    '400' as const,
    lineHeight:    22,
    letterSpacing: 0,
  },
  bodySM: {
    fontSize:      13,
    fontWeight:    '400' as const,
    lineHeight:    20,
    letterSpacing: 0,
  },
  labelLG: {
    fontSize:      16,
    fontWeight:    '600' as const,
    lineHeight:    20,
    letterSpacing: 0.1,
  },
  labelMD: {
    fontSize:      14,
    fontWeight:    '600' as const,
    lineHeight:    18,
    letterSpacing: 0.1,
  },
  labelSM: {
    fontSize:      12,
    fontWeight:    '500' as const,
    lineHeight:    16,
    letterSpacing: 0.2,
  },
  caption: {
    fontSize:      11,
    fontWeight:    '400' as const,
    lineHeight:    16,
    letterSpacing: 0.3,
  },
  overline: {
    fontSize:      11,
    fontWeight:    '600' as const,
    lineHeight:    14,
    letterSpacing: 1.0,
  },

  // Aliases for compatibility
  titleSmall: {
    fontSize:      16,
    fontWeight:    '600' as const,
    lineHeight:    24,
    letterSpacing: 0,
  },
  titleMedium: {
    fontSize:      18,
    fontWeight:    '600' as const,
    lineHeight:    26,
    letterSpacing: 0,
  },
  titleLarge: {
    fontSize:      20,
    fontWeight:    '700' as const,
    lineHeight:    28,
    letterSpacing: -0.1,
  },
  bodySmall: {
    fontSize:      13,
    fontWeight:    '400' as const,
    lineHeight:    20,
    letterSpacing: 0,
  },
  bodyMedium: {
    fontSize:      14,
    fontWeight:    '400' as const,
    lineHeight:    22,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontSize:      16,
    fontWeight:    '400' as const,
    lineHeight:    24,
    letterSpacing: 0,
  },
  labelSmall: {
    fontSize:      12,
    fontWeight:    '500' as const,
    lineHeight:    16,
    letterSpacing: 0.2,
  },
  labelMedium: {
    fontSize:      14,
    fontWeight:    '600' as const,
    lineHeight:    18,
    letterSpacing: 0.1,
  },
  labelLarge: {
    fontSize:      16,
    fontWeight:    '600' as const,
    lineHeight:    20,
    letterSpacing: 0.1,
  },
} as const;

export type TypeScaleToken = keyof typeof typeScale;

// ─────────────────────────────────────────────────────────────────────────────
// Font scaling policy (Phase 21)
// false = allowFontScaling={false} — layout-critical, must not resize
// true  = scales with system accessibility font size setting
// ─────────────────────────────────────────────────────────────────────────────
export const allowFontScaling: Record<TypeScaleToken, boolean> = {
  displayLarge:  false,
  displayMedium: false,
  headingXL:     false,
  headingLG:     false,
  headingMD:     true,
  headingSM:     true,
  bodyLG:        true,
  bodyMD:        true,
  bodySM:        true,
  labelLG:       false,
  labelMD:       false,
  labelSM:       false,
  caption:       true,
  overline:      true,

  titleSmall:    true,
  titleMedium:   true,
  titleLarge:    false,
  bodySmall:     true,
  bodyMedium:    true,
  bodyLarge:     true,
  labelSmall:    false,
  labelMedium:   false,
  labelLarge:    false,
};
