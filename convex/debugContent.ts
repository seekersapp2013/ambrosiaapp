import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Debug query to check content approval status
export const checkContentApprovalStatus = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get all articles
    const allArticles = await ctx.db.query("articles").collect();
    const myArticles = allArticles.filter(a => a.authorId === userId);

    // Get all reels
    const allReels = await ctx.db.query("reels").collect();
    const myReels = allReels.filter(r => r.authorId === userId);

    // Count by approval status
    const articleStats = {
      total: myArticles.length,
      approved: myArticles.filter(a => a.approvalStatus === "APPROVED").length,
      pending: myArticles.filter(a => a.approvalStatus === "PENDING").length,
      notRequired: myArticles.filter(a => a.approvalStatus === "NOT_REQUIRED").length,
      undefined: myArticles.filter(a => !a.approvalStatus).length,
      rejected: myArticles.filter(a => a.approvalStatus === "REJECTED").length,
    };

    const reelStats = {
      total: myReels.length,
      approved: myReels.filter(r => r.approvalStatus === "APPROVED").length,
      pending: myReels.filter(r => r.approvalStatus === "PENDING").length,
      notRequired: myReels.filter(r => r.approvalStatus === "NOT_REQUIRED").length,
      undefined: myReels.filter(r => !r.approvalStatus).length,
      rejected: myReels.filter(r => r.approvalStatus === "REJECTED").length,
    };

    // Get sample pending content
    const pendingArticles = myArticles
      .filter(a => a.approvalStatus === "PENDING")
      .slice(0, 5)
      .map(a => ({
        id: a._id,
        title: a.title,
        status: a.status,
        approvalStatus: a.approvalStatus,
        isPublic: a.isPublic,
      }));

    const pendingReels = myReels
      .filter(r => r.approvalStatus === "PENDING")
      .slice(0, 5)
      .map(r => ({
        id: r._id,
        caption: r.caption,
        approvalStatus: r.approvalStatus,
        isPublic: r.isPublic,
      }));

    return {
      articles: articleStats,
      reels: reelStats,
      pendingArticles,
      pendingReels,
    };
  },
});

// Force approve all user's content
export const approveMyContent = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let articlesUpdated = 0;
    let reelsUpdated = 0;

    // Get all user's articles
    const myArticles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    // Approve all articles
    for (const article of myArticles) {
      if (article.approvalStatus !== "APPROVED") {
        await ctx.db.patch(article._id, {
          approvalStatus: "APPROVED",
          status: "PUBLISHED",
          publishedAt: article.publishedAt || article.createdAt,
          updatedAt: Date.now(),
        });
        articlesUpdated++;
      }
    }

    // Get all user's reels
    const myReels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    // Approve all reels
    for (const reel of myReels) {
      if (reel.approvalStatus !== "APPROVED") {
        await ctx.db.patch(reel._id, {
          approvalStatus: "APPROVED",
        });
        reelsUpdated++;
      }
    }

    return {
      success: true,
      articlesUpdated,
      reelsUpdated,
      message: `Approved ${articlesUpdated} articles and ${reelsUpdated} reels`,
    };
  },
});

// Set all content to NOT_REQUIRED (disable moderation for existing content)
export const setContentNotRequired = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let articlesUpdated = 0;
    let reelsUpdated = 0;

    // Get all user's articles
    const myArticles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    // Set all articles to NOT_REQUIRED
    for (const article of myArticles) {
      await ctx.db.patch(article._id, {
        approvalStatus: "NOT_REQUIRED",
        status: "PUBLISHED",
        publishedAt: article.publishedAt || article.createdAt,
        updatedAt: Date.now(),
      });
      articlesUpdated++;
    }

    // Get all user's reels
    const myReels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    // Set all reels to NOT_REQUIRED
    for (const reel of myReels) {
      await ctx.db.patch(reel._id, {
        approvalStatus: "NOT_REQUIRED",
      });
      reelsUpdated++;
    }

    return {
      success: true,
      articlesUpdated,
      reelsUpdated,
      message: `Set ${articlesUpdated} articles and ${reelsUpdated} reels to NOT_REQUIRED`,
    };
  },
});
