Let me gather context on the existing codebase and Convex APIs before revising the plan.

Let me gather all the required context in parallel.

Now let me batch-read all the key files in parallel:

Now I have a thorough understanding of the real codebase. Here's the updated, accurate plan for the For You features:

---

# For You Tab — Detailed Implementation Plan

> **Scope:** For You tab only (Phase 2 in the broader plan). No AI. Approved content only.

---

## API Availability Verification

### For You Feed
| API | Status | Notes |
|---|---|---|
| `api.feed.listUnifiedFeed` | ✅ | Combined articles + reels, sorted by `createdAt` desc |
| `api.articles.listFeed` | ✅ | PUBLISHED + APPROVED/NOT_REQUIRED only, with author info |
| `api.reels.listReels` | ✅ | APPROVED/NOT_REQUIRED only, with author info (referred to as Pulses in UI) |
| `api.notifications.getRecentUnreadNotifications` | ✅ | Returns `{ _id, title, type, createdAt, priority }` |
| `api.notifications.getUnreadCount` | ✅ | Returns count integer |
| `api.files.getFileUrl` | ✅ | Gets public URL for a Convex storage ID |
| `api.ads.getActivePlacements` | ✅ | Returns enabled zones; guarded by global kill-switch |
| `api.articles.createArticle` | ✅ | Available for Write Article CTA |
| `api.reels.createReel` | ✅ | Available for Write Pulse CTA |
| `api.articles.incrementViews` | ✅ | Called on article open |
| `api.articles.getArticleById` | ✅ | Used by article viewer |

**No AI queries needed.** The `listUnifiedFeed` and `listFeed`/`listReels` fallbacks are strictly curated — only content with `approvalStatus: "APPROVED"` or `"NOT_REQUIRED"` surfaces in the feed. This is already enforced at the Convex query level.

---

## Content Approval Logic (already in Convex)

Both `articles.listFeed` and `reels.listReels` already filter:
```ts
q.or(
  q.eq(q.field("approvalStatus"), "APPROVED"),
  q.eq(q.field("approvalStatus"), "NOT_REQUIRED")
)
```
No additional filtering is needed in the mobile screen. The feed is inherently safe.

---

## Phase 1 Prerequisite — Shared Components

These are consumed by For You and do not need to be rebuilt from scratch — some already exist.

### Already Exists
- `components/ReelFeedItem.tsx` — pulse card (used in pulse tab)
- `components/ReelEngagementBar.tsx` — like/share row
- `app/(tabs)/notification/NotificationBanner.tsx` — reuse exactly as in `home.tsx`

### New to Create

**`components/stream/AdSlotNative.tsx`**
- Native replacement for web `<ins>` AdSense tag
- Calls `useQuery(api.ads.getActivePlacements)` 
- Finds zone by `zoneId` prop
- If zone not found or ads disabled: returns `null` (zero-height)
- If zone found: renders a styled `View` with "Sponsored" label — no AdSense SDK needed
- Props: `zoneId: string`

**`components/stream/ArticleCard.tsx`**
- Cover image (`aspectRatio: 16/9`, `borderRadius: 12`) — uses `api.files.getFileUrl` with `storageId`
- Title (`typeScale.headingMD` or equivalent, bold)
- Author row: 32×32 avatar + name + `createdAt` formatted timestamp
- Tags chips (first 3, `Colors.bgElevated` bg)
- Read time badge (e.g. "3 min read")
- Gated badge if `isGated`: amber pill "🔒 Premium"
- `onPress` → passes `articleId` up to parent

**`components/stream/PulseCard.tsx`**
- Thin wrapper around the existing `ReelFeedItem` component, re-exported under the `PulseCard` name
- All existing pulse/reel UI and engagement logic from `ReelFeedItem` is preserved unchanged
- Props and behavior identical to `ReelFeedItem`; this is purely a naming alias for consistency
- `onPress` → passes `pulseId` up to parent

**`components/stream/ContentCard.tsx`**
- Dispatcher: if `contentType === "article"` → `<ArticleCard>`, else → `<PulseCard>` (existing `ReelFeedItem` wrapped as `PulseCard`)
- Thin wrapper, no logic beyond routing

**`components/stream/EmptyState.tsx`**
- Props: `icon: string` (Ionicons name), `title: string`, `subtitle: string`, `ctaLabel?: string`, `onCta?: () => void`
- Vertically centered, uses `Colors.textMuted` + `Colors.primary` for CTA button

**`components/stream/LoadingSpinner.tsx`**
- Centered `ActivityIndicator` + optional `label` text below
- Color: `Colors.primary`

---

## Phase 2 — For You Tab (`app/(tabs)/for-you.tsx`)

This is the default landing tab (position 0 in `TABS`). The tab file already exists per `_layout.tsx` registration.

### Check existing file
Before building, read `app/(tabs)/for-you.tsx` to see what's already there.

