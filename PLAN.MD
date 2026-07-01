# Implementation Plan: For You, Learn & Circle Screens in React Native Expo

> **Updated:** Bottom nav tabs restructured — Home → For You, new Learn tab, new Circle tab.

---

## API Availability Verification ✅

All required Convex APIs are confirmed available:

**For You / Feed:**
- `api.feedAI.listUnifiedFeedAI` ✅
- `api.articles.listFeed` ✅
- `api.reels.listReels` ✅
- `api.autoInitializeAI.autoInitializeForUser` ✅
- `api.notifications.getRecentUnreadNotifications` ✅
- `api.files.getFileUrl` ✅

**Learn / Courses:**
- `api.courses.getCourseRelatedContent` ✅
- `api.coursesAI.getCourseRelatedContentAI` ✅
- `api.courses.getMyCourses` ✅
- `api.courses.createCourse` ✅
- `api.courses.updateCourse` ✅
- `api.courses.deleteCourse` ✅
- `api.courses.publishCourse` ✅
- `api.courses.getCourse` ✅
- `api.courses.addContentToCourse` ✅
- `api.courses.removeContentFromCourse` ✅
- `api.courses.reorderCourseContent` ✅
- `api.courses.getAvailableContentForCourse` ✅
- `api.courses.listCourses` ✅
- `api.courseProgress.getCourseProgress` ✅
- `api.courseProgress.enrollInCourse` ✅
- `api.courseProgress.markContentCompleted` ✅
- `api.courseProgress.hasContentAccess` ✅

**Community / Circles:**
- `api.circles.getPublicCircles` ✅
- `api.circlesAI.getPublicCirclesAI` ✅
- `api.circles.getMyCircles` ✅
- `api.circles.createCircle` ✅
- `api.circles.getCircleById` ✅
- `api.circles.joinCircle` ✅
- `api.circles.joinCircleByInviteCode` ✅
- `api.circles.updateCircle` ✅
- `api.circles.deleteCircle` ✅
- `api.circleMembers.getCircleMembers` ✅
- `api.circleMembers.updateMemberRole` ✅
- `api.circleMembers.removeMember` ✅
- `api.circleMembers.banMember` ✅
- `api.circleMessages.getMessages` ✅
- `api.circleMessages.getPinnedMessages` ✅
- `api.circleMessages.sendMessage` ✅
- `api.circleMessages.addReaction` ✅
- `api.circleMessages.deleteMessage` ✅
- `api.circleMessages.togglePinMessage` ✅
- `api.expertRequests.getCircleExpertRequests` ✅
- `api.expertRequests.createExpertRequest` ✅
- `api.events.getCircleEvents` ✅

**Content Creation:**
- `api.articles.createArticle` ✅
- `api.reels.createReel` ✅
- `api.files.generateUploadUrl` ✅
- `api.profiles.getMyProfile` ✅

**Ads:**
- `api.ads.getActivePlacements` ✅ — AdSense `<ins>` tags don't work natively; replaced with a styled native banner placeholder.

---

## Bottom Navigation Tab Structure (UPDATED)

### Current tab order (before)
```
Home | Pulse | Wallet | Booking | Profile
```

### New tab order (after)
```
For You | Learn | Circle | Wallet | Profile
```

**What changes:**
- `home` tab is **replaced** by `for-you` — the existing `app/(tabs)/home.tsx` stays untouched as a hidden route (wallet key info lives there); the new `app/(tabs)/for-you.tsx` becomes the default landing tab.
- `pulse` tab is **removed** from the visible bar. The Pulse/Reels screen stays as a hidden route (`href: null`) still accessible from within For You feed cards when a reel is tapped.
- `wallet` tab **stays**, shifted right.
- `booking/index` tab is **removed** from the visible bar. Booking stays as a hidden route accessible from Profile or deep links.
- `profile` tab **stays**, shifted to position 5.
- Two **new visible tabs** inserted at positions 2 and 3: `learn` and `circle`.

