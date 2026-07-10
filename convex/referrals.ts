import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const createReferral = mutation({
  args: {
    patientId: v.id("users"),
    title: v.string(),
    healthNote: v.string(),
    suggestedExperts: v.array(v.id("users")),
    // Optional: link a past session as context for this referral
    sessionId: v.optional(v.id("bookings")),
    // How was this referral created — defaults to STANDALONE when not provided
    referralSource: v.optional(v.string()), // "STANDALONE" | "FROM_BOOKING"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const providerSubscription = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!providerSubscription || !providerSubscription.isActive) {
      throw new Error("Only active providers can create referrals");
    }

    if (args.suggestedExperts.length < 3) {
      throw new Error("Please suggest at least 3 experts for the patient to choose from");
    }

    if (args.suggestedExperts.includes(userId as Id<"users">)) {
      throw new Error("You cannot refer a patient to yourself");
    }

    const patient = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.patientId))
      .first();

    if (!patient) {
      throw new Error("Patient not found");
    }

    for (const expertId of args.suggestedExperts) {
      const expertSubscription = await ctx.db
        .query("bookingSubscribers")
        .withIndex("by_user", (q) => q.eq("userId", expertId))
        .first();

      if (!expertSubscription || !expertSubscription.isActive) {
        const expertProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", expertId))
          .first();
        throw new Error(
          `${expertProfile?.username || "One of the selected users"} is not an active provider`
        );
      }
    }

    // If a sessionId was provided, validate it belongs to this provider and patient
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId);
      if (!session) {
        throw new Error("Linked session not found");
      }
      if (session.providerId !== userId) {
        throw new Error("You can only link sessions where you are the provider");
      }
      if (session.clientId !== args.patientId) {
        throw new Error("The linked session must be with this patient");
      }
    }

    const now = Date.now();
    const source = args.referralSource ?? "STANDALONE";

    const referralId = await ctx.db.insert("referrals", {
      referringExpertId: userId,
      patientId: args.patientId,
      title: args.title.trim(),
      healthNote: args.healthNote.trim(),
      suggestedExperts: args.suggestedExperts,
      status: "PENDING",
      referralSource: source,
      sessionId: args.sessionId,
      commissionRate: 0.10,
      commissionPaid: false,
      createdAt: now,
    });

    // Notify the patient about their new referral
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.referralNotifications.notifyPatientNewReferral,
        { referralId }
      );
    } catch (err) {
      console.error("Failed to send referral notification:", err);
    }

    return { referralId };
  },
});

export const getPatientReferrals = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let query = ctx.db
      .query("referrals")
      .withIndex("by_patient", (q) => q.eq("patientId", userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const referrals = await query.order("desc").collect();

    const referralsWithDetails = await Promise.all(
      referrals.map(async (referral) => {
        const referringExpertProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", referral.referringExpertId))
          .first();

        const referringExpertSubscription = await ctx.db
          .query("bookingSubscribers")
          .withIndex("by_user", (q) => q.eq("userId", referral.referringExpertId))
          .first();

        const suggestedExpertsDetails = await Promise.all(
          referral.suggestedExperts.map(async (expertId) => {
            const profile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", expertId))
              .first();

            const subscription = await ctx.db
              .query("bookingSubscribers")
              .withIndex("by_user", (q) => q.eq("userId", expertId))
              .first();

            return {
              id: expertId,
              profile,
              subscription,
            };
          })
        );

        let selectedExpertDetails = null;
        if (referral.selectedExpertId) {
          const selectedProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", referral.selectedExpertId!))
            .first();

          const selectedSubscription = await ctx.db
            .query("bookingSubscribers")
            .withIndex("by_user", (q) => q.eq("userId", referral.selectedExpertId!))
            .first();

          selectedExpertDetails = {
            id: referral.selectedExpertId,
            profile: selectedProfile,
            subscription: selectedSubscription,
          };
        }

        return {
          ...referral,
          healthNote: undefined,
          referringExpert: {
            id: referral.referringExpertId,
            profile: referringExpertProfile,
            subscription: referringExpertSubscription,
          },
          suggestedExpertsDetails,
          selectedExpert: selectedExpertDetails,
        };
      })
    );

    return referralsWithDetails;
  },
});

