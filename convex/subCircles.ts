/**
 * Sub-Circles — CRUD & Queries
 *
 * Sub-circles are regular circles with a `parentCircleId` field set.
 * This file provides functions to manage them: list, create, adopt, remove, update, delete, reorder.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// ── Helper: check if user is CREATOR or ADMIN of a circle ─────────────────────
async function assertCircleAdmin(
  ctx: any,
  circleId: Id<"circles">,
  userId: Id<"users">
): Promise<void> {
  const membership = await ctx.db
    .query("circleMembers")
    .withIndex("by_circle_user", (q: any) =>
      q.eq("circleId", circleId).eq("userId", userId)
    )
    .first();

  if (
    !membership ||
    !membership.isActive ||
    (membership.role !== "CREATOR" && membership.role !== "ADMIN")
  ) {
    throw new Error("Only circle CREATOR or ADMIN can perform this action");
  }
}

// ── Get all sub-circles for a parent circle ───────────────────────────────────
export const getSubCircles = query({
  args: { parentCircleId: v.id("circles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const subCircles = await ctx.db
      .query("circles")
      .withIndex("by_parent", (q: any) => q.eq("parentCircleId", args.parentCircleId))
      .collect();

    // Sort by subCircleOrder
    subCircles.sort((a: any, b: any) => (a.subCircleOrder ?? 0) - (b.subCircleOrder ?? 0));

    // Enrich each sub-circle with last message preview + membership info
    const enriched = await Promise.all(
      subCircles.map(async (subCircle: any) => {
        // Get last message
        const lastMessage = await ctx.db
          .query("circleMessages")
          .withIndex("by_circle_created", (q: any) => q.eq("circleId", subCircle._id))
          .order("desc")
          .first();

        // Get sender profile for last message
        let lastMessageSender = null;
        if (lastMessage) {
          const senderProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q: any) => q.eq("userId", lastMessage.senderId))
            .first();
          lastMessageSender = {
            name: senderProfile?.name ?? senderProfile?.username ?? "Unknown",
            avatar: senderProfile?.avatar
              ? await ctx.storage.getUrl(senderProfile.avatar)
              : null,
          };
        }

        // Check if current user is a member
        let isMember = false;
        let memberRole: string | null = null;
        if (userId) {
          const membership = await ctx.db
            .query("circleMembers")
            .withIndex("by_circle_user", (q: any) =>
              q.eq("circleId", subCircle._id).eq("userId", userId)
            )
            .first();
          if (membership && membership.isActive) {
            isMember = true;
            memberRole = membership.role;
          }
        }

        // Resolve cover image
        const coverImageUrl = subCircle.coverImage
          ? await ctx.storage.getUrl(subCircle.coverImage)
          : null;

        return {
          _id: subCircle._id,
          name: subCircle.name,
          description: subCircle.description,
          type: subCircle.type,
          accessType: subCircle.accessType,
          postingPermission: subCircle.postingPermission,
          currentMembers: subCircle.currentMembers,
          coverImage: coverImageUrl,
          isDefault: subCircle.isDefault ?? false,
          subCircleType: subCircle.subCircleType,
          subCircleOrder: subCircle.subCircleOrder ?? 0,
          isActive: subCircle.isActive,
          isMember,
          memberRole,
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                messageType: lastMessage.messageType,
                createdAt: lastMessage.createdAt,
                sender: lastMessageSender,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// ── Adopt an existing circle as a sub-circle ──────────────────────────────────
export const adoptCircleAsSubCircle = mutation({
  args: {
    parentCircleId: v.id("circles"),
    circleToAdoptId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate caller is CREATOR/ADMIN of parent
    await assertCircleAdmin(ctx, args.parentCircleId, userId);

    // Get parent circle
    const parentCircle = await ctx.db.get(args.parentCircleId);
    if (!parentCircle) throw new Error("Parent circle not found");

    // Parent must not be a consultation or referral circle
    if (parentCircle.isConsultationCircle) {
      throw new Error("Cannot add sub-circles to consultation circles");
    }
    if (parentCircle.isReferralCircle) {
      throw new Error("Cannot add sub-circles to referral circles");
    }

    // Parent must not itself be a sub-circle (max 1 level deep)
    if (parentCircle.parentCircleId) {
      throw new Error("Cannot nest sub-circles more than 1 level deep");
    }

    // Get circle to adopt
    const circleToAdopt = await ctx.db.get(args.circleToAdoptId);
    if (!circleToAdopt) throw new Error("Circle to adopt not found");

    // Caller must be CREATOR of the circle being adopted
    if (circleToAdopt.creatorId !== userId) {
      throw new Error("You must be the CREATOR of the circle you want to add");
    }

    // Circle to adopt must not be a consultation/referral circle
    if (circleToAdopt.isConsultationCircle) {
      throw new Error("Cannot adopt a consultation circle");
    }
    if (circleToAdopt.isReferralCircle) {
      throw new Error("Cannot adopt a referral circle");
    }

    // Circle must not already have a parent
    if (circleToAdopt.parentCircleId) {
      throw new Error("This circle is already a sub-circle of another circle");
    }

    // Circle must not already have sub-circles of its own
    const existingChildren = await ctx.db
      .query("circles")
      .withIndex("by_parent", (q: any) => q.eq("parentCircleId", args.circleToAdoptId))
      .first();
    if (existingChildren) {
      throw new Error("Cannot adopt a circle that already has sub-circles");
    }

    // Determine next order
    const siblings = await ctx.db
      .query("circles")
      .withIndex("by_parent", (q: any) => q.eq("parentCircleId", args.parentCircleId))
      .collect();
    const maxOrder = siblings.reduce(
      (max: number, s: any) => Math.max(max, s.subCircleOrder ?? 0),
      -1
    );

    const now = Date.now();

    // Set parentCircleId on the adopted circle
    await ctx.db.patch(args.circleToAdoptId, {
      parentCircleId: args.parentCircleId,
      subCircleOrder: maxOrder + 1,
      subCircleType: "ADOPTED",
      updatedAt: now,
    });

    return { success: true, subCircleId: args.circleToAdoptId };
  },
});

// ── Remove an adopted sub-circle (non-destructive) ────────────────────────────
export const removeSubCircle = mutation({
  args: {
    parentCircleId: v.id("circles"),
    subCircleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await assertCircleAdmin(ctx, args.parentCircleId, userId);

    const subCircle = await ctx.db.get(args.subCircleId);
    if (!subCircle) throw new Error("Sub-circle not found");

    if (subCircle.parentCircleId !== args.parentCircleId) {
      throw new Error("This circle is not a sub-circle of the specified parent");
    }

    // Cannot remove default sub-circles
    if (subCircle.isDefault) {
      throw new Error("Cannot remove default sub-circles (Announcements/General)");
    }

    const now = Date.now();

    // Clear sub-circle fields — circle becomes independent again
    await ctx.db.patch(args.subCircleId, {
      parentCircleId: undefined,
      subCircleOrder: undefined,
      subCircleType: undefined,
      updatedAt: now,
    });

    return { success: true };
  },
});

// ── Create a brand new sub-circle ─────────────────────────────────────────────
export const createSubCircle = mutation({
  args: {
    parentCircleId: v.id("circles"),
    name: v.string(),
    postingPermission: v.optional(v.string()), // "EVERYONE" | "ADMINS_ONLY"
    isOpen: v.optional(v.boolean()), // Whether circle is PUBLIC or PRIVATE
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await assertCircleAdmin(ctx, args.parentCircleId, userId);

    const parentCircle = await ctx.db.get(args.parentCircleId);
    if (!parentCircle) throw new Error("Parent circle not found");

    if (parentCircle.isConsultationCircle) {
      throw new Error("Cannot add sub-circles to consultation circles");
    }
    if (parentCircle.isReferralCircle) {
      throw new Error("Cannot add sub-circles to referral circles");
    }
    if (parentCircle.parentCircleId) {
      throw new Error("Cannot nest sub-circles more than 1 level deep");
    }

    if (!args.name.trim()) {
      throw new Error("Sub-circle name is required");
    }

    const postingPermission = args.postingPermission || "EVERYONE";
    if (postingPermission !== "EVERYONE" && postingPermission !== "ADMINS_ONLY") {
      throw new Error("Invalid posting permission");
    }

    // Determine next order
    const siblings = await ctx.db
      .query("circles")
      .withIndex("by_parent", (q: any) => q.eq("parentCircleId", args.parentCircleId))
      .collect();
    const maxOrder = siblings.reduce(
      (max: number, s: any) => Math.max(max, s.subCircleOrder ?? 0),
      -1
    );

    const now = Date.now();
    const circleType = args.isOpen === false ? "PRIVATE" : "PUBLIC";

    const subCircleId = await ctx.db.insert("circles", {
      name: args.name.trim(),
      description: `${args.name.trim()} — sub-circle of ${parentCircle.name}`,
      creatorId: userId,
      type: circleType,
      accessType: "FREE",
      currentMembers: 1,
      tags: [],
      isActive: true,
      postingPermission,
      approvalStatus: "NOT_REQUIRED",
      createdAt: now,
      // Sub-circle fields
      parentCircleId: args.parentCircleId,
      isDefault: false,
      subCircleOrder: maxOrder + 1,
      subCircleType: "ADOPTED", // Custom user-created sub-circles use ADOPTED type
    });

    // Add creator as member
    await ctx.db.insert("circleMembers", {
      circleId: subCircleId,
      userId,
      role: "CREATOR",
      joinedAt: now,
      lastActiveAt: now,
      isActive: true,
    });

    return { success: true, subCircleId };
  },
});

// ── Update a sub-circle (rename, toggle isOpen, change posting permission) ────
export const updateSubCircle = mutation({
  args: {
    parentCircleId: v.id("circles"),
    subCircleId: v.id("circles"),
    name: v.optional(v.string()),
    postingPermission: v.optional(v.string()),
    isOpen: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await assertCircleAdmin(ctx, args.parentCircleId, userId);

    const subCircle = await ctx.db.get(args.subCircleId);
    if (!subCircle) throw new Error("Sub-circle not found");

    if (subCircle.parentCircleId !== args.parentCircleId) {
      throw new Error("This circle is not a sub-circle of the specified parent");
    }

    const patch: any = { updatedAt: Date.now() };

    if (args.name !== undefined) {
      if (!args.name.trim()) throw new Error("Name cannot be empty");
      patch.name = args.name.trim();
    }

    if (args.postingPermission !== undefined) {
      if (args.postingPermission !== "EVERYONE" && args.postingPermission !== "ADMINS_ONLY") {
        throw new Error("Invalid posting permission");
      }
      // Cannot change Announcements posting permission (always ADMINS_ONLY)
      if (subCircle.subCircleType === "ANNOUNCEMENT") {
        throw new Error("Cannot change posting permission for Announcements sub-circle");
      }
      patch.postingPermission = args.postingPermission;
    }

    if (args.isOpen !== undefined) {
      patch.type = args.isOpen ? "PUBLIC" : "PRIVATE";
    }

    await ctx.db.patch(args.subCircleId, patch);

    return { success: true };
  },
});

// ── Delete a sub-circle ───────────────────────────────────────────────────────
export const deleteSubCircle = mutation({
  args: {
    parentCircleId: v.id("circles"),
    subCircleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await assertCircleAdmin(ctx, args.parentCircleId, userId);

    const subCircle = await ctx.db.get(args.subCircleId);
    if (!subCircle) throw new Error("Sub-circle not found");

    if (subCircle.parentCircleId !== args.parentCircleId) {
      throw new Error("This circle is not a sub-circle of the specified parent");
    }

    // Cannot delete default sub-circles
    if (subCircle.isDefault) {
      throw new Error("Cannot delete default sub-circles (Announcements/General). Use removeSubCircle for adopted circles.");
    }

    // For adopted circles, recommend removeSubCircle instead
    if (subCircle.subCircleType === "ADOPTED" && subCircle.creatorId !== userId) {
      throw new Error("Use removeSubCircle to detach an adopted circle non-destructively");
    }

    // Soft delete: deactivate the circle
    await ctx.db.patch(args.subCircleId, {
      isActive: false,
      parentCircleId: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ── Reorder sub-circles ───────────────────────────────────────────────────────
export const reorderSubCircles = mutation({
  args: {
    parentCircleId: v.id("circles"),
    orderedIds: v.array(v.id("circles")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await assertCircleAdmin(ctx, args.parentCircleId, userId);

    const now = Date.now();

    for (let i = 0; i < args.orderedIds.length; i++) {
      const subCircle = await ctx.db.get(args.orderedIds[i]);
      if (!subCircle || subCircle.parentCircleId !== args.parentCircleId) {
        continue; // Skip invalid entries
      }
      await ctx.db.patch(args.orderedIds[i], {
        subCircleOrder: i,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// ── Get circles eligible for adoption ─────────────────────────────────────────
export const getAdoptableCircles = query({
  args: { parentCircleId: v.id("circles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all circles created by the current user
    const myCircles = await ctx.db
      .query("circles")
      .withIndex("by_creator", (q: any) => q.eq("creatorId", userId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter to eligible circles
    const adoptable = [];
    for (const circle of myCircles) {
      // Skip if it's the parent circle itself
      if (circle._id === args.parentCircleId) continue;
      // Skip if already a sub-circle
      if (circle.parentCircleId) continue;
      // Skip consultation/referral circles
      if (circle.isConsultationCircle || circle.isReferralCircle) continue;

      // Skip if this circle already has sub-circles of its own
      const hasChildren = await ctx.db
        .query("circles")
        .withIndex("by_parent", (q: any) => q.eq("parentCircleId", circle._id))
        .first();
      if (hasChildren) continue;

      // Resolve cover image
      const coverImageUrl = circle.coverImage
        ? await ctx.storage.getUrl(circle.coverImage)
        : null;

      adoptable.push({
        _id: circle._id,
        name: circle.name,
        type: circle.type,
        accessType: circle.accessType,
        currentMembers: circle.currentMembers,
        coverImage: coverImageUrl,
        tags: circle.tags,
      });
    }

    return adoptable;
  },
});


// ── Get latest content from user's joined circles (for My Circles feed) ───────
export const getMyCirclesContentFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit || 20;

    // Get all circles the user is a member of
    const memberships = await ctx.db
      .query("circleMembers")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("isActive"), true))
      .collect();

    const memberCircleIds = new Set(memberships.map((m: any) => m.circleId as string));
    if (memberCircleIds.size === 0) return [];

    // Fetch recent articles with circleId set
    const recentArticles = await ctx.db
      .query("articles")
      .withIndex("by_created")
      .order("desc")
      .filter((q: any) =>
        q.and(
          q.neq(q.field("circleId"), undefined),
          q.eq(q.field("status"), "PUBLISHED")
        )
      )
      .take(100); // Take more than needed, then filter by membership

    // Fetch recent reels with circleId set
    const recentReels = await ctx.db
      .query("reels")
      .withIndex("by_created")
      .order("desc")
      .filter((q: any) => q.neq(q.field("circleId"), undefined))
      .take(100);

    // Filter to only circles user is a member of
    const filteredArticles = recentArticles.filter(
      (a: any) => a.circleId && memberCircleIds.has(a.circleId as string)
    );
    const filteredReels = recentReels.filter(
      (r: any) => r.circleId && memberCircleIds.has(r.circleId as string)
    );

    // Combine and sort by createdAt desc
    type FeedItem = {
      contentType: "article" | "reel";
      contentId: string;
      title: string;
      coverImage: string | null;
      createdAt: number;
      authorId: string;
    };

    const combined: FeedItem[] = [
      ...filteredArticles.map((a: any) => ({
        contentType: "article" as const,
        contentId: a._id as string,
        title: a.title,
        coverImage: a.coverImage,
        createdAt: a.createdAt,
        authorId: a.authorId as string,
      })),
      ...filteredReels.map((r: any) => ({
        contentType: "reel" as const,
        contentId: r._id as string,
        title: r.caption || "Pulse",
        coverImage: r.poster || null,
        createdAt: r.createdAt,
        authorId: r.authorId as string,
      })),
    ];

    combined.sort((a, b) => b.createdAt - a.createdAt);
    const topItems = combined.slice(0, limit);

    // Enrich with author info and resolve storage URLs
    const enriched = await Promise.all(
      topItems.map(async (item) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", item.authorId))
          .first();

        const coverUrl = item.coverImage
          ? await ctx.storage.getUrl(item.coverImage)
          : null;

        const avatarUrl = profile?.avatar
          ? await ctx.storage.getUrl(profile.avatar)
          : null;

        return {
          contentType: item.contentType,
          contentId: item.contentId,
          title: item.title,
          coverImage: coverUrl,
          createdAt: item.createdAt,
          author: {
            name: profile?.name ?? profile?.username ?? "Unknown",
            avatar: avatarUrl,
          },
        };
      })
    );

    return enriched;
  },
});
