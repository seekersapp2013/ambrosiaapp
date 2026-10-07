import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Enhanced multi-factor search for providers
 */
export const searchProviders = query({
  args: {
    searchQuery: v.optional(v.string()),
    specialities: v.optional(v.array(v.string())),
    tiers: v.optional(v.array(v.string())), // e.g. ["gold", "platinum", "diamond"]
    verifiedOnly: v.optional(v.boolean()),
    sortBy: v.optional(
      v.union(
        v.literal("relevance"),
        v.literal("rating"),
        v.literal("tier"),
        v.literal("price_low"),
        v.literal("price_high")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Fetch active subscribers
    let subscribers = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by search query if provided
    if (args.searchQuery && args.searchQuery.trim()) {
      const q = args.searchQuery.toLowerCase().trim();
      subscribers = subscribers.filter(
        (s) =>
          s.jobTitle.toLowerCase().includes(q) ||
          s.specialization.toLowerCase().includes(q) ||
          s.aboutUser.toLowerCase().includes(q)
      );
    }

    // Filter by specialities if provided
    if (args.specialities && args.specialities.length > 0) {
      subscribers = subscribers.filter((s) =>
        args.specialities!.includes(s.specialization)
      );
    }

    // Hydrate each subscriber with tier, verification, review summary, and badge boost
    const hydrated = await Promise.all(
      subscribers.map(async (s) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", s.userId))
          .first();

        const tierData = await ctx.db
          .query("providerTierData")
          .withIndex("by_userId", (q) => q.eq("userId", s.userId))
          .first();

        const reviewSummary = await ctx.db
          .query("providerReviews")
          .withIndex("by_providerId", (q) => q.eq("providerId", s.userId))
          .collect();

        // Calculate badge search boost
        const activeBadges = await ctx.db
          .query("providerBadges")
          .withIndex("by_userId", (q) => q.eq("userId", s.userId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        let searchBoost = 0;
        for (const pb of activeBadges) {
          const badgeDef = await ctx.db.get(pb.badgeId);
          if (badgeDef?.benefits?.searchBoost) {
            searchBoost += badgeDef.benefits.searchBoost;
          }
        }

        const currentTier = tierData?.tier || "sapphire";
        const prsScore = tierData?.prsScore || 0;

        const tierWeights: Record<string, number> = {
          diamond: 15,
          platinum: 12,
          gold: 9,
          silver: 6,
          sapphire: 3,
        };

        const tierRank = tierWeights[currentTier] || 3;

        const avgRating =
          reviewSummary.length > 0
            ? reviewSummary.reduce((acc, r) => acc + r.overallRating, 0) /
              reviewSummary.length
            : 4.0;

        // Composite search relevance rank
        const rankScore =
          tierRank * 10 + prsScore * 0.5 + avgRating * 10 + searchBoost;

        return {
          subscriber: s,
          profile,
          tierData,
          tier: currentTier,
          prsScore,
          avgRating,
          reviewCount: reviewSummary.length,
          rankScore,
        };
      })
    );

    // Apply tier filter
    let results = hydrated;
    if (args.tiers && args.tiers.length > 0) {
      results = results.filter((r) => args.tiers!.includes(r.tier));
    }

    // Apply verified only filter
    if (args.verifiedOnly) {
      results = results.filter(
        (r) => r.tierData?.verificationScore && r.tierData.verificationScore > 0
      );
    }

    // Sorting
    const sortBy = args.sortBy || "relevance";
    if (sortBy === "relevance") {
      results.sort((a, b) => b.rankScore - a.rankScore);
    } else if (sortBy === "rating") {
      results.sort((a, b) => b.avgRating - a.avgRating);
    } else if (sortBy === "tier") {
      const tierRank: Record<string, number> = {
        diamond: 5,
        platinum: 4,
        gold: 3,
        silver: 2,
        sapphire: 1,
      };
      results.sort((a, b) => tierRank[b.tier] - tierRank[a.tier]);
    } else if (sortBy === "price_low") {
      results.sort((a, b) => a.subscriber.sessionPrice - b.subscriber.sessionPrice);
    } else if (sortBy === "price_high") {
      results.sort((a, b) => b.subscriber.sessionPrice - a.subscriber.sessionPrice);
    }

    return results;
  },
});
