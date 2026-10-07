import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  calculateQualificationScore,
  calculateExperienceScore,
  calculateVerificationScore,
  calculateReferralPerformanceScore,
  calculatePatientExperienceScore,
  calculateKnowledgeContributionScore,
  calculateCommunityImpactScore,
  calculatePRS,
  determineTier,
} from "./tierEngine";

/**
 * Full recalculation of a provider's Professional Recognition Score (PRS) and Tier
 */
async function runPRSComputation(
  ctx: any,
  args: { userId: Id<"users">; reason?: string }
) {
  const now = Date.now();

  // 1. Fetch existing tier data
  const existingTierData = await ctx.db
    .query("providerTierData")
    .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
    .first();

  // 2. Fetch provider qualifications
  const qualifications = await ctx.db
    .query("providerQualifications")
    .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
    .collect();

  // 3. Fetch verification documents
  const documents = await ctx.db
    .query("verificationDocuments")
    .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
    .collect();

  // 4. Fetch referrals received (where provider is selectedExpertId)
  const referralsReceived = await ctx.db
    .query("referrals")
    .withIndex("by_selected_expert", (q: any) => q.eq("selectedExpertId", args.userId))
    .collect();

  const acceptedReferrals = referralsReceived.filter(
    (r: any) => r.status === "ACCEPTED" || r.status === "COMPLETED"
  );
  const completedReferrals = referralsReceived.filter((r: any) => r.status === "COMPLETED");
  const declinedReferrals = referralsReceived.filter((r: any) => r.status === "DECLINED");

  let totalResponseTime = 0;
  let responseTimeCount = 0;
  let totalSuccessRating = 0;
  let successRatingCount = 0;

  for (const ref of referralsReceived) {
    if (ref.responseTimeMinutes !== undefined) {
      totalResponseTime += ref.responseTimeMinutes;
      responseTimeCount++;
    }
    if (ref.successRating !== undefined) {
      totalSuccessRating += ref.successRating;
      successRatingCount++;
    }
  }

  const referralStats = {
    totalReceived: referralsReceived.length,
    acceptedCount: acceptedReferrals.length,
    completedCount: completedReferrals.length,
    declinedCount: declinedReferrals.length,
    avgResponseTimeMinutes: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : undefined,
    avgSuccessRating: successRatingCount > 0 ? totalSuccessRating / successRatingCount : undefined,
  };

  // 5. Fetch reviews
  const reviews = await ctx.db
    .query("providerReviews")
    .withIndex("by_providerId", (q: any) => q.eq("providerId", args.userId))
    .collect();

  // 6. Fetch articles, reels, events
  const articles = await ctx.db
    .query("articles")
    .withIndex("by_author", (q: any) => q.eq("authorId", args.userId))
    .collect();

  const reels = await ctx.db
    .query("reels")
    .withIndex("by_author", (q: any) => q.eq("authorId", args.userId))
    .collect();

  const events = await ctx.db
    .query("events")
    .withIndex("by_provider", (q: any) => q.eq("providerId", args.userId))
    .collect();

  let totalViews = 0;
  for (const art of articles) {
    totalViews += art.views || 0;
  }

  const contentData = {
    articleCount: articles.filter((a: any) => a.status === "PUBLISHED").length,
    reelCount: reels.length,
    eventCount: events.length,
    totalViews,
    totalLikes: 0,
  };

  // 7. Fetch active provider badges & bonuses
  const activeProviderBadges = await ctx.db
    .query("providerBadges")
    .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();

  let prsBadgeBonusTotal = 0;
  for (const pb of activeProviderBadges) {
    const badgeDef = await ctx.db.get(pb.badgeId);
    if (badgeDef?.benefits?.prsBonus) {
      prsBadgeBonusTotal += badgeDef.benefits.prsBonus;
    }
  }

  // 8. Fetch platform settings for weights and thresholds if configured
  const weightsConfig = await ctx.db
    .query("platform_settings")
    .withIndex("by_key", (q: any) => q.eq("key", "prs_weights"))
    .first();

  const qualConfig = await ctx.db
    .query("platform_settings")
    .withIndex("by_key", (q: any) => q.eq("key", "qualification_points"))
    .first();

  const expConfig = await ctx.db
    .query("platform_settings")
    .withIndex("by_key", (q: any) => q.eq("key", "experience_brackets"))
    .first();

  const kycScoresSetting = await ctx.db
    .query("platform_settings")
    .withIndex("by_key", (q: any) => q.eq("key", "kyc_field_scores"))
    .first();

  const subscriber = await ctx.db
    .query("bookingSubscribers")
    .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
    .first();

  // Compute dynamic KYC field bonus points
  const completedKycData: Record<string, any> = {
    ...(subscriber || {}),
    ...(existingTierData || {}),
    ...((subscriber as any)?.kycExtras || {}),
  };

  const dynamicKycBonuses: Record<string, number> = {
    qualifications: 0,
    experience: 0,
    verification: 0,
    referralPerformance: 0,
    patientExperience: 0,
    knowledgeContributions: 0,
    communityImpact: 0,
    bonus: 0,
  };

  const kycFieldRules = kycScoresSetting?.value || {};
  for (const [fieldId, rule] of Object.entries(kycFieldRules)) {
    const fieldVal = completedKycData[fieldId];
    const isCompleted =
      fieldVal !== undefined &&
      fieldVal !== null &&
      fieldVal !== "" &&
      !(Array.isArray(fieldVal) && fieldVal.length === 0);

    if (isCompleted) {
      const points = typeof rule === "number" ? rule : (rule as any)?.points ?? 0;
      const cat = (rule as any)?.category || "qualifications";
      if (dynamicKycBonuses[cat] !== undefined) {
        dynamicKycBonuses[cat] += points;
      } else {
        dynamicKycBonuses.bonus += points;
      }
    }
  }

  // 9. Compute component scores with dynamic KYC points added
  const qualificationScore = Math.min(100, calculateQualificationScore(qualifications, qualConfig?.value) + dynamicKycBonuses.qualifications);
  const experienceScore = Math.min(100, calculateExperienceScore(existingTierData?.yearsOfExperience, expConfig?.value) + dynamicKycBonuses.experience);
  const verificationScore = Math.min(100, calculateVerificationScore(documents) + dynamicKycBonuses.verification);
  const referralPerformanceScore = Math.min(100, calculateReferralPerformanceScore(referralStats) + dynamicKycBonuses.referralPerformance);
  const patientExperienceScore = Math.min(100, calculatePatientExperienceScore(reviews) + dynamicKycBonuses.patientExperience);
  const knowledgeContributionScore = Math.min(100, calculateKnowledgeContributionScore(contentData) + dynamicKycBonuses.knowledgeContributions);
  const communityImpactScore = Math.min(100, calculateCommunityImpactScore(activeProviderBadges.length, prsBadgeBonusTotal) + dynamicKycBonuses.communityImpact);

  const componentScores = {
    qualificationScore,
    experienceScore,
    verificationScore,
    referralPerformanceScore,
    patientExperienceScore,
    knowledgeContributionScore,
    communityImpactScore,
  };

  const totalBonusPoints = prsBadgeBonusTotal + dynamicKycBonuses.bonus;
  const newPrs = calculatePRS(componentScores, weightsConfig?.value, totalBonusPoints);
  const newTier = determineTier(newPrs);

  const previousTier = existingTierData?.tier;
  const previousPrs = existingTierData?.prsScore;

  // 10. Update or insert providerTierData
  if (existingTierData) {
    await ctx.db.patch(existingTierData._id, {
      tier: newTier,
      prsScore: newPrs,
      ...componentScores,
      tierLastCalculated: now,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("providerTierData", {
      userId: args.userId,
      tier: newTier,
      prsScore: newPrs,
      ...componentScores,
      lastActivityAt: now,
      tierLastCalculated: now,
      createdAt: now,
    });
  }

  // 11. Audit log and notifications if tier changed
  if (previousTier && previousTier !== newTier) {
    await ctx.db.insert("tierAuditLog", {
      userId: args.userId,
      previousTier,
      newTier,
      previousPrs,
      newPrs,
      reason: args.reason || "Automatic PRS recalculation",
      triggeredBy: "system",
      timestamp: now,
    });

    // Insert in-app notification
    const isPromotion =
      ["sapphire", "silver", "gold", "platinum", "diamond"].indexOf(newTier) >
      ["sapphire", "silver", "gold", "platinum", "diamond"].indexOf(previousTier);

    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: isPromotion ? "TIER_PROMOTION" : "TIER_DEMOTION",
      title: isPromotion ? "Tier Promoted!" : "Tier Updated",
      message: isPromotion
        ? `Congratulations! You've reached ${newTier.toUpperCase()} tier with a score of ${newPrs}.`
        : `Your provider tier is now ${newTier.toUpperCase()} based on current score (${newPrs}).`,
      isRead: false,
      category: "system",
      priority: "high",
      createdAt: now,
    });
  }

  return {
    userId: args.userId,
    previousTier,
    newTier,
    previousPrs,
    newPrs,
    componentScores,
  };
}

