import { action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

/**
 * Initialize AI Recommendations System
 * 
 * This script:
 * 1. Analyzes all existing content (articles, reels, courses, circles)
 * 2. Generates recommendations for all users
 * 3. Populates the cache
 * 
 * Run this once after deployment to bootstrap the AI system
 */

export const initializeAISystem = action({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Starting AI System Initialization...");
    
    try {
      // Step 1: Analyze existing articles
      console.log("📝 Analyzing articles...");
      const articles = await ctx.runQuery(api.articles.listFeed, { limit: 100 });
      let articlesAnalyzed = 0;
      
      for (const article of articles) {
        try {
          await ctx.runAction(api.aiRecommendations.analyzeContent, {
            contentType: "article",
            contentId: article._id,
            contentData: {
              title: article.title,
              text: article.contentHtml?.substring(0, 2000),
              tags: article.tags,
            },
          });
          articlesAnalyzed++;
          console.log(`  ✓ Analyzed article: ${article.title}`);
        } catch (error) {
          console.error(`  ✗ Failed to analyze article ${article._id}:`, error);
        }
      }
      
      console.log(`✅ Analyzed ${articlesAnalyzed}/${articles.length} articles`);
      
      // Step 2: Analyze existing reels
      console.log("🎬 Analyzing reels...");
      const reels = await ctx.runQuery(api.reels.listReels, { limit: 100 });
      let reelsAnalyzed = 0;
      
      for (const reel of reels) {
        try {
          await ctx.runAction(api.aiRecommendations.analyzeContent, {
            contentType: "reel",
            contentId: reel._id,
            contentData: {
              caption: reel.caption,
              tags: reel.tags,
            },
          });
          reelsAnalyzed++;
          console.log(`  ✓ Analyzed reel: ${reel._id}`);
        } catch (error) {
          console.error(`  ✗ Failed to analyze reel ${reel._id}:`, error);
        }
      }
      
      console.log(`✅ Analyzed ${reelsAnalyzed}/${reels.length} reels`);
      
      // Step 3: Get all users and generate recommendations
      console.log("👥 Generating user recommendations...");
      const users = await ctx.runQuery(internal.initializeAI.getAllUsers);
      let usersProcessed = 0;
      
      for (const user of users) {
        try {
          // Generate recommendations for For You tab
          await ctx.runAction(api.feedAI.generateFeedRecommendations, {
            userId: user._id,
          });
          usersProcessed++;
          console.log(`  ✓ Generated recommendations for user: ${user._id}`);
        } catch (error) {
          console.error(`  ✗ Failed to generate recommendations for user ${user._id}:`, error);
        }
      }
      
      console.log(`✅ Generated recommendations for ${usersProcessed}/${users.length} users`);
      
      // Summary
      console.log("\n🎉 AI System Initialization Complete!");
      console.log(`   Articles analyzed: ${articlesAnalyzed}`);
      console.log(`   Reels analyzed: ${reelsAnalyzed}`);
      console.log(`   Users processed: ${usersProcessed}`);
      console.log("\n💡 AI recommendations are now active!");
      
      return {
        success: true,
        articlesAnalyzed,
        reelsAnalyzed,
        usersProcessed,
      };
    } catch (error) {
      console.error("❌ AI System Initialization Failed:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  },
});

// Internal query to get all users
export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Internal query to get article by ID
export const getArticleById = internalQuery({
  args: {
    articleId: v.id("articles"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.articleId);
  },
});

/**
 * Quick test to analyze a single piece of content
 * Use this to test if Nova API is working
 */
export const testContentAnalysis = action({
  args: {
    contentType: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; result?: any; error?: string }> => {
    console.log(`🧪 Testing content analysis for ${args.contentType}: ${args.contentId}`);
    
    try {
      let contentData: any = {};
      
      if (args.contentType === "article") {
        // Get article directly from database
        const article = await ctx.runQuery(internal.initializeAI.getArticleById, {
          articleId: args.contentId as any,
        });
        
        if (!article) {
          throw new Error("Article not found");
        }
        
        contentData = {
          title: article.title,
          text: article.contentHtml?.substring(0, 2000),
          tags: article.tags,
        };
      } else if (args.contentType === "reel") {
        const reels = await ctx.runQuery(api.reels.listReels, { limit: 100 });
        const reel = reels.find((r: any) => r._id === args.contentId);
        
        if (!reel) {
          throw new Error("Reel not found");
        }
        
        contentData = {
          caption: reel.caption,
          tags: reel.tags,
        };
      }
      
      const result: any = await ctx.runAction(api.aiRecommendations.analyzeContent, {
        contentType: args.contentType,
        contentId: args.contentId,
        contentData,
      });
      
      console.log("✅ Analysis successful!");
      console.log("Result:", result);
      
      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error("❌ Analysis failed:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  },
});

/**
 * Generate recommendations for a specific user
 * Use this to test recommendation generation
 */
export const testUserRecommendations = action({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId?: any; result?: any; error?: string }> => {
    console.log(`🧪 Testing recommendations for user: ${args.userEmail}`);
    
    try {
      // Find user by email
      const users: any[] = await ctx.runQuery(internal.initializeAI.getAllUsers);
      const user: any = users.find((u: any) => u.email === args.userEmail);
      
      if (!user) {
        throw new Error("User not found");
      }
      
      console.log(`Found user: ${user._id}`);
      
      // Generate recommendations
      const result: any = await ctx.runAction(api.feedAI.generateFeedRecommendations, {
        userId: user._id,
      });
      
      console.log("✅ Recommendations generated!");
      console.log("Result:", result);
      
      return {
        success: true,
        userId: user._id,
        result,
      };
    } catch (error) {
      console.error("❌ Recommendation generation failed:", error);
      return {
        success: false,
        error: String(error),
      };
    }
  },
});
