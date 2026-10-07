import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export const seedTierConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Default configuration entries for platform_settings
    const configs = [
      {
        key: "tier_thresholds",
        description: "Provider tier threshold ranges and visual metadata",
        value: {
          sapphire: {
            min: 0,
            max: 29,
            displayName: "Sapphire",
            badgeColor: "#2196F3",
            description: "Entry Professional Level",
          },
          silver: {
            min: 30,
            max: 54,
            displayName: "Silver",
            badgeColor: "#B0BEC5",
            description: "Established Professional",
          },
          gold: {
            min: 55,
            max: 74,
            displayName: "Gold",
            badgeColor: "#FFD700",
            description: "Highly Experienced Professional",
          },
          platinum: {
            min: 75,
            max: 89,
            displayName: "Platinum",
            badgeColor: "#E5E4E2",
            description: "Senior Expert",
          },
          diamond: {
            min: 90,
            max: 100,
            displayName: "Diamond",
            badgeColor: "#B9F2FF",
            description: "Ambrosia Distinguished Professional",
          },
        },
      },
      {
        key: "prs_weights",
        description: "Weighted scoring proportions for Professional Recognition Score (PRS)",
        value: {
          qualifications: 0.30,
          experience: 0.20,
          verification: 0.15,
          referralPerformance: 0.10,
          patientExperience: 0.10,
          knowledgeContributions: 0.10,
          communityImpact: 0.05,
        },
      },
      {
        key: "qualification_points",
        description: "Points assigned per verified qualification category",
        value: {
          basic_degree: { points: 10, maxCountable: 1 },
          additional_certification: { points: 3, maxCountable: 4 },
          fellowship: { points: 8, maxCountable: 3 },
          residency: { points: 10, maxCountable: 1 },
          consultant_status: { points: 12, maxCountable: 1 },
          masters: { points: 6, maxCountable: 2 },
          doctorate: { points: 10, maxCountable: 1 },
        },
      },
      {
        key: "experience_brackets",
        description: "Years of active professional practice score mapping",
        value: [
          { min: 0, max: 2, score: 20 },
          { min: 3, max: 5, score: 40 },
          { min: 6, max: 10, score: 65 },
          { min: 11, max: 20, score: 85 },
          { min: 21, max: 999, score: 100 },
        ],
      },
      {
        key: "tier_inactivity_settings",
        description: "Inactivity days for demotion and warnings",
        value: {
          warningDays: [90, 180],
          demotionDays: 365,
        },
      },
      {
        key: "exp_reward_rules",
        description: "Configurable Experience Point (EXP) reward amounts for provider interactions",
        value: {
          content: {
            create_article: 50,
            create_pulse: 30,
            create_general_circle: 40,
            create_consultation_circle: 60,
            create_referral_circle: 50,
          },
          engagement: {
            clap_per_item: 2,
            clap_max_per_content: 50,
            like_per_item: 3,
            comment_per_item: 5,
            share_per_item: 10,
          },
          activity: {
            daily_signin: 10,
          },
          sessions: {
            completed_session_base: 30,
            rating_5_star_bonus: 50,
            rating_4_star_bonus: 35,
            rating_3_star_bonus: 20,
            rating_2_star_bonus: 5,
            rating_1_star_bonus: 0,
          },
          tenure: {
            exp_per_year: 500,
          },
          learn: {
            create_course: 100,
            student_enrollment: 15,
            student_completion: 25,
          },
        },
      },
      {
        key: "tier_revenue_share",
        description: "Default platform revenue share percentage allocated to provider per tier",
        value: {
          sapphire: 70,
          silver: 75,
          gold: 80,
          platinum: 85,
          diamond: 90,
        },
      },
    ];

    let seededCount = 0;
    for (const cfg of configs) {
      const existing = await ctx.db
        .query("platform_settings")
        .withIndex("by_key", (q) => q.eq("key", cfg.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: cfg.value,
          description: cfg.description,
          updatedBy: userId,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("platform_settings", {
          key: cfg.key,
          value: cfg.value,
          description: cfg.description,
          updatedBy: userId,
          updatedAt: now,
        });
      }
      seededCount++;
    }

    // Migrate existing bookingSubscribers -> providerTierData
    const subscribers = await ctx.db.query("bookingSubscribers").collect();
    let migratedCount = 0;

    for (const sub of subscribers) {
      const existingTierData = await ctx.db
        .query("providerTierData")
        .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
        .first();

      const kyc = (sub as any).kycExtras || {};
      const yearsOfExp = kyc.yearsOfExperience !== undefined ? parseInt(String(kyc.yearsOfExperience), 10) : 0;
      const licenseNum = kyc.licenseNumber || undefined;
      const council = kyc.registrationCouncil || undefined;
      const geo = kyc.geographicRecognition || undefined;

      if (!existingTierData) {
        await ctx.db.insert("providerTierData", {
          userId: sub.userId,
          tier: "sapphire",
          prsScore: 0,
          qualificationScore: 0,
          experienceScore: 0,
          verificationScore: 0,
          referralPerformanceScore: 0,
          patientExperienceScore: 0,
          knowledgeContributionScore: 0,
          communityImpactScore: 0,
          yearsOfExperience: yearsOfExp,
          licenseNumber: licenseNum,
          registrationCouncil: council,
          geographicRecognition: geo as any,
          totalExp: 0,
          monthlyExp: 0,
          lastActivityAt: sub.createdAt || now,
          tierLastCalculated: now,
          createdAt: now,
        });
        migratedCount++;
      } else if (yearsOfExp > 0 || licenseNum || council) {
        await ctx.db.patch(existingTierData._id, {
          yearsOfExperience: yearsOfExp > 0 ? yearsOfExp : existingTierData.yearsOfExperience,
          licenseNumber: licenseNum || existingTierData.licenseNumber,
          registrationCouncil: council || existingTierData.registrationCouncil,
          geographicRecognition: geo || existingTierData.geographicRecognition,
          updatedAt: now,
        });
      }

      // Schedule recalculation
      await ctx.scheduler.runAfter(0, (internal as any).tierCalculation.internalRecalculateProviderPRS, {
        userId: sub.userId,
        reason: "Provider tier backfill migration",
      });
    }

    return {
      success: true,
      seededConfigCount: seededCount,
      migratedProvidersCount: migratedCount,
      totalSubscribersProcessed: subscribers.length,
    };
  },
});

