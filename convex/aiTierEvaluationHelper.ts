import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Helper internal query to gather complete provider KYC context,
 * deterministic component scores, and admin platform settings for AI prompt.
 */
export const getProviderContext = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const qualifications = await ctx.db
      .query("providerQualifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const documents = await ctx.db
      .query("verificationDocuments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();

    const events = await ctx.db
      .query("events")
      .withIndex("by_provider", (q) => q.eq("providerId", args.userId))
      .collect();

    const reviews = await ctx.db
      .query("providerReviews")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.userId))
      .collect();

    const activeProviderBadges = await ctx.db
      .query("providerBadges")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const badgesWithDetails = await Promise.all(
      activeProviderBadges.map(async (pb) => {
        const badge = await ctx.db.get(pb.badgeId);
        return {
          name: badge?.name,
          displayName: badge?.displayName,
          badgeType: badge?.badgeType,
          prsBonus: badge?.benefits?.prsBonus || 0,
        };
      })
    );

    // ── Admin-configured platform settings ────────────────────────────────────
    const prsWeights = await ctx.db
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

    const tierThresholds = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_thresholds"))
      .first();

    const tierConfig = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_config"))
      .first();

    const kycScoresSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "kyc_field_scores"))
      .first();

    const completedKycData: Record<string, any> = {
      ...(subscriber || {}),
      ...(tierData || {}),
      ...((subscriber as any)?.kycExtras || {}),
    };

    const kycPointBreakdown: Array<{
      fieldId: string;
      label: string;
      value: any;
      category: string;
      pointsAwarded: number;
    }> = [];

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
        const label = (rule as any)?.label || fieldId;
        kycPointBreakdown.push({
          fieldId,
          label,
          value: typeof fieldVal === "object" ? JSON.stringify(fieldVal) : String(fieldVal),
          category: cat,
          pointsAwarded: points,
        });
      }
    }

    const totalViews = articles.reduce((acc, a) => acc + (a.views || 0), 0);
    const validReviews = reviews.filter((r) => !r.isFlaggedFraudulent);
    const avgReviewRating =
      validReviews.length > 0
        ? validReviews.reduce((sum, r) => sum + r.overallRating, 0) / validReviews.length
        : 0;

    return {
      userId: args.userId,
      name: profile?.name || profile?.username || "Provider",
      username: profile?.username,
      jobTitle: subscriber?.jobTitle || "Healthcare Practitioner",
      specialization: subscriber?.specialization || "General Practice",
      aboutUser: subscriber?.aboutUser || "",
      offerDescription: subscriber?.offerDescription || "",
      yearsOfExperience: tierData?.yearsOfExperience || 0,
      licenseNumber: tierData?.licenseNumber || "Unspecified",
      registrationCouncil: tierData?.registrationCouncil || "Unspecified",
      geographicRecognition: tierData?.geographicRecognition || "community",
      tier: tierData?.tier || "sapphire",
      prsScore: tierData?.prsScore || 0,
      totalExp: tierData?.totalExp || 0,
      monthlyExp: tierData?.monthlyExp || 0,
      componentScores: {
        qualificationScore: tierData?.qualificationScore || 0,
        experienceScore: tierData?.experienceScore || 0,
        verificationScore: tierData?.verificationScore || 0,
        referralPerformanceScore: tierData?.referralPerformanceScore || 0,
        patientExperienceScore: tierData?.patientExperienceScore || 0,
        knowledgeContributionScore: tierData?.knowledgeContributionScore || 0,
        communityImpactScore: tierData?.communityImpactScore || 0,
      },
      adminSettings: {
        weights: prsWeights?.value || {
          qualifications: 0.30,
          experience: 0.20,
          verification: 0.15,
          referralPerformance: 0.10,
          patientExperience: 0.10,
          knowledgeContributions: 0.10,
          communityImpact: 0.05,
        },
        qualificationPoints: qualPoints?.value,
        experienceBrackets: expBrackets?.value,
        thresholds: tierThresholds?.value,
        tierConfig: tierConfig?.value,
        kycFieldScores: kycScoresSetting?.value,
      },
      kycPointBreakdown,
      qualifications: qualifications.map((q) => ({
        name: q.name,
        category: q.category,
        institution: q.institution,
        yearObtained: q.yearObtained,
        points: q.points,
        verified: q.isVerified,
      })),
      documents: documents.map((d) => ({
        type: d.documentType,
        name: d.documentName,
        status: d.status,
      })),
      activeBadges: badgesWithDetails,
      articleCount: articles.filter((a) => a.status === "PUBLISHED").length,
      reelCount: reels.length,
      eventCount: events.length,
      totalViews,
      reviewCount: validReviews.length,
      avgReviewRating,
      kycExtras: subscriber?.kycExtras,
    };
  },
});

