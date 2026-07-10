Now let me read the key UI component files and the tab layout:

Now let me read the remaining token files and the useColors hook for completeness:

Now I have a comprehensive understanding of the theming system. Let me also quickly read the modes.md continuation since it was truncated:

The file was already fully read in the first batch. Now let me provide the comprehensive response:

Now let me also look at a few key tab screens to understand how the current light mode renders in practice:

Now I have a complete picture of the codebase. Let me provide the phased summary:

---

## Light Mode Overhaul — Phased Summary

Based on my analysis of your codebase (the full token system in `tokens/colors.ts`, the `DESIGN_GUIDE.md`, the `MobileCard`, `TopNav`, `HeroSection`, `Card`, `Button` components, and the tab bar layout), here's a phased plan comparing what you have now vs. what the reference screenshots show.

---

### Current State vs. Reference

Your reference screenshots show a classic, proven mobile pattern: **bold colored hero/header** → **white content cards** on a soft grey page. The key issue with the current light mode implementation is that many components still use **hardcoded dark-mode colors** in their `StyleSheet.create` blocks (e.g., `Card.tsx` hardcodes `rgba(10, 10, 21, 0.97)`, `Button.tsx` references the static `Colors` export which always resolves to dark tokens). This means the `useColors()` hook and `LightColors` token set exist but aren't fully consumed across all UI primitives.

---

### Phase 1 — Token & Color Foundation

**What changes:**
- `tokens/colors.ts` `LightColors` needs a few additions:
  - Add a dedicated `bgHero` token for the gradient header area (currently only exists as palette values)
  - Add a `bgCardPressed` token (currently the pressed card state uses `Colors.bgElevated` which is dark-only)
  - Add `shadowLight` tokens for light-mode-appropriate soft shadows (the current `shadows.ts` uses opacities tuned for dark mode — 0.30, 0.40 — which look too heavy on white)

**Impact on Design Guide:**
- The `DESIGN_GUIDE.md` Phase 1 Color System table needs a parallel "Light Theme" column
- Phase 18 shadows need light-mode-specific elevation values (lower opacity: 0.06–0.12 instead of 0.20–0.55)
- Phase 19 Semantic Tokens are already mostly correct for light in `tokens/colors.ts`, but the Design Guide doc doesn't document them

---

### Phase 2 — Cards (The Biggest Visual Impact)

**What changes:**
- `components/ui/Card.tsx` — The base card `styles.card` is completely hardcoded: `backgroundColor: 'rgba(10, 10, 21, 0.97)'`, `borderColor: 'rgba(198, 34, 41, 0.3)'`. This needs to become theme-aware via `useColors()`.
- Light mode cards should be: `#FFFFFF` fill, `rgba(0,0,0,0.06)` border, shadow with `opacity: 0.08` and `radius: 16`
- `QuickActionCard` has the same hardcoded issue
- `SettingsRow` and `TransactionCard` also use hardcoded dark values

**Impact on Design Guide:**
- Phase 6 Card System needs a Light Mode adaptation table
- Add rule: "In light mode, cards use neutral shadows only — no colored border, no red-tinted shadow"
- Add rule: "Card pressed state in light mode → `#F5F6FA` (same as page bg), slight scale 0.97"

---

### Phase 3 — Hero Section

**What exists:** You already have a `HeroSection.tsx` component using the pink→lavender→cyan gradient. It renders only in light mode and applies a `-24px` negative margin for overlap.

**What changes:**
- The hero section in your reference screenshots shows a **compact header area** (about 100–140px) with gradient color, then content below on white. Currently the hero height and how it overlaps with TopNav/content needs refinement.
- For the Booking and Wallet tabs specifically, the reference shows specialized hero content (the red balance card, the icon grid) — the hero should be optional/customizable per screen.
- Ensure TopNav renders **on top of** the hero gradient with white text/icons when the hero is present (currently TopNav has its own white background which creates a visual break).

**Impact on Design Guide:**
- Add a new "Phase 25 — Light Mode Hero Pattern" section explaining the hero→content transition
- Specify: Hero is brand colored, TopNav text goes white over the hero, content begins with white rounded cards that overlap the hero by 20–24px

---

### Phase 4 — Buttons

**What changes:**
- `components/ui/Button.tsx` — uses `Colors` (the dark-only export) rather than `useColors()`. The `SecondaryButton` border is hardcoded `rgba(255,255,255,0.20)` which is invisible on a white background.
- Light mode needs:
  - `PrimaryButton`: same `#C62229` bg, but shadow should be `rgba(198,34,41,0.15)` not 0.35
  - `SecondaryButton`: border should be `rgba(0,0,0,0.12)`, text should be `#374151`, pressed bg `rgba(0,0,0,0.04)`
  - `GhostButton`: text stays `#C62229`, pressed opacity works fine
  - `IconButton`: bg `rgba(0,0,0,0.05)` instead of `rgba(255,255,255,0.08)`

