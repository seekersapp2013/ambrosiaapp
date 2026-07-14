import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Invite an existing platform user (who has a practitioner/provider profile) to a circle.
 * Only CREATOR or ADMIN of the circle can invite.
 */
export const invitePractitioner = mutation({
  args: {
    circleId: v.id("circles"),
    practitionerId: v.id("users"),
    specialties: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify caller is CREATOR/ADMIN of the circle
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
      throw new Error("Only circle creators and admins can invite practitioners");
    }

    // Verify the target user has a practitioner/provider profile
    const provider = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.practitionerId))
      .first();

    if (!provider || !provider.isActive) {
      throw new Error("This user does not have an active practitioner profile");
    }

    // Check if already invited/linked
    const existing = await ctx.db
      .query("circlePractitioners")
      .withIndex("by_circle_practitioner", (q) =>
        q.eq("circleId", args.circleId).eq("practitionerId", args.practitionerId)
      )
      .first();

    if (existing && existing.isActive) {
      throw new Error("This practitioner is already linked to the circle");
    }

    // If there's an inactive record, reactivate it
    if (existing && !existing.isActive) {
      await ctx.db.patch(existing._id, {
        status: "INVITED",
        invitedBy: userId,
        specialties: args.specialties,
        isActive: true,
      });
      return existing._id;
    }

    // Create new invitation
    const id = await ctx.db.insert("circlePractitioners", {
      circleId: args.circleId,
      practitionerId: args.practitionerId,
      invitedBy: userId,
      status: "INVITED",
      specialties: args.specialties,
      isActive: true,
      createdAt: Date.now(),
    });

    return id;
  },
});

/**
 * Called by the practitioner to accept an invitation.
 */
export const acceptInvitation = mutation({
  args: {
    invitationId: v.id("circlePractitioners"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.practitionerId !== userId) {
      throw new Error("This invitation is not for you");
    }

    if (invitation.status !== "INVITED") {
      throw new Error("Invitation has already been processed");
    }

    await ctx.db.patch(args.invitationId, {
      status: "ACCEPTED",
    });

    // Auto-join the practitioner to the circle if not already a member
    const existingMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", invitation.circleId).eq("userId", userId)
      )
      .first();

    if (!existingMembership) {
      await ctx.db.insert("circleMembers", {
        circleId: invitation.circleId,
        userId,
        role: "MEMBER",
        joinedAt: Date.now(),
        isActive: true,
      });

      // Increment circle member count
      const circle = await ctx.db.get(invitation.circleId);
      if (circle) {
        await ctx.db.patch(invitation.circleId, {
          currentMembers: circle.currentMembers + 1,
        });
      }
    } else if (!existingMembership.isActive) {
      await ctx.db.patch(existingMembership._id, {
        isActive: true,
        joinedAt: Date.now(),
      });
      const circle = await ctx.db.get(invitation.circleId);
      if (circle) {
        await ctx.db.patch(invitation.circleId, {
          currentMembers: circle.currentMembers + 1,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Circle CREATOR/ADMIN onboards a practitioner not yet on the platform.
 * Creates the record with status "ONBOARDED" — a placeholder until the practitioner signs up.
 */
export const onboardPractitioner = mutation({
  args: {
    circleId: v.id("circles"),
    practitionerId: v.id("users"), // The placeholder or newly created user
    specialties: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify caller is CREATOR/ADMIN
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
      throw new Error("Only circle creators and admins can onboard practitioners");
    }

    // Check if already exists
    const existing = await ctx.db
      .query("circlePractitioners")
      .withIndex("by_circle_practitioner", (q) =>
        q.eq("circleId", args.circleId).eq("practitionerId", args.practitionerId)
      )
      .first();

    if (existing && existing.isActive) {
      throw new Error("This practitioner is already linked to the circle");
    }

    if (existing && !existing.isActive) {
      await ctx.db.patch(existing._id, {
        status: "ONBOARDED",
        invitedBy: userId,
        specialties: args.specialties,
        isActive: true,
      });
      return existing._id;
    }

    const id = await ctx.db.insert("circlePractitioners", {
      circleId: args.circleId,
      practitionerId: args.practitionerId,
      invitedBy: userId,
      status: "ONBOARDED",
      specialties: args.specialties,
      isActive: true,
      createdAt: Date.now(),
    });

    return id;
  },
});

/**
 * Circle CREATOR/ADMIN removes (deactivates) a practitioner from the circle.
 */
export const removePractitioner = mutation({
  args: {
    circlePractitionerId: v.id("circlePractitioners"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const record = await ctx.db.get(args.circlePractitionerId);
    if (!record) {
      throw new Error("Practitioner record not found");
    }

    // Verify caller is CREATOR/ADMIN of the circle
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", record.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You must be a circle member");
    }
    if (!["CREATOR", "ADMIN"].includes(membership.role)) {
      throw new Error("Only circle creators and admins can remove practitioners");
    }

    await ctx.db.patch(args.circlePractitionerId, {
      isActive: false,
    });

    return { success: true };
  },
});

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Get all active practitioners for a circle, with their profile info.
 * Publicly visible (per design — anyone can see practitioners, booking is gated).
 */
export const getCirclePractitioners = query({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const practitioners = await ctx.db
      .query("circlePractitioners")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Only show accepted/onboarded practitioners publicly
    const activePractitioners = practitioners.filter(
      (p) => p.status === "ACCEPTED" || p.status === "ONBOARDED"
    );

    // Get profile + provider info for each practitioner
    const results = await Promise.all(
      activePractitioners.map(async (record) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", record.practitionerId))
          .first();

        const provider = await ctx.db
          .query("bookingSubscribers")
          .withIndex("by_user", (q) => q.eq("userId", record.practitionerId))
          .first();

        return {
          ...record,
          profile: profile
            ? {
                name: profile.name,
                username: profile.username,
                avatar: profile.avatar,
                bio: profile.bio,
              }
            : null,
          provider: provider
            ? {
                sessionPrice: provider.sessionPrice,
                oneOnOnePrice: provider.oneOnOnePrice,
                isActive: provider.isActive,
              }
            : null,
        };
      })
    );

    // Check if current user is a member (for frontend gating display)
    let isMember = false;
    if (userId) {
      const membership = await ctx.db
        .query("circleMembers")
        .withIndex("by_circle_user", (q) =>
          q.eq("circleId", args.circleId).eq("userId", userId)
        )
        .first();
      isMember = !!(membership && membership.isActive);
    }

    return {
      practitioners: results,
      isMember,
    };
  },
});

/**
 * Get pending invitations for the current user (practitioner view).
 */
export const getMyCircleInvitations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const invitations = await ctx.db
      .query("circlePractitioners")
      .withIndex("by_practitioner", (q) => q.eq("practitionerId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "INVITED"),
          q.eq(q.field("isActive"), true)
        )
      )
      .collect();

    // Get circle info for each invitation
    const results = await Promise.all(
      invitations.map(async (invitation) => {
        const circle = await ctx.db.get(invitation.circleId);
        const inviter = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", invitation.invitedBy))
          .first();

        return {
          ...invitation,
          circle: circle
            ? {
                name: circle.name,
                coverImage: circle.coverImage,
                currentMembers: circle.currentMembers,
              }
            : null,
          invitedByProfile: inviter
            ? { name: inviter.name, username: inviter.username }
            : null,
        };
      })
    );

    return results;
  },
});