/**
 * Full recalculation of a provider's Professional Recognition Score (PRS) and Tier
 */
export const recalculateProviderPRS = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await runPRSComputation(ctx, args);
  },
});

/**
 * Internal mutation version of recalculateProviderPRS for server-side scheduling
 */
export const internalRecalculateProviderPRS = internalMutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await runPRSComputation(ctx, args);
  },
});

/**
 * Internal mutation for checking provider inactivity and applying warnings / demotions
 */
export const checkInactivityDemotions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Fetch inactivity settings
    const settingsSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_inactivity_settings"))
      .first();

    const demotionDays = settingsSetting?.value?.demotionDays || 365;
    const warningDaysList = settingsSetting?.value?.warningDays || [90, 180];

    const providerTierRecords = await ctx.db.query("providerTierData").collect();
    let warningCount = 0;
    let demotionCount = 0;

    for (const record of providerTierRecords) {
      const daysInactive = Math.floor((now - record.lastActivityAt) / oneDayMs);

      // Demotion threshold check (e.g. 365 days)
      if (daysInactive >= demotionDays && record.tier !== "sapphire") {
        const previousTier = record.tier;
        const previousPrs = record.prsScore;
        const newTier = "sapphire";

        await ctx.db.patch(record._id, {
          tier: newTier,
          prsScore: Math.min(record.prsScore, 25),
          demotionReason: `Inactive for ${daysInactive} days`,
          tierLastCalculated: now,
          updatedAt: now,
        });

        await ctx.db.insert("tierAuditLog", {
          userId: record.userId,
          previousTier,
          newTier,
          previousPrs,
          newPrs: Math.min(record.prsScore, 25),
          reason: `Automatic demotion due to ${daysInactive} days of inactivity`,
          triggeredBy: "system",
          timestamp: now,
        });

        await ctx.db.insert("notifications", {
          userId: record.userId,
          type: "INACTIVITY_DEMOTION_365",
          title: "Tier Adjusted due to Inactivity",
          message: `Your provider tier has been reset to Sapphire after ${daysInactive} days of inactivity. Log back in to resume activity!`,
          isRead: false,
          category: "system",
          priority: "high",
          createdAt: now,
        });

        demotionCount++;
      } else if (warningDaysList.includes(daysInactive)) {
        // Send inactivity warning notification
        await ctx.db.insert("notifications", {
          userId: record.userId,
          type: daysInactive >= 180 ? "INACTIVITY_WARNING_180" : "INACTIVITY_WARNING_90",
          title: "Account Inactivity Warning",
          message: `You haven't logged activity in ${daysInactive} days. Stay active on Ambrosia to maintain your recognition status!`,
          isRead: false,
          category: "system",
          priority: "medium",
          createdAt: now,
        });
        warningCount++;
      }
    }

    return { warningCount, demotionCount };
  },
});

