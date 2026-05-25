import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Auto-initialize AI for a user if they don't have recommendations yet
 * This runs automatically when a user logs in
 */
export const autoInitializeForUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      return { initialized: false, reason: "not_authenticated" };
    }

    // Check if user already has AI recommendations
    const existingCache = await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("contentType", "all")
      )
      .first();

    const now = Date.now();
    const cacheValid = existingCache && existingCache.expiresAt > now;

    // If cache is valid, no need to initialize
    if (cacheValid) {
      return { 
        initialized: false, 
        reason: "already_initialized",
        cacheExpiresIn: existingCache.expiresAt - now
      };
    }

    // Schedule AI initialization for this user
    await ctx.scheduler.runAfter(0, internal.autoInitializeAI.runAutoInitialization, {
      userId: userId,
    });

    return { 
      initialized: true, 
      message: "AI initialization started in background" 
    };
  },
});

/**
 * Internal mutation to run the auto-initialization
 * This is called by the scheduler
 */
export const runAutoInitialization = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    console.log("🤖 Auto-initializing AI for user:", args.userId);
    
    // Check if content has been analyzed
    const analyses = await ctx.db.query("contentAnalysis").collect();
    
    if (analyses.length === 0) {
      console.log("⚠️ No content analyzed yet, scheduling content analysis first");
      
      // Schedule content analysis
      await ctx.scheduler.runAfter(0, internal.scheduledJobs.batchAnalyzeContent);
      
      // Schedule recommendation generation after analysis completes
      await ctx.scheduler.runAfter(60000, internal.autoInitializeAI.generateAllRecommendationsForUser, {
        userId: args.userId,
      });
    } else {
      // Content already analyzed, just generate recommendations
      await ctx.scheduler.runAfter(0, internal.autoInitializeAI.generateAllRecommendationsForUser, {
        userId: args.userId,
      });
    }
  },
});

/**
 * Generate all recommendations for a user
 */
export const generateAllRecommendationsForUser = internalMutation({
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
    
    console.log("✅ Scheduled all recommendation generation for user:", args.userId);
  },
});

/**
 * Check if AI is initialized for current user
 */
export const checkAIInitialized = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      return { initialized: false, reason: "not_authenticated" };
    }

    // Check all three caches
    const forYouCache = await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("contentType", "all")
      )
      .first();

    const learnCache = await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("contentType", "courses_all")
      )
      .first();

    const communityCache = await ctx.db
      .query("recommendationCache")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", userId).eq("contentType", "circles")
      )
      .first();

    const now = Date.now();
    
    const forYouValid = forYouCache && forYouCache.expiresAt > now;
    const learnValid = learnCache && learnCache.expiresAt > now;
    const communityValid = communityCache && communityCache.expiresAt > now;

    return {
      initialized: forYouValid && learnValid && communityValid,
      forYou: {
        initialized: forYouValid,
        cacheSize: forYouCache?.rankedContentIds.length || 0,
        expiresIn: forYouCache ? Math.max(0, forYouCache.expiresAt - now) : 0,
      },
      learn: {
        initialized: learnValid,
        cacheSize: learnCache?.rankedContentIds.length || 0,
        expiresIn: learnCache ? Math.max(0, learnCache.expiresAt - now) : 0,
      },
      community: {
        initialized: communityValid,
        cacheSize: communityCache?.rankedContentIds.length || 0,
        expiresIn: communityCache ? Math.max(0, communityCache.expiresAt - now) : 0,
      },
    };
  },
});
