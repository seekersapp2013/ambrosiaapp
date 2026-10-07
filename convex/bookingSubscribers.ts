import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

export async function createSubscriberHelper(
  ctx: any,
  userId: any,
  args: {
    jobTitle: string;
    specialization: string;
    oneOnOnePrice?: number;
    groupSessionPrice?: number;
    sessionPrice: number;
    sessionCurrency?: string;
    aboutUser: string;
    xLink?: string;
    linkedInLink?: string;
    offerDescription: string;
    openHours: any;
    yearsOfExperience?: number;
    licenseNumber?: string;
    registrationCouncil?: string;
    highestQualification?: string;
    qualificationTitle?: string;
    institution?: string;
    yearObtained?: number;
    geographicRecognition?: string;
    kycExtras?: any;
  }
) {
  const existingSubscriber = await ctx.db
    .query("bookingSubscribers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (existingSubscriber) {
    return { subscriberId: existingSubscriber._id, requiresApproval: false };
  }

  const jobTitle = (args.jobTitle && args.jobTitle.trim()) || "Service Provider";
  const specialization = (args.specialization && args.specialization.trim()) || "General Practice";
  const aboutUser = (args.aboutUser && args.aboutUser.trim()) || "Service Provider at Ambrosia.";
  const offerDescription = (args.offerDescription && args.offerDescription.trim()) || "1-on-1 and group consultations.";
  const oneOnOnePrice = (args.oneOnOnePrice && args.oneOnOnePrice > 0) ? args.oneOnOnePrice : (args.sessionPrice && args.sessionPrice > 0 ? args.sessionPrice : 100);
  const groupSessionPrice = (args.groupSessionPrice && args.groupSessionPrice > 0) ? args.groupSessionPrice : Math.round(oneOnOnePrice * 0.7);

  const defaultOpenHours = {
    monday: { enabled: true, start: "09:00", end: "17:00" },
    tuesday: { enabled: true, start: "09:00", end: "17:00" },
    wednesday: { enabled: true, start: "09:00", end: "17:00" },
    thursday: { enabled: true, start: "09:00", end: "17:00" },
    friday: { enabled: true, start: "09:00", end: "17:00" },
    saturday: { enabled: false, start: "09:00", end: "17:00" },
    sunday: { enabled: false, start: "09:00", end: "17:00" },
  };

  const settings = await ctx.db.query("moderationSettings").first();
  const requiresApproval = settings?.bookingSubscribersRequireApproval ?? true;
  const now = Date.now();

  const subscriberId = await ctx.db.insert("bookingSubscribers", {
    userId,
    jobTitle,
    specialization,
    oneOnOnePrice,
    groupSessionPrice,
    sessionPrice: oneOnOnePrice,
    sessionCurrency: args.sessionCurrency ?? "USD",
    aboutUser,
    xLink: args.xLink?.trim() || undefined,
    linkedInLink: args.linkedInLink?.trim() || undefined,
    offerDescription,
    openHours: args.openHours || defaultOpenHours,
    isActive: !requiresApproval,
    approvalStatus: requiresApproval ? "PENDING" : "NOT_REQUIRED",
    approvalRequestedAt: requiresApproval ? now : undefined,
    kycExtras: args.kycExtras,
    createdAt: now
  });

  if (requiresApproval) {
    await ctx.db.insert("contentApprovals", {
      contentType: "bookingSubscribers",
      contentId: subscriberId,
      status: "PENDING",
      submittedBy: userId,
      createdAt: now,
    });
  }

  await ctx.db.insert("bookingSettings", {
    userId,
    confirmationType: "AUTOMATIC",
    bufferTime: 15,
    maxAdvanceBooking: 30,
    cancellationPolicy: "24",
    createdAt: now
  });

  // ── Auto-enroll into Provider Tier System ──────────────────────────────────
  const existingTierData = await ctx.db
    .query("providerTierData")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();

  const yearsOfExp = args.yearsOfExperience ?? 0;
  const licenseNum = args.licenseNumber?.trim() || undefined;
  const council = args.registrationCouncil?.trim() || undefined;
  const geo = args.geographicRecognition || undefined;

  if (existingTierData) {
    await ctx.db.patch(existingTierData._id, {
      yearsOfExperience: args.yearsOfExperience !== undefined ? yearsOfExp : existingTierData.yearsOfExperience,
      licenseNumber: licenseNum || existingTierData.licenseNumber,
      registrationCouncil: council || existingTierData.registrationCouncil,
      geographicRecognition: geo || existingTierData.geographicRecognition,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("providerTierData", {
      userId,
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
      lastActivityAt: now,
      tierLastCalculated: now,
      createdAt: now,
    });
  }

  // ── Record initial Qualification if provided ──────────────────────────────
  if (args.highestQualification) {
    const qualName = args.qualificationTitle || args.highestQualification.replace(/_/g, ' ').toUpperCase();
    const existingQual = await ctx.db
      .query("providerQualifications")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    if (!existingQual) {
      await ctx.db.insert("providerQualifications", {
        userId,
        category: args.highestQualification as any,
        name: qualName,
        institution: args.institution?.trim(),
        yearObtained: args.yearObtained,
        isVerified: false,
        points: 5,
        createdAt: now,
      });
    }
  }

  // ── Schedule immediate deterministic PRS calculation & AI evaluation ──────
  await ctx.scheduler.runAfter(0, (internal as any).tierCalculation.internalRecalculateProviderPRS, {
    userId,
    reason: "Provider enrollment from KYC onboarding",
  });

  await ctx.scheduler.runAfter(5000, (internal as any).aiTierEvaluation.evaluateProviderTierWithAI, {
    userId,
  });

  return { subscriberId, requiresApproval };
}

// Create a new booking subscriber (mutation for logged-in users)
export const createSubscriber = mutation({
  args: {
    jobTitle: v.string(),
    specialization: v.string(),
    oneOnOnePrice: v.optional(v.number()),
    groupSessionPrice: v.optional(v.number()),
    sessionPrice: v.number(),
    sessionCurrency: v.optional(v.string()),
    aboutUser: v.string(),
    xLink: v.optional(v.string()),
    linkedInLink: v.optional(v.string()),
    offerDescription: v.string(),
    openHours: v.any(),
    yearsOfExperience: v.optional(v.number()),
    licenseNumber: v.optional(v.string()),
    registrationCouncil: v.optional(v.string()),
    highestQualification: v.optional(v.string()),
    qualificationTitle: v.optional(v.string()),
    institution: v.optional(v.string()),
    yearObtained: v.optional(v.number()),
    geographicRecognition: v.optional(v.string()),
    kycExtras: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    return await createSubscriberHelper(ctx, userId, args);
  }
});

// Update existing booking subscriber
export const updateSubscriber = mutation({
  args: {
    jobTitle: v.string(),
    specialization: v.string(),
    oneOnOnePrice: v.optional(v.number()),
    groupSessionPrice: v.optional(v.number()),
    sessionPrice: v.number(), // Legacy field for backward compatibility
    sessionCurrency: v.optional(v.string()), // Currency the provider charges in
    aboutUser: v.string(),
    xLink: v.optional(v.string()),
    linkedInLink: v.optional(v.string()),
    offerDescription: v.string(),
    openHours: v.any(),
    yearsOfExperience: v.optional(v.number()),
    licenseNumber: v.optional(v.string()),
    registrationCouncil: v.optional(v.string()),
    highestQualification: v.optional(v.string()),
    qualificationTitle: v.optional(v.string()),
    institution: v.optional(v.string()),
    yearObtained: v.optional(v.number()),
    geographicRecognition: v.optional(v.string()),
    kycExtras: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!subscriber) {
      throw new Error("Booking subscription not found");
    }

    // Handle backward compatibility and set default values
    const oneOnOnePrice = args.oneOnOnePrice ?? args.sessionPrice;
    const groupSessionPrice = args.groupSessionPrice ?? Math.round(args.sessionPrice * 0.7);

    // Validate session prices
    if (oneOnOnePrice <= 0) {
      throw new Error("1-on-1 session price must be greater than 0");
    }

    if (groupSessionPrice <= 0) {
      throw new Error("Group session price must be greater than 0");
    }

    // Validate required fields
    if (!args.jobTitle.trim() || !args.specialization.trim() || !args.aboutUser.trim() || !args.offerDescription.trim()) {
      throw new Error("All required fields must be filled");
    }

    const now = Date.now();

    await ctx.db.patch(subscriber._id, {
      jobTitle: args.jobTitle.trim(),
      specialization: args.specialization.trim(),
      oneOnOnePrice: oneOnOnePrice,
      groupSessionPrice: groupSessionPrice,
      sessionPrice: args.sessionPrice,
      sessionCurrency: args.sessionCurrency ?? subscriber.sessionCurrency ?? "USD",
      aboutUser: args.aboutUser.trim(),
      xLink: args.xLink?.trim() || undefined,
      linkedInLink: args.linkedInLink?.trim() || undefined,
      offerDescription: args.offerDescription.trim(),
      openHours: args.openHours,
      kycExtras: args.kycExtras,
      updatedAt: now,
    });

    // ── Sync to Provider Tier Data ──────────────────────────────────────────
    const tierData = await ctx.db
      .query("providerTierData")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (tierData) {
      const updates: any = { updatedAt: now };
      if (args.yearsOfExperience !== undefined) updates.yearsOfExperience = args.yearsOfExperience;
      if (args.licenseNumber !== undefined) updates.licenseNumber = args.licenseNumber.trim() || undefined;
      if (args.registrationCouncil !== undefined) updates.registrationCouncil = args.registrationCouncil.trim() || undefined;
      if (args.geographicRecognition !== undefined) updates.geographicRecognition = args.geographicRecognition;
      await ctx.db.patch(tierData._id, updates);
    } else {
      await ctx.db.insert("providerTierData", {
        userId,
        tier: "sapphire",
        prsScore: 0,
        qualificationScore: 0,
        experienceScore: 0,
        verificationScore: 0,
        referralPerformanceScore: 0,
        patientExperienceScore: 0,
        knowledgeContributionScore: 0,
        communityImpactScore: 0,
        yearsOfExperience: args.yearsOfExperience ?? 0,
        licenseNumber: args.licenseNumber?.trim(),
        registrationCouncil: args.registrationCouncil?.trim(),
        geographicRecognition: args.geographicRecognition as any,
        totalExp: 0,
        monthlyExp: 0,
        lastActivityAt: now,
        tierLastCalculated: now,
        createdAt: now,
      });
    }

    // ── Update or insert qualification if provided ──────────────────────────
    if (args.highestQualification) {
      const qualName = args.qualificationTitle || args.highestQualification.replace(/_/g, ' ').toUpperCase();
      const existingQual = await ctx.db
        .query("providerQualifications")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      if (existingQual) {
        await ctx.db.patch(existingQual._id, {
          category: args.highestQualification as any,
          name: qualName,
          institution: args.institution?.trim() || existingQual.institution,
          yearObtained: args.yearObtained !== undefined ? args.yearObtained : existingQual.yearObtained,
        });
      } else {
        await ctx.db.insert("providerQualifications", {
          userId,
          category: args.highestQualification as any,
          name: qualName,
          institution: args.institution?.trim(),
          yearObtained: args.yearObtained,
          isVerified: false,
          points: 5,
          createdAt: now,
        });
      }
    }

    // ── Trigger PRS recalculation & AI evaluation ───────────────────────────
    await ctx.scheduler.runAfter(0, (internal as any).tierCalculation.internalRecalculateProviderPRS, {
      userId,
      reason: "Provider KYC information updated",
    });

    await ctx.scheduler.runAfter(5000, (internal as any).aiTierEvaluation.evaluateProviderTierWithAI, {
      userId,
    });

    return subscriber._id;
  }
});

// Get current user's booking subscriber record
export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  }
});

