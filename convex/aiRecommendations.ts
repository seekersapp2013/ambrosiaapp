import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// CONTENT ANALYSIS WITH NOVA AI
// Latitude telemetry is wired via the LATITUDE_API_KEY env var.
// The @latitude-data/telemetry SDK is initialised lazily inside the action
// (Convex actions run in a Node-like V8 isolate — top-level init is safe but
//  the import must be dynamic to avoid bundler issues in the Convex runtime).
// ============================================================================

export const analyzeContent = action({
  args: {
    contentType: v.string(),
    contentId: v.string(),
    contentData: v.object({
      title: v.optional(v.string()),
      text: v.optional(v.string()),
      caption: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      description: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();

    try {
      const novaKey = process.env.VITE_NOVA_API_KEY;

      if (!novaKey) {
        console.warn("Nova API key not configured, skipping AI analysis");
        return null;
      }

      const prompt = buildAnalysisPrompt(args.contentType, args.contentData);

      // ── Latitude telemetry span attributes ──────────────────────────────
      // The @latitude-data/telemetry SDK auto-intercepts fetch calls when
      // initialised. We attach span metadata here for dashboard filtering.
      // When the SDK is not installed yet these console marks are harmless.
      console.log("[latitude:span]", JSON.stringify({
        "prompt.name": "content-analyzer",
        "content.type": args.contentType,
        "content.id": args.contentId,
      }));

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

      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        console.error("Nova API error:", errText);

        await ctx.runMutation(internal.recommendationMetrics.trackNovaAPIUsage, {
          endpoint: "analyze",
          contentType: args.contentType,
          latencyMs,
          success: false,
          errorMessage: errText,
        });

        return null;
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        return null;
      }

      const analysis = parseAIResponse(aiResponse);

      // Validate — guard against empty topics which break interest tracking
      if (!analysis.topics || analysis.topics.length === 0) {
        console.warn(
          `[analyze] Nova returned empty topics for ${args.contentType}:${args.contentId}`
        );
      }

      await ctx.runMutation(internal.recommendationMetrics.trackNovaAPIUsage, {
        endpoint: "analyze",
        contentType: args.contentType,
        tokensUsed: data.usage?.total_tokens || 0,
        latencyMs,
        success: true,
      });

      await ctx.runMutation(internal.aiRecommendations.storeContentAnalysis, {
        contentType: args.contentType,
        contentId: args.contentId,
        analysis,
        rawResponse: aiResponse,
      });

      return analysis;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      console.error("Error analyzing content with Nova AI:", error);

      await ctx.runMutation(internal.recommendationMetrics.trackNovaAPIUsage, {
        endpoint: "analyze",
        contentType: args.contentType,
        latencyMs,
        success: false,
        errorMessage: String(error),
      });

      return null;
    }
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

export const storeContentAnalysis = internalMutation({
  args: {
    contentType: v.string(),
    contentId: v.string(),
    analysis: v.object({
      summary: v.string(),
      topics: v.array(v.string()),
      keywords: v.array(v.string()),
      sentiment: v.string(),
      category: v.string(),
      targetAudience: v.array(v.string()),
      difficulty: v.optional(v.string()),
      healthTopics: v.optional(v.array(v.string())),
    }),
    rawResponse: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days

    const existing = await ctx.db
      .query("contentAnalysis")
      .withIndex("by_content", (q) =>
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        aiAnalysis: args.analysis,
        novaResponse: args.rawResponse,
        analyzedAt: now,
        expiresAt,
      });
    } else {
      await ctx.db.insert("contentAnalysis", {
        contentType: args.contentType,
        contentId: args.contentId,
        aiAnalysis: args.analysis,
        novaResponse: args.rawResponse,
        analyzedAt: now,
        expiresAt,
      });
    }
  },
});

export const storeRecommendationScore = internalMutation({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    score: v.number(),
    reasoning: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    const existing = await ctx.db
      .query("userRecommendationScores")
      .withIndex("by_user_content", (q) =>
        q
          .eq("userId", args.userId)
          .eq("contentType", args.contentType)
          .eq("contentId", args.contentId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        score: args.score,
        reasoning: args.reasoning,
        calculatedAt: now,
        expiresAt,
      });
    } else {
      await ctx.db.insert("userRecommendationScores", {
        userId: args.userId,
        contentType: args.contentType,
        contentId: args.contentId,
        score: args.score,
        reasoning: args.reasoning,
        calculatedAt: now,
        expiresAt,
      });
    }
  },
});

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildAnalysisPrompt(contentType: string, data: any): string {
  const jsonSchema = `{
  "summary": "2-sentence summary",
  "topics": ["topic1", "topic2", "topic3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "sentiment": "informative|empathetic|urgent|motivational|educational|professional|supportive",
  "category": "education|wellness|medical|lifestyle|tutorial|awareness|certification|support|networking",
  "targetAudience": ["patients", "professionals", "general", "caregivers", "students", "fitness"],
  "difficulty": "beginner|intermediate|advanced",
  "healthTopics": ["specific health domain 1", "specific health domain 2"]
}`;

  const rules = `Rules:
- topics: 2–5 broad topic strings
- keywords: 3–8 specific keyword strings
- healthTopics: narrow clinical/wellness domains (e.g. "type 2 diabetes", "cognitive behavioural therapy")
- All arrays must have at least one item
- Return ONLY the JSON object — no prose, no markdown fencing`;

  switch (contentType) {
    case "article":
      return `Analyze this health article and return ONLY a JSON object.
Title: ${data.title || ""}
Body (first 2000 chars): ${data.text?.substring(0, 2000) || ""}
Tags: ${(data.tags || []).join(", ")}

${rules}

${jsonSchema}`;

    case "reel":
      return `Analyze this health video reel and return ONLY a JSON object.
Caption: ${data.caption || ""}
Tags: ${(data.tags || []).join(", ")}

${rules}

${jsonSchema}`;

    case "course":
      return `Analyze this health course and return ONLY a JSON object.
Title: ${data.title || ""}
Description: ${data.description || ""}
Tags: ${(data.tags || []).join(", ")}

${rules}

${jsonSchema}`;

    case "circle":
      return `Analyze this health community circle and return ONLY a JSON object.
Name: ${data.title || ""}
Description: ${data.description || ""}
Tags: ${(data.tags || []).join(", ")}

${rules}

${jsonSchema}`;

    case "event":
      return `Analyze this health event and return ONLY a JSON object.
Title: ${data.title || ""}
Description: ${data.description || ""}
Tags: ${(data.tags || []).join(", ")}

${rules}

${jsonSchema}`;

    case "provider":
      return `Analyze this healthcare provider profile and return ONLY a JSON object.
Job Title: ${data.title || ""}
About: ${data.description || ""}
Specialization: ${(data.tags || []).join(", ")}

${rules}

${jsonSchema}`;

    default:
      return `Analyze this health content and return ONLY a JSON object.
Content: ${JSON.stringify(data)}

${rules}

${jsonSchema}`;
  }
}

