import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Create a new article
export const createArticle = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    contentHtml: v.string(),
    contentDelta: v.optional(v.any()),
    coverImage: v.optional(v.string()),
    tags: v.array(v.string()),
    isSensitive: v.boolean(),
    isPublic: v.boolean(), // New field for content visibility
    isGated: v.boolean(),
    priceToken: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate required fields
    if (!args.title.trim()) {
      throw new Error("Article title is required");
    }
    
    if (!args.contentHtml || !args.contentHtml.trim()) {
      throw new Error("Article content is required");
    }

    // Validate contentHtml format
    if (typeof args.contentHtml !== 'string') {
      throw new Error("Article content must be a string");
    }

    // Check if articles require approval
    const settings = await ctx.db.query("moderationSettings").first();
    const requiresApproval = settings?.articlesRequireApproval ?? true;

    // Log article creation for debugging
    console.log("Creating article:", {
      userId,
      title: args.title,
      contentHtmlLength: args.contentHtml.length,
      hasValidHTML: args.contentHtml.includes('<p>') || args.contentHtml.includes('<br>'),
      contentPreview: args.contentHtml.substring(0, 100) + '...',
      requiresApproval
    });

    // Generate slug from title
    const slug = args.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();

    // Calculate read time (rough estimate: 200 words per minute)
    const wordCount = args.contentHtml.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const readTimeMin = Math.max(1, Math.ceil(wordCount / 200));

    const now = Date.now();

    const articleId = await ctx.db.insert("articles", {
      authorId: userId,
      title: args.title,
      subtitle: args.subtitle,
      slug,
      contentHtml: args.contentHtml,
      contentDelta: args.contentDelta,
      coverImage: args.coverImage,
      readTimeMin,
      tags: args.tags,
      status: requiresApproval ? "DRAFT" : "PUBLISHED",
      publishedAt: requiresApproval ? undefined : now,
      isSensitive: args.isSensitive,
      isPublic: args.isPublic,
      isGated: args.isGated,
      priceToken: args.priceToken,
      priceAmount: args.priceAmount,
      views: 0,
      // Moderation fields
      approvalStatus: requiresApproval ? "PENDING" : "NOT_REQUIRED",
      approvalRequestedAt: requiresApproval ? now : undefined,
      createdAt: now,
    });

    console.log("Article created successfully:", articleId);

    // If approval is required, create approval record
    if (requiresApproval) {
      await ctx.db.insert("contentApprovals", {
        contentType: "articles",
        contentId: articleId,
        status: "PENDING",
        submittedBy: userId,
        createdAt: now,
      });
      
      console.log("Article submitted for approval");
    } else {
      // Only notify followers if article is published immediately
      const followers = await ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingId", userId))
        .collect();

      // Create notifications for all followers
      for (const follow of followers) {
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'NEW_CONTENT',
          recipientUserId: follow.followerId,
          actorUserId: userId,
          relatedContentType: 'article',
          relatedContentId: articleId,
        });
      }
    }

    return articleId;
  },
});

// Publish an article
export const publishArticle = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found");
    if (article.authorId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.articleId, {
      status: "PUBLISHED",
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return args.articleId;
  },
});

// Increment article view count
export const incrementViews = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found");

    await ctx.db.patch(args.articleId, {
      views: article.views + 1,
      updatedAt: Date.now(),
    });

    return args.articleId;
  },
});

// Get article by ID
export const getArticleById = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const article = await ctx.db.get(args.articleId);
    if (!article) {
      console.log("Article not found:", args.articleId);
      return null;
    }

    // Validate article data
    if (!article.contentHtml) {
      console.warn("Article missing contentHtml:", args.articleId);
    }

    // Get author info
    const author = await ctx.db.get(article.authorId);
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("userId"), article.authorId))
      .first();

    const result = {
      ...article,
      author: {
        id: author?._id,
        name: author?.name || profile?.name,
        username: profile?.username,
        avatar: profile?.avatar,
      },
    };

    console.log("Retrieved article:", {
      id: result._id,
      title: result.title,
      hasContentHtml: !!result.contentHtml,
      contentLength: result.contentHtml?.length || 0,
      status: result.status
    });

    return result;
  },
});

