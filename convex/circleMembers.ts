import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Get circle members
export const getCircleMembers = query({
  args: {
    circleId: v.id("circles"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member
    const userMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!userMembership || !userMembership.isActive) {
      throw new Error("You must be a member to view circle members");
    }

    const limit = args.limit || 50;
    const offset = args.offset || 0;

    const allMembers = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_active", (q) => 
        q.eq("circleId", args.circleId).eq("isActive", true)
      )
      .collect();

    const members = allMembers.slice(offset, offset + limit);

    // Get profile info for each member
    const membersWithProfiles = await Promise.all(
      members.map(async (member) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", member.userId))
          .first();

        return {
          ...member,
          profile: {
            name: profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
            bio: profile?.bio,
          },
        };
      })
    );

    return {
      members: membersWithProfiles,
      hasMore: offset + limit < allMembers.length,
      total: allMembers.length,
    };
  },
});

// Update member role
export const updateMemberRole = mutation({
  args: {
    circleId: v.id("circles"),
    memberId: v.id("users"),
    newRole: v.string(), // "ADMIN" | "MODERATOR" | "MEMBER"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if current user is creator or admin
    const userMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!userMembership || (userMembership.role !== "CREATOR" && userMembership.role !== "ADMIN")) {
      throw new Error("Only creator or admins can update member roles");
    }

    // Cannot change creator role
    const targetMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", args.memberId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("Member not found");
    }

    if (targetMembership.role === "CREATOR") {
      throw new Error("Cannot change creator role");
    }

    // Validate new role
    if (!["ADMIN", "MODERATOR", "MEMBER"].includes(args.newRole)) {
      throw new Error("Invalid role");
    }

    await ctx.db.patch(targetMembership._id, {
      role: args.newRole,
    });

    return { success: true };
  },
});

// Remove member from circle
export const removeMember = mutation({
  args: {
    circleId: v.id("circles"),
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const circle = await ctx.db.get(args.circleId);
    if (!circle) {
      throw new Error("Circle not found");
    }

    // Check if current user is creator or admin
    const userMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!userMembership || (userMembership.role !== "CREATOR" && userMembership.role !== "ADMIN")) {
      throw new Error("Only creator or admins can remove members");
    }

    // Cannot remove creator
    const targetMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", args.memberId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("Member not found");
    }

    if (targetMembership.role === "CREATOR") {
      throw new Error("Cannot remove circle creator");
    }

    // Deactivate membership
    await ctx.db.patch(targetMembership._id, {
      isActive: false,
    });

    // Update member count
    await ctx.db.patch(args.circleId, {
      currentMembers: Math.max(0, circle.currentMembers - 1),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Leave circle
export const leaveCircle = mutation({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const circle = await ctx.db.get(args.circleId);
    if (!circle) {
      throw new Error("Circle not found");
    }

    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You are not a member of this circle");
    }

    // Creator cannot leave their own circle
    if (membership.role === "CREATOR") {
      throw new Error("Circle creator cannot leave. Delete the circle instead.");
    }

    // Deactivate membership
    await ctx.db.patch(membership._id, {
      isActive: false,
    });

    // Update member count
    await ctx.db.patch(args.circleId, {
      currentMembers: Math.max(0, circle.currentMembers - 1),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Ban member from circle
export const banMember = mutation({
  args: {
    circleId: v.id("circles"),
    memberId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const circle = await ctx.db.get(args.circleId);
    if (!circle) {
      throw new Error("Circle not found");
    }

    // Check if current user is creator or admin
    const userMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!userMembership || (userMembership.role !== "CREATOR" && userMembership.role !== "ADMIN")) {
      throw new Error("Only creator or admins can ban members");
    }

    const targetMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", args.memberId)
      )
      .first();

    if (!targetMembership) {
      throw new Error("Member not found");
    }

    if (targetMembership.role === "CREATOR") {
      throw new Error("Cannot ban circle creator");
    }

    // Ban member
    await ctx.db.patch(targetMembership._id, {
      isActive: false,
      isBanned: true,
    });

    // Update member count
    await ctx.db.patch(args.circleId, {
      currentMembers: Math.max(0, circle.currentMembers - 1),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mute/unmute circle for user
export const toggleMuteCircle = mutation({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You are not a member of this circle");
    }

    await ctx.db.patch(membership._id, {
      isMuted: !membership.isMuted,
    });

    return { isMuted: !membership.isMuted };
  },
});
