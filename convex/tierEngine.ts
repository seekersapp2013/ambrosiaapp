/**
 * Pure scoring calculation functions for Ambrosia Provider Tier System.
 * Normalizes all component scores to 0-100 and computes weighted PRS.
 */

export interface QualificationPointsConfig {
  [category: string]: { points: number; maxCountable: number };
}

export interface ExperienceBracket {
  min: number;
  max: number;
  score: number;
}

export interface TierThresholdsConfig {
  [tier: string]: {
    min: number;
    max: number;
    displayName: string;
    badgeColor: string;
    description: string;
  };
}

export interface PRSWeightsConfig {
  qualifications: number;
  experience: number;
  verification: number;
  referralPerformance: number;
  patientExperience: number;
  knowledgeContributions: number;
  communityImpact: number;
}

/**
 * Qualification Score (0-100)
 * Sums points of verified qualifications according to category limits, then normalizes.
 */
export function calculateQualificationScore(
  qualifications: Array<{ category: string; isVerified: boolean; points?: number }>,
  config?: QualificationPointsConfig
): number {
  if (!qualifications || qualifications.length === 0) return 0;

  const defaultConfig: QualificationPointsConfig = {
    basic_degree: { points: 10, maxCountable: 1 },
    additional_certification: { points: 3, maxCountable: 4 },
    fellowship: { points: 8, maxCountable: 3 },
    residency: { points: 10, maxCountable: 1 },
    consultant_status: { points: 12, maxCountable: 1 },
    masters: { points: 6, maxCountable: 2 },
    doctorate: { points: 10, maxCountable: 1 },
  };

  const pointsConfig = config || defaultConfig;
  const verifiedQuals = qualifications.filter((q) => q.isVerified);
  const categoryCounts: Record<string, number> = {};
  let totalRawPoints = 0;

  for (const qual of verifiedQuals) {
    const categoryRule = pointsConfig[qual.category] || { points: 5, maxCountable: 2 };
    const currentCount = categoryCounts[qual.category] || 0;

    if (currentCount < categoryRule.maxCountable) {
      totalRawPoints += qual.points || categoryRule.points;
      categoryCounts[qual.category] = currentCount + 1;
    }
  }

  // Max theoretical raw points ~ 50 points -> mapped to 100
  const maxPossibleRaw = 50;
  const normalized = Math.min(100, Math.round((totalRawPoints / maxPossibleRaw) * 100));
  return normalized;
}

/**
 * Experience Score (0-100)
 * Maps years of professional experience to 0-100 bracket score.
 */
export function calculateExperienceScore(
  yearsOfExperience?: number,
  bracketsConfig?: ExperienceBracket[]
): number {
  if (yearsOfExperience === undefined || yearsOfExperience === null || yearsOfExperience < 0) {
    return 0;
  }

  const defaultBrackets: ExperienceBracket[] = [
    { min: 0, max: 2, score: 20 },
    { min: 3, max: 5, score: 40 },
    { min: 6, max: 10, score: 65 },
    { min: 11, max: 20, score: 85 },
    { min: 21, max: 999, score: 100 },
  ];

  const brackets = bracketsConfig || defaultBrackets;
  for (const b of brackets) {
    if (yearsOfExperience >= b.min && yearsOfExperience <= b.max) {
      return b.score;
    }
  }

  return 100;
}

/**
 * Verification Score (0-100)
 * Scores approved verification documents.
 */
export function calculateVerificationScore(
  documents: Array<{ documentType: string; status: string }>
): number {
  if (!documents || documents.length === 0) return 0;

  const approvedDocs = documents.filter((d) => d.status === "approved");
  const docWeights: Record<string, number> = {
    professional_license: 30,
    registration_council: 25,
    employer_verification: 20,
    hospital_verification: 15,
    association_membership: 10,
    identity: 10,
  };

  const seenTypes = new Set<string>();
  let rawScore = 0;

  for (const doc of approvedDocs) {
    if (!seenTypes.has(doc.documentType)) {
      seenTypes.add(doc.documentType);
      rawScore += docWeights[doc.documentType] || 10;
    }
  }

  // Max possible raw score = 110 -> capped at 100
  return Math.min(100, Math.round((rawScore / 100) * 100));
}

/**
 * Referral Performance Score (0-100)
 * Evaluates accepted/completed referrals, response speed, success ratings.
 */
