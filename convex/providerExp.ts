import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Award EXP to a provider for an interaction event.
 * Writes to providerExpLedger and reactively updates providerTierData.
 */
export const awardExp = mutation({
  args: {
    userId: v.id("users"),
    eventType: v.union(
      v.literal("create_article"),
      v.literal("create_pulse"),
      v.literal("create_general_circle"),
      v.literal("create_consultation_circle"),
      v.literal("create_referral_circle"),
      v.literal("engagement_clap"),
      v.literal("engagement_like"),
      v.literal("engagement_comment"),
      v.literal("engagement_share"),
      v.literal("daily_signin"),
      v.literal("completed_session"),
      v.literal("session_rating_5_star"),
      v.literal("session_rating_4_star"),
      v.literal("session_rating_3_star"),
      v.literal("session_rating_2_star"),
      v.literal("session_rating_1_star"),
      v.literal("tenure_anniversary"),
      v.literal("create_course"),
      v.literal("course_enrollment"),
      v.literal("course_completion"),
      v.literal("manual_admin_award")
    ),
    sourceId: v.optional(v.string()),
    customExpAmount: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Fetch platform exp_reward_rules
    const rulesSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "exp_reward_rules"))
      .first();

    const rules = rulesSetting?.value || {
      content: {
        create_article: 50,
        create_pulse: 30,
        create_general_circle: 40,
        create_consultation_circle: 60,
        create_referral_circle: 50,
      },
      engagement: {
        clap_per_item: 2,
        like_per_item: 3,
        comment_per_item: 5,
        share_per_item: 10,
      },
      activity: { daily_signin: 10 },
      sessions: {
        completed_session_base: 30,
        rating_5_star_bonus: 50,
        rating_4_star_bonus: 35,
        rating_3_star_bonus: 20,
        rating_2_star_bonus: 5,
        rating_1_star_bonus: 0,
      },
      tenure: { exp_per_year: 500 },
      learn: { create_course: 100, student_enrollment: 15, student_completion: 25 },
    };

    let expAmount = args.customExpAmount || 0;
    let sourceCategory: "content" | "engagement" | "activity" | "session" | "tenure" | "learn" | "admin" = "content";

    // Determine EXP amount based on eventType if customExpAmount not provided
    if (!args.customExpAmount) {
      switch (args.eventType) {
        case "create_article":
          expAmount = rules.content?.create_article || 50;
          sourceCategory = "content";
          break;
        case "create_pulse":
          expAmount = rules.content?.create_pulse || 30;
          sourceCategory = "content";
          break;
        case "create_general_circle":
          expAmount = rules.content?.create_general_circle || 40;
          sourceCategory = "content";
          break;
        case "create_consultation_circle":
          expAmount = rules.content?.create_consultation_circle || 60;
          sourceCategory = "content";
          break;
        case "create_referral_circle":
          expAmount = rules.content?.create_referral_circle || 50;
          sourceCategory = "content";
          break;
        case "engagement_clap":
          expAmount = rules.engagement?.clap_per_item || 2;
          sourceCategory = "engagement";
          break;
        case "engagement_like":
          expAmount = rules.engagement?.like_per_item || 3;
          sourceCategory = "engagement";
          break;
        case "engagement_comment":
          expAmount = rules.engagement?.comment_per_item || 5;
          sourceCategory = "engagement";
          break;
        case "engagement_share":
          expAmount = rules.engagement?.share_per_item || 10;
          sourceCategory = "engagement";
          break;
        case "daily_signin":
          expAmount = rules.activity?.daily_signin || 10;
          sourceCategory = "activity";
          break;
        case "completed_session":
          expAmount = rules.sessions?.completed_session_base || 30;
          sourceCategory = "session";
          break;
        case "session_rating_5_star":
          expAmount = rules.sessions?.rating_5_star_bonus || 50;
          sourceCategory = "session";
          break;
        case "session_rating_4_star":
          expAmount = rules.sessions?.rating_4_star_bonus || 35;
          sourceCategory = "session";
          break;
        case "session_rating_3_star":
          expAmount = rules.sessions?.rating_3_star_bonus || 20;
          sourceCategory = "session";
          break;
        case "session_rating_2_star":
          expAmount = rules.sessions?.rating_2_star_bonus || 5;
          sourceCategory = "session";
          break;
        case "session_rating_1_star":
          expAmount = rules.sessions?.rating_1_star_bonus || 0;
          sourceCategory = "session";
          break;
        case "tenure_anniversary":
          expAmount = rules.tenure?.exp_per_year || 500;
          sourceCategory = "tenure";
          break;
        case "create_course":
          expAmount = rules.learn?.create_course || 100;
          sourceCategory = "learn";
          break;
        case "course_enrollment":
          expAmount = rules.learn?.student_enrollment || 15;
          sourceCategory = "learn";
          break;
        case "course_completion":
          expAmount = rules.learn?.student_completion || 25;
          sourceCategory = "learn";
          break;
        case "manual_admin_award":
          expAmount = args.customExpAmount || 100;
          sourceCategory = "admin";
          break;
      }
    }

    if (expAmount <= 0) {
      return { success: false, expAmount: 0 };
    }

    // Insert entry in providerExpLedger
    await ctx.db.insert("providerExpLedger", {
      userId: args.userId,
      eventType: args.eventType,
      expAmount,
      sourceId: args.sourceId,
      sourceCategory,
      metadata: args.metadata,
      timestamp: now,
    });

    // Update providerTierData totals
    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (tierData) {
      const currentTotal = tierData.totalExp || 0;
      const currentMonthly = tierData.monthlyExp || 0;
      await ctx.db.patch(tierData._id, {
        totalExp: currentTotal + expAmount,
        monthlyExp: currentMonthly + expAmount,
        lastActivityAt: now,
        updatedAt: now,
      });
    } else {
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
        totalExp: expAmount,
        monthlyExp: expAmount,
        lastActivityAt: now,
        tierLastCalculated: now,
        createdAt: now,
      });
    }

    // Trigger real-time tier promotion check after EXP award
    await ctx.scheduler.runAfter(0, (internal as any).tierPromotion.maybePromoteTier, {
      userId: args.userId,
      trigger: `exp_award_${args.eventType}`,
    });

    return { success: true, expAmount, userId: args.userId };
  },
});

