import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// AI-Enhanced unified feed with fallback to non-AI
export const listUnifiedFeedAI = query({
  args: { 
    limit: v.optional(v.number()),
    useAI: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const userId = await getAuthUserId(ctx);
    
    // If not authenticated or AI disabled, use regular feed
    if (!userId || args.useAI === false) {
      return await getRegularFeed(ctx, limit);
    }

    try {
      // Try to get AI-ranked feed
      const aiRankedFeed = await getAIRankedFeed(ctx, userId, limit);
      
      if (aiRankedFeed && aiRankedFeed.length > 0) {
        return {
          items: aiRankedFeed,
          useAI: true,
          source: "ai_recommendations"
        };
      }
    } catch (error) {
      console.error("AI feed error, falling back to regular feed:", error);
    }

    // Fallback to regular feed
    const regularFeed = await getRegularFeed(ctx, limit);
    return {
      items: regularFeed,
      useAI: false,
      source: "regular_feed"
    };
  },
});

// Get AI-ranked feed based on user preferences
async function getAIRankedFeed(ctx: any, userId: any, limit: number) {
  // Check for cached recommendations
  const cached = await ctx.db
    .query("recommendationCache")
    .withIndex("by_user_type", (q: any) =>
      q.eq("userId", userId).eq("contentType", "all")
    )
    .first();

  const now = Date.now();
  
  // If cache is valid, use it
  if (cached && cached.expiresAt > now && cached.rankedContentIds.length > 0) {
    const rankedIds = cached.rankedContentIds.slice(0, limit);
    return await fetchContentByIds(ctx, rankedIds);
  }

  // No valid cache, return null to trigger fallback
  // Background job will generate recommendations
  return null;
}

// Fetch content by IDs maintaining order
async function fetchContentByIds(ctx: any, contentIds: string[]) {
  const items = [];
  
  for (const id of contentIds) {
    const [contentType, contentId] = id.split(":");
    
    if (contentType === "article") {
      const content = await ctx.db.get(contentId as any);
      if (content) {
        const author = await ctx.db.get(content.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q: any) => q.eq(q.field("userId"), content.authorId))
          .first();

        items.push({
          ...content,
          contentType: "article" as const,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
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

        items.push({
          ...content,
          contentType: "reel" as const,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        });
      }
    }
  }
  
  return items;
}

// Regular feed without AI (fallback)
async function getRegularFeed(ctx: any, limit: number) {
  // Fetch articles
  const articles = await ctx.db
    .query("articles")
    .withIndex("by_status", (q: any) => q.eq("status", "PUBLISHED"))
    .order("desc")
    .take(limit);

  // Fetch reels
  const reels = await ctx.db
    .query("reels")
    .order("desc")
    .take(limit);

  // Get author info for articles
  const articlesWithAuthors = await Promise.all(
    articles.map(async (article: any) => {
      const author = await ctx.db.get(article.authorId);
      const profile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), article.authorId))
        .first();

      return {
        ...article,
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

  // Get author info for reels
  const reelsWithAuthors = await Promise.all(
    reels.map(async (reel: any) => {
      const author = await ctx.db.get(reel.authorId);
      const profile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), reel.authorId))
        .first();

      return {
        ...reel,
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

  // Combine and sort by creation date
  const unifiedContent = [...articlesWithAuthors, ...reelsWithAuthors];
  
  // Sort by creation date (most recent first) and limit results
  return unifiedContent
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

// Generate AI recommendations in background
export const generateFeedRecommendations = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      // Get user profile
      const userProfile = await ctx.runQuery(internal.aiRecommendations.buildUserProfile, {
        userId: args.userId,
      });

      if (!userProfile) {
        console.log("No user profile found for", args.userId);
        return { success: false, reason: "no_profile" };
      }

      // Get all published content
      const articles = await ctx.runQuery(api.articles.listFeed, { limit: 100 });
      const reels = await ctx.runQuery(api.reels.listReels, { limit: 100 });

      // Score each piece of content
      const scoredContent: Array<{ id: string; score: number; type: string }> = [];

      // Score articles
      for (const article of articles) {
        const contentId = `article:${article._id}`;
        
        // Check if we have analysis
        const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
          contentType: "article",
          contentId: article._id,
        });

        let score = 50; // Default score
        
        if (analysis) {
          // Calculate score based on user profile and content analysis
          const result = await ctx.runAction(api.aiRecommendations.calculateRecommendationScore, {
            userId: args.userId,
            contentType: "article",
            contentId: article._id,
          });
          score = result.score;
        } else {
          // Trigger analysis for this content
          await ctx.runAction(api.aiRecommendations.analyzeContent, {
            contentType: "article",
            contentId: article._id,
            contentData: {
              title: article.title,
              text: article.contentHtml?.substring(0, 2000),
              tags: article.tags,
            },
          });
        }

        scoredContent.push({
          id: contentId,
          score,
          type: "article",
        });
      }

      // Score reels
      for (const reel of reels) {
        const contentId = `reel:${reel._id}`;
        
        const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
          contentType: "reel",
          contentId: reel._id,
        });

        let score = 50;
        
        if (analysis) {
          const result = await ctx.runAction(api.aiRecommendations.calculateRecommendationScore, {
            userId: args.userId,
            contentType: "reel",
            contentId: reel._id,
          });
          score = result.score;
        } else {
          await ctx.runAction(api.aiRecommendations.analyzeContent, {
            contentType: "reel",
            contentId: reel._id,
            contentData: {
              caption: reel.caption,
              tags: reel.tags,
            },
          });
        }

        scoredContent.push({
          id: contentId,
          score,
          type: "reel",
        });
      }

      // Sort by score (highest first)
      scoredContent.sort((a, b) => b.score - a.score);

      // Apply content mix algorithm (60% articles, 40% reels)
      const rankedIds = applyContentMix(scoredContent);

      // Cache the recommendations
      const now = Date.now();
      const expiresAt = now + 6 * 60 * 60 * 1000; // 6 hours

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

      return { success: true, count: rankedIds.length };
    } catch (error) {
      console.error("Error generating feed recommendations:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Apply content mix algorithm (60% articles, 40% reels)
function applyContentMix(scoredContent: Array<{ id: string; score: number; type: string }>) {
  const articles = scoredContent.filter((c) => c.type === "article");
  const reels = scoredContent.filter((c) => c.type === "reel");

  const mixed: string[] = [];
  let articleIndex = 0;
  let reelIndex = 0;

  // Alternate with 60/40 ratio
  while (articleIndex < articles.length || reelIndex < reels.length) {
    // Add 3 articles
    for (let i = 0; i < 3 && articleIndex < articles.length; i++) {
      mixed.push(articles[articleIndex].id);
      articleIndex++;
    }

    // Add 2 reels
    for (let i = 0; i < 2 && reelIndex < reels.length; i++) {
      mixed.push(reels[reelIndex].id);
      reelIndex++;
    }
  }

  return mixed;
}
