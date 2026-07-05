import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * User Interest Tracking
 * 
 * Automatically infer and update user interests based on engagement patterns:
 * - Extract topics from content user engages with
 * - Increase strength for repeated engagement
 * - Decay strength over time for unused interests
 * - Track interest sources (explicit, inferred, engagement)
 */

// ============================================================================
// TRACK ENGAGEMENT AND UPDATE INTERESTS
// ============================================================================

export const trackEngagementAndUpdateInterests = internalMutation({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    engagementType: v.string(), // "like" | "clap" | "bookmark" | "read" | "watch" | "comment"
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // 1. Record the engagement
    await ctx.db.insert("engagement", {
      userId: args.userId,
      contentType: args.contentType,
      contentId: args.contentId,
      type: args.engagementType,
      createdAt: now,
    });
    
    // 2. Get content analysis to extract topics
    const analysis = await ctx.db
      .query("contentAnalysis")
      .withIndex("by_content", q =>
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .first();
    
    if (!analysis) {
      // Content not analyzed yet, skip interest update
      return;
    }
    
    // 3. Extract topics and health topics
    const topics = [
      ...analysis.aiAnalysis.topics,
      ...(analysis.aiAnalysis.healthTopics || []),
      ...(analysis.aiAnalysis.keywords || []),
    ];
    
    // 4. Calculate engagement strength based on type
    const engagementStrength = getEngagementStrength(args.engagementType);
    
    // 5. Update or create interests for each topic
    for (const topic of topics) {
      if (!topic || topic.trim().length === 0) continue;
      
      const topicNormalized = topic.toLowerCase().trim();
      
      // Check if interest already exists
      const existingInterest = await ctx.db
        .query("userInterests")
        .withIndex("by_user", q => q.eq("userId", args.userId))
        .filter(q => q.eq(q.field("interest"), topicNormalized))
        .first();
      
      if (existingInterest) {
        // Update existing interest
        const newStrength = Math.min(100, existingInterest.strength + engagementStrength);
        
        await ctx.db.patch(existingInterest._id, {
          strength: newStrength,
          source: "engagement", // Mark as engagement-based
          updatedAt: now,
        });
      } else {
        // Create new interest
        await ctx.db.insert("userInterests", {
          userId: args.userId,
          interest: topicNormalized,
          source: "inferred",
          strength: engagementStrength,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

// Get engagement strength based on type
function getEngagementStrength(engagementType: string): number {
  switch (engagementType) {
    case "clap": return 15; // Strongest signal
    case "bookmark": return 12;
    case "like": return 10;
    case "comment": return 8;
    case "read": return 5;
    case "watch": return 5;
    default: return 3;
  }
}

// ============================================================================
// TRACK FOLLOWING AND UPDATE INTERESTS
// ============================================================================

export const trackFollowAndUpdateInterests = internalMutation({
  args: {
    userId: v.id("users"),
    followingId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get the followed user's profile to extract their interests/tags
    const followedProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", q => q.eq("userId", args.followingId))
      .first();
    
    if (!followedProfile) return;
    
    // BUG FIX: was followedProfile.tags — the field is profile.interests
    const followedInterests = followedProfile.interests || [];
    
    // Update user's interests based on who they follow
    for (const interest of followedInterests) {
      if (!interest || interest.trim().length === 0) continue;
      
      const interestNormalized = interest.toLowerCase().trim();
      
      // Check if interest already exists
      const existingInterest = await ctx.db
        .query("userInterests")
        .withIndex("by_user", q => q.eq("userId", args.userId))
        .filter(q => q.eq(q.field("interest"), interestNormalized))
        .first();
      
      if (existingInterest) {
        // Increase strength slightly
        const newStrength = Math.min(100, existingInterest.strength + 5);
        
        await ctx.db.patch(existingInterest._id, {
          strength: newStrength,
          updatedAt: now,
        });
      } else {
        // Create new interest with lower initial strength
        await ctx.db.insert("userInterests", {
          userId: args.userId,
          interest: interestNormalized,
          source: "inferred",
          strength: 20, // Lower initial strength from following
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

// ============================================================================
// TRACK COURSE ENROLLMENT AND UPDATE INTERESTS
// ============================================================================

export const trackCourseEnrollmentAndUpdateInterests = internalMutation({
  args: {
    userId: v.id("users"),
    courseId: v.id("courses"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get course analysis
    const analysis = await ctx.db
      .query("contentAnalysis")
      .withIndex("by_content", q =>
        q.eq("contentType", "course").eq("contentId", args.courseId)
      )
      .first();
    
    if (!analysis) return;
    
    // Extract topics
    const topics = [
      ...analysis.aiAnalysis.topics,
      ...(analysis.aiAnalysis.healthTopics || []),
    ];
    
    // Update interests with high strength (enrolling shows strong interest)
    for (const topic of topics) {
      if (!topic || topic.trim().length === 0) continue;
      
      const topicNormalized = topic.toLowerCase().trim();
      
      const existingInterest = await ctx.db
        .query("userInterests")
        .withIndex("by_user", q => q.eq("userId", args.userId))
        .filter(q => q.eq(q.field("interest"), topicNormalized))
        .first();
      
      if (existingInterest) {
        const newStrength = Math.min(100, existingInterest.strength + 20);
        
        await ctx.db.patch(existingInterest._id, {
          strength: newStrength,
          source: "engagement",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("userInterests", {
          userId: args.userId,
          interest: topicNormalized,
          source: "inferred",
          strength: 30, // High initial strength from enrollment
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

// ============================================================================
// TRACK CIRCLE JOIN AND UPDATE INTERESTS
// ============================================================================

export const trackCircleJoinAndUpdateInterests = internalMutation({
  args: {
    userId: v.id("users"),
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get circle analysis
    const analysis = await ctx.db
      .query("contentAnalysis")
      .withIndex("by_content", q =>
        q.eq("contentType", "circle").eq("contentId", args.circleId)
      )
      .first();
    
    if (!analysis) return;
    
    // Extract topics
    const topics = [
      ...analysis.aiAnalysis.topics,
      ...(analysis.aiAnalysis.healthTopics || []),
    ];
    
    // Update interests with high strength (joining shows strong interest)
    for (const topic of topics) {
      if (!topic || topic.trim().length === 0) continue;
      
      const topicNormalized = topic.toLowerCase().trim();
      
      const existingInterest = await ctx.db
        .query("userInterests")
        .withIndex("by_user", q => q.eq("userId", args.userId))
        .filter(q => q.eq(q.field("interest"), topicNormalized))
        .first();
      
      if (existingInterest) {
        const newStrength = Math.min(100, existingInterest.strength + 20);
        
        await ctx.db.patch(existingInterest._id, {
          strength: newStrength,
          source: "engagement",
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("userInterests", {
          userId: args.userId,
          interest: topicNormalized,
          source: "inferred",
          strength: 30, // High initial strength from joining
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});

// ============================================================================
// DECAY UNUSED INTERESTS
// ============================================================================

export const decayUnusedInterests = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    // Get all user interests
    const interests = await ctx.db
      .query("userInterests")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();
    
    for (const interest of interests) {
      // Skip explicit interests (user manually added)
      if (interest.source === "explicit") continue;
      
      // If not updated in 30 days, decay strength
      if (interest.updatedAt && interest.updatedAt < thirtyDaysAgo) {
        const newStrength = Math.max(0, interest.strength - 10);
        
        if (newStrength === 0) {
          // Remove interest if strength reaches 0
          await ctx.db.delete(interest._id);
        } else {
          await ctx.db.patch(interest._id, {
            strength: newStrength,
            updatedAt: now,
          });
        }
      }
    }
  },
});

// ============================================================================
// GET USER INTERESTS WITH STRENGTH
// ============================================================================

export const getUserInterestsWithStrength = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const interests = await ctx.db
      .query("userInterests")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .collect();
    
    // Sort by strength (highest first)
    return interests.sort((a, b) => b.strength - a.strength);
  },
});

// ============================================================================
// ADD EXPLICIT INTEREST
// ============================================================================

export const addExplicitInterest = internalMutation({
  args: {
    userId: v.id("users"),
    interest: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const interestNormalized = args.interest.toLowerCase().trim();
    
    // Check if interest already exists
    const existingInterest = await ctx.db
      .query("userInterests")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.eq(q.field("interest"), interestNormalized))
      .first();
    
    if (existingInterest) {
      // Update to explicit and max strength
      await ctx.db.patch(existingInterest._id, {
        source: "explicit",
        strength: 100,
        updatedAt: now,
      });
    } else {
      // Create new explicit interest
      await ctx.db.insert("userInterests", {
        userId: args.userId,
        interest: interestNormalized,
        source: "explicit",
        strength: 100,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});