// Get article by slug
export const getArticleBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const article = await ctx.db
      .query("articles")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!article) {
      console.log("Article not found by slug:", args.slug);
      return null;
    }

    // Validate article data
    if (!article.contentHtml) {
      console.warn("Article missing contentHtml (by slug):", args.slug, article._id);
    }

    // Get author info
    const author = await ctx.db.get(article.authorId);
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("userId"), article.authorId))
      .first();

    const result = {
      ...article,
      author: {
        id: author?._id,
        name: author?.name || profile?.name,
        username: profile?.username,
        avatar: profile?.avatar,
      },
    };

    console.log("Retrieved article by slug:", {
      slug: args.slug,
      id: result._id,
      title: result.title,
      hasContentHtml: !!result.contentHtml,
      contentLength: result.contentHtml?.length || 0,
      status: result.status
    });

    return result;
  },
});

// List articles for feed (only public articles)
export const listFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .filter((q) => q.and(
        q.or(
          q.eq(q.field("isPublic"), true),
          q.eq(q.field("isPublic"), undefined)
        ),
        // STRICT: Only show APPROVED or NOT_REQUIRED content
        q.or(
          q.eq(q.field("approvalStatus"), "APPROVED"),
          q.eq(q.field("approvalStatus"), "NOT_REQUIRED")
        )
      ))
      .order("desc")
      .take(limit);

    // Get author info for each article
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        return {
          ...article,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return articlesWithAuthors;
  },
});

// Get articles by author
export const getArticlesByAuthor = query({
  args: { authorId: v.id("users") },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .order("desc")
      .collect();

    return articles;
  },
});

// Set gating for an article
export const setGating = mutation({
  args: {
    articleId: v.id("articles"),
    isGated: v.boolean(),
    priceToken: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found");
    if (article.authorId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.articleId, {
      isGated: args.isGated,
      priceToken: args.priceToken,
      priceAmount: args.priceAmount,
      updatedAt: Date.now(),
    });

    return args.articleId;
  },
});

// Search articles
export const searchArticles = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "PUBLISHED"),
          q.or(
            q.eq(q.field("title"), args.query),
            q.eq(q.field("title"), args.query)
          )
        )
      )
      .take(20);

    // Get author info for each article
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        return {
          ...article,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return articlesWithAuthors;
  },
});

// Delete article (permanently remove from database)
export const deleteArticle = mutation({
  args: {
    articleId: v.id("articles")
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const article = await ctx.db.get(args.articleId);
    if (!article) {
      throw new Error("Article not found");
    }

    // Only the article author can delete their article
    if (article.authorId !== userId) {
      throw new Error("Not authorized to delete this article");
    }

    // Get all related data that needs to be cleaned up
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect();

    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("articleId"), args.articleId))
      .collect();

    const bookmarks = await ctx.db
      .query("bookmarks")
      .filter((q) => q.eq(q.field("articleId"), args.articleId))
      .collect();

    const claps = await ctx.db
      .query("claps")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect();

    const reads = await ctx.db
      .query("reads")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_content", (q) => q.eq("contentType", "article").eq("contentId", args.articleId))
      .collect();

    // Delete all related data
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }

    for (const like of likes) {
      await ctx.db.delete(like._id);
    }

    for (const bookmark of bookmarks) {
      await ctx.db.delete(bookmark._id);
    }

    for (const clap of claps) {
      await ctx.db.delete(clap._id);
    }

    for (const read of reads) {
      await ctx.db.delete(read._id);
    }

    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    // Delete the article itself
    await ctx.db.delete(args.articleId);

    return { 
      success: true, 
      deletedComments: comments.length,
      deletedLikes: likes.length,
      deletedBookmarks: bookmarks.length,
      deletedClaps: claps.length,
      deletedReads: reads.length,
      deletedPayments: payments.length
    };
  }
});

// List articles created by current user
export const listMyArticles = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 20;

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .order("desc")
      .take(limit);

    // Get author info for each article
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        return {
          ...article,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return articlesWithAuthors;
  },
});

// Get pending articles for current user
export const getMyPendingArticles = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .order("desc")
      .collect();

    return articles;
  },
});
