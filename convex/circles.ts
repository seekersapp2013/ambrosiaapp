import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// Generate unique invite code
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// Create a new circle
export const createCircle = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    type: v.string(), // "PUBLIC" | "PRIVATE"
    accessType: v.string(), // "FREE" | "PAID"
    price: v.optional(v.number()),
    priceCurrency: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    maxMembers: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    postingPermission: v.optional(v.string()), // "EVERYONE" | "ADMINS_ONLY"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate inputs
    if (!args.name.trim()) {
      throw new Error("Circle name is required");
    }

    if (args.type !== "PUBLIC" && args.type !== "PRIVATE") {
      throw new Error("Invalid circle type");
    }

    if (args.accessType !== "FREE" && args.accessType !== "PAID") {
      throw new Error("Invalid access type");
    }

    if (args.accessType === "PAID") {
      if (!args.price || args.price <= 0) {
        throw new Error("Price must be greater than 0 for paid circles");
      }
      if (!args.priceCurrency) {
        throw new Error("Currency is required for paid circles");
      }
    }

    const postingPermission = args.postingPermission || "EVERYONE";
    if (postingPermission !== "EVERYONE" && postingPermission !== "ADMINS_ONLY") {
      throw new Error("Invalid posting permission");
    }

    // Check if circles require approval
    const settings = await ctx.db.query("moderationSettings").first();
    const requiresApproval = settings?.circlesRequireApproval ?? true;

    const now = Date.now();
    const inviteCode = args.type === "PRIVATE" ? generateInviteCode() : undefined;

    // Create circle
    const circleId = await ctx.db.insert("circles", {
      name: args.name.trim(),
      description: args.description.trim(),
      creatorId: userId,
      type: args.type,
      accessType: args.accessType,
      price: args.price,
      priceCurrency: args.priceCurrency,
      coverImage: args.coverImage,
      inviteCode,
      maxMembers: args.maxMembers,
      currentMembers: 1, // Creator is the first member
      tags: args.tags || [],
      isActive: requiresApproval ? false : true, // Only active if approved or not required
      postingPermission,
      // Moderation fields
      approvalStatus: requiresApproval ? "PENDING" : "NOT_REQUIRED",
      approvalRequestedAt: requiresApproval ? now : undefined,
      createdAt: now,
    });

    // Add creator as first member with CREATOR role
    await ctx.db.insert("circleMembers", {
      circleId,
      userId,
      role: "CREATOR",
      joinedAt: now,
      lastActiveAt: now,
      isActive: true,
    });

    // If approval is required, create approval record
    if (requiresApproval) {
      await ctx.db.insert("contentApprovals", {
        contentType: "circles",
        contentId: circleId,
        status: "PENDING",
        submittedBy: userId,
        createdAt: now,
      });
    }

    // Auto-create default sub-circles (Announcements + General)
    // Skip for consultation and referral circles
    const isConsultation = false; // Regular createCircle never creates consultation circles
    const isReferral = false; // Regular createCircle never creates referral circles
    if (!isConsultation && !isReferral) {
      // 1. Announcements sub-circle — admin-only posting
      const announcementsId = await ctx.db.insert("circles", {
        name: "Announcements",
        description: `Announcements for ${args.name.trim()}`,
        creatorId: userId,
        type: "PRIVATE",
        accessType: "FREE",
        currentMembers: 1,
        tags: [],
        isActive: requiresApproval ? false : true,
        postingPermission: "ADMINS_ONLY",
        approvalStatus: "NOT_REQUIRED",
        createdAt: now,
        // Sub-circle fields
        parentCircleId: circleId,
        isDefault: true,
        subCircleOrder: 0,
        subCircleType: "ANNOUNCEMENT",
      });

      // Add creator to Announcements
      await ctx.db.insert("circleMembers", {
        circleId: announcementsId,
        userId,
        role: "CREATOR",
        joinedAt: now,
        lastActiveAt: now,
        isActive: true,
      });

      // 2. General sub-circle — everyone can post, open by default
      const generalId = await ctx.db.insert("circles", {
        name: "General",
        description: `General discussion for ${args.name.trim()}`,
        creatorId: userId,
        type: "PUBLIC",
        accessType: "FREE",
        currentMembers: 1,
        tags: [],
        isActive: requiresApproval ? false : true,
        postingPermission: "EVERYONE",
        approvalStatus: "NOT_REQUIRED",
        createdAt: now,
        // Sub-circle fields
        parentCircleId: circleId,
        isDefault: true,
        subCircleOrder: 1,
        subCircleType: "GENERAL",
      });

      // Add creator to General
      await ctx.db.insert("circleMembers", {
        circleId: generalId,
        userId,
        role: "CREATOR",
        joinedAt: now,
        lastActiveAt: now,
        isActive: true,
      });
    }

    return { circleId, inviteCode, requiresApproval };
  },
});

