---
inclusion: manual
---

# Ambrosia — Screen Reference Index

> Pull this into chat with `#screen-reference-index` when building a specific screen.
> Each entry links the reference image and the guide section that governs it.
> Images must exist in `.kiro/steering/designs/` (see that folder's README for filenames).
> The `#[[file:...]]` links below activate once the image files are saved to disk.

Always obey `brand-design-guide.md` (always-included) alongside this index.

---

## Brand assets

- Red logo: #[[file:designs/logo-red.png]] — Phase 0
- White logo: #[[file:designs/logo-white.png]] — Phase 0

## Onboarding (Phase 8)

- Slide 1 — collective-effort / breast health: #[[file:designs/onboarding-1-breast-health.png]]
- Slide 2 — parenting & childcare: #[[file:designs/onboarding-2-parenting.png]]
- Slide 3 — health priority / Start: #[[file:designs/onboarding-3-health-priority.png]]

## Auth (Phase 9)

- Sign in: #[[file:designs/auth-signin.png]]
- Choose an account type: #[[file:designs/auth-account-type.png]]

## Registration wizard (Phase 9)

- Step 1 — Your Details: #[[file:designs/register-step-1-details.png]]
- Step 1 — error state: #[[file:designs/register-step-1-errors.png]]
- Step 2 — Account Info: #[[file:designs/register-step-2-account-info.png]]
- Step 3 — Primary Currency: #[[file:designs/register-step-3-currency.png]]
- Step 4 — Transaction Pin: #[[file:designs/register-step-4-pin.png]]
- Step 5 — Health Interest: #[[file:designs/register-step-5-interests.png]]

## Home (Phase 10)

- "FOR YOU" feed: #[[file:designs/home-foryou-feed.png]]

---

## How to ask for a screen

Example prompts once images are saved:

- "Build the Sign in screen per `#screen-reference-index`, following the brand guide."
- "Restyle `app/(tabs)/circle.tsx` to match the feed card spec in the brand guide."
- "Implement registration step 3 (Primary Currency) using the currency list-row spec."

If a screen needs a value marked **(VERIFY)** in the guide, I'll ask before guessing.