### Updated TABS array in `_layout.tsx`
```ts
const TABS = [
  { name: "for-you",  label: "For You", icon: "newspaper-outline"   as const },
  { name: "learn",    label: "Learn",   icon: "school-outline"       as const },
  { name: "circle",   label: "Circle",  icon: "people-circle-outline" as const },
  { name: "wallet",   label: "Wallet",  icon: "wallet-outline"       as const },
  { name: "profile",  label: "Profile", icon: "person-outline"       as const },
] as const;
```

### Icon rationale (all Ionicons)
- For You → `newspaper-outline` (content feed)
- Learn → `school-outline` (education/courses)
- Circle → `people-circle-outline` (community circles)
- Wallet → `wallet-outline` (unchanged)
- Profile → `person-outline` (unchanged)

### Tab bar width note
Five tabs at equal `flex: 1` fits comfortably in the existing `CardTabBar` — the current code already renders 5 tabs (Home/Pulse/Wallet/Booking/Profile), so no width math changes.

---

## File Structure (UPDATED)

Each of the three new tabs is a **top-level file** in `app/(tabs)/`, not a subfolder. Sub-screens hang off them as separate files registered as `href: null`.

```
app/(tabs)/
  for-you.tsx                    ← NEW visible tab (replaces home in nav)
  learn.tsx                      ← NEW visible tab
  circle.tsx                     ← NEW visible tab
  wallet.tsx                     ← existing, unchanged
  profile.tsx                    ← existing, unchanged
  home.tsx                       ← existing, kept as hidden route
  pulse.tsx                      ← existing, kept as hidden route
  write-reel.tsx                 ← existing, kept as hidden route
  reel-viewer.tsx                ← existing, kept as hidden route
  reel-comments.tsx              ← existing, kept as hidden route
  booking/                       ← existing, kept as hidden routes
  notification/                  ← existing, kept as hidden routes
  admin/                         ← existing, kept as hidden routes
  --- new hidden sub-screens ---
  write-article.tsx              ← NEW (article composer)
  article-viewer.tsx             ← NEW (article reader)
  create-course.tsx              ← NEW
  edit-course.tsx                ← NEW
  course-content-manager.tsx     ← NEW
  course-viewer.tsx              ← NEW
  circle-detail.tsx              ← NEW
  circle-chat.tsx                ← NEW
  circle-members.tsx             ← NEW
  circle-settings.tsx            ← NEW
  circle-events.tsx              ← NEW
  expert-requests.tsx            ← NEW
  create-circle.tsx              ← NEW

components/
  stream/                        ← NEW shared component folder
    TopTabBar.tsx                  (NOT used — each tab is its own bottom nav item now)
    AdSlotNative.tsx
    ContentCard.tsx
    ArticleCard.tsx
    ReelCardFeed.tsx
    AIIndicatorBanner.tsx
    StoryCreationBar.tsx
    EmptyState.tsx
    LoadingSpinner.tsx
    CourseCard.tsx
    CircleCard.tsx
    MyCirclesRow.tsx
```

> **Note:** `TopTabBar.tsx` is no longer needed for top-level navigation since For You, Learn, and Circle are separate bottom nav tabs. It may still be used internally inside the `circle.tsx` screen to switch between Browse / My Circles sub-views.

---

## Updated `_layout.tsx` Changes Summary

