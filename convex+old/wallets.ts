import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

// Get user's wallet balance
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) {
      // Create wallet if it doesn't exist
      return 0;
    }

    return wallet.balance;
  },
});

// Initialize wallet for new user
export const initializeWallet = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingWallet) {
      return existingWallet._id;
    }

    const walletId = await ctx.db.insert("wallets", {
      userId,
      balance: 0,
      updatedAt: Date.now(),
    });

    return walletId;
  },
});

// Get transaction history
export const getTransactionHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);

    return transactions;
  },
});

// Process a debit transaction
export const debitWallet = mutation({
  args: {
    amount: v.number(),
    purpose: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, { amount, purpose, metadata }) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Create transaction record
    const transactionId = await ctx.db.insert("transactions", {
      userId,
      amount,
      type: "debit",
      purpose,
      status: "completed",
      metadata,
      timestamp: Date.now(),
    });

    // Update wallet balance
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance - amount,
      updatedAt: Date.now(),
    });

    return transactionId;
  },
});

// Process a credit transaction
export const creditWallet = mutation({
  args: {
    userId: v.id("users"),
    amount: v.number(),
    purpose: v.string(),
    metadata: v.any(),
  },
  handler: async (ctx, { userId, amount, purpose, metadata }) => {
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Create transaction record
    const transactionId = await ctx.db.insert("transactions", {
      userId,
      amount,
      type: "credit",
      purpose,
      status: "completed",
      metadata,
      timestamp: Date.now(),
    });

    // Update wallet balance
    await ctx.db.patch(wallet._id, {
      balance: wallet.balance + amount,
      updatedAt: Date.now(),
    });

    return transactionId;
  },
});