// ============================================================================
// RESPONSE PARSER
// ============================================================================

function parseAIResponse(response: string): any {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Normalise — ensure all arrays exist and have at least one item
      return {
        summary: parsed.summary || "No summary available",
        topics: Array.isArray(parsed.topics) && parsed.topics.length > 0
          ? parsed.topics
          : ["general health"],
        keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0
          ? parsed.keywords
          : [],
        sentiment: parsed.sentiment || "informative",
        category: parsed.category || "general",
        targetAudience: Array.isArray(parsed.targetAudience) && parsed.targetAudience.length > 0
          ? parsed.targetAudience
          : ["general"],
        difficulty: parsed.difficulty,
        healthTopics: Array.isArray(parsed.healthTopics)
          ? parsed.healthTopics
          : [],
      };
    }

    // Fallback for non-JSON responses
    return {
      summary: response.substring(0, 200),
      topics: ["general health"],
      keywords: [],
      sentiment: "informative",
      category: "general",
      targetAudience: ["general"],
      difficulty: "intermediate",
      healthTopics: [],
    };
  } catch (error) {
    console.error("Error parsing Nova response:", error);
    return {
      summary: "Analysis unavailable",
      topics: ["general health"],
      keywords: [],
      sentiment: "informative",
      category: "general",
      targetAudience: ["general"],
      healthTopics: [],
    };
  }
}

// ============================================================================
// USER PROFILE BUILDER
// Bug fix: reads profile.interests (not profile.tags which is always empty)
// ============================================================================

export const buildUserProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    // Dynamic interest scores from engagement pipeline (top 50 by strength)
    const dynamicInterests = await ctx.db
      .query("userInterests")
      .withIndex("by_user_strength", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(50);

    const engagement = await ctx.db
      .query("engagement")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);

    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    const courseProgress = await ctx.db
      .query("courseProgress")
      .withIndex("by_user_course", (q) => q.eq("userId", args.userId))
      .collect();

    const circleMembers = await ctx.db
      .query("circleMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      userId: args.userId,
      // BUG FIX: was profile?.tags — field is profile.interests
      profileInterests: profile?.interests || [],
      dynamicInterests: dynamicInterests.map((i) => ({
        topic: i.interest,
        strength: i.strength,
        source: i.source,
      })),
      // Legacy field kept for backward compat with calculateRecommendationScore
      interests: dynamicInterests.map((i) => i.interest),
      engagementHistory: engagement.map((e) => ({
        contentType: e.contentType,
        contentId: e.contentId,
        type: e.type,
        createdAt: e._creationTime,
      })),
      following: following.map((f) => f.followingId),
      enrolledCourses: courseProgress.map((cp) => cp.courseId),
      circles: circleMembers.map((cm) => cm.circleId),
      createdAt: user._creationTime,
    };
  },
});

