import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Helper function to extract mentions from comment content
async function extractMentions(ctx: any, content: string) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    const username = match[1];
    // Find user by username
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q: any) => q.eq("username", username))
      .first();

    if (profile) {
      mentions.push(profile.userId);
    }
  }

  return [...new Set(mentions)]; // Remove duplicates
}

// Like/Unlike Article
export const likeArticle = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_article", (q) =>
        q.eq("userId", userId).eq("articleId", args.articleId)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      return { liked: false };
    } else {
      // Like
      await ctx.db.insert("likes", {
        userId,
        articleId: args.articleId,
        createdAt: Date.now(),
      });

      // Track engagement and update interests
      await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackEngagementAndUpdateInterests, {
        userId,
        contentType: "article",
        contentId: args.articleId,
        engagementType: "like",
      });

      // Trigger notification for content owner
      const article = await ctx.db.get(args.articleId);
      if (article && article.authorId !== userId) {
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'CONTENT_LIKED',
          recipientUserId: article.authorId,
          actorUserId: userId,
          relatedContentType: 'article',
          relatedContentId: args.articleId,
        });
      }

      return { liked: true };
    }
  },
});

// Like/Unlike Reel
export const likeReel = mutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_reel", (q) =>
        q.eq("userId", userId).eq("reelId", args.reelId)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      return { liked: false };
    } else {
      // Like
      await ctx.db.insert("likes", {
        userId,
        reelId: args.reelId,
        createdAt: Date.now(),
      });

      // Track engagement and update interests
      await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackEngagementAndUpdateInterests, {
        userId,
        contentType: "reel",
        contentId: args.reelId,
        engagementType: "like",
      });

      // Trigger notification for content owner
      const reel = await ctx.db.get(args.reelId);
      if (reel && reel.authorId !== userId) {
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'CONTENT_LIKED',
          recipientUserId: reel.authorId,
          actorUserId: userId,
          relatedContentType: 'reel',
          relatedContentId: args.reelId,
        });
      }

      return { liked: true };
    }
  },
});

// Bookmark/Unbookmark Article
export const bookmarkArticle = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already bookmarked
    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("articleId"), args.articleId))
      .first();

    if (existingBookmark) {
      // Remove bookmark
      await ctx.db.delete(existingBookmark._id);
      return { bookmarked: false };
    } else {
      // Add bookmark
      await ctx.db.insert("bookmarks", {
        userId,
        articleId: args.articleId,
        createdAt: Date.now(),
      });
      
      // Track engagement and update interests
      await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackEngagementAndUpdateInterests, {
        userId,
        contentType: "article",
        contentId: args.articleId,
        engagementType: "bookmark",
      });
      
      return { bookmarked: true };
    }
  },
});

// Bookmark/Unbookmark Reel
export const bookmarkReel = mutation({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already bookmarked
    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("reelId"), args.reelId))
      .first();

    if (existingBookmark) {
      // Remove bookmark
      await ctx.db.delete(existingBookmark._id);
      return { bookmarked: false };
    } else {
      // Add bookmark
      await ctx.db.insert("bookmarks", {
        userId,
        reelId: args.reelId,
        createdAt: Date.now(),
      });
      
      // Track engagement and update interests
      await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackEngagementAndUpdateInterests, {
        userId,
        contentType: "reel",
        contentId: args.reelId,
        engagementType: "bookmark",
      });
      
      return { bookmarked: true };
    }
  },
});

