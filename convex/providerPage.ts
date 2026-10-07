import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Unified Backend Query for Provider Profile Page by Username
 * Returns complete provider details, schedule, tier & rank, content, events, circles, courses, and reviews.
 */
export const getProviderPageDataByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Normalize username (strip leading @ and lowercase)
    const normalizedUsername = args.username.replace(/^@/, "").toLowerCase().trim();
    if (!normalizedUsername) return null;

    // 2. Fetch profile by username
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", normalizedUsername))
      .first();

    if (!profile) return null;
    const userId = profile.userId;

    // 3. Fetch provider booking subscriber entry
    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // 4. Fetch provider tier data
    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // 5. Calculate public leaderboard rank (Overall & Specialty rank)
    const allProviders = await ctx.db
      .query("providerTierData")
      .withIndex("by_totalExp")
      .order("desc")
      .collect();

    let overallRank = allProviders.findIndex((p) => p.userId === userId) + 1;
    if (overallRank === 0) overallRank = allProviders.length + 1;

    let specialtyRank = 0;
    if (subscriber?.specialization) {
      const specialtyProviders = await Promise.all(
        allProviders.map(async (p) => {
          const sub = await ctx.db
            .query("bookingSubscribers")
            .withIndex("by_user", (q) => q.eq("userId", p.userId))
            .first();
          return { userId: p.userId, specialization: sub?.specialization, totalExp: p.totalExp || 0 };
        })
      );

      const filtered = specialtyProviders.filter(
        (sp) => sp.specialization?.toLowerCase() === subscriber.specialization.toLowerCase()
      );
      specialtyRank = filtered.findIndex((sp) => sp.userId === userId) + 1;
    }

    // 6. Fetch verified qualifications
    const qualifications = await ctx.db
      .query("providerQualifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const verifiedQualifications = qualifications.filter((q) => q.isVerified);

    // 7. Fetch published articles authored by provider
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    const publishedArticles = articles.filter(
      (a) => a.status === "PUBLISHED" && a.approvalStatus !== "REJECTED"
    );

    // 8. Fetch pulse reels authored by provider
    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    const publishedReels = reels.filter(
      (r) => r.isPublic !== false && r.approvalStatus !== "REJECTED"
    );

    // 9. Fetch events hosted by provider
    const events = await ctx.db
      .query("events")
      .withIndex("by_provider", (q) => q.eq("providerId", userId))
      .collect();

    const activeEvents = events.filter((e) => e.status !== "CANCELLED");

    // 10. Fetch circles created by provider
    const circleMemberships = await ctx.db
      .query("circleMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const creatorMemberships = circleMemberships.filter((m) => m.role === "CREATOR" && m.isActive);
    const circleIds = creatorMemberships.map((m) => m.circleId);

    const circles = await Promise.all(
      circleIds.map(async (cId) => {
        return await ctx.db.get(cId);
      })
    );

    const activeCircles = circles.filter(
      (c): c is NonNullable<typeof c> => c !== null && c.isActive
    );

    // 11. Fetch courses authored by provider
    const courses = await ctx.db
      .query("courses")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    const publishedCourses = courses.filter((c) => c.isPublished);

    // 12. Fetch reviews & summary
    const reviews = await ctx.db
      .query("providerReviews")
      .withIndex("by_providerId", (q) => q.eq("providerId", userId))
      .collect();

    const validReviews = reviews.filter((r) => !r.isFlaggedFraudulent);
    const totalReviews = validReviews.length;
    const avgRating =
      totalReviews > 0
        ? Number(
            (
              validReviews.reduce((sum, r) => sum + r.overallRating, 0) / totalReviews
            ).toFixed(1)
          )
        : 0;

    const strengthCounts: Record<string, number> = {};
    for (const r of validReviews) {
      if (r.highlightedStrengths) {
        for (const s of r.highlightedStrengths) {
          strengthCounts[s] = (strengthCounts[s] || 0) + 1;
        }
      }
    }

    const topStrengths = Object.entries(strengthCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([strength, count]) => ({ strength, count }));

    return {
      userId,
      username: profile.username,
      name: profile.name || profile.username,
      avatar: profile.avatar,
      bio: profile.bio,
      isProvider: !!subscriber,
      subscriber: subscriber
        ? {
            id: subscriber._id,
            jobTitle: subscriber.jobTitle,
            specialization: subscriber.specialization,
            aboutUser: subscriber.aboutUser,
            offerDescription: subscriber.offerDescription,
            oneOnOnePrice: subscriber.oneOnOnePrice || subscriber.sessionPrice,
            groupSessionPrice: subscriber.groupSessionPrice,
            sessionCurrency: subscriber.sessionCurrency || "USD",
            openHours: subscriber.openHours,
            xLink: subscriber.xLink,
            linkedInLink: subscriber.linkedInLink,
            isActive: subscriber.isActive,
          }
        : null,
      tierData: tierData
        ? {
            tier: tierData.tier,
            prsScore: tierData.prsScore,
            totalExp: tierData.totalExp || 0,
            monthlyExp: tierData.monthlyExp || 0,
            customRevenueShare: tierData.customRevenueShare,
          }
        : {
            tier: "sapphire",
            prsScore: 0,
            totalExp: 0,
            monthlyExp: 0,
          },
      leaderboard: {
        overallRank,
        specialtyRank: specialtyRank > 0 ? specialtyRank : undefined,
      },
      qualifications: verifiedQualifications.map((q) => ({
        degreeTitle: q.name,
        institution: q.institution,
        category: q.category,
        yearObtained: q.yearObtained,
      })),
      articles: publishedArticles.map((a) => ({
        id: a._id,
        title: a.title,
        subtitle: a.subtitle,
        coverImage: a.coverImage,
        readTimeMin: a.readTimeMin,
        publishedAt: a.publishedAt || a.createdAt,
        views: a.views || 0,
      })),
      reels: publishedReels.map((r) => ({
        id: r._id,
        title: r.caption || "Pulse Reel",
        videoUrl: r.video,
        thumbnailUrl: r.poster,
        views: r.views || 0,
        createdAt: r.createdAt,
      })),
      events: activeEvents.map((e) => ({
        id: e._id,
        title: e.title,
        description: e.description,
        startTime: `${e.sessionDate} ${e.sessionTime}`,
        endTime: `${e.sessionDate} ${e.sessionTime}`,
        eventType: e.eventType || "LIVE_STREAM",
        priceAmount: e.pricePerPerson,
        currency: e.priceCurrency,
        bannerUrl: undefined as string | undefined,
      })),
      circles: activeCircles.map((c) => ({
        id: c._id,
        name: c.name,
        description: c.description,
        avatar: c.coverImage,
        circleType: c.type,
        memberCount: c.currentMembers || 1,
      })),
      courses: publishedCourses.map((c) => ({
        id: c._id,
        title: c.title,
        description: c.description,
        thumbnail: c.coverImage,
        price: c.totalPrice,
        currency: c.priceCurrency,
        level: c.category,
      })),
      reviewsSummary: {
        totalReviews,
        avgRating,
        topStrengths,
        recentReviews: validReviews.slice(0, 5).map((r) => ({
          id: r._id,
          overallRating: r.overallRating,
          comment: r.comment,
          highlightedStrengths: r.highlightedStrengths || [],
          createdAt: r.createdAt,
        })),
      },
    };
  },
});
