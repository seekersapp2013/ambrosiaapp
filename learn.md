Let me first check the available Convex API functions to verify what's actually there for courses and content approval.

Let me locate the convex directory first, then batch-read all relevant files.

Good, the convex directory is at `c:\Users\PC\Documents\ambrosiaapp\app\convex`. Now let me batch-read all the relevant files simultaneously.

Now let me also read the moderation-related files and the remaining schema for the `courseEnrollments` and `courseProgress` table definitions:

<invoke name="report_progress">
<parameter name="message">Gathered all relevant files: schema, courses, courseProgress, articles, reels, moderation actions/queries. Now compiling the complete picture.</parameter>
</invoke>

Now let me check the exact signature of `getCourseRelatedContent` to confirm what viewMode values it supports and how approval filtering works within it:

Good — I have a complete picture of the APIs. Here's the phased implementation plan for the Learn feature with AI removed and admin-approval-gated content:

---

## Learn Feature — Implementation Plan (No AI)

### API Reality Check ✅

The following APIs are confirmed available and will be used:

| API | Usage |
|---|---|
| `api.courses.getCourseRelatedContent` | Primary feed — `"all"`, `"my-courses"`, `"enrolled"` modes. Already enforces strict `approvalStatus === "APPROVED" \| "NOT_REQUIRED"` + `status === "PUBLISHED"` filtering on both articles and reels. |
| `api.courses.listCourses` | Browse published courses grid |
| `api.courses.getMyCourses` | Manage courses bottom sheet |
| `api.courses.getCourse` | Course detail / viewer |
| `api.courses.createCourse` | Create course form |
| `api.courses.updateCourse` | Edit course form |
| `api.courses.deleteCourse` | Danger zone delete |
| `api.courses.publishCourse` | Publish button |
| `api.courses.addContentToCourse` | Content manager |
| `api.courses.removeContentFromCourse` | Content manager |
| `api.courses.reorderCourseContent` | Content manager |
| `api.courses.getAvailableContentForCourse` | Content picker sheet |
| `api.courseProgress.getCourseProgress` | Course viewer progress bar |
| `api.courseProgress.enrollInCourse` | Course viewer enroll CTA |
| `api.courseProgress.markContentCompleted` | Course viewer open item |
| `api.courseProgress.hasContentAccess` | Gated content access check |
| `api.files.generateUploadUrl` | Cover image upload |
| `api.files.getFileUrl` | Resolve storage IDs to URLs |
| `api.profiles.getMyProfile` | Author context / avatar |

**Removed from original plan:** `api.coursesAI.getCourseRelatedContentAI` — not used. `getCourseRelatedContent` is the only feed source.

**Content approval note:** No extra work needed. `getCourseRelatedContent` already filters strictly — only content with `approvalStatus: "APPROVED"` or `"NOT_REQUIRED"` and `status: "PUBLISHED"` ever reaches the screen. Pending/rejected content is invisible to users automatically.

---

### Phase 1 — Shared Components (`components/stream/`)

Build the reusable building blocks that Learn (and For You) depend on. These have no screen-level logic.

**Files:**
- `ContentCard.tsx` — dispatcher: renders `ArticleCard` or `ReelCardFeed` based on `contentType` prop
- `ArticleCard.tsx` — cover image (16:9), title, author row, read time, tags, gated badge
- `ReelCardFeed.tsx` — thumbnail, caption, author, gated badge
- `EmptyState.tsx` — icon + title + subtitle + optional CTA button
- `LoadingSpinner.tsx` — centered activity indicator with optional label
- `CourseCard.tsx` — cover image or gradient placeholder, title, author, content count, price/free badge, enroll button
- `AdSlotNative.tsx` — static native ad placeholder view (`api.ads.getActivePlacements` for zone lookup)

**Design tokens:** `Colors`, `typeScale`, `spacing` from existing token files. No new dependencies.

---

### Phase 2 — Learn Tab Screen (`app/(tabs)/learn.tsx`)

The main visible tab. Composes everything together.

**Data sources (in order of use):**
1. `useQuery(api.courses.getCourseRelatedContent, { limit: 50, viewMode })` — content feed (articles + reels, already approval-filtered by backend)
2. `useQuery(api.courses.listCourses, { limit: 20 })` — published courses grid (conditional section)
3. `useQuery(api.courses.getMyCourses, { limit: 50 })` — manage courses bottom sheet

