import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

export const createReferral = mutation({
  args: {
    patientId: v.id("users"),
    title: v.string(),
    healthNote: v.string(),
    suggestedExperts: v.array(v.id("users")),
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

    const now = Date.now();

    const referralId = await ctx.db.insert("referrals", {
      referringExpertId: userId,
      patientId: args.patientId,
      title: args.title.trim(),
      healthNote: args.healthNote.trim(),
      suggestedExperts: args.suggestedExperts,
      status: "PENDING",
      commissionRate: 0.10,
      commissionPaid: false,
      createdAt: now,
    });

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

    return {
      success: true,
      commissionAmount: referral.commissionAmount,
      currency: referral.commissionCurrency,
      transactionId: txId,
    };
  },
});
