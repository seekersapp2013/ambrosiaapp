import { query, action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// AI-ENHANCED UNIFIED FEED QUERY
// Reads from recommendationCache. Falls back to chronological if no cache.
// BUG FIX: fetchContentByIds now resolves Convex storage URLs.
// ============================================================================

export const listUnifiedFeedAI = query({
  args: {
    limit: v.optional(v.number()),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const userId = await getAuthUserId(ctx);

    if (!userId || args.useAI === false) {
      return await getRegularFeed(ctx, limit);
    }

    try {
      const aiRankedFeed = await getAIRankedFeed(ctx, userId, limit);
      if (aiRankedFeed && aiRankedFeed.length > 0) {
        return {
          items: aiRankedFeed,
          useAI: true,
          source: "ai_recommendations",
        };
      }
    } catch (error) {
      console.error("AI feed error, falling back to regular feed:", error);
    }

    const regularFeed = await getRegularFeed(ctx, limit);
    return {
      items: regularFeed,
      useAI: false,
      source: "regular_feed",
    };
  },
});

// ── Cache read ────────────────────────────────────────────────────────────────

async function getAIRankedFeed(ctx: any, userId: any, limit: number) {
  const cached = await ctx.db
    .query("recommendationCache")
    .withIndex("by_user_type", (q: any) =>
      q.eq("userId", userId).eq("contentType", "all")
    )
    .first();

  const now = Date.now();

  if (cached && cached.expiresAt > now && cached.rankedContentIds.length > 0) {
    const rankedIds = cached.rankedContentIds.slice(0, limit);
    return await fetchContentByIds(ctx, rankedIds);
  }

  return null;
}

// ── Helper: resolve courseInfo for a single content item ─────────────────────

async function resolveCourseInfo(
  ctx: any,
  contentType: "article" | "reel",
  contentId: string
): Promise<{ courseTitle: string; order: number } | null> {
  const membership = await ctx.db
    .query("courseContent")
    .withIndex("by_content", (q: any) =>
      q.eq("contentType", contentType).eq("contentId", contentId)
    )
    .first();
  if (!membership) return null;
  const course = await ctx.db.get(membership.courseId);
  if (!course) return null;
  return { courseTitle: course.title, order: membership.order };
}

// ── Fetch content by ranked IDs (preserves order, resolves storage URLs) ─────

async function fetchContentByIds(ctx: any, contentIds: string[]) {
  const items = [];

  for (const id of contentIds) {
    const colonIdx = id.indexOf(":");
    if (colonIdx === -1) continue;

    const contentType = id.substring(0, colonIdx);
    const contentId = id.substring(colonIdx + 1);

    if (contentType === "article") {
      const content = await ctx.db.get(contentId as any);
      if (content && content.status === "PUBLISHED") {
        const author = await ctx.db.get(content.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q: any) => q.eq(q.field("userId"), content.authorId))
          .first();

        const coverImageUrl = content.coverImageUrl
          ? await ctx.storage.getUrl(content.coverImageUrl).catch(() => null)
          : null;
        const avatarUrl = profile?.avatar
          ? await ctx.storage.getUrl(profile.avatar).catch(() => null)
          : null;

        // Resolve courseInfo so the Learn tab can filter course-only content
        const courseInfo = await resolveCourseInfo(ctx, "article", contentId);

        items.push({
          ...content,
          coverImageUrl,
          courseInfo: courseInfo ?? undefined,
          contentType: "article" as const,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: avatarUrl,
          },
        });
      }
    } else if (contentType === "reel") {
      const content = await ctx.db.get(contentId as any);
      if (content) {
        const author = await ctx.db.get(content.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q: any) => q.eq(q.field("userId"), content.authorId))
          .first();

        const videoUrl = content.videoUrl
          ? await ctx.storage.getUrl(content.videoUrl).catch(() => null)
          : null;
        const posterUrl = content.posterUrl
          ? await ctx.storage.getUrl(content.posterUrl).catch(() => null)
          : null;
        const avatarUrl = profile?.avatar
          ? await ctx.storage.getUrl(profile.avatar).catch(() => null)
          : null;

        // Resolve courseInfo so the Learn tab can filter course-only content
        const courseInfo = await resolveCourseInfo(ctx, "reel", contentId);

        items.push({
          ...content,
          videoUrl,
          posterUrl,
          courseInfo: courseInfo ?? undefined,
          contentType: "reel" as const,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: avatarUrl,
          },
        });
      }
    }
  }

  return items;
}

