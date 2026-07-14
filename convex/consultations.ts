/**
 * Consultations — P2P Expert Messaging
 *
 * Allows users to start a private 2-person circle with a health practitioner/expert
 * after viewing their content (articles or reels). If the expert has set a consultation
 * fee, payment is required before the circle becomes active.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Revenue split: 70% to expert, 30% to platform
const EXPERT_SHARE = 0.70;
const PLATFORM_SHARE = 0.30;

// ── Start a consultation with an expert ───────────────────────────────────────
export const startConsultation = mutation({
  args: {
    expertId: v.id("users"),
    contentType: v.union(v.literal("article"), v.literal("reel")),
    contentId: v.string(), // article or reel ID
    initialMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (userId === args.expertId) {
      throw new Error("Cannot start a consultation with yourself");
    }

    // Check if a consultation circle already exists between these two users
    const existingCircles = await ctx.db
      .query("circles")
      .filter((q) =>
        q.and(
          q.eq(q.field("isConsultationCircle"), true),
          q.eq(q.field("consultationExpertId"), args.expertId),
          q.eq(q.field("consultationUserId"), userId)
        )
      )
      .collect();

    // If an active consultation already exists, return it
    const activeCircle = existingCircles.find((c) => c.isActive);
    if (activeCircle) {
      return {
        circleId: activeCircle._id,
        requiresPayment: false,
        alreadyExists: true,
      };
    }

    // Check if there's a pending (unpaid) consultation circle
    const pendingCircle = existingCircles.find((c) => !c.isActive && !c.consultationPaid);
    if (pendingCircle) {
      return {
        circleId: pendingCircle._id,
        requiresPayment: true,
        fee: pendingCircle.consultationFee,
        currency: pendingCircle.consultationCurrency,
        alreadyExists: true,
      };
    }

    // Get expert's consultation fee settings
    const expertSubscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.expertId))
      .first();

    const feeEnabled = expertSubscriber?.consultationFeeEnabled ?? false;
    const fee = expertSubscriber?.consultationFee ?? 0;
    const currency = expertSubscriber?.consultationCurrency ?? expertSubscriber?.sessionCurrency ?? "USD";
    const requiresPayment = feeEnabled && fee > 0;

    // Get expert profile for circle name
    const expertProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.expertId))
      .first();

    const expertName = expertProfile?.name ?? expertProfile?.username ?? "Expert";

    // Get user profile for circle name
    const userProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const userName = userProfile?.name ?? userProfile?.username ?? "User";

    const now = Date.now();
    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Create the consultation circle — PRIVATE, FREE (fee is handled separately)
    const circleId = await ctx.db.insert("circles", {
      name: `Consultation: ${userName} & ${expertName}`,
      description: `Private consultation between ${userName} and ${expertName}`,
      creatorId: userId,
      type: "PRIVATE",
      accessType: "FREE",
      inviteCode,
      currentMembers: 2,
      tags: ["consultation"],
      isActive: !requiresPayment, // Active immediately if no fee, otherwise pending payment
      postingPermission: "EVERYONE",
      // Consultation-specific fields
      isConsultationCircle: true,
      consultationFee: requiresPayment ? fee : undefined,
      consultationCurrency: requiresPayment ? currency : undefined,
      consultationPaid: !requiresPayment, // Marked as paid if free
      consultationExpertId: args.expertId,
      consultationUserId: userId,
      consultationContentType: args.contentType,
      consultationContentId: args.contentId,
      // Bypass moderation
      approvalStatus: "NOT_REQUIRED",
      createdAt: now,
    });

    // Add both members
    await ctx.db.insert("circleMembers", {
      circleId,
      userId: userId,
      role: "MEMBER",
      joinedAt: now,
      lastActiveAt: now,
      isActive: true,
    });

    await ctx.db.insert("circleMembers", {
      circleId,
      userId: args.expertId,
      role: "CREATOR",
      joinedAt: now,
      lastActiveAt: now,
      isActive: true,
    });

    // If no payment required and there's an initial message, send it
    if (!requiresPayment && args.initialMessage) {
      await ctx.db.insert("circleMessages", {
        circleId,
        senderId: userId,
        messageType: "text",
        content: args.initialMessage,
        isEdited: false,
        isPinned: false,
        createdAt: now,
      });
    }

    return {
      circleId,
      requiresPayment,
      fee: requiresPayment ? fee : undefined,
      currency: requiresPayment ? currency : undefined,
      alreadyExists: false,
    };
  },
});

// ── Unlock consultation (process payment) ─────────────────────────────────────
export const unlockConsultation = mutation({
  args: {
    circleId: v.id("circles"),
    initialMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const circle = await ctx.db.get(args.circleId);
    if (!circle) throw new Error("Consultation not found");
    if (!circle.isConsultationCircle) throw new Error("Not a consultation circle");
    if (circle.consultationUserId !== userId) throw new Error("Only the consultation initiator can unlock");
    if (circle.consultationPaid) throw new Error("Consultation already unlocked");

    const fee = circle.consultationFee ?? 0;
    const currency = circle.consultationCurrency ?? "USD";

    if (fee <= 0) throw new Error("No fee required");

    // Get user's wallet
    const userWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!userWallet) throw new Error("Wallet not found. Please create a wallet first.");

    const userBalance = userWallet.balances[currency as keyof typeof userWallet.balances] ?? 0;

    if (userBalance < fee) {
      throw new Error(`Insufficient ${currency} balance. You need ${fee} ${currency} but have ${userBalance} ${currency}.`);
    }

    // Get expert's wallet
    const expertId = circle.consultationExpertId!;
    const expertWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", expertId))
      .first();

    if (!expertWallet) throw new Error("Expert wallet not found");

    const now = Date.now();

    // Calculate split
    const expertAmount = Math.round(fee * EXPERT_SHARE * 100) / 100;
    const platformAmount = Math.round(fee * PLATFORM_SHARE * 100) / 100;

    // Debit user wallet
    const updatedUserBalances = { ...userWallet.balances };
    updatedUserBalances[currency as keyof typeof updatedUserBalances] = userBalance - fee;
    await ctx.db.patch(userWallet._id, { balances: updatedUserBalances, updatedAt: now });

    // Credit expert wallet (70%)
    const expertBalances = { ...expertWallet.balances };
    expertBalances[currency as keyof typeof expertBalances] =
      (expertBalances[currency as keyof typeof expertBalances] ?? 0) + expertAmount;
    await ctx.db.patch(expertWallet._id, { balances: expertBalances, updatedAt: now });

    // Record transaction for user (debit)
    await ctx.db.insert("transactions", {
      id: `consultation_${args.circleId}_${now}`,
      fromUserId: userId,
      toUserId: expertId,
      amount: fee,
      currency: currency,
      type: "transfer",
      status: "completed",
      description: `Consultation fee payment`,
      metadata: {
        consultationCircleId: args.circleId,
        expertId: expertId,
        split: `${EXPERT_SHARE * 100}% expert / ${PLATFORM_SHARE * 100}% platform`,
      },
      createdAt: now,
      completedAt: now,
    });

    // Record transaction for expert (credit)
    await ctx.db.insert("transactions", {
      id: `consultation_expert_${args.circleId}_${now}`,
      fromUserId: userId,
      toUserId: expertId,
      amount: expertAmount,
      currency: currency,
      type: "transfer",
      status: "completed",
      description: `Consultation fee received`,
      metadata: {
        consultationCircleId: args.circleId,
        userId: userId,
        platformFee: platformAmount,
      },
      createdAt: now,
      completedAt: now,
    });

    // Activate the circle
    await ctx.db.patch(args.circleId, {
      isActive: true,
      consultationPaid: true,
      updatedAt: now,
    });

    // Send initial message if provided
    if (args.initialMessage) {
      await ctx.db.insert("circleMessages", {
        circleId: args.circleId,
        senderId: userId,
        messageType: "text",
        content: args.initialMessage,
        isEdited: false,
        isPinned: false,
        createdAt: now,
      });
    }

    return { success: true, circleId: args.circleId };
  },
});

// ── Get expert's consultation fee info ────────────────────────────────────────
export const getExpertConsultationInfo = query({
  args: {
    expertId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get expert's booking subscriber profile
    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.expertId))
      .first();

    // Get expert's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.expertId))
      .first();

    if (!subscriber) {
      return {
        isExpert: false,
        feeEnabled: false,
        fee: 0,
        currency: "USD",
        expertName: profile?.name ?? profile?.username ?? "Unknown",
        specialization: null,
      };
    }

    return {
      isExpert: true,
      feeEnabled: subscriber.consultationFeeEnabled ?? false,
      fee: subscriber.consultationFee ?? 0,
      currency: subscriber.consultationCurrency ?? subscriber.sessionCurrency ?? "USD",
      expertName: profile?.name ?? profile?.username ?? "Unknown",
      specialization: subscriber.specialization,
      jobTitle: subscriber.jobTitle,
    };
  },
});

// ── Get my consultations (as user or expert) ──────────────────────────────────
export const getMyConsultations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const limit = args.limit ?? 50;

    // Get consultations where user is either the initiator or the expert
    const asUser = await ctx.db
      .query("circles")
      .filter((q) =>
        q.and(
          q.eq(q.field("isConsultationCircle"), true),
          q.eq(q.field("consultationUserId"), userId)
        )
      )
      .order("desc")
      .take(limit);

    const asExpert = await ctx.db
      .query("circles")
      .filter((q) =>
        q.and(
          q.eq(q.field("isConsultationCircle"), true),
          q.eq(q.field("consultationExpertId"), userId)
        )
      )
      .order("desc")
      .take(limit);

    // Merge and deduplicate
    const allCircles = [...asUser, ...asExpert];
    const uniqueMap = new Map<string, typeof allCircles[0]>();
    for (const c of allCircles) {
      if (!uniqueMap.has(c._id)) uniqueMap.set(c._id, c);
    }

    const consultations = Array.from(uniqueMap.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    // Enrich with profile info
    const enriched = await Promise.all(
      consultations.map(async (circle) => {
        const otherUserId = circle.consultationExpertId === userId
          ? circle.consultationUserId!
          : circle.consultationExpertId!;

        const otherProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
          .first();

        return {
          ...circle,
          otherUser: {
            id: otherUserId,
            name: otherProfile?.name ?? otherProfile?.username ?? "Unknown",
            username: otherProfile?.username,
            avatar: otherProfile?.avatar,
          },
          isExpertView: circle.consultationExpertId === userId,
        };
      })
    );

    return enriched;
  },
});

// ── Check if consultation exists between user and expert ──────────────────────
export const getExistingConsultation = query({
  args: {
    expertId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const existing = await ctx.db
      .query("circles")
      .filter((q) =>
        q.and(
          q.eq(q.field("isConsultationCircle"), true),
          q.eq(q.field("consultationExpertId"), args.expertId),
          q.eq(q.field("consultationUserId"), userId)
        )
      )
      .first();

    return existing;
  },
});

// ── Update expert consultation fee settings ───────────────────────────────────
export const updateConsultationFee = mutation({
  args: {
    feeEnabled: v.boolean(),
    fee: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!subscriber) {
      throw new Error("You must be a registered expert to set consultation fees");
    }

    const supportedCurrencies = ["USD", "NGN", "GBP", "EUR", "CAD", "GHS", "KES", "GMD", "ZAR"];
    if (args.currency && !supportedCurrencies.includes(args.currency)) {
      throw new Error(`Currency must be one of: ${supportedCurrencies.join(", ")}`);
    }

    if (args.feeEnabled && (!args.fee || args.fee <= 0)) {
      throw new Error("Fee must be greater than 0 when enabled");
    }

    await ctx.db.patch(subscriber._id, {
      consultationFeeEnabled: args.feeEnabled,
      consultationFee: args.feeEnabled ? args.fee : undefined,
      consultationCurrency: args.feeEnabled ? (args.currency ?? subscriber.sessionCurrency ?? "USD") : undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
