/**
 * Ambrosia Design System — Color Tokens
 * Phase 1 (raw palette) + Phase 19 (semantic layer)
 *
 * Rule: Never import _raw values in component code.
 * Always use the exported `Colors` semantic tokens.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw palette (private — do not use directly in components)
// ─────────────────────────────────────────────────────────────────────────────
const _raw = {
  // Backgrounds
  bg0a:    '#0a0a15',
  bg0f:    '#0f0f1e',
  bg14:    '#141428',

  // Red family
  red_primary:  '#C62229',
  red_bright:   '#E42326',
  red_deep:     '#B42733',
  red_crimson:  '#73141D',
  red_mid:      '#9A404B',
  red_coral:    '#D75D64',
  red_rose:     '#DB8588',
  red_blush:    '#EAAFB2',
  red_gold:     '#8B6830',

  // Red tints
  red_t06:  'rgba(198,34,41,0.06)',
  red_t12:  'rgba(198,34,41,0.12)',
  red_t15:  'rgba(198,34,41,0.15)',
  red_t25:  'rgba(198,34,41,0.25)',
  red_t30:  'rgba(198,34,41,0.30)',
  red_t35:  'rgba(198,34,41,0.35)',
  red_t55:  'rgba(198,34,41,0.55)',

  // Accent colors
  blue:    '#3B82F6',
  green:   '#22C55E',
  amber:   '#F59E0B',
  error:   '#EF4444',
  purple:  '#8B5CF6',

  // Accent tints
  blue_t10:   'rgba(59,130,246,0.10)',
  green_t07:  'rgba(34,197,94,0.07)',
  green_t12:  'rgba(34,197,94,0.12)',
  amber_t07:  'rgba(245,158,11,0.07)',
  error_t04:  'rgba(239,68,68,0.04)',
  error_t08:  'rgba(239,68,68,0.08)',
  error_t30:  'rgba(239,68,68,0.30)',
  error_t35:  'rgba(239,68,68,0.35)',
  error_t55:  'rgba(239,68,68,0.55)',
  gold_t25:   'rgba(139,104,48,0.25)',

  // Text
  white:   '#FFFFFF',
  gray_d1: '#D1D5DB',
  gray_9c: '#9CA3AF',
  gray_6b: '#6B7280',
  gray_37: '#374151',

  // Borders
  white_08: 'rgba(255,255,255,0.08)',
  white_12: 'rgba(255,255,255,0.12)',
  white_20: 'rgba(255,255,255,0.20)',

  // Overlays
  black_75: 'rgba(0,0,0,0.75)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Semantic tokens (public API — use these in all component code)
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // ── Background group ───────────────────────────────────────────────────────
  bgBase:           _raw.bg0a,
  bgSurface:        _raw.bg0f,
  bgElevated:       _raw.bg14,
  bgOverlay:        _raw.black_75,
  bgPrimarySubtle:  _raw.red_t06,
  bgPrimaryMid:     _raw.red_t12,
  bgErrorSubtle:    _raw.error_t04,
  bgSuccessSubtle:  _raw.green_t07,

  // ── Text group ─────────────────────────────────────────────────────────────
  textPrimary:    _raw.white,
  textSecondary:  _raw.gray_d1,
  textMuted:      _raw.gray_9c,
  textDisabled:   _raw.gray_6b,
  textInverse:    _raw.bg0a,
  textLink:       _raw.red_primary,
  textDanger:     _raw.error,
  textSuccess:    _raw.green,
  textWarning:    _raw.amber,
  textInfo:       _raw.blue,
  textGold:       _raw.red_gold,

  // ── Action group ───────────────────────────────────────────────────────────
  actionPrimary:          _raw.red_primary,
  actionPrimaryPressed:   _raw.red_deep,
  actionPrimaryDisabled:  _raw.red_t35,
  actionDestructive:      _raw.error,
  actionGhost:            'transparent' as const,
  actionSecondaryBorder:  _raw.white_20,

  // ── Status group ───────────────────────────────────────────────────────────
  statusSuccess:    _raw.green,
  statusWarning:    _raw.amber,
  statusDanger:     _raw.error,
  statusInfo:       _raw.blue,
  statusSuccessBg:  _raw.green_t12,
  statusWarningBg:  _raw.amber_t07,
  statusDangerBg:   _raw.error_t08,
  statusInfoBg:     _raw.blue_t10,

  // ── Border group ───────────────────────────────────────────────────────────
  borderDefault:   _raw.white_12,
  borderSubtle:    _raw.white_08,
  borderFocus:     _raw.red_t55,
  borderFilled:    _raw.red_t35,
  borderError:     _raw.error_t55,
  borderSelected:  _raw.red_primary,

  // ── Icon group ─────────────────────────────────────────────────────────────
  iconPrimary:   _raw.white,
  iconSecondary: _raw.gray_9c,
  iconDisabled:  _raw.gray_6b,
  iconOnColor:   _raw.white,
  iconAccent:    _raw.red_primary,
  iconGold:      _raw.red_gold,

  // ── Raw palette pass-throughs (for gradient stops, charts, etc.) ───────────
  // These are the only raw values permitted outside tokens/colors.ts,
  // and only for use cases where a semantic name doesn't apply (e.g. gradients).
  palette: {
    primary:       _raw.red_primary,
    primaryBright: _raw.red_bright,
    primaryDeep:   _raw.red_deep,
    primaryCrimson:_raw.red_crimson,
    primaryMid:    _raw.red_mid,
    primaryCoral:  _raw.red_coral,
    primaryRose:   _raw.red_rose,
    primaryBlush:  _raw.red_blush,
    primaryGold:   _raw.red_gold,
    blue:          _raw.blue,
    green:         _raw.green,
    amber:         _raw.amber,
    error:         _raw.error,
    purple:        _raw.purple,
    // Tints for gradients / decorative use
    redT06:        _raw.red_t06,
    redT12:        _raw.red_t12,
    redT15:        _raw.red_t15,
    redT25:        _raw.red_t25,
    redT30:        _raw.red_t30,
    errorT30:      _raw.error_t30,
    errorT35:      _raw.error_t35,
    goldT25:       _raw.gold_t25,
    // Neutral grays for rating stars, misc
    gray37:        _raw.gray_37,
  },

  // ── Backward-compat aliases (used by existing screens — do not remove) ────
  // These map old token names to their semantic equivalents.
  background:       _raw.bg0a,
  surface:          _raw.bg0f,
  surfaceElevated:  _raw.bg14,
  primary:          _raw.red_primary,
  primaryBright:    _raw.red_bright,
  primaryDeep:      _raw.red_deep,
  primaryCrimson:   _raw.red_crimson,
  primaryMid:       _raw.red_mid,
  primaryCoral:     _raw.red_coral,
  primaryRose:      _raw.red_rose,
  primaryBlush:     _raw.red_blush,
  primaryGold:      _raw.red_gold,
  blue:             _raw.blue,
  purple:           _raw.purple,
  green:            _raw.green,
  amber:            _raw.amber,
  error:            _raw.error,
  success:          _raw.green,
  warning:          _raw.amber,
  // Text compat
  textDim:          _raw.gray_6b,
  textFaint:        '#4B5563',
  // Border compat
  borderNeutral:    _raw.white_12,
  redBorder:        _raw.red_t25,
  redBorderActive:  _raw.red_t55,
  redSurface:       _raw.red_t06,
  redSurfaceMid:    _raw.red_t12,
  redSurfaceStrong: _raw.red_t15,
  // Accent tint compat
  blueSurface:      'rgba(59,130,246,0.07)',
  blueSurfaceMid:   'rgba(59,130,246,0.12)',
  blueBorder:       'rgba(59,130,246,0.28)',
  blueBorderActive: 'rgba(59,130,246,0.55)',
  purpleSurface:    'rgba(139,92,246,0.07)',
  purpleBorder:     'rgba(139,92,246,0.28)',
  greenSurface:     'rgba(34,197,94,0.07)',
  greenBorder:      'rgba(34,197,94,0.28)',
  amberSurface:     'rgba(245,158,11,0.07)',
  amberBorder:      'rgba(245,158,11,0.28)',
  goldSurface:      'rgba(139,104,48,0.08)',
  goldBorder:       'rgba(139,104,48,0.28)',
  errorSurface:     'rgba(239,68,68,0.08)',
  errorBorder:      'rgba(239,68,68,0.28)',
  // Gradient layer compat
  bgWarmLayer:      'rgba(26,15,31,0.55)',
  bgCoolLayer:      'rgba(15,20,32,0.45)',
  glowRed:          'rgba(198,34,41,0.07)',
  glowBlue:         'rgba(59,130,246,0.05)',
  overlay:          _raw.black_75,

  // ── Legacy Expo theming shim (keeps useThemeColor working) ────────────────
  light: {
    text:           _raw.white,
    background:     _raw.bg0a,
    tint:           _raw.red_primary,
    icon:           _raw.gray_9c,
    tabIconDefault: _raw.gray_6b,
    tabIconSelected:_raw.red_primary,
  },
  dark: {
    text:           _raw.white,
    background:     _raw.bg0a,
    tint:           _raw.red_primary,
    icon:           _raw.gray_9c,
    tabIconDefault: _raw.gray_6b,
    tabIconSelected:_raw.red_primary,
  },
} as const;

export type ColorToken = keyof Omit<typeof Colors, 'palette' | 'light' | 'dark'>;
