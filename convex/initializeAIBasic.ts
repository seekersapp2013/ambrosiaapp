import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * AI Initialization with Real Nova API
 * 
 * This uses the actual Nova API to analyze content and generate recommendations
 * Requires VITE_NOVA_API_KEY in environment variables
 */

export const initializeBasicAI = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("Not authenticated");
    }

    console.log("🚀 Starting AI Initialization with Nova API for user:", userId);
    
    // Trigger the full AI initialization action
    await ctx.scheduler.runAfter(0, internal.initializeAIBasic.runFullInitialization, {
      userId: userId,
    });
    
    return {
      success: true,
      message: "AI initialization started. This will take a few moments...",
    };
  },
});

// Internal action to run the full initialization
export const runFullInitialization = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log("🔄 Running full AI initialization...");
    
    let articlesAnalyzed = 0;
    let reelsAnalyzed = 0;
    
    // Get all published articles
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .take(50);
    
    // Schedule analysis for each article
    for (const article of articles) {
      const existing = await ctx.db
        .query("contentAnalysis")
        .withIndex("by_content", (q) =>
          q.eq("contentType", "article").eq("contentId", article._id)
        )
        .first();
      
      if (!existing) {
        // Schedule the analysis action
        await ctx.scheduler.runAfter(0, internal.initializeAIBasic.analyzeArticle, {
          articleId: article._id,
        });
        articlesAnalyzed++;
      }
    }
    
    // Get all reels
    const reels = await ctx.db
      .query("reels")
      .take(50);
    
    // Schedule analysis for each reel
    for (const reel of reels) {
      const existing = await ctx.db
        .query("contentAnalysis")
        .withIndex("by_content", (q) =>
          q.eq("contentType", "reel").eq("contentId", reel._id)
        )
        .first();
      
      if (!existing) {
        await ctx.scheduler.runAfter(0, internal.initializeAIBasic.analyzeReel, {
          reelId: reel._id,
        });
        reelsAnalyzed++;
      }
    }
    
    // Schedule recommendation generation (wait 30 seconds for analysis to complete)
    await ctx.scheduler.runAfter(30000, internal.initializeAIBasic.generateUserRecommendations, {
      userId: args.userId,
    });
    
    console.log(`✅ Scheduled analysis for ${articlesAnalyzed} articles and ${reelsAnalyzed} reels`);
    console.log(`⏰ Recommendations will be generated in 30 seconds`);
  },
});

// Analyze a single article
export const analyzeArticle = internalMutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) return;
    
    // Schedule the action to call Nova API
    await ctx.scheduler.runAfter(0, api.aiRecommendations.analyzeContent, {
      contentType: "article",
      contentId: article._id,
      contentData: {
        title: article.title,
        text: article.contentHtml?.substring(0, 2000),
        tags: article.tags,
      },
    });
  },
});

// Analyze a single reel
export const analyzeReel = internalMutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const reel = await ctx.db.get(args.reelId);
    if (!reel) return;
    
    await ctx.scheduler.runAfter(0, api.aiRecommendations.analyzeContent, {
      contentType: "reel",
      contentId: reel._id,
      contentData: {
        caption: reel.caption,
        tags: reel.tags,
      },
    });
  },
});

// Generate recommendations for user
export const generateUserRecommendations = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log("🎯 Generating all recommendations for user:", args.userId);
    
    // Schedule recommendation generation for all tabs
    // For You tab
    await ctx.scheduler.runAfter(0, api.feedAI.generateFeedRecommendations, {
      userId: args.userId,
    });
    
    // Learn tab
    await ctx.scheduler.runAfter(1000, api.coursesAI.generateCourseRecommendations, {
      userId: args.userId,
    });
    
    // Community tab
    await ctx.scheduler.runAfter(2000, api.circlesAI.generateCircleRecommendations, {
      userId: args.userId,
    });
    
    console.log("✅ Scheduled all recommendation generation jobs");
  },
});

/**
 * Clear all AI data (for testing)
 */
export const clearAIData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("Not authenticated");
    }

    console.log("🗑️ Clearing AI data...");
    
    // Clear content analysis
    const analyses = await ctx.db.query("contentAnalysis").collect();
    for (const analysis of analyses) {
      await ctx.db.delete(analysis._id);
    }
    
    // Clear recommendation scores
    const scores = await ctx.db.query("userRecommendationScores").collect();
    for (const score of scores) {
      await ctx.db.delete(score._id);
    }
    
    // Clear recommendation cache
    const caches = await ctx.db.query("recommendationCache").collect();
    for (const cache of caches) {
      await ctx.db.delete(cache._id);
    }
    
    console.log("✅ AI data cleared!");
    
    return {
      success: true,
      analysesDeleted: analyses.length,
      scoresDeleted: scores.length,
      cachesDeleted: caches.length,
    };
  },
});

/**
 * Check AI system status
 */
export const checkAIStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Count content analyses
    const analyses = await ctx.db.query("contentAnalysis").collect();
    const articleAnalyses = analyses.filter((a) => a.contentType === "article");
    const reelAnalyses = analyses.filter((a) => a.contentType === "reel");
    
    // Check user's recommendation cache
    const cache = await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("contentType", "all")
      )
      .first();
    
    const now = Date.now();
    const cacheValid = cache && cache.expiresAt > now;
    
    return {
      totalAnalyses: analyses.length,
      articleAnalyses: articleAnalyses.length,
      reelAnalyses: reelAnalyses.length,
      hasRecommendationCache: !!cache,
      cacheValid,
      cacheSize: cache?.rankedContentIds.length || 0,
      cacheExpiresIn: cache ? Math.max(0, cache.expiresAt - now) : 0,
      aiActive: cacheValid && cache.rankedContentIds.length > 0,
    };
  },
});
