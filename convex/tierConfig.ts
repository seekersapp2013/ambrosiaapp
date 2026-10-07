/**
 * Tier Configuration Constants & Helpers
 * 
 * Tier thresholds and PRS weights are stored in platform_settings
 * under the key "tier_config". This file provides type definitions,
 * defaults, and helper functions to read/write the config.
 */
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Default tier thresholds (PRS score ranges)
export const DEFAULT_TIER_THRESHOLDS = {
  sapphire: { min: 0, max: 29 },
  silver: { min: 30, max: 54 },
  gold: { min: 55, max: 74 },
  platinum: { min: 75, max: 89 },
  diamond: { min: 90, max: 100 },
};

// Default PRS component weights (must sum to 1.0)
export const DEFAULT_PRS_WEIGHTS = {
  qualifications: 0.30,
  experience: 0.20,
  verification: 0.15,
  referralPerformance: 0.10,
  patientExperience: 0.10,
  knowledgeContribution: 0.10,
  communityImpact: 0.05,
};

// Type for the full config object stored in platform_settings
export interface TierConfigData {
  thresholds: typeof DEFAULT_TIER_THRESHOLDS;
  weights: typeof DEFAULT_PRS_WEIGHTS;
  autoPromoteOnExpAward: boolean; // Whether to auto-recalculate after EXP award
  aiEvaluationEnabled: boolean;   // Whether AI tier evaluation is active
  aiConfidenceThreshold: number;  // Min confidence for auto-promotion (0.0-1.0)
}

export const DEFAULT_TIER_CONFIG: TierConfigData = {
  thresholds: DEFAULT_TIER_THRESHOLDS,
  weights: DEFAULT_PRS_WEIGHTS,
  autoPromoteOnExpAward: true,
  aiEvaluationEnabled: false, // Off by default until API key is configured
  aiConfidenceThreshold: 0.75,
};

/**
 * Query to get the current tier config (or defaults)
 */
export const getTierConfig = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_config"))
      .first();
    return (setting?.value as TierConfigData) || DEFAULT_TIER_CONFIG;
  },
});

/**
 * Mutation for admins to update tier config
 */
export const updateTierConfig = mutation({
  args: {
    config: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_config"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.config,
        updatedBy: userId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("platform_settings", {
        key: "tier_config",
        value: args.config,
        description: "Tier thresholds, PRS weights, and AI configuration",
        updatedBy: userId,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});
