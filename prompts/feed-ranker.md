# Feed Ranker Prompt — Integration Guide

File: `prompts/feed-ranker.promptl`  
Platform: [Latitude](https://latitude.so) — PromptL format  
Model: `gpt-4o` at temperature 0.2

---

## What it does

Re-orders the full "For You" content feed from most to least relevant for the current user. Every item stays — nothing is removed, nothing is added, only the position changes. This slots into the `generateFeedRecommendations` action in `convex/feedAI.ts`, replacing the current deterministic scorer.

---

## Variables

### user_id

The Convex user ID of the person being served the feed. Used for traceability inside the prompt, not for any additional lookup.

---

### profile_interests

The user's declared interests from onboarding — the list of topics they explicitly chose. Source is `profile.interests`. Pass it as a plain list of topic strings, one per line or comma-separated. These carry the highest confidence because the user stated them directly.

Example value passed in:
Nutrition, Mental Health, Fitness, Sleep, Diabetes Management

---

### user_dynamic_interests

The user's behavioural interest profile, built from every action they have taken on the platform. This is more than just likes — it covers the full engagement surface:

- Claps on articles or reels
- Likes on articles or reels
- Bookmarks saved
- Comments written
- Articles read and videos watched
- Authors followed (weighted by those authors' topic clusters)
- Courses enrolled in (the course's topic cluster adds 30 strength points)
- Circles joined (the circle's topic cluster adds 30 strength points)

Each interest entry has a topic label and a strength score from 0 to 100. Higher strength means the signal has been reinforced more recently and more frequently. Source is the `userInterests` table. Pass the top 50 entries sorted by strength descending.

Example value passed in:
- nutrition (strength: 92, source: engagement)
- diabetes management (strength: 78, source: engagement)
- mental health (strength: 71, source: explicit)
- exercise science (strength: 55, source: inferred)
- sleep hygiene (strength: 40, source: inferred)

---

### following_ids

The list of author IDs this user follows. Content from these authors receives a +8 point bonus in the ranking. Source is the `follows` table, follower side. Pass all following IDs as a plain list.

---

### current_user_author_id

The author ID of the current user — the same person being served this feed. Any content whose `authorId` matches this value will be capped at a maximum score of 5, regardless of topic relevance or engagement. Own-content is pushed to the very bottom of the feed because the user already knows what they wrote or recorded. These items still appear in the output — they are never removed.

---

### content_count

The total number of content items being passed in. The model uses this to self-verify it returned every item. Pass the integer count directly.

---

### content_items

The full batch of articles and reels to rank. Each item should include:

- id — formatted as "article:convexId" or "reel:convexId"
- contentType — "article" or "reel"
- title — for articles
- caption — for reels
- tags — the author-defined tags array
- authorId — the Convex user ID of the author
- createdAt — Unix millisecond timestamp
- isGated — whether the content requires payment to access
- views, likes, claps, bookmarks, comments — engagement counts for quality scoring
- aiTopics, aiHealthTopics, aiKeywords, aiAudience, aiCategory — from the contentAnalysis table if available; omit fields that are not yet analysed

Pass this as a structured list. The more topic and keyword data each item has, the better the ranking quality. Items without AI analysis will still be ranked but with lower precision.

---

## Reading the output

The model returns a JSON object with two keys:

`ranked` — the full list of content IDs in ranked order, each with a score (0–100), a discovery flag, and 1–3 human-readable reasons suitable for a "Why you're seeing this" tooltip.

`meta` — a summary object with the total count (should match content_count), the number of discovery items, and the top 3 interests that drove the most rankings in this batch.

Take `ranked[].id` in order and use that sequence to reconstruct the feed. Store the ordered IDs in `recommendationCache.rankedContentIds`. Optionally store the score and reasons per item for tooltip display.

---

## Discovery items

Roughly 10–15% of items will be marked `discovery: true`. These are items that do not strongly match the user's known interests but are high quality and adjacent to their topic space. They serve the same function as TikTok's interest expansion — keeping the feed from becoming an echo chamber. The UI can optionally render a subtle "Something new" indicator on these cards.

---

## Caching

Call this prompt only when the recommendation cache is stale (the current TTL is 6 hours). Do not call it on every feed load. Store the result in `recommendationCache` with the same expiry logic already in `generateFeedRecommendations`.

---

## Batch size

The prompt comfortably handles 100 items within GPT-4o's context window. For batches larger than 200 items, split into two calls, then merge and re-sort the resulting ranked arrays by score before caching.


Food For Thought