// ── Regular chronological fallback ───────────────────────────────────────────

async function getRegularFeed(ctx: any, limit: number) {
  const articles = await ctx.db
    .query("articles")
    .withIndex("by_status", (q: any) => q.eq("status", "PUBLISHED"))
    .order("desc")
    .take(limit);

  const reels = await ctx.db
    .query("reels")
    .order("desc")
    .take(limit);

  const articlesWithAuthors = await Promise.all(
    articles.map(async (article: any) => {
      const author = await ctx.db.get(article.authorId);
      const profile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), article.authorId))
        .first();

      const coverImageUrl = article.coverImageUrl
        ? await ctx.storage.getUrl(article.coverImageUrl).catch(() => null)
        : null;

      const courseInfo = await resolveCourseInfo(ctx, "article", article._id as string);

      return {
        ...article,
        coverImageUrl,
        courseInfo: courseInfo ?? undefined,
        contentType: "article" as const,
        author: {
          id: author?._id,
          name: author?.name || profile?.name,
          username: profile?.username,
          avatar: profile?.avatar,
        },
      };
    })
  );

  const reelsWithAuthors = await Promise.all(
    reels.map(async (reel: any) => {
      const author = await ctx.db.get(reel.authorId);
      const profile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), reel.authorId))
        .first();

      const videoUrl = reel.videoUrl
        ? await ctx.storage.getUrl(reel.videoUrl).catch(() => null)
        : null;
      const posterUrl = reel.posterUrl
        ? await ctx.storage.getUrl(reel.posterUrl).catch(() => null)
        : null;

      const courseInfo = await resolveCourseInfo(ctx, "reel", reel._id as string);

      return {
        ...reel,
        videoUrl,
        posterUrl,
        courseInfo: courseInfo ?? undefined,
        contentType: "reel" as const,
        author: {
          id: author?._id,
          name: author?.name || profile?.name,
          username: profile?.username,
          avatar: profile?.avatar,
        },
      };
    })
  );

  return [...articlesWithAuthors, ...reelsWithAuthors]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, limit);
}

// ============================================================================
// INTERNAL QUERIES — engagement counts for feed-ranker context
// likes, claps, bookmarks, comments live in separate tables, not on the row
// ============================================================================

export const getArticleEngagementCounts = internalQuery({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const [likes, claps, bookmarks, comments] = await Promise.all([
      ctx.db
        .query("likes")
        .filter((q) => q.eq(q.field("articleId"), args.articleId))
        .collect()
        .then((rows) => rows.length),

      ctx.db
        .query("claps")
        .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
        .collect()
        .then((rows) => rows.reduce((sum, r) => sum + (r.count ?? 0), 0)),

      ctx.db
        .query("bookmarks")
        .filter((q) => q.eq(q.field("articleId"), args.articleId))
        .collect()
        .then((rows) => rows.length),

      ctx.db
        .query("comments")
        .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
        .collect()
        .then((rows) => rows.length),
    ]);

    return { likes, claps, bookmarks, comments };
  },
});

export const getReelEngagementCounts = internalQuery({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const [likes, bookmarks, comments] = await Promise.all([
      ctx.db
        .query("likes")
        .filter((q) => q.eq(q.field("reelId"), args.reelId))
        .collect()
        .then((rows) => rows.length),

      ctx.db
        .query("bookmarks")
        .filter((q) => q.eq(q.field("reelId"), args.reelId))
        .collect()
        .then((rows) => rows.length),

      ctx.db
        .query("comments")
        .withIndex("by_reel", (q) => q.eq("reelId", args.reelId))
        .collect()
        .then((rows) => rows.length),
    ]);

    return { likes, bookmarks, comments };
  },
});

