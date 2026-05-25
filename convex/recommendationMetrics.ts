import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Recommendation Metrics
 * 
 * Track the effectiveness of AI recommendations:
 * - Click-through rates
 * - Engagement rates
 * - Time spent on recommended content
 * - Nova API usage
 */

// Track when a recommendation is shown to user
export const trackRecommendationShown = internalMutation({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    score: v.number(),
    position: v.number(), // Position in feed (1, 2, 3...)
    tab: v.string(), // Which tab it was shown in
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.insert("recommendationMetrics", {
      userId: args.userId,
      contentType: args.contentType,
      contentId: args.contentId,
      score: args.score,
      position: args.position,
      tab: args.tab,
      wasShown: true,
      wasClicked: false,
      wasEngaged: false,
      timeSpent: 0,
      shownAt: now,
      clickedAt: undefined,
      engagedAt: undefined,
    });
  },
});

// Track when user clicks on recommended content
export const trackRecommendationClick = internalMutation({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find the most recent "shown" metric for this content
    const metric = await ctx.db
      .query("recommendationMetrics")
      .withIndex("by_user_content", q =>
        q.eq("userId", args.userId)
         .eq("contentType", args.contentType)
         .eq("contentId", args.contentId)
      )
      .order("desc")
      .first();
    
    if (metric && !metric.wasClicked) {
      await ctx.db.patch(metric._id, {
        wasClicked: true,
        clickedAt: now,
      });
    }
  },
});

// Track when user engages with recommended content (like, comment, bookmark)
export const trackRecommendationEngagement = internalMutation({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    engagementType: v.string(), // "like" | "clap" | "bookmark" | "comment"
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Find the most recent metric for this content
    const metric = await ctx.db
      .query("recommendationMetrics")
      .withIndex("by_user_content", q =>
        q.eq("userId", args.userId)
         .eq("contentType", args.contentType)
         .eq("contentId", args.contentId)
      )
      .order("desc")
      .first();
    
    if (metric && !metric.wasEngaged) {
      await ctx.db.patch(metric._id, {
        wasEngaged: true,
        engagementType: args.engagementType,
        engagedAt: now,
      });
    }
  },
});

// Track time spent on recommended content
export const trackRecommendationTimeSpent = internalMutation({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    timeSpent: v.number(), // in seconds
  },
  handler: async (ctx, args) => {
    // Find the most recent metric for this content
    const metric = await ctx.db
      .query("recommendationMetrics")
      .withIndex("by_user_content", q =>
        q.eq("userId", args.userId)
         .eq("contentType", args.contentType)
         .eq("contentId", args.contentId)
      )
      .order("desc")
      .first();
    
    if (metric) {
      await ctx.db.patch(metric._id, {
        timeSpent: args.timeSpent,
      });
    }
  },
});

// Get recommendation performance metrics
export const getRecommendationPerformance = query({
  args: {
    tab: v.optional(v.string()),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const days = args.days || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    
    let query = ctx.db
      .query("recommendationMetrics")
      .withIndex("by_shown_at", q => q.gt("shownAt", since));
    
    const metrics = await query.collect();
    
    // Filter by tab if specified
    const filteredMetrics = args.tab 
      ? metrics.filter(m => m.tab === args.tab)
      : metrics;
    
    // Calculate metrics
    const totalShown = filteredMetrics.length;
    const totalClicked = filteredMetrics.filter(m => m.wasClicked).length;
    const totalEngaged = filteredMetrics.filter(m => m.wasEngaged).length;
    
    const clickThroughRate = totalShown > 0 ? (totalClicked / totalShown) * 100 : 0;
    const engagementRate = totalShown > 0 ? (totalEngaged / totalShown) * 100 : 0;
    
    const avgTimeSpent = filteredMetrics.length > 0
      ? filteredMetrics.reduce((sum, m) => sum + m.timeSpent, 0) / filteredMetrics.length
      : 0;
    
    // Score distribution
    const scoreRanges = {
      "90-100": 0,
      "80-89": 0,
      "70-79": 0,
      "60-69": 0,
      "50-59": 0,
      "below-50": 0,
    };
    
    for (const metric of filteredMetrics) {
      if (metric.score >= 90) scoreRanges["90-100"]++;
      else if (metric.score >= 80) scoreRanges["80-89"]++;
      else if (metric.score >= 70) scoreRanges["70-79"]++;
      else if (metric.score >= 60) scoreRanges["60-69"]++;
      else if (metric.score >= 50) scoreRanges["50-59"]++;
      else scoreRanges["below-50"]++;
    }
    
    // Position analysis (do higher positions get more clicks?)
    const positionPerformance = new Map<number, { shown: number; clicked: number }>();
    for (const metric of filteredMetrics) {
      const pos = metric.position;
      const current = positionPerformance.get(pos) || { shown: 0, clicked: 0 };
      current.shown++;
      if (metric.wasClicked) current.clicked++;
      positionPerformance.set(pos, current);
    }
    
    return {
      totalShown,
      totalClicked,
      totalEngaged,
      clickThroughRate: Math.round(clickThroughRate * 100) / 100,
      engagementRate: Math.round(engagementRate * 100) / 100,
      avgTimeSpent: Math.round(avgTimeSpent),
      scoreDistribution: scoreRanges,
      positionPerformance: Object.fromEntries(positionPerformance),
    };
  },
});

// Track Nova API usage
export const trackNovaAPIUsage = internalMutation({
  args: {
    endpoint: v.string(), // "analyze" | "recommend"
    contentType: v.string(),
    tokensUsed: v.optional(v.number()),
    latencyMs: v.number(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    await ctx.db.insert("novaAPIUsage", {
      endpoint: args.endpoint,
      contentType: args.contentType,
      tokensUsed: args.tokensUsed || 0,
      latencyMs: args.latencyMs,
      success: args.success,
      errorMessage: args.errorMessage,
      timestamp: now,
    });
  },
});

// Get Nova API usage statistics
export const getNovaAPIStats = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    
    const days = args.days || 7;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    
    const usage = await ctx.db
      .query("novaAPIUsage")
      .withIndex("by_timestamp", q => q.gt("timestamp", since))
      .collect();
    
    const totalCalls = usage.length;
    const successfulCalls = usage.filter(u => u.success).length;
    const failedCalls = totalCalls - successfulCalls;
    
    const totalTokens = usage.reduce((sum, u) => sum + u.tokensUsed, 0);
    const avgLatency = usage.length > 0
      ? usage.reduce((sum, u) => sum + u.latencyMs, 0) / usage.length
      : 0;
    
    // Calls by endpoint
    const byEndpoint = new Map<string, number>();
    for (const call of usage) {
      byEndpoint.set(call.endpoint, (byEndpoint.get(call.endpoint) || 0) + 1);
    }
    
    // Calls by content type
    const byContentType = new Map<string, number>();
    for (const call of usage) {
      byContentType.set(call.contentType, (byContentType.get(call.contentType) || 0) + 1);
    }
    
    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate: totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0,
      totalTokens,
      avgLatency: Math.round(avgLatency),
      byEndpoint: Object.fromEntries(byEndpoint),
      byContentType: Object.fromEntries(byContentType),
    };
  },
});
