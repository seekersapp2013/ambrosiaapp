/**
 * Ambrosia Design System — Z-Index Tokens
 * Phase 23
 *
 * Rule: No raw integer z-index values anywhere in component code.
 * Always reference a named token from this file.
 *
 * Usage:
 *   import { zIndex } from '@/tokens/zIndex';
 *   style={{ zIndex: zIndex.header }}
 */

export const zIndex = {
  /** Normal document flow — all standard content */
  base:        0,
  /** Cards with elevation, floating quick-action card */
  raised:      1,
  /** Sticky section headers, floating CTA buttons */
  sticky:      10,
  /** Top navigation bar, screen header */
  header:      20,
  /** Dimmed backdrop behind bottom sheets and modals */
  overlay:     50,
  /** Bottom sheets, drawers, action sheets */
  bottomSheet: 100,
  /** Toast / snackbar notifications */
  toast:       200,
  /** Full-screen modals, alert dialogs, confirmation dialogs */
  modal:       300,
  /** Dev tools, debug overlays — never in production */
  debug:       999,
} as const;

export type ZIndexToken = keyof typeof zIndex;
