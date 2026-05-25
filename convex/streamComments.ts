import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Add a comment to a live stream
export const addStreamComment = mutation({
  args: {
    streamId: v.id("bookings"),
    content: v.string(),
    parentId: v.optional(v.id("streamComments")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Comment cannot be empty");
    }

    if (args.content.length > 500) {
      throw new Error("Comment too long (max 500 characters)");
    }

    // Check if stream exists
    const stream = await ctx.db.get(args.streamId);
    if (!stream) {
      throw new Error("Stream not found");
    }

    // Create the comment
    const commentId = await ctx.db.insert("streamComments", {
      streamId: args.streamId,
      authorId: userId,
      parentId: args.parentId,
      content: args.content.trim(),
      createdAt: Date.now(),
    });

    return commentId;
  },
});

// Get comments for a stream
export const getStreamComments = query({
  args: {
    streamId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("streamComments")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .order("desc")
      .take(100);

    // Get author profiles for each comment
    const commentsWithAuthors = await Promise.all(
      comments.map(async (comment) => {
        const authorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", comment.authorId))
          .first();

        const author = await ctx.db.get(comment.authorId);

        return {
          ...comment,
          author: {
            _id: comment.authorId,
            name: authorProfile?.name || author?.name || "Anonymous",
            username: authorProfile?.username || "user",
            avatar: authorProfile?.avatar,
          },
        };
      })
    );

    return commentsWithAuthors.reverse(); // Show oldest first for live chat feel
  },
});

// Delete a comment (only by author)
export const deleteStreamComment = mutation({
  args: {
    commentId: v.id("streamComments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    if (comment.authorId !== userId) {
      throw new Error("Not authorized to delete this comment");
    }

    await ctx.db.delete(args.commentId);
    return { success: true };
  },
});

// Get comment count for a stream
export const getStreamCommentCount = query({
  args: {
    streamId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("streamComments")
      .withIndex("by_stream", (q) => q.eq("streamId", args.streamId))
      .collect();

    return comments.length;
  },
});