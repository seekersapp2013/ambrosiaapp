Let me explore the relevant files before planning.

Let me search for the relevant files in parallel.

Now I have everything needed. Let me compile the final response.

Now let me check two more specific things — whether there's a `isFollowing` check already wired into the feed, and what the delete mutations look like for admin access:

Now I have a thorough picture. Here's the phased plan:

---

## Phased Implementation Plan

### Preliminary: API Assessment

All three features have solid backend support already:

- **Follow/Unfollow** — `api.follows.followUser` (toggle mutation) + `api.follows.isFollowing` (query) ✅
- **Delete content** — `api.articles.deleteArticle` + `api.reels.deleteReel` ✅. Both currently only allow the author. Admin support needs a small backend change (check `moderationAssignments` to see if the user has an active assignment with a role that has `"delete_content"` permission).
- **Course indicator** — `courseContent` table exists with `order` (position number) and `contentId`. A new backend query `getCourseForContent(contentId)` is needed to fetch course + order for a given article/reel. ✅ schema is ready, just need the query.

---

### Phase 1 — Follow Button on ContentCards

**Scope:** Both `ArticleCard` and `ReelCardFeed`.

**Steps:**
1. Add `authorId: string` to `ArticleCardItem` and `ReelCardItem` interfaces so the cards know who to follow.
2. In `ContentCard.tsx`, pass `authorId` down (it's already on the feed item).
3. In `ArticleCard` and `ReelCardFeed`, add a small **Follow / Following** pill button to the author row — shown only when `!isOwnContent`. It calls `api.follows.followUser` on press and reads `api.follows.isFollowing` reactively. The button switches label/color on follow state.
4. Keep it compact — sits right of the author name in the existing author row.

**No backend changes needed.**

---

### Phase 2 — Delete Button for Author + Admin

**Scope:** Both `ArticleCard` and `ReelCardFeed`.

**Backend work (small):**
- Modify `deleteArticle` and `deleteReel` mutations to also allow deletion if the current user has an active `moderationAssignment` with a role whose `permissions` array includes `"delete_content"` (or add a convenience query `api.moderation.canDeleteContent` that returns a boolean for the current user).

**Frontend work:**
1. Add `onDelete?: () => void` prop to `ArticleCard`, `ReelCardFeed`, and then up to `ContentCard` and `for-you.tsx`.
2. Show a small trash icon (top-right corner of the card, or inside the body) when `isOwnContent === true` OR when the current user is an admin (need a `useQuery(api.moderation.canDeleteContent)` hook).
3. Tapping the trash shows an `Alert.alert` confirmation dialog — "Delete this content? This cannot be undone."
4. On confirm, call the appropriate delete mutation. On success, the feed query auto-refreshes since Convex is reactive.
5. In `ContentCard` and `for-you.tsx`, wire up `onDelete` — pass it all the way down.

---

### Phase 3 — Course Indicator Badge

**Scope:** Both `ArticleCard` and `ReelCardFeed`.

**Backend work:**
- Add `getCourseForContent` query in `convex/courses.ts` — looks up `courseContent` by `(contentType, contentId)`, then fetches the parent `course` to get its title. Returns `{ courseTitle, order }` or `null`.

**Feed enrichment:**
- Update `listUnifiedFeed` in `convex/feed.ts` to also resolve course membership for each article/reel — adds `courseInfo: { courseTitle: string, order: number } | null` to every feed item.

**Frontend work:**
1. Add `courseInfo?: { courseTitle: string; order: number }` to `ArticleCardItem` and `ReelCardItem` interfaces.
2. In both cards, render a small badge (e.g., a book icon + "Course · Ep. 3") when `courseInfo` is present. Position it in the cover image overlay area (alongside existing badges) or just below the title.
3. Pass `courseInfo` through `ContentCard` → the appropriate card.

---

### Phase 4 — Wire-up & Polish

1. Update `for-you.tsx` to pass `currentUserId` (already available) and new `onDelete` callbacks into `ContentCard`.
2. Ensure all other screens that render `ContentCard` (course detail screen, profile screen, etc.) also get the new props — so delete and follow show up everywhere consistently.
3. Accessibility: add `accessibilityLabel` to the follow pill and delete button.
4. Test edge cases: own content (no follow button, delete shows), admin user (delete shows on all content), non-course content (no badge).

---

### Order of execution

| Phase | Backend changes | Frontend changes | Risk |
|---|---|---|---|
| 1 — Follow button | None | `ArticleCard`, `ReelCardFeed`, `ContentCard` | Low |
| 2 — Delete button | Modify 2 mutations for admin bypass | Same 3 components + `for-you.tsx` | Medium (mutation change) |
| 3 — Course badge | New query + feed enrichment | Same 3 components | Low–Medium |
| 4 — Polish & propagation | None | Any other screens using `ContentCard` | Low |

Ready to start coding? I'd suggest going Phase 1 → 2 → 3 in order. Just say the word.