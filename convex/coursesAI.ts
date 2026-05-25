import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// AI-Enhanced course content with fallback
export const getCourseRelatedContentAI = query({
  args: {
    limit: v.optional(v.number()),
    viewMode: v.string(),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // If not authenticated or AI disabled, use regular query
    if (!userId || args.useAI === false) {
      return await getRegularCourseContent(ctx, args.viewMode, args.limit || 50);
    }

    try {
      // Try to get AI-ranked content
      const aiRankedContent = await getAIRankedCourseContent(ctx, userId, args.viewMode, args.limit || 50);
      
      if (aiRankedContent && (aiRankedContent.articles.length > 0 || aiRankedContent.reels.length > 0)) {
        return {
          ...aiRankedContent,
          useAI: true,
          source: "ai_recommendations"
        };
      }
    } catch (error) {
      console.error("AI course content error, falling back:", error);
    }

    // Fallback to regular content
    const regularContent = await getRegularCourseContent(ctx, args.viewMode, args.limit || 50);
    return {
      ...regularContent,
      useAI: false,
      source: "regular_query"
    };
  },
});

// Get AI-ranked course content
async function getAIRankedCourseContent(ctx: any, userId: any, viewMode: string, limit: number) {
  // Check for cached recommendations
  const cached = await ctx.db
    .query("recommendationCache")
    .withIndex("by_user_type", (q: any) =>
      q.eq("userId", userId).eq("contentType", `courses_${viewMode}`)
    )
    .first();

  const now = Date.now();
  
  // If cache is valid, use it
  if (cached && cached.expiresAt > now && cached.rankedContentIds.length > 0) {
    const rankedIds = cached.rankedContentIds.slice(0, limit);
    return await fetchCourseContentByIds(ctx, rankedIds);
  }

  // No valid cache, return null to trigger fallback
  return null;
}