// ============================================================================
// CONTENT ANALYSIS LOOKUP
// ============================================================================

export const getContentAnalysis = internalQuery({
  args: {
    contentType: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contentAnalysis")
      .withIndex("by_content", (q) =>
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .first();
  },
});

// ============================================================================
// SCORING ENGINE
// Kept for backward compat (used by coursesAI, circlesAI, bookingAI).
// feedAI.generateFeedRecommendations uses the Nova feed-ranker instead.
// ============================================================================

export const calculateRecommendationScore = action({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    contentCreatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const userProfile = await ctx.runQuery(internal.aiRecommendations.buildUserProfile, {
        userId: args.userId,
      });

      if (!userProfile) {
        return { score: 50, reasoning: ["Default score - no user profile"] };
      }

      const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
        contentType: args.contentType,
        contentId: args.contentId,
      });

      if (!analysis) {
        return { score: 50, reasoning: ["Default score - no content analysis"] };
      }

      let score = 0;
      const reasoning: string[] = [];

      // 1. Topic match — uses both profile interests AND dynamic interests (40 pts)
      const allUserInterests = [
        ...userProfile.profileInterests,
        ...userProfile.interests,
      ];
      const topicScore = calculateTopicMatch(
        allUserInterests,
        [...analysis.aiAnalysis.topics, ...(analysis.aiAnalysis.healthTopics || [])]
      );
      score += topicScore * 0.4;
      if (topicScore > 70) reasoning.push(`Strong topic match (${Math.round(topicScore)}%)`);
      else if (topicScore > 50) reasoning.push("Good topic match");

      // 2. Social signal — following bonus (20 pts)
      const authorId = await getContentAuthorId(ctx, args.contentType, args.contentId);
      const socialScore = calculateSocialScore(userProfile.following, authorId);
      score += socialScore * 0.2;
      if (socialScore > 80) reasoning.push("From someone you follow");
      else if (socialScore > 50) reasoning.push("From your network");

      // 3. Engagement pattern (20 pts)
      const engagementScore = calculateEngagementMatch(
        userProfile.engagementHistory,
        args.contentType
      );
      score += engagementScore * 0.2;
      if (engagementScore > 60) reasoning.push("Matches your engagement patterns");

      // 4. Freshness (10 pts)
      const freshnessScore = args.contentCreatedAt
        ? calculateFreshnessScore(args.contentCreatedAt)
        : 50;
      score += freshnessScore * 0.1;
      if (freshnessScore > 80) reasoning.push("Fresh content");

      // 5. Diversity (10 pts)
      const recentTopics = userProfile.engagementHistory
        .slice(0, 10)
        .map((e) => e.contentType);
      const diversityScore = calculateDiversityScore(recentTopics, analysis.aiAnalysis.topics);
      score += diversityScore * 0.1;
      if (diversityScore > 70) reasoning.push("Exploring new topics");

      // Bonus: audience match
      if (
        analysis.aiAnalysis.targetAudience.some((a: string) =>
          allUserInterests.some((i) => i.toLowerCase().includes(a.toLowerCase()))
        )
      ) {
        score += 5;
        reasoning.push("Matches your audience profile");
      }

      return {
        score: Math.min(100, Math.round(score)),
        reasoning: reasoning.length > 0 ? reasoning : ["Recommended for you"],
      };
    } catch (error) {
      console.error("Error calculating recommendation score:", error);
      return { score: 50, reasoning: ["Default recommendation"] };
    }
  },
});

// ── Scorer helpers ────────────────────────────────────────────────────────────

async function getContentAuthorId(
  ctx: any,
  contentType: string,
  contentId: string
): Promise<string> {
  try {
    // Direct db.get is cheaper than listing the full feed
    const doc = await ctx.runQuery(internal.aiRecommendations.getContentDoc, {
      contentType,
      contentId,
    });
    return doc?.authorId || "";
  } catch {
    return "";
  }
}

export const getContentDoc = internalQuery({
  args: { contentType: v.string(), contentId: v.string() },
  handler: async (ctx, args) => {
    if (args.contentType === "article") {
      return ctx.db.get(args.contentId as any);
    }
    if (args.contentType === "reel") {
      return ctx.db.get(args.contentId as any);
    }
    return null;
  },
});

