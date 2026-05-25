# Ambrosia — Mobile Design System
> Dark theme · Global standard · Based on reference screens analysis

---

## Overview

This guide defines every visual and dimensional token for the Ambrosia React Native app.
It is derived from the Dochub reference screens provided, adapted to our dark theme and red-primary palette.
Every measurement, color, font size, and spacing value here is the single source of truth.
No screen should deviate from these specs.

---

## Phase 1 — Color System (Dark Theme)

### Primary Palette (from `constants/Colors.ts`)

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0a0a15` | Page/screen background |
| `surface` | `#0f0f1e` | Cards, modals, bottom sheets |
| `surfaceElevated` | `#141428` | Elevated cards, dropdowns |
| `primary` | `#C62229` | Primary CTA buttons, active tab, links |
| `primaryBright` | `#E42326` | Hover/pressed state on primary |
| `primaryDeep` | `#B42733` | Gradient end, deep shadows |
| `primaryCrimson` | `#73141D` | Dark borders, deep accents |
| `primaryMid` | `#9A404B` | Secondary actions |
| `primaryCoral` | `#D75D64` | Tertiary, share, soft CTA |
| `primaryRose` | `#DB8588` | Subtle tints, settings icons |
| `primaryBlush` | `#EAAFB2` | Very subtle backgrounds |
| `primaryGold` | `#8B6830` | Wallet, premium, security badges |
| `blue` | `#3B82F6` | Info states, links, secondary accent |
| `green` | `#22C55E` | Success, online status, verified |
| `amber` | `#F59E0B` | Warning, ratings stars |
| `error` | `#EF4444` | Destructive actions, errors |

### Text Colors

| Token | Hex | Usage |
|---|---|---|
| `textPrimary` | `#FFFFFF` | Headings, primary content |
| `textSecondary` | `#D1D5DB` | Body text, descriptions |
| `textMuted` | `#9CA3AF` | Placeholders, captions, timestamps |
| `textDim` | `#6B7280` | Disabled text, hints |

### Border & Surface Tints

| Token | Value | Usage |
|---|---|---|
| `borderSubtle` | `rgba(255,255,255,0.08)` | Card borders, dividers |
| `borderNeutral` | `rgba(255,255,255,0.12)` | Input borders (default) |
| `redBorder` | `rgba(198,34,41,0.25)` | Input borders (focused) |
| `redBorderActive` | `rgba(198,34,41,0.55)` | Input borders (active/filled) |
| `redSurface` | `rgba(198,34,41,0.06)` | Subtle red-tinted card bg |
| `redSurfaceStrong` | `rgba(198,34,41,0.15)` | Stronger red tint |

### Dark Theme Adaptation of Reference Screens

The reference screens (Dochub) use a white/light background with blue primary.
Our adaptation maps as follows:

| Dochub (light) | Ambrosia (dark) |
|---|---|
| White screen bg | `#0a0a15` |
| White card bg | `#0f0f1e` |
| Light grey section bg | `#141428` |
| Blue primary `#2563EB` | Red primary `#C62229` |
| Blue active tab | Red active tab `#C62229` |
| Black text | `#FFFFFF` |
| Grey subtext | `#9CA3AF` |
| Blue input border (focused) | `rgba(198,34,41,0.55)` |
| Green success badge | `#22C55E` (unchanged) |
| Yellow/amber stars | `#F59E0B` (unchanged) |


---

## Phase 2 — Typography System

### Font Family

Primary font: **Inter** (system default on Android/iOS, closest to what the reference screens use)
Fallback: `System` → `SF Pro` (iOS) / `Roboto` (Android)

```
fontFamily: {
  regular:    'Inter_400Regular',
  medium:     'Inter_500Medium',
  semiBold:   'Inter_600SemiBold',
  bold:       'Inter_700Bold',
}
```

### Type Scale

Observed from reference screens — measured against 390px wide iPhone frame:

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `displayLarge` | 32px | 700 Bold | 40px | -0.5 | Splash/Intro hero titles |
| `displayMedium` | 28px | 700 Bold | 36px | -0.3 | Welcome screen titles |
| `headingXL` | 24px | 700 Bold | 32px | -0.2 | Screen titles (auth pages) |
| `headingLG` | 20px | 700 Bold | 28px | -0.1 | Section headings, card titles |
| `headingMD` | 18px | 600 SemiBold | 26px | 0 | Sub-section titles |
| `headingSM` | 16px | 600 SemiBold | 24px | 0 | Card headings, list item titles |
| `bodyLG` | 16px | 400 Regular | 24px | 0 | Primary body text |
| `bodyMD` | 14px | 400 Regular | 22px | 0 | Secondary body, descriptions |
| `bodySM` | 13px | 400 Regular | 20px | 0 | Captions, meta info |
| `labelLG` | 16px | 600 SemiBold | 20px | 0.1 | Button labels (primary) |
| `labelMD` | 14px | 600 SemiBold | 18px | 0.1 | Button labels (secondary/small) |
| `labelSM` | 12px | 500 Medium | 16px | 0.2 | Tab bar labels, badges |
| `caption` | 11px | 400 Regular | 16px | 0.3 | Timestamps, fine print |
| `overline` | 11px | 600 SemiBold | 14px | 1.0 | Category labels, tags |

### Typography Rules

