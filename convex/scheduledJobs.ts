import { internalMutation, internalQuery, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// ============================================================================
// BATCH CONTENT ANALYSIS
// ============================================================================

export const batchAnalyzeContent = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting batch content analysis...");
    
    try {
      const now = Date.now();
      let totalAnalyzed = 0;
      
      // Get content that needs analysis (new or expired)
      const contentToAnalyze = await ctx.runQuery(internal.scheduledJobs.getContentNeedingAnalysis, {
        limit: 50,
      });
      
      console.log(`Found ${contentToAnalyze.length} items needing analysis`);
      
      // Analyze each piece of content
      for (const item of contentToAnalyze) {
        try {
          await ctx.runAction(api.aiRecommendations.analyzeContent, {
            contentType: item.contentType,
            contentId: item.contentId,
            contentData: item.contentData,
          });
          totalAnalyzed++;
          console.log(`  ✓ Analyzed ${item.contentType}: ${item.contentId}`);
        } catch (error) {
          console.error(`  ✗ Failed to analyze ${item.contentType} ${item.contentId}:`, error);
        }
      }
      
      console.log(`✅ Batch analysis complete: ${totalAnalyzed}/${contentToAnalyze.length} items`);
      
      return { success: true, analyzed: totalAnalyzed };
    } catch (error) {
      console.error("❌ Batch analysis failed:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const getContentNeedingAnalysis = internalQuery({
  args: { limit: v.number() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const contentToAnalyze: Array<{
      contentType: string;
      contentId: string;
      contentData: any;
    }> = [];
    
    // Get all existing analyses
    const existingAnalyses = await ctx.db.query("contentAnalysis").collect();
    const analyzedMap = new Map(
      existingAnalyses.map(a => [`${a.contentType}:${a.contentId}`, a])
    );
    
    // Check articles
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status", q => q.eq("status", "PUBLISHED"))
      .take(100);
    
    for (const article of articles) {
      const key = `article:${article._id}`;
      const existing = analyzedMap.get(key);
      
      // Needs analysis if: not analyzed OR expired
      if (!existing || existing.expiresAt < now) {
        contentToAnalyze.push({
          contentType: "article",
          contentId: article._id,
          contentData: {
            title: article.title,
            text: article.contentHtml?.substring(0, 2000),
            tags: article.tags,
          },
        });
        
        if (contentToAnalyze.length >= args.limit) break;
      }
    }
    
    // Check reels (if still under limit)
    if (contentToAnalyze.length < args.limit) {
      const reels = await ctx.db
        .query("reels")
        .order("desc")
        .take(100);
      
      for (const reel of reels) {
        const key = `reel:${reel._id}`;
        const existing = analyzedMap.get(key);
        
        if (!existing || existing.expiresAt < now) {
          contentToAnalyze.push({
            contentType: "reel",
            contentId: reel._id,
            contentData: {
              caption: reel.caption,
              tags: reel.tags,
            },
          });
          
          if (contentToAnalyze.length >= args.limit) break;
        }
      }
    }
    
    // Check courses (if still under limit)
    if (contentToAnalyze.length < args.limit) {
      const courses = await ctx.db
        .query("courses")
        .withIndex("by_published", q => q.eq("isPublished", true))
        .take(50);
      
      for (const course of courses) {
        const key = `course:${course._id}`;
        const existing = analyzedMap.get(key);
        
        if (!existing || existing.expiresAt < now) {
          contentToAnalyze.push({
            contentType: "course",
            contentId: course._id,
            contentData: {
              title: course.title,
              description: course.description,
            },
          });
          
          if (contentToAnalyze.length >= args.limit) break;
        }
      }
    }
    
    // Check circles (if still under limit)
    if (contentToAnalyze.length < args.limit) {
      const circles = await ctx.db
        .query("circles")
        .withIndex("by_type", q => q.eq("type", "PUBLIC"))
        .filter(q => q.eq(q.field("isActive"), true))
        .take(50);
      
      for (const circle of circles) {
        const key = `circle:${circle._id}`;
        const existing = analyzedMap.get(key);
        
        if (!existing || existing.expiresAt < now) {
          contentToAnalyze.push({
            contentType: "circle",
            contentId: circle._id,
            contentData: {
              title: circle.name,
              description: circle.description,
            },
          });
          
          if (contentToAnalyze.length >= args.limit) break;
        }
      }
    }
    
    return contentToAnalyze;
  },
});

// ============================================================================
// GENERATE RECOMMENDATIONS FOR ALL USERS
// ============================================================================

export const generateAllUserRecommendations = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Starting recommendation generation for all users...");
    
    try {
      const users = await ctx.runQuery(internal.scheduledJobs.getAllActiveUsers);
      let successCount = 0;
      let failCount = 0;
      
      console.log(`Found ${users.length} active users`);
      
      for (const user of users) {
        try {
          // Generate For You feed recommendations
          await ctx.runAction(api.feedAI.generateFeedRecommendations, {
            userId: user._id,
          });
          
          // Generate Learn tab recommendations
          await ctx.runAction(api.coursesAI.generateCourseRecommendations, {
            userId: user._id,
          });
          
          // Generate Community tab recommendations
          await ctx.runAction(api.circlesAI.generateCircleRecommendations, {
            userId: user._id,
          });
          
          // Generate Booking tab recommendations (providers)
          await ctx.runAction(api.bookingAI.generateProviderRecommendations, {
            userId: user._id,
          });
          
          // Generate Booking tab recommendations (events)
          await ctx.runAction(api.bookingAI.generateEventRecommendations, {
            userId: user._id,
          });
          
          successCount++;
          console.log(`  ✓ Generated recommendations for user: ${user._id}`);
        } catch (error) {
          failCount++;
          console.error(`  ✗ Failed for user ${user._id}:`, error);
        }
      }
      
      console.log(`✅ Recommendation generation complete: ${successCount} success, ${failCount} failed`);
      
      return { success: true, successCount, failCount };
    } catch (error) {
      console.error("❌ Recommendation generation failed:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const getAllActiveUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Get users who have been active in the last 30 days
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    const allUsers = await ctx.db.query("users").collect();
    
    // Filter for users with recent activity
    const activeUsers = [];
    for (const user of allUsers) {
      // Check if user has recent engagement
      const recentEngagement = await ctx.db
        .query("engagement")
        .withIndex("by_user", q => q.eq("userId", user._id))
        .order("desc")
        .first();
      
      if (recentEngagement && recentEngagement._creationTime > thirtyDaysAgo) {
        activeUsers.push(user);
      } else if (user._creationTime > thirtyDaysAgo) {
        // Include new users even without engagement
        activeUsers.push(user);
      }
    }
    
    return activeUsers;
  },
});