/**
 * Standalone one-click migration for backfilling all existing booking subscribers into tiering.
 */
export const migrateAllProvidersToTiering = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const subscribers = await ctx.db.query("bookingSubscribers").collect();
    let createdCount = 0;
    let updatedCount = 0;

    for (const sub of subscribers) {
      const existingTierData = await ctx.db
        .query("providerTierData")
        .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
        .first();

      const kyc = (sub as any).kycExtras || {};
      const yearsOfExp = kyc.yearsOfExperience !== undefined ? parseInt(String(kyc.yearsOfExperience), 10) : 0;
      const licenseNum = kyc.licenseNumber || undefined;
      const council = kyc.registrationCouncil || undefined;
      const geo = kyc.geographicRecognition || undefined;

      if (!existingTierData) {
        await ctx.db.insert("providerTierData", {
          userId: sub.userId,
          tier: "sapphire",
          prsScore: 0,
          qualificationScore: 0,
          experienceScore: 0,
          verificationScore: 0,
          referralPerformanceScore: 0,
          patientExperienceScore: 0,
          knowledgeContributionScore: 0,
          communityImpactScore: 0,
          yearsOfExperience: yearsOfExp,
          licenseNumber: licenseNum,
          registrationCouncil: council,
          geographicRecognition: geo as any,
          totalExp: 0,
          monthlyExp: 0,
          lastActivityAt: sub.createdAt || now,
          tierLastCalculated: now,
          createdAt: now,
        });
        createdCount++;
      } else {
        await ctx.db.patch(existingTierData._id, {
          yearsOfExperience: yearsOfExp > 0 ? yearsOfExp : (existingTierData.yearsOfExperience || 0),
          licenseNumber: licenseNum || existingTierData.licenseNumber,
          registrationCouncil: council || existingTierData.registrationCouncil,
          geographicRecognition: geo || existingTierData.geographicRecognition,
          updatedAt: now,
        });
        updatedCount++;
      }

      // Check if qualification can be backfilled
      if (kyc.highestQualification) {
        const existingQual = await ctx.db
          .query("providerQualifications")
          .withIndex("by_userId", (q: any) => q.eq("userId", sub.userId))
          .first();

        if (!existingQual) {
          await ctx.db.insert("providerQualifications", {
            userId: sub.userId,
            category: kyc.highestQualification as any,
            name: kyc.qualificationTitle || kyc.highestQualification.replace(/_/g, " ").toUpperCase(),
            institution: kyc.institution,
            yearObtained: kyc.graduationYear ? parseInt(String(kyc.graduationYear), 10) : undefined,
            isVerified: false,
            points: 5,
            createdAt: now,
          });
        }
      }

      // Trigger PRS recalculation
      await ctx.scheduler.runAfter(0, (internal as any).tierCalculation.internalRecalculateProviderPRS, {
        userId: sub.userId,
        reason: "Provider tier backfill migration",
      });
    }

    return {
      success: true,
      totalSubscribers: subscribers.length,
      createdTierRecords: createdCount,
      updatedTierRecords: updatedCount,
    };
  },
});

