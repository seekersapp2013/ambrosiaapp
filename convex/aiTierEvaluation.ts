import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * AI-Driven Provider Tier Evaluation Action.
 * Synthesizes provider KYC credentials, deterministic admin-based PRS scores,
 * verification status, and engagement metrics into an AI credentialing audit.
 */
export const evaluateProviderTierWithAI = action({
  args: {
    userId: v.id("users"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    mode?: string;
    recommendedTier?: string;
    confidenceScore?: number;
    adjustedPrsScore?: number;
    rationale?: string;
    reason?: string;
    error?: string;
  }> => {
    const apiKey =
      process.env.VITE_NOVA_API_KEY ||
      process.env.NOVA_API_KEY ||
      process.env.AMAZON_NOVA_API_KEY;

    // 1. Fetch comprehensive provider context & admin scoring settings
    const tierData: any = await ctx.runQuery(
      (internal as any).aiTierEvaluationHelper.getProviderContext,
      {
        userId: args.userId,
      }
    );

    if (!tierData) {
      console.warn("No profile/tier context found for user:", args.userId);
      return { success: false, reason: "User context not found" };
    }

    // 2. Check if AI evaluation is enabled in platform settings
    const isAiEnabled = tierData.adminSettings?.tierConfig?.aiEvaluationEnabled ?? true;
    if (!isAiEnabled) {
      console.log("AI Tier Evaluation is disabled in platform settings. Falling back to deterministic PRS computation.");
      await ctx.runMutation(
        internal.tierCalculation.internalRecalculateProviderPRS,
        {
          userId: args.userId,
          reason: "Deterministic calculation (AI disabled in settings)",
        }
      );
      return { success: true, mode: "deterministic_only" };
    }

    // 3. Handle missing API key fallback
    if (!apiKey) {
      console.warn(
        "Nova AI API key is not configured. Running deterministic PRS calculation fallback."
      );
      await ctx.runMutation(
        internal.tierCalculation.internalRecalculateProviderPRS,
        {
          userId: args.userId,
          reason: "AI evaluation fallback (missing API key)",
        }
      );
      return { success: true, mode: "deterministic_fallback" };
    }

    // 4. Format admin-configured weights for prompt
    const weights = tierData.adminSettings?.weights || {};
    const qualWeight = Math.round((weights.qualifications ?? 0.30) * 100);
    const expWeight = Math.round((weights.experience ?? 0.20) * 100);
    const verifWeight = Math.round((weights.verification ?? 0.15) * 100);
    const refWeight = Math.round((weights.referralPerformance ?? 0.10) * 100);
    const revWeight = Math.round((weights.patientExperience ?? 0.10) * 100);
    const knowWeight = Math.round((weights.knowledgeContributions ?? 0.10) * 100);
    const commWeight = Math.round((weights.communityImpact ?? 0.05) * 100);

    // 5. Build enriched credentialing prompt
    const prompt = `
You are an expert Healthcare Provider Credentialing & Tier Assignment Auditor for the Ambrosia Africa platform.
Your responsibility is to audit the provider's KYC profile, professional credentials, deterministic admin-based PRS scores, and platform engagement to validate or calibrate their recommended provider tier.

ADMIN-CONFIGURED SCORING FRAMEWORK:
- Weights: Qualifications (${qualWeight}%), Experience (${expWeight}%), Verification (${verifWeight}%), Referrals (${refWeight}%), Reviews (${revWeight}%), Knowledge Content (${knowWeight}%), Community Impact (${commWeight}%).
- Calculated Sub-Scores:
  * Qualification Score: ${tierData.componentScores?.qualificationScore ?? 0} / 100
  * Experience Score: ${tierData.componentScores?.experienceScore ?? 0} / 100
  * Verification Score: ${tierData.componentScores?.verificationScore ?? 0} / 100
  * Referral Score: ${tierData.componentScores?.referralPerformanceScore ?? 0} / 100
  * Patient Review Score: ${tierData.componentScores?.patientExperienceScore ?? 0} / 100
  * Knowledge Content Score: ${tierData.componentScores?.knowledgeContributionScore ?? 0} / 100
  * Community Impact Score: ${tierData.componentScores?.communityImpactScore ?? 0} / 100
- Baseline Deterministic PRS Score: ${tierData.prsScore} / 100
- Current Assigned Tier: ${tierData.tier}

TIER HIERARCHY & ADMIN THRESHOLDS:
- Sapphire: Beginner / Basic verified credentials (PRS < 30)
- Silver: Intermediate verified practitioner (PRS 30-54)
- Gold: Advanced verified practitioner with solid clinical background (PRS 55-74)
- Platinum: Senior practitioner with high expertise & high engagement (PRS 75-89)
- Diamond: Key Opinion Leader / Top clinical specialist (PRS >= 90)

PROVIDER KYC & CREDENTIAL PROFILE:
- Full Name: ${tierData.name || "Provider"}
- Job Title: ${tierData.jobTitle}
- Specialization: ${tierData.specialization}
- Years of Experience: ${tierData.yearsOfExperience} years
- Licensing Council: ${tierData.registrationCouncil} (License Number: ${tierData.licenseNumber})
- Geographic Recognition Scope: ${tierData.geographicRecognition}
- Clinical Bio: ${tierData.aboutUser || "N/A"}
- Service Offering: ${tierData.offerDescription || "N/A"}
- Qualifications: ${JSON.stringify(tierData.qualifications)}
- Verification Documents: ${JSON.stringify(tierData.documents)}
- Active Badges & PRS Bonuses: ${JSON.stringify(tierData.activeBadges)}
- Dynamic KYC Field Point Awards: ${JSON.stringify(tierData.kycPointBreakdown || [], null, 2)}
- Engagement Activity: ${tierData.articleCount} articles, ${tierData.reelCount} reels, ${tierData.eventCount} events, ${tierData.totalViews} views, ${tierData.reviewCount} reviews (Avg: ${tierData.avgReviewRating.toFixed(1)}/5), Total EXP: ${tierData.totalExp}.

INSTRUCTIONS:
Evaluate if the deterministic PRS score properly reflects the provider's overall clinical depth and credentials. If credentials indicate high expertise (e.g. 10+ years of practice, fellowship, verified license), ensure the recommended tier matches their seniority.
Respond ONLY with a valid JSON object in this exact schema:
{
  "recommendedTier": "sapphire" | "silver" | "gold" | "platinum" | "diamond",
  "confidenceScore": number between 0.0 and 1.0,
  "adjustedPrsScore": number between 0 and 100,
  "rationale": "Comprehensive explanation of clinical credential assessment referencing admin weights and provider profile..."
}
`;

    try {
      const response = await fetch(
        "https://api.nova.amazon.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "nova-2-lite-v1",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 600,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Nova API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const rawContent: string = data.choices?.[0]?.message?.content || "{}";
      const cleanJson: string = rawContent.replace(/```json|```/g, "").trim();
      const parsed: any = JSON.parse(cleanJson);

      const recommendedTier: string = parsed.recommendedTier || tierData.tier;
      const confidenceScore: number = typeof parsed.confidenceScore === "number" ? parsed.confidenceScore : 0.85;
      const adjustedPrsScore: number = typeof parsed.adjustedPrsScore === "number" ? parsed.adjustedPrsScore : tierData.prsScore;
      const rationale: string = parsed.rationale || "AI tier credentialing audit complete.";

      // Apply result to providerTierData and tierAuditLog
      await ctx.runMutation(
        (internal as any).aiTierEvaluationHelper.applyAIEvaluationResult,
        {
          userId: args.userId,
          recommendedTier,
          confidenceScore,
          adjustedPrsScore,
          rationale,
        }
      );

      return {
        success: true,
        recommendedTier,
        confidenceScore,
        adjustedPrsScore,
        rationale,
      };
    } catch (err: any) {
      console.error("AI Tier Evaluation error:", err);
      // Fallback to deterministic calculation on error
      await ctx.runMutation(
        internal.tierCalculation.internalRecalculateProviderPRS,
        {
          userId: args.userId,
          reason: "AI evaluation fallback (API error)",
        }
      );
      return { success: false, error: err.message };
    }
  },
});
