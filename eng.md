# Investigation Report & Plan

---

## Issue 1: Payment Gating — For-You Feed & Courses

### What exists (backend — solid)

`convex/payments.ts` has a complete, working purchase system:
- `purchaseContent` — deducts buyer wallet, sends **70% to creator, 30% to platform** (hardcoded `DEFAULT_CREATOR_SHARE`). Records both a creator transaction and a separate platform fee transaction. Auto-enrolls user in course on purchase.
- `hasAccess` — full access control: checks authorship, free content, course enrollment, and `payments` record.
- The revenue split is **creator + platform only** — this is the correct split for this app.

`convex/bookingPayment.ts` is the fully working reference implementation — balance pre-check → wallet debit → tx record → access token — that the new unified paywall should mirror.

### What's broken / missing (frontend)

| Location | Problem |
|---|---|
| `for-you.tsx` (ContentCard) | Shows "Premium" badge on gated cards but tapping just opens the viewer — no paywall triggered |
| `article-viewer.tsx` | Renders **full article body regardless of `isGated`** — no access check, no unlock CTA |
| `course-viewer.tsx` | "Purchase Course" button calls `enrollInCourse` (free enrollment) — **never calls `purchaseContent`** |
| `learn.tsx` | No gating logic at all — content opens freely |
| Everywhere | **No unified `ContentPaywallSheet` component exists** — each payment surface would need to reinvent the wheel |

---

## Issue 2: Article Engagement — Clap, Comment, Share

### What exists (fully built, just not wired up)

| API (`convex/engagement.ts`) | Status |
|---|---|
| `clapArticle` (0–100 per user, requires read + access for gated) | ✅ Complete |
| `totalClapsForArticle` / `myClapsForArticle` | ✅ Complete |
| `recordArticleRead` / `hasReadArticle` | ✅ Complete |
| `likeArticle` / `isLiked` | ✅ Complete |
| `bookmarkArticle` / `isBookmarked` | ✅ Complete |
| `commentArticle` / `getArticleComments` | ✅ Complete (with @mention notifications) |

### What exists as reusable UI components

| Component | Covers |
|---|---|
| `ReelEngagementBar.tsx` | Full vertical engagement bar for pulses (like, comment, message, bookmark, share) |
| `ReelCommentsSheet.tsx` | Slide-up comments bottom sheet with list + input |

### What's missing in `article-viewer.tsx`

Zero engagement UI. No clap bar, no like/bookmark buttons, no comment section, no share button. The viewer renders cover + title + author + plain text body and nothing else.

---

## Plan

### Part A — Unified `ContentPaywallSheet` (shared across article, pulse, course, for-you)

**Pattern to follow:** `BookingConfirmation.tsx` — balance pre-check → confirm & pay → access granted.

#### Step 1 — Create `components/ContentPaywallSheet.tsx`

A bottom-sheet modal (matching the visual language of `BookingConfirmation`) that:
- Accepts `contentType` (`"article" | "reel" | "course"`), `contentId`, `price`, `currency`, `creatorName`, optional `courseOptions` (from `getContentPurchaseOptions` — shows "Buy course for less" upsell)
- Calls `api.bookingPayment.checkBookingAffordability` → shows balance/shortfall
- On confirm: calls `api.payments.purchaseContent` (70% creator / 30% platform split is handled server-side, no change needed)
- On success: calls `onSuccess(paymentId)` callback → parent grants access inline
- On insufficient balance: shows "Fund Wallet" deep-link
- States: summary → processing → success → error (same 4-state pattern as `BookingConfirmation`)
- This single component covers **article, pulse, course** — same UI regardless of content type

#### Step 2 — Wire `article-viewer.tsx`

- Query `api.payments.hasAccess` for the article
- If `isGated && !hasAccess`: render a paywall overlay over the body (blurred/truncated preview + "Unlock Article" button that opens `ContentPaywallSheet`)
- On sheet `onSuccess`: Convex re-query triggers access automatically, paywall clears, full content shows
- Also call `api.engagement.recordArticleRead` once the article body becomes visible

#### Step 3 — Wire `course-viewer.tsx`

- Replace the `handleEnroll` → `enrollInCourse` call for paid courses with a flow through `ContentPaywallSheet`
- Free courses (`isFree`) continue using `enrollInCourse` directly — no change
- `purchaseContent` already handles auto-enrollment on the backend, so `onSuccess` just needs to close the sheet

#### Step 4 — Wire `for-you.tsx` / `ContentCard`

- Pass a new `onGatedPress` prop down through `ContentCard` → `ArticleCard`
- When a gated card is tapped: open `ContentPaywallSheet` as an inline overlay instead of navigating
- On success: navigate to the viewer (access is now granted, viewer will load freely)

---

### Part B — Article Engagement Bar

#### Step 1 — Create `components/ArticleEngagementBar.tsx`

A **horizontal** bar (vs. the vertical `ReelEngagementBar`) positioned below the article body. Modelled directly on `ReelEngagementBar.tsx` but adapted for articles:

