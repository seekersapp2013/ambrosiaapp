import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// AI-Enhanced circle discovery with fallback
export const getPublicCirclesAI = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    accessType: v.optional(v.union(v.literal("FREE"), v.literal("PAID"))),
    searchTerm: v.optional(v.string()),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // If not authenticated or AI disabled or searching, use regular query
    if (!userId || args.useAI === false || args.searchTerm) {
      return await getRegularPublicCircles(ctx, args);
    }

    try {
      // Try to get AI-ranked circles
      const aiRankedCircles = await getAIRankedCircles(ctx, userId, args);
      
      if (aiRankedCircles && aiRankedCircles.length > 0) {
        return {
          circles: aiRankedCircles,
          useAI: true,
          source: "ai_recommendations"
        };
      }
    } catch (error) {
      console.error("AI circle recommendations error, falling back:", error);
    }

    // Fallback to regular circles
    const regularCircles = await getRegularPublicCircles(ctx, args);
    return {
      circles: regularCircles,
      useAI: false,
      source: "regular_query"
    };
  },
});

// Get AI-ranked circles
async function getAIRankedCircles(ctx: any, userId: any, args: any) {
  // Check for cached recommendations
  const cached = await ctx.db
    .query("recommendationCache")
    .withIndex("by_user_type", (q: any) =>
      q.eq("userId", userId).eq("contentType", "circles")
    )
    .first();

  const now = Date.now();
  
  // If cache is valid, use it
  if (cached && cached.expiresAt > now && cached.rankedContentIds.length > 0) {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    const rankedIds = cached.rankedContentIds.slice(offset, offset + limit);
    return await fetchCirclesByIds(ctx, rankedIds, args.accessType);
  }

  // No valid cache, return null to trigger fallback
  return null;
}

// Fetch circles by IDs maintaining order
async function fetchCirclesByIds(ctx: any, circleIds: string[], accessType?: "FREE" | "PAID") {
  const circles: any[] = [];
  
  for (const id of circleIds) {
    const circleId = id.replace("circle:", "");
    const circle = await ctx.db.get(circleId as any);
    
    if (circle && circle.isActive) {
      // Apply access type filter if specified
      if (accessType && circle.accessType !== accessType) {
        continue;
      }
      
      // Get creator info
      const creator = await ctx.db.get(circle.creatorId);
      const creatorProfile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), circle.creatorId))
        .first();

      circles.push({
        ...circle,
        creator: {
          id: creator?._id,
          name: creator?.name || creatorProfile?.name,
          username: creatorProfile?.username,
          avatar: creatorProfile?.avatar,
        },
      });
    }
  }
  
  return circles;
}

// Regular public circles without AI (fallback)
async function getRegularPublicCircles(ctx: any, args: any) {
  const limit = args.limit || 20;
  const offset = args.offset || 0;
  
  let query = ctx.db
    .query("circles")
    .withIndex("by_type", (q: any) => q.eq("type", "PUBLIC"))
    .filter((q: any) => q.eq(q.field("isActive"), true));

  // Apply access type filter
  if (args.accessType) {
    query = query.filter((q: any) => q.eq(q.field("accessType"), args.accessType));
  }

  let circles = await query
    .order("desc")
    .take(limit + offset);

  // FIX: Filter by approval status — only show approved or not-required circles
  // (isActive alone is not enough because admin approval also needs to be "APPROVED")
  circles = circles.filter((circle: any) =>
    circle.approvalStatus === "APPROVED" ||
    circle.approvalStatus === "NOT_REQUIRED" ||
    circle.approvalStatus === undefined // backward compat
  );

  // Apply search filter (in-memory because Convex doesn't support .toLowerCase() in filters)
  if (args.searchTerm) {
    const searchLower = args.searchTerm.toLowerCase();
    circles = circles.filter((circle: any) =>
      circle.name.toLowerCase().includes(searchLower) ||
      circle.description.toLowerCase().includes(searchLower) ||
      (circle.tags ?? []).some((tag: string) => tag.toLowerCase().includes(searchLower))
    );
  }

  // Paginate
  const paginatedCircles = circles.slice(offset, offset + limit);

  // Get creator info for each circle
  const circlesWithCreators = await Promise.all(
    paginatedCircles.map(async (circle: any) => {
      const creatorProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q: any) => q.eq("userId", circle.creatorId))
        .first();

      return {
        ...circle,
        creator: {
          id: circle.creatorId,
          name: creatorProfile?.name,
          username: creatorProfile?.username,
          avatar: creatorProfile?.avatar,
        },
      };
    })
  );

  return circlesWithCreators;
}


