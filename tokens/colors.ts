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
  // ── Dark backgrounds (v2 "Navy Health" rebrand) ─────────────────────────────
  // Deep navy base replaces the legacy near-black. See brand-design-guide Phase 1.
  bg08:    '#001233',   // base screen background (deepest navy)
  bg0f:    '#011B45',   // surface — cards, sheets (one step above base)
  bg17:    '#0E2963',   // elevated surfaces — active tab, dropdowns, chips

  // ── Navy / blue brand stops ─────────────────────────────────────────────────
  navyBase:     '#001233',
  navyAlt:      '#011B45',
  navyElevated: '#0E2963',
  royalBlue:    '#0B3B8F',   // card action strip, info accents

  // ── Red gradient primary (v2) ───────────────────────────────────────────────
  redGradTop:    '#D60A1D',  // primary button / Follow gradient top
  redGradBottom: '#7A000A',  // primary button / Follow gradient bottom
  deepRed:       '#9E000E',  // card header gradient red end

  // ── Greens ──────────────────────────────────────────────────────────────────
  electricGreen: '#00E600',  // FOR YOU label, Pulse badge, success/live
  forestGreen:   '#329632',  // Article badge (passive tag)

  // ── Teal wizard accent ────────────────────────────────────────────────────── 
  wizardTeal:    '#00D2D2',  // "Step X of 5" label

  // ── Neutral light / error field ───────────────────────────────────────────── 
  neutralLight:  '#E0E6ED',  // light inputs, search bar fill
  errorField:    '#F8B4B4',  // light-red/pink error input fill

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

  // ── Brand red — v2 primary is the gradient-top #D60A1D ──────────────────────
  red_primary:  '#D60A1D',   // v2 primary red (gradient top)
  red_bright:   '#E42326',
  red_deep:     '#7A000A',   // v2 gradient bottom / deep accent
  red_crimson:  '#9E000E',   // v2 deep red (card header red end)
  red_mid:      '#9A404B',
  red_coral:    '#D75D64',
  red_rose:     '#DB8588',
  red_blush:    '#EAAFB2',
  red_gold:     '#8B6830',

  // ── Red tints (based on v2 primary 214,10,29) ───────────────────────────────
  red_t06:  'rgba(214,10,29,0.06)',
  red_t12:  'rgba(214,10,29,0.12)',
  red_t15:  'rgba(214,10,29,0.15)',
  red_t25:  'rgba(214,10,29,0.25)',
  red_t30:  'rgba(214,10,29,0.30)',
  red_t35:  'rgba(214,10,29,0.35)',
  red_t55:  'rgba(214,10,29,0.55)',

  // ── Accent colors (v2) ───────────────────────────────────────────────────── 
  blue:    '#0B3B8F',   // royal blue — info, action strip
  green:   '#00E600',   // electric green — live/success
  amber:   '#F59E0B',
  error:   '#EF4444',
  purple:  '#8B5CF6',

  // ── Accent tints ──────────────────────────────────────────────────────────
  blue_t10:   'rgba(11,59,143,0.12)',
  green_t07:  'rgba(0,230,0,0.09)',
  green_t12:  'rgba(0,230,0,0.14)',
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

  // ── Overlays (navy-tinted in v2) ────────────────────────────────────────────
  black_75: 'rgba(0,18,51,0.80)',
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

  // ── v2 "Navy Health" brand tokens ─────────────────────────────────────────
  navyBase:       _raw.navyBase,
  navyAlt:        _raw.navyAlt,
  navyElevated:   _raw.navyElevated,
  royalBlue:      _raw.royalBlue,
  deepRed:        _raw.deepRed,
  electricGreen:  _raw.electricGreen,
  forestGreen:    _raw.forestGreen,
  wizardTeal:     _raw.wizardTeal,
  neutralLight:   _raw.neutralLight,
  errorField:     _raw.errorField,

  // ── v2 gradient stop arrays (for expo-linear-gradient `colors` prop) ────────
  gradientPrimary:    [_raw.redGradTop, _raw.redGradBottom] as const,     // vertical
  gradientCardHeader: [_raw.deepRed, _raw.royalBlue] as const,            // horizontal
  gradientBackground: [_raw.navyAlt, _raw.navyBase] as const,             // vertical
  gradientSuccess:    [_raw.electricGreen, '#00B800'] as const,           // vertical
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
  bgErrorField:     _raw.errorField,   // light pink error input fill
  bgSuccessSubtle:  _raw.green_t07,
  bgLight:          _raw.neutralLight, // light inputs, search, social
  bgInput:          _raw.neutralLight, // auth inputs use the light fill (#E0E6ED)

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary:    _raw.white,
  textSecondary:  _raw.gray_d1,
  textMuted:      _raw.gray_9c,
  textDisabled:   _raw.gray_6b,
  textOnLight:    _raw.navyBase,       // text on #E0E6ED fields
  textInverse:    _raw.bg08,
  textLink:       _raw.red_primary,
  textAccentGreen: _raw.electricGreen, // FOR YOU / live labels
  textWizard:     _raw.wizardTeal,     // "Step X of 5"
  textDanger:     _raw.error,
  textSuccess:    _raw.green,
  textWarning:    _raw.amber,
  textInfo:       _raw.blue,
  textGold:       _raw.red_gold,

  // ── Actions ────────────────────────────────────────────────────────────────
  actionPrimary:          _raw.red_primary,     // gradient top (fallback solid)
  actionPrimaryBottom:    _raw.redGradBottom,   // gradient bottom
  actionPrimaryPressed:   _raw.red_deep,
  actionPrimaryDisabled:  _raw.red_t35,
  actionSuccess:          _raw.electricGreen,   // green CTA (Create Account / Start)
  actionDestructive:      _raw.error,
  actionGhost:            'transparent' as const,
  actionSecondaryBorder:  _raw.white_20,

  // ── Status ─────────────────────────────────────────────────────────────────
  statusSuccess:    _raw.green,          // #00E600 live/success
  statusPassive:    _raw.forestGreen,    // #329632 Article tag
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
  // Navy bar, distinct from card bg so it reads as a separate layer
  bgTabBar:        _raw.navyBase,            // #001233
  borderTabBar:    _raw.white_08,            // subtle white top border

  // ── Engagement row surface ─────────────────────────────────────────────────
  bgEngagement:    _raw.royalBlue,   // royal-blue action strip on feed cards

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
  bgWarmLayer:      'rgba(1,27,69,0.55)',    // navy-alt tinted depth layer
  bgCoolLayer:      'rgba(11,59,143,0.30)',  // royal-blue tinted depth layer
  glowRed:          'rgba(214,10,29,0.08)',
  glowBlue:         'rgba(11,59,143,0.10)',
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
  bgPrimarySubtle:  'rgba(214,10,29,0.06)',
  bgPrimaryMid:     'rgba(214,10,29,0.11)',
  bgErrorSubtle:    'rgba(239,68,68,0.06)',
  bgErrorField:     _raw.errorField,   // light pink error input fill (shared)
  bgSuccessSubtle:  'rgba(0,230,0,0.10)',
  bgLight:          _raw.neutralLight, // #E0E6ED light fill (shared)
  bgInput:          _raw.lightInput,   // #F0F1F5 — flat grey input fill

  // ── Text ───────────────────────────────────────────────────────────────────
  // Standard neutral hierarchy — maximum legibility on white
  textPrimary:    _raw.ltext_primary,    // #111827
  textSecondary:  _raw.ltext_secondary,  // #374151
  textMuted:      _raw.ltext_muted,      // #6B7280
  textDisabled:   _raw.ltext_disabled,   // #9CA3AF
  textOnLight:    _raw.navyBase,         // text on light fields (shared)
  textInverse:    _raw.white,
  textLink:       _raw.red_primary,      // brand red links
  textAccentGreen: _raw.electricGreen,
  textWizard:     _raw.wizardTeal,
  textDanger:     '#DC2626',
  textSuccess:    '#16A34A',
  textWarning:    '#D97706',
  textInfo:       '#2563EB',
  textGold:       _raw.red_gold,

  // ── Actions ────────────────────────────────────────────────────────────────
  actionPrimary:          _raw.red_primary,
  actionPrimaryBottom:    _raw.redGradBottom,
  actionPrimaryPressed:   _raw.red_deep,
  actionPrimaryDisabled:  'rgba(214,10,29,0.35)',
  actionSuccess:          _raw.electricGreen,
  actionDestructive:      '#DC2626',
  actionGhost:            'transparent' as const,
  actionSecondaryBorder:  _raw.lborder,

  // ── Status ─────────────────────────────────────────────────────────────────
  statusSuccess:    '#16A34A',
  statusPassive:    _raw.forestGreen,
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
