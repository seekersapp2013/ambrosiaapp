Let me investigate the codebase first to understand what we're working with.

Now let me look at a few more specific components to understand the UI patterns and complexity:

I have a thorough picture of the entire app. Here's the phased migration plan:

---

## Ambrosia: React JS → React Native Expo Migration Plan

### What stays untouched
The entire `convex/` directory — all backend logic, schema, auth, payments, AI, LiveKit, moderation — is 100% reusable. Convex is platform-agnostic; the same `convex/` folder works with React Native exactly as it does with React web. The `.env.local` variables also carry over (renamed with `EXPO_PUBLIC_` prefix for client-side ones).

---

## Phase 1 — Project Bootstrap & Core Infrastructure

**Goal:** Get a working Expo app that connects to the existing Convex backend and authenticates.

- Initialize a new Expo project with TypeScript template (`expo init` or `create-expo-app`)
- Configure `app.json` / `app.config.ts` for both Expo Web and Android (EAS Build)
- Install and wire up Convex React Native client (`convex/react-native`)
- Install `@convex-dev/auth` — it supports React Native via Expo's SecureStore for token persistence
- Replace `window.localStorage` token storage with `expo-secure-store`
- Set up `expo-router` (file-based routing, replaces the custom `router.ts` + `useState` screen switcher)
- Configure environment variables using `EXPO_PUBLIC_` prefix in `.env`
- Set up EAS Build config (`eas.json`) for Android cloud builds
- Verify Convex queries/mutations work from the RN client

**Deliverable:** Login screen → authenticated home screen, Convex data loading.

---

## Phase 2 — Navigation Shell & Design System

**Goal:** Replicate the bottom tab navigation and establish the RN styling foundation.

- Set up `expo-router` tab layout mirroring the 6 bottom tabs: Home, Booking, Chat, Wallet, Notifications, Profile
- Replace Tailwind CSS with `NativeWind` (Tailwind for React Native) — same class names, minimal rework
- Replace `lucide-react` with `lucide-react-native`
- Replace HTML elements (`div`, `button`, `img`, `input`) with RN primitives (`View`, `TouchableOpacity`, `Image`, `TextInput`) — this is the bulk of the component rewrite work
- Establish shared theme/color tokens matching the current Ambrosia design system
- Implement the auth flow screens (sign in / sign up multi-step registration) using RN components

**Deliverable:** Full navigation shell, auth flow, design system in place.

---

## Phase 3 — Core Content Screens

**Goal:** Port the main content consumption and creation features.

- **StreamScreen / ForYouTab** — article + reel feed (same Convex queries, new RN `FlatList`)
- **ArticleCard, ReelCard** — rewrite as RN components
- **WriteArticle** — replace TinyMCE (web-only) with `react-native-pell-rich-editor` or a simpler markdown editor
- **WriteReel** — use `expo-image-picker` + `expo-av` for video capture/upload
- **ReelsScreen** — vertical swipe feed using `FlatList` with `pagingEnabled`
- **PublicArticleViewer / PublicReelViewer** — deep link routing via `expo-router`
- **CommentSection** — straightforward RN port
- **LearnScreen, CourseCard, CourseViewer** — port with `expo-av` for video playback

**Deliverable:** Full content browsing and creation working on Android and Web.

---

## Phase 4 — Wallet, Payments & Booking

**Goal:** Port all financial and scheduling features.

- **WalletBalance, Deposit, Withdrawal, Transfer** — pure Convex mutations, straightforward RN port
- **FundWallet / ErcasPay** — replace web redirect with `expo-web-browser` (`WebBrowser.openAuthSessionAsync`) for the ErcasPay checkout URL flow; webhook handling stays server-side in Convex unchanged
- **Paystack** — same approach via `expo-web-browser`
- **PaymentCallback** — handled via Expo deep links (`expo-linking`) instead of URL path detection
- **BookingScreen, BookingSystem, EventCreation, EventList** — port UI to RN; all Convex queries unchanged
- **Paywall** — port to RN modal/screen

**Deliverable:** Full wallet and payment flows working, deep link payment callbacks.

---

## Phase 5 — Chat, Community & Social

**Goal:** Port all real-time communication features.

- **ChatScreen, ChatList, ChatWindow** — RN `FlatList` with inverted scroll for messages; Convex real-time subscriptions work identically
- **CircleChatInterface, CircleDetailView, CircleMembersView** — straightforward RN port
- **UserProfileView, ProfileScreen** — port with `expo-image-picker` for avatar upload
- **SearchScreen** — RN `TextInput` + `FlatList`
- **ExpertRequestsView, ReferralsList** — port UI

**Deliverable:** Full social and community features working.

---

## Phase 6 — Live Streaming & Audio Events

**Goal:** Port LiveKit-powered features — the most complex phase.

- LiveKit has an official React Native SDK (`@livekit/react-native`) — this replaces `livekit-client` (web)
- **LiveStreamRoom** — rewrite using `@livekit/react-native` components; server-side token generation in Convex stays unchanged
- **AudioRoomView** — same LiveKit RN SDK, audio-only mode
- **RecordingManagement** — port UI; recording logic stays in Convex/LiveKit cloud
- Camera/mic permissions via `expo-camera` and `expo-av`

**Deliverable:** Live video and audio events working on Android.

---

## Phase 7 — Admin, Moderation & Notifications

**Goal:** Port remaining management and notification features.

- **AdminDashboard, ModerationQueue, ModerationSettings** — straightforward RN port (these are data-heavy screens, minimal native API usage)
- **NotificationManager, NotificationsScreen** — port UI
- **Push Notifications** — replace PWA service worker with `expo-notifications` + `expo-push-token`; add push token storage to the `profiles` table in Convex; update `convex/notifications.ts` to send via Expo Push API
- **LeaderboardScreen** — simple RN port

**Deliverable:** Full admin/moderation suite and native push notifications.

---

## Phase 8 — Polish, Web Parity & Build

**Goal:** Ensure Expo Web works alongside Android, then ship.

- Audit all screens for web/native conditional rendering where needed (e.g., `Platform.OS === 'web'`)
- Configure `expo-router` for web with proper URL structure (replaces the current `window.history.pushState` routing)
- Deep links for articles/reels: `ambrosia://username/slug` on native, `/username/slug` on web
- EAS Build setup for Android APK/AAB cloud build
- `expo export --platform web` for web deployment (replaces Vite build)
- Configure `vercel.json` for Expo web output

---

## Key Dependency Swaps Summary

| Current (Web) | React Native Expo Equivalent |
|---|---|
| `react-dom` | `react-native` |
| Vite + Tailwind | Expo + NativeWind |
| `lucide-react` | `lucide-react-native` |
| `window.history` router | `expo-router` |
| TinyMCE | `react-native-pell-rich-editor` |
| `livekit-client` | `@livekit/react-native` |
| PWA service worker | `expo-notifications` |
| `window.location` deep links | `expo-linking` |
| ErcasPay web redirect | `expo-web-browser` |
| `localStorage` (auth tokens) | `expo-secure-store` |
| `expo-image-picker` | already Expo-native |

**Convex backend, schema, auth, all mutations/queries, LiveKit server tokens, payment webhooks — zero changes needed.**

---

The biggest effort is Phase 3 (component rewrites — ~100 components) and Phase 6 (LiveKit RN SDK). Phases 1–2 are the foundation and should be done carefully before touching features. Want me to start with Phase 1?