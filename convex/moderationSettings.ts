import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { hasPermission, getUserActiveRoles, logModerationAction } from "./moderationHelpers";

// Get current moderation settings
export const getModerationSettings = query({
  handler: async (ctx) => {
    const settings = await ctx.db.query("moderationSettings").first();
    
    if (!settings) {
      return {
        articlesRequireApproval: true,
        reelsRequireApproval: true,
        circlesRequireApproval: true,
        expertRequestsRequireApproval: true,
        bookingSubscribersRequireApproval: true,
      };
    }

    return settings;
  },
});

// Update moderation settings
export const updateModerationSettings = mutation({
  args: {
    articlesRequireApproval: v.optional(v.boolean()),
    reelsRequireApproval: v.optional(v.boolean()),
    circlesRequireApproval: v.optional(v.boolean()),
    expertRequestsRequireApproval: v.optional(v.boolean()),
    bookingSubscribersRequireApproval: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to manage moderation settings
    if (!(await hasPermission(ctx, userId, "manage_moderation_settings"))) {
      throw new Error("You don't have permission to manage moderation settings");
    }

    const existingSettings = await ctx.db.query("moderationSettings").first();

    const updateData: any = {
      updatedBy: userId,
      updatedAt: Date.now(),
    };

    if (args.articlesRequireApproval !== undefined) {
      updateData.articlesRequireApproval = args.articlesRequireApproval;
    }
    if (args.reelsRequireApproval !== undefined) {
      updateData.reelsRequireApproval = args.reelsRequireApproval;
    }
    if (args.circlesRequireApproval !== undefined) {
      updateData.circlesRequireApproval = args.circlesRequireApproval;
    }
    if (args.expertRequestsRequireApproval !== undefined) {
      updateData.expertRequestsRequireApproval = args.expertRequestsRequireApproval;
    }
    if (args.bookingSubscribersRequireApproval !== undefined) {
      updateData.bookingSubscribersRequireApproval = args.bookingSubscribersRequireApproval;
    }

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, updateData);
    } else {
      // Create settings if they don't exist
      await ctx.db.insert("moderationSettings", {
        articlesRequireApproval: args.articlesRequireApproval ?? true,
        reelsRequireApproval: args.reelsRequireApproval ?? true,
        circlesRequireApproval: args.circlesRequireApproval ?? true,
        expertRequestsRequireApproval: args.expertRequestsRequireApproval ?? true,
        bookingSubscribersRequireApproval: args.bookingSubscribersRequireApproval ?? true,
        primaryAdminUserId: userId,
        updatedBy: userId,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      });
    }

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_moderation_settings"));

    // Log the action
    await logModerationAction(ctx, {
      actionType: "UPDATE_SETTINGS",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: "Updated moderation settings",
      metadata: { changes: updateData },
    });

    return { success: true, message: "Moderation settings updated successfully" };
  },
});

// Toggle article approval requirement
export const toggleArticleApproval = mutation({
  args: { requireApproval: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!(await hasPermission(ctx, userId, "manage_moderation_settings"))) {
      throw new Error("You don't have permission to manage moderation settings");
    }

    const settings = await ctx.db.query("moderationSettings").first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        articlesRequireApproval: args.requireApproval,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    }

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_moderation_settings"));

    await logModerationAction(ctx, {
      actionType: "UPDATE_SETTINGS",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: `${args.requireApproval ? "Enabled" : "Disabled"} article approval requirement`,
    });

    return { success: true };
  },
});

// Toggle reel approval requirement
export const toggleReelApproval = mutation({
  args: { requireApproval: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!(await hasPermission(ctx, userId, "manage_moderation_settings"))) {
      throw new Error("You don't have permission to manage moderation settings");
    }

    const settings = await ctx.db.query("moderationSettings").first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        reelsRequireApproval: args.requireApproval,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    }

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_moderation_settings"));

    await logModerationAction(ctx, {
      actionType: "UPDATE_SETTINGS",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: `${args.requireApproval ? "Enabled" : "Disabled"} reel approval requirement`,
    });

    return { success: true };
  },
});

// Toggle circle approval requirement
export const toggleCircleApproval = mutation({
  args: { requireApproval: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!(await hasPermission(ctx, userId, "manage_moderation_settings"))) {
      throw new Error("You don't have permission to manage moderation settings");
    }

    const settings = await ctx.db.query("moderationSettings").first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        circlesRequireApproval: args.requireApproval,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    }

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_moderation_settings"));

    await logModerationAction(ctx, {
      actionType: "UPDATE_SETTINGS",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: `${args.requireApproval ? "Enabled" : "Disabled"} circle approval requirement`,
    });

    return { success: true };
  },
});

// Toggle expert request approval requirement
export const toggleExpertRequestApproval = mutation({
  args: { requireApproval: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!(await hasPermission(ctx, userId, "manage_moderation_settings"))) {
      throw new Error("You don't have permission to manage moderation settings");
    }

    const settings = await ctx.db.query("moderationSettings").first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        expertRequestsRequireApproval: args.requireApproval,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    }

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_moderation_settings"));

    await logModerationAction(ctx, {
      actionType: "UPDATE_SETTINGS",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: `${args.requireApproval ? "Enabled" : "Disabled"} expert request approval requirement`,
    });

    return { success: true };
  },
});

// Toggle booking subscriber approval requirement
export const toggleBookingSubscriberApproval = mutation({
  args: { requireApproval: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!(await hasPermission(ctx, userId, "manage_moderation_settings"))) {
      throw new Error("You don't have permission to manage moderation settings");
    }

    const settings = await ctx.db.query("moderationSettings").first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        bookingSubscribersRequireApproval: args.requireApproval,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    }

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_moderation_settings"));

    await logModerationAction(ctx, {
      actionType: "UPDATE_SETTINGS",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: `${args.requireApproval ? "Enabled" : "Disabled"} booking subscriber approval requirement`,
    });

    return { success: true };
  },
});

// Check if a specific feature requires approval
export const doesFeatureRequireApproval = query({
  args: { featureType: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("moderationSettings").first();

    if (!settings) {
      // Default to requiring approval if settings don't exist
      return true;
    }

    switch (args.featureType) {
      case "articles":
        return settings.articlesRequireApproval;
      case "reels":
        return settings.reelsRequireApproval;
      case "circles":
        return settings.circlesRequireApproval;
      case "expertRequests":
        return settings.expertRequestsRequireApproval;
      case "bookingSubscribers":
        return settings.bookingSubscribersRequireApproval;
      default:
        return true;
    }
  },
});
