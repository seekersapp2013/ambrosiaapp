import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Automatically initializes provider tier data on registration
 * and triggers initial PRS calculation.
 */
export const initializeProviderTier = internalMutation({
  args: {
    userId: v.id("users"),
    yearsOfExperience: v.optional(v.number()),
    licenseNumber: v.optional(v.string()),
    registrationCouncil: v.optional(v.string()),
    geographicRecognition: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if providerTierData already exists
    const existingTierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!existingTierData) {
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
        yearsOfExperience: args.yearsOfExperience ?? 0,
        licenseNumber: args.licenseNumber?.trim(),
        registrationCouncil: args.registrationCouncil?.trim(),
        geographicRecognition: args.geographicRecognition as any,
        totalExp: 0,
        monthlyExp: 0,
        lastActivityAt: now,
        tierLastCalculated: now,
        createdAt: now,
      });
    } else if (
      args.yearsOfExperience !== undefined ||
      args.licenseNumber !== undefined ||
      args.registrationCouncil !== undefined ||
      args.geographicRecognition !== undefined
    ) {
      await ctx.db.patch(existingTierData._id, {
        yearsOfExperience: args.yearsOfExperience !== undefined ? args.yearsOfExperience : existingTierData.yearsOfExperience,
        licenseNumber: args.licenseNumber?.trim() || existingTierData.licenseNumber,
        registrationCouncil: args.registrationCouncil?.trim() || existingTierData.registrationCouncil,
        geographicRecognition: args.geographicRecognition as any || existingTierData.geographicRecognition,
        updatedAt: now,
      });
    }

    // Schedule immediate PRS recalculation based on submitted registration/KYC info
    await ctx.scheduler.runAfter(0, (internal as any).tierCalculation.internalRecalculateProviderPRS, {
      userId: args.userId,
      reason: "Initial tier assignment on registration",
    });
  },
});
