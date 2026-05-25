import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
  canApproveContentType,
  hasPermission,
  getUserActiveRoles,
  logModerationAction,
  notifyContentCreator,
} from "./moderationHelpers";

// Approve content
export const approveContent = mutation({
  args: {
    contentType: v.string(),
    contentId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user can approve this content type
    const { canApprove, roleId } = await canApproveContentType(ctx, userId, args.contentType);
    if (!canApprove) {
      throw new Error(`You don't have permission to approve ${args.contentType}`);
    }

    const now = Date.now();

    // Find or create approval record
    let approval = await ctx.db
      .query("contentApprovals")
      .withIndex("by_content", (q) => q.eq("contentType", args.contentType).eq("contentId", args.contentId))
      .first();

    if (approval) {
      await ctx.db.patch(approval._id, {
        status: "APPROVED",
        reviewedBy: userId,
        reviewedAt: now,
        approverRole: roleId,
      });
    } else {
      const approvalId = await ctx.db.insert("contentApprovals", {
        contentType: args.contentType,
        contentId: args.contentId,
        status: "APPROVED",
        submittedBy: userId,
        reviewedBy: userId,
        reviewedAt: now,
        approverRole: roleId,
        createdAt: now,
      });
      approval = await ctx.db.get(approvalId);
    }

    // Update the actual content item to PUBLISHED status
    const contentIdTyped = args.contentId as Id<any>;
    
    if (args.contentType === "articles") {
      const article = await ctx.db.get(contentIdTyped as Id<"articles">);
      if (article) {
        await ctx.db.patch(contentIdTyped as Id<"articles">, {
          status: "PUBLISHED",
          publishedAt: now,
          approvalStatus: "APPROVED",
          approvedBy: userId,
          approvedByRole: roleId,
          approvedAt: now,
          updatedAt: now,
        });
        
        // Notify followers about the approved article
        const followers = await ctx.db
          .query("follows")
          .withIndex("by_following", (q) => q.eq("followingId", article.authorId))
          .collect();

        for (const follow of followers) {
          await ctx.runMutation(internal.notifications.createNotificationEvent, {
            type: 'NEW_CONTENT',
            recipientUserId: follow.followerId,
            actorUserId: article.authorId,
            relatedContentType: 'article',
            relatedContentId: args.contentId,
          });
        }
      }
    } else if (args.contentType === "reels") {
      const reel = await ctx.db.get(contentIdTyped as Id<"reels">);
      if (reel) {
        await ctx.db.patch(contentIdTyped as Id<"reels">, {
          approvalStatus: "APPROVED",
          approvedBy: userId,
          approvedByRole: roleId,
          approvedAt: now,
        });
        
        // Notify followers about the approved reel
        const followers = await ctx.db
          .query("follows")
          .withIndex("by_following", (q) => q.eq("followingId", reel.authorId))
          .collect();

        for (const follow of followers) {
          await ctx.runMutation(internal.notifications.createNotificationEvent, {
            type: 'NEW_CONTENT',
            recipientUserId: follow.followerId,
            actorUserId: reel.authorId,
            relatedContentType: 'reel',
            relatedContentId: args.contentId,
          });
        }
      }
    } else if (args.contentType === "circles") {
      const circle = await ctx.db.get(contentIdTyped as Id<"circles">);
      if (circle) {
        await ctx.db.patch(contentIdTyped as Id<"circles">, {
          approvalStatus: "APPROVED",
          approvedBy: userId,
          approvedByRole: roleId,
          approvedAt: now,
          updatedAt: now,
        });
      }
    } else if (args.contentType === "expertRequests") {
      const request = await ctx.db.get(contentIdTyped as Id<"expertRequests">);
      if (request) {
        await ctx.db.patch(contentIdTyped as Id<"expertRequests">, {
          status: "OPEN",
          approvalStatus: "APPROVED",
          approvedBy: userId,
          approvedByRole: roleId,
          approvedAt: now,
          updatedAt: now,
        });
      }
    } else if (args.contentType === "bookingSubscribers") {
      const subscriber = await ctx.db.get(contentIdTyped as Id<"bookingSubscribers">);
      if (subscriber) {
        await ctx.db.patch(contentIdTyped as Id<"bookingSubscribers">, {
          isActive: true,
          approvalStatus: "APPROVED",
          approvedBy: userId,
          approvedByRole: roleId,
          approvedAt: now,
          updatedAt: now,
        });
      }
    }

    // Log the action
    await logModerationAction(ctx, {
      actionType: "APPROVE",
      performedBy: userId,
      performerRole: roleId,
      targetContentType: args.contentType,
      targetContentId: args.contentId,
      reason: `Approved ${args.contentType}`,
    });

    // Notify content creator
    if (approval) {
      await notifyContentCreator(ctx, {
        userId: approval.submittedBy,
        type: "CONTENT_APPROVED",
        title: "Content Approved",
        message: `Your ${args.contentType.slice(0, -1)} has been approved.`,
        contentType: args.contentType,
        contentId: args.contentId,
        actorUserId: userId,
      });
    }

    return { success: true, message: "Content approved successfully" };
  },
});

