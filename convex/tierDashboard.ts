import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getMyTierDashboard = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const currentTier = tierData?.tier || "sapphire";
    const prsScore = tierData?.prsScore || 0;

    // Component scores
    const componentScores = {
      qualificationScore: tierData?.qualificationScore || 0,
      experienceScore: tierData?.experienceScore || 0,
      verificationScore: tierData?.verificationScore || 0,
      referralPerformanceScore: tierData?.referralPerformanceScore || 0,
      patientExperienceScore: tierData?.patientExperienceScore || 0,
      knowledgeContributionScore: tierData?.knowledgeContributionScore || 0,
      communityImpactScore: tierData?.communityImpactScore || 0,
    };

    // Determine next tier threshold
    const tierOrder = ["sapphire", "silver", "gold", "platinum", "diamond"];
    const currentIdx = tierOrder.indexOf(currentTier);
    const nextTier = currentIdx < tierOrder.length - 1 ? tierOrder[currentIdx + 1] : null;

    const thresholdMap: Record<string, number> = {
      sapphire: 0,
      silver: 30,
      gold: 55,
      platinum: 75,
      diamond: 90,
    };

    const nextThreshold = nextTier ? thresholdMap[nextTier] : 100;
    const currentThreshold = thresholdMap[currentTier];
    const pointsNeeded = nextTier ? Math.max(0, nextThreshold - prsScore) : 0;
    const progressRange = nextThreshold - currentThreshold;
    const currentProgress = prsScore - currentThreshold;
    const progressPercentage =
      nextTier && progressRange > 0
        ? Math.min(100, Math.max(0, Math.round((currentProgress / progressRange) * 100)))
        : 100;

    // Generate smart improvement suggestions
    const suggestions = [];

    if (componentScores.verificationScore < 80) {
      suggestions.push({
        id: "s_verif",
        area: "Verification Status",
        title: "Upload Professional Licence",
        description: "Verified documents contribute up to 15% directly to your PRS score.",
        potentialGain: 20,
        actionLink: "verification",
      });
    }

    if (componentScores.qualificationScore < 70) {
      suggestions.push({
        id: "s_qual",
        area: "Qualifications & Degrees",
        title: "Add Medical Certifications",
        description: "Degrees, residencies, and Fellowships contribute up to 30% of your score.",
        potentialGain: 15,
        actionLink: "qualifications",
      });
    }

    if (componentScores.knowledgeContributionScore < 60) {
      suggestions.push({
        id: "s_know",
        area: "Knowledge Contributions",
        title: "Publish Articles & Host Events",
        description: "Educating the community through posts and live sessions boosts your reach.",
        potentialGain: 12,
        actionLink: "content",
      });
    }

    if (componentScores.referralPerformanceScore < 70) {
      suggestions.push({
        id: "s_ref",
        area: "Referral Performance",
        title: "Respond Promptly to Patient Referrals",
        description: "Maintain fast response times and high completion rates for colleague referrals.",
        potentialGain: 10,
        actionLink: "referrals",
      });
    }

    // Fetch audit history
    const auditLogs = await ctx.db
      .query("tierAuditLog")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    // Fetch provider active badges
    const activeBadges = await ctx.db
      .query("providerBadges")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const badgesWithMeta = await Promise.all(
      activeBadges.map(async (b) => {
        const badgeDef = await ctx.db.get(b.badgeId);
        return {
          ...b,
          badgeDef,
        };
      })
    );

    return {
      currentTier,
      prsScore,
      componentScores,
      progressToNextTier: {
        nextTier,
        nextThreshold,
        pointsNeeded,
        progressPercentage,
      },
      improvementSuggestions: suggestions,
      tierHistory: auditLogs,
      activeBadges: badgesWithMeta,
      lastCalculated: tierData?.tierLastCalculated || Date.now(),
    };
  },
});
