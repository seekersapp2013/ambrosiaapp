import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Valid privacy levels for who can message
const VALID_PRIVACY_LEVELS = ["everyone", "followers", "following", "mutual_follows", "none"] as const;
type PrivacyLevel = typeof VALID_PRIVACY_LEVELS[number];

// Get user's chat privacy settings
export const getChatPrivacySettings = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const settings = await ctx.db
      .query("chatPrivacySettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Return default settings if none exist
    if (!settings) {
      return {
        whoCanMessage: "everyone" as PrivacyLevel,
        allowMessagesFromArticles: true,
        allowMessagesFromBookings: true,
        autoAcceptFromFollowing: true,
      };
    }

    return settings;
  },
});

// Update chat privacy settings
export const updateChatPrivacySettings = mutation({
  args: {
    whoCanMessage: v.union(
      v.literal("everyone"),
      v.literal("followers"), 
      v.literal("following"),
      v.literal("mutual_follows"),
      v.literal("none")
    ),
    allowMessagesFromArticles: v.boolean(),
    allowMessagesFromBookings: v.boolean(),
    autoAcceptFromFollowing: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate privacy level
    if (!VALID_PRIVACY_LEVELS.includes(args.whoCanMessage as PrivacyLevel)) {
      throw new Error("Invalid privacy level");
    }

    const existingSettings = await ctx.db
      .query("chatPrivacySettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        ...args,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("chatPrivacySettings", {
        userId,
        ...args,
        createdAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Check if a user can message another user based on privacy settings
export const canUserMessage = query({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      return false;
    }

    // Users can always message themselves
    if (currentUserId === args.targetUserId) {
      return true;
    }

    // Get target user's privacy settings
    const targetSettings = await ctx.db
      .query("chatPrivacySettings")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .first();

    const privacyLevel = targetSettings?.whoCanMessage || "everyone";

    switch (privacyLevel) {
      case "everyone":
        return true;
      
      case "none":
        return false;
      
      case "followers":
        // Check if current user follows the target user
        const isFollowing = await ctx.db
          .query("follows")
          .withIndex("by_follower", (q) => q.eq("followerId", currentUserId))
          .filter((q) => q.eq(q.field("followingId"), args.targetUserId))
          .first();
        return !!isFollowing;
      
      case "following":
        // Check if target user follows the current user
        const isFollowed = await ctx.db
          .query("follows")
          .withIndex("by_follower", (q) => q.eq("followerId", args.targetUserId))
          .filter((q) => q.eq(q.field("followingId"), currentUserId))
          .first();
        return !!isFollowed;
      
      case "mutual_follows":
        // Check if they follow each other
        const mutualFollow1 = await ctx.db
          .query("follows")
          .withIndex("by_follower", (q) => q.eq("followerId", currentUserId))
          .filter((q) => q.eq(q.field("followingId"), args.targetUserId))
          .first();
        
        const mutualFollow2 = await ctx.db
          .query("follows")
          .withIndex("by_follower", (q) => q.eq("followerId", args.targetUserId))
          .filter((q) => q.eq(q.field("followingId"), currentUserId))
          .first();
        
        return !!(mutualFollow1 && mutualFollow2);
      
      default:
        return false;
    }
  },
});