### Tabs.Screen declarations to add
```tsx
{/* New visible tabs */}
<Tabs.Screen name="for-you"   options={{ title: "For You" }} />
<Tabs.Screen name="learn"     options={{ title: "Learn" }} />
<Tabs.Screen name="circle"    options={{ title: "Circle" }} />

{/* Existing visible tabs — kept */}
<Tabs.Screen name="wallet"    options={{ title: "Wallet" }} />
<Tabs.Screen name="profile"   options={{ title: "Profile" }} />

{/* Previously visible tabs — now hidden */}
<Tabs.Screen name="home"      options={{ href: null, headerShown: false }} />
<Tabs.Screen name="pulse"     options={{ href: null, headerShown: false }} />
<Tabs.Screen name="booking/index" options={{ href: null, headerShown: false }} />

{/* New hidden sub-screens */}
<Tabs.Screen name="write-article"          options={{ href: null, headerShown: false }} />
<Tabs.Screen name="article-viewer"         options={{ href: null, headerShown: false }} />
<Tabs.Screen name="create-course"          options={{ href: null, headerShown: false }} />
<Tabs.Screen name="edit-course"            options={{ href: null, headerShown: false }} />
<Tabs.Screen name="course-content-manager" options={{ href: null, headerShown: false }} />
<Tabs.Screen name="course-viewer"          options={{ href: null, headerShown: false }} />
<Tabs.Screen name="circle-detail"          options={{ href: null, headerShown: false }} />
<Tabs.Screen name="circle-chat"            options={{ href: null, headerShown: false }} />
<Tabs.Screen name="circle-members"         options={{ href: null, headerShown: false }} />
<Tabs.Screen name="circle-settings"        options={{ href: null, headerShown: false }} />
<Tabs.Screen name="circle-events"          options={{ href: null, headerShown: false }} />
<Tabs.Screen name="expert-requests"        options={{ href: null, headerShown: false }} />
<Tabs.Screen name="create-circle"          options={{ href: null, headerShown: false }} />

{/* All existing hidden routes unchanged */}
<Tabs.Screen name="booking/history"         options={{ href: null, headerShown: false }} />
...etc
```

### Default route
The existing `app/(tabs)/index.tsx` (if present) or the first tab in the `TABS` array determines the landing screen. `for-you` will be position 0, so it loads first on app open.

---

---

## Architecture Decisions

### Component Strategy
- Wrap all screens in `AppBackground` + `MobileCard` per existing convention
- Use `ScrollView`/`FlatList` from RN core; `View`/`Text` from Tamagui for layout
- Use `Colors` tokens from `@/tokens/colors`, `typeScale` from `@/tokens/typography`, `spacing` from `@/tokens/spacing`
- Icons via `@expo/vector-icons` (Ionicons) — no FontAwesome
- Image picking via `expo-image-picker` (already installed)
- Video upload via `expo-image-picker` with `mediaTypes: 'videos'`
- No TinyMCE — `TextInput multiline` for article body
- No Google AdSense `<ins>` — native banner placeholder component
- Navigation between sub-screens via `router.push('/(tabs)/[screen]', { params })` from expo-router

---

## Phase 1 — Foundation & Shared Components

**Goal:** Shared building blocks used by all three tabs.

**Files to create:**
- `components/stream/AdSlotNative.tsx` — Native ad placeholder (`api.ads.getActivePlacements`, styled `View` with "Advertisement" text)
- `components/stream/ContentCard.tsx` — Dispatches to `ArticleCard` or `ReelCardFeed` based on `contentType`
- `components/stream/ArticleCard.tsx` — Cover image, title, author row, read time, tags, gated badge
- `components/stream/ReelCardFeed.tsx` — Thumbnail, caption, author, gated badge
- `components/stream/AIIndicatorBanner.tsx` — Gradient pill banner shown when `isUsingAI === true`
- `components/stream/StoryCreationBar.tsx` — Horizontal scroll row of circular action buttons
- `components/stream/EmptyState.tsx` — Icon + title + subtitle + optional CTA button
- `components/stream/LoadingSpinner.tsx` — Centered spinner with optional label

**Design tokens in use:**
- Card: `bgSurface`, `borderRadius: 16`, `borderWidth: 1`, `borderSubtle`, `padding: 16`, `marginBottom: 12`
- AI banner: `purpleSurface` bg, `purpleBorder`, purple text
- Creation bar circles: 64×64, `borderRadius: 32`, white icon

---

---

## Phase 2 — For You Tab (`app/(tabs)/for-you.tsx`)

**Goal:** Scrollable AI-ranked feed of articles + reels. This is the new app landing screen.

**Single file:** `app/(tabs)/for-you.tsx`

**Data:**
1. `useQuery(api.feedAI.listUnifiedFeedAI, { limit: 20, useAI: true })` — primary source
2. Fallback: combine `api.articles.listFeed` + `api.reels.listReels` if AI feed returns empty
3. `useQuery(api.notifications.getRecentUnreadNotifications, { limit: 5 })` — notification banner
4. `useMutation(api.autoInitializeAI.autoInitializeForUser)` — called once on mount via `useRef` guard