- Screen page titles (e.g. "History", "Inbox", "Profile") → `headingLG` (20px Bold), centered, `textPrimary`
- Auth screen greeting (e.g. "Hello, Welcome Back!") → `headingXL` (24px Bold), left-aligned
- Auth screen subtitle → `bodyMD` (14px Regular), `textMuted`
- Input field labels → `bodySM` (13px SemiBold), `textSecondary`, 8px margin-bottom
- Input placeholder text → `bodyMD` (14px Regular), `textDim`
- Input filled text → `bodyMD` (14px Regular), `textPrimary`
- Primary button label → `labelLG` (16px SemiBold), `#FFFFFF`
- Secondary button label → `labelLG` (16px SemiBold), `textPrimary`
- Tab bar label → `labelSM` (12px Medium)
- Card title → `headingSM` (16px SemiBold), `textPrimary`
- Card subtitle/meta → `bodySM` (13px Regular), `textMuted`
- Price text → `headingMD` (18px Bold), `primaryGold` (#8B6830) or `primary` (#C62229)
- Section header → `headingMD` (18px SemiBold), `textPrimary`, left-aligned
- Notification/inbox item title → `bodySM` (13px SemiBold), `textPrimary`
- Notification/inbox item body → `bodySM` (13px Regular), `textMuted`
- Timestamp → `caption` (11px Regular), `textDim`


---

## Phase 3 — Spacing & Layout System

### Base Unit

All spacing is based on a **4px grid**. Every margin, padding, and gap must be a multiple of 4.

| Token | Value | Usage |
|---|---|---|
| `space1` | 4px | Micro gaps, icon-to-label |
| `space2` | 8px | Tight internal padding, label margins |
| `space3` | 12px | Input internal padding (vertical) |
| `space4` | 16px | Standard horizontal screen padding |
| `space5` | 20px | Card internal padding |
| `space6` | 24px | Section gaps, between form fields |
| `space8` | 32px | Large section separators |
| `space10` | 40px | Hero section padding |
| `space12` | 48px | Bottom safe area padding |

### Screen Layout

- Horizontal screen padding: **20px** left and right (observed from all reference screens)
- Safe area top: respect device status bar (use `useSafeAreaInsets`)
- Safe area bottom: **34px** on iPhone notch devices, **16px** on Android
- Max content width: **390px** (iPhone 14 base — all designs target this)
- Scroll content bottom padding: **100px** (clears the tab bar + safe area)

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `radiusXS` | 6px | Badges, chips, small tags |
| `radiusSM` | 8px | Small buttons, input icons |
| `radiusMD` | 12px | Standard inputs, small cards |
| `radiusLG` | 16px | Cards, modals, list items |
| `radiusXL` | 20px | Bottom sheets, large cards |
| `radius2XL` | 24px | Hero cards, profile header |
| `radiusFull` | 999px | Pills, primary buttons, avatar |

> Reference: Primary buttons in all screens use `radiusFull` (fully rounded pill shape).
> Cards use `radiusLG` (16px). Bottom sheets use `radiusXL` (20px) on top corners only.


---

## Phase 4 — Button System

### Button Anatomy (from reference screens)

All primary buttons observed across every reference screen share these exact dimensions:

```
Width:          fill_container (100% of horizontal padding area)
Height:         56px
Border Radius:  999px (full pill)
Padding H:      24px
Font:           labelLG — 16px SemiBold
Icon gap:       8px (when icon present, e.g. "→ Continue")
```

### Button Variants

#### Primary Button
> Used: "Login", "Continue", "Next", "Get Started", "Book", "Submit", "Save Changes"
> Reference: Blue pill button at bottom of every auth/action screen

```
background:     #C62229
text:           #FFFFFF
height:         56px
borderRadius:   999px
width:          fill (marginH: 20px)
fontSize:       16px
fontWeight:     600
shadow:         0 4px 16px rgba(198,34,41,0.35)
```

States:
- Default: `#C62229`
- Pressed: `#B42733` (primaryDeep)
- Disabled: `rgba(198,34,41,0.35)`, text `rgba(255,255,255,0.4)`
- Loading: spinner replaces label, same background

#### Secondary Button (Outline)
> Used: "Register", "Cancel", "Skip" (as button), "Edit Profile"

```
background:     transparent
border:         1.5px solid rgba(255,255,255,0.20)
text:           #FFFFFF
height:         56px
borderRadius:   999px
width:          fill or auto (min-width 120px)
fontSize:       16px
fontWeight:     600
```

States:
- Pressed: background `rgba(255,255,255,0.06)`

#### Ghost / Text Button
> Used: "Forgot Password?", "Skip" (inline), "Request Again", "Change"

```
background:     transparent
text:           #C62229
fontSize:       14px
fontWeight:     600
underline:      none (color alone signals interactivity)
```

#### Small Pill Button
> Used: "Consult", "Buy Now", "Order Again", "Change" (in settings rows)

```
background:     #C62229
text:           #FFFFFF
height:         36px
borderRadius:   999px
paddingH:       16px
fontSize:       14px
fontWeight:     600
minWidth:       80px
```

#### Destructive Button
> Used: "Yes, Logout", "Yes, Continue" (logout confirm)

```
background:     #EF4444
text:           #FFFFFF
height:         56px
borderRadius:   999px
width:          fill
fontSize:       16px
fontWeight:     600
shadow:         0 4px 16px rgba(239,68,68,0.30)
```

#### Icon Button (circular)
> Used: Bell/notification icon, map pin, three-dot menu, back arrow

```
background:     rgba(255,255,255,0.08)
size:           40px × 40px
borderRadius:   999px
iconSize:       20px
iconColor:      #FFFFFF or #9CA3AF
```

### Button Spacing Rules

- Primary CTA always sits **20px above the bottom safe area** or **20px above the keyboard**
- When two buttons appear side by side (e.g. "Cancel" + "Yes, Logout"), gap between them is **12px**
- Side-by-side buttons: each takes `(screenWidth - 40px - 12px) / 2` width
- Never stack more than 2 buttons vertically without a divider


---

## Phase 5 — Input System

### Standard Text Input
> Reference: Phone number, password, email, name fields across all auth screens

```
height:         56px
borderRadius:   12px (radiusMD)
borderWidth:    1.5px
borderColor:    rgba(255,255,255,0.12)   ← default
background:     #0f0f1e                  ← surface
paddingH:       16px
paddingV:       0 (vertically centered text)
fontSize:       14px (bodyMD)
fontWeight:     400
textColor:      #FFFFFF
placeholderColor: #6B7280
```

Focus state:
```
borderColor:    rgba(198,34,41,0.55)
background:     rgba(198,34,41,0.04)
```

Filled/valid state:
```
borderColor:    rgba(198,34,41,0.35)
trailingIcon:   green checkmark ✓ (#22C55E), 20px
```

Error state:
```
borderColor:    rgba(239,68,68,0.55)
background:     rgba(239,68,68,0.04)
helperText:     12px Regular, #EF4444, 4px below input
```

### Input with Label

```
label:          13px SemiBold, #D1D5DB, marginBottom: 8px
input:          (standard spec above)
gap between label and input: 8px
gap between input and next field: 20px
```

### Phone Input (Country Code + Number)
> Reference: "Create an Account" and "Welcome back" screens — split input row

```
Row layout:     horizontal, gap: 8px
Country picker: width 80px, height 56px, borderRadius 12px, border same as input
                Contains: flag emoji (20px) + chevron down (14px, textMuted)
Number input:   flex: 1, height 56px, same styling as standard input
```

### OTP / Verification Code Input
> Reference: "Verify Phone" screen — 6 individual boxes

```
Each box:       width 48px, height 56px
borderRadius:   12px
borderWidth:    1.5px
borderColor:    rgba(255,255,255,0.12)   ← empty
background:     #0f0f1e
fontSize:       20px Bold
textAlign:      center
textColor:      #FFFFFF
gap between boxes: 8px
```

Filled box:
```
borderColor:    rgba(198,34,41,0.55)
background:     rgba(198,34,41,0.06)
```

### Search Input
> Reference: "Find Doctor", "Book Hospital", "Find Medicine" screens

```
height:         48px
borderRadius:   999px (full pill — matches reference screens)
borderWidth:    0
background:     #141428 (surfaceElevated)
paddingH:       16px
leadingIcon:    search icon, 18px, #9CA3AF, 8px gap to text
fontSize:       14px
placeholderColor: #6B7280
```

### Textarea / Multi-line Input
> Reference: "Write Review" screen

```
minHeight:      120px
borderRadius:   12px
borderWidth:    1.5px
borderColor:    rgba(255,255,255,0.12)
background:     #0f0f1e
paddingH:       16px
paddingV:       14px
fontSize:       14px
textAlignVertical: top
characterCount: 11px Regular, #6B7280, top-right corner inside
```

### Dropdown / Select Input
> Reference: "Book Hospital" — "Choose Doctor" dropdown

```
height:         56px
borderRadius:   12px
borderWidth:    1.5px
borderColor:    rgba(255,255,255,0.12)
background:     #0f0f1e
paddingH:       16px
trailingIcon:   chevron down, 18px, #9CA3AF
fontSize:       14px
placeholderColor: #6B7280
```

### Date/Time Picker Input
> Reference: "Book Hospital" — "Date and Time" field

```
Same dimensions as standard input (56px height, 12px radius)
trailingIcon:   calendar icon, 20px, #C62229
```


---

## Phase 6 — Card System

### Standard List Card
> Reference: Doctor list, hospital list, medicine list, inbox message list

```
background:     #0f0f1e
borderRadius:   16px (radiusLG)
borderWidth:    1px
borderColor:    rgba(255,255,255,0.08)
paddingH:       16px
paddingV:       16px
marginBottom:   12px
shadow:         0 2px 8px rgba(0,0,0,0.30)
```

Internal layout:
```
Row: [thumbnail 64×64px, radius 10px] + [content column] + [trailing action]
Content column gap: 4px
Thumbnail to content gap: 12px
```

### Profile / User Card (Welcome card on Home)
> Reference: "Welcome back, Kitani" card with avatar + location

```
background:     #0f0f1e
borderRadius:   16px
paddingH:       16px
paddingV:       16px
avatar:         56×56px, borderRadius 999px
avatar border:  2px solid #C62229
VIP badge:      position absolute bottom-left of avatar
                background #C62229, borderRadius 4px, 10px SemiBold, paddingH 4px
name:           16px SemiBold, #FFFFFF
meta row:       location icon 14px #C62229 + 13px Regular #9CA3AF
```

### Promo / Banner Card
> Reference: "Discount 50% off" blue banner card

```
background:     linear gradient → #C62229 to #B42733
borderRadius:   16px
paddingH:       20px
paddingV:       20px
height:         ~140px
overflow:       hidden
decorative shapes: abstract circles/blobs, opacity 0.15, positioned top-right
```

Text inside:
```
label:          12px SemiBold, rgba(255,255,255,0.75), uppercase
value:          32px Bold, #FFFFFF
code box:       borderWidth 1.5px, borderColor rgba(255,255,255,0.5), borderRadius 6px
                paddingH 10px, paddingV 4px, 12px SemiBold #FFFFFF
```

### Schedule / Appointment Card
> Reference: "Your Schedule" card with hospital image + doctor info

```
background:     #0f0f1e
borderRadius:   16px
overflow:       hidden
image:          width fill, height 140px, objectFit cover
content area:   paddingH 16px, paddingV 12px
date/time:      12px Regular, #9CA3AF
doctor row:     avatar 36×36px radius 999px + name 14px SemiBold + specialty 12px #9CA3AF
location pin:   absolute top-right of image, 36×36px circle, background #C62229, icon white 16px
```

### Specialty / Category Grid Card
> Reference: "Choose Specialties", "Category" grid items

```
background:     #141428
borderRadius:   12px
width:          (screenWidth - 40px - 8px) / 2   ← 2-column grid
paddingV:       20px
paddingH:       12px
alignItems:     center
icon:           48×48px illustration/icon
label:          12px Medium, #D1D5DB, marginTop 8px, textAlign center
```

Selected state:
```
borderWidth:    1.5px
borderColor:    #C62229
background:     rgba(198,34,41,0.08)
checkmark:      16px circle, background #C62229, top-left corner, white tick 10px
```

### Quick Action Card (3-column grid)
> Reference: "Consultation / Appointment / Buy Medicine" row on Home

```
background:     #141428
borderRadius:   12px
width:          (screenWidth - 40px - 16px) / 3
paddingV:       16px
paddingH:       8px
alignItems:     center
icon:           40×40px
label:          11px Medium, #D1D5DB, marginTop 6px, textAlign center
```

### Settings / Menu Row Card
> Reference: Profile screen menu items

```
background:     #0f0f1e
borderRadius:   12px
height:         56px
paddingH:       16px
layout:         row, alignItems center
leadingIcon:    20px, color #C62229 or #9CA3AF, marginRight 12px
label:          15px Regular, #FFFFFF
trailingChevron: 16px, #6B7280
divider:        1px rgba(255,255,255,0.06) between items (not after last)
marginBottom:   8px between card groups
```

### Transaction / History Row Card
> Reference: Transaction history, history list

```
background:     #0f0f1e
borderRadius:   12px
paddingH:       16px
paddingV:       14px
marginBottom:   8px
layout:         row
thumbnail:      56×56px, borderRadius 10px, objectFit cover
content:        flex 1, marginLeft 12px
title:          14px SemiBold, #FFFFFF
subtitle:       12px Regular, #9CA3AF, marginTop 2px
price:          16px Bold, #C62229 or #8B6830
trailing:       chevron 16px #6B7280 or small action button
```

### Empty State Card
> Reference: "No History Yet", "No messages today", "No notifications"

```
container:      flex 1, alignItems center, justifyContent center
illustration:   120×120px (use Unsplash or local SVG)
title:          18px SemiBold, #FFFFFF, marginTop 24px
subtitle:       14px Regular, #9CA3AF, marginTop 8px, textAlign center, maxWidth 260px
CTA button:     Small Pill Button spec (36px height, #C62229)
                marginTop: 20px
```


---

## Phase 7 — Navigation System

### Bottom Tab Bar
> Reference: All main screens — Home, History, Inbox, Profile (4 tabs)

```
container:
  background:       #0f0f1e
  borderTopWidth:   1px
  borderTopColor:   rgba(255,255,255,0.08)
  height:           64px (+ safe area bottom inset)
  paddingTop:       8px
  paddingBottom:    8px + safeAreaBottom
  shadow:           0 -4px 20px rgba(0,0,0,0.40)

tab item:
  flex:             1
  alignItems:       center
  justifyContent:   center
  gap:              4px

icon:
  size:             24px
  color (inactive): #6B7280
  color (active):   #C62229

label:
  fontSize:         11px
  fontWeight:       500
  color (inactive): #6B7280
  color (active):   #C62229

active indicator:
  Option A (pill): width 32px, height 3px, borderRadius 999px, background #C62229,
                   positioned above icon, marginBottom 4px
  Option B (dot):  8px circle, background #C62229, positioned top-right of icon
```

> Note: Reference screens show a floating pill-shaped tab bar with white background and subtle shadow.
> In our dark theme, the tab bar sits flush at the bottom with a top border and elevated shadow.

### Top Navigation Bar (Screen Header)
> Reference: "History", "Inbox", "Profile", "Book Hospital", "Find Doctor" screens

```
height:           56px
background:       #0a0a15 (transparent over content on hero screens)
paddingH:         20px
layout:           row, alignItems center

title:
  fontSize:       18px (headingMD)
  fontWeight:     700
  color:          #FFFFFF
  position:       center (absolute center or flex center)

back button (left):
  icon:           chevron-left or arrow-left, 24px, #FFFFFF
  hitSlop:        12px all sides
  background:     rgba(255,255,255,0.08) circle 36×36px (on hero/image screens)
  background:     transparent (on plain screens)

trailing action (right):
  icon:           24px, #FFFFFF or #C62229
  background:     same rule as back button
  examples:       bell (notifications), three-dot (more), clock (history), search
```

### Floating Header (Hero Image Screens)
> Reference: Doctor profile, Hospital detail, Medicine detail screens

```
Back button:    absolute top-left, 16px from edge, 16px from safe area top
                40×40px circle, background rgba(0,0,0,0.45), icon white 20px
                backdropFilter: blur(8px)
Trailing:       same spec, top-right
Title:          NOT shown in header — appears in the bottom sheet content
```

### Progress Bar (Onboarding / Wizard)
> Reference: "What is your name?", "How old are you?" wizard screens

```
container:      width fill, height 4px, background rgba(255,255,255,0.10), borderRadius 999px
fill:           height 4px, background #C62229, borderRadius 999px
                width: animated (e.g. 33% for step 1 of 3)
position:       below header, marginH 20px, marginBottom 24px
```

### Modal / Bottom Sheet
> Reference: Logout confirmation, "Ok, I understand" overlay, category picker

```
overlay:        rgba(0,0,0,0.75)
sheet:
  background:   #0f0f1e
  borderRadius: 24px 24px 0 0 (top corners only)
  paddingH:     20px
  paddingTop:   12px
  paddingBottom: 20px + safeAreaBottom

drag handle:
  width:        40px
  height:       4px
  borderRadius: 999px
  background:   rgba(255,255,255,0.20)
  alignSelf:    center
  marginBottom: 16px

title:          18px Bold, #FFFFFF, textAlign center, marginBottom 8px
body:           14px Regular, #9CA3AF, textAlign center, marginBottom 24px
buttons:        follow Button System spec
```

### Tooltip / Contextual Hint
> Reference: "Start book hospital" tooltip, "You can find types of doctor" hint card

```
background:     #141428
borderRadius:   12px
paddingH:       16px
paddingV:       12px
borderWidth:    1px
borderColor:    rgba(255,255,255,0.08)
step label:     11px SemiBold, #9CA3AF (e.g. "1/4")
title:          15px SemiBold, #FFFFFF, marginTop 4px
body:           13px Regular, #9CA3AF, marginTop 4px
actions row:    "Skip" ghost button left + "Next" small pill button right
                marginTop: 12px
```


---

## Phase 8 — Splash Screen & Intro Screens

### Splash Screen
> Reference: Image 4 — full blue background, centered logo on white rounded card

```
Screen:
  background:       #0a0a15
  flex:             1
  alignItems:       center
  justifyContent:   center

Logo container:
  width:            120px
  height:           120px
  borderRadius:     28px
  background:       #0f0f1e
  shadow:           0 8px 32px rgba(198,34,41,0.25)
  alignItems:       center
  justifyContent:   center

Logo image:
  width:            80px
  height:           80px
  resizeMode:       contain

Animation:
  Entry: fade in + scale from 0.85 → 1.0 over 600ms (ease-out)
  Duration on screen: 2000ms
  Exit: fade out over 300ms

Background glow (optional):
  Radial gradient centered behind logo
  color: rgba(198,34,41,0.08), radius 200px
```

> Unsplash reference for dark app splash mood:
> https://unsplash.com/photos/black-background-with-red-light-bokeh — abstract dark with warm glow

### Welcome / Landing Screen
> Reference: Image 12 — full-bleed photo top half, white sheet bottom half with title + CTA

```
Layout:
  Top section (55% of screen height):
    Full-bleed image, objectFit cover
    Gradient overlay at bottom: linear rgba(0,0,0,0) → rgba(10,10,21,1)

  Bottom sheet (45% of screen height):
    background:     #0f0f1e
    borderRadius:   24px 24px 0 0
    paddingH:       24px
    paddingTop:     28px
    paddingBottom:  20px + safeAreaBottom

  Title:            28px Bold, #FFFFFF, marginBottom 8px
  Subtitle:         14px Regular, #9CA3AF, marginBottom 32px
  CTA Button:       Primary Button spec (56px, full pill, #C62229)
```

> Unsplash image for Welcome screen (community/social app):
> https://unsplash.com/photos/group-of-people-using-smartphones — diverse people on phones
> Query: "people community mobile app"

### Onboarding / Intro Carousel Screens
> Reference: Images 1, 2 — slide with illustration top, text + dots + button bottom

```
Screen layout:
  background:       #0a0a15
  flex:             1

Top section (60% height):
  background:       #C62229 (primary) — solid color behind illustration
                    OR gradient: #C62229 → #73141D
  borderRadius:     0 0 32px 32px
  overflow:         hidden
  Illustration:     centered, width 260px, height auto
  Decorative blobs: abstract circles, opacity 0.12, scattered

  Skip button:      top-right, 14px SemiBold, #FFFFFF, opacity 0.8

Bottom section (40% height):
  paddingH:         24px
  paddingTop:       32px

  Title:            24px Bold, #FFFFFF, textAlign center
  Subtitle:         14px Regular, #9CA3AF, textAlign center, marginTop 8px, maxWidth 280px

  Pagination dots:
    marginTop:      24px
    dot size:       8px circle
    active dot:     width 24px (pill), background #C62229
    inactive dot:   8px circle, background rgba(255,255,255,0.25)
    gap:            6px

  Next/CTA button:  Primary Button spec, marginTop 24px
```

> Unsplash images for onboarding illustrations (adapt to dark theme):
> Slide 1 — "mobile payment wallet": https://unsplash.com/s/photos/mobile-payment
> Slide 2 — "community social network": https://unsplash.com/s/photos/social-community
> Slide 3 — "secure privacy lock": https://unsplash.com/s/photos/digital-security

### Auth Entry Screen (Phone/Email choice)
> Reference: Image 3 — logo top, illustration card, single CTA button

```
background:       #0a0a15
paddingH:         24px
paddingTop:       60px (below status bar)

Logo:             centered, 56×56px
App name:         20px Bold, #FFFFFF, marginTop 12px, textAlign center
Tagline:          13px Regular, #9CA3AF, marginTop 4px, textAlign center

Illustration card:
  marginTop:      32px
  background:     #0f0f1e
  borderRadius:   20px
  overflow:       hidden
  height:         240px
  image:          fill, objectFit cover

CTA button:       Primary Button, marginTop 32px
Secondary link:   "Already have an account? Sign In" — 14px Regular, #9CA3AF
                  "Sign In" portion: #C62229 SemiBold
                  textAlign center, marginTop 16px
```


---

## Phase 9 — Auth Screens

### Sign In Screen
> Reference: Images 7, 8 — "Hello, Welcome Back!" with phone + password fields

```
background:       #0a0a15
paddingH:         20px
paddingTop:       24px (below back button)

Back button:      top-left, icon-only, 40×40px circle rgba(255,255,255,0.08)

Greeting:
  title:          24px Bold, #FFFFFF  ("Hello,\nWelcome Back!")
  subtitle:       14px Regular, #9CA3AF, marginTop 6px

Form:
  marginTop:      32px
  field gap:      20px

  Phone field:    Country picker + number input (Phase 5 spec)
  Password field: Standard input + trailing eye-toggle icon (20px, #9CA3AF)

Forgot password: 13px SemiBold, #C62229, textAlign right, marginTop 8px

CTA:             Primary Button, position bottom (20px above safe area)
                 OR marginTop auto (pushes to bottom)
```

### Sign Up / Register Screen
> Reference: Images 10, 11 — "Create an Account" with phone + name

```
Same layout as Sign In
title:            "Create an Account." + emoji
subtitle:         "Register your phone number below."

Fields:
  Row 1:          Country picker + phone number
  Row 2:          Full Name input

Error toast:
  position:       absolute top (below status bar), centered
  background:     #EF4444
  borderRadius:   999px
  paddingH:       20px, paddingV: 10px
  text:           13px SemiBold, #FFFFFF
  example:        "Phone already registered"
```

### OTP Verification Screen
> Reference: Image 26 — "Verify Phone" with 6 individual boxes

```
title:            "Enter 6 digit verification"  — 18px Bold, #FFFFFF
subtitle:         "Code is sent to +X XXX XXX XXXX" — 13px Regular, #9CA3AF
                  phone number portion: #FFFFFF SemiBold

OTP boxes:        6 boxes, spec in Phase 5
marginTop:        32px

Resend row:
  "Didn't receive code?" — 13px Regular, #9CA3AF
  "Request Again" — 13px SemiBold, #C62229
  marginTop: 20px

CTA:              Primary Button at bottom
```

### Forgot Password Screen
> Reference: Image 19 — illustration + email input

```
Illustration:     120×120px centered, marginTop 40px
title:            "Forgotten your password" — 20px Bold, #FFFFFF, textAlign center, marginTop 20px
subtitle:         14px Regular, #9CA3AF, textAlign center, maxWidth 260px, marginTop 8px

Email field:      Standard input, label "Your Email", marginTop 32px
CTA:              Primary Button at bottom ("Submit")
```

### Profile Setup Wizard
> Reference: Images 21, 18 — "What is your name?", "How old are you?" step screens

```
Progress bar:     Phase 7 spec, step X of N
Question:         24px Bold, #FFFFFF, marginTop 24px
Input:            Standard input, no label (question IS the label)
CTA:              Primary Button ("Next"), position bottom
```


---

## Phase 10 — Home Screen

### Layout Structure
> Reference: Images 13, 14, 15, 16 — various Home screen states

```
Screen background:  #0a0a15
ScrollView with:    paddingBottom 100px

Header bar:
  height:           56px
  paddingH:         20px
  layout:           row, space-between
  App name/logo:    left — 20px Bold #FFFFFF or logo 28px
  Notification bell: right — icon button spec (40×40px circle)
  Unread badge:     8px circle #C62229, absolute top-right of bell icon
```

### Home Hero Section
> Reference: Image 14 — blue gradient top with floating quick-action card

```
Hero background:
  height:           220px
  background:       linear gradient #C62229 → #73141D
  borderRadius:     0 0 28px 28px
  paddingH:         20px
  paddingTop:       16px

  Greeting text:    13px Regular, rgba(255,255,255,0.75)  ("Hello [Name],")
  Hero title:       22px Bold, #FFFFFF  ("What can we help you with?")
  Decorative blobs: abstract shapes, opacity 0.10

Quick action card (floating, overlaps hero bottom):
  marginTop:        -28px (negative margin to overlap)
  marginH:          20px
  background:       #0f0f1e
  borderRadius:     16px
  paddingH:         16px
  paddingV:         20px
  shadow:           0 4px 20px rgba(0,0,0,0.40)
  layout:           row, space-evenly
  Each action:      Quick Action Card spec (Phase 6)
```

### Section Pattern (repeating)

```
Section header row:
  layout:           row, space-between, alignItems center
  marginH:          20px
  marginTop:        24px
  marginBottom:     12px
  title:            18px SemiBold, #FFFFFF
  "See all" link:   13px SemiBold, #C62229

Content:
  horizontal scroll: paddingLeft 20px, paddingRight 20px, gap 12px
  OR vertical list:  paddingH 20px, gap 12px
```

### Unsplash Image References for Home Screen

- Hero background texture: https://unsplash.com/s/photos/dark-abstract-red — "dark red abstract"
- User avatar placeholder: https://unsplash.com/s/photos/profile-avatar — "person portrait"
- Banner/promo card background: https://unsplash.com/s/photos/dark-gradient — "dark gradient"
- Article card thumbnails: https://unsplash.com/s/photos/community-people — "community people"


---

## Phase 11 — Profile Screen

### Layout Structure
> Reference: Images 29, 30, 31, 32 — various profile screen states

```
Screen background:  #0a0a15

Hero header:
  height:           220px
  background:       linear gradient #C62229 → #73141D
  alignItems:       center
  justifyContent:   flex-end
  paddingBottom:    24px

  Avatar:           88×88px, borderRadius 999px
                    border: 3px solid #FFFFFF
                    shadow: 0 4px 16px rgba(0,0,0,0.40)
  VIP badge:        absolute bottom-right of avatar
                    background #C62229, borderRadius 4px
                    8px SemiBold #FFFFFF, paddingH 5px, paddingV 2px

  Name:             18px Bold, #FFFFFF, marginTop 10px
  Meta:             13px Regular, rgba(255,255,255,0.70) (age · address)

  Edit Profile btn: Secondary outline button, height 36px, width 130px
                    border rgba(255,255,255,0.40), marginTop 12px

Content sheet:
  background:       #0f0f1e
  borderRadius:     24px 24px 0 0
  marginTop:        -20px (overlaps hero)
  paddingH:         20px
  paddingTop:       24px
```

### Menu Items
> Reference: Settings rows with icon + label + chevron

```
Group container:
  background:       #141428
  borderRadius:     12px
  marginBottom:     12px
  overflow:         hidden

Each row:
  height:           56px
  paddingH:         16px
  layout:           row, alignItems center
  leadingIcon:      20px, color varies by item (see below)
  label:            15px Regular, #FFFFFF, flex 1, marginLeft 12px
  trailing:         chevron 16px #6B7280

  Divider between rows: 1px rgba(255,255,255,0.06), marginLeft 48px

Icon colors by item type:
  Account/Profile:  #C62229
  Security/Lock:    #8B6830 (gold)
  Notifications:    #F59E0B (amber)
  Help/Support:     #3B82F6 (blue)
  Privacy:          #8B5CF6 (purple)
  Logout:           #EF4444 (error red)

Logout row:
  label color:      #EF4444 (not white)
  no trailing chevron
```

### Unsplash Image References for Profile

- Profile hero background: https://unsplash.com/s/photos/dark-red-gradient — "dark red gradient"
- Avatar placeholder (male): https://unsplash.com/s/photos/man-portrait — "man portrait"
- Avatar placeholder (female): https://unsplash.com/s/photos/woman-portrait — "woman portrait"

---

## Phase 12 — Wallet Screen

### Layout Structure
> Reference: Wallet tab (app/(tabs)/wallet.tsx)

```
Screen background:  #0a0a15

Balance card:
  marginH:          20px
  marginTop:        16px
  background:       linear gradient #C62229 → #73141D
  borderRadius:     20px
  paddingH:         24px
  paddingV:         28px
  shadow:           0 8px 32px rgba(198,34,41,0.30)

  Label:            13px Regular, rgba(255,255,255,0.70) ("Total Balance")
  Amount:           36px Bold, #FFFFFF
  Currency badge:   background rgba(255,255,255,0.15), borderRadius 6px
                    paddingH 8px, paddingV 3px, 12px SemiBold #FFFFFF

Action row (below balance card):
  marginTop:        20px
  layout:           row, space-evenly
  Each action:
    icon circle:    52×52px, background rgba(198,34,41,0.12), borderRadius 999px
                    border: 1px solid rgba(198,34,41,0.25)
    icon:           22px, #C62229
    label:          11px Medium, #9CA3AF, marginTop 6px
    actions:        Deposit, Withdraw, Transfer, History

Transaction list:
  section header:   "Recent Transactions" — 16px SemiBold #FFFFFF, marginH 20px, marginTop 24px
  items:            Transaction Row Card spec (Phase 6)
```

### Unsplash Image References for Wallet

- Wallet/finance dark: https://unsplash.com/s/photos/digital-wallet — "digital wallet"
- Currency/money abstract: https://unsplash.com/s/photos/finance-dark — "finance dark"

---

## Phase 13 — Chat / Inbox Screen

### Chat List
> Reference: Images 33, 34 — inbox with message threads

```
Each thread row:
  height:           72px
  paddingH:         20px
  layout:           row, alignItems center
  avatar:           48×48px, borderRadius 999px
  online dot:       10px circle, #22C55E, absolute bottom-right of avatar
                    border: 2px solid #0a0a15
  content:          flex 1, marginLeft 12px
  name:             15px SemiBold, #FFFFFF
  preview:          13px Regular, #9CA3AF, marginTop 2px, numberOfLines 1
  timestamp:        11px Regular, #6B7280
  unread badge:     18px circle, background #C62229, 10px Bold #FFFFFF
  divider:          1px rgba(255,255,255,0.06), marginLeft 80px
```

### Chat Bubble Screen
> Reference: Images 35, 36 — active chat with bubbles

```
Screen background:  #0a0a15

Header:
  avatar:           36×36px circle
  name:             16px SemiBold #FFFFFF
  status:           12px Regular #22C55E ("Online") or #9CA3AF ("Offline")

Sent bubble:
  background:       #C62229
  borderRadius:     18px 18px 4px 18px
  paddingH:         14px, paddingV: 10px
  maxWidth:         72% of screen
  text:             14px Regular, #FFFFFF
  timestamp:        10px Regular, rgba(255,255,255,0.60), marginTop 4px, textAlign right
  alignSelf:        flex-end

Received bubble:
  background:       #141428
  borderRadius:     18px 18px 18px 4px
  paddingH:         14px, paddingV: 10px
  maxWidth:         72% of screen
  text:             14px Regular, #FFFFFF
  timestamp:        10px Regular, #6B7280, marginTop 4px
  alignSelf:        flex-start

Bubble gap:         6px between same-sender, 16px between different senders
Date separator:     11px SemiBold, #6B7280, textAlign center, marginV 12px

Input bar:
  background:       #0f0f1e
  borderTopWidth:   1px, borderTopColor rgba(255,255,255,0.08)
  paddingH:         16px, paddingV: 10px
  layout:           row, alignItems center, gap 10px
  text input:       flex 1, height 44px, borderRadius 22px
                    background #141428, paddingH 16px
                    fontSize 14px, color #FFFFFF
  send button:      40×40px circle, background #C62229, icon white 18px
```


---

## Phase 14 — Micro-interactions & States

### Loading States

```
Skeleton loader:
  background:       #141428
  shimmer:          linear gradient → rgba(255,255,255,0.04) → rgba(255,255,255,0.08) → rgba(255,255,255,0.04)
  animation:        translateX from -100% to 100%, 1200ms infinite
  borderRadius:     match the element being loaded

Full screen loader:
  overlay:          rgba(10,10,21,0.85)
  spinner:          32px, color #C62229
  label:            13px Regular, #9CA3AF, marginTop 12px
```

### Toast / Snackbar Notifications

```
position:         absolute bottom, 20px above tab bar, marginH 20px
background:       #0f0f1e
borderRadius:     12px
borderLeftWidth:  3px
paddingH:         16px, paddingV: 14px
shadow:           0 4px 20px rgba(0,0,0,0.50)
layout:           row, alignItems center, gap 10px

icon:             20px circle background, 12px icon inside
text:             13px SemiBold, #FFFFFF

Success:          borderLeftColor #22C55E, iconBg rgba(34,197,94,0.15)
Error:            borderLeftColor #EF4444, iconBg rgba(239,68,68,0.15)
Warning:          borderLeftColor #F59E0B, iconBg rgba(245,158,11,0.15)
Info:             borderLeftColor #3B82F6, iconBg rgba(59,130,246,0.15)

Animation:        slide up from bottom + fade in, 250ms ease-out
                  auto-dismiss after 3000ms with fade out
```

### Badge / Chip / Tag

```
Standard badge:
  background:       rgba(198,34,41,0.12)
  borderRadius:     999px
  paddingH:         10px, paddingV: 4px
  fontSize:         11px SemiBold
  color:            #C62229

Status badge (Online/Open):
  background:       rgba(34,197,94,0.12)
  color:            #22C55E
  dot:              6px circle #22C55E, marginRight 5px

New/Unread badge:
  background:       #C62229
  borderRadius:     999px
  minWidth:         18px, height 18px
  paddingH:         4px
  fontSize:         10px Bold, #FFFFFF
  textAlign:        center

Experience badge (e.g. "5 years Exp."):
  background:       rgba(59,130,246,0.10)
  borderRadius:     6px
  paddingH:         8px, paddingV: 3px
  fontSize:         11px SemiBold, #3B82F6
```

### Rating Stars

```
Filled star:      #F59E0B, size 20px (list) / 28px (detail/review screen)
Empty star:       #374151 (dark grey outline)
Half star:        gradient fill left-half #F59E0B, right-half #374151
gap:              4px between stars
```

### Dividers

```
Full-width:       height 1px, background rgba(255,255,255,0.08), marginV 4px
Inset:            height 1px, background rgba(255,255,255,0.06), marginLeft 68px (after avatar)
Section:          height 8px, background #141428 (acts as visual separator between sections)
```

### Switch / Toggle

```
track (off):      background rgba(255,255,255,0.15), width 48px, height 28px, borderRadius 999px
track (on):       background #C62229
thumb:            24×24px circle, background #FFFFFF, shadow 0 2px 4px rgba(0,0,0,0.30)
                  position: 2px from edge
animation:        spring, 200ms
```

### Checkbox

```
size:             22×22px
borderRadius:     6px
border (unchecked): 1.5px solid rgba(255,255,255,0.25)
background (checked): #C62229
checkmark:        white, 12px, strokeWidth 2.5
```

---

## Phase 15 — Unsplash Image Strategy

All Unsplash images should be fetched via the Unsplash API or referenced by search query.
Use `objectFit: cover` for all hero/banner images. Apply a dark overlay gradient where text sits on top.

### Image Overlay Rule
Any text placed over a photo must have a gradient overlay:
```
gradient: linear rgba(0,0,0,0) → rgba(10,10,21,0.85)
direction: top to bottom
applied as: absolute positioned View over the Image
```

### Image Categories & Queries

| Screen / Context | Unsplash Query | Notes |
|---|---|---|
| Splash screen background | `dark abstract bokeh` | Subtle, no faces |
| Welcome screen hero | `people community smiling` | Warm, diverse |
| Onboarding slide 1 | `mobile phone hand` | Clean, minimal |
| Onboarding slide 2 | `social network connect` | Abstract or people |
| Onboarding slide 3 | `security privacy digital` | Abstract tech |
| Home hero background | `dark red gradient abstract` | No faces |
| Profile avatar (male) | `man portrait professional` | Neutral background |
| Profile avatar (female) | `woman portrait professional` | Neutral background |
| Article card thumbnail | `people lifestyle` | Contextual to content |
| Banner / promo card | `dark texture minimal` | Background only |
| Chat avatar | `person headshot` | Square crop |
| Hospital card | `hospital building exterior` | Architecture |
| Doctor card | `doctor white coat` | Professional |
| Medicine card | `medicine pills tablets` | Product shot |
| Empty state illustration | `empty box minimal` | Light/abstract |
| Wallet/finance | `digital finance abstract` | Dark, abstract |

### Image Sizing Standards

| Context | Width | Height | Radius |
|---|---|---|---|
| Hero / full-bleed | 100% screen | 220–280px | 0 (or bottom 28px) |
| Card thumbnail (list) | 64px | 64px | 10px |
| Card thumbnail (grid) | (col width) | 140px | 12px |
| Avatar (large) | 88px | 88px | 999px |
| Avatar (medium) | 56px | 56px | 999px |
| Avatar (small) | 40px | 40px | 999px |
| Avatar (chat) | 48px | 48px | 999px |
| Banner card | 100% | 140px | 16px |
| Detail hero | 100% | 260px | 0 |

---

## Phase 16 — Consistency Checklist

Before shipping any screen, verify all of the following:

### Layout
- [ ] Horizontal padding is exactly 20px on both sides
- [ ] Scroll content has 100px bottom padding (clears tab bar)
- [ ] Safe area insets are respected top and bottom
- [ ] No content is clipped by the tab bar

### Colors
- [ ] Background is `#0a0a15` — never pure black `#000000`
- [ ] Cards use `#0f0f1e` — never white or light grey
- [ ] Primary actions use `#C62229` — never blue
- [ ] All text on dark backgrounds passes WCAG AA contrast (4.5:1 minimum)

### Typography
- [ ] No font size below 11px
- [ ] Screen titles are 18–20px Bold, centered
- [ ] Auth greeting titles are 24px Bold, left-aligned
- [ ] Button labels are 16px SemiBold
- [ ] Placeholder text uses `#6B7280`

### Buttons
- [ ] Primary CTA is always 56px tall, full-width pill
- [ ] Primary CTA is always `#C62229` background
- [ ] Destructive actions use `#EF4444`
- [ ] No button is shorter than 36px
- [ ] Buttons have minimum 44px touch target (add hitSlop if needed)

### Inputs
- [ ] All inputs are 56px tall (except textarea)
- [ ] All inputs have 12px border radius
- [ ] Focus state shows `rgba(198,34,41,0.55)` border
- [ ] Placeholder text is `#6B7280`

### Cards
- [ ] All cards use 16px border radius
- [ ] All cards have `rgba(255,255,255,0.08)` border
- [ ] Card shadows use `rgba(0,0,0,0.30)` — never colored shadows on cards

### Navigation
- [ ] Tab bar height is 64px + safe area
- [ ] Active tab color is `#C62229`
- [ ] Header height is 56px
- [ ] Back button has 44px minimum touch target

### Images
- [ ] All photos have dark overlay when text sits on top
- [ ] Avatars are always circular (borderRadius 999px)
- [ ] No image is stretched — always `objectFit: cover` or `contain`

---

*End of Ambrosia Design System v1.0*
*Phases 1–16 cover: Colors, Typography, Spacing, Buttons, Inputs, Cards, Navigation, Splash, Intro, Auth, Home, Profile, Wallet, Chat, Micro-interactions, Images, and Consistency.*


---

## Phase 17 — Motion & Animation System

### Duration Tokens

| Token | Value | Usage |
|---|---|---|
| `durationFast` | 150ms | Button press, icon swap, badge pop |
| `durationNormal` | 250ms | Toast entry, tab switch, input focus |
| `durationSlow` | 400ms | Modal open/close, bottom sheet |
| `durationXSlow` | 600ms | Splash logo entry, hero transitions |

### Easing Tokens

| Token | Curve | Usage |
|---|---|---|
| `easeStandard` | `cubic-bezier(0.4, 0, 0.2, 1)` | General UI movement |
| `easeDecelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the screen |
| `easeAccelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen |
| `easeSharp` | `cubic-bezier(0.4, 0, 0.6, 1)` | Quick snappy interactions |
| `springDefault` | `damping: 18, stiffness: 180` | Card press, OTP fill, toggle |
| `springSoft` | `damping: 22, stiffness: 120` | Bottom sheet, modal |

### Per-Component Animation Specs

#### Splash Screen Logo Entry
```
opacity:    0 → 1, durationXSlow, easeDecelerate
scale:      0.85 → 1.0, durationXSlow, easeDecelerate
delay:      0ms
exit:       opacity 1 → 0, durationNormal, easeAccelerate
```

#### Modal / Bottom Sheet
```
enter:
  translateY: screenHeight → 0, durationSlow, springSoft
  overlay opacity: 0 → 1, durationNormal, easeStandard

exit:
  translateY: 0 → screenHeight, durationSlow, easeAccelerate
  overlay opacity: 1 → 0, durationNormal, easeAccelerate
```

#### Tab Switch
```
icon scale:   1.0 → 1.15 → 1.0, durationNormal, springDefault
icon color:   crossfade inactive → active, durationFast, easeStandard
label color:  crossfade, durationFast, easeStandard
active pill:  width animate 0 → 32px, durationNormal, easeDecelerate
```

#### Card Press Feedback
```
scale:        1.0 → 0.97, durationFast, easeSharp (on press)
scale:        0.97 → 1.0, durationFast, springDefault (on release)
```

#### Button Press Feedback
```
scale:        1.0 → 0.96, durationFast, easeSharp
opacity:      1.0 → 0.85, durationFast, easeSharp
release:      scale + opacity restore, durationFast, springDefault
```

#### Toast / Snackbar
```
enter:        translateY: 40px → 0, opacity 0 → 1, durationNormal, easeDecelerate
exit:         opacity 1 → 0, durationNormal, easeAccelerate
auto-dismiss: after 3000ms
```

#### Skeleton Shimmer
```
animation:    translateX -100% → 100%, 1400ms, easeStandard, infinite loop
gradient:     rgba(255,255,255,0.04) → rgba(255,255,255,0.09) → rgba(255,255,255,0.04)
```

#### OTP Box Fill
```
scale:        1.0 → 1.08 → 1.0, durationFast, springDefault (on each digit entry)
borderColor:  crossfade to rgba(198,34,41,0.55), durationFast, easeStandard
```

#### Progress Bar Fill
```
width:        animated tween, durationSlow, easeDecelerate
```

#### Shared Element Transition (Hero → Detail)
```
image:        scale + position tween from card thumbnail to full hero, durationSlow, easeDecelerate
content:      fade in below image, delay 150ms, durationNormal, easeDecelerate
back button:  fade in, delay 100ms, durationFast
```

### Reduced Motion Rule
```
When AccessibilityInfo.isReduceMotionEnabled() === true:
  - Disable all scale animations
  - Disable translateY slide animations
  - Keep opacity fades only (opacity transitions are safe)
  - Skeleton shimmer: replace with static rgba(255,255,255,0.06) background, no animation
  - Duration override: all durations → durationFast (150ms)
```


---

## Phase 18 — Elevation & Shadow Token System

### Elevation Levels

| Token | Shadow Value | Usage |
|---|---|---|
| `elevation0` | none | Flat inline elements, dividers, section backgrounds |
| `elevation1` | `0 1px 4px rgba(0,0,0,0.20)` | Inactive cards, list items, input fields |
| `elevation2` | `0 2px 8px rgba(0,0,0,0.30)` | Standard cards, list cards, schedule cards |
| `elevation3` | `0 4px 20px rgba(0,0,0,0.40)` | Floating action cards, balance card, quick-action overlay |
| `elevation4` | `0 8px 32px rgba(0,0,0,0.55)` | Modals, bottom sheets, toasts, drawers |

### Colored Shadow Variants

Used only on primary-colored surfaces — never on neutral cards:

| Token | Shadow Value | Usage |
|---|---|---|
| `shadowPrimary` | `0 4px 16px rgba(198,34,41,0.35)` | Primary CTA button |
| `shadowPrimaryStrong` | `0 8px 32px rgba(198,34,41,0.30)` | Wallet balance card, hero gradient card |
| `shadowDestructive` | `0 4px 16px rgba(239,68,68,0.30)` | Destructive/logout button |
| `shadowGold` | `0 4px 16px rgba(139,104,48,0.25)` | Premium/VIP badge surfaces |

### Component → Elevation Mapping

| Component | Elevation Token |
|---|---|
| Screen background | `elevation0` |
| Dividers, section separators | `elevation0` |
| Standard list card | `elevation2` |
| Settings menu row | `elevation1` |
| Floating quick-action card (home) | `elevation3` |
| Wallet balance card | `elevation3` + `shadowPrimaryStrong` |
| Primary CTA button | `elevation2` + `shadowPrimary` |
| Destructive button | `elevation2` + `shadowDestructive` |
| Bottom sheet | `elevation4` |
| Modal overlay | `elevation4` |
| Toast / snackbar | `elevation4` |
| Tab bar | `elevation3` (upward shadow) |
| Top header | `elevation1` |
| Promo/banner card | `elevation2` + `shadowPrimary` |

### Shadow Rules

- Never apply a colored shadow to a neutral-background card (`#0f0f1e` or `#141428`)
- Never mix `elevation4` with a colored shadow — high elevation uses neutral shadow only
- On Android, use `elevation` prop (integer 0–8) as a fallback alongside the shadow style
- Shadows are always `rgba(0,0,0,x)` on neutral surfaces — never white or colored


---

## Phase 19 — Semantic Color Token Layer

All component specs reference semantic tokens. Semantic tokens map to raw values in `constants/Colors.ts`.
Never use raw hex values directly in component code — always go through a semantic token.

### Background Group

| Semantic Token | Raw Value | Usage |
|---|---|---|
| `bgBase` | `#0a0a15` | Screen/page background |
| `bgSurface` | `#0f0f1e` | Cards, modals, bottom sheets |
| `bgElevated` | `#141428` | Elevated cards, dropdowns, search bg |
| `bgOverlay` | `rgba(0,0,0,0.75)` | Modal/sheet backdrop |
| `bgPrimarySubtle` | `rgba(198,34,41,0.06)` | Focused input bg, selected card bg |
| `bgPrimaryMid` | `rgba(198,34,41,0.12)` | Wallet action icon bg |
| `bgErrorSubtle` | `rgba(239,68,68,0.04)` | Error input bg |
| `bgSuccessSubtle` | `rgba(34,197,94,0.07)` | Success state bg |

### Text Group

| Semantic Token | Raw Value | Usage |
|---|---|---|
| `textPrimary` | `#FFFFFF` | Headings, primary content |
| `textSecondary` | `#D1D5DB` | Body text, descriptions |
| `textDisabled` | `#6B7280` | Disabled text, placeholders |
| `textMuted` | `#9CA3AF` | Captions, timestamps, meta |
| `textInverse` | `#0a0a15` | Text on light surfaces (rare) |
| `textLink` | `#C62229` | Ghost buttons, inline links |
| `textDanger` | `#EF4444` | Logout label, error messages |
| `textSuccess` | `#22C55E` | Online status, verified |
| `textWarning` | `#F59E0B` | Warning labels |
| `textInfo` | `#3B82F6` | Info labels, experience badges |
| `textGold` | `#8B6830` | Price text, premium labels |

### Action Group

| Semantic Token | Raw Value | Usage |
|---|---|---|
| `actionPrimary` | `#C62229` | Primary button bg, active tab |
| `actionPrimaryPressed` | `#B42733` | Primary button pressed state |
| `actionPrimaryDisabled` | `rgba(198,34,41,0.35)` | Primary button disabled bg |
| `actionDestructive` | `#EF4444` | Destructive button bg |
| `actionGhost` | `transparent` | Ghost button bg |
| `actionSecondaryBorder` | `rgba(255,255,255,0.20)` | Secondary outline button border |

### Status Group

| Semantic Token | Raw Value | Usage |
|---|---|---|
| `statusSuccess` | `#22C55E` | Success text, online dot, checkmark |
| `statusWarning` | `#F59E0B` | Warning text, rating stars |
| `statusDanger` | `#EF4444` | Error text, destructive actions |
| `statusInfo` | `#3B82F6` | Info text, links |
| `statusSuccessBg` | `rgba(34,197,94,0.12)` | Success badge bg |
| `statusWarningBg` | `rgba(245,158,11,0.07)` | Warning badge bg |
| `statusDangerBg` | `rgba(239,68,68,0.08)` | Error badge bg |
| `statusInfoBg` | `rgba(59,130,246,0.10)` | Info/experience badge bg |

### Border Group

| Semantic Token | Raw Value | Usage |
|---|---|---|
| `borderDefault` | `rgba(255,255,255,0.12)` | Input default border |
| `borderSubtle` | `rgba(255,255,255,0.08)` | Card borders, dividers |
| `borderFocus` | `rgba(198,34,41,0.55)` | Input focused border |
| `borderFilled` | `rgba(198,34,41,0.35)` | Input filled/valid border |
| `borderError` | `rgba(239,68,68,0.55)` | Input error border |
| `borderSelected` | `#C62229` | Selected card/grid item border |

### Icon Group

| Semantic Token | Raw Value | Usage |
|---|---|---|
| `iconPrimary` | `#FFFFFF` | Primary icons on dark bg |
| `iconSecondary` | `#9CA3AF` | Secondary/inactive icons |
| `iconDisabled` | `#6B7280` | Disabled icon state |
| `iconOnColor` | `#FFFFFF` | Icons on colored surfaces (buttons, badges) |
| `iconAccent` | `#C62229` | Accent icons (location pin, calendar) |
| `iconGold` | `#8B6830` | Security/premium icons |


---

## Phase 20 — Component State Matrix

Every interactive component must implement all applicable states below.
States not listed for a component are not applicable.

### Button States

| State | Primary | Secondary | Ghost | Small Pill | Destructive | Icon Button |
|---|---|---|---|---|---|---|
| Default | bg `actionPrimary`, text white | transparent, border `actionSecondaryBorder` | transparent, text `textLink` | bg `actionPrimary`, text white | bg `actionDestructive`, text white | bg `rgba(255,255,255,0.08)` |
| Pressed | bg `actionPrimaryPressed`, scale 0.96 | bg `rgba(255,255,255,0.06)`, scale 0.96 | opacity 0.70 | bg `#B42733`, scale 0.96 | bg `#DC2626`, scale 0.96 | bg `rgba(255,255,255,0.14)`, scale 0.96 |
| Focused | border `borderFocus` 2px outer ring | border `borderFocus` 2px outer ring | text `#E42326` | border `borderFocus` 2px outer ring | border `rgba(239,68,68,0.55)` 2px | border `borderFocus` 2px |
| Disabled | bg `actionPrimaryDisabled`, text `rgba(255,255,255,0.40)` | border `rgba(255,255,255,0.08)`, text `textDisabled` | text `textDisabled` | bg `actionPrimaryDisabled`, text `rgba(255,255,255,0.40)` | bg `rgba(239,68,68,0.35)` | bg `rgba(255,255,255,0.04)`, icon `iconDisabled` |
| Loading | spinner replaces label, same bg | spinner replaces label | spinner 14px | spinner 12px | spinner replaces label | spinner 16px |

### Text Input States

| State | Background | Border | Text | Trailing |
|---|---|---|---|---|
| Default | `bgSurface` | `borderDefault` | — | — |
| Focused | `bgPrimarySubtle` | `borderFocus` | `textPrimary` | — |
| Filled / Valid | `bgSurface` | `borderFilled` | `textPrimary` | ✓ `statusSuccess` 20px |
| Error | `bgErrorSubtle` | `borderError` | `textPrimary` | ✗ `statusDanger` 20px |
| Disabled | `bgElevated` | `borderSubtle` | `textDisabled` | — |
| Read-only | `bgElevated` | `borderSubtle` | `textSecondary` | lock icon `iconSecondary` |

### OTP Box States

| State | Background | Border | Text |
|---|---|---|---|
| Empty | `bgSurface` | `borderDefault` | — |
| Focused | `bgPrimarySubtle` | `borderFocus` | — |
| Filled | `bgPrimarySubtle` | `borderFilled` | `textPrimary` 20px Bold |
| Error | `bgErrorSubtle` | `borderError` | `statusDanger` |

### Dropdown States

| State | Background | Border | Trailing Icon |
|---|---|---|---|
| Default | `bgSurface` | `borderDefault` | chevron-down `iconSecondary` |
| Open | `bgSurface` | `borderFocus` | chevron-up `iconAccent` |
| Selected | `bgSurface` | `borderFilled` | chevron-down `iconAccent` |
| Disabled | `bgElevated` | `borderSubtle` | chevron-down `iconDisabled` |

### Checkbox States

| State | Background | Border | Icon |
|---|---|---|---|
| Unchecked | transparent | `rgba(255,255,255,0.25)` 1.5px | — |
| Checked | `actionPrimary` | `actionPrimary` | white tick, strokeWidth 2.5 |
| Indeterminate | `actionPrimary` | `actionPrimary` | white dash |
| Disabled | `bgElevated` | `borderSubtle` | — |

### Switch / Toggle States

| State | Track | Thumb |
|---|---|---|
| Off | `rgba(255,255,255,0.15)` | white circle, left position |
| On | `actionPrimary` | white circle, right position |
| Disabled (off) | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.30)` |
| Disabled (on) | `rgba(198,34,41,0.30)` | `rgba(255,255,255,0.50)` |

### Tab Bar Item States

| State | Icon Color | Label Color | Indicator |
|---|---|---|---|
| Inactive | `iconSecondary` | `textDisabled` | none |
| Active | `iconAccent` | `textLink` | pill or dot, `actionPrimary` |
| Pressed | `iconAccent` scale 1.15 | `textLink` | — |

### Card States (List, Grid, Settings Row)

| State | Background | Border | Scale |
|---|---|---|---|
| Default | `bgSurface` | `borderSubtle` | 1.0 |
| Pressed | `bgElevated` | `borderSubtle` | 0.97 |
| Selected (grid) | `bgPrimarySubtle` | `borderSelected` 1.5px | 1.0 |
| Disabled | `bgElevated` opacity 0.50 | `borderSubtle` | 1.0 |

### Rating Star States

| State | Color | Size (list) | Size (detail) |
|---|---|---|---|
| Filled | `statusWarning` (#F59E0B) | 20px | 28px |
| Half | gradient left `#F59E0B` / right `#374151` | 20px | 28px |
| Empty | `#374151` | 20px | 28px |