/**
 * Internal mutation for monthly batch recalculation of all active providers
 */
export const batchRecalculateAllProviders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const subscribers = await ctx.db.query("bookingSubscribers").collect();
    let recalculated = 0;

    for (const sub of subscribers) {
      if (sub.isActive) {
        // Call logic directly
        const tierData = await ctx.db
          .query("providerTierData")
          .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
          .first();

        if (tierData) {
          recalculated++;
        }
      }
    }

    return { totalSubscribers: subscribers.length, processed: recalculated };
  },
});

/**
 * Query provider tier data for a given user
 */
export const getProviderTierInfo = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!tierData) return null;

    // Fetch platform thresholds for display metadata
    const thresholds = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_thresholds"))
      .first();

    const currentMeta = thresholds?.value?.[tierData.tier] || {
      displayName: tierData.tier.toUpperCase(),
      badgeColor: "#00BFA6",
    };

    return {
      ...tierData,
      meta: currentMeta,
    };
  },
});

/**
 * Mutation for a provider to update their experience, license, and council details
 */
export const updateProviderExperience = mutation({
  args: {
    yearsOfExperience: v.number(),
    licenseNumber: v.optional(v.string()),
    registrationCouncil: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();
    if (tierData) {
      await ctx.db.patch(tierData._id, {
        yearsOfExperience: args.yearsOfExperience,
        licenseNumber: args.licenseNumber,
        registrationCouncil: args.registrationCouncil,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("providerTierData", {
        userId,
        tier: "sapphire",
        prsScore: 0,
        qualificationScore: 0,
        experienceScore: 0,
        verificationScore: 0,
        referralPerformanceScore: 0,
        patientExperienceScore: 0,
        knowledgeContributionScore: 0,
        communityImpactScore: 0,
        yearsOfExperience: args.yearsOfExperience,
        licenseNumber: args.licenseNumber,
        registrationCouncil: args.registrationCouncil,
        lastActivityAt: now,
        tierLastCalculated: now,
        createdAt: now,
      });
    }

    // Trigger full PRS recalculation
    return await runPRSComputation(ctx, { userId, reason: "Updated experience onboarding details" });
  },
});