---

### Data Layer

**Primary source:**
```ts
const feed = useQuery(api.feed.listUnifiedFeed, { limit: 20 });
```

`listUnifiedFeed` already returns articles + reels combined, sorted newest first. Both content types already carry `contentType: "article" | "reel"` and full `author` object.

**No fallback chain needed** — a single query covers both types.

**Notifications:**
```ts
const recentUnread = useQuery(api.notifications.getRecentUnreadNotifications, { limit: 5 });
const unreadCount  = useQuery(api.notifications.getUnreadCount);
```

---

### Screen Layout (top to bottom)

```
┌─────────────────────────────────────────────┐
│  Header Bar                                 │
│  [AppLogo]  "For You"          [🔔 badge]   │
├─────────────────────────────────────────────│
│  NotificationBanner (conditional)           │
├─────────────────────────────────────────────│
│  Creation Bar (horizontal ScrollView)       │
│  [✏️ Write]  [🎬 Reel]                     │
├─────────────────────────────────────────────│
│  FlatList                                   │
│  ┌─── ContentCard (article or reel) ──────┐ │
│  │  cover / thumbnail                     │ │
│  │  title / caption                       │ │
│  │  author row                            │ │
│  │  tags + read time / gated badge        │ │
│  └────────────────────────────────────────┘ │
│  [AdSlotNative] every 5th item              │
│  ...                                        │
│  [AdSlotNative] footer                      │
└─────────────────────────────────────────────┘
```

### Header Bar
- Same pattern as `home.tsx`: `AppLogo` left, title text, notification bell right
- Bell shows `unreadCount` badge (same `bellBtn` + `bellBadge` styles from home.tsx)
- Bell `onPress`: `router.push("/(tabs)/notification")`

### Notification Banner
```tsx
{recentUnread && recentUnread.length > 0 && (
  <NotificationBanner
    notifications={recentUnread}
    onNotificationClick={(id) =>
      router.push({ pathname: "/(tabs)/notification", params: { highlightId: id } })
    }
    onNotificationDismiss={() => {}}
    onDismiss={() => router.push("/(tabs)/notification")}
  />
)}
```
Reuse `app/(tabs)/notification/NotificationBanner.tsx` exactly as in `home.tsx`.

### Creation Bar
Horizontal `ScrollView` with `showsHorizontalScrollIndicator={false}`:

