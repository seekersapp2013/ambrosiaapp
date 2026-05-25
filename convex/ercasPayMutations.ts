import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { api } from "./_generated/api";

// Create pending transaction
export const createPendingTransaction = internalMutation({
  args: {
    transactionId: v.string(),
    userId: v.string(),
    amount: v.number(),
    currency: v.string(),
    paymentReference: v.string(),
  },
  handler: async (ctx, args) => {
    const transactionDocId = await ctx.db.insert("ercasPayTransactions", {
      id: args.transactionId,
      userId: args.userId,
      amount: args.amount,
      currency: args.currency,
      paymentReference: args.paymentReference,
      status: "pending",
      createdAt: Date.now(),
    });

    return transactionDocId;
  },
});

// Update transaction status
export const updateTransactionStatus = internalMutation({
  args: {
    transactionId: v.string(),
    status: v.string(),
    webhookData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("ercasPayTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("id", args.transactionId))
      .first();

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await ctx.db.patch(transaction._id, {
      status: args.status,
      webhookData: args.webhookData,
      updatedAt: Date.now(),
    });

    return transaction._id;
  },
});

// Update transaction with payment URL
export const updateTransactionWithPaymentUrl = internalMutation({
  args: {
    transactionId: v.string(),
    externalTransactionId: v.string(),
    paymentUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("ercasPayTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("id", args.transactionId))
      .first();

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    await ctx.db.patch(transaction._id, {
      externalTransactionId: args.externalTransactionId,
      paymentUrl: args.paymentUrl,
      updatedAt: Date.now(),
    });

    return transaction._id;
  },
});

// Get transaction by external ID
export const getTransactionByExternalId = internalQuery({
  args: {
    externalTransactionId: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("ercasPayTransactions")
      .withIndex("by_external_id", (q) => q.eq("externalTransactionId", args.externalTransactionId))
      .first();

    return transaction;
  },
});

// Get transaction by payment reference
export const getTransactionByPaymentReference = query({
  args: {
    paymentReference: v.string(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("ercasPayTransactions")
      .withIndex("by_payment_reference", (q) => q.eq("paymentReference", args.paymentReference))
      .first();

    return transaction;
  },
});

// Complete ErcasPay deposit
export const completeErcasPayDeposit = internalMutation({
  args: {
    transactionId: v.string(),
    webhookData: v.any(),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db
      .query("ercasPayTransactions")
      .withIndex("by_transaction_id", (q) => q.eq("id", args.transactionId))
      .first();

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    // Use the existing deposit function to credit the wallet
    await ctx.runMutation(api.wallets.depositFunds.depositFunds, {
      amount: transaction.amount,
      currency: transaction.currency,
    });

    // Update transaction status
    await ctx.db.patch(transaction._id, {
      status: "completed",
      webhookData: args.webhookData,
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return transaction._id;
  },
});