| Button | API call | Notes |
|---|---|---|
| 👏 Clap (tap, increments per press) | `engagement.clapArticle` | Shows user's running count (0–100). Requires `recordArticleRead` first. Locked if gated & no access |
| ❤️ Like | `engagement.likeArticle` / `isLiked` | Toggle, shows total count |
| 💬 Comment | Opens `ArticleCommentsSheet` | Shows comment count |
| 🔖 Bookmark | `engagement.bookmarkArticle` / `isBookmarked` | Toggle |
| ↗️ Share | Native `Share.share()` | Always available, no access gate |

#### Step 2 — Create `components/ArticleCommentsSheet.tsx`

Clone of `ReelCommentsSheet.tsx` wired to article-specific APIs:
- `api.engagement.getArticleComments`
- `api.engagement.commentArticle`

Structure, animation, and styling are identical to `ReelCommentsSheet` — only the Convex query/mutation targets change.

#### Step 3 — Mount `ArticleEngagementBar` in `article-viewer.tsx`

- Render below the article body, sticky at the bottom (fixed above the keyboard / tab bar)
- Pass `articleId`, `hasAccess`, and `isGated` so it enforces the same gating logic `ReelEngagementBar` already uses
- Call `recordArticleRead` when the article body mounts (required by `clapArticle` on the backend)

---

## Summary — What Needs Creating

| Item | Action |
|---|---|
| `components/ContentPaywallSheet.tsx` | Create — unified payment bottom sheet |
| `components/ArticleEngagementBar.tsx` | Create — horizontal engagement bar for articles |
| `components/ArticleCommentsSheet.tsx` | Create — clone of `ReelCommentsSheet` for articles |
| `article-viewer.tsx` | Update — add access check, paywall overlay, mount engagement bar |
| `course-viewer.tsx` | Update — replace free-enroll call with `ContentPaywallSheet` for paid courses |
| `for-you.tsx` + `ContentCard.tsx` + `ArticleCard.tsx` | Update — trigger paywall on gated card tap instead of navigating |

**No backend changes needed.** All Convex APIs (`purchaseContent`, `hasAccess`, `clapArticle`, `commentArticle`, etc.) are complete and correct. The revenue split (70% creator / 30% platform) stays as-is. The work is entirely frontend.

> **Terminology note:** "Reels" in the codebase are surfaced to users as **Pulses**. All references in this plan use Pulse for user-facing context; the underlying Convex table and component file names (`reels`, `ReelEngagementBar`, etc.) remain unchanged.

---

## Progress Tracker

> Last investigated: 2026-06-30

### ✅ Done

| Item | Notes |
|---|---|
| `convex/payments.ts` — `purchaseContent`, `hasAccess` | Backend fully implemented and correct |
| `convex/engagement.ts` — all article engagement APIs | `clapArticle`, `likeArticle`, `bookmarkArticle`, `commentArticle`, `recordArticleRead` and their read-side queries all complete |
| `components/ReelEngagementBar.tsx` | Fully implemented — vertical engagement bar for pulses with like, comment, message, bookmark, share and gating logic |
| `components/ReelCommentsSheet.tsx` | Fully implemented — animated slide-up modal with comment list, input, avatar, empty/loading states |
| `convex/bookingPayment.ts` | Reference payment implementation complete (used as pattern for `ContentPaywallSheet`) |

---

### 🔄 Ongoing

> Nothing currently in progress.

---

### ❌ Not Done

#### Part A — Payment Gating

| Item | Status | Detail |
|---|---|---|
| `components/ContentPaywallSheet.tsx` | ❌ Not started | File does not exist. Must be created from scratch |
| `article-viewer.tsx` — `hasAccess` query | ❌ Not started | No `api.payments.hasAccess` call present; full body renders unconditionally |
| `article-viewer.tsx` — paywall overlay | ❌ Not started | Gated articles show a "Premium" badge only — no content gate, no unlock CTA |
| `article-viewer.tsx` — `recordArticleRead` | ❌ Not started | No read-tracking mutation called anywhere in the viewer |
| `course-viewer.tsx` — `ContentPaywallSheet` for paid courses | ❌ Not started | Paid courses call `enrollInCourse` directly (same as free). `purchaseContent` is never called |
| `for-you.tsx` — `onGatedPress` / paywall on card tap | ❌ Not started | Gated card tap navigates directly to viewer; no access check, no `onGatedPress` prop wired |
| `components/stream/ContentCard.tsx` — `onGatedPress` prop | ❌ Not started | Prop does not exist; no gating dispatch logic |

#### Part B — Article Engagement

| Item | Status | Detail |
|---|---|---|
| `components/ArticleEngagementBar.tsx` | ❌ Not started | File does not exist. Must be created — model after `ReelEngagementBar` |
| `components/ArticleCommentsSheet.tsx` | ❌ Not started | File does not exist. Must be created — clone of `ReelCommentsSheet` wired to article APIs |
| `article-viewer.tsx` — `ArticleEngagementBar` mounted | ❌ Not started | No engagement UI of any kind in the viewer |
