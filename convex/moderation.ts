import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import {
  isPrimaryAdmin,
  isAdmin,
  hasPermission,
  canApproveContentType,
  getUserActiveRoles,
  logModerationAction,
  ensurePrimaryAdminExists,
} from "./moderationHelpers";

// Initialize moderation system (run once on first user creation)
export const initializeModerationSystem = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const success = await ensurePrimaryAdminExists(ctx);
    return { success, message: success ? "Moderation system initialized" : "Failed to initialize" };
  },
});

// Get the primary admin user
export const getPrimaryAdmin = query({
  handler: async (ctx) => {
    const assignment = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_primary_admin", (q) => q.eq("isPrimaryAdmin", true))
      .first();

    if (!assignment) {
      return null;
    }

    const user = await ctx.db.get(assignment.userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", assignment.userId))
      .first();

    return {
      userId: assignment.userId,
      user,
      profile,
      assignedAt: assignment.assignedAt,
    };
  },
});

// Create a new moderation role
export const createModerationRole = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    permissions: v.array(v.string()),
    canApprove: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to manage roles
    if (!(await hasPermission(ctx, userId, "manage_roles"))) {
      throw new Error("You don't have permission to create roles");
    }

    // Check if role name already exists
    const existingRole = await ctx.db
      .query("moderationRoles")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existingRole) {
      throw new Error("A role with this name already exists");
    }

    const roleId = await ctx.db.insert("moderationRoles", {
      name: args.name,
      description: args.description,
      permissions: args.permissions,
      canApprove: args.canApprove,
      isSystemRole: false,
      createdBy: userId,
      createdAt: Date.now(),
    });

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_roles"));

    // Log the action
    await logModerationAction(ctx, {
      actionType: "CREATE_ROLE",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: `Created role: ${args.name}`,
      metadata: { roleId, roleName: args.name },
    });

    return { roleId, message: "Role created successfully" };
  },
});