// Reject content
export const rejectContent = mutation({
  args: {
    contentType: v.string(),
    contentId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const { canApprove, roleId } = await canApproveContentType(ctx, userId, args.contentType);
    if (!canApprove) {
      throw new Error(`You don't have permission to reject ${args.contentType}`);
    }

    const now = Date.now();

    let approval = await ctx.db
      .query("contentApprovals")
      .withIndex("by_content", (q) => q.eq("contentType", args.contentType).eq("contentId", args.contentId))
      .first();

    if (approval) {
      await ctx.db.patch(approval._id, {
        status: "REJECTED",
        reviewedBy: userId,
        reviewedAt: now,
        approverRole: roleId,
        rejectionReason: args.reason,
      });
    }

    // Update the actual content item to REJECTED status
    const contentIdTyped = args.contentId as Id<any>;
    
    if (args.contentType === "articles") {
      const article = await ctx.db.get(contentIdTyped as Id<"articles">);
      if (article) {
        await ctx.db.patch(contentIdTyped as Id<"articles">, {
          approvalStatus: "REJECTED",
          rejectionReason: args.reason,
          updatedAt: now,
        });
      }
    } else if (args.contentType === "reels") {
      const reel = await ctx.db.get(contentIdTyped as Id<"reels">);
      if (reel) {
        await ctx.db.patch(contentIdTyped as Id<"reels">, {
          approvalStatus: "REJECTED",
          rejectionReason: args.reason,
        });
      }
    } else if (args.contentType === "circles") {
      const circle = await ctx.db.get(contentIdTyped as Id<"circles">);
      if (circle) {
        await ctx.db.patch(contentIdTyped as Id<"circles">, {
          approvalStatus: "REJECTED",
          rejectionReason: args.reason,
          updatedAt: now,
        });
      }
    } else if (args.contentType === "expertRequests") {
      const request = await ctx.db.get(contentIdTyped as Id<"expertRequests">);
      if (request) {
        await ctx.db.patch(contentIdTyped as Id<"expertRequests">, {
          status: "CANCELLED",
          approvalStatus: "REJECTED",
          rejectionReason: args.reason,
          updatedAt: now,
        });
      }
    } else if (args.contentType === "bookingSubscribers") {
      const subscriber = await ctx.db.get(contentIdTyped as Id<"bookingSubscribers">);
      if (subscriber) {
        await ctx.db.patch(contentIdTyped as Id<"bookingSubscribers">, {
          isActive: false,
          approvalStatus: "REJECTED",
          rejectionReason: args.reason,
          updatedAt: now,
        });
      }
    }

    await logModerationAction(ctx, {
      actionType: "REJECT",
      performedBy: userId,
      performerRole: roleId,
      targetContentType: args.contentType,
      targetContentId: args.contentId,
      reason: args.reason,
    });

    if (approval) {
      await notifyContentCreator(ctx, {
        userId: approval.submittedBy,
        type: "CONTENT_REJECTED",
        title: "Content Rejected",
        message: `Your ${args.contentType.slice(0, -1)} was rejected. Reason: ${args.reason}`,
        contentType: args.contentType,
        contentId: args.contentId,
        actorUserId: userId,
        metadata: { rejectionReason: args.reason },
      });
    }

    return { success: true, message: "Content rejected successfully" };
  },
});

// Ban user
export const banUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
    banType: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const performerId = await getAuthUserId(ctx);
    if (!performerId) {
      throw new Error("Not authenticated");
    }

    if (!(await hasPermission(ctx, performerId, "ban_users"))) {
      throw new Error("You don't have permission to ban users");
    }

    if (args.userId === performerId) {
      throw new Error("You cannot ban yourself");
    }

    const existingBan = await ctx.db
      .query("userBans")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .first();

    if (existingBan) {
      throw new Error("User is already banned");
    }

    const userRoles = await getUserActiveRoles(ctx, performerId);
    const performerRole = userRoles.find((r) => r.permissions.includes("ban_users"));

    const banId = await ctx.db.insert("userBans", {
      userId: args.userId,
      bannedBy: performerId,
      bannedByRole: performerRole?._id,
      reason: args.reason,
      banType: args.banType,
      expiresAt: args.expiresAt,
      isActive: true,
      createdAt: Date.now(),
    });

    await logModerationAction(ctx, {
      actionType: "BAN",
      performedBy: performerId,
      performerRole: performerRole?._id,
      targetUserId: args.userId,
      reason: args.reason,
      metadata: { banType: args.banType, expiresAt: args.expiresAt },
    });

    await notifyContentCreator(ctx, {
      userId: args.userId,
      type: "ACCOUNT_BANNED",
      title: "Account Banned",
      message: `Your account has been ${args.banType === "PERMANENT" ? "permanently" : "temporarily"} banned. Reason: ${args.reason}`,
      actorUserId: performerId,
      metadata: { banType: args.banType, expiresAt: args.expiresAt, reason: args.reason },
    });

    return { banId, message: "User banned successfully" };
  },
});

