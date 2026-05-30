import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";

// Get all linked bank accounts for the current user
export const getWithdrawalBankAccounts = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("bank_accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Link a new bank account
export const addWithdrawalBankAccount = mutation({
  args: {
    bankName: v.string(),
    bankCode: v.string(),
    bankSlug: v.optional(v.string()),
    accountNumber: v.string(),
    accountName: v.string(),
    recipientCode: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Prevent duplicate account numbers for the same user
    const existing = await ctx.db
      .query("bank_accounts")
      .withIndex("by_user_account", (q) =>
        q.eq("userId", userId).eq("accountNumber", args.accountNumber),
      )
      .first();
    if (existing) throw new Error("This account number is already linked to your profile");

    const id = await ctx.db.insert("bank_accounts", {
      userId,
      bankName: args.bankName,
      bankCode: args.bankCode,
      bankSlug: args.bankSlug,
      accountNumber: args.accountNumber,
      accountName: args.accountName,
      recipientCode: args.recipientCode,
      createdAt: Date.now(),
    });
    return id;
  },
});

// Remove a linked bank account
export const removeWithdrawalBankAccount = mutation({
  args: {
    bankAccountId: v.id("bank_accounts"),
  },
  handler: async (ctx, { bankAccountId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account = await ctx.db.get(bankAccountId);
    if (!account) throw new Error("Bank account not found");
    if (account.userId !== userId) throw new Error("Not authorized to remove this account");

    await ctx.db.delete(bankAccountId);
    return { success: true };
  },
});