// Comment on Article
export const commentArticle = mutation({
  args: {
    articleId: v.id("articles"),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const commentId = await ctx.db.insert("comments", {
      articleId: args.articleId,
      authorId: userId,
      parentId: args.parentId,
      content: args.content,
      createdAt: Date.now(),
    });

    // Track engagement and update interests
    await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackEngagementAndUpdateInterests, {
      userId,
      contentType: "article",
      contentId: args.articleId,
      engagementType: "comment",
    });

    // Trigger notifications
    const article = await ctx.db.get(args.articleId);

    if (args.parentId) {
      // Reply to comment - notify the parent comment author
      const parentComment = await ctx.db.get(args.parentId);
      if (parentComment && parentComment.authorId !== userId) {
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'COMMENT_REPLY',
          recipientUserId: parentComment.authorId,
          actorUserId: userId,
          relatedContentType: 'article',
          relatedContentId: args.articleId,
          metadata: { commentId: commentId.toString() },
        });
      }
    } else if (article && article.authorId !== userId) {
      // New comment on article - notify the article author
      await ctx.runMutation(internal.notifications.createNotificationEvent, {
        type: 'CONTENT_COMMENTED',
        recipientUserId: article.authorId,
        actorUserId: userId,
        relatedContentType: 'article',
        relatedContentId: args.articleId,
        metadata: { commentId: commentId.toString() },
      });
    }

    // Check for user mentions in the comment
    const mentionedUsers = await extractMentions(ctx, args.content);
    for (const mentionedUserId of mentionedUsers) {
      if (mentionedUserId !== userId) { // Don't notify self
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'USER_MENTIONED',
          recipientUserId: mentionedUserId,
          actorUserId: userId,
          relatedContentType: 'article',
          relatedContentId: args.articleId,
          metadata: { commentId: commentId.toString() },
        });
      }
    }

    return commentId;
  },
});

// Comment on Reel
export const commentReel = mutation({
  args: {
    reelId: v.id("reels"),
    content: v.string(),
    parentId: v.optional(v.id("comments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const commentId = await ctx.db.insert("comments", {
      reelId: args.reelId,
      authorId: userId,
      parentId: args.parentId,
      content: args.content,
      createdAt: Date.now(),
    });

    // Track engagement and update interests
    await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackEngagementAndUpdateInterests, {
      userId,
      contentType: "reel",
      contentId: args.reelId,
      engagementType: "comment",
    });

    // Trigger notifications
    const reel = await ctx.db.get(args.reelId);

    if (args.parentId) {
      // Reply to comment - notify the parent comment author
      const parentComment = await ctx.db.get(args.parentId);
      if (parentComment && parentComment.authorId !== userId) {
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'COMMENT_REPLY',
          recipientUserId: parentComment.authorId,
          actorUserId: userId,
          relatedContentType: 'reel',
          relatedContentId: args.reelId,
          metadata: { commentId: commentId.toString() },
        });
      }
    } else if (reel && reel.authorId !== userId) {
      // New comment on reel - notify the reel author
      await ctx.runMutation(internal.notifications.createNotificationEvent, {
        type: 'CONTENT_COMMENTED',
        recipientUserId: reel.authorId,
        actorUserId: userId,
        relatedContentType: 'reel',
        relatedContentId: args.reelId,
        metadata: { commentId: commentId.toString() },
      });
    }

    // Check for user mentions in the comment
    const mentionedUsers = await extractMentions(ctx, args.content);
    for (const mentionedUserId of mentionedUsers) {
      if (mentionedUserId !== userId) { // Don't notify self
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'USER_MENTIONED',
          recipientUserId: mentionedUserId,
          actorUserId: userId,
          relatedContentType: 'reel',
          relatedContentId: args.reelId,
          metadata: { commentId: commentId.toString() },
        });
      }
    }

    return commentId;
  },
});

// Get comments for article
export const getArticleComments = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .order("desc")
      .collect();

    // Get author info for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), comment.authorId))
          .first();

        return {
          ...comment,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return commentsWithAuthors;
  },
});

// Get comments for reel
export const getReelComments = query({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_reel", (q) => q.eq("reelId", args.reelId))
      .order("desc")
      .collect();

    // Get author info for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), comment.authorId))
          .first();

        return {
          ...comment,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return commentsWithAuthors;
  },
});