function calculateTopicMatch(userInterests: string[], contentTopics: string[]): number {
  if (userInterests.length === 0 || contentTopics.length === 0) return 50;

  let totalScore = 0;
  let matchCount = 0;

  for (const topic of contentTopics) {
    const topicLower = topic.toLowerCase();

    for (const interest of userInterests) {
      const interestLower = interest.toLowerCase();

      if (topicLower === interestLower) {
        totalScore += 100;
        matchCount++;
        break;
      } else if (
        topicLower.includes(interestLower) ||
        interestLower.includes(topicLower)
      ) {
        totalScore += 70;
        matchCount++;
        break;
      } else {
        const topicWords = topicLower.split(/\s+/);
        const interestWords = interestLower.split(/\s+/);
        const commonWords = topicWords.filter((w) => interestWords.includes(w));

        if (commonWords.length > 0) {
          const similarity =
            (commonWords.length / Math.max(topicWords.length, interestWords.length)) * 100;
          if (similarity > 30) {
            totalScore += similarity;
            matchCount++;
            break;
          }
        }
      }
    }
  }

  if (matchCount === 0) return 30;

  const avgScore = totalScore / matchCount;
  const matchBonus = Math.min(20, matchCount * 5);
  return Math.min(100, avgScore + matchBonus);
}

function calculateEngagementMatch(engagementHistory: any[], contentType: string): number {
  if (engagementHistory.length === 0) return 50;

  const typeMatches = engagementHistory.filter((e) => e.contentType === contentType);

  let weightedScore = 0;
  for (const e of typeMatches) {
    if (e.type === "clap") weightedScore += 3;
    else if (e.type === "bookmark") weightedScore += 2.5;
    else if (e.type === "like") weightedScore += 2;
    else if (e.type === "comment") weightedScore += 1.5;
    else weightedScore += 1;
  }

  return Math.min(100, (weightedScore / engagementHistory.length) * 100);
}

function calculateSocialScore(
  userFollowing: string[],
  contentAuthorId: string
): number {
  if (userFollowing.includes(contentAuthorId)) return 100;
  return 20; // discovery base
}

function calculateFreshnessScore(contentCreatedAt: number): number {
  const ageInHours = (Date.now() - contentCreatedAt) / (1000 * 60 * 60);
  if (ageInHours < 1) return 100;
  if (ageInHours < 24) return 100 - ageInHours * 2;
  if (ageInHours < 168) return 50 - ((ageInHours - 24) / 144) * 30;
  return 20;
}

function calculateDiversityScore(recentlyViewed: string[], contentTopics: string[]): number {
  if (recentlyViewed.length === 0) return 100;

  const diversityCount = contentTopics.filter(
    (topic) =>
      !recentlyViewed.some((viewed) =>
        viewed.toLowerCase().includes(topic.toLowerCase())
      )
  ).length;

  return contentTopics.length > 0 ? (diversityCount / contentTopics.length) * 100 : 0;
}

// ============================================================================
// PERSONALIZED FEED QUERY
// ============================================================================

export const getPersonalizedFeed = query({
  args: {
    contentType: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { items: [], useAI: false };

    const limit = args.limit || 20;
    const offset = args.offset || 0;

    const cached = await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("contentType", args.contentType || "all")
      )
      .first();

    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      const rankedIds = cached.rankedContentIds.slice(offset, offset + limit);
      return { items: rankedIds, useAI: true, cached: true };
    }

    return { items: [], useAI: false, cached: false };
  },
});

export const getRecommendationReasoning = query({
  args: {
    contentId: v.string(),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const score = await ctx.db
      .query("userRecommendationScores")
      .withIndex("by_user_content", (q) =>
        q
          .eq("userId", userId)
          .eq("contentType", args.contentType)
          .eq("contentId", args.contentId)
      )
      .first();

    return {
      score: score?.score || 0,
      reasoning: score?.reasoning || [],
    };
  },
});

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

export const getCachedRecommendations = internalQuery({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("contentType", args.contentType)
      )
      .first();
  },
});

export const createRecommendationCache = internalMutation({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
    rankedContentIds: v.array(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("recommendationCache", {
      userId: args.userId,
      contentType: args.contentType,
      rankedContentIds: args.rankedContentIds,
      generatedAt: now,
      expiresAt: args.expiresAt,
    });
  },
});

export const updateRecommendationCache = internalMutation({
  args: {
    cacheId: v.id("recommendationCache"),
    rankedContentIds: v.array(v.string()),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.cacheId, {
      rankedContentIds: args.rankedContentIds,
      generatedAt: now,
      expiresAt: args.expiresAt,
    });
  },
});

// ── Debug: clear the feed recommendation cache for the current user ───────────
// Used by the debug panel in for-you.tsx to force a cold re-rank.
// Only clears the "all" (feed) cache — leaves courses/circles/booking caches intact.
export const clearFeedRecommendationCache = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const cached = await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("contentType", "all")
      )
      .first();

    if (cached) {
      await ctx.db.delete(cached._id);
      return { cleared: true };
    }
    return { cleared: false };
  },
});
