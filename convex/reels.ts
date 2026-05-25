import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Create a new reel
export const createReel = mutation({
  args: {
    video: v.string(), // storage id
    poster: v.optional(v.string()), // storage id
    durationS: v.optional(v.number()),
    caption: v.optional(v.string()),
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

    // Check if reels require approval
    const settings = await ctx.db.query("moderationSettings").first();
    const requiresApproval = settings?.reelsRequireApproval ?? true;

    const now = Date.now();

    const reelId = await ctx.db.insert("reels", {
      authorId: userId,
      video: args.video,
      poster: args.poster,
      durationS: args.durationS,
      caption: args.caption,
      tags: args.tags,
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

    // If approval is required, create approval record
    if (requiresApproval) {
      await ctx.db.insert("contentApprovals", {
        contentType: "reels",
        contentId: reelId,
        status: "PENDING",
        submittedBy: userId,
        createdAt: now,
      });
    } else {
      // Only notify followers if reel is published immediately
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
          relatedContentType: 'reel',
          relatedContentId: reelId,
        });
      }
    }

    return reelId;
  },
});

// Get reel by ID
export const getReel = query({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const reel = await ctx.db.get(args.reelId);
    if (!reel) return null;

    // Get author info
    const author = await ctx.db.get(reel.authorId);
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("userId"), reel.authorId))
      .first();

    return {
      ...reel,
      author: {
        id: author?._id,
        name: author?.name || profile?.name,
        username: profile?.username,
        avatar: profile?.avatar,
      },
    };
  },
});

// Get reel by ID (alias for consistency)
export const getReelById = query({
  args: { reelId: v.id("reels") },
  handler: async (ctx, args) => {
    const reel = await ctx.db.get(args.reelId);
    if (!reel) return null;

    // Get author info
    const author = await ctx.db.get(reel.authorId);
    const profile = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("userId"), reel.authorId))
      .first();

    return {
      ...reel,
      author: {
        id: author?._id,
        name: author?.name || profile?.name,
        username: profile?.username,
        avatar: profile?.avatar,
      },
    };
  },
});

// List reels for feed (only public reels)
export const listReels = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_created", (q) => q)
      .order("desc")
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
      .take(limit);

    // Get author info for each reel
    const reelsWithAuthors = await Promise.all(
      reels.map(async (reel) => {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), reel.authorId))
          .first();

        return {
          ...reel,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return reelsWithAuthors;
  },
});

// Get reels by author
export const getReelsByAuthor = query({
  args: { authorId: v.id("users") },
  handler: async (ctx, args) => {
    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .order("desc")
      .collect();

    return reels;
  },
});

// Set gating for a reel
export const setGating = mutation({
  args: {
    reelId: v.id("reels"),
    isGated: v.boolean(),
    priceToken: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reel = await ctx.db.get(args.reelId);
    if (!reel) throw new Error("Reel not found");
    if (reel.authorId !== userId) throw new Error("Not authorized");

    await ctx.db.patch(args.reelId, {
      isGated: args.isGated,
      priceToken: args.priceToken,
      priceAmount: args.priceAmount,
    });

    return args.reelId;
  },
});

// Search reels
export const searchReels = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const reels = await ctx.db
      .query("reels")
      .filter((q) =>
        q.eq(q.field("caption"), args.query)
      )
      .take(20);

    // Get author info for each reel
    const reelsWithAuthors = await Promise.all(
      reels.map(async (reel) => {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), reel.authorId))
          .first();

        return {
          ...reel,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return reelsWithAuthors;
  },
});

// Delete reel (permanently remove from database)
export const deleteReel = mutation({
  args: {
    reelId: v.id("reels")
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const reel = await ctx.db.get(args.reelId);
    if (!reel) {
      throw new Error("Reel not found");
    }

    // Only the reel author can delete their reel
    if (reel.authorId !== userId) {
      throw new Error("Not authorized to delete this reel");
    }

    // Get all related data that needs to be cleaned up
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_reel", (q) => q.eq("reelId", args.reelId))
      .collect();

    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("reelId"), args.reelId))
      .collect();

    const bookmarks = await ctx.db
      .query("bookmarks")
      .filter((q) => q.eq(q.field("reelId"), args.reelId))
      .collect();

    const payments = await ctx.db
      .query("payments")
      .withIndex("by_content", (q) => q.eq("contentType", "reel").eq("contentId", args.reelId))
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

    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    // Delete the reel itself
    await ctx.db.delete(args.reelId);

    return { 
      success: true, 
      deletedComments: comments.length,
      deletedLikes: likes.length,
      deletedBookmarks: bookmarks.length,
      deletedPayments: payments.length
    };
  }
});

// List reels created by current user
export const listMyReels = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 20;

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .order("desc")
      .take(limit);

    // Get author info for each reel
    const reelsWithAuthors = await Promise.all(
      reels.map(async (reel) => {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), reel.authorId))
          .first();

        return {
          ...reel,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return reelsWithAuthors;
  },
});

// Get pending reels for current user
export const getMyPendingReels = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .order("desc")
      .collect();

    return reels;
  },
});