| Button | Color | Icon | Action |
|---|---|---|---|
| Write | `Colors.primary` (#C62229) | `pen-outline` | `router.push("/(tabs)/write-article")` |
| Pulse | `#8B5CF6` (purple) | `videocam-outline` | `router.push("/(tabs)/write-reel")` |

Each: 64×64 circle, `borderRadius: 32`, icon + label below (`typeScale.caption`).

### FlatList
```tsx
<FlatList
  data={feed}
  keyExtractor={(item) => item._id}
  renderItem={({ item, index }) => (
    <>
      <ContentCard
        item={item}
        onArticlePress={(articleId) =>
          router.push({ pathname: "/(tabs)/article-viewer", params: { articleId } })
        }
        onPulsePress={(reelId) =>
          router.push({ pathname: "/(tabs)/reel-viewer", params: { reelId } })
        }
      />
      {(index + 1) % 5 === 0 && (
        <AdSlotNative zoneId="feed_between_posts" />
      )}
    </>
  )}
  ListHeaderComponent={/* nothing — creation bar lives outside FlatList */}
  ListFooterComponent={<AdSlotNative zoneId="feed_bottom" />}
  ListEmptyComponent={
    feed === undefined
      ? <LoadingSpinner label="Loading feed..." />
      : <EmptyState
          icon="newspaper-outline"
          title="Nothing here yet"
          subtitle="Be the first to share something with the community."
          ctaLabel="Write an article"
          onCta={() => router.push("/(tabs)/write-article")}
        />
  }
  showsVerticalScrollIndicator={false}
  contentContainerStyle={{ paddingBottom: tabBarHeight + 20 }}
/>
```

### State management
```ts
const [hiddenNotifications, setHiddenNotifications] = useState<Set<string>>(new Set());
```
Same dismiss pattern as `home.tsx` — filter out dismissed IDs.

---

## Phase 3 — Write Article (`app/(tabs)/write-article.tsx`)

The file already exists. Before doing anything, **read the existing file** to determine if it needs changes or just needs its navigation wired up correctly.

Based on the web reference (`foryou.md`'s `WriteArticle.tsx`), it already has:
- Title, body (HTML), cover image, tags, visibility, sensitive toggle, payment config, course assignment
- `api.articles.createArticle` + `api.files.generateUploadUrl`
- TinyMCE on web — the mobile version uses `TextInput multiline` or `react-native-pell-rich-editor` (installed: `"react-native-pell-rich-editor": "^1.10.0"`)

**Mobile adaptation checklist:**
- [ ] Replace `<Editor apiKey=...>` with `<RichEditor>` from `react-native-pell-rich-editor`
- [ ] Replace `<select>` with bottom sheet picker (use `components/ui/BottomSheet.tsx`)
- [ ] Replace `file input` with `expo-image-picker`
- [ ] On success: `router.replace("/(tabs)/for-you")`
- [ ] Header: "Write Article" title + `✕` close button → `router.back()`

---

## Phase 4 — Article Viewer (`app/(tabs)/article-viewer.tsx`)

The file already exists per `_layout.tsx` registration. Check existing content first.

### Data
```ts
const { articleId } = useLocalSearchParams<{ articleId: string }>();
const article = useQuery(api.articles.getArticleById, { articleId });
const incrementViews = useMutation(api.articles.incrementViews);
const coverImageUrl = useQuery(
  api.files.getFileUrl,
  article?.coverImage ? { storageId: article.coverImage } : "skip"
);
const authorAvatarUrl = useQuery(
  api.files.getFileUrl,
  article?.author?.avatar ? { storageId: article.author.avatar } : "skip"
);
```

Increment views on mount:
```ts
const viewedRef = useRef(false);
useEffect(() => {
  if (article && !viewedRef.current) {
    viewedRef.current = true;
    incrementViews({ articleId: article._id });
  }
}, [article]);
```

### HTML rendering
`react-native-webview` is already installed (`13.15.0`). Use it to render `contentHtml`:
```tsx
<WebView
  source={{ html: buildHtmlShell(article.contentHtml) }}
  style={{ flex: 1 }}
  scrollEnabled={false}
  onMessage={(e) => setWebViewHeight(Number(e.nativeEvent.data))}
  injectedJavaScript={`
    window.ReactNativeWebView.postMessage(document.body.scrollHeight);
    true;
  `}
/>
```

The HTML shell applies dark theme styles (`background: #0a0a15`, `color: #eee`, `font-family: system-ui`, `font-size: 15px`, `line-height: 1.6`).

### Layout
1. Floating back button (top-left, `rgba(0,0,0,0.5)` bg, `borderRadius: 999`)
2. Cover image (`aspectRatio: 16/9`, full width)
3. `ScrollView`:
   - Title (`typeScale.headingXL`)
   - Author row: avatar (32×32) + name + date + read time badge
   - Tags chips
   - Divider
   - `WebView` at computed height (via `onMessage`)
4. Sticky bottom engagement bar (placeholder — can wire like/bookmark/share later)

---

## Implementation Notes

### No AI, no auto-initialize
- Remove `api.autoInitializeAI.autoInitializeForUser` from the screen
- Remove `useAI` state and all AI indicator banners
- The feed shows all admin-approved content in chronological order

### Content visibility
`api.feed.listUnifiedFeed` already combines and sorts. Content that hasn't been approved simply won't appear — the Convex queries enforce it. No client-side filtering needed.

### No new dependencies required
All necessary packages are installed:
- `react-native-webview` ✅ — article HTML rendering
- `expo-image-picker` ✅ — cover image + pulse upload
- `react-native-pell-rich-editor` ✅ — article body editor
- `expo-clipboard` ✅ — copy actions
- `expo-video` ✅ — pulse playback

`expo-linear-gradient` is **not installed** — use stacked semi-transparent `View` layers for any gradient effects (same pattern as `AppBackground`).

### Tamagui usage
Use `View`, `Text` from `tamagui` for layout (matching the rest of the app). `StyleSheet.create` for complex styles. `Colors` tokens for all color values.

### listCourses in write-article
The web reference uses `api.courses.listCourses({ authorId, limit })`. Verify this function exists in `convex/courses.ts` before wiring up the course assignment section of write-article.

---

## Implementation Order

| Step | File | Dependency |
|---|---|---|
| 1 | `components/stream/LoadingSpinner.tsx` | None |
| 2 | `components/stream/EmptyState.tsx` | None |
| 3 | `components/stream/AdSlotNative.tsx` | `api.ads.getActivePlacements` |
| 4 | `components/stream/ArticleCard.tsx` | `api.files.getFileUrl` |
| 5 | `components/stream/PulseCard.tsx` | existing `ReelFeedItem` |
| 6 | `components/stream/ContentCard.tsx` | ArticleCard, PulseCard |
| 7 | `app/(tabs)/for-you.tsx` | All above components |
| 8 | `app/(tabs)/article-viewer.tsx` | WebView, api.articles |
| 9 | `app/(tabs)/write-article.tsx` | expo-image-picker, pell-rich-editor |

Each step is independently testable. Steps 1–5 can be built in parallel.

---

## Out of Scope (For You only)

This plan covers only the For You tab and its directly-linked screens (article viewer, write article). Learn, Circle, and the remaining course/circle sub-screens are separate phases per the broader PLAN.MD.