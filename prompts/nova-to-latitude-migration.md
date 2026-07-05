# Nova + Latitude Integration Plan

**Project:** Ambrosia  
**Latitude project:** `graderng-s-project` (ambrosia)  
**Date:** July 2026

---

## Revised reality — what Latitude actually is in 2025/2026

The original plan assumed the old Latitude (a prompt hosting platform with a UI editor,
PromptL files, and a `prompts.run()` SDK). That product no longer exists in that form.

**Current Latitude = AI agent observability.** It receives traces of your LLM calls via
OpenTelemetry, then surfaces issues, signals, session search, and monitors. There is no
prompt editor, no prompt hosting, and no prompt execution API.

This changes the integration approach:

| What changed | Old assumption | New reality |
|---|---|---|
| Prompt hosting | Stored and run by Latitude | Lives in your codebase as strings |
| LLM provider | Routed through Latitude to GPT-4o | Called directly — Nova stays |
| Latitude SDK | `latitude.prompts.run(...)` | `@latitude-data/telemetry` (OpenTelemetry wrapper) |
| Cost | Needed OpenAI key + billing | Nova free tier only — no new keys |
| Dashboard | Prompt editor + versioning | Traces, signals, monitors, session search |

**The bottom line:** Nova stays as your LLM provider. You keep the existing free quota.
Latitude is added purely as an observability layer — it watches your Nova calls, not runs them.

---

## What Nova's free tier actually gives you

Your key (`VITE_NOVA_API_KEY`) comes from `nova.amazon.com/dev` — Amazon's developer portal,
separate from AWS Bedrock. This portal provides a free monthly token quota for `nova-2-lite-v1`.

For Ambrosia's call volumes at beta/early production:

- **Content analysis** runs once per content item (batch cron, every 6h). At 100 items per batch,
  that is ~100 calls per 6 hours maximum — typically much less as most content is already analysed.
- **Feed ranking** runs once per active user per 6 hours (daily cron at 2am). At 50 active users
  that is 50 calls per day maximum.

Both are comfortably within any reasonable free tier. If you outgrow the Nova dev portal quota,
the upgrade path is AWS Bedrock (pay-per-token, $0.06–$0.24 per million tokens for Nova Lite) —
still extremely cheap.

---

## Architecture after this integration

```
Content created / cron every 6h
        ↓
contentTriggers.ts → analyzeContent action
        ↓
POST api.nova.amazon.com/v1/chat/completions   ← Nova (unchanged)
        ↓  (instrumented with @latitude-data/telemetry)
Latitude dashboard ← trace logged automatically
        ↓
contentAnalysis table ← topics, keywords, healthTopics, etc.
        ↓
Engagement events → userInterests table (unchanged)
        ↓
Daily cron 2am → generateFeedRecommendations
        ↓
POST api.nova.amazon.com/v1/chat/completions   ← Nova (new: feed-ranker prompt)
        ↓  (instrumented with @latitude-data/telemetry)
Latitude dashboard ← trace logged automatically
        ↓
recommendationCache table ← rankedContentIds (6h TTL)
        ↓
feedAI.listUnifiedFeedAI → for-you.tsx (AI mode)
```

Two Nova calls in the system:
1. `analyzeContent` — already exists, unchanged except adding telemetry
2. `generateFeedRecommendations` — new: replaces local scoring loop with one Nova call using the feed-ranker prompt

Latitude sees both. No new LLM provider. No new billing.

---

## Phase 1 — Wire Latitude observability (no code changes to AI logic)
**Goal:** Every existing Nova call starts appearing in the Latitude dashboard.  
**Risk:** Zero — purely additive instrumentation. Nova calls are unchanged.  
**New keys needed:** None. `LATITUDE_API_KEY` already in your MCP config.

### 1.1 Install the telemetry package

```bash
npm install @latitude-data/telemetry
```

This is the OpenTelemetry wrapper — it intercepts `fetch` calls made to any LLM provider
and ships the spans to Latitude automatically.

### 1.2 Add Latitude env var to Convex

Your `LATITUDE_API_KEY` is `7da454eb-ffce-40d7-9279-75be8c23fd8f` (from MCP config).
Add it to Convex environment variables via the Convex dashboard → Settings → Environment Variables:

```
LATITUDE_API_KEY=7da454eb-ffce-40d7-9279-75be8c23fd8f
```

It's already in `.kiro/settings/mcp.json` for the MCP connection. It also needs to be
in Convex's runtime env so your actions can read it.

### 1.3 Initialise the telemetry SDK at the top of aiRecommendations.ts

Add one initialisation block at the top of the file (outside any function):

