import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { checkReviewRules } from "./reviewFraudDetection";

/**
 * Patient creates a review for a completed booking
 */
export const createReview = mutation({
  args: {
    providerId: v.id("users"),
    bookingId: v.id("bookings"),
    overallRating: v.number(), // 1-5
    comment: v.optional(v.string()),
    isAnonymous: v.boolean(),
    highlightedStrengths: v.optional(
      v.array(
        v.union(
          v.literal("professionalism"),
          v.literal("communication"),
          v.literal("punctuality"),
          v.literal("compassion"),
          v.literal("clarity"),
          v.literal("followUp"),
          v.literal("respect"),
          v.literal("confidentiality")
        )
      )
    ),
  },
  handler: async (ctx, args) => {
    const patientId = await getAuthUserId(ctx);
    if (!patientId) {
      throw new Error("Not authenticated");
    }

    if (args.overallRating < 1 || args.overallRating > 5) {
      throw new Error("Rating must be between 1 and 5 stars");
    }

    // Verify booking
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.providerId !== args.providerId) {
      throw new Error("Booking does not match specified provider");
    }

    // Check existing reviews for this booking
    const existing = await ctx.db
      .query("providerReviews")
      .withIndex("by_bookingId", (q) => q.eq("bookingId", args.bookingId))
      .collect();

    const ruleCheck = checkReviewRules({
      bookingStatus: booking.status,
      isClient: booking.clientId === patientId,
      existingReviewsCount: existing.length,
      completedAt: booking.updatedAt,
    });

    if (ruleCheck.isFraudulent) {
      throw new Error(ruleCheck.reason || "Review validation failed");
    }

    const now = Date.now();

    // Limit highlighted strengths to max 3
    const strengths = (args.highlightedStrengths || []).slice(0, 3);

    const reviewId = await ctx.db.insert("providerReviews", {
      providerId: args.providerId,
      patientId,
      bookingId: args.bookingId,
      overallRating: args.overallRating,
      comment: args.comment?.trim(),
      isAnonymous: args.isAnonymous,
      highlightedStrengths: strengths,
      isFlaggedFraudulent: false,
      createdAt: now,
    });

    // Award session base EXP & star rating bonus EXP to provider
    try {
      await ctx.runMutation(api.providerExp.awardExp, {
        userId: args.providerId,
        eventType: "completed_session",
        sourceId: args.bookingId,
      });

      const ratingEventMap: Record<number, any> = {
        5: "session_rating_5_star",
        4: "session_rating_4_star",
        3: "session_rating_3_star",
        2: "session_rating_2_star",
        1: "session_rating_1_star",
      };

      const eventType = ratingEventMap[args.overallRating] || "session_rating_5_star";
      await ctx.runMutation(api.providerExp.awardExp, {
        userId: args.providerId,
        eventType,
        sourceId: args.bookingId,
        metadata: { rating: args.overallRating },
      });
    } catch (err) {
      console.error("Failed to award session EXP:", err);
    }

    return { reviewId };
  },
});

/**
 * Get reviews for a provider
 */
export const getProviderReviews = query({
  args: {
    providerId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const reviews = await ctx.db
      .query("providerReviews")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .filter((q) => q.neq(q.field("isFlaggedFraudulent"), true))
      .order("desc")
      .take(limit);

    const hydrated = await Promise.all(
      reviews.map(async (r) => {
        let reviewerName = "Anonymous Patient";
        let reviewerAvatar: string | undefined = undefined;

        if (!r.isAnonymous) {
          const profile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", r.patientId))
            .first();
          if (profile) {
            reviewerName = profile.name || profile.username || "Patient";
            reviewerAvatar = profile.avatar;
          }
        }

        return {
          ...r,
          reviewerName,
          reviewerAvatar,
        };
      })
    );

    return hydrated;
  },
});

/**
 * Aggregate review metrics and top strength counts for a provider
 */
export const getProviderReviewSummary = query({
  args: {
    providerId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("providerReviews")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.providerId))
      .filter((q) => q.neq(q.field("isFlaggedFraudulent"), true))
      .collect();

    if (reviews.length === 0) {
      return {
        totalReviews: 0,
        averageRating: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        strengthFrequency: {},
      };
    }

    let sum = 0;
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const strengthFrequency: Record<string, number> = {};

    for (const r of reviews) {
      sum += r.overallRating;
      const rounded = Math.round(r.overallRating);
      distribution[rounded] = (distribution[rounded] || 0) + 1;

      if (r.highlightedStrengths) {
        for (const s of r.highlightedStrengths) {
          strengthFrequency[s] = (strengthFrequency[s] || 0) + 1;
        }
      }
    }

    return {
      totalReviews: reviews.length,
      averageRating: parseFloat((sum / reviews.length).toFixed(1)),
      distribution,
      strengthFrequency,
    };
  },
});

/**
 * Delete a review
 */
export const deleteReview = mutation({
  args: {
    reviewId: v.id("providerReviews"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new Error("Review not found");

    if (review.patientId !== userId) {
      throw new Error("Not authorized to delete this review");
    }

    await ctx.db.delete(args.reviewId);
    return { success: true };
  },
});