// Update a moderation role
export const updateModerationRole = mutation({
  args: {
    roleId: v.id("moderationRoles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    permissions: v.optional(v.array(v.string())),
    canApprove: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to manage roles
    if (!(await hasPermission(ctx, userId, "manage_roles"))) {
      throw new Error("You don't have permission to update roles");
    }

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Cannot edit system roles
    if (role.isSystemRole) {
      throw new Error("System roles cannot be modified");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      // Check if new name conflicts with existing role
      const existingRole = await ctx.db
        .query("moderationRoles")
        .withIndex("by_name", (q) => q.eq("name", args.name!))
        .first();

      if (existingRole && existingRole._id !== args.roleId) {
        throw new Error("A role with this name already exists");
      }
      updateData.name = args.name;
    }

    if (args.description !== undefined) updateData.description = args.description;
    if (args.permissions !== undefined) updateData.permissions = args.permissions;
    if (args.canApprove !== undefined) updateData.canApprove = args.canApprove;

    await ctx.db.patch(args.roleId, updateData);

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_roles"));

    // Log the action
    await logModerationAction(ctx, {
      actionType: "UPDATE_SETTINGS",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: `Updated role: ${role.name}`,
      metadata: { roleId: args.roleId, updates: updateData },
    });

    return { success: true, message: "Role updated successfully" };
  },
});

// Delete a moderation role
export const deleteModerationRole = mutation({
  args: { roleId: v.id("moderationRoles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to manage roles
    if (!(await hasPermission(ctx, userId, "manage_roles"))) {
      throw new Error("You don't have permission to delete roles");
    }

    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Cannot delete system roles
    if (role.isSystemRole) {
      throw new Error("System roles cannot be deleted");
    }

    // Check if role is assigned to any users
    const assignments = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_role", (q) => q.eq("roleId", args.roleId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (assignments.length > 0) {
      throw new Error("Cannot delete a role that is assigned to users. Remove all assignments first.");
    }

    await ctx.db.delete(args.roleId);

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, userId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_roles"));

    // Log the action
    await logModerationAction(ctx, {
      actionType: "DELETE_ROLE",
      performedBy: userId,
      performerRole: performerRole?._id,
      reason: `Deleted role: ${role.name}`,
      metadata: { roleId: args.roleId, roleName: role.name },
    });

    return { success: true, message: "Role deleted successfully" };
  },
});

// List all moderation roles
export const listModerationRoles = query({
  handler: async (ctx) => {
    const roles = await ctx.db.query("moderationRoles").collect();

    const rolesWithDetails = await Promise.all(
      roles.map(async (role) => {
        const creator = await ctx.db.get(role.createdBy);
        const creatorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", role.createdBy))
          .first();

        // Count active assignments
        const assignmentCount = await ctx.db
          .query("moderationAssignments")
          .withIndex("by_role", (q) => q.eq("roleId", role._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect()
          .then((assignments) => assignments.length);

        return {
          ...role,
          creator: {
            id: role.createdBy,
            name: creator?.name || creatorProfile?.name,
            username: creatorProfile?.username,
          },
          assignmentCount,
        };
      })
    );

    return rolesWithDetails;
  },
});

// Assign role to user
export const assignRoleToUser = mutation({
  args: {
    userId: v.id("users"),
    roleId: v.id("moderationRoles"),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const performerId = await getAuthUserId(ctx);
    if (!performerId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to manage roles
    if (!(await hasPermission(ctx, performerId, "manage_roles"))) {
      throw new Error("You don't have permission to assign roles");
    }

    // Check if role exists
    const role = await ctx.db.get(args.roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Cannot assign Primary Admin role (it's automatically assigned to first user)
    if (role.isSystemRole && role.name === "Primary Admin") {
      throw new Error("Primary Admin role cannot be manually assigned");
    }

    // Check if user already has this role
    const existingAssignment = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .filter((q) => q.eq(q.field("roleId"), args.roleId))
      .first();

    if (existingAssignment) {
      throw new Error("User already has this role");
    }

    const assignmentId = await ctx.db.insert("moderationAssignments", {
      userId: args.userId,
      roleId: args.roleId,
      assignedBy: performerId,
      assignedAt: Date.now(),
      isActive: true,
      isPrimaryAdmin: false,
      expiresAt: args.expiresAt,
    });

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, performerId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_roles"));

    // Log the action
    await logModerationAction(ctx, {
      actionType: "ASSIGN_ROLE",
      performedBy: performerId,
      performerRole: performerRole?._id,
      targetUserId: args.userId,
      reason: `Assigned role: ${role.name}`,
      metadata: { roleId: args.roleId, roleName: role.name, assignmentId },
    });

    return { assignmentId, message: "Role assigned successfully" };
  },
});

// Remove role from user
export const removeRoleFromUser = mutation({
  args: { assignmentId: v.id("moderationAssignments") },
  handler: async (ctx, args) => {
    const performerId = await getAuthUserId(ctx);
    if (!performerId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to manage roles
    if (!(await hasPermission(ctx, performerId, "manage_roles"))) {
      throw new Error("You don't have permission to remove roles");
    }

    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) {
      throw new Error("Assignment not found");
    }

    // Cannot remove Primary Admin role
    if (assignment.isPrimaryAdmin) {
      throw new Error("Primary Admin role cannot be removed");
    }

    await ctx.db.patch(args.assignmentId, {
      isActive: false,
    });

    const role = await ctx.db.get(assignment.roleId);

    // Get the role used for this action
    const userRoles = await getUserActiveRoles(ctx, performerId);
    const performerRole = userRoles.find((r) => r.permissions.includes("manage_roles"));

    // Log the action
    await logModerationAction(ctx, {
      actionType: "REMOVE_ROLE",
      performedBy: performerId,
      performerRole: performerRole?._id,
      targetUserId: assignment.userId,
      reason: `Removed role: ${role?.name}`,
      metadata: { roleId: assignment.roleId, roleName: role?.name, assignmentId: args.assignmentId },
    });

    return { success: true, message: "Role removed successfully" };
  },
});

// Assign admin role (special function for Primary Admin)
export const assignAdminRole = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const performerId = await getAuthUserId(ctx);
    if (!performerId) {
      throw new Error("Not authenticated");
    }

    // Only Primary Admin can assign other admins
    if (!(await isPrimaryAdmin(ctx, performerId))) {
      throw new Error("Only the Primary Admin can assign other administrators");
    }

    // Find or create an "Admin" role
    let adminRole = await ctx.db
      .query("moderationRoles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      // Create Admin role
      const roleId = await ctx.db.insert("moderationRoles", {
        name: "Admin",
        description: "Administrator with full permissions except Primary Admin privileges",
        permissions: [
          "approve_articles",
          "approve_reels",
          "approve_circles",
          "approve_experts",
          "approve_booking_subscribers",
          "delete_content",
          "ban_users",
          "manage_roles",
          "view_reports",
          "manage_moderation_settings",
        ],
        canApprove: ["articles", "reels", "circles", "expertRequests", "bookingSubscribers"],
        isSystemRole: false,
        createdBy: performerId,
        createdAt: Date.now(),
      });
      adminRole = await ctx.db.get(roleId);
    }

    if (!adminRole) {
      throw new Error("Failed to create Admin role");
    }

    // Check if user already has admin role
    const existingAssignment = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .filter((q) => q.eq(q.field("roleId"), adminRole!._id))
      .first();

    if (existingAssignment) {
      throw new Error("User is already an administrator");
    }

    const assignmentId = await ctx.db.insert("moderationAssignments", {
      userId: args.userId,
      roleId: adminRole._id,
      assignedBy: performerId,
      assignedAt: Date.now(),
      isActive: true,
      isPrimaryAdmin: false,
    });

    // Get the Primary Admin role
    const userRoles = await getUserActiveRoles(ctx, performerId);
    const performerRole = userRoles.find((r) => r.isPrimaryAdmin);

    // Log the action
    await logModerationAction(ctx, {
      actionType: "ASSIGN_ROLE",
      performedBy: performerId,
      performerRole: performerRole?._id,
      targetUserId: args.userId,
      reason: "Assigned as Administrator",
      metadata: { roleId: adminRole._id, roleName: "Admin", assignmentId },
    });

    return { assignmentId, message: "User assigned as administrator successfully" };
  },
});

// Get user's roles
export const getUserRoles = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await getUserActiveRoles(ctx, args.userId);
  },
});

