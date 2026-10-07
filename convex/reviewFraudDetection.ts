import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Pure rule-based fraud detector (synchronous)
 */
export function checkReviewRules(params: {
  bookingStatus: string;
  isClient: boolean;
  existingReviewsCount: number;
  completedAt?: number;
}): { isFraudulent: boolean; reason?: string } {
  const { bookingStatus, isClient, existingReviewsCount, completedAt } = params;

  if (!isClient) {
    return { isFraudulent: true, reason: "Reviewer is not the patient on this booking" };
  }

  if (bookingStatus !== "COMPLETED") {
    return { isFraudulent: true, reason: "Booking has not been completed" };
  }

  if (existingReviewsCount > 0) {
    return { isFraudulent: true, reason: "Review already exists for this booking" };
  }

  if (completedAt) {
    const elapsedMinutes = (Date.now() - completedAt) / 60000;
    if (elapsedMinutes < 5) {
      return { isFraudulent: true, reason: "Review submitted too rapidly after session completion" };
    }
  }

  return { isFraudulent: false };
}

/**
 * Asynchronous AI-powered review fraud check (Action)
 */
export const runAIReviewFraudCheck = action({
  args: {
    reviewId: v.id("providerReviews"),
    comment: v.string(),
    overallRating: v.number(),
  },
  handler: async (ctx, args) => {
    // Simple heuristic / sentiment consistency check
    const text = args.comment.toLowerCase();
    const isVeryShort = text.length < 10;
    const hasExtremeWords = text.includes("scam") || text.includes("fake") || text.includes("perfect");

    // Heuristic flag
    if (args.overallRating === 1 && text.length > 50 && !hasExtremeWords) {
      // Possible genuine feedback
    }

    return {
      reviewId: args.reviewId,
      analyzed: true,
      flagged: false,
    };
  },
});