export function calculateReferralPerformanceScore(referralStats: {
  totalReceived: number;
  acceptedCount: number;
  completedCount: number;
  declinedCount: number;
  avgResponseTimeMinutes?: number;
  avgSuccessRating?: number; // 1-5
}): number {
  if (!referralStats || referralStats.totalReceived === 0) return 0;

  const { totalReceived, acceptedCount, completedCount, avgResponseTimeMinutes, avgSuccessRating } =
    referralStats;

  // 1. Acceptance rate (25 pts max)
  const acceptanceRate = acceptedCount / totalReceived;
  const acceptanceScore = acceptanceRate * 25;

  // 2. Completion rate (30 pts max)
  const completionRate = acceptedCount > 0 ? completedCount / acceptedCount : 0;
  const completionScore = completionRate * 30;

  // 3. Response speed (20 pts max)
  let speedScore = 15; // default moderate
  if (avgResponseTimeMinutes !== undefined && avgResponseTimeMinutes !== null) {
    if (avgResponseTimeMinutes <= 60) speedScore = 20; // within 1 hr
    else if (avgResponseTimeMinutes <= 360) speedScore = 15; // within 6 hrs
    else if (avgResponseTimeMinutes <= 1440) speedScore = 10; // within 24 hrs
    else speedScore = 5;
  }

  // 4. Success rating (15 pts max)
  const ratingScore = avgSuccessRating ? (avgSuccessRating / 5) * 15 : 10;

  // 5. Reliability (10 pts max)
  const reliabilityScore = 10;

  const total = Math.round(acceptanceScore + completionScore + speedScore + ratingScore + reliabilityScore);
  return Math.min(100, Math.max(0, total));
}

/**
 * Patient Experience Score (0-100)
 * Evaluates patient reviews. Minimum 3 reviews required for full score activation.
 */
export function calculatePatientExperienceScore(
  reviews: Array<{ overallRating: number; createdAt: number; isFlaggedFraudulent?: boolean }>
): number {
  const validReviews = (reviews || []).filter((r) => !r.isFlaggedFraudulent);
  if (validReviews.length === 0) return 0;

  const now = Date.now();
  const oneYearMs = 365 * 24 * 60 * 60 * 1000;
  let weightedSum = 0;
  let weightTotal = 0;

  for (const rev of validReviews) {
    const age = now - rev.createdAt;
    const weight = age <= oneYearMs ? 2.0 : 1.0;
    weightedSum += rev.overallRating * weight;
    weightTotal += weight;
  }

  const avgRating = weightedSum / weightTotal; // 1-5
  let score = (avgRating / 5) * 100;

  // Small sample penalty if < 3 reviews
  if (validReviews.length < 3) {
    score = score * (validReviews.length / 3);
  }

  return Math.min(100, Math.round(score));
}

/**
 * Knowledge Contribution Score (0-100)
 * Scores published articles, reels, events, and their views/engagement.
 */
export function calculateKnowledgeContributionScore(data: {
  articleCount: number;
  reelCount: number;
  eventCount: number;
  totalViews: number;
  totalLikes: number;
}): number {
  if (!data) return 0;

  const articlePoints = data.articleCount * 8;
  const reelPoints = data.reelCount * 5;
  const eventPoints = data.eventCount * 10;
  const engagementPoints = Math.min(30, Math.round(data.totalViews * 0.01 + data.totalLikes * 0.1));

  const totalRaw = articlePoints + reelPoints + eventPoints + engagementPoints;
  return Math.min(100, Math.round((totalRaw / 80) * 100));
}

/**
 * Community Impact Score (0-100)
 * Scores active community badges held by the provider plus bonus PRS points.
 */
export function calculateCommunityImpactScore(activeBadgesCount: number, badgePrsBonusTotal: number = 0): number {
  const badgePoints = Math.min(80, activeBadgesCount * 25);
  const total = badgePoints + badgePrsBonusTotal * 5;
  return Math.min(100, Math.round(total));
}

/**
 * PRS Weighted Combination (0-100)
 */
export function calculatePRS(
  componentScores: {
    qualificationScore: number;
    experienceScore: number;
    verificationScore: number;
    referralPerformanceScore: number;
    patientExperienceScore: number;
    knowledgeContributionScore: number;
    communityImpactScore: number;
  },
  weights?: PRSWeightsConfig,
  badgeBonusPrs: number = 0
): number {
  const defaultWeights: PRSWeightsConfig = {
    qualifications: 0.30,
    experience: 0.20,
    verification: 0.15,
    referralPerformance: 0.10,
    patientExperience: 0.10,
    knowledgeContributions: 0.10,
    communityImpact: 0.05,
  };

  const w = weights || defaultWeights;

  const weightedSum =
    componentScores.qualificationScore * w.qualifications +
    componentScores.experienceScore * w.experience +
    componentScores.verificationScore * w.verification +
    componentScores.referralPerformanceScore * w.referralPerformance +
    componentScores.patientExperienceScore * w.patientExperience +
    componentScores.knowledgeContributionScore * w.knowledgeContributions +
    componentScores.communityImpactScore * w.communityImpact;

  const totalWithBonus = weightedSum + badgeBonusPrs;
  return Math.min(100, Math.max(0, Math.round(totalWithBonus)));
}

/**
 * Determine Tier from PRS score and threshold config
 */
export function determineTier(
  prsScore: number,
  thresholdsConfig?: TierThresholdsConfig
): "sapphire" | "silver" | "gold" | "platinum" | "diamond" {
  if (prsScore >= 90) return "diamond";
  if (prsScore >= 75) return "platinum";
  if (prsScore >= 55) return "gold";
  if (prsScore >= 30) return "silver";
  return "sapphire";
}