// Get current user's roles
export const getMyRoles = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await getUserActiveRoles(ctx, userId);
  },
});

// Get user's permissions (aggregated from all roles)
export const getUserPermissions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const roles = await getUserActiveRoles(ctx, args.userId);
    const permissions = new Set<string>();

    for (const role of roles) {
      role.permissions.forEach((p) => permissions.add(p));
    }

    return Array.from(permissions);
  },
});

// Check if user has a specific permission
export const checkUserPermission = query({
  args: {
    userId: v.id("users"),
    permission: v.string(),
  },
  handler: async (ctx, args) => {
    return await hasPermission(ctx, args.userId, args.permission);
  },
});

// Check if user can approve a specific content type
export const canUserApproveContentType = query({
  args: {
    userId: v.id("users"),
    contentType: v.string(),
  },
  handler: async (ctx, args) => {
    return await canApproveContentType(ctx, args.userId, args.contentType);
  },
});

// Check if current user is primary admin
export const amIPrimaryAdmin = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    return await isPrimaryAdmin(ctx, userId);
  },
});

// Check if current user is admin
export const amIAdmin = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    return await isAdmin(ctx, userId);
  },
});

// Check if current user is moderator
export const amIModerator = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const assignments = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .collect();

    return assignments.length > 0;
  },
});