// ============================================================================
// CLEANUP EXPIRED CACHES
// ============================================================================

export const cleanupExpiredCaches = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🧹 Cleaning up expired caches...");
    
    const now = Date.now();
    let deletedCount = 0;
    
    // Delete expired recommendation caches
    const expiredCaches = await ctx.db
      .query("recommendationCache")
      .withIndex("by_expires", q => q.lt("expiresAt", now))
      .collect();
    
    for (const cache of expiredCaches) {
      await ctx.db.delete(cache._id);
      deletedCount++;
    }
    
    // Delete expired recommendation scores
    const expiredScores = await ctx.db
      .query("userRecommendationScores")
      .withIndex("by_expires", q => q.lt("expiresAt", now))
      .collect();
    
    for (const score of expiredScores) {
      await ctx.db.delete(score._id);
      deletedCount++;
    }
    
    console.log(`✅ Cleanup complete: ${deletedCount} expired items deleted`);
    
    return { success: true, deletedCount };
  },
});

// ============================================================================
// UPDATE USER INTERESTS FROM ENGAGEMENT
// ============================================================================

export const updateUserInterestsFromEngagement = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("🔄 Updating user interests from engagement...");
    
    try {
      const users = await ctx.runQuery(internal.scheduledJobs.getAllActiveUsers);
      let updatedCount = 0;
      
      for (const user of users) {
        try {
          await ctx.runMutation(internal.scheduledJobs.inferUserInterests, {
            userId: user._id,
          });
          updatedCount++;
        } catch (error) {
          console.error(`  ✗ Failed to update interests for user ${user._id}:`, error);
        }
      }
      
      console.log(`✅ Interest update complete: ${updatedCount} users updated`);
      
      return { success: true, updatedCount };
    } catch (error) {
      console.error("❌ Interest update failed:", error);
      return { success: false, error: String(error) };
    }
  },
});

export const inferUserInterests = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    // Get recent engagement
    const recentEngagement = await ctx.db
      .query("engagement")
      .withIndex("by_user", q => q.eq("userId", args.userId))
      .filter(q => q.gt(q.field("createdAt"), thirtyDaysAgo))
      .collect();
    
    // Count engagement by content type and extract topics
    const topicCounts = new Map<string, number>();
    
    for (const engagement of recentEngagement) {
      // Get content analysis
      const analysis = await ctx.db
        .query("contentAnalysis")
        .withIndex("by_content", q =>
          q.eq("contentType", engagement.contentType).eq("contentId", engagement.contentId)
        )
        .first();
      
      if (analysis) {
        // Count topics
        for (const topic of analysis.aiAnalysis.topics) {
          topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        }
        
        // Count keywords
        for (const keyword of analysis.aiAnalysis.keywords) {
          topicCounts.set(keyword, (topicCounts.get(keyword) || 0) + 1);
        }
        
        // Count health topics
        if (analysis.aiAnalysis.healthTopics) {
          for (const healthTopic of analysis.aiAnalysis.healthTopics) {
            topicCounts.set(healthTopic, (topicCounts.get(healthTopic) || 0) + 1);
          }
        }
      }
    }
    
    // Update or create user interests
    for (const [interest, count] of topicCounts.entries()) {
      // Calculate strength (0-100) based on engagement count
      const strength = Math.min(100, count * 10);
      
      // Check if interest already exists
      const existing = await ctx.db
        .query("userInterests")
        .withIndex("by_user", q => q.eq("userId", args.userId))
        .filter(q => q.eq(q.field("interest"), interest))
        .first();
      
      if (existing) {
        // Update existing interest
        await ctx.db.patch(existing._id, {
          strength: Math.max(existing.strength, strength),
          source: "inferred",
          updatedAt: now,
        });
      } else if (strength >= 20) {
        // BUG FIX: was missing updatedAt — decayUnusedInterests skipped these rows
        await ctx.db.insert("userInterests", {
          userId: args.userId,
          interest,
          source: "inferred",
          strength,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});