// Get user's bookmarks
export const getUserBookmarks = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Get content details for each bookmark
    const bookmarksWithContent = await Promise.all(
      bookmarks.map(async (bookmark) => {
        if (bookmark.articleId) {
          const article = await ctx.db.get(bookmark.articleId);
          if (!article) return null;

          const author = await ctx.db.get(article.authorId);
          const profile = await ctx.db
            .query("profiles")
            .filter((q) => q.eq(q.field("userId"), article.authorId))
            .first();

          return {
            ...bookmark,
            type: 'article' as const,
            content: {
              ...article,
              author: {
                id: author?._id,
                name: author?.name || profile?.name,
                username: profile?.username,
                avatar: profile?.avatar,
              },
            },
          };
        } else if (bookmark.reelId) {
          const reel = await ctx.db.get(bookmark.reelId);
          if (!reel) return null;

          const author = await ctx.db.get(reel.authorId);
          const profile = await ctx.db
            .query("profiles")
            .filter((q) => q.eq(q.field("userId"), reel.authorId))
            .first();

          return {
            ...bookmark,
            type: 'reel' as const,
            content: {
              ...reel,
              author: {
                id: author?._id,
                name: author?.name || profile?.name,
                username: profile?.username,
                avatar: profile?.avatar,
              },
            },
          };
        }
        return null;
      })
    );

    return bookmarksWithContent.filter(b => b !== null);
  },
});

// Check if user has bookmarked content
export const isBookmarked = query({
  args: {
    contentType: v.string(), // 'article' | 'reel' | 'stream'
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    if (args.contentType === 'article') {
      const bookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("articleId"), args.contentId as any))
        .first();
      return !!bookmark;
    } else if (args.contentType === 'reel') {
      const bookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("reelId"), args.contentId as any))
        .first();
      return !!bookmark;
    } else if (args.contentType === 'stream') {
      const bookmark = await ctx.db
        .query("bookmarks")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("streamId"), args.contentId as any))
        .first();
      return !!bookmark;
    }
    return false;
  },
});

// Check if user has liked content
export const isLiked = query({
  args: {
    contentType: v.string(), // 'article' | 'reel' | 'stream'
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    if (args.contentType === 'article') {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_article", (q) =>
          q.eq("userId", userId).eq("articleId", args.contentId as any)
        )
        .first();
      return !!like;
    } else if (args.contentType === 'reel') {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_reel", (q) =>
          q.eq("userId", userId).eq("reelId", args.contentId as any)
        )
        .first();
      return !!like;
    } else if (args.contentType === 'stream') {
      const like = await ctx.db
        .query("likes")
        .withIndex("by_user_stream", (q) =>
          q.eq("userId", userId).eq("streamId", args.contentId as any)
        )
        .first();
      return !!like;
    }
    return false;
  },
});

// Add claps to an article (0..100 per user)
export const clapArticle = mutation({
  args: { articleId: v.id("articles"), delta: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Optional: require access for gated articles
    const article = await ctx.db.get(args.articleId);
    if (!article) throw new Error("Article not found");
    if (article.isGated) {
      // Use payments.hasAccess to verify
      const hasAccess = await ctx.runQuery(api.payments.hasAccess, { contentType: "article", contentId: args.articleId });
      if (!hasAccess) throw new Error("Access required to clap");
    }

    // Require that the user has read the article at least once
    const read = await ctx.db
      .query("reads")
      .withIndex("by_user_article", (q) => q.eq("userId", userId).eq("articleId", args.articleId))
      .first();
    if (!read) throw new Error("Read the article before clapping");

    const existing = await ctx.db
      .query("claps")
      .withIndex("by_user_article", (q) => q.eq("userId", userId).eq("articleId", args.articleId))
      .first();

    const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

    if (existing) {
      const newCount = clamp((existing.count || 0) + args.delta, 0, 100);
      await ctx.db.patch(existing._id, { count: newCount, updatedAt: Date.now() });

      // Track engagement and update interests (only on increase)
      if (args.delta > 0) {
        await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackEngagementAndUpdateInterests, {
          userId,
          contentType: "article",
          contentId: args.articleId,
          engagementType: "clap",
        });
      }

      // Trigger notification only if claps increased and it's not the author
      if (args.delta > 0 && article.authorId !== userId) {
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'CONTENT_CLAPPED',
          recipientUserId: article.authorId,
          actorUserId: userId,
          relatedContentType: 'article',
          relatedContentId: args.articleId,
          metadata: { clapCount: newCount.toString() },
        });
      }

      return { count: newCount };
    } else {
      const newCount = clamp(args.delta, 0, 100);
      const id = await ctx.db.insert("claps", {
        userId,
        articleId: args.articleId,
        count: newCount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Track engagement and update interests
      if (newCount > 0) {
        await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackEngagementAndUpdateInterests, {
          userId,
          contentType: "article",
          contentId: args.articleId,
          engagementType: "clap",
        });
      }

      // Trigger notification for new claps if it's not the author
      if (newCount > 0 && article.authorId !== userId) {
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'CONTENT_CLAPPED',
          recipientUserId: article.authorId,
          actorUserId: userId,
          relatedContentType: 'article',
          relatedContentId: args.articleId,
          metadata: { clapCount: newCount.toString() },
        });
      }

      const row = await ctx.db.get(id);
      return { count: row?.count ?? newCount };
    }
  },
});