// Get circle by ID
export const getCircleById = query({
  args: { circleId: v.id("circles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    const circle = await ctx.db.get(args.circleId);
    if (!circle) {
      return null;
    }

    // Check if user is a member
    let membership = null;
    if (userId) {
      membership = await ctx.db
        .query("circleMembers")
        .withIndex("by_circle_user", (q) => 
          q.eq("circleId", args.circleId).eq("userId", userId)
        )
        .first();
    }

    // For private circles, only show to members
    if (circle.type === "PRIVATE" && !membership) {
      return null;
    }

    // Get creator profile
    const creatorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", circle.creatorId))
      .first();

    return {
      ...circle,
      creator: {
        id: circle.creatorId,
        name: creatorProfile?.name,
        username: creatorProfile?.username,
        avatar: creatorProfile?.avatar,
      },
      membership,
      isMember: !!membership,
      // Referral circle context — exposed so referral-detail and circle screens can deep-link
      isReferralCircle: circle.isReferralCircle ?? false,
      referralId: circle.referralId ?? null,
      canPost: membership && (
        circle.postingPermission === "EVERYONE" || 
        membership.role === "CREATOR" || 
        membership.role === "ADMIN" ||
        membership.role === "MODERATOR"
      ),
    };
  },
});

// Browse public circles
export const getPublicCircles = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    accessType: v.optional(v.string()), // "FREE" | "PAID"
    searchTerm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Get current user so we can mark which circles they've joined
    const userId = await getAuthUserId(ctx);

    let query = ctx.db
      .query("circles")
      .withIndex("by_type", (q) => q.eq("type", "PUBLIC"))
      .filter((q) => q.eq(q.field("isActive"), true));

    let allCircles = await query.collect();

    // Filter by approval status - only show approved or not required
    // Exclude sub-circles from the Discover list
    allCircles = allCircles.filter(circle => 
      (circle.approvalStatus === "APPROVED" || 
      circle.approvalStatus === "NOT_REQUIRED" ||
      circle.approvalStatus === undefined) &&
      !circle.parentCircleId
    );

    // Apply filters
    if (args.accessType) {
      allCircles = allCircles.filter(circle => circle.accessType === args.accessType);
    }

    if (args.tags && args.tags.length > 0) {
      allCircles = allCircles.filter(circle =>
        circle.tags && circle.tags.some(tag => args.tags!.includes(tag))
      );
    }

    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      allCircles = allCircles.filter(circle =>
        circle.name.toLowerCase().includes(searchLower) ||
        circle.description.toLowerCase().includes(searchLower) ||
        circle.tags?.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    const circles = allCircles.slice(offset, offset + limit);

    // Build a Set of circleIds the current user is an active member of,
    // so we can mark isMember on each browse result without N+1 per circle.
    const joinedCircleIds = new Set<string>();
    if (userId) {
      const memberships = await ctx.db
        .query("circleMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();
      memberships.forEach((m) => joinedCircleIds.add(m.circleId));
    }

    // Get creator info for each circle, resolve storage URLs, and attach isMember
    const circlesWithCreators = await Promise.all(
      circles.map(async (circle) => {
        const creatorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", circle.creatorId))
          .first();

        // Resolve cover image storage ID → public URL
        const coverImageUrl = circle.coverImage
          ? await ctx.storage.getUrl(circle.coverImage)
          : null;

        // Resolve creator avatar storage ID → public URL
        const avatarUrl = creatorProfile?.avatar
          ? await ctx.storage.getUrl(creatorProfile.avatar)
          : null;

        return {
          ...circle,
          coverImage: coverImageUrl ?? undefined,
          creator: {
            id: circle.creatorId,
            name: creatorProfile?.name,
            username: creatorProfile?.username,
            avatar: avatarUrl ?? creatorProfile?.avatar,
          },
          availableSpots: circle.maxMembers 
            ? circle.maxMembers - circle.currentMembers 
            : null,
          isMember: joinedCircleIds.has(circle._id),
        };
      })
    );

    return {
      circles: circlesWithCreators,
      hasMore: offset + limit < allCircles.length,
      total: allCircles.length,
    };
  },
});

