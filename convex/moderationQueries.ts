import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if moderation system needs setup (no primary admin exists)
export const needsModerationSetup = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    // Check if there's a primary admin
    const primaryAdmin = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_primary_admin", (q) => q.eq("isPrimaryAdmin", true))
      .first();

    // If no primary admin exists, the current user should see the setup button
    if (!primaryAdmin) {
      // Check if this is the first user (should be the one to set up)
      const allUsers = await ctx.db.query("users").collect();
      return allUsers.length === 1 && allUsers[0]._id === userId;
    }

    return false;
  },
});

// Get my pending expert requests
export const getMyPendingExpertRequests = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("expertRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .order("desc")
      .collect();

    return requests;
  },
});

// Get my pending booking subscriber application
export const getMyPendingBookingSubscriber = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .first();

    return subscriber;
  },
});

// Get all my pending content (articles, reels, circles, expert requests, booking subscriber)
export const getAllMyPendingContent = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        articles: [],
        reels: [],
        circles: [],
        expertRequests: [],
        bookingSubscriber: null,
        totalPending: 0,
      };
    }

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .collect();

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .collect();

    const circles = await ctx.db
      .query("circles")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .collect();

    const expertRequests = await ctx.db
      .query("expertRequests")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .collect();

    const bookingSubscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .first();

    const totalPending =
      articles.length +
      reels.length +
      circles.length +
      expertRequests.length +
      (bookingSubscriber ? 1 : 0);

    return {
      articles,
      reels,
      circles,
      expertRequests,
      bookingSubscriber,
      totalPending,
    };
  },
});
