import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Check if user is the primary admin (first user)
export async function isPrimaryAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<boolean> {
  const assignment = await ctx.db
    .query("moderationAssignments")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
    .filter((q) => q.eq(q.field("isPrimaryAdmin"), true))
    .first();

  return !!assignment;
}

// Check if user has admin role
export async function isAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<boolean> {
  // Primary admin is always an admin
  if (await isPrimaryAdmin(ctx, userId)) {
    return true;
  }

  // Check if user has any admin role
  const assignments = await ctx.db
    .query("moderationAssignments")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
    .collect();

  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (role && role.permissions.includes("manage_roles")) {
      return true;
    }
  }

  return false;
}

// Check if user has any moderation role
export async function isModerator(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<boolean> {
  const assignments = await ctx.db
    .query("moderationAssignments")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
    .collect();

  return assignments.length > 0;
}

// Check if user has a specific permission
export async function hasPermission(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  permission: string
): Promise<boolean> {
  // Primary admin has all permissions
  if (await isPrimaryAdmin(ctx, userId)) {
    return true;
  }

  const assignments = await ctx.db
    .query("moderationAssignments")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
    .collect();

  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (role && role.permissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

// Check if user can approve a specific content type
export async function canApproveContentType(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  contentType: string
): Promise<{ canApprove: boolean; roleId?: Id<"moderationRoles"> }> {
  // Primary admin can approve everything
  if (await isPrimaryAdmin(ctx, userId)) {
    const primaryAdminAssignment = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
      .filter((q) => q.eq(q.field("isPrimaryAdmin"), true))
      .first();
    
    return { 
      canApprove: true, 
      roleId: primaryAdminAssignment?.roleId 
    };
  }

  const assignments = await ctx.db
    .query("moderationAssignments")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
    .collect();

  for (const assignment of assignments) {
    const role = await ctx.db.get(assignment.roleId);
    if (role && role.canApprove.includes(contentType)) {
      return { canApprove: true, roleId: role._id };
    }
  }

  return { canApprove: false };
}

// Get all active roles for a user
export async function getUserActiveRoles(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
) {
  const assignments = await ctx.db
    .query("moderationAssignments")
    .withIndex("by_user_active", (q) => q.eq("userId", userId).eq("isActive", true))
    .collect();

  const roles = await Promise.all(
    assignments.map(async (assignment) => {
      const role = await ctx.db.get(assignment.roleId);
      return role ? { ...role, assignmentId: assignment._id, isPrimaryAdmin: assignment.isPrimaryAdmin } : null;
    })
  );

  return roles.filter((role) => role !== null);
}

// Get the first registered user (by createdAt)
export async function getFirstUser(ctx: QueryCtx | MutationCtx): Promise<Id<"users"> | null> {
  const users = await ctx.db.query("users").collect();
  
  if (users.length === 0) {
    return null;
  }

  // Sort by _creationTime (Convex's built-in creation timestamp)
  const sortedUsers = users.sort((a, b) => a._creationTime - b._creationTime);
  return sortedUsers[0]._id;
}

// Log a moderation action
export async function logModerationAction(
  ctx: MutationCtx,
  action: {
    actionType: string;
    performedBy: Id<"users">;
    performerRole?: Id<"moderationRoles">;
    targetUserId?: Id<"users">;
    targetContentType?: string;
    targetContentId?: string;
    reason?: string;
    metadata?: any;
  }
) {
  await ctx.db.insert("moderationActions", {
    actionType: action.actionType,
    performedBy: action.performedBy,
    performerRole: action.performerRole,
    targetUserId: action.targetUserId,
    targetContentType: action.targetContentType,
    targetContentId: action.targetContentId,
    reason: action.reason,
    metadata: action.metadata,
    createdAt: Date.now(),
  });
}

// Ensure primary admin exists (run on app startup)
export async function ensurePrimaryAdminExists(ctx: MutationCtx): Promise<boolean> {
  // Check if primary admin already exists
  const existingPrimaryAdmin = await ctx.db
    .query("moderationAssignments")
    .withIndex("by_primary_admin", (q) => q.eq("isPrimaryAdmin", true))
    .first();

  if (existingPrimaryAdmin) {
    return true; // Already set up
  }

  // Get the first user
  const firstUserId = await getFirstUser(ctx);
  if (!firstUserId) {
    return false; // No users yet
  }

  // Check if Primary Admin role exists
  let primaryAdminRole = await ctx.db
    .query("moderationRoles")
    .withIndex("by_name", (q) => q.eq("name", "Primary Admin"))
    .first();

  // Create Primary Admin role if it doesn't exist
  if (!primaryAdminRole) {
    const roleId = await ctx.db.insert("moderationRoles", {
      name: "Primary Admin",
      description: "The first user with full administrative privileges. This role cannot be deleted or modified.",
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
        "assign_admins",
        "manage_moderation_settings",
      ],
      canApprove: ["articles", "reels", "circles", "expertRequests", "bookingSubscribers"],
      isSystemRole: true,
      createdBy: firstUserId,
      createdAt: Date.now(),
    });
    primaryAdminRole = await ctx.db.get(roleId);
  }

  if (!primaryAdminRole) {
    return false;
  }

  // Assign Primary Admin role to first user
  await ctx.db.insert("moderationAssignments", {
    userId: firstUserId,
    roleId: primaryAdminRole._id,
    assignedBy: firstUserId,
    assignedAt: Date.now(),
    isActive: true,
    isPrimaryAdmin: true,
  });

  // Create default moderation settings
  const existingSettings = await ctx.db.query("moderationSettings").first();
  if (!existingSettings) {
    await ctx.db.insert("moderationSettings", {
      articlesRequireApproval: true,
      reelsRequireApproval: true,
      circlesRequireApproval: true,
      expertRequestsRequireApproval: true,
      bookingSubscribersRequireApproval: true,
      primaryAdminUserId: firstUserId,
      updatedBy: firstUserId,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });
  }

  // Log the action
  await logModerationAction(ctx, {
    actionType: "ASSIGN_ROLE",
    performedBy: firstUserId,
    performerRole: primaryAdminRole._id,
    targetUserId: firstUserId,
    reason: "Automatic assignment of Primary Admin role to first user",
    metadata: { isSystemInitialization: true },
  });

  return true;
}

// Notify content creator about approval/rejection
export async function notifyContentCreator(
  ctx: MutationCtx,
  notification: {
    userId: Id<"users">;
    type: string;
    title: string;
    message: string;
    contentType?: string;
    contentId?: string;
    actorUserId?: Id<"users">;
    metadata?: any;
  }
) {
  await ctx.db.insert("notifications", {
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    isRead: false,
    category: "system",
    priority: "high",
    relatedContentType: notification.contentType,
    relatedContentId: notification.contentId,
    actorUserId: notification.actorUserId,
    metadata: notification.metadata,
    createdAt: Date.now(),
  });
}