// Get current user's clap count for an article
export const myClapsForArticle = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const existing = await ctx.db
      .query("claps")
      .withIndex("by_user_article", (q) => q.eq("userId", userId).eq("articleId", args.articleId))
      .first();
    return existing?.count ?? 0;
  },
});

// Get total clap count for an article (sum of per-user counts)
export const totalClapsForArticle = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("claps")
      .withIndex("by_article", (q) => q.eq("articleId", args.articleId))
      .collect();
    return rows.reduce((sum, r) => sum + (r.count || 0), 0);
  },
});

// Record that a user has read an article
export const recordArticleRead = mutation({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const existing = await ctx.db
      .query("reads")
      .withIndex("by_user_article", (q) => q.eq("userId", userId).eq("articleId", args.articleId))
      .first();
    if (existing) return existing._id;
    const id = await ctx.db.insert("reads", { userId, articleId: args.articleId, createdAt: Date.now() });
    return id;
  },
});

// Check if current user has read an article
export const hasReadArticle = query({
  args: { articleId: v.id("articles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const existing = await ctx.db
      .query("reads")
      .withIndex("by_user_article", (q) => q.eq("userId", userId).eq("articleId", args.articleId))
      .first();
    return !!existing;
  },
});

// Get like count for reels (simple count of likes)
export const getReelLikeCount = query({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("reelId"), args.reelId))
      .collect();
    return likes.length;
  },
});

// Like/Unlike Stream
export const likeStream = mutation({
  args: { streamId: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already liked
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_stream", (q) =>
        q.eq("userId", userId).eq("streamId", args.streamId)
      )
      .first();

    if (existingLike) {
      // Unlike
      await ctx.db.delete(existingLike._id);
      return { liked: false };
    } else {
      // Like
      await ctx.db.insert("likes", {
        userId,
        streamId: args.streamId,
        createdAt: Date.now(),
      });

      // Trigger notification for stream provider
      const booking = await ctx.db.get(args.streamId);
      if (booking && booking.providerId !== userId) {
        await ctx.runMutation(internal.notifications.createNotificationEvent, {
          type: 'CONTENT_LIKED',
          recipientUserId: booking.providerId,
          actorUserId: userId,
          relatedContentType: 'stream',
          relatedContentId: args.streamId,
        });
      }

      return { liked: true };
    }
  },
});

// Bookmark/Unbookmark Stream
export const bookmarkStream = mutation({
  args: { streamId: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if already bookmarked
    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("streamId"), args.streamId))
      .first();

    if (existingBookmark) {
      // Remove bookmark
      await ctx.db.delete(existingBookmark._id);
      return { bookmarked: false };
    } else {
      // Add bookmark
      await ctx.db.insert("bookmarks", {
        userId,
        streamId: args.streamId,
        createdAt: Date.now(),
      });
      return { bookmarked: true };
    }
  },
});

// Get like count for streams
export const getStreamLikeCount = query({
  args: { streamId: v.id("bookings") },
  handler: async (ctx, args) => {
    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("streamId"), args.streamId))
      .collect();
    return likes.length;
  },
});

// Get comments by author (for user interests tracking)
export const getCommentsByAuthor = query({
  args: { authorId: v.id("users") },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("authorId"), args.authorId))
      .order("desc")
      .collect();

    return comments;
  },
});