/**
 * Direct CLI Migration Command:
 * Run via terminal: npx convex run tierSeed:migrateProvidersCli
 */
export const migrateProvidersCli = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const subscribers = await ctx.db.query("bookingSubscribers").collect();
    let createdCount = 0;
    let updatedCount = 0;

    for (const sub of subscribers) {
      const existingTierData = await ctx.db
        .query("providerTierData")
        .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
        .first();

      const kyc = (sub as any).kycExtras || {};
      const yearsOfExp = kyc.yearsOfExperience !== undefined ? parseInt(String(kyc.yearsOfExperience), 10) : 0;
      const licenseNum = kyc.licenseNumber || undefined;
      const council = kyc.registrationCouncil || undefined;
      const geo = kyc.geographicRecognition || undefined;

      if (!existingTierData) {
        await ctx.db.insert("providerTierData", {
          userId: sub.userId,
          tier: "sapphire",
          prsScore: 0,
          qualificationScore: 0,
          experienceScore: 0,
          verificationScore: 0,
          referralPerformanceScore: 0,
          patientExperienceScore: 0,
          knowledgeContributionScore: 0,
          communityImpactScore: 0,
          yearsOfExperience: yearsOfExp,
          licenseNumber: licenseNum,
          registrationCouncil: council,
          geographicRecognition: geo as any,
          totalExp: 0,
          monthlyExp: 0,
          lastActivityAt: sub.createdAt || now,
          tierLastCalculated: now,
          createdAt: now,
        });
        createdCount++;
      } else {
        await ctx.db.patch(existingTierData._id, {
          yearsOfExperience: yearsOfExp > 0 ? yearsOfExp : (existingTierData.yearsOfExperience || 0),
          licenseNumber: licenseNum || existingTierData.licenseNumber,
          registrationCouncil: council || existingTierData.registrationCouncil,
          geographicRecognition: geo || existingTierData.geographicRecognition,
          updatedAt: now,
        });
        updatedCount++;
      }

      // Check if qualification can be backfilled
      if (kyc.highestQualification) {
        const existingQual = await ctx.db
          .query("providerQualifications")
          .withIndex("by_userId", (q: any) => q.eq("userId", sub.userId))
          .first();

        if (!existingQual) {
          await ctx.db.insert("providerQualifications", {
            userId: sub.userId,
            category: kyc.highestQualification as any,
            name: kyc.qualificationTitle || kyc.highestQualification.replace(/_/g, " ").toUpperCase(),
            institution: kyc.institution,
            yearObtained: kyc.graduationYear ? parseInt(String(kyc.graduationYear), 10) : undefined,
            isVerified: false,
            points: 5,
            createdAt: now,
          });
        }
      }

      // Trigger PRS recalculation
      await ctx.scheduler.runAfter(0, (internal as any).tierCalculation.internalRecalculateProviderPRS, {
        userId: sub.userId,
        reason: "CLI Provider tier backfill migration",
      });
    }

    return {
      success: true,
      message: `Backfilled ${createdCount} new provider tier records and updated ${updatedCount} existing records across ${subscribers.length} total providers.`,
      totalSubscribers: subscribers.length,
      createdTierRecords: createdCount,
      updatedTierRecords: updatedCount,
    };
  },
});
