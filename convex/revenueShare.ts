import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Fetch default tier revenue share ratio configuration from platform_settings
 */
export const getTierRevenueShareConfig = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_revenue_share"))
      .first();

    return setting?.value || {
      sapphire: 70,
      silver: 75,
      gold: 80,
      platinum: 85,
      diamond: 90,
    };
  },
});

/**
 * Admin mutation: Update standard tier revenue share percentages
 */
export const updateTierRevenueShareConfig = mutation({
  args: {
    ratios: v.object({
      sapphire: v.number(),
      silver: v.number(),
      gold: v.number(),
      platinum: v.number(),
      diamond: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_revenue_share"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.ratios,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("platform_settings", {
        key: "tier_revenue_share",
        value: args.ratios,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Admin mutation: Set or clear individual provider custom revenue share override ratio
 */
export const setProviderCustomRevenueShare = mutation({
  args: {
    userId: v.id("users"),
    ratio: v.union(v.number(), v.null()), // e.g. 82 for 82% or null to clear
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const now = Date.now();
    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (args.ratio !== null && (args.ratio < 0 || args.ratio > 100)) {
      throw new Error("Revenue share ratio must be between 0% and 100%");
    }

    if (tierData) {
      await ctx.db.patch(tierData._id, {
        customRevenueShare: args.ratio !== null ? args.ratio : undefined,
        customRevenueShareReason: args.reason ? args.reason.trim() : undefined,
        customRevenueShareSetBy: adminUserId,
        customRevenueShareSetAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("providerTierData", {
        userId: args.userId,
        tier: "sapphire",
        prsScore: 0,
        qualificationScore: 0,
        experienceScore: 0,
        verificationScore: 0,
        referralPerformanceScore: 0,
        patientExperienceScore: 0,
        knowledgeContributionScore: 0,
        communityImpactScore: 0,
        customRevenueShare: args.ratio !== null ? args.ratio : undefined,
        customRevenueShareReason: args.reason ? args.reason.trim() : undefined,
        customRevenueShareSetBy: adminUserId,
        customRevenueShareSetAt: now,
        lastActivityAt: now,
        tierLastCalculated: now,
        createdAt: now,
      });
    }

    return { success: true, userId: args.userId, customRevenueShare: args.ratio };
  },
});

/**
 * Query effective provider revenue share percentage (custom override if set, else tier default)
 */
export const getEffectiveProviderRevenueShare = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const configSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_revenue_share"))
      .first();

    const defaultRatios: Record<string, number> = configSetting?.value || {
      sapphire: 70,
      silver: 75,
      gold: 80,
      platinum: 85,
      diamond: 90,
    };

    const currentTier = tierData?.tier || "sapphire";
    const tierDefaultRatio = defaultRatios[currentTier] || 70;
    const isCustom = tierData?.customRevenueShare !== undefined && tierData.customRevenueShare !== null;
    const effectiveRatio = isCustom ? tierData!.customRevenueShare! : tierDefaultRatio;

    return {
      userId: args.userId,
      tier: currentTier,
      tierDefaultRatio,
      customRevenueShare: tierData?.customRevenueShare,
      isCustomOverride: isCustom,
      effectiveRevenueShareRatio: effectiveRatio,
      overrideReason: tierData?.customRevenueShareReason,
      setAt: tierData?.customRevenueShareSetAt,
    };
  },
});

/**
 * Query effective revenue share for the currently authenticated provider.
 * Used by provider-facing screens that don't have a userId to pass.
 */
export const getMyRevenueShare = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const configSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_revenue_share"))
      .first();

    const defaultRatios: Record<string, number> = configSetting?.value || {
      sapphire: 70,
      silver: 75,
      gold: 80,
      platinum: 85,
      diamond: 90,
    };

    const currentTier = tierData?.tier || "sapphire";
    const tierDefaultRatio = defaultRatios[currentTier] || 70;
    const isCustom = tierData?.customRevenueShare !== undefined && tierData.customRevenueShare !== null;
    const effectiveRatio = isCustom ? tierData!.customRevenueShare! : tierDefaultRatio;

    return {
      userId,
      tier: currentTier,
      tierDefaultRatio,
      customRevenueShare: tierData?.customRevenueShare,
      isCustomOverride: isCustom,
      effectiveRevenueShareRatio: effectiveRatio,
      overrideReason: tierData?.customRevenueShareReason,
      setAt: tierData?.customRevenueShareSetAt,
    };
  },
});