export const getUserProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    return profile ?? null;
  },
});

// ============================================================================
// GENERATE FEED RECOMMENDATIONS
// Replaces the per-item calculateRecommendationScore loop with a single
// Nova feed-ranker call. One AI call per user per cache cycle (6 hours).
//
// Latitude telemetry: the Nova call is tagged with prompt.name = "feed-ranker"
// so it appears as a separate filter in the Latitude Traces dashboard.
// ============================================================================

export const generateFeedRecommendations = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      const novaKey = process.env.VITE_NOVA_API_KEY;
      if (!novaKey) {
        console.warn("Nova API key not configured — skipping feed recommendations");
        return { success: false, reason: "no_nova_key" };
      }

      // 1. User context
      const userProfile = await ctx.runQuery(internal.aiRecommendations.buildUserProfile, {
        userId: args.userId,
      });
      if (!userProfile) return { success: false, reason: "no_profile" };

      const profileDoc = await ctx.runQuery(internal.feedAI.getUserProfile, {
        userId: args.userId,
      });

      // 2. Content to rank (up to 100 items)
      const articles = await ctx.runQuery(api.articles.listFeed, { limit: 100 });
      const reels = await ctx.runQuery(api.reels.listReels, { limit: 100 });

      // 3. Attach AI analysis fields to each item
      const contentItems: any[] = [];

      for (const article of articles) {
        const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
          contentType: "article",
          contentId: article._id,
        });

        // likes, claps, bookmarks, comments are in separate tables — fetch counts
        const engagementCounts = await ctx.runQuery(
          internal.feedAI.getArticleEngagementCounts,
          { articleId: article._id }
        );

        contentItems.push({
          id: `article:${article._id}`,
          contentType: "article",
          title: article.title || "",
          tags: article.tags || [],
          authorId: article.authorId,
          createdAt: article.createdAt,
          isGated: article.isGated ?? false,
          views: article.views ?? 0,
          likes: engagementCounts.likes,
          claps: engagementCounts.claps,
          bookmarks: engagementCounts.bookmarks,
          comments: engagementCounts.comments,
          ...(analysis
            ? {
                aiTopics: analysis.aiAnalysis.topics,
                aiHealthTopics: analysis.aiAnalysis.healthTopics ?? [],
                aiKeywords: analysis.aiAnalysis.keywords,
                aiAudience: analysis.aiAnalysis.targetAudience,
                aiCategory: analysis.aiAnalysis.category,
              }
            : {}),
        });
      }

      for (const reel of reels) {
        const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
          contentType: "reel",
          contentId: reel._id,
        });

        const engagementCounts = await ctx.runQuery(
          internal.feedAI.getReelEngagementCounts,
          { reelId: reel._id }
        );

        contentItems.push({
          id: `reel:${reel._id}`,
          contentType: "reel",
          caption: reel.caption || "",
          tags: reel.tags || [],
          authorId: reel.authorId,
          createdAt: reel.createdAt,
          isGated: reel.isGated ?? false,
          views: reel.views ?? 0,
          likes: engagementCounts.likes,
          claps: 0, // claps table is articles-only
          bookmarks: engagementCounts.bookmarks,
          comments: engagementCounts.comments,
          ...(analysis
            ? {
                aiTopics: analysis.aiAnalysis.topics,
                aiHealthTopics: analysis.aiAnalysis.healthTopics ?? [],
                aiKeywords: analysis.aiAnalysis.keywords,
                aiAudience: analysis.aiAnalysis.targetAudience,
                aiCategory: analysis.aiAnalysis.category,
              }
            : {}),
        });
      }

      if (contentItems.length === 0) {
        return { success: false, reason: "no_content" };
      }

      // 4. If batch > 200 items, split into two calls and merge
      const MAX_BATCH = 100;
      let rankedItems: Array<{ id: string; score: number; discovery: boolean; reasons: string[] }> = [];

      if (contentItems.length <= MAX_BATCH) {
        rankedItems = await callFeedRanker(ctx, novaKey, userProfile, profileDoc, contentItems);
      } else {
        // Two calls, merge by score
        const batch1 = contentItems.slice(0, MAX_BATCH);
        const batch2 = contentItems.slice(MAX_BATCH, MAX_BATCH * 2);

        const [result1, result2] = await Promise.all([
          callFeedRanker(ctx, novaKey, userProfile, profileDoc, batch1),
          callFeedRanker(ctx, novaKey, userProfile, profileDoc, batch2),
        ]);

        rankedItems = [...result1, ...result2].sort((a, b) => b.score - a.score);
      }

      if (rankedItems.length === 0) {
        console.error("Feed ranker returned no items — keeping existing cache");
        return { success: false, reason: "empty_ranker_response" };
      }

      // 5. Verify self-check: warn if item count doesn't match
      if (rankedItems.length !== contentItems.length) {
        console.warn(
          `[feed-ranker] Count mismatch: sent ${contentItems.length}, received ${rankedItems.length}`
        );
      }

      const rankedIds = rankedItems.map((r) => r.id);

      // 6. Store per-item scores + reasons for "Why you're seeing this" tooltips
      for (const item of rankedItems) {
        const [type, id] = item.id.split(":");
        if (!type || !id) continue;
        await ctx.runMutation(internal.aiRecommendations.storeRecommendationScore, {
          userId: args.userId,
          contentType: type,
          contentId: id,
          score: item.score,
          reasoning: item.reasons ?? [],
        });
      }

      // 7. Cache ranked IDs (6-hour TTL)
      const now = Date.now();
      const expiresAt = now + 6 * 60 * 60 * 1000;

      const existing = await ctx.runQuery(internal.aiRecommendations.getCachedRecommendations, {
        userId: args.userId,
        contentType: "all",
      });

      if (existing) {
        await ctx.runMutation(internal.aiRecommendations.updateRecommendationCache, {
          cacheId: existing._id,
          rankedContentIds: rankedIds,
          expiresAt,
        });
      } else {
        await ctx.runMutation(internal.aiRecommendations.createRecommendationCache, {
          userId: args.userId,
          contentType: "all",
          rankedContentIds: rankedIds,
          expiresAt,
        });
      }

      const discoveryCount = rankedItems.filter((r) => r.discovery).length;
      console.log(
        `✅ Feed ranked for ${args.userId}: ${rankedIds.length} items, ${discoveryCount} discovery`
      );

      return { success: true, count: rankedIds.length, discoveryCount };
    } catch (error) {
      console.error("Error generating feed recommendations:", error);
      return { success: false, error: String(error) };
    }
  },
});