/**
 * Search practitioners available in a specific circle (with availability info).
 */
export const searchCirclePractitioners = query({
  args: {
    circleId: v.id("circles"),
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const practitioners = await ctx.db
      .query("circlePractitioners")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isActive"), true),
          q.or(
            q.eq(q.field("status"), "ACCEPTED"),
            q.eq(q.field("status"), "ONBOARDED")
          )
        )
      )
      .collect();

    // Get full info for each
    const results = await Promise.all(
      practitioners.map(async (record) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", record.practitionerId))
          .first();

        const provider = await ctx.db
          .query("bookingSubscribers")
          .withIndex("by_user", (q) => q.eq("userId", record.practitionerId))
          .first();

        const settings = await ctx.db
          .query("bookingSettings")
          .withIndex("by_user", (q) => q.eq("userId", record.practitionerId))
          .first();

        return {
          ...record,
          profile: profile
            ? {
                name: profile.name,
                username: profile.username,
                avatar: profile.avatar,
                bio: profile.bio,
              }
            : null,
          provider: provider
            ? {
                sessionPrice: provider.sessionPrice,
                oneOnOnePrice: provider.oneOnOnePrice,
                isActive: provider.isActive,
              }
            : null,
          settings: settings
            ? {
                confirmationType: settings.confirmationType,
                bufferTime: settings.bufferTime,
              }
            : null,
        };
      })
    );

    // Apply search filter if provided
    if (args.searchTerm) {
      const term = args.searchTerm.toLowerCase();
      return results.filter(
        (r) =>
          r.profile?.name?.toLowerCase().includes(term) ||
          r.profile?.username?.toLowerCase().includes(term) ||
          r.specialties?.some((s: string) => s.toLowerCase().includes(term))
      );
    }

    return results;
  },
});
