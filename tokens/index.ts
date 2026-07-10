/**
 * Ambrosia Design System — Token Barrel Export
 *
 * Import everything from here for convenience:
 *   import { Colors, spacing, typeScale, radius, elevation, duration, zIndex } from '@/tokens';
 */

export { Colors, getColors }               from './colors';
export type { ColorToken }                 from './colors';

export { spacing }                         from './spacing';
export type { SpacingToken }               from './spacing';

export { typeScale, fontFamily, allowFontScaling } from './typography';
export type { TypeScaleToken }             from './typography';

export { radius }                          from './radius';
export type { RadiusToken }               from './radius';

export { elevation, coloredShadow }        from './shadows';
export type { ElevationToken, ColoredShadowToken } from './shadows';

export { duration, easing, spring, useReducedMotion, getMotionDuration } from './motion';
export type { DurationToken, EasingToken, SpringToken } from './motion';

export { zIndex }                          from './zIndex';
export type { ZIndexToken }               from './zIndex';
