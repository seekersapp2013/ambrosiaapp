import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

export const transferFunds = mutation({
  args: {
    recipientUsername: v.string(),
    amount: v.number(),
    currency: v.string(), // "USD" or "NGN"
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const supportedCurrencies = ["USD", "NGN", "GBP", "EUR", "CAD", "GHS", "KES", "GMD", "ZAR"];
    if (!supportedCurrencies.includes(args.currency)) {
      throw new Error(`Currency must be one of: ${supportedCurrencies.join(", ")}`);
    }

    // Find recipient by username
    const recipientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.recipientUsername.toLowerCase()))
      .first();

    if (!recipientProfile) {
      throw new Error("Recipient not found");
    }

    const recipientUserId = recipientProfile.userId;

    if (userId === recipientUserId) {
      throw new Error("Cannot transfer to yourself");
    }

    // Get sender wallet
    const senderWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!senderWallet) {
      throw new Error("Sender wallet not found");
    }

    const senderBalance = senderWallet.balances[args.currency as keyof typeof senderWallet.balances];

    if (senderBalance < args.amount) {
      throw new Error("Insufficient balance");
    }

    // Get or create recipient wallet
    let recipientWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", recipientUserId))
      .first();

    if (!recipientWallet) {
      const walletId = await ctx.db.insert("wallets", {
        userId: recipientUserId,
        primaryCurrency: "USD", // Default primary currency
        phoneCountryDetected: false,
        balances: {
          USD: 0, NGN: 0, GBP: 0, EUR: 0,
          CAD: 0, GHS: 0, KES: 0, GMD: 0, ZAR: 0
        },
        createdAt: Date.now(),
      });
      recipientWallet = await ctx.db.get(walletId);
      if (!recipientWallet) {
        throw new Error("Failed to create recipient wallet");
      }
    }

    // Generate unique transaction ID
    const transactionId = `txf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    await ctx.db.insert("transactions", {
      id: transactionId,
      fromUserId: userId,
      toUserId: recipientUserId,
      amount: args.amount,
      currency: args.currency,
      type: "transfer",
      status: "completed",
      description: args.description || `Transfer to @${args.recipientUsername}`,
      metadata: {
        recipientUsername: args.recipientUsername,
      },
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    // Update sender balance
    const newSenderBalances = { ...senderWallet.balances };
    newSenderBalances[args.currency as keyof typeof newSenderBalances] -= args.amount;
    const senderUpdateData = { 
      balances: newSenderBalances,
      updatedAt: Date.now() 
    };
    await ctx.db.patch(senderWallet._id, senderUpdateData);

    // Update recipient balance
    const newRecipientBalances = { ...recipientWallet.balances };
    newRecipientBalances[args.currency as keyof typeof newRecipientBalances] += args.amount;
    const recipientUpdateData = { 
      balances: newRecipientBalances,
      updatedAt: Date.now() 
    };
    if (!recipientWallet) {
      throw new Error("Recipient wallet not found");
    }
    await ctx.db.patch(recipientWallet._id, recipientUpdateData);

    // Get sender profile for notifications
    const senderProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // Send notifications
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
      type: 'WALLET_TRANSFER_SENT',
      recipientUserId: userId,
      metadata: {
        amount: args.amount.toString(),
        currency: args.currency,
        recipientUsername: args.recipientUsername,
        transactionId,
      },
    });

    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
      type: 'WALLET_TRANSFER_RECEIVED',
      recipientUserId: recipientUserId,
      actorUserId: userId,
      metadata: {
        amount: args.amount.toString(),
        currency: args.currency,
        senderUsername: senderProfile?.username || 'Unknown',
        transactionId,
      },
    });

    const newSenderBalance = senderBalance - args.amount;

    return {
      success: true,
      senderNewBalance: newSenderBalance,
      currency: args.currency,
      transactionId,
    };
  },
});