export const getReferringExpertReferrals = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let query = ctx.db
      .query("referrals")
      .withIndex("by_referring_expert", (q) => q.eq("referringExpertId", userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const referrals = await query.order("desc").collect();

    const referralsWithDetails = await Promise.all(
      referrals.map(async (referral) => {
        const patientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", referral.patientId))
          .first();

        let selectedExpertDetails = null;
        if (referral.selectedExpertId) {
          const selectedProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", referral.selectedExpertId!))
            .first();

          const selectedSubscription = await ctx.db
            .query("bookingSubscribers")
            .withIndex("by_user", (q) => q.eq("userId", referral.selectedExpertId!))
            .first();

          selectedExpertDetails = {
            id: referral.selectedExpertId,
            profile: selectedProfile,
            subscription: selectedSubscription,
          };
        }

        return {
          ...referral,
          patient: {
            id: referral.patientId,
            profile: patientProfile,
          },
          selectedExpert: selectedExpertDetails,
        };
      })
    );

    return referralsWithDetails;
  },
});

export const getSelectedExpertReferrals = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    let query = ctx.db
      .query("referrals")
      .withIndex("by_selected_expert", (q) => q.eq("selectedExpertId", userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const referrals = await query.order("desc").collect();

    const referralsWithDetails = await Promise.all(
      referrals.map(async (referral) => {
        const patientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", referral.patientId))
          .first();

        const referringExpertProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", referral.referringExpertId))
          .first();

        const referringExpertSubscription = await ctx.db
          .query("bookingSubscribers")
          .withIndex("by_user", (q) => q.eq("userId", referral.referringExpertId))
          .first();

        return {
          ...referral,
          patient: {
            id: referral.patientId,
            profile: patientProfile,
          },
          referringExpert: {
            id: referral.referringExpertId,
            profile: referringExpertProfile,
            subscription: referringExpertSubscription,
          },
        };
      })
    );

    return referralsWithDetails;
  },
});

export const selectExpertFromReferral = mutation({
  args: {
    referralId: v.id("referrals"),
    selectedExpertId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new Error("Referral not found");
    }

    if (referral.patientId !== userId) {
      throw new Error("Only the patient can select an expert");
    }

    if (referral.status !== "PENDING") {
      throw new Error("This referral has already been processed");
    }

    if (!referral.suggestedExperts.includes(args.selectedExpertId)) {
      throw new Error("Selected expert must be from the suggested list");
    }

    const now = Date.now();

    await ctx.db.patch(args.referralId, {
      selectedExpertId: args.selectedExpertId,
      status: "ACCEPTED",
      updatedAt: now,
    });

    // Create the private 3-way referral circle for all three parties
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.referrals.createReferralCircle,
        {
          referralId: args.referralId,
          referringExpertId: referral.referringExpertId,
          selectedExpertId: args.selectedExpertId,
          patientId: referral.patientId,
          referralTitle: referral.title,
        }
      );
    } catch (err) {
      console.error("Failed to create referral circle:", err);
    }

    // Notify referring expert, selected expert, and include circle context
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.referralNotifications.notifyExpertPatientSelected,
        { referralId: args.referralId }
      );
    } catch (err) {
      console.error("Failed to send referral selection notification:", err);
    }

    return { success: true, referralId: args.referralId };
  },
});

export const declineReferral = mutation({
  args: {
    referralId: v.id("referrals"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new Error("Referral not found");
    }

    if (referral.patientId !== userId) {
      throw new Error("Only the patient can decline a referral");
    }

    if (referral.status !== "PENDING") {
      throw new Error("This referral has already been processed");
    }

    const now = Date.now();

    await ctx.db.patch(args.referralId, {
      status: "DECLINED",
      declineReason: args.reason,
      updatedAt: now,
    });

    // Notify the referring expert
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.referralNotifications.notifyExpertReferralDeclined,
        { referralId: args.referralId }
      );
    } catch (err) {
      console.error("Failed to send referral declined notification:", err);
    }

    return { success: true };
  },
});

export const getReferralById = query({
  args: {
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new Error("Referral not found");
    }

    const hasAccess =
      referral.patientId === userId ||
      referral.referringExpertId === userId ||
      referral.selectedExpertId === userId;

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    const patientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", referral.patientId))
      .first();

    const referringExpertProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", referral.referringExpertId))
      .first();

    const referringExpertSubscription = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", referral.referringExpertId))
      .first();

    const suggestedExpertsDetails = await Promise.all(
      referral.suggestedExperts.map(async (expertId) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", expertId))
          .first();

        const subscription = await ctx.db
          .query("bookingSubscribers")
          .withIndex("by_user", (q) => q.eq("userId", expertId))
          .first();

        return {
          id: expertId,
          profile,
          subscription,
        };
      })
    );

    let selectedExpertDetails = null;
    if (referral.selectedExpertId) {
      const selectedProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", referral.selectedExpertId!))
        .first();

      const selectedSubscription = await ctx.db
        .query("bookingSubscribers")
        .withIndex("by_user", (q) => q.eq("userId", referral.selectedExpertId!))
        .first();

      selectedExpertDetails = {
        id: referral.selectedExpertId,
        profile: selectedProfile,
        subscription: selectedSubscription,
      };
    }

    const shouldShowHealthNote = referral.selectedExpertId === userId;

    return {
      ...referral,
      healthNote: shouldShowHealthNote ? referral.healthNote : undefined,
      patient: {
        id: referral.patientId,
        profile: patientProfile,
      },
      referringExpert: {
        id: referral.referringExpertId,
        profile: referringExpertProfile,
        subscription: referringExpertSubscription,
      },
      suggestedExpertsDetails,
      selectedExpert: selectedExpertDetails,
    };
  },
});