**Screen layout (top → bottom):**
1. Header — "Learn" title left, no notification bell (not needed here)
2. Creation bar — 4 action circles: Article (red), Reel (purple), Course (blue `#3B82F6`), Manage (green `#22C55E`)
3. View mode strip — "All Content" / "My Courses" / "Enrolled" — 3 pill tabs, local `useState`
4. Content `FlatList`:
   - Articles and reels interleaved (sorted by `createdAt` desc, merged client-side)
   - `ContentCard` for each item
   - Ad slot every 5th item (`zoneId="learn_between_content"`)
   - `ListEmptyComponent` → `EmptyState` with message per view mode
   - `ListFooterComponent` → loading spinner or bottom ad slot
5. Manage Courses bottom sheet (`Modal` with `animationType="slide"`) — rendered once, shown/hidden via `useState`

**View mode behavior:**
- `"all"` — shows all publicly approved content (articles + reels) from any author
- `"my-courses"` — shows only content belonging to courses the current user created
- `"enrolled"` — shows only content from courses the user is enrolled in

**Navigation from creation bar:**
- Article circle → `router.push('/(tabs)/write-article')`
- Reel circle → `router.push('/(tabs)/write-reel')` (existing)
- Course circle → `router.push('/(tabs)/create-course')`
- Manage circle → open Manage Courses bottom sheet

**Navigation from content:**
- Article card tap → `router.push({ pathname: '/(tabs)/article-viewer', params: { articleId } })`
- Reel card tap → `router.push({ pathname: '/(tabs)/reel-viewer', params: { reelId } })` (existing)

**Manage Courses bottom sheet contents:**
- "+ Create Course" row at top → `router.push('/(tabs)/create-course')`
- `FlatList` of courses from `getMyCourses`: title, status badge (Draft / Published), content count, enrollment count, chevron
- Tap course row → `router.push({ pathname: '/(tabs)/edit-course', params: { courseId } })`

---

### Phase 3 — Create Course Screen (`app/(tabs)/create-course.tsx`)

**Data:**
- `useMutation(api.courses.createCourse)`
- `useMutation(api.files.generateUploadUrl)`

**Form fields:**
1. Title (`TextInput`, required)
2. Description (`TextInput multiline`, required)
3. Category — bottom sheet picker (hardcoded list: Health, Fitness, Nutrition, Mental Health, etc.)
4. Tags — comma-separated `TextInput` → chip row preview below
5. Currency — bottom sheet picker (USD, NGN, GBP, etc.)
6. Cover image picker — dashed border placeholder → `expo-image-picker` → preview with remove button

**Actions:** Cancel (outline, pops back) + Create (primary pill, disabled until title + description filled)

**On success:** `router.replace({ pathname: '/(tabs)/course-content-manager', params: { courseId } })`

---

### Phase 4 — Edit Course Screen (`app/(tabs)/edit-course.tsx`)

**Data:**
- `useQuery(api.courses.getCourse, { courseId })` — pre-fills form
- `useMutation(api.courses.updateCourse)`
- `useMutation(api.courses.publishCourse)`
- `useMutation(api.courses.deleteCourse)`

**Layout:** Same form as Create Course but pre-filled. Header has two extra buttons: "Manage Content" (navigates to content manager) and "Publish" (only shown if `!isPublished`).

**Stats strip below form** (read-only): content count, enrollment count, price, status badge.

**Danger zone** (creator only, below stats): "Delete Course" → `Alert.alert` requiring confirmation.

---

### Phase 5 — Course Content Manager (`app/(tabs)/course-content-manager.tsx`)

**Data:**
- `useQuery(api.courses.getCourse, { courseId })` — course + sorted content
- `useQuery(api.courses.getAvailableContentForCourse, { courseId })` — for add content sheet
- `useMutation(api.courses.addContentToCourse)`
- `useMutation(api.courses.removeContentFromCourse)`
- `useMutation(api.courses.reorderCourseContent)`
- `useMutation(api.courses.publishCourse)`
- `useMutation(api.courses.deleteCourse)`