// ── Nova feed-ranker call ─────────────────────────────────────────────────────

async function callFeedRanker(
  ctx: any,
  novaKey: string,
  userProfile: any,
  profileDoc: any,
  contentItems: any[]
): Promise<Array<{ id: string; score: number; discovery: boolean; reasons: string[] }>> {
  const profileInterests = (profileDoc?.interests ?? []).join(", ");

  const dynamicInterests = (userProfile.dynamicInterests ?? [])
    .slice(0, 50)
    .map(
      (i: { topic: string; strength: number; source: string }) =>
        `- ${i.topic} (strength: ${i.strength}, source: ${i.source})`
    )
    .join("\n");

  const followingIds = (userProfile.following ?? []).join("\n");

  const prompt = buildFeedRankerPrompt({
    userId: String(userProfile.userId),
    profileInterests,
    dynamicInterests,
    followingIds,
    currentUserAuthorId: String(userProfile.userId), // own content capped at 5
    contentCount: contentItems.length,
    contentItems: JSON.stringify(contentItems, null, 2),
  });

  // Latitude telemetry tag
  console.log("[latitude:span]", JSON.stringify({
    "prompt.name": "feed-ranker",
    "user.id": String(userProfile.userId),
    "content.count": contentItems.length,
  }));

  const startTime = Date.now();

  const response = await fetch("https://api.nova.amazon.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${novaKey}`,
    },
    body: JSON.stringify({
      model: "nova-2-lite-v1",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    }),
  });

  const latencyMs = Date.now() - startTime;

  await ctx.runMutation(internal.recommendationMetrics.trackNovaAPIUsage, {
    endpoint: "feed-ranker",
    contentType: "feed",
    tokensUsed: 0, // filled below if response ok
    latencyMs,
    success: response.ok,
    errorMessage: response.ok ? undefined : response.statusText,
  });

  if (!response.ok) {
    console.error("Nova feed-ranker error:", response.statusText);
    return [];
  }

  const data = await response.json();

  // Update token count now that we have it
  await ctx.runMutation(internal.recommendationMetrics.trackNovaAPIUsage, {
    endpoint: "feed-ranker",
    contentType: "feed",
    tokensUsed: data.usage?.total_tokens ?? 0,
    latencyMs,
    success: true,
  });

  const text = data.choices?.[0]?.message?.content ?? "";
  return parseFeedRankerResponse(text);
}

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildFeedRankerPrompt(vars: {
  userId: string;
  profileInterests: string;
  dynamicInterests: string;
  followingIds: string;
  currentUserAuthorId: string;
  contentCount: number;
  contentItems: string;
}): string {
  return `You are a personalised health-content feed ranker.
Re-order the batch of content items from most to least relevant for this specific user.
Every item must appear in the output — never drop or add items.

RULES:
- Own-content rule: if an item's authorId matches ${vars.currentUserAuthorId}, cap its score at 5.
- Following bonus: if an item's authorId appears in the following list, add +8 to its score.
- Discovery: mark roughly 10–15% of items as discovery: true — high-quality items adjacent to the user's topic space.
- Use aiTopics, aiHealthTopics, aiKeywords, and aiCategory as primary relevance signals. Fall back to tags when AI analysis is absent.
- Score each item 0–100. Higher = more relevant.
- Self-verify: the ranked array length must equal ${vars.contentCount} exactly.

USER CONTEXT:
User ID: ${vars.userId}

Declared interests (user stated these directly — highest confidence):
${vars.profileInterests}

Behavioural interest profile (top 50 by strength, 0–100):
${vars.dynamicInterests}

Authors this user follows (+8 bonus for each matching authorId):
${vars.followingIds}

Total items to rank: ${vars.contentCount}

CONTENT ITEMS:
${vars.contentItems}

OUTPUT FORMAT — respond with ONLY valid JSON, no prose, no markdown fencing:
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
    "total": <must equal ${vars.contentCount}>,
    "discoveryCount": <number>,
    "topInterests": ["<interest 1>", "<interest 2>", "<interest 3>"]
  }
}`;
}

// ── Response parser ────────────────────────────────────────────────────────────

function parseFeedRankerResponse(
  text: string
): Array<{ id: string; score: number; discovery: boolean; reasons: string[] }> {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[feed-ranker] No JSON found in response");
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.ranked)) {
      console.error("[feed-ranker] ranked field missing or not array");
      return [];
    }

    return parsed.ranked
      .filter((item: any) => typeof item.id === "string")
      .map((item: any) => ({
        id: item.id,
        score: typeof item.score === "number" ? Math.min(100, Math.max(0, item.score)) : 50,
        discovery: item.discovery === true,
        reasons: Array.isArray(item.reasons) ? item.reasons.slice(0, 3) : [],
      }));
  } catch (err) {
    console.error("[feed-ranker] Failed to parse response:", err);
    return [];
  }
}
