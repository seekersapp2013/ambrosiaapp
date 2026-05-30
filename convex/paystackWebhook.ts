import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Called when Paystack confirms a transfer succeeded
export const handleTransferSuccess = internalMutation({
  args: {
    transferCode: v.string(),
    paystackData: v.optional(v.any()),
  },
  handler: async (ctx, { transferCode, paystackData }) => {
    // Find the transaction by paystackTransferCode stored in metadata
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("type", "withdrawal"))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const tx = transactions.find(
      (t) =>
        t.externalTransactionId === transferCode ||
        (t.metadata as any)?.paystackTransferCode === transferCode,
    );

    if (!tx) return; // Already processed or not found

    await ctx.db.patch(tx._id, {
      status: "completed",
      completedAt: Date.now(),
      webhookData: paystackData,
      metadata: {
        ...(tx.metadata ?? {}),
        paystackStatus: "success",
      },
    });

    if (tx.fromUserId) {
      await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
        type: "WALLET_WITHDRAWAL",
        recipientUserId: tx.fromUserId,
        metadata: {
          amount: tx.amount.toString(),
          currency: "NGN",
          transactionId: tx.id,
          status: "success",
          message: `Your withdrawal of ₦${tx.amount.toFixed(2)} has been sent to your bank account.`,
        },
      });
    }
  },
});

// Called when Paystack reports a transfer failed or was reversed
export const handleTransferFailed = internalMutation({
  args: {
    transferCode: v.string(),
    reason: v.string(),
    paystackData: v.optional(v.any()),
  },
  handler: async (ctx, { transferCode, reason, paystackData }) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_type", (q) => q.eq("type", "withdrawal"))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    const tx = transactions.find(
      (t) =>
        t.externalTransactionId === transferCode ||
        (t.metadata as any)?.paystackTransferCode === transferCode,
    );

    if (!tx || !tx.fromUserId) return;

    // Mark failed
    await ctx.db.patch(tx._id, {
      status: "failed",
      webhookData: paystackData,
      metadata: {
        ...(tx.metadata ?? {}),
        paystackStatus: "failed",
        failureReason: reason,
      },
    });

    // Refund the balance
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", tx.fromUserId!))
      .first();

    if (wallet) {
      await ctx.db.patch(wallet._id, {
        balances: {
          ...wallet.balances,
          NGN: wallet.balances.NGN + tx.amount,
        },
        updatedAt: Date.now(),
      });
    }

    // Notify user of failure + refund
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
      type: "WALLET_WITHDRAWAL",
      recipientUserId: tx.fromUserId,
      metadata: {
        amount: tx.amount.toString(),
        currency: "NGN",
        transactionId: tx.id,
        status: "failed",
        message: `Your withdrawal of ₦${tx.amount.toFixed(2)} failed. Your funds have been returned to your wallet.`,
      },
    });
  },
});