```typescript
import { LatitudeTelemetry } from "@latitude-data/telemetry";

// Initialise once — wraps all LLM provider fetch calls automatically
const telemetry = new LatitudeTelemetry(process.env.LATITUDE_API_KEY!, {
  projectId: "graderng-s-project",
});
```

No other changes needed. The SDK hooks into the fetch layer — every call to
`api.nova.amazon.com` made from this file is automatically traced.

### 1.4 Verify traces appear in Latitude

Publish one article (or trigger a manual content analysis). Open the Latitude dashboard →
ambrosia project → Traces. You should see the Nova call appear within seconds with:
- The prompt text sent
- The raw response
- Token count
- Latency

**Exit criteria for Phase 1:** At least one Nova call visible in Latitude Traces.  
No changes to `analyzeContent` logic, no changes to the schema, no changes to the UI.

---

## Phase 2 — Fix the 6 known bugs (prerequisite for reliable AI)
**Goal:** Fix pre-existing gaps before adding the feed-ranker.  
**Risk:** Low — each fix is isolated and targeted.  
**Why now:** The feed-ranker gets fed data from these pipelines. Fixing them first means
the ranker gets accurate interest signals from day one.

### Bug 1 — "For You" tab calls the wrong query
**File:** `app/(tabs)/for-you.tsx`  
The AI mode renders a static placeholder instead of calling `api.feedAI.listUnifiedFeedAI`.
Replace the placeholder `<RNView>` block with a real `<FlatList>` using that query.

### Bug 2 — New articles/reels skip content analysis
**Files:** `convex/articles.ts`, `convex/reels.ts`  
Neither calls `contentTriggers` on publish. New content waits up to 6 hours before
analysis runs. Add `scheduler.runAfter(0, internal.contentTriggers.triggerArticleAnalysis, ...)`
at the end of the publish mutation in each file.

### Bug 3 — Follow tracking reads wrong profile field
**File:** `convex/userInterestTracking.ts`, `trackFollowAndUpdateInterests`  
Reads `followedProfile.tags` — the field is `profile.interests` in the schema.
Change `.tags` to `.interests`.

### Bug 4 — Onboarding interests ignored by scorer
**File:** `convex/aiRecommendations.ts`, `buildUserProfile`  
Reads `profile.tags` (always empty) instead of `profile.interests`.
Change `profile?.tags || []` to `profile?.interests || []`.

### Bug 5 — Storage URLs not resolved in cache-serving path
**File:** `convex/feedAI.ts`, `fetchContentByIds`  
Returns raw Convex storage IDs instead of signed URLs for images and videos.
Resolve with `ctx.storage.getUrl(...)` for `coverImageUrl`, `posterUrl`, `videoUrl`,
and author `avatar` fields.

### Bug 6 — inferUserInterests inserts without updatedAt
**File:** `convex/scheduledJobs.ts`, `inferUserInterests`  
New inserts have no `updatedAt`, so `decayUnusedInterests` skips them — interests
accumulate forever. Add `updatedAt: now` to the `ctx.db.insert` call.

**Exit criteria for Phase 2:** App deployed, AI toggle in for-you.tsx shows real feed items.
Convex logs show no errors from engagement tracking mutations. Publish a test article
and confirm `contentAnalysis` row appears within seconds (not hours).

---

## Phase 3 — Add the feed-ranker prompt to Nova
**Goal:** Replace the per-item scoring loop in `generateFeedRecommendations` with one Nova call.  
**Risk:** Medium — changes the feed ranking. Old cache expires in 6h naturally; rollback
means reverting one function.

### What the feed-ranker prompt does

The current `generateFeedRecommendations` loops over every content item and calls
`calculateRecommendationScore` for each one. For 100 items that is 100 sequential action
calls — slow, expensive, and the scoring is simplistic heuristics.