/**
 * Public Real-Time Reactive Query for Provider EXP Leaderboard.
 * Automatically pushes live updates when provider totalExp changes.
 */
export const getPublicExpLeaderboard = query({
  args: {
    timeframe: v.optional(v.union(v.literal("all_time"), v.literal("monthly"))),
    specialization: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const timeframe = args.timeframe || "all_time";
    const limit = args.limit || 50;

    const indexName = timeframe === "monthly" ? "by_monthlyExp" : "by_totalExp";

    let query = ctx.db.query("providerTierData").withIndex(indexName);
    const providersTierData = await query.order("desc").take(limit * 2);

    const leaderboardItems = await Promise.all(
      providersTierData.map(async (td) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", td.userId))
          .first();

        const subscription = await ctx.db
          .query("bookingSubscribers")
          .withIndex("by_user", (q) => q.eq("userId", td.userId))
          .first();

        return {
          userId: td.userId,
          name: profile?.name || profile?.username || "Provider",
          username: profile?.username,
          avatar: profile?.avatar,
          jobTitle: subscription?.jobTitle || "Healthcare Practitioner",
          specialization: subscription?.specialization || "General Medicine",
          tier: td.tier,
          prsScore: td.prsScore,
          totalExp: td.totalExp || 0,
          monthlyExp: td.monthlyExp || 0,
          displayExp: timeframe === "monthly" ? td.monthlyExp || 0 : td.totalExp || 0,
        };
      })
    );

    // Apply specialization filter if provided
    let filtered = leaderboardItems;
    if (args.specialization && args.specialization.trim()) {
      const spec = args.specialization.toLowerCase();
      filtered = leaderboardItems.filter(
        (item) => item.specialization.toLowerCase() === spec
      );
    }

    // Sort descending by displayExp
    filtered.sort((a, b) => b.displayExp - a.displayExp);

    // Assign rank numbers (1-indexed)
    const ranked = filtered.slice(0, limit).map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    return ranked;
  },
});

/**
 * Provider EXP summary with breakdown by category
 */
