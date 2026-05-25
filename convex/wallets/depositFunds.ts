import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

export const depositFunds = mutation({
  args: {
    amount: v.number(),
    currency: v.string(), // Any of the 9 supported currencies
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Validate currency
    const supportedCurrencies = ["USD", "NGN", "GBP", "EUR", "CAD", "GHS", "KES", "GMD", "ZAR"];
    if (!supportedCurrencies.includes(args.currency)) {
      throw new Error(`Currency ${args.currency} not supported for deposits`);
    }

    // Get or create wallet
    let wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) {
      const walletId = await ctx.db.insert("wallets", {
        userId,
        primaryCurrency: args.currency, // Set primary currency to deposit currency
        phoneCountryDetected: false,
        balances: {
          USD: 0, NGN: 0, GBP: 0, EUR: 0, CAD: 0,
          GHS: 0, KES: 0, GMD: 0, ZAR: 0
        },
        createdAt: Date.now(),
      });
      wallet = await ctx.db.get(walletId);
      if (!wallet) {
        throw new Error("Failed to create wallet");
      }
    }

    // Generate unique transaction ID
    const transactionId = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    await ctx.db.insert("transactions", {
      id: transactionId,
      toUserId: userId,
      amount: args.amount,
      currency: args.currency,
      type: "deposit",
      status: "completed",
      description: `Deposit of ${args.amount} ${args.currency}`,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    // Update wallet balance for the specific currency
    const currentBalances = wallet.balances;
    const newBalances = {
      ...currentBalances,
      [args.currency]: currentBalances[args.currency as keyof typeof currentBalances] + args.amount
    };

    await ctx.db.patch(wallet._id, {
      balances: newBalances,
      updatedAt: Date.now()
    });

    // Send notification
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
      type: 'WALLET_DEPOSIT',
      recipientUserId: userId,
      metadata: {
        amount: args.amount.toString(),
        currency: args.currency,
        transactionId,
      },
    });

    const newBalance = newBalances[args.currency as keyof typeof newBalances];

    return {
      success: true,
      newBalance,
      currency: args.currency,
      transactionId,
    };
  },
});