// Auto-repair provider subscription if user signed up as provider but subscription record was missed
export const ensureProviderSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) return existing._id;

    const user = await ctx.db.get(userId);
    let email = (user as any)?.email?.toLowerCase().trim();
    if (!email) {
      const authAcc = await (ctx.db as any)
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q: any) => q.eq("userId", userId))
        .first();
      if (authAcc?.providerAccountId) {
        email = (authAcc.providerAccountId as string).toLowerCase().trim();
      }
    }

    let pending: any = email
      ? await (ctx.db as any)
          .query("signupPending")
          .withIndex("by_email", (q: any) => q.eq("email", email))
          .first()
      : null;

    if (!pending) {
      const recentPending = await (ctx.db as any).query("signupPending").collect();
      const tenMinsAgo = Date.now() - 10 * 60 * 1000;
      pending = recentPending
        .filter((r: any) => r.createdAt > tenMinsAgo)
        .sort((a: any, b: any) => b.createdAt - a.createdAt)[0] ?? null;
    }

    if (pending && pending.signupRole === "provider") {
      const res = await createSubscriberHelper(ctx, userId, pending.providerKycData || {
        jobTitle: "Service Provider",
        specialization: "General Practice",
        aboutUser: "Service Provider at Ambrosia.",
        offerDescription: "1-on-1 and group consultations.",
        sessionPrice: 100,
      });
      try { await ctx.db.delete(pending._id); } catch {}
      return res.subscriberId;
    }

    return null;
  }
});