// Get user's circles (circles they're a member of)
export const getMyCircles = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const memberships = await ctx.db
      .query("circleMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const circles = await Promise.all(
      memberships.map(async (membership) => {
        const circle = await ctx.db.get(membership.circleId);
        if (!circle) return null;

        // Always show consultation and referral circles to their members
        // (even if isActive is false, e.g. pending payment). For regular
        // circles, only show active ones (moderation approved & not deleted).
        const isSpecialCircle =
          circle.isConsultationCircle === true ||
          circle.isReferralCircle === true;
        if (!circle.isActive && !isSpecialCircle) return null;

        // Hide sub-circles from the top-level "My Circles" list
        // They are only shown inside their parent circle's detail screen
        if (circle.parentCircleId) return null;

        const creatorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", circle.creatorId))
          .first();

        // Resolve cover image storage ID → public URL
        const coverImageUrl = circle.coverImage
          ? await ctx.storage.getUrl(circle.coverImage)
          : null;

        // Resolve creator avatar storage ID → public URL
        const avatarUrl = creatorProfile?.avatar
          ? await ctx.storage.getUrl(creatorProfile.avatar)
          : null;

        // Get unread message count
        const lastMessage = await ctx.db
          .query("circleMessages")
          .withIndex("by_circle_created", (q) => q.eq("circleId", circle._id))
          .order("desc")
          .first();

        return {
          ...circle,
          coverImage: coverImageUrl ?? undefined,
          creator: {
            id: circle.creatorId,
            name: creatorProfile?.name,
            username: creatorProfile?.username,
            avatar: avatarUrl ?? creatorProfile?.avatar,
          },
          membership,
          lastMessage,
          // Referral circle context — passed through so circle cards can badge
          // and deep-link back to the originating referral
          isReferralCircle: circle.isReferralCircle ?? false,
          referralId: circle.referralId ?? null,
          // Consultation circle context — so the list can navigate directly to chat
          isConsultationCircle: circle.isConsultationCircle ?? false,
          consultationPaid: circle.consultationPaid ?? false,
          consultationFee: circle.consultationFee,
          consultationCurrency: circle.consultationCurrency,
          canPost: membership && (
            circle.postingPermission === "EVERYONE" || 
            membership.role === "CREATOR" || 
            membership.role === "ADMIN" ||
            membership.role === "MODERATOR"
          ),
        };
      })
    );

    // Sort: most recent activity first (last message, or joinedAt as fallback)
    const sorted = circles.filter(Boolean).sort((a: any, b: any) => {
      const aTime = a.lastMessage?.createdAt ?? a.membership?.joinedAt ?? a.createdAt ?? 0;
      const bTime = b.lastMessage?.createdAt ?? b.membership?.joinedAt ?? b.createdAt ?? 0;
      return bTime - aTime;
    });

    return sorted;
  },
});

// Update circle
export const updateCircle = mutation({
  args: {
    circleId: v.id("circles"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImage: v.optional(v.string()),
    maxMembers: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    postingPermission: v.optional(v.string()),
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

    // Check if user is creator or admin
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "CREATOR" && membership.role !== "ADMIN")) {
      throw new Error("Only circle creator or admins can update circle settings");
    }

    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updateData.name = args.name.trim();
    if (args.description !== undefined) updateData.description = args.description.trim();
    if (args.coverImage !== undefined) updateData.coverImage = args.coverImage;
    if (args.maxMembers !== undefined) {
      if (args.maxMembers < circle.currentMembers) {
        throw new Error("Cannot set max members below current member count");
      }
      updateData.maxMembers = args.maxMembers;
    }
    if (args.tags !== undefined) updateData.tags = args.tags;
    if (args.postingPermission !== undefined) {
      if (args.postingPermission !== "EVERYONE" && args.postingPermission !== "ADMINS_ONLY") {
        throw new Error("Invalid posting permission");
      }
      updateData.postingPermission = args.postingPermission;
    }

    await ctx.db.patch(args.circleId, updateData);

    return args.circleId;
  },
});