The feed-ranker prompt sends the full batch to Nova in a single call. Nova understands
semantic relationships between topics (it knows "insulin resistance" relates to "diabetes
management" without an exact string match), so the ranking quality is meaningfully better.

### The prompt content (lives in feedAI.ts as a string)

```
You are a personalised health-content feed ranker.
Re-order the batch of content items from most to least relevant for this specific user.
Every item must appear in the output — never drop or add items.

RULES:
- Own-content rule: if an item's authorId matches {{ current_user_author_id }},
  cap its score at 5 regardless of relevance.
- Following bonus: if an item's authorId is in the following list, add +8 to its score.
- Discovery: mark roughly 10–15% of items as discovery: true — high-quality items
  adjacent to the user's topic space that broaden the feed.
- Use aiTopics, aiHealthTopics, aiKeywords, and aiCategory as primary relevance signals.
  Fall back to tags when AI analysis is absent.
- Score 0–100. Higher = more relevant.
- Self-verify: ranked array length must equal content_count exactly.

USER CONTEXT:
User ID: {{ user_id }}

Declared interests (highest confidence — user stated these directly):
{{ profile_interests }}

Behavioural interest profile (top 50 by strength, 0–100):
{{ user_dynamic_interests }}

Authors this user follows (+8 bonus per item from these authors):
{{ following_ids }}

This user's own authorId (cap score at 5 for any matching item):
{{ current_user_author_id }}

Total items to rank: {{ content_count }}

CONTENT ITEMS:
{{ content_items }}

OUTPUT FORMAT — respond with ONLY valid JSON, no prose, no markdown:
{
  "ranked": [
    {
      "id": "<article:convexId or reel:convexId>",
      "score": <0–100>,
      "discovery": <true|false>,
      "reasons": ["<reason 1>", "<reason 2>"]
    }
  ],
  "meta": {
    "total": <must equal content_count>,
    "discoveryCount": <number>,
    "topInterests": ["<interest 1>", "<interest 2>", "<interest 3>"]
  }
}
```

### How it integrates into generateFeedRecommendations

The new flow inside the action:

1. Build user context (profile interests, dynamic interests, following IDs) — same queries as before
2. Fetch up to 100 articles + reels — same as before
3. For each item, attach its `contentAnalysis` fields if available — same lookup as before
4. Build the `content_items` JSON string and interpolate all variables into the prompt above
5. Make one Nova call with the assembled prompt
6. Parse `ranked[]` from the response
7. Store `rankedContentIds` in `recommendationCache` — same as before
8. Optionally store per-item scores + reasons in `userRecommendationScores` for tooltips

The cache, TTL, and expiry logic are completely unchanged.

### Batch size handling

For 100 items the prompt fits comfortably in Nova's context window. If content grows
beyond 200 items: split into two calls of 100 each, merge the two `ranked[]` arrays,
sort by score descending, then store.

**Exit criteria for Phase 3:**
- Feed loads in AI mode with content ranked by relevance (not chronologically)
- Latitude Traces shows the feed-ranker Nova call with item count in the input
- `userRecommendationScores` has rows with readable reason strings
- Per-item reasons look semantically correct (e.g. "Matches your diabetes management interest")

---

## Phase 4 — Latitude observability setup for both prompts
**Goal:** Get signal and monitor coverage on both Nova calls so issues surface automatically.  
**Risk:** Zero — purely configuration in the Latitude dashboard.

### 4.1 What you get automatically (no config needed)

As soon as Phase 1 telemetry is wired:
- Every `analyzeContent` call → trace in Latitude with prompt, response, tokens, latency
- Every `generateFeedRecommendations` call → trace with full input context and ranked output
- Latitude's built-in flaggers auto-run on every trace: empty responses, refusals, schema
  validation failures, tool call errors

### 4.2 Create a signal for empty topic analysis

Via Latitude dashboard → ambrosia → Signals → New Signal:

- **Name:** Empty content analysis
- **Description:** Nova returned no topics or health topics for a content item
- **Detector type:** Rule
- **Condition:** `last_assistant` output contains `"topics": []`

This fires when the content-analyzer returns a malformed or empty response, which would
silently break the interest tracking pipeline.

### 4.3 Create a monitor for feed-ranker call volume

Via Latitude dashboard → ambrosia → Monitors → New Monitor:

- **Name:** Feed ranker daily run
- **Target:** All traces (filter by a custom tag you add: `prompt: feed-ranker`)
- **Trigger:** Threshold — below 1 call in a 26-hour window
- **Severity:** High

This alerts if the daily 2am cron stops running — you'd otherwise not notice until users
report a stale feed.

### 4.4 Create a signal for item count mismatch

- **Name:** Feed ranker count mismatch
- **Condition:** Response text contains `"total":` but the number differs from `content_count`
  passed in (requires a judge detector: "The ranked array length does not equal the content_count
  that was passed in the prompt")

This catches the case where Nova truncates the output mid-response and returns fewer items
than sent — the most common failure mode for large batch prompts.

### 4.5 Tag your Nova calls for filtering

In `aiRecommendations.ts` and `feedAI.ts`, add OpenTelemetry span attributes to distinguish
the two Nova calls in Latitude:

```typescript
// In analyzeContent:
telemetry.span({ "prompt.name": "content-analyzer", "content.type": args.contentType });

// In generateFeedRecommendations:
telemetry.span({ "prompt.name": "feed-ranker", "user.id": args.userId });
```

This lets you filter Latitude Traces by prompt type and build separate monitors for each.

**Exit criteria for Phase 4:** Signal for empty analysis has fired at least once in test.
Feed-ranker monitor shows green. Both prompts visible as separate filtered views in Traces.

---

## Phase 5 — Session lock and freshness injection (from ai2.md architecture)
**Goal:** Implement the production feed behaviour described in ai2.md.  
**Risk:** Low — frontend only, isolated to for-you.tsx.

### 5.1 Session lock

When the AI feed first loads in a session, store the ranked order in a `useRef`.
Do not re-query Convex for a new order mid-session — serve the locked list until the
user closes and reopens the app (new session).

On pull-to-refresh: check if the cache is stale. If yes, trigger a background re-rank
and serve the old order immediately. The new order appears on the next refresh.

### 5.2 Freshness injection slots

Every 10th position in the ranked feed is a freshness slot — always filled with the newest
unranked content from followed authors. This is a client-side splice, not an AI call.
It gives the feed a live feel without touching Nova.

### 5.3 Engagement decoupled from re-ranking

Engagement events (likes, claps, bookmarks) update `userInterests` in real time as they
already do. But they do not trigger a cache invalidation or a new Nova call. The updated
interests only influence ranking on the next cron cycle. This is the correct architecture
described in ai2.md — one AI call per user per 6 hours, not one per engagement event.

**Exit criteria for Phase 5:** Scrolling through the AI feed for 10 minutes without closing
the app shows no position shuffling. Pull-to-refresh after 6+ hours shows a reordered feed.
Every 10th item is visibly recent content from a followed author.

---

## Phase 6 — Extend Nova feed-ranker to other tabs
**Goal:** Apply the same pattern (one Nova call per cache cycle) to Learn, Community, Booking.  
**Risk:** Low — each tab is independent with existing fallback to regular queries.  
**Prerequisites:** Phase 3 proven stable on For You tab for at least one week.

Each tab gets its own prompt variant, hosted as a string in the relevant Convex action:

| Tab | Action to update | Prompt variant focus |
|---|---|---|
| Learn | `coursesAI.generateCourseRecommendations` | Difficulty progression, enrolled courses, learning gaps |
| Community | `circlesAI.generateCircleRecommendations` | Topic affinity, membership history, free vs paid preference |
| Booking | `bookingAI.generateProviderRecommendations` | Specialization match, booking history, availability, price range |

Each follows the same pattern as Phase 3: gather context → build prompt → one Nova call →
parse ranked[] → store in recommendationCache with tab-specific contentType key.

All three are automatically traced in Latitude alongside the feed-ranker.

---

## Summary

| Phase | What changes | Effort | Risk |
|---|---|---|---|
| 1 — Telemetry | Add `@latitude-data/telemetry` SDK, init in aiRecommendations.ts | 30 min | None |
| 2 — Bug fixes | Fix 6 pre-existing gaps in Convex backend + for-you.tsx | 2–3 hours | Low |
| 3 — Feed ranker | Replace per-item scoring loop with one Nova call | 2–3 hours | Medium |
| 4 — Observability | Signals + monitor config in Latitude dashboard | 1 hour | None |
| 5 — Session lock | Frontend feed locking + freshness slots in for-you.tsx | 1–2 hours | Low |
| 6 — Other tabs | Extend feed-ranker pattern to Learn, Community, Booking | 2 hours/tab | Low |

**Minimum viable:** Phases 1 + 2 + 3 — Latitude observing, bugs fixed, feed ranked by Nova.  
**Recommended for production quality:** Phases 1–5.

---

## What does NOT change

- Nova as the LLM provider — same key, same endpoint, same model
- No new API keys or billing accounts
- The Convex schema — no table drops, no new required fields
- The cron schedule — still every 6h for analysis, daily 2am for recommendations
- The engagement tracking pipeline — `userInterestTracking.ts` is untouched
- The TTL values — content analysis 30 days, recommendations 6 hours
- Auth, payments, notifications, or any other backend module

---

## Rollback strategy

- **Phase 1 rollback:** Remove the telemetry import. Zero effect on functionality.
- **Phase 3 rollback:** Revert `generateFeedRecommendations` to the local scoring loop.
  The existing `recommendationCache` expires within 6 hours and regenerates from the
  old scorer. No data migration needed.
- **Phase 2 has no rollback needed** — the bug fixes are correctness improvements
  that don't change any existing behaviour, they only enable behaviour that was
  already supposed to work.
