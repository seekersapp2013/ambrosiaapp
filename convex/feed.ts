import { query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Unified feed that combines articles and reels
export const listUnifiedFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Fetch articles
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .order("desc")
      .take(limit);

    // Fetch reels
    const reels = await ctx.db
      .query("reels")
      .order("desc")
      .take(limit);

    // Get author info for articles
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        return {
          ...article,
          contentType: "article" as const,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    // Get author info for reels
    const reelsWithAuthors = await Promise.all(
      reels.map(async (reel) => {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), reel.authorId))
          .first();

        return {
          ...reel,
          contentType: "reel" as const,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    // Combine and sort by creation date
    const unifiedContent = [...articlesWithAuthors, ...reelsWithAuthors];
    
    // Sort by creation date (most recent first) and limit results
    return unifiedContent
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});