import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// CONTENT ANALYSIS WITH NOVA AI
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
      const apiKey = process.env.VITE_NOVA_API_KEY;
      
      if (!apiKey) {
        console.warn("Nova API key not configured, skipping AI analysis");
        return null;
      }

      const prompt = buildAnalysisPrompt(args.contentType, args.contentData);
      
      const response = await fetch("https://api.nova.amazon.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
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
        console.error("Nova API error:", response.statusText);
        
        // Track failed API call
        await ctx.runMutation(internal.recommendationMetrics.trackNovaAPIUsage, {
          endpoint: "analyze",
          contentType: args.contentType,
          latencyMs,
          success: false,
          errorMessage: response.statusText,
        });
        
        return null;
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        return null;
      }

      const analysis = parseNovaResponse(aiResponse);
      
      // Track successful API call
      await ctx.runMutation(internal.recommendationMetrics.trackNovaAPIUsage, {
        endpoint: "analyze",
        contentType: args.contentType,
        tokensUsed: data.usage?.total_tokens || 0,
        latencyMs,
        success: true,
      });
      
      // Store the analysis
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
      
      // Track failed API call
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

    // Check if analysis already exists
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
// HELPER FUNCTIONS
// ============================================================================

function buildAnalysisPrompt(contentType: string, data: any): string {
  switch (contentType) {
    case "article":
      return `Analyze this health article and provide a structured analysis in JSON format:
Title: ${data.title || ""}
Content: ${data.text?.substring(0, 2000) || ""}
Tags: ${data.tags?.join(", ") || ""}

Provide analysis in this exact JSON format:
{
  "summary": "Brief 2-sentence summary",
  "topics": ["topic1", "topic2", "topic3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "sentiment": "informative|empathetic|urgent|motivational",
  "category": "education|wellness|medical|lifestyle",
  "targetAudience": ["patients", "professionals", "general"],
  "difficulty": "beginner|intermediate|advanced",
  "healthTopics": ["specific health topics"]
}`;

    case "reel":
      return `Analyze this health video reel and provide a structured analysis in JSON format:
Caption: ${data.caption || ""}
Tags: ${data.tags?.join(", ") || ""}

Provide analysis in this exact JSON format:
{
  "summary": "Brief description of the reel",
  "topics": ["topic1", "topic2"],
  "keywords": ["keyword1", "keyword2"],
  "sentiment": "educational|motivational|entertainment|inspirational",
  "category": "tutorial|story|tips|awareness",
  "targetAudience": ["general", "patients", "fitness"],
  "healthTopics": ["specific health topics"]
}`;

    case "course":
      return `Analyze this health course and provide a structured analysis in JSON format:
Title: ${data.title || ""}
Description: ${data.description || ""}

Provide analysis in this exact JSON format:
{
  "summary": "Brief course overview",
  "topics": ["topic1", "topic2", "topic3"],
  "keywords": ["keyword1", "keyword2"],
  "sentiment": "educational|professional",
  "category": "certification|skill-building|awareness",
  "targetAudience": ["students", "professionals", "patients"],
  "difficulty": "beginner|intermediate|advanced",
  "healthTopics": ["specific specializations"]
}`;

    case "circle":
      return `Analyze this community circle and provide a structured analysis in JSON format:
Name: ${data.title || ""}
Description: ${data.description || ""}

Provide analysis in this exact JSON format:
{
  "summary": "Brief circle description",
  "topics": ["topic1", "topic2"],
  "keywords": ["keyword1", "keyword2"],
  "sentiment": "supportive|educational|social|professional",
  "category": "support|learning|networking|discussion",
  "targetAudience": ["patients", "caregivers", "professionals"],
  "healthTopics": ["specific health focus areas"]
}`;

    default:
      return `Analyze this health content: ${JSON.stringify(data)}`;
  }
}

