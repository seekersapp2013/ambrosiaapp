import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Add a comment to a live stream
export const addStreamComment = mutation({
  args: {
    bookingId: v.id("bookings"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const commentId = await ctx.db.insert("comments", {
      authorId: userId,
      content: args.content,
      createdAt: Date.now(),
    });

    return {
      _id: commentId,
      authorId: userId,
      content: args.content,
      createdAt: Date.now(),
      author: {
        name: profile?.name,
        username: profile?.username || user?.email || "Anonymous",
        avatar: profile?.avatar,
      },
    };
  },
});

// Get comments for a live stream
export const getStreamComments = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .order("desc")
      .take(50);

    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", comment.authorId))
          .first();

        const user = await ctx.db.get(comment.authorId);

        return {
          ...comment,
          author: {
            name: profile?.name,
            username: profile?.username || user?.email || "Anonymous",
            avatar: profile?.avatar,
          },
        };
      })
    );

    return commentsWithAuthors;
  },
});

// Toggle like for a live stream
export const toggleStreamLike = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existingLike = await ctx.db
      .query("likes")
      .withIndex("by_user_article", (q) => q.eq("userId", userId))
      .first();

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      return { liked: false };
    } else {
      await ctx.db.insert("likes", {
        userId: userId,
        createdAt: Date.now(),
      });
      return { liked: true };
    }
  },
});

// Get like count and user's like status for a live stream
export const getStreamLikes = query({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    const totalLikes = await ctx.db
      .query("likes")
      .collect()
      .then(likes => likes.length);

    let isLiked = false;
    if (userId) {
      const userLike = await ctx.db
        .query("likes")
        .withIndex("by_user_article", (q) => q.eq("userId", userId))
        .first();
      isLiked = !!userLike;
    }

    return {
      count: totalLikes,
      isLiked,
    };
  },
});

// Update broadcast mode
export const updateBroadcastMode = mutation({
  args: {
    bookingId: v.id("bookings"),
    mode: v.union(v.literal("one-to-one"), v.literal("one-to-many")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.providerId !== userId) {
      throw new Error("Only the provider can change broadcast mode");
    }

    await ctx.db.patch(args.bookingId, {
      sessionType: args.mode === "one-to-one" ? "ONE_ON_ONE" : "ONE_TO_MANY",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});