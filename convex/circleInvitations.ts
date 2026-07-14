import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Generate or get an invite link for a circle.
 * - Public circles: any member can get the link
 * - Private circles: only CREATOR/ADMIN can get the link
 * Returns a deep-link path: `/(tabs)/circle-detail?circleId=<id>`
 */
export const getInviteLink = query({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const circle = await ctx.db.get(args.circleId);
    if (!circle || !circle.isActive) return null;

    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) return null;

    // Private circles: only admin/creator can see/share the link
    if (circle.type === "PRIVATE") {
      if (!["CREATOR", "ADMIN"].includes(membership.role)) {
        return null;
      }
    }

    // The invite link uses the app's web URL for universal/app links
    return {
      link: `https://app.ambrosia.africa/circle-detail?circleId=${args.circleId}`,
      circleId: args.circleId,
      circleName: circle.name,
      isPrivate: circle.type === "PRIVATE",
      inviteCode: circle.inviteCode ?? null,
    };
  },
});

/**
 * Search users to invite (admin only).
 * Returns users who are NOT already members of this circle.
 */
export const searchUsersToInvite = query({
  args: {
    circleId: v.id("circles"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify admin
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) return [];
    if (!["CREATOR", "ADMIN"].includes(membership.role)) return [];

    if (!args.searchTerm.trim()) return [];

    // Search profiles by name or username
    const allProfiles = await ctx.db.query("profiles").collect();
    const term = args.searchTerm.toLowerCase();
    const matchedProfiles = allProfiles.filter(
      (p) =>
        (p.name?.toLowerCase().includes(term) ||
          p.username?.toLowerCase().includes(term)) &&
        p.userId !== userId
    );

    // Filter out existing members
    const existingMembers = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const memberUserIds = new Set(existingMembers.map((m) => m.userId));

    // Also filter out users who already have a pending invite
    const pendingInvites = await ctx.db
      .query("circleInvites")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    const pendingUserIds = new Set(
      pendingInvites.filter((i) => i.inviteeId).map((i) => i.inviteeId!)
    );

    const results = matchedProfiles
      .filter(
        (p) =>
          !memberUserIds.has(p.userId) && !pendingUserIds.has(p.userId)
      )
      .slice(0, 10);

    return results.map((p) => ({
      userId: p.userId,
      name: p.name,
      username: p.username,
      avatar: p.avatar,
    }));
  },
});

/**
 * Send a direct invitation to a user (admin only).
 * Creates a circleInvites record + sends a notification.
 */
export const inviteUser = mutation({
  args: {
    circleId: v.id("circles"),
    inviteeId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify admin
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You must be a circle member");
    }
    if (!["CREATOR", "ADMIN"].includes(membership.role)) {
      throw new Error("Only admins can invite users");
    }

    const circle = await ctx.db.get(args.circleId);
    if (!circle || !circle.isActive) {
      throw new Error("Circle not found");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", args.circleId).eq("userId", args.inviteeId)
      )
      .first();

    if (existingMembership && existingMembership.isActive) {
      throw new Error("User is already a member of this circle");
    }

    // Check for existing pending invite
    const existingInvite = await ctx.db
      .query("circleInvites")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) =>
        q.and(
          q.eq(q.field("inviteeId"), args.inviteeId),
          q.eq(q.field("status"), "PENDING")
        )
      )
      .first();

    if (existingInvite) {
      throw new Error("User already has a pending invitation");
    }

    const now = Date.now();
    const inviteCode = generateCode();

    // Create invite record
    const inviteId = await ctx.db.insert("circleInvites", {
      circleId: args.circleId,
      inviterId: userId,
      inviteeId: args.inviteeId,
      inviteCode,
      status: "PENDING",
      expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
      createdAt: now,
    });

    // Send notification to the invitee
    try {
      await ctx.scheduler.runAfter(0, internal.notifications.processNotificationEvent, {
        type: "CIRCLE_INVITE",
        recipientUserId: args.inviteeId,
        actorUserId: userId,
        relatedContentType: "circle",
        relatedContentId: args.circleId as string,
        metadata: {
          circleName: circle.name,
          inviteId: inviteId as string,
        },
      });
    } catch (e) {
      console.error("Failed to send invite notification:", e);
    }

    return { inviteId, inviteCode };
  },
});

/**
 * Accept a circle invitation.
 */
export const acceptInvite = mutation({
  args: {
    inviteId: v.id("circleInvites"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invitation not found");
    if (invite.inviteeId !== userId) throw new Error("This invitation is not for you");
    if (invite.status !== "PENDING") throw new Error("Invitation is no longer valid");

    // Check if expired
    if (invite.expiresAt && Date.now() > invite.expiresAt) {
      await ctx.db.patch(args.inviteId, { status: "EXPIRED" });
      throw new Error("Invitation has expired");
    }

    const circle = await ctx.db.get(invite.circleId);
    if (!circle || !circle.isActive) throw new Error("Circle not found");

    // Mark invite as accepted
    await ctx.db.patch(args.inviteId, { status: "ACCEPTED" });

    // Join the circle
    const existingMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", invite.circleId).eq("userId", userId)
      )
      .first();

    const now = Date.now();

    if (existingMembership) {
      if (!existingMembership.isActive) {
        await ctx.db.patch(existingMembership._id, {
          isActive: true,
          joinedAt: now,
        });
        await ctx.db.patch(invite.circleId, {
          currentMembers: circle.currentMembers + 1,
        });
      }
    } else {
      await ctx.db.insert("circleMembers", {
        circleId: invite.circleId,
        userId,
        role: "MEMBER",
        joinedAt: now,
        lastActiveAt: now,
        isActive: true,
      });
      await ctx.db.patch(invite.circleId, {
        currentMembers: circle.currentMembers + 1,
      });
    }

    return { success: true, circleId: invite.circleId };
  },
});

/**
 * Decline a circle invitation.
 */
export const declineInvite = mutation({
  args: {
    inviteId: v.id("circleInvites"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invitation not found");
    if (invite.inviteeId !== userId) throw new Error("This invitation is not for you");
    if (invite.status !== "PENDING") throw new Error("Invitation is no longer valid");

    await ctx.db.patch(args.inviteId, { status: "DECLINED" });
    return { success: true };
  },
});

/**
 * Get pending invitations for the current user.
 * Used by the "My Circles" screen to show invites.
 */
export const getMyPendingInvites = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const invites = await ctx.db
      .query("circleInvites")
      .withIndex("by_invitee", (q) => q.eq("inviteeId", userId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    // Filter out expired
    const now = Date.now();
    const validInvites = invites.filter(
      (i) => !i.expiresAt || i.expiresAt > now
    );

    // Get circle info for each invite
    const results = await Promise.all(
      validInvites.map(async (invite) => {
        const circle = await ctx.db.get(invite.circleId);
        if (!circle || !circle.isActive) return null;

        const inviterProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", invite.inviterId))
          .first();

        // Resolve cover image
        const coverImageUrl = circle.coverImage
          ? await ctx.storage.getUrl(circle.coverImage)
          : null;

        return {
          ...invite,
          circle: {
            _id: circle._id,
            name: circle.name,
            description: circle.description,
            type: circle.type,
            accessType: circle.accessType,
            currentMembers: circle.currentMembers,
            coverImage: coverImageUrl,
            tags: circle.tags,
          },
          inviter: inviterProfile
            ? { name: inviterProfile.name, username: inviterProfile.username }
            : null,
        };
      })
    );

    return results.filter(Boolean);
  },
});

// Helper to generate a random invite code
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