---

## Phase 21 — Accessibility Standards

### Touch Target Rule

Every interactive element must meet a minimum touch target of **44×44px**.
When the visual size is smaller, add `hitSlop` to expand the tap area:

```
hitSlop: { top: 8, bottom: 8, left: 8, right: 8 }
```

Examples:
- Icon button (40×40px visual) → add `hitSlop: { top: 2, bottom: 2, left: 2, right: 2 }`
- Ghost text button → wrap in a `Pressable` with `minHeight: 44, justifyContent: center`
- Tab bar items → already 64px tall, no hitSlop needed
- Checkbox (22×22px) → add `hitSlop: { top: 11, bottom: 11, left: 11, right: 11 }`

### Contrast Ratio Requirements (WCAG AA)

| Text Role | Min Ratio | Our Colors | Status |
|---|---|---|---|
| Body text on `bgBase` | 4.5:1 | `#FFFFFF` on `#0a0a15` → 19.6:1 | ✅ Pass |
| Body text on `bgSurface` | 4.5:1 | `#FFFFFF` on `#0f0f1e` → 18.1:1 | ✅ Pass |
| Muted text on `bgBase` | 4.5:1 | `#9CA3AF` on `#0a0a15` → 7.2:1 | ✅ Pass |
| Dim text on `bgBase` | 4.5:1 | `#6B7280` on `#0a0a15` → 4.6:1 | ✅ Pass |
| Primary button label | 4.5:1 | `#FFFFFF` on `#C62229` → 4.8:1 | ✅ Pass |
| Ghost button text | 4.5:1 | `#C62229` on `#0a0a15` → 4.8:1 | ✅ Pass |
| Placeholder text | 3.0:1 (large) | `#6B7280` on `#0f0f1e` → 4.5:1 | ✅ Pass |
| Disabled text | exempt | `#6B7280` — intentionally low contrast | — |