// Check if the current user is an approved provider
export const isApprovedProvider = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isApprovedProvider: false };
    }

    const sub = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!sub) {
      return { isApprovedProvider: false };
    }

    const isApproved =
      sub.isActive === true &&
      (sub.approvalStatus === "APPROVED" ||
        sub.approvalStatus === "NOT_REQUIRED" ||
        sub.approvalStatus === undefined);

    return { isApprovedProvider: isApproved };
  }
});

// Get all active booking subscribers with optional filtering
export const getActiveSubscribers = query({
  args: {
    specialization: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true));

    const subscribers = await query.collect();

    // Apply filters
    let filteredSubscribers = subscribers;

    if (args.specialization) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.specialization.toLowerCase().includes(args.specialization!.toLowerCase())
      );
    }

    if (args.jobTitle) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.jobTitle.toLowerCase().includes(args.jobTitle!.toLowerCase())
      );
    }

    // Apply limit
    if (args.limit && args.limit > 0) {
      filteredSubscribers = filteredSubscribers.slice(0, args.limit);
    }

    return filteredSubscribers;
  }
});

// Get subscribers with their profile information
export const getSubscribersWithProfiles = query({
  args: {
    specialization: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Get active subscribers with filtering
    let query = ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true));

    const subscribers = await query.collect();

    // Apply filters
    let filteredSubscribers = subscribers;

    if (args.specialization) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.specialization.toLowerCase().includes(args.specialization!.toLowerCase())
      );
    }

    if (args.jobTitle) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.jobTitle.toLowerCase().includes(args.jobTitle!.toLowerCase())
      );
    }

    // Apply limit
    if (args.limit && args.limit > 0) {
      filteredSubscribers = filteredSubscribers.slice(0, args.limit);
    }

    const subscribersWithProfiles = await Promise.all(
      filteredSubscribers.map(async (subscriber) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", subscriber.userId))
          .first();

        return {
          subscriber,
          profile: profile ? {
            name: profile.name,
            username: profile.username,
            avatar: profile.avatar
          } : null
        };
      })
    );

    return subscribersWithProfiles;
  }
});

