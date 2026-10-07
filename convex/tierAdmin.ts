import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Fetch all tier configuration settings from platform_settings
 */
export const getTierConfiguration = query({
  args: {},
  handler: async (ctx) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) return null;

    const thresholds = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_thresholds"))
      .first();

    const weights = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "prs_weights"))
      .first();

    const qualPoints = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "qualification_points"))
      .first();

    const expBrackets = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "experience_brackets"))
      .first();

    const inactivity = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_inactivity_settings"))
      .first();

    return {
      thresholds: thresholds?.value,
      weights: weights?.value,
      qualPoints: qualPoints?.value,
      expBrackets: expBrackets?.value,
      inactivity: inactivity?.value,
    };
  },
});

/**
 * Update tier thresholds
 */
export const updateTierThresholds = mutation({
  args: {
    thresholds: v.any(),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_thresholds"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.thresholds,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("platform_settings", {
        key: "tier_thresholds",
        value: args.thresholds,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Update scoring weights
 */
export const updateScoringWeights = mutation({
  args: {
    weights: v.any(),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "prs_weights"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.weights,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("platform_settings", {
        key: "prs_weights",
        value: args.weights,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Admin manual tier override with reason logging
 */
export const adminOverrideTier = mutation({
  args: {
    userId: v.id("users"),
    newTier: v.union(
      v.literal("sapphire"),
      v.literal("silver"),
      v.literal("gold"),
      v.literal("platinum"),
      v.literal("diamond")
    ),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const previousTier = existing?.tier;
    const previousPrs = existing?.prsScore || 0;

    const thresholdMap: Record<string, number> = {
      sapphire: 15,
      silver: 40,
      gold: 65,
      platinum: 80,
      diamond: 95,
    };
    const newPrs = thresholdMap[args.newTier] || 15;

    if (existing) {
      await ctx.db.patch(existing._id, {
        tier: args.newTier,
        prsScore: newPrs,
        tierLastCalculated: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("providerTierData", {
        userId: args.userId,
        tier: args.newTier,
        prsScore: newPrs,
        qualificationScore: 0,
        experienceScore: 0,
        verificationScore: 0,
        referralPerformanceScore: 0,
        patientExperienceScore: 0,
        knowledgeContributionScore: 0,
        communityImpactScore: 0,
        lastActivityAt: now,
        tierLastCalculated: now,
        createdAt: now,
      });
    }

    // Audit log entry
    await ctx.db.insert("tierAuditLog", {
      userId: args.userId,
      previousTier,
      newTier: args.newTier,
      previousPrs,
      newPrs,
      reason: args.reason.trim(),
      triggeredBy: "admin",
      adminId: adminUserId,
      timestamp: now,
    });

    return { success: true };
  },
});

/**
 * Get tier distribution analytics report
 */
export const getTierDistributionAnalytics = query({
  args: {},
  handler: async (ctx) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) return null;

    const allTierData = await ctx.db.query("providerTierData").collect();
    const distribution: Record<string, number> = {
      sapphire: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0,
    };

    for (const d of allTierData) {
      distribution[d.tier] = (distribution[d.tier] || 0) + 1;
    }

    const recentLogs = await ctx.db
      .query("tierAuditLog")
      .order("desc")
      .take(20);

    const hydratedLogs = await Promise.all(
      recentLogs.map(async (l) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", l.userId))
          .first();
        return {
          ...l,
          providerName: profile?.name || profile?.username || "Unknown Provider",
        };
      })
    );

    return {
      totalProviders: allTierData.length,
      distribution,
      recentLogs: hydratedLogs,
    };
  },
});

/**
 * Fetch admin-configured score point rules for dynamic KYC fields
 */
export const getKYCScoringRules = query({
  args: {},
  handler: async (ctx) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) return null;

    const kycScores = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "kyc_field_scores"))
      .first();

    return kycScores?.value || {};
  },
});

/**
 * Update score point assignments for dynamic KYC fields
 */
export const updateKYCScoringRules = mutation({
  args: {
    fieldScores: v.any(),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "kyc_field_scores"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.fieldScores,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("platform_settings", {
        key: "kyc_field_scores",
        description: "Admin-configured score points awarded per completed KYC field",
        value: args.fieldScores,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