export const linkBookingToReferral = mutation({
  args: {
    referralId: v.id("referrals"),
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new Error("Referral not found");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.providerId !== referral.selectedExpertId) {
      throw new Error("Booking must be with the selected expert");
    }

    if (booking.clientId !== referral.patientId) {
      throw new Error("Booking must be by the referred patient");
    }

    const now = Date.now();
    const commissionAmount = booking.totalAmount * referral.commissionRate;

    await ctx.db.patch(args.referralId, {
      bookingId: args.bookingId,
      commissionAmount,
      commissionCurrency: booking.currency,
      updatedAt: now,
    });

    return { success: true, commissionAmount, currency: booking.currency };
  },
});

export const completeReferralWithCommission = mutation({
  args: {
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new Error("Referral not found");
    }

    if (referral.status !== "ACCEPTED") {
      throw new Error("Referral must be in ACCEPTED status");
    }

    if (!referral.bookingId) {
      throw new Error("No booking linked to this referral");
    }

    if (referral.commissionPaid) {
      throw new Error("Commission already paid");
    }

    const booking = await ctx.db.get(referral.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    if (booking.status !== "COMPLETED") {
      throw new Error("Booking must be completed first");
    }

    if (!referral.commissionAmount || !referral.commissionCurrency) {
      throw new Error("Commission amount not calculated");
    }

    let referringExpertWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", referral.referringExpertId))
      .first();

    if (!referringExpertWallet) {
      const walletId = await ctx.db.insert("wallets", {
        userId: referral.referringExpertId,
        primaryCurrency: "USD",
        phoneCountryDetected: false,
        balances: {
          USD: 0,
          NGN: 0,
          GBP: 0,
          EUR: 0,
          CAD: 0,
          GHS: 0,
          KES: 0,
          GMD: 0,
          ZAR: 0,
        },
        createdAt: Date.now(),
      });
      referringExpertWallet = await ctx.db.get(walletId);
      if (!referringExpertWallet) {
        throw new Error("Failed to create wallet");
      }
    }

    const now = Date.now();
    const newBalances = { ...referringExpertWallet.balances };
    const currency = referral.commissionCurrency as keyof typeof newBalances;
    newBalances[currency] += referral.commissionAmount;

    await ctx.db.patch(referringExpertWallet._id, {
      balances: newBalances,
      updatedAt: now,
    });

    const txId = `referral-commission-${referral._id}-${now}`;
    await ctx.db.insert("transactions", {
      id: txId,
      toUserId: referral.referringExpertId,
      fromUserId: referral.selectedExpertId,
      amount: referral.commissionAmount,
      currency: referral.commissionCurrency,
      type: "transfer",
      status: "completed",
      description: `Referral commission for: ${referral.title}`,
      metadata: {
        referralId: referral._id,
        bookingId: referral.bookingId,
        commissionRate: referral.commissionRate,
      },
      createdAt: now,
      completedAt: now,
    });

    await ctx.db.patch(args.referralId, {
      status: "COMPLETED",
      commissionPaid: true,
      commissionTxId: txId,
      completedAt: now,
      updatedAt: now,
    });

    // Notify the referring expert that commission has been paid
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.referralNotifications.notifyExpertReferralCompleted,
        { referralId: args.referralId }
      );
    } catch (err) {
      console.error("Failed to send referral completed notification:", err);
    }

    return {
      success: true,
      commissionAmount: referral.commissionAmount,
      currency: referral.commissionCurrency,
      transactionId: txId,
    };
  },
});