// Get a specific subscriber by user ID
export const getSubscriberByUserId = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  }
});

// Toggle subscriber active status
export const toggleSubscriberStatus = mutation({
  args: {
    isActive: v.boolean()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!subscriber) {
      throw new Error("Booking subscription not found");
    }

    await ctx.db.patch(subscriber._id, {
      isActive: args.isActive,
      updatedAt: Date.now()
    });

    return subscriber._id;
  }
});

// Get unique specializations for filtering
export const getSpecializations = query({
  args: {},
  handler: async (ctx) => {
    const subscribers = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const specializations = [...new Set(subscribers.map(sub => sub.specialization))];
    return specializations.sort();
  }
});

// Get unique job titles for filtering
export const getJobTitles = query({
  args: {},
  handler: async (ctx) => {
    const subscribers = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const jobTitles = [...new Set(subscribers.map(sub => sub.jobTitle))];
    return jobTitles.sort();
  }
});

// Deactivate provider subscription when user account is deactivated
export const deactivateProviderSubscription = mutation({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (subscriber) {
      await ctx.db.patch(subscriber._id, {
        isActive: false,
        updatedAt: Date.now()
      });

      // Cancel all pending bookings for this provider
      const pendingBookings = await ctx.db
        .query("bookings")
        .withIndex("by_provider", (q) => q.eq("providerId", args.userId))
        .filter((q) => q.eq(q.field("status"), "PENDING"))
        .collect();

      for (const booking of pendingBookings) {
        await ctx.db.patch(booking._id, {
          status: "CANCELLED",
          updatedAt: Date.now()
        });
      }

      return subscriber._id;
    }

    return null;
  }
});