**Impact on Design Guide:**
- Phase 4 Button System needs a "Light Mode Variant" column in the state matrix
- Phase 20 State Matrix table needs light-mode rows for Secondary and Icon buttons

---

### Phase 5 — Top Navigation

**What exists:** `TopNav.tsx` already has light-mode logic — solid white bg with hairline border and soft shadow. This is mostly correct.

**What changes:**
- When a `HeroSection` is present, the TopNav should render with a **transparent** background and white icons/text (overlaid on the gradient), not solid white. This creates the seamless hero feel from the references.
- Add a prop like `transparent?: boolean` to TopNav
- The title font weight of `800` at 28px is heavy — consider `700` at 20px to match the reference's cleaner style

**Impact on Design Guide:**
- Phase 7 Navigation spec needs: "When hero is present, TopNav is transparent; when scrolled past hero, TopNav becomes solid white with shadow"

---

### Phase 6 — Bottom Tab Bar

**What exists:** Already theme-aware via `useColors()` — reads `C.bgTabBar`, `C.borderTabBar`, etc.

**What changes:**
- The reference screenshots show clean white tab bars with no colored borders. Current light tokens are correct (`bgTabBar: #FFFFFF`, `borderTabBar: rgba(0,0,0,0.08)`).
- The `CardTabBar` uses a bottom-radius of 20 on the bar (because it's part of the MobileCard boundary). In light mode this creates an odd floating look — consider removing the radius on the tab bar in light mode to match the reference's flush-bottom tab bar.
- Active indicator pill color is correct (`#C62229`), inactive icons are correct (`#9CA3AF`).

**Impact on Design Guide:**
- Minor: Note that in light mode the tab bar shadow goes **upward** (offset `{0, -2}`) with low opacity (0.06) for subtle lift

---

### Phase 7 — Screen-Level Integration

**What changes:**
Each tab screen (`for-you.tsx`, `wallet.tsx`, `booking/index.tsx`, `learn.tsx`) needs to:
1. Ensure they pass through `useColors()` for any inline styles instead of using the static `Colors` import
2. Add the `HeroSection` component where appropriate (Wallet hero with balance card, Booking hero with session count, etc.)
3. Replace any remaining hardcoded dark-mode `rgba(10,10,21,...)` values with themed tokens

**Specific per-screen notes from the reference:**
- **Wallet**: The green balance card (`US Dollar / $269.54`) uses a deep brand-green background — this is a one-off decorative color, not a token issue. The "Fund Wallet" button is correctly red. Transfer/Withdraw use outline buttons with colored icons.
- **Booking**: Clean white card list with red status badges ("Confirmed"), red CTA buttons ("Join Now", "Book a New Session"). The provider dashboard banner uses a green-gradient card.
- **For You (Pulse)**: The feed content area is white. The "Pulse" indicator uses a red dot. Social interaction icons (heart, comment, share) are dark grey on white.

---

### Phase 8 — Design Guide Update

The `DESIGN_GUIDE.md` is currently 100% dark-mode focused. It needs:

1. **A parallel "Light Mode" section** under each Phase (or a new Phase 25 dedicated to light mode adaptation)
2. **Color table additions**: Light-mode semantic tokens mapped alongside dark
3. **Shadow retuning**: Light mode uses 40–60% lower shadow opacity across the board
4. **Card rule update**: "No colored borders or red-tinted shadows in light mode"
5. **Hero band specification**: When to use it, dimensions, overlap mechanics
6. **White-space principle**: "Light mode embraces white space — generous padding, breathing room between cards, no packed layouts"

---

### Summary of Component Impact

| Component | Change Scope | Effort |
|---|---|---|
| `tokens/colors.ts` | Add ~5 new light-mode tokens | Low |
| `tokens/shadows.ts` | Add light-mode elevation variants | Low |
| `components/ui/Card.tsx` | Full refactor to use `useColors()` | Medium |
| `components/ui/Button.tsx` | Refactor to use `useColors()` | Medium |
| `components/TopNav.tsx` | Add `transparent` prop for hero overlay | Low |
| `components/HeroSection.tsx` | Minor height/margin tweaks | Low |
| `components/MobileCard.tsx` | Already theme-aware — minor tweaks | Low |
| `app/(tabs)/_layout.tsx` (tab bar) | Minor radius adjustment for light | Low |
| Tab screens (5 screens) | Replace `Colors` import with `useColors()` | Medium |
| `DESIGN_GUIDE.md` | Add light mode documentation | Medium |

---

### Execution Priority

1. **Cards + Buttons** (Phase 2 & 4) — these are visible on every screen and currently broken in light mode
2. **Token additions** (Phase 1) — enables everything else
3. **Hero + TopNav** (Phase 3 & 5) — makes the app feel premium, not just "less dark"
4. **Screen integration** (Phase 7) — connects the dots
5. **Design Guide** (Phase 8) — documents the new standard

Want me to proceed with implementation? I'd start with the token layer and Card/Button theming since those have the widest blast radius.