export const getProviderExpSummary = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const ledger = await ctx.db
      .query("providerExpLedger")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const categoryBreakdown: Record<string, number> = {
      content: 0,
      engagement: 0,
      activity: 0,
      session: 0,
      tenure: 0,
      learn: 0,
      admin: 0,
    };

    for (const item of ledger) {
      categoryBreakdown[item.sourceCategory] =
        (categoryBreakdown[item.sourceCategory] || 0) + item.expAmount;
    }

    return {
      totalExp: tierData?.totalExp || 0,
      monthlyExp: tierData?.monthlyExp || 0,
      categoryBreakdown,
      transactionCount: ledger.length,
      lastCalculated: tierData?.tierLastCalculated || Date.now(),
    };
  },
});

/**
 * Paginated query for provider's EXP ledger
 */
export const getProviderExpLedger = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    return await ctx.db
      .query("providerExpLedger")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Admin mutation to update EXP reward rules
 */
export const updateExpRewardRules = mutation({
  args: {
    rules: v.any(),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const now = Date.now();
    const existing = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "exp_reward_rules"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.rules,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("platform_settings", {
        key: "exp_reward_rules",
        value: args.rules,
        updatedBy: adminUserId,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Mutation to record daily sign-in and award EXP once per calendar day
 */
export const recordDailySignin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { success: false, reason: "Not authenticated" };

    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!tierData) return { success: false, reason: "Not a provider" };

    const now = Date.now();
    const lastAwarded = tierData.lastSigninExpAwardedAt || 0;

    const lastDateStr = new Date(lastAwarded).toISOString().split("T")[0];
    const currentDateStr = new Date(now).toISOString().split("T")[0];

    if (lastDateStr === currentDateStr) {
      return { success: false, reason: "Already awarded today" };
    }

    await ctx.db.patch(tierData._id, {
      lastSigninExpAwardedAt: now,
    });

    const rulesSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "exp_reward_rules"))
      .first();

    const expAmount = rulesSetting?.value?.activity?.daily_signin || 10;

    await ctx.db.insert("providerExpLedger", {
      userId,
      eventType: "daily_signin",
      expAmount,
      sourceCategory: "activity",
      timestamp: now,
    });

    await ctx.db.patch(tierData._id, {
      totalExp: (tierData.totalExp || 0) + expAmount,
      monthlyExp: (tierData.monthlyExp || 0) + expAmount,
      lastActivityAt: now,
      updatedAt: now,
    });

    return { success: true, expAmount, date: currentDateStr };
  },
});

/**
 * Internal mutation called daily by cron to check provider tenure anniversaries
 */
export const checkTenureAnniversaries = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    const allTierData = await ctx.db.query("providerTierData").collect();
    let anniversaryCount = 0;

    for (const td of allTierData) {
      const joinDate = td.platformJoinDate || td.createdAt;
      const yearsOnPlatform = Math.floor((now - joinDate) / oneYearMs);

      if (yearsOnPlatform >= 1) {
        // Check if tenure EXP awarded for this year count
        const existingTenure = await ctx.db
          .query("providerExpLedger")
          .withIndex("by_userId_category", (q) =>
            q.eq("userId", td.userId).eq("sourceCategory", "tenure")
          )
          .collect();

        const awardedYearsCount = existingTenure.length;
        if (yearsOnPlatform > awardedYearsCount) {
          // Award anniversary EXP
          const rulesSetting = await ctx.db
            .query("platform_settings")
            .withIndex("by_key", (q) => q.eq("key", "exp_reward_rules"))
            .first();

          const expAmount = rulesSetting?.value?.tenure?.exp_per_year || 500;

          await ctx.db.insert("providerExpLedger", {
            userId: td.userId,
            eventType: "tenure_anniversary",
            expAmount,
            sourceCategory: "tenure",
            metadata: { year: yearsOnPlatform },
            timestamp: now,
          });

          await ctx.db.patch(td._id, {
            totalExp: (td.totalExp || 0) + expAmount,
            monthlyExp: (td.monthlyExp || 0) + expAmount,
            updatedAt: now,
          });

          anniversaryCount++;
        }
      }
    }

    return { processed: allTierData.length, anniversaryCount };
  },
});

/**
 * Query to fetch the current EXP reward rules from platform_settings.
 * Used by admin screens to populate/display the current configuration.
 */
export const getExpRewardRules = query({
  args: {},
  handler: async (ctx) => {
    const rulesSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "exp_reward_rules"))
      .first();

    return rulesSetting?.value ?? null;
  },
});
