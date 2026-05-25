import { v } from "convex/values";
import { query } from "./_generated/server";

// Search across articles, users, and reels
export const searchAll = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    // Search articles
    const articles = await ctx.db
      .query("articles")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "PUBLISHED"),
          q.or(
            q.eq(q.field("title"), searchTerm),
            q.eq(q.field("subtitle"), searchTerm)
          )
        )
      )
      .take(10);

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
          type: 'article',
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    // Search users by username
    const profiles = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("username"), searchTerm))
      .take(10);

    const users = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          id: user?._id,
          type: 'user',
          name: user?.name || profile.name,
          username: profile.username,
          bio: profile.bio,
          avatar: profile.avatar,
        };
      })
    );

    // Search reels
    const reels = await ctx.db
      .query("reels")
      .filter((q) => 
        q.eq(q.field("caption"), searchTerm)
      )
      .take(10);

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
          type: 'reel',
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return {
      articles: articlesWithAuthors,
      users: users.filter(u => u.id),
      reels: reelsWithAuthors,
    };
  },
});

// Search articles by tags
export const searchByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "PUBLISHED")
        )
      )
      .take(20);

    // Filter articles that contain the tag
    const filteredArticles = articles.filter(article => 
      article.tags.includes(args.tag)
    );

    const reels = await ctx.db
      .query("reels")
      .collect();

    // Filter reels that contain the tag
    const filteredReels = reels.filter(reel => 
      reel.tags.includes(args.tag)
    ).slice(0, 20);

    // Get author info
    const articlesWithAuthors = await Promise.all(
      filteredArticles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        return {
          ...article,
          type: 'article',
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    const reelsWithAuthors = await Promise.all(
      filteredReels.map(async (reel) => {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), reel.authorId))
          .first();

        return {
          ...reel,
          type: 'reel',
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return {
      articles: articlesWithAuthors,
      reels: reelsWithAuthors,
    };
  },
});

// Get popular tags
export const getPopularTags = query({
  handler: async (ctx) => {
    const articles = await ctx.db
      .query("articles")
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .collect();

    const reels = await ctx.db
      .query("reels")
      .collect();

    // Count tag frequency
    const tagCounts: Record<string, number> = {};

    articles.forEach(article => {
      article.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    reels.forEach(reel => {
      reel.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Sort by frequency and return top 20
    const popularTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return popularTags;
  },
});