---
inclusion: always
---

# Ambrosia — Brand Design Guide (v2 · "Navy Health" rebrand)

> Dark theme · Deep-navy base · Red-gradient primary · Roboto typeface
> Derived from the uploaded reference screens (onboarding, auth, 5-step registration, "FOR YOU" home feed).
> This is the single source of truth for the NEW design direction. It supersedes `DESIGN_GUIDE.md`
> (the legacy Inter + near-black `#0a0a15` + full-pill system), which is kept only as historical reference.

---

## How to use this guide

- When building or restyling any screen, obey the tokens, component specs, and state matrices here.
- Never introduce a color, radius, font size, or spacing value that is not defined below. If something is missing, ask before inventing it.
- Values confirmed from the brand/screens are stated as fact. Values I estimated are marked **(VERIFY)** — treat these as provisional until the owner confirms a real value.
- The design is **dark mode only** right now. A light-mode token block is stubbed at the end — fill in the hex values when light-mode screens exist. Component code must reference semantic tokens so light mode drops in without touching screens.
- Screen reference images live in `.kiro/steering/designs/` and are linked per screen in Phase 25. Images must be saved to disk by the owner (chat attachments can't be written to disk automatically).

---

## Phase 0 — Brand Foundations

### Logo

Two variants of the same apple-heart + medical-cross mark:

| Variant | Usage | File |
|---|---|---|
| Red logo + "Ambrosia" wordmark + tagline "...Your Trusted Health Ecosystem" | Auth, sign-up, registration (navy backgrounds where the red reads well) | `logo-red.png` |
| White line-art mark + "Ambrosia" wordmark | Over photographic onboarding screens | `logo-white.png` |

Rules:
- Never recolor the logo outside these two variants.
- Keep clear space around the logo of at least the height of the cross element.
- On photo backgrounds, always use the white variant over a darkened area of the image.

### Brand voice (visual tone)

Trustworthy, clinical-but-warm, premium health. Deep navy conveys calm and trust; the red gradient signals energy and action; electric green signals "live/active." Keep layouts clean, generous spacing, strong contrast.

---

## Phase 1 — Color System (Dark Theme)

### Core Brand Palette (confirmed)

| Token | Hex | Usage |
|---|---|---|
| Deep Navy (base) | `#001233` | Primary screen background (darkest) |
| Deep Navy (alt) | `#011B45` | Background variant / gradient start |
| Navy Elevated | `#0E2963` | Active nav tab background, elevated chips |
| Royal Blue | `#0B3B8F` | Card header gradient (blue end), action strip |
| Deep Red | `#9E000E` | Card header gradient (red end), category title block |
| Primary Red (gradient top) | `#D60A1D` | Primary button / "Follow" gradient top stop |
| Primary Red (gradient bottom) | `#7A000A` | Primary button / "Follow" gradient bottom stop |
| Electric Green | `#00E600` | "FOR YOU" label, "Pulse" live badges, final CTA / success progress |
| Forest Green | `#329632` | "Article" badges (passive/static tags) |
| Neutral Light | `#E0E6ED` | Search bar fill, light inputs, light icon/text |

### Gradients (confirmed)

| Gradient | Direction | Stops |
|---|---|---|
| `gradientPrimary` (buttons, Follow) | vertical, top → bottom | `#D60A1D` → `#7A000A` |
| `gradientCardHeader` (category title block) | horizontal, left → right | `#9E000E` (red, left) → `#0B3B8F` (blue, right) |
| `gradientBackground` (screen depth) | vertical, top → bottom | `#011B45` → `#001233` |

> Expo implementation: use `expo-linear-gradient` (`LinearGradient`). Vertical = `start={{x:0.5,y:0}} end={{x:0.5,y:1}}`. Horizontal = `start={{x:0,y:0.5}} end={{x:1,y:0.5}}`.

### Teal / Wizard accent **(VERIFY)**

| Token | Hex | Usage |
|---|---|---|
| `wizardAccent` | `#00D2D2` **(VERIFY)** | "Step X of 5" label on registration wizard |
| `wizardAccentDeep` | `#059494` **(VERIFY)** | Darker teal alternative |

> The exact teal was not sampleable from the feed screenshot. Confirm against the registration screens.

### Text Colors

| Token | Hex | Usage |
|---|---|---|
| `textPrimary` | `#FFFFFF` | Headings, primary content, body on navy |
| `textSecondary` | `#D1D5DB` **(VERIFY)** | Secondary body, subtitles |
| `textMuted` | `#9CA3AF` **(VERIFY)** | Captions, meta, timestamps |
| `textDisabled` | `#6B7280` **(VERIFY)** | Placeholders, disabled |
| `textOnLight` | `#001233` | Text on light `#E0E6ED` fields |

> White, deep-navy, and the brand accents are confirmed. The grey ramp is carried over from the legacy guide as sensible defaults — confirm or replace.

### Surface & Border Tints **(VERIFY — carried as defaults)**

| Token | Value | Usage |
|---|---|---|
| `surface` | `#011B45` | Cards, sheets (navy, one step above base) |
| `surfaceElevated` | `#0E2963` | Dropdowns, elevated chips, active tab |
| `overlay` | `rgba(0,18,51,0.80)` | Modal/sheet backdrop (navy-tinted) |
| `borderSubtle` | `rgba(255,255,255,0.08)` | Card borders, dividers |
| `borderNeutral` | `rgba(255,255,255,0.12)` | Input default border |
| `borderFocus` | `rgba(214,10,29,0.55)` | Input focused border (red) |
| `borderFilled` | `rgba(214,10,29,0.35)` | Input filled/valid border |
| `borderError` | `rgba(239,68,68,0.65)` | Input error border |

### Semantic Status Colors

| Token | Hex | Usage |
|---|---|---|
| `statusSuccess` | `#00E600` | Success, live/active (matches Pulse) |
| `statusSuccessCalm` | `#329632` | Passive success / Article tag |
| `error` | `#EF4444` | Error text/icon |
| `errorFieldFill` | `#F8B4B4` **(VERIFY)** | Light-red/pink error input fill (seen on register errors) |
| `warning` | `#F59E0B` **(VERIFY)** | Warnings, ratings |
| `info` | `#0B3B8F` | Info accents (royal blue) |

---

## Phase 2 — Typography System

### Font Family

Primary font: **Roboto** (confirmed).

```
fontFamily: {
  regular:   'Roboto_400Regular',
  medium:    'Roboto_500Medium',
  bold:      'Roboto_700Bold',
}
```
> Load via `expo-font` / `@expo-google-fonts/roboto`. Android maps Roboto natively; iOS must bundle the font.

### Type Scale (Roboto)

Confirmed from screens where noted; remaining rows carried from legacy structure and marked **(VERIFY)**.

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `displayLarge` | 32px | 700 | 40px | -0.5 **(VERIFY)** | Onboarding hero captions |
| `displayMedium` | 28px | 700 | 36px | -0.3 **(VERIFY)** | Welcome titles |
| `headingXL` | 24px | 700 | 32px | -0.2 **(VERIFY)** | Auth screen titles |
| `headingLG` | 20px | 700 | 28px | 0 | Section/card titles (confirmed 18–20px, e.g. "Fitness", "Nutrition") |
| `headingMD` | 18px | 500 | 26px | 0 | Card titles (confirmed Roboto Medium/Bold, 18–20px, `#FFFFFF`) |
| `headingSM` | 16px | 500 | 24px | 0 | Sub-section titles |
| `bodyLG` | 16px | 400 | 24px | 0 | Primary body |
| `bodyMD` | 14px | 400 | 22px | 0 | Secondary body / subtitles (confirmed "Dr Jude Odi" 13–14px Regular) |
| `bodySM` | 13px | 400 | 20px | 0 | Captions, author line |
| `labelLG` | 16px | 500 | 20px | 0.1 | Primary button labels |
| `labelMD` | 14px | 500 | 18px | 0.1 | Secondary / small button labels |
| `button` | 13px | 500 | 16px | uppercase, +0.3 | "Follow" / compact buttons (confirmed 12–13px Medium, UPPERCASE) |
| `labelSM` | 11px | 500 | 16px | +1.0 | Tab bar labels (confirmed 11px Medium, ~1px tracking, e.g. "FOR YOU", "LEARN") |
| `caption` | 11px | 400 | 16px | 0.3 | Timestamps, fine print |
| `overline` | 11px | 500 | 14px | 1.0 | Category labels, badge text |

### Typography Rules

- Card titles ("Fitness", "Nutrition", "Maternal Health") → `headingMD`/`headingLG`, 700/500, `#FFFFFF`, over the red gradient block.
- Card author line ("Dr Jude Odi") → `bodySM`/`bodyMD` Regular, paired with a small circular avatar prefix.
- "Follow" and compact pill buttons → `button` style: Roboto Medium, UPPERCASE, 12–13px.
- Tab bar labels → `labelSM`, 11px Medium, UPPERCASE with wide tracking.
- "FOR YOU" header label → `overline`/`labelLG` in Electric Green `#00E600`.
- Section titles on wizard ("Your Details", "Account Info") → `headingLG` in Primary Red.
- "Step X of 5" → `labelMD` in `wizardAccent` teal **(VERIFY)**.

---

## Phase 3 — Spacing, Layout & Radius

### Base Unit

All spacing is on an **8px grid** (Material-style, confirmed). Use multiples of 8 where possible; 4px allowed only for micro-gaps.

| Token | Value | Usage |
|---|---|---|
| `space1` | 4px | Micro gaps, icon-to-label |
| `space2` | 8px | Tight internal padding, label margins |
| `space3` | 12px | Card inner gaps, between action icons |
| `space4` | 16px | Standard horizontal screen padding (confirmed) |
| `space5` | 20px | Card internal padding |
| `space6` | 24px | Section gaps, between form fields |
| `space8` | 32px | Large section separators |
| `space10` | 40px | Hero padding |
| `space12` | 48px | Bottom safe-area padding |

### Screen Layout

- Horizontal screen padding: **16px** (confirmed — viewport edge to card container).
- Respect safe-area insets top and bottom (`useSafeAreaInsets`).
- Scroll content bottom padding: **100px** (clears tab bar + safe area).
- Base target frame: ~390px wide (see Phase 23 for device classes).

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `radiusXS` | 6px | Small tags |
| `radiusSM` | 8px | Small controls, icon chips |
| `radiusButton` | 12px | Buttons (confirmed 12–14px soft-rect; NOT full pill) |
| `radiusMD` | 12px | Inputs, small cards |
| `radiusLG` | 16px | Cards, content containers (confirmed 16px) |
| `radiusXL` | 20px | Bottom sheets, large cards |
| `radius2XL` | 24px | Hero cards |
| `radiusFull` | 999px | Avatars, dots, circular icon buttons, progress pills |

> Key rebrand difference from legacy: **buttons are soft-rect 12–14px, not full pills.** Only avatars, progress pills, and circular icon buttons use `radiusFull`.

---

## Phase 4 — Button System

### Primary Button (gradient)
> Used: "Sign in", "Continue", "Next", "Create Account" (green variant), "Start".
> Reference: red gradient buttons across auth and wizard screens.

```
background:     LinearGradient vertical #D60A1D → #7A000A   (gradientPrimary)
text:           #FFFFFF, labelLG (16px, 500)
height:         56px            (VERIFY — carried default)
borderRadius:   12px            (radiusButton, confirmed soft-rect)
width:          fill (marginH 16px) OR auto with paddingH 24px
icon gap:       8px (e.g. "Continue →")
shadow:         0 4px 16px rgba(214,10,29,0.35)   (shadowPrimary)
```

States:
- Default: gradient `#D60A1D → #7A000A`
- Pressed: darken ~8% + scale 0.96
- Disabled: gradient at 35% opacity, text `rgba(255,255,255,0.4)`
- Loading: spinner replaces label, gradient unchanged

### Primary Button — Success variant (green)
> Used: final wizard CTA "Create Account", "Start" on last onboarding slide.

```
background:     #00E600  (or subtle vertical gradient to #00B800) (VERIFY stop)
text:           #FFFFFF or #001233 (ensure AA contrast — VERIFY)
rest:           same geometry as Primary Button
```

### Secondary Button (light / "Back")
> Used: "Back" on wizard and onboarding.

```
background:     #E0E6ED (neutral light) OR grey pill as seen
text:           #D60A1D (red) with red arrow, labelMD
height:         48–56px     (VERIFY)
borderRadius:   12px (or radiusFull if matching the rounded "Back" pill seen) (VERIFY)
```

States:
- Pressed: background darken ~6% + scale 0.96

### Outline / Secondary (transparent)
> Used: secondary actions on dark backgrounds where no filled button is wanted.

```
background:     transparent
border:         1.5px solid rgba(255,255,255,0.20)
text:           #FFFFFF, labelLG
height:         56px
borderRadius:   12px
```

### Ghost / Text Button
> Used: inline links like "Sign up", "Back to Sign in", "Next →".

```
background:     transparent
text:           #D60A1D (red) for links; #FFFFFF for over-photo nav like "Next →"
fontSize:       14px, weight 500
```

### Small / Compact Button ("Follow")
> Used: "Follow" on feed cards, compact row actions.

```
background:     LinearGradient vertical #D60A1D → #7A000A
text:           #FFFFFF, `button` style (12–13px Medium, UPPERCASE)
height:         28–32px     (VERIFY)
borderRadius:   8–10px      (VERIFY)
paddingH:       12px
```

### Social Button ("Continue with Google")
> Used: auth sign-in.

```
background:     #E0E6ED (light)
text:           #001233, labelMD
leadingIcon:    Google "G" logo, 18px
height:         52–56px     (VERIFY)
borderRadius:   12px
```

### Destructive Button

```
background:     #EF4444
text:           #FFFFFF, labelLG
height:         56px
borderRadius:   12px
shadow:         0 4px 16px rgba(239,68,68,0.30)
```

### Icon Button (circular)
> Used: notification bell, theme toggle, back arrow on plain screens.

```
background:     rgba(255,255,255,0.08) (or transparent on busy backgrounds)
size:           40×40px
borderRadius:   999px (radiusFull)
icon:           20px, #E0E6ED / #FFFFFF
```

### Button spacing rules

- Side-by-side "Back" + "Continue" (wizard): space-between, each auto-width, gap ≥ 16px.
- Primary CTA sits ~16–20px above the bottom safe area.
- Minimum 44×44px touch target; add `hitSlop` where visual size is smaller.

---

## Phase 5 — Input System

### Standard Text Input
> Reference: email/password/name fields on auth and wizard screens.

```
height:         56px            (VERIFY)
borderRadius:   12px (radiusMD)
borderWidth:    1.5px
borderColor:    rgba(255,255,255,0.12)   (default)
background:     #E0E6ED (light fill, as seen) OR surface navy (choose per screen; auth uses light)
paddingH:       16px
fontSize:       14px (bodyMD)
textColor:      #001233 on light fill / #FFFFFF on navy fill
placeholderColor: #6B7280   (VERIFY)
```

Focus:
```
borderColor:    rgba(214,10,29,0.55)   (borderFocus, red)
```

Filled / valid:
```
borderColor:    rgba(214,10,29,0.35)   (borderFilled)
trailingIcon:   green check #00E600, 20px (optional)
```

Error (confirmed from register-step-1-errors):
```
background:     #F8B4B4 (light red/pink fill)   (VERIFY exact hex)
borderColor:    rgba(239,68,68,0.65)
helperText:     12px Regular, #EF4444, 4px below input
                examples: "Enter a valid email", "Password do not match", "Name is required"
```

### Input with Label
```
label:          13px Medium, #FFFFFF/#D1D5DB, marginBottom 8px
gap label→input: 8px
gap input→next field: 20–24px
```

### Phone Input (Country Code + Number)
> Reference: register step 2 "Account Info".

```
Row:            userName (full width) above; then Country code picker; then Phone number
Country picker: full-width field, trailing chevron-down in a navy chip (#0E2963), icon #FFFFFF
Number input:   standard input spec
```

### OTP / PIN Input
> Reference: register step 4 "Transaction Pin" (4-digit PIN + confirm).

```
Option A (as seen): two full-width fields "4-Digit PIN" and "Confirm your 4 digit pin",
                    standard input spec, secureTextEntry.
Option B (boxed):   4 individual boxes — each 48×56px, radius 12px, 1.5px border,
                    centered 20px Bold, gap 8px. Filled box border = borderFocus.
```

### Search Input
> Reference: home feed top search bar.

```
height:         44–48px     (VERIFY)
borderRadius:   999px (full pill — matches screen) OR 12px (VERIFY which)
background:     #E0E6ED
leadingIcon:    search glyph in a small blue circle (#0B3B8F), icon white
paddingH:       16px
placeholderColor: #6B7280
```

### Dropdown / Select
> Reference: country code picker; currency list (step 3) is a list of tappable rows, not a native select.

```
height:         56px
borderRadius:   12px
borderWidth:    1.5px
borderColor:    rgba(255,255,255,0.12)
background:     surface
trailingIcon:   chevron-down in navy chip #0E2963, white icon
```

### Selectable List Row (currency picker)
> Reference: register step 3 "Primary Currency" (N Naira / $ Dollar / £ Pound / Ghana Cedi).

```
background:     #5B9BD5-ish light blue   (VERIFY exact — a lighter royal-blue chip)
height:         44–48px
borderRadius:   8px
paddingH:       16px
label:          14px Medium, #001233
trailingIcon:   arrow-right in a navy square chip, white icon
marginBottom:   8px
selected:       border 1.5px #D60A1D OR check indicator
```

### Textarea / Multi-line
```
minHeight:      120px
borderRadius:   12px
borderWidth:    1.5px
borderColor:    rgba(255,255,255,0.12)
background:     surface
paddingH:       16px, paddingV: 14px
textAlignVertical: top
```

### Date/Time Picker Input
```
Same as standard input; trailing calendar icon 20px, #D60A1D.
```

---

## Phase 6 — Card System

### Feed Content Card (signature component)
> Reference: home "FOR YOU" cards (Fitness, Nutrition, Maternal Health, Parenting).

```
container:
  background:   surface navy
  borderRadius: 16px (radiusLG)
  borderWidth:  1px, borderColor rgba(11,59,143,0.6)  (subtle royal-blue edge, VERIFY)
  overflow:     hidden
  marginBottom: 16px

image:          full width, height ~160px (VERIFY), objectFit cover, top of card

category badge (top-left over image):
  "Pulse"  → background #00E600, text #001233, overline style, radius 6px, paddingH 8px
  "Article"→ background #329632, text #FFFFFF, overline style
  position: absolute top 8px left 8px

bottom bar (row):
  left block (title/author):
    background: LinearGradient horizontal #9E000E → (fade) — the red category block
    title:      headingMD/LG, #FFFFFF  (e.g. "Fitness")
    author row: small circular avatar + bodySM #FFFFFF (e.g. "Dr Jude Odi")
    paddingH 12px, paddingV 10px
  right block (actions):
    background: royal-blue #0B3B8F strip
    icons:      like (heart), comment, save (bookmark), share — 20px, white, gap 12px
    Follow btn: Small Button (gradient), uppercase "FOLLOW"
```

### Account-Type Card
> Reference: auth "Choose an account type" (Sign up as user / provider).

```
background:     light-blue gradient panel  (VERIFY stops; appears #BcdCf0-ish → #8FbcE0)
borderRadius:   12px
layout:         photo on left, text block on right
title:          headingSM, #FFFFFF/#001233 (VERIFY on-color)
body:           bodySM
icon:           circular avatar/role glyph
marginBottom:   16px
pressed:        scale 0.98
```

### Standard List Card
```
background:     surface navy
borderRadius:   16px
borderWidth:    1px, borderColor rgba(255,255,255,0.08)
paddingH/V:     16px
shadow:         elevation2
layout:         [thumbnail 64×64 r10] + [content col gap 4] + [trailing action]
```

### Settings / Menu Row
```
background:     surface
borderRadius:   12px
height:         56px
paddingH:       16px
leadingIcon:    20px, #D60A1D or #9CA3AF, marginRight 12px
label:          15px Regular, #FFFFFF
trailingChevron:16px, #6B7280
divider:        1px rgba(255,255,255,0.06) between items
```

### Empty State
```
container:      flex 1, center
illustration:   120×120px
title:          18px Medium, #FFFFFF, marginTop 24px
subtitle:       14px Regular, #9CA3AF, marginTop 8px, maxWidth 260px
CTA:            Small/Primary button, marginTop 20px
```

---

## Phase 7 — Navigation System

### Bottom Tab Bar
> Reference: home feed — FOR YOU · LEARN · CIRCLE · WALLET · BOOKING (5 tabs).

```
container:
  background:     #011B45 / #001233   (navy)
  borderTopWidth: 1px, borderTopColor rgba(255,255,255,0.08)
  height:         64px + safe-area bottom
  paddingV:       8px

tab item:         flex 1, center, gap 4px
icon:             24px
  inactive:       #6B7280 / muted blue   (VERIFY)
  active:         #FFFFFF on #0E2963 highlight background
label:            labelSM (11px Medium, UPPERCASE, ~1px tracking)
  inactive:       muted
  active:         #FFFFFF
active indicator: rounded #0E2963 background block behind the active tab (confirmed)
```

### Top Header (feed)
> Reference: "Welcome Adebola" + "FOR YOU" + theme toggle + bell + avatar.

```
height:         56px
paddingH:       16px
layout:         row, space-between
left:           logo (red) + "Welcome\n{Name}" (bodySM muted + headingSM #FFFFFF)
center:         "FOR YOU" label in #00E600 (overline/labelLG)
right:          theme toggle (sun/moon), notification bell, avatar (circular 32–36px)
```

### Top Header (plain screens)
```
height:         56px, paddingH 16px
title:          headingMD (18px 500) #FFFFFF, centered
back button:    chevron-left 24px #FFFFFF, 44px touch target
```

### Progress Bar / Stepper (wizard)
> Reference: registration "Step X of 5" with filling bar; onboarding dot/pill indicator.

```
Wizard bar:
  track:        height 4–6px, background #FFFFFF (or rgba white), radiusFull
  fill:         #00E600 (green), radiusFull, width = step/total (animated)
  label above:  "Step X of 5" in wizardAccent teal (VERIFY)

Onboarding indicator (3 segments):
  active segment:   wider pill; color changes by step — RED (step1), AMBER (step2), GREEN (step3/Start)
  inactive segment: grey rounded pill rgba(255,255,255,0.25)
  (VERIFY intent: red→amber→green progression is treated as a "getting started" cue)
```

### Modal / Bottom Sheet
```
overlay:        rgba(0,18,51,0.80)   (navy-tinted)
sheet:
  background:   surface navy
  borderRadius: 24px 24px 0 0
  paddingH:     16px, paddingTop 12px, paddingBottom 20px + safe area
drag handle:    40×4px, radiusFull, rgba(255,255,255,0.20), centered
title:          18px 500 #FFFFFF, center
body:           14px 400 #9CA3AF, center
buttons:        Button System spec
```

---

## Phase 8 — Onboarding & Intro Screens

### Onboarding Carousel (3 slides)
> Reference: breast-health, parenting, health-priority slides.

```
layout:
  full-bleed photo background, objectFit cover
  bottom gradient overlay: linear rgba(0,18,51,0) → rgba(0,18,51,0.95) (bottom)
  white logo (top-left/area over image)

caption:        displayMedium/Large, #FFFFFF, bottom third, left-aligned
indicator:      3 segment pills (see Phase 7), colored by step
nav:
  slide 1:      "Next →" (ghost white, right)
  slide 2:      "← Back"  +  "Next →"
  slide 3:      "← Back"  +  "Start" (green text/CTA)
```

### Auth Entry / Account Type
> Reference: "Choose an account type".

```
background:     navy gradient (#011B45 → #001233)
top:            doctor photo header + white logo + tagline
title:          "Choose an account type" headingXL, #D60A1D
subtitle:       bodyMD, #FFFFFF/#D1D5DB
cards:          two Account-Type Cards (Phase 6)
footer link:    "← Back to Sign in" ghost, #D60A1D
```

---

## Phase 9 — Auth & Registration Screens

### Sign In
> Reference: auth-signin.

```
background:     navy gradient; red logo + tagline + doctor photo header
fields:         Email, Password, Confirm Password (light #E0E6ED inputs)
primary CTA:    "Sign in" (gradient primary, soft-rect)
divider:        "OR" centered, #FFFFFF
social:         "Continue with Google" (light button)
footer:         "Don't have an account? Sign up" — "Sign up" in #D60A1D
```

### Registration Wizard (5 steps)
> Shared chrome: red logo top-left, doctor photo header, teal "Step X of 5" label,
> green progress bar on white track, red section title, white subtitle,
> "← Back" (light pill) + "Continue →" (gradient) at bottom.

| Step | Title | Content |
|---|---|---|
| 1 | Your Details | Email, Password, Confirm Password, Full Name. Error state = pink fields + red helper text. |
| 2 | Account Info | User Name, Country code (picker), Phone Number. White inputs. |
| 3 | Primary Currency | Selectable list rows: N Naira, $ Dollar, £ Pound, Ghana Cedi. Back only (selecting advances). |
| 4 | Transaction Pin | 4-Digit PIN + Confirm (secure). Back + Continue. |
| 5 | Health Interest | Multi-select interest chips (see Phase 14). Back + "Create Account" (green). |

---

## Phase 10 — Home / "FOR YOU" Feed

```
background:     #001233 with faint health-icon line-art pattern (opacity ~0.06, VERIFY)
header:         Phase 7 feed header
search:         Phase 5 search input, marginTop 8px
feed:           vertical list of Feed Content Cards, gap 16px, paddingH 16px
tab bar:        Phase 7, 5 tabs
```

Line-art background pattern: subtle white/blue health icons (heart, cross, stethoscope) tiled behind content at very low opacity. Implement as a repeating SVG/overlay behind the ScrollView.

---

## Phase 11 — Micro-interactions & States

### Badge / Chip / Tag

```
Pulse badge:    bg #00E600, text #001233, overline, radius 6px, paddingH 8px/paddingV 3px
Article badge:  bg #329632, text #FFFFFF, overline
Count badge:    bg #D60A1D, radiusFull, min 18px, 10px Bold #FFFFFF
Status (live):  dot 6px #00E600 + label
```

### Toast / Snackbar
```
position:       top (below status bar) centered OR bottom above tab bar
background:     surface navy
borderLeft:     3px, color by type
Success #00E600 · Error #EF4444 · Warning #F59E0B · Info #0B3B8F
text:           13px Medium #FFFFFF
animation:      slide + fade 250ms; auto-dismiss 3000ms
```

### Switch / Toggle
```
track off:      rgba(255,255,255,0.15)
track on:       gradientPrimary or #D60A1D
thumb:          24px white circle, shadow
```

### Checkbox
```
size 22px, radius 6px
unchecked:      1.5px rgba(255,255,255,0.25)
checked:        bg #D60A1D, white tick
```

### Rating Stars
```
filled #F59E0B (VERIFY) · empty #374151 · gap 4px
```

---

## Phase 12 — Interest / Multi-Select Chips

> Reference: register step 5 "Health Interest" — chips in several pastel colors.

**Chip color logic (needs confirmation):** The screen shows chips in white, teal, pink, yellow, and blue. These read as **decorative variety**, not category-coded meaning. Until confirmed, treat chip fill as:

```
unselected:     bg #FFFFFF, text #001233, radiusFull, paddingH 16px/paddingV 10px
selected:       bg from a rotating pastel set OR brand accent — (VERIFY logic)
                pastel set seen: teal, pink, yellow, light-blue, white
```

> **VERIFY:** Is chip color meaningful (category/topic coded) or purely decorative? If meaningful, map each topic → color here. If decorative, standardize to one selected color (recommend `#0E2963` fill + white text) for clarity and accessibility.

---

## Phase 13 — Elevation & Shadow

| Token | Shadow | Usage |
|---|---|---|
| `elevation0` | none | Flat elements, dividers |
| `elevation1` | 0 1px 4px rgba(0,0,0,0.25) | Inputs, inactive cards |
| `elevation2` | 0 2px 8px rgba(0,0,0,0.35) | Standard cards, feed cards |
| `elevation3` | 0 4px 20px rgba(0,0,0,0.45) | Floating cards, tab bar |
| `elevation4` | 0 8px 32px rgba(0,0,0,0.55) | Modals, sheets, toasts |
| `shadowPrimary` | 0 4px 16px rgba(214,10,29,0.35) | Primary gradient button |
| `shadowSuccess` | 0 4px 16px rgba(0,230,0,0.30) | Green "Create Account" CTA |
| `shadowDestructive` | 0 4px 16px rgba(239,68,68,0.30) | Destructive button |

Rules: never put colored shadows on neutral navy cards; high elevation (sheets/modals) uses neutral black shadow only.

---

## Phase 14 — Semantic Color Token Layer

Component code must reference semantic tokens, never raw hex. Raw values live in `tokens/colors.ts`.

### Background
| Token | Raw | Usage |
|---|---|---|
| `bgBase` | `#001233` | Screen background |
| `bgBaseAlt` | `#011B45` | Gradient start, surface |
| `bgSurface` | `#011B45` | Cards, sheets |
| `bgElevated` | `#0E2963` | Dropdowns, active tab, chips |
| `bgLight` | `#E0E6ED` | Light inputs, search, social button |
| `bgOverlay` | `rgba(0,18,51,0.80)` | Modal backdrop |
| `bgErrorField` | `#F8B4B4` **(VERIFY)** | Error input fill |

### Text
| Token | Raw | Usage |
|---|---|---|
| `textPrimary` | `#FFFFFF` | Headings, content |
| `textSecondary` | `#D1D5DB` **(VERIFY)** | Body |
| `textMuted` | `#9CA3AF` **(VERIFY)** | Meta |
| `textDisabled` | `#6B7280` **(VERIFY)** | Placeholder/disabled |
| `textOnLight` | `#001233` | On `bgLight` |
| `textLink` | `#D60A1D` | Links, ghost buttons |
| `textAccentGreen` | `#00E600` | "FOR YOU", live labels |
| `textWizard` | `#00D2D2` **(VERIFY)** | "Step X of 5" |

### Action
| Token | Raw | Usage |
|---|---|---|
| `actionPrimaryTop` | `#D60A1D` | Primary gradient top |
| `actionPrimaryBottom` | `#7A000A` | Primary gradient bottom |
| `actionSuccess` | `#00E600` | Green CTA |
| `actionDestructive` | `#EF4444` | Destructive |
| `actionGhost` | `transparent` | Ghost |

### Status
| Token | Raw | Usage |
|---|---|---|
| `statusLive` | `#00E600` | Pulse / live / success |
| `statusPassive` | `#329632` | Article tag |
| `statusError` | `#EF4444` | Errors |
| `statusWarning` | `#F59E0B` **(VERIFY)** | Warnings/ratings |
| `statusInfo` | `#0B3B8F` | Info |

### Border
| Token | Raw | Usage |
|---|---|---|
| `borderDefault` | `rgba(255,255,255,0.12)` | Input default |
| `borderSubtle` | `rgba(255,255,255,0.08)` | Cards, dividers |
| `borderFocus` | `rgba(214,10,29,0.55)` | Input focus |
| `borderFilled` | `rgba(214,10,29,0.35)` | Input filled |
| `borderError` | `rgba(239,68,68,0.65)` | Input error |

---

## Phase 15 — Component State Matrix

### Button States
| State | Primary (gradient) | Success (green) | Secondary/Back | Ghost | Small (Follow) | Destructive | Icon |
|---|---|---|---|---|---|---|---|
| Default | `#D60A1D→#7A000A` | `#00E600` | light `#E0E6ED` | transparent, `textLink` | gradient | `#EF4444` | `rgba(255,255,255,0.08)` |
| Pressed | darken 8% + scale 0.96 | darken + scale 0.96 | darken 6% + scale 0.96 | opacity 0.70 | scale 0.96 | darken + scale 0.96 | `rgba(255,255,255,0.14)` |
| Disabled | 35% opacity | 35% opacity | 50% opacity | `textDisabled` | 35% opacity | `rgba(239,68,68,0.35)` | icon disabled |
| Loading | spinner, same bg | spinner | spinner | spinner 14px | spinner 12px | spinner | spinner 16px |

### Text Input States
| State | Background | Border | Trailing |
|---|---|---|---|
| Default | `bgLight`/`bgSurface` | `borderDefault` | — |
| Focused | same + subtle red tint | `borderFocus` | — |
| Filled/Valid | same | `borderFilled` | ✓ `#00E600` 20px |
| Error | `#F8B4B4` **(VERIFY)** | `borderError` | ✗ `#EF4444` + helper text |
| Disabled | `bgElevated` | `borderSubtle` | — |

### Dropdown States
| State | Border | Trailing |
|---|---|---|
| Default | `borderDefault` | chevron-down muted |
| Open | `borderFocus` | chevron-up `#D60A1D` |
| Selected | `borderFilled` | chevron-down `#D60A1D` |
| Disabled | `borderSubtle` | chevron-down disabled |

### Tab Bar Item States
| State | Icon | Label | Indicator |
|---|---|---|---|
| Inactive | muted | muted | none |
| Active | `#FFFFFF` | `#FFFFFF` | `#0E2963` rounded background block |
| Pressed | `#FFFFFF` scale 1.1 | `#FFFFFF` | — |

### Chip (interest) States
| State | Background | Text | Border |
|---|---|---|---|
| Unselected | `#FFFFFF` | `#001233` | none |
| Selected | pastel/accent **(VERIFY)** | contrast | optional |
| Disabled | opacity 0.5 | — | — |

---

## Phase 16 — Motion

| Token | Value |
|---|---|
| `durationFast` | 150ms (press, badge pop) |
| `durationNormal` | 250ms (toast, tab, focus) |
| `durationSlow` | 400ms (modal/sheet) |
| `durationXSlow` | 600ms (onboarding transitions) |

Easing: `standard cubic-bezier(0.4,0,0.2,1)`, `decelerate (0,0,0.2,1)`, `accelerate (0.4,0,1,1)`.
Spring: `default {damping:18,stiffness:180}`, `soft {damping:22,stiffness:120}`.

Per-component: button press scale 0.96 + opacity 0.85; card press scale 0.97; progress bar width tween `durationSlow` decelerate; sheet slide `durationSlow` springSoft; onboarding slide crossfade `durationNormal`.

Reduced motion: when `AccessibilityInfo.isReduceMotionEnabled()` is true, use opacity fades only, disable scale/translate, static shimmer, cap durations at `durationFast`.

---

## Phase 17 — Accessibility

- **Touch targets:** minimum 44×44px; add `hitSlop` for smaller visuals (icon buttons, chips, ghost links).
- **Contrast (WCAG AA, verify at build):**
  - `#FFFFFF` on `#001233` → ~17:1 ✅
  - `#00E600` on `#001233` → high ✅ (but green-on-navy for small text: pair with weight)
  - `#FFFFFF` on `#D60A1D` → **(VERIFY ~4.5:1)**; if it fails, darken text or add shadow
  - Green CTA text color **(VERIFY)** — choose `#001233` or `#FFFFFF` to pass AA
- **Color is never the only signal:** error = red border + icon + helper text; active tab = color + `#0E2963` block; Pulse/Article = color + text label.
- **Screen reader:** every interactive element has `accessibilityRole` + `accessibilityLabel`; inputs add `accessibilityHint`; tabs use `role="tab"` + `accessibilityState.selected`; decorative images `accessible={false}`.
- **Dynamic type:** body/caption scale with system font; display/heading/label fixed (`allowFontScaling={false}`) to protect layout.

> Note: full WCAG validation requires manual testing with assistive tech and expert review; the ratios above are guidance, not a substitute.

---

## Phase 18 — Responsive Device Classes

| Class | Width | Padding | Hero height | Tab bar |
|---|---|---|---|---|
| small | ≤360px | 12px | 180px | 60px |
| standard | 361–430px | 16px | 220px | 64px |
| large | 431–767px | 20px | 260px | 64px |
| tablet | ≥768px | 32px | 300px | 72px |

Interest/category chips wrap responsively. Feed cards stay single-column on phones; 2-column on tablet.

---

## Phase 19 — Z-Index Layering

| Token | Value | Usage |
|---|---|---|
| `zBase` | 0 | Content |
| `zRaised` | 1 | Elevated cards |
| `zSticky` | 10 | Sticky headers, pinned CTA |
| `zHeader` | 20 | Top nav, tab bar |
| `zOverlay` | 50 | Backdrop |
| `zBottomSheet` | 100 | Sheets, drawers |
| `zToast` | 200 | Toasts |
| `zModal` | 300 | Modals, dialogs |

Rules: no raw z-index integers; toasts render at root; sheets render in a Portal.

---

## Phase 20 — Token Export Structure

```
tokens/
  colors.ts     ← semantic tokens + raw palette (Phase 1 + 14), dark now, light stub later
  typography.ts ← Roboto family + type scale (Phase 2)
  spacing.ts    ← 8px grid (Phase 3)
  radius.ts     ← radiusButton 12 + radiusLG 16 + radiusFull (Phase 3)
  shadows.ts    ← elevation + colored variants (Phase 13)
  motion.ts     ← duration/easing/spring (Phase 16)
  zIndex.ts     ← named layers (Phase 19)
```

Rules: camelCase tokens; no magic numbers in component code; semantic tokens are the public API, raw hex is private to `colors.ts`. Gradients should be exported as stop arrays (e.g. `gradientPrimary = ['#D60A1D', '#7A000A']`) for `expo-linear-gradient`.

### Light-mode stub (fill when ready)
```typescript
// tokens/colors.ts
const dark = { /* values above */ };
const light = {
  bgBase:       '#______',  // TODO when light screens exist
  bgSurface:    '#______',
  textPrimary:  '#______',
  // ...map every semantic token
};
export const Colors = colorScheme === 'dark' ? dark : light;
```

---

## Phase 21 — Open Questions / VERIFY list

Resolve these to remove ambiguity before implementation:

1. Exact teal hex for "Step X of 5" (`wizardAccent`).
2. Primary gradient confirmed `#D60A1D → #7A000A`; confirm the **green CTA** uses a flat `#00E600` or a gradient, and its text color for AA contrast.
3. Error input fill exact hex (approx `#F8B4B4`).
4. Grey text ramp (`textSecondary/Muted/Disabled`) — confirm or replace legacy defaults.
5. Interest chip color logic — decorative vs category-coded.
6. Onboarding indicator color progression (red→amber→green) — intentional cue?
7. Currency list-row light-blue fill exact hex.
8. Feed card image height and the exact subtle border/pattern opacity.
9. Button height (56px default carried from legacy) and small/Follow button exact height + radius.
10. Search bar radius (full pill vs 12px).

---

## Phase 22 — Consistency Checklist

### Colors
- [ ] Background uses `bgBase` `#001233` (navy) — never near-black `#0a0a15` (legacy) or pure black.
- [ ] Primary actions use the red gradient `#D60A1D → #7A000A` — never flat `#C62229` (legacy).
- [ ] Green `#00E600` used only for live/active/success; `#329632` only for Article tags.
- [ ] No raw hex in component code — all via semantic tokens.

### Typography
- [ ] Font is Roboto (not Inter).
- [ ] Tab/badge labels UPPERCASE with correct tracking.
- [ ] No font below 11px.

### Buttons
- [ ] Buttons are soft-rect 12–14px radius — NOT full pills (except circular icon buttons/avatars).
- [ ] Primary = gradient; final-step CTA = green; Back = light.
- [ ] 44px minimum touch target.

### Inputs
- [ ] Error state uses pink fill + red border + helper text + icon.
- [ ] Focus border is red `borderFocus`.

### Cards
- [ ] Feed cards: 16px radius, image + red gradient title block + royal-blue action strip + Pulse/Article badge.

### Navigation
- [ ] 5-tab bar; active tab on `#0E2963` block.
- [ ] Wizard progress bar green fill on white track; "Step X of 5" in teal.

### Accessibility
- [ ] Color never the only state signal.
- [ ] Every interactive element labeled; reduced motion respected.

---

*End of Ambrosia Brand Design Guide v2 — "Navy Health".*
*Covers: Brand, Colors, Typography, Spacing/Radius, Buttons, Inputs, Cards, Navigation, Onboarding, Auth/Registration, Home Feed, Micro-interactions, Chips, Elevation, Semantic Tokens, State Matrix, Motion, Accessibility, Responsive, Z-Index, Token Export, Open Questions, Consistency.*
*Items marked (VERIFY) are provisional and must be confirmed before implementation.*
