/**
 * Ambrosia Design System — Color Tokens
 * Phase 1 (raw palette) + Phase 19 (semantic layer) + Phase 21 (light mode overhaul)
 *
 * Rule: Never import _raw values in component code.
 * Always use the exported semantic tokens via useColors() hook.
 *
 * Backward compat: `Colors` still exports the dark token set so existing
 * imports continue to work unchanged until migrated to useColors().
 */

// ─────────────────────────────────────────────────────────────────────────────
// Raw palette (private — do not use directly in components)
// ─────────────────────────────────────────────────────────────────────────────
const _raw = {
  // ── Dark backgrounds ───────────────────────────────────────────────────────
  bg08:    '#08080F',   // slightly deeper base for more dark-mode depth
  bg0f:    '#0F0F1E',
  bg17:    '#171730',   // elevated surfaces — clearly distinct from bg0f

  // ── Light backgrounds ──────────────────────────────────────────────────────
  // Pages use ~30% of the primary red mixed with white for a warm branded feel.
  // Cards are slightly lighter to still pop against the page.
  lightPage:      '#F2D4D6',   // page / screen background — 30% primary on white
  lightCard:      '#FAE9EA',   // cards, surfaces — lighter blush (15% primary)
  lightElevated:  '#FFF5F5',   // modals, elevated cards — very faint blush (not pure white)
  lightInput:     '#F5DCDE',   // input field fill — between page and card (rose tint)

  // ── Brand gradient stops (hero band in light mode) ─────────────────────────
  gradientPink:    '#FF6EB4',
  gradientMid:     '#EBE9F4',
  gradientCyan:    '#4DD9E0',

  // ── Brand red — constant across both modes ─────────────────────────────────
  red_primary:  '#C62229',
  red_bright:   '#E42326',
  red_deep:     '#B42733',
  red_crimson:  '#73141D',
  red_mid:      '#9A404B',
  red_coral:    '#D75D64',
  red_rose:     '#DB8588',
  red_blush:    '#EAAFB2',
  red_gold:     '#8B6830',

  // ── Red tints ──────────────────────────────────────────────────────────────
  red_t06:  'rgba(198,34,41,0.06)',
  red_t12:  'rgba(198,34,41,0.12)',
  red_t15:  'rgba(198,34,41,0.15)',
  red_t25:  'rgba(198,34,41,0.25)',
  red_t30:  'rgba(198,34,41,0.30)',
  red_t35:  'rgba(198,34,41,0.35)',
  red_t55:  'rgba(198,34,41,0.55)',

  // ── Accent colors ──────────────────────────────────────────────────────────
  blue:    '#3B82F6',
  green:   '#22C55E',
  amber:   '#F59E0B',
  error:   '#EF4444',
  purple:  '#8B5CF6',

  // ── Accent tints ──────────────────────────────────────────────────────────
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

  // ── Dark text ──────────────────────────────────────────────────────────────
  white:   '#FFFFFF',
  gray_d1: '#D1D5DB',
  gray_9c: '#9CA3AF',
  gray_6b: '#6B7280',
  gray_37: '#374151',

  // ── Light text — near-black hierarchy, WCAG AA on white ──────────────────
  ltext_primary:   '#111827',   // ~17:1 on white — headings, body
  ltext_secondary: '#374151',   // ~10:1 on white — secondary text
  ltext_muted:     '#6B7280',   // ~5.7:1 on white — captions, timestamps
  ltext_disabled:  '#9CA3AF',   // ~3:1 — intentionally low (disabled)

  // ── Dark borders ──────────────────────────────────────────────────────────
  white_08: 'rgba(255,255,255,0.08)',
  white_12: 'rgba(255,255,255,0.12)',
  white_20: 'rgba(255,255,255,0.20)',

  // ── Light borders ─────────────────────────────────────────────────────────
  lborder:        'rgba(0,0,0,0.08)',    // card hairline on light page
  lborder_subtle: 'rgba(0,0,0,0.05)',   // dividers
  lborder_focus:  '#C62229',            // focused input — brand red

  // ── Overlays ──────────────────────────────────────────────────────────────
  black_75: 'rgba(0,0,0,0.75)',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Shared palette pass-throughs (identical in both modes)
// ─────────────────────────────────────────────────────────────────────────────
const _palette = {
  primary:        _raw.red_primary,
  primaryBright:  _raw.red_bright,
  primaryDeep:    _raw.red_deep,
  primaryCrimson: _raw.red_crimson,
  primaryMid:     _raw.red_mid,
  primaryCoral:   _raw.red_coral,
  primaryRose:    _raw.red_rose,
  primaryBlush:   _raw.red_blush,
  primaryGold:    _raw.red_gold,
  blue:           _raw.blue,
  green:          _raw.green,
  amber:          _raw.amber,
  error:          _raw.error,
  purple:         _raw.purple,
  redT06:         _raw.red_t06,
  redT12:         _raw.red_t12,
  redT15:         _raw.red_t15,
  redT25:         _raw.red_t25,
  redT30:         _raw.red_t30,
  errorT30:       _raw.error_t30,
  errorT35:       _raw.error_t35,
  goldT25:        _raw.gold_t25,
  gray37:         _raw.gray_37,
  // Gradient stops — used by hero band and AppBackground
  gradientPink:   _raw.gradientPink,
  gradientMid:    _raw.gradientMid,
  gradientCyan:   _raw.gradientCyan,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DARK token set  (existing behaviour — backward compatible)
// ─────────────────────────────────────────────────────────────────────────────
export const DarkColors = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  bgBase:           _raw.bg08,    // slightly deeper for more contrast
  bgSurface:        _raw.bg0f,
  bgElevated:       _raw.bg17,    // lighter so elevated cards read distinctly
  bgOverlay:        _raw.black_75,
  bgPrimarySubtle:  _raw.red_t06,
  bgPrimaryMid:     _raw.red_t12,
  bgErrorSubtle:    _raw.error_t04,
  bgSuccessSubtle:  _raw.green_t07,
  bgInput:          _raw.bg17,    // inputs sit on bgElevated tone

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary:    _raw.white,
  textSecondary:  _raw.gray_d1,
  textMuted:      _raw.gray_9c,
  textDisabled:   _raw.gray_6b,
  textInverse:    _raw.bg08,
  textLink:       _raw.red_primary,
  textDanger:     _raw.error,
  textSuccess:    _raw.green,
  textWarning:    _raw.amber,
  textInfo:       _raw.blue,
  textGold:       _raw.red_gold,

  // ── Actions ────────────────────────────────────────────────────────────────
  actionPrimary:          _raw.red_primary,
  actionPrimaryPressed:   _raw.red_deep,
  actionPrimaryDisabled:  _raw.red_t35,
  actionDestructive:      _raw.error,
  actionGhost:            'transparent' as const,
  actionSecondaryBorder:  _raw.white_20,

  // ── Status ─────────────────────────────────────────────────────────────────
  statusSuccess:    _raw.green,
  statusWarning:    _raw.amber,
  statusDanger:     _raw.error,
  statusInfo:       _raw.blue,
  statusSuccessBg:  _raw.green_t12,
  statusWarningBg:  _raw.amber_t07,
  statusDangerBg:   _raw.error_t08,
  statusInfoBg:     _raw.blue_t10,

  // ── Borders ────────────────────────────────────────────────────────────────
  borderDefault:   _raw.white_12,
  borderSubtle:    _raw.white_08,
  borderFocus:     _raw.red_t55,
  borderFilled:    _raw.red_t35,
  borderError:     _raw.error_t55,
  borderSelected:  _raw.red_primary,

  // ── Icons ──────────────────────────────────────────────────────────────────
  iconPrimary:   _raw.white,
  iconSecondary: _raw.gray_9c,
  iconDisabled:  _raw.gray_6b,
  iconOnColor:   _raw.white,
  iconAccent:    _raw.red_primary,
  iconGold:      _raw.red_gold,

  // ── Tab bar ────────────────────────────────────────────────────────────────
  // Distinct from card bg so the bar reads as a separate layer
  bgTabBar:        '#0D0D20',
  borderTabBar:    'rgba(198,34,41,0.35)',   // stronger crimson top border

  // ── Engagement row surface ─────────────────────────────────────────────────
  bgEngagement:    _raw.bg0f,   // same as surface in dark mode

  // ── Palette pass-through ───────────────────────────────────────────────────
  palette: _palette,

  // ── Backward-compat aliases ────────────────────────────────────────────────
  background:       _raw.bg08,
  surface:          _raw.bg0f,
  surfaceElevated:  _raw.bg17,
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
  textDim:          _raw.gray_6b,
  textFaint:        '#4B5563',
  borderNeutral:    _raw.white_12,
  redBorder:        _raw.red_t25,
  redBorderActive:  _raw.red_t55,
  redSurface:       _raw.red_t06,
  redSurfaceMid:    _raw.red_t12,
  redSurfaceStrong: _raw.red_t15,
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
  bgWarmLayer:      'rgba(26,15,31,0.55)',
  bgCoolLayer:      'rgba(15,20,32,0.45)',
  glowRed:          'rgba(198,34,41,0.07)',
  glowBlue:         'rgba(59,130,246,0.05)',
  overlay:          _raw.black_75,

  // ── Legacy Expo shim ───────────────────────────────────────────────────────
  light: {
    text:            _raw.white,
    background:      _raw.bg08,
    tint:            _raw.red_primary,
    icon:            _raw.gray_9c,
    tabIconDefault:  _raw.gray_6b,
    tabIconSelected: _raw.red_primary,
  },
  dark: {
    text:            _raw.white,
    background:      _raw.bg08,
    tint:            _raw.red_primary,
    icon:            _raw.gray_9c,
    tabIconDefault:  _raw.gray_6b,
    tabIconSelected: _raw.red_primary,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT token set  (complete overhaul — solid white cards on grey page)
// ─────────────────────────────────────────────────────────────────────────────
export const LightColors = {
  // ── Backgrounds ────────────────────────────────────────────────────────────
  // The page sits on a soft warm-grey; solid white cards pop cleanly above it.
  bgBase:           _raw.lightPage,    // #F5F6FA — page background
  bgSurface:        _raw.lightCard,    // #FFFFFF — cards, panels
  bgElevated:       _raw.lightElevated,// #FFFFFF — modals, dropdowns
  bgOverlay:        'rgba(0,0,0,0.45)',
  bgPrimarySubtle:  'rgba(198,34,41,0.06)',
  bgPrimaryMid:     'rgba(198,34,41,0.11)',
  bgErrorSubtle:    'rgba(239,68,68,0.06)',
  bgSuccessSubtle:  'rgba(34,197,94,0.08)',
  bgInput:          _raw.lightInput,   // #F0F1F5 — flat grey input fill

  // ── Text ───────────────────────────────────────────────────────────────────
  // Standard neutral hierarchy — maximum legibility on white
  textPrimary:    _raw.ltext_primary,    // #111827
  textSecondary:  _raw.ltext_secondary,  // #374151
  textMuted:      _raw.ltext_muted,      // #6B7280
  textDisabled:   _raw.ltext_disabled,   // #9CA3AF
  textInverse:    _raw.white,
  textLink:       '#C62229',             // brand red links
  textDanger:     '#DC2626',
  textSuccess:    '#16A34A',
  textWarning:    '#D97706',
  textInfo:       '#2563EB',
  textGold:       _raw.red_gold,

  // ── Actions ────────────────────────────────────────────────────────────────
  actionPrimary:          _raw.red_primary,
  actionPrimaryPressed:   _raw.red_deep,
  actionPrimaryDisabled:  'rgba(198,34,41,0.35)',
  actionDestructive:      '#DC2626',
  actionGhost:            'transparent' as const,
  actionSecondaryBorder:  _raw.lborder,

  // ── Status ─────────────────────────────────────────────────────────────────
  statusSuccess:    '#16A34A',
  statusWarning:    '#D97706',
  statusDanger:     '#DC2626',
  statusInfo:       '#2563EB',
  statusSuccessBg:  'rgba(22,163,74,0.10)',
  statusWarningBg:  'rgba(217,119,6,0.10)',
  statusDangerBg:   'rgba(220,38,38,0.10)',
  statusInfoBg:     'rgba(37,99,235,0.10)',

  // ── Borders ────────────────────────────────────────────────────────────────
  borderDefault:   _raw.lborder,          // rgba(0,0,0,0.08) — hairline on cards
  borderSubtle:    _raw.lborder_subtle,   // rgba(0,0,0,0.05) — dividers
  borderFocus:     _raw.lborder_focus,    // #C62229 — brand red on focus
  borderFilled:    'rgba(198,34,41,0.25)',
  borderError:     '#DC2626',
  borderSelected:  _raw.red_primary,

  // ── Icons ──────────────────────────────────────────────────────────────────
  iconPrimary:   _raw.ltext_primary,
  iconSecondary: _raw.ltext_secondary,
  iconDisabled:  _raw.ltext_disabled,
  iconOnColor:   _raw.white,
  iconAccent:    _raw.red_primary,
  iconGold:      _raw.red_gold,

  // ── Tab bar ────────────────────────────────────────────────────────────────
  // In light mode, nav bars use the dark-mode surface for strong contrast
  bgTabBar:      '#0F0F1E',             // dark navy — same as dark mode surface
  borderTabBar:  'rgba(198,34,41,0.35)',// crimson top border for brand presence

  // ── Engagement row surface ─────────────────────────────────────────────────
  bgEngagement:  '#0F0F1E',   // dark navy — matches dark mode for contrast

  // ── Palette pass-through (same in both modes) ──────────────────────────────
  palette: _palette,

  // ── Backward-compat aliases ───────────────────────────────────────────────
  background:       _raw.lightPage,
  surface:          _raw.lightCard,
  surfaceElevated:  _raw.lightElevated,
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
  error:            '#DC2626',
  success:          '#16A34A',
  warning:          '#D97706',
  textDim:          _raw.ltext_muted,
  textFaint:        _raw.ltext_disabled,
  borderNeutral:    _raw.lborder,
  redBorder:        'rgba(198,34,41,0.15)',
  redBorderActive:  'rgba(198,34,41,0.50)',
  redSurface:       'rgba(198,34,41,0.05)',
  redSurfaceMid:    'rgba(198,34,41,0.09)',
  redSurfaceStrong: 'rgba(198,34,41,0.13)',
  blueSurface:      'rgba(59,130,246,0.08)',
  blueSurfaceMid:   'rgba(59,130,246,0.13)',
  blueBorder:       'rgba(59,130,246,0.25)',
  blueBorderActive: 'rgba(59,130,246,0.55)',
  purpleSurface:    'rgba(139,92,246,0.08)',
  purpleBorder:     'rgba(139,92,246,0.25)',
  greenSurface:     'rgba(22,163,74,0.08)',
  greenBorder:      'rgba(22,163,74,0.25)',
  amberSurface:     'rgba(217,119,6,0.08)',
  amberBorder:      'rgba(217,119,6,0.25)',
  goldSurface:      'rgba(139,104,48,0.08)',
  goldBorder:       'rgba(139,104,48,0.25)',
  errorSurface:     'rgba(220,38,38,0.08)',
  errorBorder:      'rgba(220,38,38,0.25)',
  // Not used in light mode — kept for compat
  bgWarmLayer:      'transparent',
  bgCoolLayer:      'transparent',
  glowRed:          'transparent',
  glowBlue:         'transparent',
  overlay:          'rgba(0,0,0,0.45)',

  // ── Legacy Expo shim ───────────────────────────────────────────────────────
  light: {
    text:            _raw.ltext_primary,
    background:      _raw.lightPage,
    tint:            _raw.red_primary,
    icon:            _raw.ltext_muted,
    tabIconDefault:  _raw.ltext_disabled,
    tabIconSelected: _raw.red_primary,
  },
  dark: {
    text:            _raw.white,
    background:      _raw.bg08,
    tint:            _raw.red_primary,
    icon:            _raw.gray_9c,
    tabIconDefault:  _raw.gray_6b,
    tabIconSelected: _raw.red_primary,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Runtime color accessor — use this for non-hook contexts (StyleSheet factories)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns the correct color token set for the given mode.
 * Use `useColors()` hook in components. Use `getColors()` only in utilities
 * or StyleSheet factory functions that receive `isDark` as a parameter.
 */
export function getColors(isDark: boolean): ThemeColors {
  return isDark ? DarkColors : LightColors as any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Backward-compat static export (DEPRECATED — migrate to useColors() hook)
// This always returns DARK tokens. It exists solely to prevent import breakage
// during incremental migration. New code should NEVER use this.
// ─────────────────────────────────────────────────────────────────────────────
/** @deprecated Use `useColors()` hook or `getColors(isDark)` instead */
export const Colors = DarkColors;

export type ColorToken = keyof Omit<typeof DarkColors, 'palette' | 'light' | 'dark'>;
export type ThemeColors = typeof DarkColors;