**Layout:**
1. Header — course title, Edit / Delete / Publish buttons
2. Stats strip — total items, total price, category, status badge
3. Content list — each row: order badge, type icon (article/reel), title, approval status indicator (shows "⏳ Pending" or "✅ Approved" from the content's own `approvalStatus`), ▲▼ reorder buttons, 🗑 remove button
4. Empty state — "No content yet. Add articles or reels to get started." + CTA
5. Sticky "+ Add Content" button → opens Add Content bottom sheet

**Add Content bottom sheet:**
- Two tabs inside the sheet: Articles / Reels
- Lists available content from `getAvailableContentForCourse` (already filters to user's own published content not used in another course)
- Tap item → calls `addContentToCourse`, closes sheet
- "Create New Article" / "Create New Reel" shortcuts at top of each tab

**Approval status note for content manager:** The content's own `approvalStatus` is visible to the creator here so they know if a piece of content they want to add is still pending admin review. Only `"APPROVED"` or `"NOT_REQUIRED"` content will actually appear in the public feed.

---

### Phase 6 — Course Viewer (`app/(tabs)/course-viewer.tsx`)

**Data:**
- `useQuery(api.courses.getCourse, { courseId })`
- `useQuery(api.courseProgress.getCourseProgress, { courseId })`
- `useMutation(api.courseProgress.enrollInCourse)`
- `useMutation(api.courseProgress.markContentCompleted)`
- `useQuery(api.courseProgress.hasContentAccess, { contentType, contentId })` — per item, for gated checks

**Layout:**
1. Back button (floating top-left)
2. Cover image full-width (16:9) or gradient placeholder
3. Title (`typeScale.headingXL`), author row, category + tags chips
4. Stats row — content count, price (or "Free"), enrolled count
5. Description (collapsible if long)
6. Progress bar + percentage (if enrolled)
7. Curriculum list — each item: completed circle / number badge, type icon, title, "Open" button (disabled if gated and no access)
8. Sticky bottom CTA:
   - Not enrolled + free → "Enroll Free"
   - Not enrolled + paid → "Purchase Course – [price] [currency]"
   - Enrolled → "Enrolled ✓" (disabled or navigate to first incomplete item)

**"Open" button:** Marks content completed then navigates to `article-viewer` or `reel-viewer`.

---

### Phase 7 — Route Registration (`app/(tabs)/_layout.tsx`)

Update `TABS` array and register all new hidden routes. This is done last to avoid broken imports during development.

**TABS array update:**
```ts
{ name: "for-you",  label: "For You", icon: "newspaper-outline" },
{ name: "learn",    label: "Learn",   icon: "school-outline" },
{ name: "circle",   label: "Circle",  icon: "people-circle-outline" },
{ name: "wallet",   label: "Wallet",  icon: "wallet-outline" },
{ name: "profile",  label: "Profile", icon: "person-outline" },
```

**New hidden route registrations to add:**
- `learn` (visible tab, no `href: null`)
- `create-course` → `href: null`
- `edit-course` → `href: null`
- `course-content-manager` → `href: null`
- `course-viewer` → `href: null`
- `write-article` → `href: null` (shared with For You)
- `article-viewer` → `href: null` (shared with For You)

**Existing routes to hide:**
- `home` → `href: null`
- `pulse` → `href: null`
- `booking/index` → `href: null`

---

### Implementation Order

| Step | Phase | Deliverable | Testable alone? |
|---|---|---|---|
| 1 | Phase 1 | Shared components | Yes (render in isolation) |
| 2 | Phase 7 (partial) | `_layout.tsx` TABS + route stubs | Yes (tab bar shows correctly) |
| 3 | Phase 2 | Learn tab — "All Content" view mode only | Yes (feed renders) |
| 4 | Phase 3 | Create Course form | Yes (creates, redirects to stub) |
| 5 | Phase 5 | Course Content Manager | Yes (manage content) |
| 6 | Phase 4 | Edit Course | Yes (edit + publish) |
| 7 | Phase 6 | Course Viewer | Yes (view + enroll + progress) |
| 8 | Phase 2 (finish) | "My Courses" + "Enrolled" view modes | Yes |
| 9 | Phase 7 (finish) | Full route registration cleanup | Yes |

---

### Key Decisions

- **No AI, no fallback toggle.** `getCourseRelatedContent` is the single feed source. The AI variant (`coursesAI`) is not used at all.
- **Approval is backend-only.** The feed query already filters to `APPROVED`/`NOT_REQUIRED` content. No client-side filtering needed, no UI for approval on the Learn tab.
- **Approval visibility for creators only.** Inside `course-content-manager.tsx`, each piece of content shows its `approvalStatus` so creators can see if their content is still pending before it goes live.
- **Courses have no approval gate.** Only the underlying articles/reels require approval. A published course with pending content will simply show an empty or partial curriculum until the content gets approved.
- **No new dependencies.** All libraries used are already in `package.json`.