Rule: Never use `textDim` (#6B7280) for meaningful body content — only for disabled/placeholder states.

### Dynamic Type Scaling Policy

| Text Style | Scales with system font | Reason |
|---|---|---|
| `displayLarge`, `displayMedium` | No — fixed | Layout-critical, would break hero sections |
| `headingXL`, `headingLG` | No — fixed | Screen title layout |
| `headingMD`, `headingSM` | Yes | Section headers, card titles |
| `bodyLG`, `bodyMD`, `bodySM` | Yes | All readable content |
| `labelLG`, `labelMD` | No — fixed | Button labels, layout-critical |
| `labelSM` | No — fixed | Tab bar labels |
| `caption`, `overline` | Yes | Fine print, timestamps |

Implementation: Use `allowFontScaling={false}` on fixed styles, default (`true`) on scalable ones.

### Reduced Motion Policy

```
import { AccessibilityInfo } from 'react-native';

When isReduceMotionEnabled === true:
  - All scale transforms: disabled (use opacity only)
  - All translateY/translateX: disabled (use opacity only)
  - Skeleton shimmer: static bg rgba(255,255,255,0.06), no animation
  - Duration override: all animations → durationFast (150ms)
  - Spring animations: replaced with linear opacity fade
  - Shared element transitions: replaced with simple cross-fade
```

### Screen Reader Labels

Every interactive element must have an `accessibilityLabel`. Rules:

```
Buttons:
  accessibilityRole="button"
  accessibilityLabel="[action description]"  e.g. "Continue to next step"
  accessibilityState={{ disabled: true/false, busy: isLoading }}

Text Inputs:
  accessibilityRole="none" (label is provided via accessibilityLabel)
  accessibilityLabel="[field name]"  e.g. "Phone number input"
  accessibilityHint="[what happens]"  e.g. "Enter your registered phone number"

Images (decorative):
  accessible={false}

Images (meaningful):
  accessibilityRole="image"
  accessibilityLabel="[description]"

Icons (standalone, no label):
  accessibilityLabel="[icon meaning]"  e.g. "Notifications"
  accessibilityRole="button" (if tappable)

Tab bar items:
  accessibilityRole="tab"
  accessibilityLabel="[tab name]"
  accessibilityState={{ selected: isActive }}
```

### Color-Blind Safe Rule

Never use color as the only indicator of state. Always pair color with a secondary signal:

| State | Color signal | Secondary signal |
|---|---|---|
| Input error | Red border | Error icon + helper text below |
| Input valid | Red border (filled) | Green checkmark icon |
| Online status | Green dot | "Online" text label |
| Active tab | Red icon/label | Active indicator pill/dot |
| Selected card | Red border | Checkmark icon top-left |
| Disabled | Reduced opacity | `accessibilityState={{ disabled: true }}` |

### Focus Order Rules (Form Screens)

- Focus order must follow visual top-to-bottom, left-to-right reading order
- On auth screens: Back button → Title → Subtitle → Field 1 → Field 2 → Forgot Password → CTA button
- On OTP screen: Back button → Title → OTP Box 1 → 2 → 3 → 4 → 5 → 6 → Resend → CTA
- Never trap focus inside a non-modal component
- Bottom sheet/modal: trap focus within the sheet while open, restore on close


---

## Phase 22 — Responsive Device Classes

### Breakpoints

| Class | Width Range | Example Devices |
|---|---|---|
| `small` | ≤ 360px | iPhone SE, older Android (Galaxy A series) |
| `standard` | 361–430px | iPhone 14, Pixel 7, Galaxy S23 |
| `large` | 431–767px | iPhone 14 Plus/Pro Max, Galaxy S23 Ultra |
| `tablet` | ≥ 768px | iPad, large Android tablets |

### Recommended Hook

```typescript
// utils/useDeviceClass.ts
import { useWindowDimensions } from 'react-native';

type DeviceClass = 'small' | 'standard' | 'large' | 'tablet';

export function useDeviceClass(): DeviceClass {
  const { width } = useWindowDimensions();
  if (width <= 360) return 'small';
  if (width <= 430) return 'standard';
  if (width <= 767) return 'large';
  return 'tablet';
}
```

### Horizontal Screen Padding

| Class | Padding |
|---|---|
| `small` | 16px |
| `standard` | 20px |
| `large` | 24px |
| `tablet` | 40px |

### Typography Scale Adjustments

| Style | small | standard | large | tablet |
|---|---|---|---|---|
| `displayLarge` | 28px | 32px | 34px | 36px |
| `displayMedium` | 24px | 28px | 30px | 32px |
| `headingXL` | 22px | 24px | 26px | 28px |
| `headingLG` | 18px | 20px | 22px | 24px |
| All body/label/caption | unchanged | unchanged | unchanged | unchanged |

### Card Grid Columns

| Component | small | standard | large | tablet |
|---|---|---|---|---|
| Specialty / Category grid | 1 column | 2 columns | 2 columns | 3 columns |
| Quick action row | 3 columns | 3 columns | 3 columns | 4 columns |
| Medicine / product grid | 1 column | 2 columns | 2 columns | 3 columns |
| Hospital grid | 1 column | 2 columns | 2 columns | 3 columns |

### Hero Section Height

| Class | Height |
|---|---|
| `small` | 180px |
| `standard` | 220px |
| `large` | 260px |
| `tablet` | 300px |

### Bottom Tab Bar Height

| Class | Height |
|---|---|
| `small` | 60px |
| `standard` | 64px |
| `large` | 64px |
| `tablet` | 72px |

### Modal / Bottom Sheet Width

| Class | Width | Position |
|---|---|---|
| `small` | 100% | flush bottom |
| `standard` | 100% | flush bottom |
| `large` | 100% | flush bottom |
| `tablet` | 480px max | centered, with overlay |

### Scroll Content Bottom Padding

| Class | Padding |
|---|---|
| `small` | 88px |
| `standard` | 100px |
| `large` | 100px |
| `tablet` | 80px (no tab bar on some tablet layouts) |


---

## Phase 23 — Z-Index Layering System

### Named Z-Index Tokens

| Token | Value | Usage |
|---|---|---|
| `zBase` | 0 | Normal document flow — all standard content |
| `zRaised` | 1 | Cards with elevation, floating quick-action card |
| `zSticky` | 10 | Sticky section headers, floating CTA buttons |
| `zHeader` | 20 | Top navigation bar, screen header |
| `zOverlay` | 50 | Dimmed backdrop behind bottom sheets and modals |
| `zBottomSheet` | 100 | Bottom sheets, drawers, action sheets |
| `zToast` | 200 | Toast / snackbar notifications |
| `zModal` | 300 | Full-screen modals, alert dialogs, confirmation dialogs |
| `zDebug` | 999 | Dev tools, debug overlays — never in production |

### Rule: No Raw Z-Index Numbers

No component may use a raw integer z-index. Always reference a named token:

```typescript
// tokens/zIndex.ts
export const zIndex = {
  base:        0,
  raised:      1,
  sticky:      10,
  header:      20,
  overlay:     50,
  bottomSheet: 100,
  toast:       200,
  modal:       300,
  debug:       999,
};
```

### Component → Z-Index Mapping

| Component | Token |
|---|---|
| Screen content, cards, lists | `zBase` |
| Floating quick-action card (home hero overlap) | `zRaised` |
| Sticky scroll headers | `zSticky` |
| Primary CTA pinned to bottom | `zSticky` |
| Top navigation bar | `zHeader` |
| Floating header on hero screens | `zHeader` |
| Modal/sheet backdrop overlay | `zOverlay` |
| Bottom sheet | `zBottomSheet` |
| Drawer / side panel | `zBottomSheet` |
| Toast / snackbar | `zToast` |
| Logout confirmation modal | `zModal` |
| Alert dialog | `zModal` |
| Full-screen loading overlay | `zModal` |

### Stacking Context Rules

- Every component that uses `position: absolute` or `position: relative` with a z-index creates a new stacking context
- Bottom sheets must always render inside a Portal (or equivalent) to escape parent stacking contexts
- Toasts must render at the root navigator level — never inside a screen component
- Never nest a `zModal` component inside a `zBottomSheet` — they must be siblings at the root level
- The tab bar sits at `zHeader` (20) — floating CTAs at `zSticky` (10) sit below it intentionally

---

## Phase 24 — Design Token Export Structure

### Recommended File Structure

```
tokens/
  colors.ts         ← semantic tokens + raw palette (Phase 1 + Phase 19)
  spacing.ts        ← space1–space12 + screen padding (Phase 3)
  typography.ts     ← type scale + font family (Phase 2)
  radius.ts         ← radiusXS → radiusFull (Phase 3)
  shadows.ts        ← elevation0–elevation4 + colored variants (Phase 18)
  motion.ts         ← duration + easing tokens (Phase 17)
  zIndex.ts         ← named z-index layers (Phase 23)
```

### Token Naming Convention

- All tokens use **camelCase**
- No magic numbers anywhere in component code — every value must trace back to a token
- Semantic tokens are the public API — raw values are private to `tokens/colors.ts`

```typescript
// Good
borderColor: Colors.borderFocus

// Bad
borderColor: 'rgba(198,34,41,0.55)'
```

### Consuming Tokens in React Native

```typescript
// In StyleSheet.create (preferred for performance)
import { Colors } from '../tokens/colors';
import { spacing } from '../tokens/spacing';
import { radius } from '../tokens/radius';

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    padding: spacing.space5,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
});

// Inline styles (acceptable for dynamic values only)
<View style={{ backgroundColor: isSelected ? Colors.bgPrimarySubtle : Colors.bgSurface }} />
```

### Token File Skeletons

```typescript
// tokens/spacing.ts
export const spacing = {
  space1: 4,   space2: 8,   space3: 12,
  space4: 16,  space5: 20,  space6: 24,
  space8: 32,  space10: 40, space12: 48,
  screenPaddingH: 20,
  scrollBottomPadding: 100,
};

// tokens/radius.ts
export const radius = {
  radiusXS: 6,   radiusSM: 8,    radiusMD: 12,
  radiusLG: 16,  radiusXL: 20,   radius2XL: 24,
  radiusFull: 999,
};

// tokens/motion.ts
export const duration = {
  fast: 150, normal: 250, slow: 400, xSlow: 600,
};
export const easing = {
  standard:    [0.4, 0, 0.2, 1],
  decelerate:  [0, 0, 0.2, 1],
  accelerate:  [0.4, 0, 1, 1],
  sharp:       [0.4, 0, 0.6, 1],
};
export const spring = {
  default: { damping: 18, stiffness: 180 },
  soft:    { damping: 22, stiffness: 120 },
};

// tokens/zIndex.ts
export const zIndex = {
  base: 0, raised: 1, sticky: 10, header: 20,
  overlay: 50, bottomSheet: 100, toast: 200, modal: 300, debug: 999,
};
```

### Future Theming Extension

When a light mode is added, only `tokens/colors.ts` needs to change.
All component code remains untouched because it references semantic tokens, not raw hex values.

```typescript
// tokens/colors.ts (future light mode extension)
const theme = colorScheme === 'dark' ? darkTokens : lightTokens;
export const Colors = theme;
```

---

## Phase 16 — Consistency Checklist (Updated v2)

Before shipping any screen, verify all of the following:

### Layout
- [ ] Horizontal padding matches device class (16px small / 20px standard / 24px large / 40px tablet)
- [ ] Scroll content has correct bottom padding per device class
- [ ] Safe area insets are respected top and bottom
- [ ] No content is clipped by the tab bar

### Colors
- [ ] Background is `bgBase` (`#0a0a15`) — never pure black `#000000`
- [ ] Cards use `bgSurface` (`#0f0f1e`) — never white or light grey
- [ ] Primary actions use `actionPrimary` (`#C62229`) — never blue
- [ ] All text on dark backgrounds passes WCAG AA contrast (4.5:1 minimum)
- [ ] No raw hex values in component code — all values reference semantic tokens

### Typography
- [ ] No font size below 11px
- [ ] Screen titles are 18–20px Bold, centered
- [ ] Auth greeting titles are 24px Bold, left-aligned
- [ ] Button labels are 16px SemiBold
- [ ] Placeholder text uses `textDisabled` (`#6B7280`)
- [ ] Fixed text styles have `allowFontScaling={false}`

### Buttons
- [ ] Primary CTA is always 56px tall, full-width pill
- [ ] Primary CTA uses `actionPrimary` background
- [ ] Destructive actions use `actionDestructive`
- [ ] No button is shorter than 36px
- [ ] All buttons have minimum 44px touch target (add hitSlop if needed)
- [ ] All buttons have `accessibilityRole="button"` and `accessibilityLabel`

### Inputs
- [ ] All inputs are 56px tall (except textarea)
- [ ] All inputs have 12px border radius
- [ ] Focus state shows `borderFocus` border
- [ ] Placeholder text is `textDisabled`
- [ ] All inputs have `accessibilityLabel` and `accessibilityHint`

### Cards
- [ ] All cards use `radiusLG` (16px) border radius
- [ ] All cards have `borderSubtle` border
- [ ] Card shadows use `elevation2` — never colored shadows on neutral cards
- [ ] Pressed state applies scale 0.97 + `bgElevated` background

### Navigation
- [ ] Tab bar height matches device class
- [ ] Active tab uses `iconAccent` + `textLink`
- [ ] Header height is 56px
- [ ] Back button has 44px minimum touch target
- [ ] All tab items have `accessibilityRole="tab"`

### Images
- [ ] All photos have dark overlay when text sits on top
- [ ] Avatars are always circular (`radiusFull`)
- [ ] No image is stretched — always `objectFit: cover` or `contain`
- [ ] Decorative images have `accessible={false}`
- [ ] Meaningful images have `accessibilityRole="image"` + `accessibilityLabel`

### Motion
- [ ] Reduced motion is respected (`AccessibilityInfo.isReduceMotionEnabled`)
- [ ] No animation uses raw duration values — all reference `duration.*` tokens
- [ ] Card press uses scale 0.97 feedback
- [ ] Button press uses scale 0.96 + opacity 0.85 feedback

### Z-Index
- [ ] No raw z-index integers in component code
- [ ] Toasts render at root navigator level
- [ ] Bottom sheets render inside a Portal

### Accessibility
- [ ] Every interactive element has `accessibilityLabel`
- [ ] State is communicated via `accessibilityState` (disabled, selected, busy)
- [ ] Color is never the only indicator of state
- [ ] Focus order follows visual reading order

---

*End of Ambrosia Design System v2.0*
*Phases 1–24 cover: Colors, Typography, Spacing, Buttons, Inputs, Cards, Navigation, Splash, Intro, Auth, Home, Profile, Wallet, Chat, Micro-interactions, Images, Consistency, Motion, Elevation, Semantic Tokens, State Matrix, Accessibility, Responsive Breakpoints, Z-Index, and Token Export Structure.*









