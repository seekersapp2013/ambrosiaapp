import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Admin creates a new badge definition
 */
export const createBadge = mutation({
  args: {
    name: v.string(),
    displayName: v.string(),
    description: v.string(),
    iconStorageId: v.string(),
    color: v.string(),
    backgroundColor: v.optional(v.string()),
    badgeType: v.union(
      v.literal("admin_awarded"),
      v.literal("peer_awarded"),
      v.literal("automated"),
      v.literal("hybrid")
    ),
    awardableBy: v.union(
      v.literal("platform_admin"),
      v.literal("circle_admin"),
      v.literal("peers"),
      v.literal("system")
    ),
    automationCriteria: v.optional(
      v.object({
        criteriaType: v.string(),
        threshold: v.optional(v.number()),
        timeframeDays: v.optional(v.number()),
        additionalRules: v.optional(v.any()),
      })
    ),
    benefits: v.optional(
      v.object({
        searchBoost: v.optional(v.number()),
        featuredInCategory: v.optional(v.string()),
        contentPriorityBoost: v.optional(v.boolean()),
        canCreateGatedContent: v.optional(v.boolean()),
        bookingHighlight: v.optional(v.boolean()),
        priorityInReferrals: v.optional(v.boolean()),
        canCreateCircles: v.optional(v.boolean()),
        maxCirclesBoost: v.optional(v.number()),
        profileBadgeDisplay: v.boolean(),
        profileHighlight: v.optional(v.boolean()),
        prsBonus: v.optional(v.number()),
        customPerks: v.optional(v.any()),
      })
    ),
    maxAwardsPerProvider: v.optional(v.number()),
    maxTotalAwards: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const now = Date.now();

    const badgeId = await ctx.db.insert("badges", {
      name: args.name.trim(),
      displayName: args.displayName.trim(),
      description: args.description.trim(),
      iconStorageId: args.iconStorageId,
      color: args.color,
      backgroundColor: args.backgroundColor,
      badgeType: args.badgeType,
      awardableBy: args.awardableBy,
      automationCriteria: args.automationCriteria,
      benefits: args.benefits,
      maxAwardsPerProvider: args.maxAwardsPerProvider || 1,
      maxTotalAwards: args.maxTotalAwards,
      currentTotalAwards: 0,
      isActive: true,
      createdBy: adminUserId,
      createdAt: now,
    });

    return { badgeId };
  },
});

/**
 * Fetch all active badge definitions
 */
export const getActiveBadges = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("badges")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

/**
 * Award a badge to a provider (Platform admin, Circle admin, or Peer)
 */
export const awardBadge = mutation({
  args: {
    userId: v.id("users"),
    badgeId: v.id("badges"),
    circleId: v.optional(v.id("circles")),
    reason: v.optional(v.string()),
    evidence: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const awarderId = await getAuthUserId(ctx);
    if (!awarderId) throw new Error("Not authenticated");

    const badge = await ctx.db.get(args.badgeId);
    if (!badge || !badge.isActive) {
      throw new Error("Badge definition not found or inactive");
    }

    // Permission checks
    if (badge.awardableBy === "platform_admin") {
      // Check admin status or allow authenticated admin
    } else if (badge.awardableBy === "circle_admin") {
      if (!args.circleId) throw new Error("Circle ID required for circle admin badge");
      const circle = await ctx.db.get(args.circleId);
      if (circle?.creatorId !== awarderId) {
        throw new Error("Only the circle creator/admin can award this badge");
      }
    } else if (badge.awardableBy === "peers") {
      const awarderSub = await ctx.db
        .query("bookingSubscribers")
        .withIndex("by_user", (q) => q.eq("userId", awarderId))
        .first();
      if (!awarderSub || !awarderSub.isActive) {
        throw new Error("Only active healthcare providers can endorse peers");
      }
    }

    // Check existing count for this user
    const existingUserBadges = await ctx.db
      .query("providerBadges")
      .withIndex("by_userId_badgeId", (q) =>
        q.eq("userId", args.userId).eq("badgeId", args.badgeId)
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const maxAllowed = badge.maxAwardsPerProvider || 1;
    if (existingUserBadges.length >= maxAllowed) {
      throw new Error(`Provider already holds the maximum (${maxAllowed}) instance(s) of this badge`);
    }

    const now = Date.now();

    const pbId = await ctx.db.insert("providerBadges", {
      userId: args.userId,
      badgeId: args.badgeId,
      awardedBy: awarderId,
      awardedByRole: badge.awardableBy,
      circleId: args.circleId,
      reason: args.reason?.trim(),
      evidence: args.evidence?.trim(),
      isActive: true,
      earnedAt: now,
    });

    // Increment current total awards count on badge definition
    await ctx.db.patch(args.badgeId, {
      currentTotalAwards: badge.currentTotalAwards + 1,
    });

    // Notify recipient
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "BADGE_AWARDED",
      title: "New Badge Earned!",
      message: `Congratulations! You've been awarded the "${badge.displayName}" badge.`,
      isRead: false,
      category: "social",
      priority: "medium",
      createdAt: now,
    });

    return { providerBadgeId: pbId };
  },
});

/**
 * Fetch badges earned by a provider
 */
export const getProviderBadges = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const pBadges = await ctx.db
      .query("providerBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const hydrated = await Promise.all(
      pBadges.map(async (pb) => {
        const badgeDef = await ctx.db.get(pb.badgeId);
        return {
          ...pb,
          badgeDef,
        };
      })
    );

    return hydrated;
  },
});

/**
 * Resolve aggregated feature benefits unlocked for a provider across all active badges
 */
export const getProviderBenefits = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const pBadges = await ctx.db
      .query("providerBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    let searchBoost = 0;
    let contentPriorityBoost = false;
    let canCreateGatedContent = false;
    let bookingHighlight = false;
    let priorityInReferrals = false;
    let canCreateCircles = false;
    let maxCirclesBoost = 0;
    let profileHighlight = false;
    let prsBonus = 0;

    for (const pb of pBadges) {
      const badge = await ctx.db.get(pb.badgeId);
      if (badge?.benefits) {
        const b = badge.benefits;
        if (b.searchBoost) searchBoost += b.searchBoost;
        if (b.contentPriorityBoost) contentPriorityBoost = true;
        if (b.canCreateGatedContent) canCreateGatedContent = true;
        if (b.bookingHighlight) bookingHighlight = true;
        if (b.priorityInReferrals) priorityInReferrals = true;
        if (b.canCreateCircles) canCreateCircles = true;
        if (b.maxCirclesBoost) maxCirclesBoost += b.maxCirclesBoost;
        if (b.profileHighlight) profileHighlight = true;
        if (b.prsBonus) prsBonus += b.prsBonus;
      }
    }

    return {
      searchBoost,
      contentPriorityBoost,
      canCreateGatedContent,
      bookingHighlight,
      priorityInReferrals,
      canCreateCircles,
      maxCirclesBoost,
      profileHighlight,
      prsBonus,
    };
  },
});
