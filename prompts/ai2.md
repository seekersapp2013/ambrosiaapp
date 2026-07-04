You've spotted the exact same problem every major social platform has had to solve. Here's how they handle it:

---

## The core insight: separate ranking from serving

The AI never runs in the hot path. It runs **offline, in the background**, and the app just reads a pre-computed list. The user never waits for an LLM call. This is how TikTok, Instagram, and YouTube all work.

---

## How production recommendation systems handle this

**1. Pre-compute on a schedule, not on demand**

The ranking job runs every few hours (you already have this — the 6-hour cron). Between runs, the app serves the cached ordered list. If new content arrives mid-session, it either gets inserted at a reasonable position using a lightweight rule (e.g. "new content from followed authors goes near the top") or it waits for the next ranking cycle. Users don't notice a 6-hour-old rank order — they notice bad relevance, not stale ordering.

**2. Decouple the feed list from the ranked order**

The cache stores a ranked list of IDs. When new content arrives, your Convex layer appends it to the feed at a default insertion point (e.g. position 5, after the first few highly-relevant items) without re-ranking. The AI only re-ranks the full list on the next scheduled cycle. Netflix calls this "score interpolation" — new items get an estimated score until the next full ranking pass.

**3. Separate interest updates from re-ranking**

Engagement signals (a like, a bookmark) update the `userInterests` table immediately and cheaply. But a new ranking is only generated from those signals on the next cycle. The two operations are decoupled. So within a 30-minute session: the user's interest profile may update 30 times, but the ranked feed list only regenerates once (at the next cron boundary).

**4. Session-level feed lock**

Instagram and TikTok lock the feed order for the duration of a session. When you open the app you get your ranked list, and that list doesn't reshuffle under you mid-scroll — even if new content arrives. The reshuffle happens when you close and reopen the app (a new session). This prevents the jarring experience of content jumping around while you're reading.

**5. Tiered freshness injection**

Rather than re-ranking everything when something new is published, platforms inject fresh content into fixed "freshness slots" — e.g. every 10th item is always the newest unranked content from people you follow. This gives the feed a live feel without touching the AI layer at all.

---

## What I'd recommend for Ambrosia

The architecture you already have is actually the right one — you just need to trust it and stop triggering re-ranks mid-session:

- **Cron every 6 hours** re-ranks the full list using Latitude. One AI call per user per 6 hours, regardless of activity.
- **New content** gets appended to the cache at a default insertion point (after position 3, before position 8) without triggering a re-rank.
- **Within a session**, serve the cached list as-is. Lock it at session start.
- **On app open** (new session), check if the cache is stale. If yes, trigger a background re-rank but serve the old list immediately while it computes. Swap in the new order on the next pull-to-refresh.
- **Engagement signals** update `userInterests` in real time — but they only influence ranking on the next cron cycle.

This means a user who spends 30 minutes in the app triggers **zero** Latitude calls. The call already happened at the last 6-hour boundary. You'd be looking at 4 calls per user per day maximum, and in practice far fewer because most users don't use the app every 6 hours.

---

Want me to implement this — the session lock, the freshness injection slots, and the decoupled engagement-vs-ranking separation?