// Unban user
export const unbanUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const performerId = await getAuthUserId(ctx);
    if (!performerId) {
      throw new Error("Not authenticated");
    }

    if (!(await hasPermission(ctx, performerId, "ban_users"))) {
      throw new Error("You don't have permission to unban users");
    }

    const activeBan = await ctx.db
      .query("userBans")
      .withIndex("by_user_active", (q) => q.eq("userId", args.userId).eq("isActive", true))
      .first();

    if (!activeBan) {
      throw new Error("User is not currently banned");
    }

    const now = Date.now();

    await ctx.db.patch(activeBan._id, {
      isActive: false,
      unbannedBy: performerId,
      unbannedAt: now,
    });

    const userRoles = await getUserActiveRoles(ctx, performerId);
    const performerRole = userRoles.find((r) => r.permissions.includes("ban_users"));

    await logModerationAction(ctx, {
      actionType: "UNBAN",
      performedBy: performerId,
      performerRole: performerRole?._id,
      targetUserId: args.userId,
      reason: "User unbanned",
    });

    await notifyContentCreator(ctx, {
      userId: args.userId,
      type: "ACCOUNT_UNBANNED",
      title: "Account Unbanned",
      message: "Your account has been unbanned.",
      actorUserId: performerId,
    });

    return { success: true, message: "User unbanned successfully" };
  },
});

// Get moderation queue
export const getModerationQueue = query({
  args: {
    contentType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const limit = args.limit || 50;
    const userRoles = await getUserActiveRoles(ctx, userId);
    const canApproveTypes = new Set<string>();
    
    for (const role of userRoles) {
      role.canApprove.forEach((type) => canApproveTypes.add(type));
    }

    let approvals = await ctx.db
      .query("contentApprovals")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();

    if (args.contentType) {
      approvals = approvals.filter((a) => a.contentType === args.contentType);
    }

    approvals = approvals.filter((a) => canApproveTypes.has(a.contentType));
    approvals = approvals.slice(0, limit);

    const queueItems = await Promise.all(
      approvals.map(async (approval) => {
        const submitter = await ctx.db.get(approval.submittedBy);
        const submitterProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", approval.submittedBy))
          .first();

        return {
          ...approval,
          submitter: {
            id: approval.submittedBy,
            name: submitter?.name || submitterProfile?.name,
            username: submitterProfile?.username,
            avatar: submitterProfile?.avatar,
          },
        };
      })
    );

    return queueItems;
  },
});

// Get moderation queue count
export const getModerationQueueCount = query({
  args: { contentType: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return 0;
    }

    const userRoles = await getUserActiveRoles(ctx, userId);
    const canApproveTypes = new Set<string>();
    
    for (const role of userRoles) {
      role.canApprove.forEach((type) => canApproveTypes.add(type));
    }

    let approvals = await ctx.db
      .query("contentApprovals")
      .withIndex("by_status", (q) => q.eq("status", "PENDING"))
      .collect();

    if (args.contentType) {
      approvals = approvals.filter((a) => a.contentType === args.contentType);
    }

    approvals = approvals.filter((a) => canApproveTypes.has(a.contentType));

    return approvals.length;
  },
});

// Get moderation history
export const getModerationHistory = query({
  args: {
    limit: v.optional(v.number()),
    actionType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    if (!(await hasPermission(ctx, userId, "view_reports"))) {
      return [];
    }

    const limit = args.limit || 50;
    let actions = await ctx.db.query("moderationActions").withIndex("by_created").order("desc").take(limit);

    if (args.actionType) {
      actions = actions.filter((a) => a.actionType === args.actionType);
    }

    const historyItems = await Promise.all(
      actions.map(async (action) => {
        const performer = await ctx.db.get(action.performedBy);
        const performerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", action.performedBy))
          .first();

        let role = null;
        if (action.performerRole) {
          role = await ctx.db.get(action.performerRole);
        }

        return {
          ...action,
          performer: {
            id: action.performedBy,
            name: performer?.name || performerProfile?.name,
            username: performerProfile?.username,
          },
          performerRoleName: role?.name,
        };
      })
    );

    return historyItems;
  },
});
