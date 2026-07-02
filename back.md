Let me explore the codebase thoroughly before giving you a plan.

Let me explore the app directory structure first, then batch read all relevant files.

Good, I can see the full structure. Now let me batch read all the critical navigation-related files in parallel.

Now I have everything I need. Let me compile the comprehensive navigation map.

Now I have a full picture of the codebase. Here's the detailed plan:

---

## The Problem, Clearly Stated

All screens live inside a **single flat Tabs navigator** (`href: null` hides them from the tab bar, but they're still tab screens — not stacked screens). This is the root cause. When `router.back()` is called from within a tab screen like `deposit`, Expo Router's tab navigator has no "stack history" to pop — so it falls back to the last **focused tab**, which is often `for-you`. You're not popping a stack; you're switching tabs.

---

## The Core Fix: Navigation History Context

Since the app has no native stack (all headers are `headerShown: false` everywhere), the fix is a **lightweight navigation history tracker** — a React Context that records which screens the user has visited, so any back button can intelligently pop to the actual previous screen.

---

## Detailed Implementation Plan

### Step 1 — Create a `NavigationHistoryContext`

A new file: `context/NavigationHistoryContext.tsx`

- Maintains a **stack array** of visited route paths (e.g. `["/(tabs)/wallet", "/(tabs)/deposit"]`)
- Exposes two things:
  - `push(route)` — called whenever a user navigates to a new screen
  - `goBack(fallback?)` — pops the stack and navigates to the previous entry; if the stack is empty, navigates to the `fallback` route (default: the current tab root)
- Uses `useRef` internally so it doesn't cause re-renders on push
- Wraps the app inside `app/_layout.tsx` or `app/(tabs)/_layout.tsx`

### Step 2 — Wire it into navigation calls

Every time a `router.push()` or `router.replace()` happens (when navigating *to* a sub-screen), the originating screen also calls `history.push(currentRoute)`. This records where the user came from.

Example flow:
```
User is on /(tabs)/wallet
→ taps Deposit → calls history.push("/(tabs)/wallet") then router.push("/(tabs)/deposit")
→ taps back → goBack() pops "/(tabs)/wallet" → navigates back to wallet ✅
```

### Step 3 — Update `ScreenHeader` to use history-aware back

The `ScreenHeader` component gets a new default behavior: when `onBack` is not provided, it automatically calls `history.goBack()` instead of nothing. This means screens that already pass `onBack={() => router.back()}` just get replaced with `onBack` using `history.goBack()`.

### Step 4 — Update the `TopNav` component for back button awareness

The `TopNav` (used on the 5 main tab screens) gets a **conditional back button** on the left side:

- Reads the history stack
- If the stack has a previous entry (meaning the user navigated here from somewhere else, e.g. a notification tapped from `for-you` while on `wallet`), it shows a `chevron-back` button
- If the stack is empty (the user is just browsing tabs normally), the logo shows as normal — no back button

This is the "back button at the topnav" you asked for.

### Step 5 — Fix the `router.replace()` broken patterns

`circle-detail.tsx` and `create-circle.tsx` use `router.replace("/(tabs)/circle")` which nukes history. These get changed to use `history.goBack()` with `"/(tabs)/circle"` as the fallback, so if there's a real history entry it uses it, otherwise it goes to circle tab.

### Step 6 — Fix `booking/index.tsx` missing back button

The `<ScreenHeader title="My Bookings">` is missing `onBack`. This gets wired to `history.goBack()` with `"/(tabs)/wallet"` or `"/(tabs)/for-you"` as a sensible fallback (wherever Bookings is typically accessed from).

### Step 7 — Standardize custom back button screens

The screens using Pattern B (raw `TouchableOpacity` with `arrow-back` icon instead of `ScreenHeader`) get updated to either:
- Use `ScreenHeader` directly, or
- Replace `router.back()` with `history.goBack()`

Affected: `circle-chat`, `circle-members`, `circle-events`, `circle-settings`, `expert-requests`, `edit-course`, `course-content-manager`, `article-viewer`, auth screens.

---

## File Change Summary

| File | Change |
|------|--------|
| `context/NavigationHistoryContext.tsx` | **New file** — the history stack context |
| `app/_layout.tsx` | Wrap app with `NavigationHistoryProvider` |
| `components/TopNav.tsx` | Add conditional back button using history context |
| `components/ui/ScreenHeader.tsx` | Default `onBack` to `history.goBack()` |
| `app/(tabs)/wallet.tsx` | Call `history.push` before navigating to deposit/transfer/withdraw |
| `app/(tabs)/deposit.tsx` | Use `history.goBack()` |
| `app/(tabs)/transfer.tsx` | Use `history.goBack()` |
| `app/(tabs)/withdraw.tsx` | Use `history.goBack()` |
| `app/(tabs)/notification/index.tsx` | Use `history.goBack()` |
| `app/(tabs)/circle-detail.tsx` | Replace `router.replace` with `history.goBack()` |
| `app/(tabs)/create-circle.tsx` | Replace `router.replace` with `history.goBack()` |
| `app/(tabs)/booking/index.tsx` | Add `onBack` with `history.goBack()` |
| `app/(tabs)/booking/*.tsx` | Replace `router.back()` with `history.goBack()` |
| `app/(tabs)/circle-chat.tsx` etc. | Replace `router.back()` with `history.goBack()` |
| `app/(tabs)/article-viewer.tsx` | Replace `router.back()` with `history.goBack()` |
| `app/(tabs)/reel-viewer.tsx` | Replace `router.back()` with `history.goBack()` |

---

## How TopNav Back Button Works in Practice

```
User on Wallet tab → taps Notifications bell
  → history.push("/(tabs)/wallet") called
  → navigates to /(tabs)/notification
  → TopNav sees history stack is non-empty
  → shows chevron-back on the left
  → user taps it → history.goBack() → back to Wallet ✅

User tabs directly to For You via bottom nav
  → no history push (tab press doesn't use history)
  → TopNav shows just the logo, no back button ✅

User on Wallet → taps Deposit
  → history.push("/(tabs)/wallet")
  → navigates to /(tabs)/deposit  (ScreenHeader shown, not TopNav)
  → back button → history.goBack() → back to Wallet ✅
```

---

Ready to code this up? Say the word and I'll implement all of it.