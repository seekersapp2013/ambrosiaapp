import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

/**
 * Content Analysis Triggers
 * 
 * Automatically trigger AI analysis when content is created or updated.
 * This ensures new content is immediately available for AI recommendations.
 */

// ============================================================================
// TRIGGER ARTICLE ANALYSIS
// ============================================================================

export const triggerArticleAnalysis = internalMutation({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    // Get the article
    const article = await ctx.db.get(args.articleId);
    if (!article) return;
    
    // Schedule analysis action (runs in background)
    await ctx.scheduler.runAfter(0, api.aiRecommendations.analyzeContent, {
      contentType: "article",
      contentId: args.articleId,
      contentData: {
        title: article.title,
        text: article.contentHtml?.substring(0, 2000),
        tags: article.tags,
      },
    });
    
    console.log(`Scheduled analysis for article: ${args.articleId}`);
  },
});

// ============================================================================
// TRIGGER REEL ANALYSIS
// ============================================================================

export const triggerReelAnalysis = internalMutation({
  args: {
    reelId: v.id("reels"),
  },
  handler: async (ctx, args) => {
    // Get the reel
    const reel = await ctx.db.get(args.reelId);
    if (!reel) return;
    
    // Schedule analysis action (runs in background)
    await ctx.scheduler.runAfter(0, api.aiRecommendations.analyzeContent, {
      contentType: "reel",
      contentId: args.reelId,
      contentData: {
        caption: reel.caption,
        tags: reel.tags,
      },
    });
    
    console.log(`Scheduled analysis for reel: ${args.reelId}`);
  },
});

// ============================================================================
// TRIGGER COURSE ANALYSIS
// ============================================================================

export const triggerCourseAnalysis = internalMutation({
  args: {
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    // Get the course
    const course = await ctx.db.get(args.courseId);
    if (!course) return;
    
    // Schedule analysis action (runs in background)
    await ctx.scheduler.runAfter(0, api.aiRecommendations.analyzeContent, {
      contentType: "course",
      contentId: args.courseId,
      contentData: {
        title: course.title,
        description: course.description,
        tags: course.tags,
      },
    });
    
    console.log(`Scheduled analysis for course: ${args.courseId}`);
  },
});

// ============================================================================
// TRIGGER CIRCLE ANALYSIS
// ============================================================================

export const triggerCircleAnalysis = internalMutation({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    // Get the circle
    const circle = await ctx.db.get(args.circleId);
    if (!circle) return;
    
    // Schedule analysis action (runs in background)
    await ctx.scheduler.runAfter(0, api.aiRecommendations.analyzeContent, {
      contentType: "circle",
      contentId: args.circleId,
      contentData: {
        title: circle.name,
        description: circle.description,
        tags: circle.tags,
      },
    });
    
    console.log(`Scheduled analysis for circle: ${args.circleId}`);
  },
});

// ============================================================================
// TRIGGER EVENT ANALYSIS
// ============================================================================

export const triggerEventAnalysis = internalMutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get the event
    const event = await ctx.db.get(args.eventId);
    if (!event) return;
    
    // Schedule analysis action (runs in background)
    await ctx.scheduler.runAfter(0, api.aiRecommendations.analyzeContent, {
      contentType: "event",
      contentId: args.eventId,
      contentData: {
        title: event.title,
        description: event.description,
        tags: event.tags,
      },
    });
    
    console.log(`Scheduled analysis for event: ${args.eventId}`);
  },
});

// ============================================================================
// TRIGGER BOOKING PROVIDER ANALYSIS
// ============================================================================

export const triggerBookingProviderAnalysis = internalMutation({
  args: {
    providerId: v.id("bookingSubscribers"),
  },
  handler: async (ctx, args) => {
    // Get the provider
    const provider = await ctx.db.get(args.providerId);
    if (!provider) return;
    
    // Schedule analysis action (runs in background)
    await ctx.scheduler.runAfter(0, api.aiRecommendations.analyzeContent, {
      contentType: "provider",
      contentId: args.providerId,
      contentData: {
        title: provider.jobTitle,
        description: provider.aboutUser,
        tags: [provider.specialization],
      },
    });
    
    console.log(`Scheduled analysis for provider: ${args.providerId}`);
  },
});