/**
 * Helper internal mutation to apply AI evaluation results and record audit log
 */
export const applyAIEvaluationResult = internalMutation({
  args: {
    userId: v.id("users"),
    recommendedTier: v.string(),
    confidenceScore: v.number(),
    adjustedPrsScore: v.optional(v.number()),
    rationale: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const tierConfigSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_config"))
      .first();

    const minConfidence = tierConfigSetting?.value?.aiConfidenceThreshold ?? 0.75;
    const previousTier = tierData?.tier || "sapphire";
    const previousPrs = tierData?.prsScore || 0;

    // Minimum baseline score per tier to keep tier and score aligned
    const tierBaselineMap: Record<string, number> = {
      sapphire: 15,
      silver: 35,
      gold: 60,
      platinum: 80,
      diamond: 92,
    };

    const targetPrs = args.adjustedPrsScore !== undefined
      ? Math.min(100, Math.max(0, args.adjustedPrsScore))
      : (tierData ? Math.max(tierData.prsScore, tierBaselineMap[args.recommendedTier] || 15) : 15);

    if (tierData && args.confidenceScore >= minConfidence) {
      await ctx.db.patch(tierData._id, {
        tier: args.recommendedTier as any,
        prsScore: targetPrs,
        tierLastCalculated: now,
        updatedAt: now,
      });

      // Write audit log
      await ctx.db.insert("tierAuditLog", {
        userId: args.userId,
        previousTier,
        newTier: args.recommendedTier,
        previousPrs,
        newPrs: targetPrs,
        reason: "AI-driven automated tier evaluation with Admin scoring synthesis",
        triggeredBy: "ai",
        aiConfidenceScore: args.confidenceScore,
        aiExplanation: args.rationale,
        timestamp: now,
      });

      // Send notification if tier changed
      if (previousTier !== args.recommendedTier) {
        const tierOrder = ["sapphire", "silver", "gold", "platinum", "diamond"];
        const isPromotion = tierOrder.indexOf(args.recommendedTier) > tierOrder.indexOf(previousTier);

        await ctx.db.insert("notifications", {
          userId: args.userId,
          type: isPromotion ? "TIER_PROMOTION" : "TIER_DEMOTION",
          title: isPromotion ? "Tier Promoted!" : "Tier Status Update",
          message: isPromotion
            ? `Congratulations! You've reached ${args.recommendedTier.toUpperCase()} tier (Score: ${targetPrs}).`
            : `Your provider tier is now ${args.recommendedTier.toUpperCase()} based on clinical evaluation.`,
          isRead: false,
          category: "system",
          priority: "high",
          createdAt: now,
        });
      }
    } else {
      // Create pending downgrade/review audit entry if confidence is below threshold
      await ctx.db.insert("tierAuditLog", {
        userId: args.userId,
        previousTier,
        newTier: args.recommendedTier,
        previousPrs,
        newPrs: targetPrs,
        reason: "AI evaluation suggested tier update with medium confidence. Awaiting admin review.",
        triggeredBy: "ai",
        aiConfidenceScore: args.confidenceScore,
        aiExplanation: args.rationale,
        pendingDowngrade: true,
        timestamp: now,
      });
    }

    return { success: true };
  },
});
