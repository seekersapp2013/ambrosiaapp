import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Cross-Tab Intelligence
 * 
 * Tracks user behavior across tabs and provides cross-recommendations
 * Example: User reads mental health articles → Recommend mental health courses/circles/therapists
 */

// Track user journey across tabs
export const trackUserJourney = internalMutation({
  args: {
    userId: v.id("users"),
    tab: v.string(), // "for-you" | "learn" | "community" | "booking"
    action: v.string(), // "view" | "engage" | "create"
    contentType: v.optional(v.string()),
    contentId: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Store journey event
    await ctx.db.insert("userJourneyEvents", {
      userId: args.userId,
      tab: args.tab,
      action: args.action,
      contentType: args.contentType,
      contentId: args.contentId,
      topics: args.topics || [],
      timestamp: now,
    });
    
    // Cleanup old events (keep last 30 days)
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const oldEvents = await ctx.db
      .query("userJourneyEvents")
      .withIndex("by_user_timestamp", q => 
        q.eq("userId", args.userId).lt("timestamp", thirtyDaysAgo)
      )
      .collect();
    
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
    }
  },
});

// Get cross-tab recommendations based on user journey
export const getCrossTabRecommendations = internalQuery({
  args: {
    userId: v.id("users"),
    currentTab: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    
    // Get recent journey events
    const recentEvents = await ctx.db
      .query("userJourneyEvents")
      .withIndex("by_user_timestamp", q => 
        q.eq("userId", args.userId).gt("timestamp", sevenDaysAgo)
      )
      .collect();
    
    // Analyze patterns
    const topicFrequency = new Map<string, number>();
    const tabActivity = new Map<string, number>();
    
    for (const event of recentEvents) {
      // Count topics
      for (const topic of event.topics) {
        topicFrequency.set(topic, (topicFrequency.get(topic) || 0) + 1);
      }
      
      // Count tab activity
      tabActivity.set(event.tab, (tabActivity.get(event.tab) || 0) + 1);
    }
    
    // Get top topics
    const topTopics = Array.from(topicFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
    
    // Generate cross-tab suggestions
    const suggestions: Array<{
      targetTab: string;
      reason: string;
      topics: string[];
    }> = [];
    
    // For You → Learn: If reading articles, suggest courses
    if (args.currentTab === "for-you" && topTopics.length > 0) {
      suggestions.push({
        targetTab: "learn",
        reason: `Learn more about ${topTopics[0]} with structured courses`,
        topics: topTopics,
      });
    }
    
    // For You → Community: If engaging with topics, suggest circles
    if (args.currentTab === "for-you" && topTopics.length > 0) {
      suggestions.push({
        targetTab: "community",
        reason: `Join communities discussing ${topTopics[0]}`,
        topics: topTopics,
      });
    }
    
    // Learn → Community: If taking courses, suggest related circles
    if (args.currentTab === "learn" && topTopics.length > 0) {
      suggestions.push({
        targetTab: "community",
        reason: `Connect with others learning about ${topTopics[0]}`,
        topics: topTopics,
      });
    }
    
    // Community → Learn: If in circles, suggest courses
    if (args.currentTab === "community" && topTopics.length > 0) {
      suggestions.push({
        targetTab: "learn",
        reason: `Deepen your knowledge of ${topTopics[0]}`,
        topics: topTopics,
      });
    }
    
    return {
      topTopics,
      tabActivity: Object.fromEntries(tabActivity),
      suggestions,
    };
  },
});

// Get contextual recommendations based on time and user state
export const getContextualRecommendations = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const currentHour = new Date(now).getUTCHours();
    const dayOfWeek = new Date(now).getUTCDay();
    
    // Get user's recent activity
    const recentEngagement = await ctx.db
      .query("engagement")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
    
    const recommendations: Array<{
      type: string;
      reason: string;
      priority: number;
    }> = [];
    
    // Morning (6-12): Educational content
    if (currentHour >= 6 && currentHour < 12) {
      recommendations.push({
        type: "educational",
        reason: "Morning is great for learning",
        priority: 80,
      });
    }
    
    // Afternoon (12-18): Mixed content
    if (currentHour >= 12 && currentHour < 18) {
      recommendations.push({
        type: "mixed",
        reason: "Afternoon energy for diverse content",
        priority: 70,
      });
    }
    
    // Evening (18-22): Lighter content
    if (currentHour >= 18 && currentHour < 22) {
      recommendations.push({
        type: "entertainment",
        reason: "Evening relaxation time",
        priority: 75,
      });
    }
    
    // Weekend (Saturday=6, Sunday=0): Longer content
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      recommendations.push({
        type: "in-depth",
        reason: "Weekend time for deeper exploration",
        priority: 85,
      });
    }
    
    // Low recent activity: Motivational content
    if (recentEngagement.length < 5) {
      recommendations.push({
        type: "motivational",
        reason: "Re-engage with inspiring content",
        priority: 90,
      });
    }
    
    // High recent activity: Challenging content
    if (recentEngagement.length > 15) {
      recommendations.push({
        type: "advanced",
        reason: "You're on a roll! Try advanced content",
        priority: 85,
      });
    }
    
    return recommendations.sort((a, b) => b.priority - a.priority);
  },
});

// Progressive profiling: Update user profile based on journey
export const updateProgressiveProfile = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    // Get journey events
    const events = await ctx.db
      .query("userJourneyEvents")
      .withIndex("by_user_timestamp", q => 
        q.eq("userId", args.userId).gt("timestamp", thirtyDaysAgo)
      )
      .collect();
    
    // Analyze user stage
    const weeksSinceJoin = (now - events[0]?.timestamp || now) / (7 * 24 * 60 * 60 * 1000);
    
    let userStage = "new";
    if (weeksSinceJoin > 24) userStage = "veteran"; // 6+ months
    else if (weeksSinceJoin > 8) userStage = "established"; // 2+ months
    else if (weeksSinceJoin > 2) userStage = "growing"; // 2+ weeks
    
    // Analyze engagement level
    const engagementCount = events.filter(e => e.action === "engage").length;
    let engagementLevel = "low";
    if (engagementCount > 50) engagementLevel = "high";
    else if (engagementCount > 20) engagementLevel = "medium";
    
    // Analyze content preferences
    const contentTypeCount = new Map<string, number>();
    for (const event of events) {
      if (event.contentType) {
        contentTypeCount.set(
          event.contentType,
          (contentTypeCount.get(event.contentType) || 0) + 1
        );
      }
    }
    
    const preferredContentTypes = Array.from(contentTypeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([type]) => type);
    
    // Store progressive profile
    const existing = await ctx.db
      .query("progressiveProfiles")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .first();
    
    const profileData = {
      userId: args.userId,
      userStage,
      engagementLevel,
      preferredContentTypes,
      weeksSinceJoin: Math.round(weeksSinceJoin),
      totalEvents: events.length,
      updatedAt: now,
    };
    
    if (existing) {
      await ctx.db.patch(existing._id, profileData);
    } else {
      await ctx.db.insert("progressiveProfiles", {
        ...profileData,
        createdAt: now,
      });
    }
    
    return profileData;
  },
});