export const internalCompleteReferralWithCommission = internalMutation({
  args: {
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) {
      throw new Error("Referral not found");
    }

    if (referral.status !== "ACCEPTED") {
      return { success: false, reason: "Referral not in ACCEPTED status" };
    }

    if (!referral.bookingId) {
      return { success: false, reason: "No booking linked" };
    }

    if (referral.commissionPaid) {
      return { success: false, reason: "Commission already paid" };
    }

    const booking = await ctx.db.get(referral.bookingId);
    if (!booking) {
      return { success: false, reason: "Booking not found" };
    }

    if (booking.status !== "COMPLETED") {
      return { success: false, reason: "Booking not completed" };
    }

    if (!referral.commissionAmount || !referral.commissionCurrency) {
      return { success: false, reason: "Commission not calculated" };
    }

    let referringExpertWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", referral.referringExpertId))
      .first();

    if (!referringExpertWallet) {
      const walletId = await ctx.db.insert("wallets", {
        userId: referral.referringExpertId,
        primaryCurrency: "USD",
        phoneCountryDetected: false,
        balances: {
          USD: 0,
          NGN: 0,
          GBP: 0,
          EUR: 0,
          CAD: 0,
          GHS: 0,
          KES: 0,
          GMD: 0,
          ZAR: 0,
        },
        createdAt: Date.now(),
      });
      referringExpertWallet = await ctx.db.get(walletId);
      if (!referringExpertWallet) {
        return { success: false, reason: "Failed to create wallet" };
      }
    }

    const now = Date.now();
    const newBalances = { ...referringExpertWallet.balances };
    const currency = referral.commissionCurrency as keyof typeof newBalances;
    newBalances[currency] += referral.commissionAmount;

    await ctx.db.patch(referringExpertWallet._id, {
      balances: newBalances,
      updatedAt: now,
    });

    const txId = `referral-commission-${referral._id}-${now}`;
    await ctx.db.insert("transactions", {
      id: txId,
      toUserId: referral.referringExpertId,
      fromUserId: referral.selectedExpertId,
      amount: referral.commissionAmount,
      currency: referral.commissionCurrency,
      type: "transfer",
      status: "completed",
      description: `Referral commission for: ${referral.title}`,
      metadata: {
        referralId: referral._id,
        bookingId: referral.bookingId,
        commissionRate: referral.commissionRate,
      },
      createdAt: now,
      completedAt: now,
    });

    await ctx.db.patch(args.referralId, {
      status: "COMPLETED",
      commissionPaid: true,
      commissionTxId: txId,
      completedAt: now,
      updatedAt: now,
    });

    // Notify the referring expert
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.referralNotifications.notifyExpertReferralCompleted,
        { referralId: args.referralId }
      );
    } catch (err) {
      console.error("Failed to send referral completed notification:", err);
    }

    return {
      success: true,
      commissionAmount: referral.commissionAmount,
      currency: referral.commissionCurrency,
      transactionId: txId,
    };
  },
});

// ─── Internal: create the 3-way referral circle ──────────────────────────────
// Called by selectExpertFromReferral once the patient has chosen their expert.
// All three participants are added as members immediately; the circle bypasses
// the moderation approval queue so it is live instantly.
export const createReferralCircle = internalMutation({
  args: {
    referralId: v.id("referrals"),
    referringExpertId: v.id("users"),
    selectedExpertId: v.id("users"),
    patientId: v.id("users"),
    referralTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Build a unique, human-readable name from the referral title
    const circleName = `Referral: ${args.referralTitle}`;
    const description =
      "A private space for the referring provider, selected provider, and patient to communicate and share content.";

    // Generate an invite code in case it's needed for deep-linking later
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create the circle — PRIVATE, FREE, active immediately (no moderation queue)
    const circleId = await ctx.db.insert("circles", {
      name: circleName,
      description,
      creatorId: args.referringExpertId,
      type: "PRIVATE",
      accessType: "FREE",
      inviteCode,
      currentMembers: 3, // all three added below
      tags: ["referral"],
      isActive: true,
      postingPermission: "EVERYONE",
      // Referral-specific flags
      isReferralCircle: true,
      referralId: args.referralId,
      // Bypass moderation
      approvalStatus: "NOT_REQUIRED",
      createdAt: now,
    });

    // Add all three members in one go
    const members = [
      { userId: args.referringExpertId, role: "CREATOR" as const },
      { userId: args.selectedExpertId,  role: "MEMBER"  as const },
      { userId: args.patientId,         role: "MEMBER"  as const },
    ];

    for (const member of members) {
      await ctx.db.insert("circleMembers", {
        circleId,
        userId: member.userId,
        role: member.role,
        joinedAt: now,
        lastActiveAt: now,
        isActive: true,
      });
    }

    // Store the circleId back on the referral record
    await ctx.db.patch(args.referralId, {
      circleId,
      updatedAt: now,
    });

    return { circleId };
  },
});

// Query: get the referral circle for a given referral (used by the detail screen)
export const getReferralCircle = query({
  args: { referralId: v.id("referrals") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const referral = await ctx.db.get(args.referralId);
    if (!referral) throw new Error("Referral not found");

    // Only the three parties may access this
    const hasAccess =
      referral.patientId === userId ||
      referral.referringExpertId === userId ||
      referral.selectedExpertId === userId;
    if (!hasAccess) throw new Error("Access denied");

    if (!referral.circleId) return null;

    const circle = await ctx.db.get(referral.circleId);
    return circle ?? null;
  },
});
