// Internal mutations for the withdrawal flow.
// This file must NOT have "use node" — mutations run in the Convex runtime.
import { v } from "convex/values";
import { internalMutation } from "../_generated/server";

// Deduct balance and create a pending transaction record
export const deductAndCreateTx = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    bankAccountId: v.id("bank_accounts"),
    bankName: v.string(),
    accountNumber: v.string(),
    transactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();
    if (!wallet) throw new Error("Wallet not found");
    if (wallet.balances.NGN < args.amount) throw new Error("Insufficient balance");

    // Create pending transaction
    await ctx.db.insert("transactions", {
      id: args.transactionId,
      fromUserId: args.userId,
      amount: args.amount,
      currency: "NGN",
      type: "withdrawal",
      status: "pending",
      description: `Withdrawal of ₦${args.amount.toFixed(2)} to ${args.bankName}`,
      metadata: {
        bankAccountId: args.bankAccountId,
        bankName: args.bankName,
        accountNumber: args.accountNumber,
      },
      createdAt: Date.now(),
    });

    // Deduct balance immediately (optimistic — refunded on failure via webhook)
    await ctx.db.patch(wallet._id, {
      balances: { ...wallet.balances, NGN: wallet.balances.NGN - args.amount },
      updatedAt: Date.now(),
    });
  },
});

// Update transaction with Paystack transfer code after the API call succeeds
export const updateTxWithTransferCode = internalMutation({
  args: {
    transactionId: v.string(),
    transferCode: v.string(),
    paystackStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const tx = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("id"), args.transactionId))
      .first();
    if (!tx) return;
    await ctx.db.patch(tx._id, {
      externalTransactionId: args.transferCode,
      metadata: {
        ...(tx.metadata ?? {}),
        paystackTransferCode: args.transferCode,
        paystackStatus: args.paystackStatus,
      },
    });
  },
});

// Refund balance and mark transaction failed (called when Paystack call throws)
export const refundAndFailTx = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    transactionId: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();
    if (wallet) {
      await ctx.db.patch(wallet._id, {
        balances: { ...wallet.balances, NGN: wallet.balances.NGN + args.amount },
        updatedAt: Date.now(),
      });
    }

    const tx = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("id"), args.transactionId))
      .first();
    if (tx) {
      await ctx.db.patch(tx._id, {
        status: "failed",
        metadata: { ...(tx.metadata ?? {}), failureReason: args.reason },
      });
    }
  },
});