function parseNovaResponse(response: string): any {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback: create basic analysis
    return {
      summary: response.substring(0, 200),
      topics: [],
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
      topics: [],
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
// ============================================================================

export const buildUserProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get user profile for tags
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    // Get user interests
    const interests = await ctx.db
      .query("userInterests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Get engagement history (likes, claps, bookmarks)
    const engagement = await ctx.db
      .query("engagement")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);

    // Get following
    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    // Get course enrollments
    const courseProgress = await ctx.db
      .query("courseProgress")
      .withIndex("by_user_course", (q) => q.eq("userId", args.userId))
      .collect();

    // Get circle memberships
    const circleMembers = await ctx.db
      .query("circleMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return {
      userId: args.userId,
      interests: interests.map((i) => i.interest),
      tags: profile?.tags || [],
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
// SCORING ENGINE
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
      // Get user profile
      const userProfile = await ctx.runQuery(internal.aiRecommendations.buildUserProfile, {
        userId: args.userId,
      });

      if (!userProfile) {
        return { score: 50, reasoning: ["Default score - no user profile"] };
      }

      // Get content analysis
      const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
        contentType: args.contentType,
        contentId: args.contentId,
      });

      if (!analysis) {
        return { score: 50, reasoning: ["Default score - no content analysis"] };
      }

      let score = 0;
      const reasoning: string[] = [];

      // 1. Topic Match (40 points)
      const topicScore = calculateTopicMatch(
        [...userProfile.interests, ...userProfile.tags],
        [...analysis.aiAnalysis.topics, ...(analysis.aiAnalysis.healthTopics || [])]
      );
      score += topicScore * 0.4;
      if (topicScore > 70) {
        reasoning.push(`Strong topic match (${Math.round(topicScore)}%)`);
      } else if (topicScore > 50) {
        reasoning.push(`Good topic match`);
      }

      // 2. Social Signal (20 points)
      const socialScore = calculateSocialScore(
        userProfile.following,
        analysis.contentType === "article" || analysis.contentType === "reel" 
          ? await getContentAuthorId(ctx, analysis.contentType, analysis.contentId)
          : "",
        []
      );
      score += socialScore * 0.2;
      if (socialScore > 80) {
        reasoning.push(`From someone you follow`);
      } else if (socialScore > 50) {
        reasoning.push(`From your network`);
      }

      // 3. Engagement Pattern (20 points)
      const engagementScore = calculateEngagementMatch(
        userProfile.engagementHistory,
        args.contentType
      );
      score += engagementScore * 0.2;
      if (engagementScore > 60) {
        reasoning.push(`Matches your engagement patterns`);
      }

      // 4. Freshness (10 points)
      const freshnessScore = args.contentCreatedAt 
        ? calculateFreshnessScore(args.contentCreatedAt)
        : 50;
      score += freshnessScore * 0.1;
      if (freshnessScore > 80) {
        reasoning.push(`Fresh content`);
      }

      // 5. Diversity (10 points)
      const recentTopics = userProfile.engagementHistory
        .slice(0, 10)
        .map(e => e.contentType);
      const diversityScore = calculateDiversityScore(
        recentTopics,
        analysis.aiAnalysis.topics
      );
      score += diversityScore * 0.1;
      if (diversityScore > 70) {
        reasoning.push(`Exploring new topics`);
      }

      // Bonus: Target audience match
      if (analysis.aiAnalysis.targetAudience.some((a: string) =>
        userProfile.interests.some((i: string) => i.toLowerCase().includes(a.toLowerCase()))
      )) {
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

// Helper to get content author ID
async function getContentAuthorId(ctx: any, contentType: string, contentId: string): Promise<string> {
  try {
    if (contentType === "article") {
      const articles = await ctx.runQuery(api.articles.listFeed, { limit: 100 });
      const article = articles.find((a: any) => a._id === contentId);
      return article?.authorId || "";
    } else if (contentType === "reel") {
      const reels = await ctx.runQuery(api.reels.listReels, { limit: 100 });
      const reel = reels.find((r: any) => r._id === contentId);
      return reel?.authorId || "";
    }
  } catch (error) {
    console.error("Error getting content author:", error);
  }
  return "";
}

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

function calculateTopicMatch(userInterests: string[], contentTopics: string[]): number {
  if (userInterests.length === 0 || contentTopics.length === 0) return 50;

  let totalScore = 0;
  let matchCount = 0;

  for (const topic of contentTopics) {
    const topicLower = topic.toLowerCase();
    
    for (const interest of userInterests) {
      const interestLower = interest.toLowerCase();
      
      // Exact match
      if (topicLower === interestLower) {
        totalScore += 100;
        matchCount++;
        break;
      }
      // Partial match (contains)
      else if (topicLower.includes(interestLower) || interestLower.includes(topicLower)) {
        totalScore += 70;
        matchCount++;
        break;
      }
      // Word overlap (semantic similarity approximation)
      else {
        const topicWords = topicLower.split(/\s+/);
        const interestWords = interestLower.split(/\s+/);
        const commonWords = topicWords.filter(w => interestWords.includes(w));
        
        if (commonWords.length > 0) {
          const similarity = (commonWords.length / Math.max(topicWords.length, interestWords.length)) * 100;
          if (similarity > 30) {
            totalScore += similarity;
            matchCount++;
            break;
          }
        }
      }
    }
  }

  // Calculate average score with bonus for multiple matches
  if (matchCount === 0) return 30; // Small base score
  
  const avgScore = totalScore / matchCount;
  const matchBonus = Math.min(20, matchCount * 5); // Bonus for multiple matches
  
  return Math.min(100, avgScore + matchBonus);
}

function calculateEngagementMatch(
  engagementHistory: any[],
  contentType: string
): number {
  if (engagementHistory.length === 0) return 50;

  const typeMatches = engagementHistory.filter((e) => e.contentType === contentType);
  const matchRatio = typeMatches.length / engagementHistory.length;
  
  // Weight by engagement type (claps and bookmarks are stronger signals)
  let weightedScore = 0;
  for (const engagement of typeMatches) {
    if (engagement.type === "clap") weightedScore += 3;
    else if (engagement.type === "bookmark") weightedScore += 2.5;
    else if (engagement.type === "like") weightedScore += 2;
    else if (engagement.type === "comment") weightedScore += 1.5;
    else weightedScore += 1;
  }
  
  const normalizedScore = (weightedScore / engagementHistory.length) * 100;
  
  return Math.min(100, normalizedScore);
}

function calculateSocialScore(
  userFollowing: string[],
  contentAuthorId: string,
  mutualConnections: string[] = []
): number {
  let score = 0;
  
  // Following the author
  if (userFollowing.includes(contentAuthorId)) {
    score += 100;
  }
  // Mutual connections
  else if (mutualConnections.includes(contentAuthorId)) {
    score += 75;
  }
  // No connection
  else {
    score += 20; // Small base score for discovery
  }
  
  return Math.min(100, score);
}

function calculateFreshnessScore(contentCreatedAt: number): number {
  const now = Date.now();
  const ageInHours = (now - contentCreatedAt) / (1000 * 60 * 60);
  
  // Decay curve: 100% at 0 hours, 50% at 24 hours, 20% at 7 days
  if (ageInHours < 1) return 100;
  if (ageInHours < 24) return 100 - (ageInHours * 2);
  if (ageInHours < 168) return 50 - ((ageInHours - 24) / 144 * 30); // 7 days
  return 20;
}

function calculateDiversityScore(
  recentlyViewed: string[],
  contentTopics: string[]
): number {
  if (recentlyViewed.length === 0) return 100; // No history, full diversity
  
  // Check if content topics are different from recently viewed
  let diversityCount = 0;
  
  for (const topic of contentTopics) {
    const isNew = !recentlyViewed.some(viewed => 
      viewed.toLowerCase().includes(topic.toLowerCase())
    );
    if (isNew) diversityCount++;
  }
  
  const diversityRatio = contentTopics.length > 0 
    ? diversityCount / contentTopics.length 
    : 0;
  
  return diversityRatio * 100;
}

// ============================================================================
// PERSONALIZED FEED QUERIES
// ============================================================================

export const getPersonalizedFeed = query({
  args: {
    contentType: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      return { items: [], useAI: false };
    }

    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Check if we have cached recommendations
    const cached = await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("contentType", args.contentType || "all")
      )
      .first();

    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      // Use cached recommendations
      const rankedIds = cached.rankedContentIds.slice(offset, offset + limit);
      return { items: rankedIds, useAI: true, cached: true };
    }

    // Generate fresh recommendations (will be done in background)
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