// ============================================================================
// GENERATE CIRCLE RECOMMENDATIONS
// ============================================================================

export const generateCircleRecommendations = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      console.log(`Generating circle recommendations for user: ${args.userId}`);
      
      // Get user profile
      const userProfile = await ctx.runQuery(internal.aiRecommendations.buildUserProfile, {
        userId: args.userId,
      });

      if (!userProfile) {
        return { success: false, reason: "no_profile" };
      }

      // Get all public circles
      const circlesResult = await ctx.runQuery(api.circles.getPublicCircles, {
        limit: 100,
        offset: 0,
      });
      
      const circles = circlesResult?.circles || circlesResult || [];

      // Score each circle
      const scoredCircles: Array<{ id: string; score: number; createdAt: number }> = [];

      for (const circle of circles) {
        const contentId = `circle:${circle._id}`;
        
        const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
          contentType: "circle",
          contentId: circle._id,
        });

        let score = 50;
        
        if (analysis) {
          const result = await ctx.runAction(api.aiRecommendations.calculateRecommendationScore, {
            userId: args.userId,
            contentType: "circle",
            contentId: circle._id,
            contentCreatedAt: circle._creationTime,
          });
          score = result.score;
          
          // Bonus for free circles (easier to join)
          if (circle.accessType === "FREE") {
            score += 5;
          }
        } else {
          // Trigger analysis
          await ctx.runAction(api.aiRecommendations.analyzeContent, {
            contentType: "circle",
            contentId: circle._id,
            contentData: {
              title: circle.name,
              description: circle.description,
            },
          });
        }

        scoredCircles.push({
          id: contentId,
          score,
          createdAt: circle._creationTime,
        });
      }

      // Sort by score
      scoredCircles.sort((a, b) => b.score - a.score);

      // Apply community-specific ranking
      const rankedIds = applyCommunityRanking(scoredCircles, userProfile);

      // Cache the recommendations
      const now = Date.now();
      const expiresAt = now + 6 * 60 * 60 * 1000; // 6 hours

      const existing = await ctx.runQuery(internal.aiRecommendations.getCachedRecommendations, {
        userId: args.userId,
        contentType: "circles",
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
          contentType: "circles",
          rankedContentIds: rankedIds,
          expiresAt,
        });
      }

      return { success: true, count: rankedIds.length };
    } catch (error) {
      console.error("Error generating circle recommendations:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Apply community-specific ranking
function applyCommunityRanking(
  scoredCircles: Array<{ id: string; score: number; createdAt: number }>,
  userProfile: any
): string[] {
  // Mix high-scoring circles with some diversity
  const topCircles = scoredCircles.slice(0, Math.floor(scoredCircles.length * 0.7));
  const diverseCircles = scoredCircles.slice(Math.floor(scoredCircles.length * 0.7));

  const ranked: string[] = [];

  // Interleave: 3 top circles, 1 diverse circle
  let topIdx = 0;
  let diverseIdx = 0;

  while (topIdx < topCircles.length || diverseIdx < diverseCircles.length) {
    // Add 3 top circles
    for (let i = 0; i < 3 && topIdx < topCircles.length; i++) {
      ranked.push(topCircles[topIdx].id);
      topIdx++;
    }

    // Add 1 diverse circle
    if (diverseIdx < diverseCircles.length) {
      ranked.push(diverseCircles[diverseIdx].id);
      diverseIdx++;
    }
  }

  return ranked;
}