// Delete/deactivate circle
export const deleteCircle = mutation({
  args: { circleId: v.id("circles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const circle = await ctx.db.get(args.circleId);
    if (!circle) {
      throw new Error("Circle not found");
    }

    // Only creator can delete
    if (circle.creatorId !== userId) {
      throw new Error("Only circle creator can delete the circle");
    }

    // Soft delete - deactivate instead of removing
    await ctx.db.patch(args.circleId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Join public circle
export const joinCircle = mutation({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const circle = await ctx.db.get(args.circleId);
    if (!circle || !circle.isActive) {
      throw new Error("Circle not found or inactive");
    }

    // Only public circles can be joined directly
    if (circle.type === "PRIVATE") {
      throw new Error("This is a private circle. You need an invite code to join.");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new Error("You are already a member of this circle");
      } else {
        // Reactivate membership
        await ctx.db.patch(existingMembership._id, {
          isActive: true,
          joinedAt: Date.now(),
        });
        return { circleId: args.circleId, message: "Rejoined circle successfully" };
      }
    }

    // Check max members
    if (circle.maxMembers && circle.currentMembers >= circle.maxMembers) {
      throw new Error("Circle is full");
    }

    // For paid circles, check if payment was made (simplified for now)
    if (circle.accessType === "PAID") {
      // TODO: Integrate with payment system
      // For now, we'll allow joining but this should be gated by payment
    }

    const now = Date.now();

    // Add member
    await ctx.db.insert("circleMembers", {
      circleId: args.circleId,
      userId,
      role: "MEMBER",
      joinedAt: now,
      lastActiveAt: now,
      isActive: true,
    });

    // Track circle join and update interests
    await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackCircleJoinAndUpdateInterests, {
      userId,
      circleId: args.circleId,
    });

    // Update member count
    await ctx.db.patch(args.circleId, {
      currentMembers: circle.currentMembers + 1,
      updatedAt: now,
    });

    // Auto-add to default sub-circles (Announcements + General)
    // Only if this is a parent circle (not itself a sub-circle)
    if (!circle.parentCircleId) {
      const defaultSubCircles = await ctx.db
        .query("circles")
        .withIndex("by_parent", (q) => q.eq("parentCircleId", args.circleId))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      for (const subCircle of defaultSubCircles) {
        // Check not already a member
        const existingSub = await ctx.db
          .query("circleMembers")
          .withIndex("by_circle_user", (q) =>
            q.eq("circleId", subCircle._id).eq("userId", userId)
          )
          .first();

        if (!existingSub) {
          await ctx.db.insert("circleMembers", {
            circleId: subCircle._id,
            userId,
            role: "MEMBER",
            joinedAt: now,
            lastActiveAt: now,
            isActive: true,
          });

          // Update sub-circle member count
          await ctx.db.patch(subCircle._id, {
            currentMembers: subCircle.currentMembers + 1,
            updatedAt: now,
          });
        }
      }
    }

    return { circleId: args.circleId, message: "Joined circle successfully" };
  },
});

// Join circle by invite code
export const joinCircleByInviteCode = mutation({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Find circle by invite code
    const circle = await ctx.db
      .query("circles")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", args.inviteCode))
      .first();

    if (!circle || !circle.isActive) {
      throw new Error("Invalid invite code");
    }

    // Check if already a member
    const existingMembership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", circle._id).eq("userId", userId)
      )
      .first();

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new Error("You are already a member of this circle");
      } else {
        // Reactivate membership
        await ctx.db.patch(existingMembership._id, {
          isActive: true,
          joinedAt: Date.now(),
        });
        return { circleId: circle._id, message: "Rejoined circle successfully" };
      }
    }

    // Check max members
    if (circle.maxMembers && circle.currentMembers >= circle.maxMembers) {
      throw new Error("Circle is full");
    }

    const now = Date.now();

    // Add member
    await ctx.db.insert("circleMembers", {
      circleId: circle._id,
      userId,
      role: "MEMBER",
      joinedAt: now,
      lastActiveAt: now,
      isActive: true,
    });

    // Track circle join and update interests
    await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackCircleJoinAndUpdateInterests, {
      userId,
      circleId: circle._id,
    });

    // Update member count
    await ctx.db.patch(circle._id, {
      currentMembers: circle.currentMembers + 1,
      updatedAt: now,
    });

    return { circleId: circle._id, message: "Joined circle successfully" };
  },
});

// Get pending circles for current user
export const getMyPendingCircles = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const circles = await ctx.db
      .query("circles")
      .withIndex("by_creator", (q) => q.eq("creatorId", userId))
      .filter((q) => q.eq(q.field("approvalStatus"), "PENDING"))
      .collect();

    return circles;
  },
});
