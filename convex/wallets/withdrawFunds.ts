import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "../_generated/api";

export const withdrawFunds = mutation({
  args: {
    amount: v.number(),
    currency: v.string(), // Only "NGN" allowed for withdrawals
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Only NGN withdrawals allowed
    if (args.currency !== "NGN") {
      throw new Error("Withdrawals are only supported in NGN");
    }

    // Get wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const currentBalance = wallet.balances.NGN;

    if (currentBalance < args.amount) {
      throw new Error("Insufficient balance");
    }

    // Generate unique transaction ID
    const transactionId = `wit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record
    await ctx.db.insert("transactions", {
      id: transactionId,
      fromUserId: userId,
      amount: args.amount,
      currency: args.currency,
      type: "withdrawal",
      status: "completed",
      description: `Withdrawal of ${args.amount} ${args.currency}`,
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    // Update wallet balance for NGN
    const newBalances = {
      ...wallet.balances,
      NGN: wallet.balances.NGN - args.amount
    };

    await ctx.db.patch(wallet._id, {
      balances: newBalances,
      updatedAt: Date.now()
    });

    // Send notification
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
      type: 'WALLET_WITHDRAWAL',
      recipientUserId: userId,
      metadata: {
        amount: args.amount.toString(),
        currency: args.currency,
        transactionId,
      },
    });

    const newBalance = currentBalance - args.amount;

    return {
      success: true,
      newBalance,
      currency: args.currency,
      transactionId,
    };
  },
});