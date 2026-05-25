// One-time setup script to initialize moderation system for existing users
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ensurePrimaryAdminExists } from "./moderationHelpers";

// Manual setup function - call this once to initialize the moderation system
export const setupModerationSystem = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    console.log("Setting up moderation system...");

    // Check if already set up
    const existingPrimaryAdmin = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_primary_admin", (q) => q.eq("isPrimaryAdmin", true))
      .first();

    if (existingPrimaryAdmin) {
      return {
        success: true,
        message: "Moderation system already initialized",
        primaryAdminUserId: existingPrimaryAdmin.userId,
      };
    }

    // Initialize the system
    const success = await ensurePrimaryAdminExists(ctx);

    if (success) {
      const primaryAdmin = await ctx.db
        .query("moderationAssignments")
        .withIndex("by_primary_admin", (q) => q.eq("isPrimaryAdmin", true))
        .first();

      return {
        success: true,
        message: "Moderation system initialized successfully",
        primaryAdminUserId: primaryAdmin?.userId,
      };
    }

    return {
      success: false,
      message: "Failed to initialize moderation system",
    };
  },
});

// Check moderation system status
export const checkModerationStatus = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check for primary admin
    const primaryAdmin = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_primary_admin", (q) => q.eq("isPrimaryAdmin", true))
      .first();

    // Check for settings
    const settings = await ctx.db.query("moderationSettings").first();

    // Check for roles
    const roles = await ctx.db.query("moderationRoles").collect();

    // Check user's roles
    const myAssignments = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .collect();

    const myRoles = await Promise.all(
      myAssignments.map(async (assignment) => {
        const role = await ctx.db.get(assignment.roleId);
        return role ? { ...role, isPrimaryAdmin: assignment.isPrimaryAdmin } : null;
      })
    );

    return {
      isInitialized: !!primaryAdmin,
      primaryAdminUserId: primaryAdmin?.userId,
      hasSettings: !!settings,
      totalRoles: roles.length,
      myRoles: myRoles.filter((r) => r !== null),
      currentUserId: userId,
    };
  },
});
