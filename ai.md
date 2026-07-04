Let me check a few more files to complete the picture before giving you the full analysis.

Now let me check the articles mutation to see if the engagement triggers are wired up:

Now let me also check if articles and reels creation trigger the content analysis:

Now I have the complete picture. Here's my full analysis:

---

## What was built — the full picture

The system is architecturally sound and surprisingly well-designed. Here's how all the pieces fit together:

### The pipeline (as intended)

```
Content created
    ↓
contentTriggers.ts → schedules analyzeContent action (Nova AI)
    ↓
contentAnalysis table ← AI-extracted topics, keywords, healthTopics, sentiment, audience
    ↓
cron (every hour) → engagement.ts fires → trackEngagementAndUpdateInterests
                  → userInterests table (per-user interest scores 0–100)
    ↓
cron (daily 2am) → generateFeedRecommendations (feedAI.ts)
                 → scores every content item against user interests
                 → recommendationCache table
    ↓
feedAI.listUnifiedFeedAI → reads cache → returns ranked feed
```

### What's actually working

**Cron jobs are registered** in `cron.ts` — content analysis every 6h, recommendations daily at 2am, interest update every hour, cache cleanup every 12h. This is real.

**Engagement tracking is wired** — `engagement.ts` calls `internal.userInterestTracking.trackEngagementAndUpdateInterests` via `scheduler.runAfter(0, ...)` on likes, claps, bookmarks, and comments for both articles and reels. This is real and working.

**Follow tracking is wired** — `follows.ts` calls `internal.userInterestTracking.trackFollowAndUpdateInterests` when a user follows someone.

**Content analysis triggers exist** (`contentTriggers.ts`) — but they are `internalMutation`s that `schedule` the Nova AI action. The issue is whether `articles.ts` and `reels.ts` actually call them.

**The scoring engine is sophisticated** — `aiRecommendations.ts` has a proper multi-factor scorer: 40% topic match, 20% social signals, 20% engagement patterns, 10% freshness, 10% diversity, with a bonus for audience match. The topic matching includes exact match (100pts), partial/contains (70pts), and word overlap scoring.

**A complete AI feed query exists** — `feedAI.listUnifiedFeedAI` checks the cache and falls back to chronological automatically.

---

### The gaps — in priority order

**1. The "For You" tab calls the wrong query.**
`for-you.tsx` calls `api.feed.listUnifiedFeed` — the dumb, chronological, zero-personalization query. The personalized version is `api.feedAI.listUnifiedFeedAI` and it's never called from the app. All the infrastructure is built but the feed doesn't use it.

**2. Content creation doesn't trigger analysis.**
`articles.ts` and `reels.ts` do not call `internal.contentTriggers.triggerArticleAnalysis` or `triggerReelAnalysis`. This means new content sits unanalyzed until the 6-hour batch cron runs. Without a `contentAnalysis` entry, `trackEngagementAndUpdateInterests` finds no analysis and silently returns — so early engagement on new content produces no interest signals.

**3. `trackFollowAndUpdateInterests` reads `profile.tags`, which doesn't exist.**
The follow mutation correctly calls the tracker, but inside the tracker it reads `followedProfile.tags`. The schema and profiles.ts only have `profile.interests`. So following someone never produces any interest signal. One field name fix.

**4. Two interest systems exist that don't talk to each other.**
`profile.interests` — the explicit onboarding array — is never read by the recommendation scorer. `buildUserProfile` reads from `userInterests` table (the AI-tracked dynamic interests) and `profile.tags` (which is always empty). So a user who picked "Nutrition" and "Mental Health" during onboarding gets zero weight from those in the ranking.

**5. `feedAI.fetchContentByIds` doesn't resolve storage URLs.**
When serving from cache, the function returns raw article/reel objects without resolving `coverImageUrl`, `posterUrl`, `videoUrl`, or `avatarUrl`. The UI would get storage IDs instead of actual URLs.

**6. `inferUserInterests` (the hourly cron path) inserts rows without `updatedAt`.**
`decayUnusedInterests` skips interests where `updatedAt` is undefined, so interests built by the hourly cron job are never decayed — they accumulate indefinitely.

**7. The AI feed toggle you just built shows a placeholder.**
The toggle infrastructure is in place (with Convex persistence), but when the user switches to "AI" the feed shows a static placeholder. The `feedAI.listUnifiedFeedAI` query is ready to be plugged in.

---

### Summary

The backend personalization system is 80% complete and mostly correct. The critical issue is a single missing connection: the "For You" tab never calls the AI feed query. Everything else — cron scheduling, engagement tracking, scoring, caching — is built and wired. The remaining gaps are: wrong field name in one tracker (`tags` → `interests`), missing content-creation triggers in articles/reels, explicit onboarding interests not feeding the scorer, and URL resolution missing in the cache-serving path.

Want me to fix all of these?