// Fetch course content by IDs maintaining order
async function fetchCourseContentByIds(ctx: any, contentIds: string[]) {
  const articles: any[] = [];
  const reels: any[] = [];
  
  for (const id of contentIds) {
    const [contentType, contentId] = id.split(":");
    
    if (contentType === "article") {
      const article = await ctx.db.get(contentId as any);
      if (article) {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q: any) => q.eq(q.field("userId"), article.authorId))
          .first();

        articles.push({
          ...article,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        });
      }
    } else if (contentType === "reel") {
      const reel = await ctx.db.get(contentId as any);
      if (reel) {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q: any) => q.eq(q.field("userId"), reel.authorId))
          .first();

        reels.push({
          ...reel,
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
  
  return { articles, reels };
}

// Regular course content without AI (fallback)
async function getRegularCourseContent(ctx: any, viewMode: string, limit: number) {
  const userId = await getAuthUserId(ctx);
  
  if (viewMode === 'my-courses') {
    // Get user's own courses
    if (!userId) {
      return { articles: [], reels: [] };
    }

    const myCourses = await ctx.db
      .query("courses")
      .withIndex("by_author", (q: any) => q.eq("authorId", userId))
      .collect();

    const courseIds = myCourses.map((c: any) => c._id);
    
    // Get content from these courses
    const courseContent = await ctx.db
      .query("courseContent")
      .filter((q: any) => courseIds.some((id: any) => q.eq(q.field("courseId"), id)))
      .collect();

    const articles: any[] = [];
    const reels: any[] = [];

    for (const content of courseContent) {
      if (content.contentType === "article") {
        const article = await ctx.db.get(content.contentId);
        if (article) {
          const author = await ctx.db.get(article.authorId);
          const profile = await ctx.db
            .query("profiles")
            .filter((q: any) => q.eq(q.field("userId"), article.authorId))
            .first();

          articles.push({
            ...article,
            author: {
              id: author?._id,
              name: author?.name || profile?.name,
              username: profile?.username,
              avatar: profile?.avatar,
            },
          });
        }
      } else if (content.contentType === "reel") {
        const reel = await ctx.db.get(content.contentId);
        if (reel) {
          const author = await ctx.db.get(reel.authorId);
          const profile = await ctx.db
            .query("profiles")
            .filter((q: any) => q.eq(q.field("userId"), reel.authorId))
            .first();

          reels.push({
            ...reel,
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

    return { articles, reels };
  } else if (viewMode === 'enrolled') {
    // Get courses user is enrolled in
    if (!userId) {
      return { articles: [], reels: [] };
    }

    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();

    const courseIds = enrollments.map((e: any) => e.courseId);
    
    // Get content from enrolled courses
    const courseContent = await ctx.db
      .query("courseContent")
      .filter((q: any) => courseIds.some((id: any) => q.eq(q.field("courseId"), id)))
      .collect();

    const articles: any[] = [];
    const reels: any[] = [];

    for (const content of courseContent) {
      if (content.contentType === "article") {
        const article = await ctx.db.get(content.contentId);
        if (article) {
          const author = await ctx.db.get(article.authorId);
          const profile = await ctx.db
            .query("profiles")
            .filter((q: any) => q.eq(q.field("userId"), article.authorId))
            .first();

          articles.push({
            ...article,
            author: {
              id: author?._id,
              name: author?.name || profile?.name,
              username: profile?.username,
              avatar: profile?.avatar,
            },
          });
        }
      } else if (content.contentType === "reel") {
        const reel = await ctx.db.get(content.contentId);
        if (reel) {
          const author = await ctx.db.get(reel.authorId);
          const profile = await ctx.db
            .query("profiles")
            .filter((q: any) => q.eq(q.field("userId"), reel.authorId))
            .first();

          reels.push({
            ...reel,
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

    return { articles, reels };
  } else {
    // Get all course-related content
    const allCourses = await ctx.db
      .query("courses")
      .withIndex("by_published", (q: any) => q.eq("isPublished", true))
      .take(limit);

    const courseIds = allCourses.map((c: any) => c._id);
    
    // Get content from these courses
    const courseContent = await ctx.db
      .query("courseContent")
      .filter((q: any) => courseIds.some((id: any) => q.eq(q.field("courseId"), id)))
      .take(limit);

    const articles: any[] = [];
    const reels: any[] = [];

    for (const content of courseContent) {
      if (content.contentType === "article") {
        const article = await ctx.db.get(content.contentId);
        if (article) {
          const author = await ctx.db.get(article.authorId);
          const profile = await ctx.db
            .query("profiles")
            .filter((q: any) => q.eq(q.field("userId"), article.authorId))
            .first();

          articles.push({
            ...article,
            author: {
              id: author?._id,
              name: author?.name || profile?.name,
              username: profile?.username,
              avatar: profile?.avatar,
            },
          });
        }
      } else if (content.contentType === "reel") {
        const reel = await ctx.db.get(content.contentId);
        if (reel) {
          const author = await ctx.db.get(reel.authorId);
          const profile = await ctx.db
            .query("profiles")
            .filter((q: any) => q.eq(q.field("userId"), reel.authorId))
            .first();

          reels.push({
            ...reel,
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

    return { articles, reels };
  }
}


// ============================================================================
// GENERATE COURSE RECOMMENDATIONS
// ============================================================================

export const generateCourseRecommendations = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      console.log(`Generating course recommendations for user: ${args.userId}`);
      
      // Get user profile
      const userProfile = await ctx.runQuery(internal.aiRecommendations.buildUserProfile, {
        userId: args.userId,
      });

      if (!userProfile) {
        return { success: false, reason: "no_profile" };
      }

      // Get all published courses
      const courses = await ctx.runQuery(api.courses.listCourses, { limit: 100 });
      
      // Get course-related content
      const allCourseContent: Array<{ id: string; score: number; type: string; createdAt: number }> = [];

      // Score courses themselves
      for (const course of courses) {
        const contentId = `course:${course._id}`;
        
        const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
          contentType: "course",
          contentId: course._id,
        });

        let score = 50;
        
        if (analysis) {
          const result = await ctx.runAction(api.aiRecommendations.calculateRecommendationScore, {
            userId: args.userId,
            contentType: "course",
            contentId: course._id,
            contentCreatedAt: course._creationTime,
          });
          score = result.score;
        } else {
          // Trigger analysis
          await ctx.runAction(api.aiRecommendations.analyzeContent, {
            contentType: "course",
            contentId: course._id,
            contentData: {
              title: course.title,
              description: course.description,
            },
          });
        }

        allCourseContent.push({
          id: contentId,
          score,
          type: "course",
          createdAt: course._creationTime,
        });
      }

      // Get articles and reels from courses
      const articles = await ctx.runQuery(api.articles.listFeed, { limit: 100 });
      const reels = await ctx.runQuery(api.reels.listReels, { limit: 100 });

      // Score articles
      for (const article of articles) {
        const contentId = `article:${article._id}`;
        
        const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
          contentType: "article",
          contentId: article._id,
        });

        let score = 50;
        
        if (analysis) {
          const result = await ctx.runAction(api.aiRecommendations.calculateRecommendationScore, {
            userId: args.userId,
            contentType: "article",
            contentId: article._id,
            contentCreatedAt: article.createdAt,
          });
          score = result.score;
        }

        allCourseContent.push({
          id: contentId,
          score,
          type: "article",
          createdAt: article.createdAt,
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
            contentCreatedAt: reel.createdAt,
          });
          score = result.score;
        }

        allCourseContent.push({
          id: contentId,
          score,
          type: "reel",
          createdAt: reel.createdAt,
        });
      }

      // Sort by score
      allCourseContent.sort((a, b) => b.score - a.score);

      // Apply learning-specific ranking
      const rankedIds = applyLearningRanking(allCourseContent, userProfile);

      // Cache the recommendations
      const now = Date.now();
      const expiresAt = now + 6 * 60 * 60 * 1000; // 6 hours

      const existing = await ctx.runQuery(internal.aiRecommendations.getCachedRecommendations, {
        userId: args.userId,
        contentType: "courses_all",
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
          contentType: "courses_all",
          rankedContentIds: rankedIds,
          expiresAt,
        });
      }

      return { success: true, count: rankedIds.length };
    } catch (error) {
      console.error("Error generating course recommendations:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Apply learning-specific ranking (progressive difficulty, skill gaps)
function applyLearningRanking(
  scoredContent: Array<{ id: string; score: number; type: string; createdAt: number }>,
  userProfile: any
): string[] {
  // Prioritize courses, then articles, then reels
  const courses = scoredContent.filter(c => c.type === "course");
  const articles = scoredContent.filter(c => c.type === "article");
  const reels = scoredContent.filter(c => c.type === "reel");

  const ranked: string[] = [];

  // Interleave: 2 courses, 2 articles, 1 reel
  let courseIdx = 0;
  let articleIdx = 0;
  let reelIdx = 0;

  while (courseIdx < courses.length || articleIdx < articles.length || reelIdx < reels.length) {
    // Add 2 courses
    for (let i = 0; i < 2 && courseIdx < courses.length; i++) {
      ranked.push(courses[courseIdx].id);
      courseIdx++;
    }

    // Add 2 articles
    for (let i = 0; i < 2 && articleIdx < articles.length; i++) {
      ranked.push(articles[articleIdx].id);
      articleIdx++;
    }

    // Add 1 reel
    if (reelIdx < reels.length) {
      ranked.push(reels[reelIdx].id);
      reelIdx++;
    }
  }

  return ranked;
}