**Screen layout (top to bottom):**
1. Header bar — app logo left, notification bell right (badge count), same pattern as existing `home.tsx`
2. `NotificationBanner` (conditional, reuse from `app/(tabs)/notification/NotificationBanner.tsx`)
3. AI indicator banner (conditional, `isUsingAI === true`)
4. Creation bar — "Write" (red circle, `Ionicons pen`) + "Reel" (purple circle, `Ionicons videocam`)
5. `FlatList` of `ContentCard` items
6. Ad slot every 5th item (`zoneId="feed_between_posts"`)
7. Bottom ad slot in `ListFooterComponent` (`zoneId="feed_bottom"`)

**Navigation:**
- Write circle → `router.push('/(tabs)/write-article')`
- Reel circle → `router.push('/(tabs)/write-reel')` (existing screen)
- Article card tap → `router.push({ pathname: '/(tabs)/article-viewer', params: { articleId } })`
- Reel card tap → `router.push({ pathname: '/(tabs)/reel-viewer', params: { reelId } })` (existing screen)

**Design notes:**
- Write circle: `Colors.primary` (#C62229)
- Reel circle: `Colors.palette.purple` (#8B5CF6)
- Article card cover: `aspectRatio: 16/9`, `borderRadius: 12`
- Author row: 32×32 avatar + name (`typeScale.labelSM`) + timestamp (`typeScale.caption`, `Colors.textMuted`)
- Gated badge: `Colors.palette.amber` pill, "🔒 Premium"

---

---

## Phase 3 — Write Article (`app/(tabs)/write-article.tsx`)

**Goal:** Native article composer to replace the TinyMCE web screen.

**Data:**
- `useMutation(api.articles.createArticle)`
- `useMutation(api.files.generateUploadUrl)`
- `useQuery(api.courses.getMyCourses, { limit: 50 })` — course assignment dropdown
- `useQuery(api.profiles.getMyProfile)` — author context

**Screen layout:**
1. Header — "Write Article" title left, ✕ close button right
2. Title `TextInput` — large (fontSize 22, bold, no border line)
3. Body `TextInput` — multiline, `textAlignVertical: 'top'`, `minHeight: 200`, `typeScale.bodyMD`
4. Cover image picker — dashed border placeholder → `expo-image-picker` → preview with remove button
5. Tags input — comma-separated `TextInput`, parsed into chip row below
6. Section divider
7. **Visibility radio tiles** — "Public" / "Course-only" (two `TouchableOpacity` tiles side by side)
8. **Sensitive content** toggle switch
9. **Payment config** — gated toggle → conditional price amount input + currency selector
10. **Course assignment** — conditional section: "Add to course" toggle → `Picker` of unpublished courses
11. Cancel + Publish buttons (side by side, Cancel = outline, Publish = primary pill)

**Input design (Design Guide Phase 5):**
- Standard inputs: `height: 56`, `borderRadius: 12`, `borderWidth: 1.5`, `borderColor: Colors.borderNeutral`
- Focus state: `borderColor: Colors.borderFocus`, `backgroundColor: Colors.bgErrorSubtle` (red-tinted)
- Submit button: `height: 56`, `borderRadius: 999`, full width, `Colors.primary`

**On success:** `router.replace('/(tabs)/for-you')` (back to feed)

---

## Phase 4 — Article Viewer (`app/(tabs)/article-viewer.tsx`)

**Goal:** Read a full article with HTML content rendered natively.

**Data:**
- `useQuery(api.articles.getArticleById, { articleId })` — from route params
- `useMutation(api.articles.incrementViews)` — called on mount
- `useQuery(api.files.getFileUrl, ...)` — cover image + author avatar

**HTML rendering approach:** Use a `WebView` rendering the `contentHtml` string embedded in a minimal HTML shell styled to match the dark theme. This avoids adding `react-native-render-html` as a new dependency. The WebView receives a self-contained HTML string with inline CSS (`background: #0a0a15`, `color: #fff`, `font-family: system-ui`).

**Screen layout:**
1. Back button (floating top-left, `borderRadius: 999`, `rgba(0,0,0,0.45)`)
2. Cover image full-width (`aspectRatio: 16/9`)
3. Scrollable content area:
   - Title (`typeScale.headingXL`)
   - Author row (avatar + name + date + read time badge)
   - Tags chips row
   - Divider
   - WebView rendering `contentHtml` (auto-height via `onMessage` + `injectedJavaScript`)
4. Sticky engagement bar at bottom — like, bookmark, share buttons (same `Colors` pattern as existing engagement bar)

---

---

## Phase 5 — Learn Tab (`app/(tabs)/learn.tsx`)

**Goal:** Course-centric content feed with view mode switcher and course management access.

**Single file:** `app/(tabs)/learn.tsx`

**Data:**
- `useQuery(api.coursesAI.getCourseRelatedContentAI, { limit: 50, viewMode, useAI: true })` — primary
- Fallback: `useQuery(api.courses.getCourseRelatedContent, { limit: 50, viewMode })`
- `useQuery(api.courses.getMyCourses, { limit: 50 })` — for the Manage courses bottom sheet

**Screen layout (top to bottom):**
1. Header — "Learn" title left
2. Creation bar — 4 circles: Article (red), Reel (purple), Course (blue `#3B82F6`), Manage (green `#22C55E`)
3. View mode switcher — "All Content" / "My Content" / "Enrolled" (3-tab strip, same style as web)
4. AI indicator banner (conditional, blue variant: `Colors.statusInfoBg`, `Colors.statusInfo`)
5. `FlatList` of `ContentCard` items
6. Ad slot every 4th item (`zoneId="learn_between_content"`)
7. Bottom ad slot in `ListFooterComponent` (`zoneId="learn_bottom"`)

**Manage Courses action:**
- Tapping the Manage (green) circle opens a **bottom sheet modal** (RN `Modal` with `transparent` + `animationType="slide"`)
- Sheet lists courses from `getMyCourses` — each row shows course title, status badge (Draft/Published), content count, chevron
- Tapping a course row: `router.push({ pathname: '/(tabs)/edit-course', params: { courseId } })`
- Sheet also has "+ Create Course" row at top → `router.push('/(tabs)/create-course')`

**Navigation:**
- Article circle → `router.push('/(tabs)/write-article')`
- Reel circle → `router.push('/(tabs)/write-reel')`
- Course circle → `router.push('/(tabs)/create-course')`
- Content card article tap → `router.push('/(tabs)/article-viewer', ...)`
- Content card reel tap → `router.push('/(tabs)/reel-viewer', ...)`

**View mode switcher design:**
- Same strip style as top-tab bar but narrower/secondary: `Colors.bgSurface` bg, `Colors.primary` active underline, `typeScale.labelSM`

---

---

## Phase 6 — Course Sub-screens

### `app/(tabs)/create-course.tsx`
**Data:** `useMutation(api.courses.createCourse)`, `useMutation(api.files.generateUploadUrl)`

**Layout:** Standard form — Title, Description (textarea), Category (bottom sheet picker list), Tags, Currency (bottom sheet picker), Cover image picker, info box, Cancel + Create buttons.

**On success:** `router.replace({ pathname: '/(tabs)/course-content-manager', params: { courseId } })`

### `app/(tabs)/edit-course.tsx`
**Data:** `useQuery(api.courses.getCourse, { courseId })`, `useMutation(api.courses.updateCourse)`, `useMutation(api.courses.publishCourse)`

**Layout:** Same as Create Course but pre-filled. Header has "Manage Content" button and "Publish" button. Course stats strip (content count, price, status) below form.

### `app/(tabs)/course-content-manager.tsx`
**Data:** `useQuery(api.courses.getCourse)`, `useQuery(api.courses.getAvailableContentForCourse)`, mutations for add/remove/reorder/publish/delete

**Layout:**
1. Header — course title, Edit / Delete / Publish buttons
2. Stats strip — 4 metrics (total items, total price, category, status)
3. Content list — each item: index badge, type icon, title, ▲▼ reorder buttons, 🗑 remove button
4. Empty state with "+ Add Content" CTA
5. "+ Add Content" button → opens bottom sheet modal with Articles / Reels tabs + "Create New" shortcut

**Reorder:** Up/Down buttons (no drag-to-reorder for simplicity — avoids `react-native-draggable-flatlist` dependency)

### `app/(tabs)/course-viewer.tsx`
**Data:** `useQuery(api.courses.getCourse)`, `useQuery(api.courseProgress.getCourseProgress)`, `useMutation(api.courseProgress.enrollInCourse)`, `useMutation(api.courseProgress.markContentCompleted)`

**Layout:**
1. Header — course title, author name, progress bar + percentage (if enrolled)
2. Cover image + author card
3. Description + stats row
4. Curriculum list — each item: completed circle / number badge, type icon, title, "Open" button
5. Sticky bottom CTA — "Enroll for Free" / "Purchase Course - [price]" / "Enrolled ✓"

**"Open" button navigation:** `router.push('/(tabs)/article-viewer')` or `router.push('/(tabs)/reel-viewer')`

---

---

## Phase 7 — Circle Tab (`app/(tabs)/circle.tsx`)

**Goal:** Community circles hub. Browse circles, view joined circles, create new.

**Single file:** `app/(tabs)/circle.tsx`

**This screen has its own internal view switcher** (Browse / My Circles) managed via local `useState`, since these are sub-views of a single tab — not separate bottom nav entries.

**Data:**
- Browse: `useQuery(api.circlesAI.getPublicCirclesAI, { limit: 20, accessType, searchTerm, useAI: true })` with fallback to `api.circles.getPublicCircles`
- My Circles: `useQuery(api.circles.getMyCircles)`

**Screen layout:**
1. Header strip — "Community Circles" title + "Browse" / "My Circles" toggle buttons + "+ Create" button (green)
2. **Browse view:**
   - Search `TextInput` (pill shape, `Colors.bgElevated` bg, search icon) + access filter (All / Free / Paid) — horizontal row
   - AI indicator banner (green variant: `Colors.greenSurface`, `Colors.greenBorder`) when `isUsingAI && !searchTerm`
   - 2-column `FlatList` grid (`numColumns: 2`, `columnWrapperStyle: { gap: 12 }`)
   - Ad slot after every 3rd row (rendered as a full-width `ListHeaderComponent` item between items)
3. **My Circles view:**
   - Full-width `FlatList` of joined circles
   - Each row: circle name, member count, role badge, last message preview snippet, chevron → tap opens circle chat

**Navigation:**
- Circle card "Join Circle" / "View" → `router.push({ pathname: '/(tabs)/circle-detail', params: { circleId } })`
- My Circles row tap → `router.push({ pathname: '/(tabs)/circle-chat', params: { circleId } })`
- "+ Create" button → `router.push('/(tabs)/create-circle')`

**Circle Card design (`components/stream/CircleCard.tsx`):**
- Cover: gradient placeholder `Colors.primary` → `Colors.palette.primaryDeep` (no image until one is uploaded)
- Free badge: `Colors.statusInfo` top-right pill
- Paid badge: `Colors.palette.amber` top-right pill
- Category strip at top-left: `rgba(0,0,0,0.55)` pill
- Member count + tags chips
- "Join Circle" / "Joined ✓" button at card bottom

**My Circles row design (`components/stream/MyCirclesRow.tsx`):**
- Role badge: CREATOR = `Colors.palette.purple`, ADMIN = `Colors.statusInfo`, MODERATOR = `Colors.statusSuccess`, MEMBER = `Colors.bgElevated`
- Last message: `typeScale.bodySM`, `Colors.textMuted`, 1 line, truncated

---

---

## Phase 8 — Circle Sub-screens

### `app/(tabs)/create-circle.tsx`
**Data:** `useMutation(api.circles.createCircle)`

**Layout:** Form — Name, Description, Circle Type (Public/Private tiles), Access Type (Free/Paid tiles), Price + Currency (conditional), Posting Permission (Everyone/Admins tiles), Max Members (optional), Tags. Cancel + Create buttons.

**On success:** `router.replace({ pathname: '/(tabs)/circle-detail', params: { circleId } })`

### `app/(tabs)/circle-detail.tsx`
**Data:** `useQuery(api.circles.getCircleById)`, `useQuery(api.circleMembers.getCircleMembers)` (if member), `useMutation(api.circles.joinCircle)`

**Layout:**
1. Header — circle name, back button, settings gear (admin only)
2. Cover image / placeholder gradient
3. Info card — type/access badges, description, stats row, tags, creator info
4. Invite code card (private circles, admin only) — monospace code + Copy button (`expo-clipboard`)
5. Members preview (if member, up to 5 avatars with "View All" link)
6. Quick Actions grid (if member) — Members, Events, Expert Requests cards
7. Sticky bottom — "Open Chat" (if member) or "Join Circle" / "Join for [price]" (if not member)

### `app/(tabs)/circle-chat.tsx`
**Data:** `useQuery(api.circleMessages.getMessages)`, `useQuery(api.circleMessages.getPinnedMessages)`, all message mutations

**Layout:**
1. Header — circle name, member count, info button
2. Pinned message bar (conditional, yellow `Colors.statusWarningBg`)
3. `FlatList` of message bubbles (inverted, newest at bottom)
4. Message bubble: avatar (32×32) + sender name + role badge + timestamp + text + reactions row + action row (hover/long-press)
5. Input row: pill `TextInput` + emoji button + send button (circular `Colors.primary`)

**Emoji picker:** 8-emoji horizontal row in a `View` that slides in above the input — no third-party library needed, just `Animated.Value` for height.

**Long press actions:** `Alert.alert` with options (Pin/Unpin, Delete) for admins; only Delete for own messages.

### `app/(tabs)/circle-members.tsx`
**Data:** `useQuery(api.circleMembers.getCircleMembers)`, role/remove/ban mutations

**Layout:** Search input + member `FlatList`. Each row: avatar, name, username, role badge, joined date, ⋯ menu button (admin only). Tapping ⋯ opens `Alert.alert` action sheet (Make Admin / Make Moderator / Make Member / Remove / Ban).

### `app/(tabs)/circle-settings.tsx`
**Data:** `useQuery(api.circles.getCircleById)`, `useMutation(api.circles.updateCircle)`, `useMutation(api.circles.deleteCircle)`

**Layout:** Edit form (same fields as create, pre-filled). Circle type/access read-only with note. Invite code display (private only). Save button. Danger Zone section (creator only) — "Delete Circle" → `Alert.alert` confirmation requiring circle name typed via `TextInput`.

### `app/(tabs)/circle-events.tsx`
**Data:** `useQuery(api.events.getCircleEvents, { circleId, status })`, `useMutation`

**Layout:** Status filter (Active/Past/Cancelled) + events `FlatList`. Each event card: title, provider info, date/time/duration, spots remaining, price, "Join Event" button. Empty state. Stats strip at bottom.

### `app/(tabs)/expert-requests.tsx`
**Data:** `useQuery(api.expertRequests.getCircleExpertRequests)`, `useMutation(api.expertRequests.createExpertRequest)`

**Layout:** "Create Request" button (admin only). Requests `FlatList`. Each card: title, status badge, budget, description, application count. Tap → detail view (inline expand or navigate to request detail screen — reuses `ExpertRequestDetailView` logic).

---

---

## Phase 9 — Route Registration & Tab Wiring

**`app/(tabs)/_layout.tsx` changes:**

1. Replace `TABS` array:
```ts
const TABS = [
  { name: "for-you",  label: "For You", icon: "newspaper-outline"    as const },
  { name: "learn",    label: "Learn",   icon: "school-outline"        as const },
  { name: "circle",   label: "Circle",  icon: "people-circle-outline" as const },
  { name: "wallet",   label: "Wallet",  icon: "wallet-outline"        as const },
  { name: "profile",  label: "Profile", icon: "person-outline"        as const },
] as const;
```

2. Update `<Tabs>` children:
   - Add: `for-you`, `learn`, `circle` as visible tabs (no `href: null`)
   - Move: `home`, `pulse`, `booking/index` to hidden (`href: null`)
   - Add all new sub-screens as hidden (`href: null`)
   - Keep all existing hidden routes unchanged

3. No changes to `CardTabBar` render logic — it already filters by `TABS` names and handles 5 items.

**`app/index.tsx` (root redirect):** Check if this redirects to `/(tabs)/home` — if so, update to redirect to `/(tabs)/for-you` so the app opens on the For You feed.

---

## Key Technical Adaptations: Web → RN

| Web Pattern | RN Equivalent |
|---|---|
| `<div className="...">` | `<View style={styles.xxx}>` |
| `<button onClick>` | `<TouchableOpacity onPress>` + `activeOpacity={0.75}` |
| `<input type="text">` | `<TextInput>` |
| `<textarea>` | `<TextInput multiline textAlignVertical="top">` |
| `<select>` | Bottom sheet modal with `FlatList` of options |
| `<img src>` | `<Image source={{ uri }} />` |
| `<video>` | `<Video>` from `expo-video` (installed) |
| CSS grid 2-col | `FlatList numColumns={2}` |
| Horizontal scroll | `ScrollView horizontal showsHorizontalScrollIndicator={false}` |
| `position: sticky` header | `FlatList stickyHeaderIndices` or `ListHeaderComponent` |
| `confirm()` | `Alert.alert('title', 'msg', [{ text: 'Cancel' }, { text: 'OK', onPress }])` |
| `alert()` | `Alert.alert(...)` |
| FontAwesome `fas fa-*` | `Ionicons` from `@expo/vector-icons` |
| TinyMCE editor | `TextInput multiline` for writing; `WebView` for reading HTML |
| Google AdSense `<ins>` | Native `View` placeholder from `AdSlotNative.tsx` |
| Tailwind CSS classes | `StyleSheet.create({})` with `Colors` / `typeScale` / `spacing` tokens |
| `navigator.clipboard` | `expo-clipboard` — `Clipboard.setStringAsync()` (installed) |
| `window.location.reload()` | Convex reactive queries auto-refresh |
| CSS linear-gradient | Stacked `View` layers (existing `AppBackground` pattern) or `expo-linear-gradient` |
| Bottom sheet / modal | RN `Modal` with `transparent` + `animationType="slide"` + sheet styling |

---

## Implementation Order

| Order | Phase | Deliverable |
|---|---|---|
| 1 | Phase 1 | Shared components (`components/stream/`) |
| 2 | Phase 2 | For You tab (`for-you.tsx`) |
| 3 | Phase 4 (partial) | Article viewer (`article-viewer.tsx`) — makes For You tappable |
| 4 | Phase 3 | Write Article (`write-article.tsx`) |
| 5 | Phase 5 | Learn tab (`learn.tsx`) |
| 6 | Phase 6 | Course sub-screens (create, edit, manager, viewer) |
| 7 | Phase 7 | Circle tab (`circle.tsx`) |
| 8 | Phase 8 | Circle sub-screens (detail, chat, members, settings, events, expert requests) |
| 9 | Phase 9 | Route wiring + `_layout.tsx` update + root redirect fix |

Each phase is independently testable before moving to the next.

---

## Notes & Risks

- **`react-native-render-html`** not in `package.json`. Using `WebView` for article HTML rendering instead — avoids a new dependency. `expo-webview` is not pre-installed but can be added with `npx expo install expo-webview` if needed. The fallback is plain-text stripping (`contentHtml.replace(/<[^>]*>/g, '')`).
- **`expo-linear-gradient`** may not be installed — verify before using gradient cards. The existing `AppBackground` approach (stacked semi-transparent Views) is a zero-dependency fallback.
- **`home.tsx` wallet content** — the current Home tab shows wallet address, private key, and mnemonic. This must not be lost. That content stays in `home.tsx` (hidden route) and can be reachable from Profile → "Wallet Info" or stays linked from the Wallet tab.
- **Pulse tab removal from nav** — Pulse/reels are still accessible by tapping a reel card in the For You feed. Users who want to create a reel use the Reel circle button in For You and Learn.
- **Booking tab removal from nav** — Booking remains accessible from Profile screen or via deep link. This maintains all existing booking functionality without breaking it.