// Sync profile changes with booking subscriber data
export const syncProfileChanges = mutation({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    // Get updated profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      return null;
    }

    // Get booking subscriber
    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (subscriber) {
      // Update subscriber with latest profile info
      await ctx.db.patch(subscriber._id, {
        updatedAt: Date.now()
      });

      return subscriber._id;
    }

    return null;
  }
});

// Get providers with pagination and advanced filtering
export const getProvidersWithPagination = query({
  args: {
    specialization: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const offset = args.offset || 0;
    const limit = args.limit || 20;

    // Get all active subscribers
    const allSubscribers = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Apply filters
    let filteredSubscribers = allSubscribers;

    if (args.specialization) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.specialization.toLowerCase().includes(args.specialization!.toLowerCase())
      );
    }

    if (args.jobTitle) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.jobTitle.toLowerCase().includes(args.jobTitle!.toLowerCase())
      );
    }

    if (args.minPrice !== undefined) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        (sub.oneOnOnePrice || sub.sessionPrice) >= args.minPrice! ||
        (sub.groupSessionPrice || sub.sessionPrice) >= args.minPrice!
      );
    }

    if (args.maxPrice !== undefined) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        (sub.oneOnOnePrice || sub.sessionPrice) <= args.maxPrice! ||
        (sub.groupSessionPrice || sub.sessionPrice) <= args.maxPrice!
      );
    }

    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      // First pass: filter by subscriber fields
      const subscriberFieldMatches = filteredSubscribers.filter(sub =>
        sub.jobTitle.toLowerCase().includes(searchLower) ||
        sub.specialization.toLowerCase().includes(searchLower) ||
        sub.aboutUser.toLowerCase().includes(searchLower) ||
        sub.offerDescription.toLowerCase().includes(searchLower)
      );

      // If no subscriber-field matches, do a second pass including profile name/username
      if (subscriberFieldMatches.length > 0) {
        filteredSubscribers = subscriberFieldMatches;
      } else {
        // Fetch profiles for remaining subscribers and match against name/username
        const withProfiles = await Promise.all(
          filteredSubscribers.map(async (sub) => {
            const profile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", sub.userId))
              .first();
            return { sub, profile };
          })
        );
        filteredSubscribers = withProfiles
          .filter(({ sub, profile }) =>
            sub.jobTitle.toLowerCase().includes(searchLower) ||
            sub.specialization.toLowerCase().includes(searchLower) ||
            sub.aboutUser.toLowerCase().includes(searchLower) ||
            sub.offerDescription.toLowerCase().includes(searchLower) ||
            (profile?.name?.toLowerCase().includes(searchLower) ?? false) ||
            (profile?.username?.toLowerCase().includes(searchLower) ?? false)
          )
          .map(({ sub }) => sub);
      }
    }

    // Sort by creation date (newest first)
    filteredSubscribers.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const paginatedSubscribers = filteredSubscribers.slice(offset, offset + limit);

    // Get profile information for each subscriber
    const subscribersWithProfiles = await Promise.all(
      paginatedSubscribers.map(async (subscriber) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", subscriber.userId))
          .first();

        return {
          subscriber,
          profile: profile ? {
            name: profile.name,
            username: profile.username,
            avatar: profile.avatar
          } : null
        };
      })
    );

    return {
      providers: subscribersWithProfiles,
      totalCount: filteredSubscribers.length,
      hasMore: offset + limit < filteredSubscribers.length
    };
  }
});

// Check if a provider is available on a specific date
export const checkProviderAvailability = query({
  args: {
    providerId: v.id("users"),
    date: v.string() // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    // Get provider's subscription
    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.providerId))
      .first();

    if (!subscriber || !subscriber.isActive) {
      return { available: false, reason: "Provider not found or inactive" };
    }

    // Get day of week for the date
    const date = new Date(args.date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()] as keyof typeof subscriber.openHours;

    // Check if provider is available on this day
    const daySchedule = subscriber.openHours[dayOfWeek];
    if (!daySchedule.available) {
      return { available: false, reason: "Provider not available on this day" };
    }

    // Get existing bookings for this date
    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_provider_date", (q) =>
        q.eq("providerId", args.providerId).eq("sessionDate", args.date)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "CONFIRMED"),
          q.eq(q.field("status"), "PENDING")
        )
      )
      .collect();

    return {
      available: true,
      daySchedule,
      existingBookings: existingBookings.map(booking => ({
        time: booking.sessionTime,
        duration: booking.duration,
        status: booking.status
      }))
    };
  }
});