import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current user's Dedicated Virtual Account (or null).
 * Drives the Bank Transfer screen: null → KYC form, present → details view.
 * The BVN is never stored, so it is never returned here.
 */
export const getMyDedicatedAccount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db
      .query("dedicated_accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

/**
 * Create or update a user's dedicated account record.
 *
 * Called in two phases:
 *  1. provisionDedicatedAccount (action) saves a "pending" row keyed by
 *     userId + email right after the assign request is accepted.
 *  2. The dedicatedaccount.assign.success webhook fills in the Paystack
 *     account details and flips status to "active".
 */
export const saveDedicatedAccount = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    status: v.string(), // "pending" | "active" | "failed"
    paystackCustomerCode: v.optional(v.string()),
    paystackCustomerId: v.optional(v.number()),
    dvaId: v.optional(v.number()),
    accountName: v.optional(v.string()),
    accountNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    bankSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dedicated_accounts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        ...(args.email !== undefined && { email: args.email }),
        ...(args.paystackCustomerCode !== undefined && {
          paystackCustomerCode: args.paystackCustomerCode,
        }),
        ...(args.paystackCustomerId !== undefined && {
          paystackCustomerId: args.paystackCustomerId,
        }),
        ...(args.dvaId !== undefined && { dvaId: args.dvaId }),
        ...(args.accountName !== undefined && { accountName: args.accountName }),
        ...(args.accountNumber !== undefined && { accountNumber: args.accountNumber }),
        ...(args.bankName !== undefined && { bankName: args.bankName }),
        ...(args.bankSlug !== undefined && { bankSlug: args.bankSlug }),
        ...(args.status === "active" && !existing.kycCompletedAt && { kycCompletedAt: now }),
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("dedicated_accounts", {
      userId: args.userId,
      email: args.email,
      paystackCustomerCode: args.paystackCustomerCode ?? "",
      paystackCustomerId: args.paystackCustomerId,
      dvaId: args.dvaId,
      accountName: args.accountName ?? "",
      accountNumber: args.accountNumber ?? "",
      bankName: args.bankName ?? "",
      bankSlug: args.bankSlug,
      currency: "NGN",
      status: args.status,
      kycCompletedAt: args.status === "active" ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Record a manual-reconcile attempt timestamp (cooldown gate).
 */
export const touchManualCheck = internalMutation({
  args: { accountId: v.id("dedicated_accounts") },
  handler: async (ctx, { accountId }) => {
    await ctx.db.patch(accountId, { lastManualCheckAt: Date.now() });
  },
});

/**
 * Look up a dedicated account by Paystack customer code (webhook mapping).
 */
export const getByCustomerCode = internalQuery({
  args: { customerCode: v.string() },
  handler: async (ctx, { customerCode }) => {
    return await ctx.db
      .query("dedicated_accounts")
      .withIndex("by_customer_code", (q) => q.eq("paystackCustomerCode", customerCode))
      .first();
  },
});

/**
 * Look up a dedicated account by its NUBAN account number (webhook mapping).
 */
export const getByAccountNumber = internalQuery({
  args: { accountNumber: v.string() },
  handler: async (ctx, { accountNumber }) => {
    return await ctx.db
      .query("dedicated_accounts")
      .withIndex("by_account_number", (q) => q.eq("accountNumber", accountNumber))
      .first();
  },
});

/**
 * Resolve a dedicated account by the customer email we recorded during
 * provisioning. Used by the dedicatedaccount.assign.success webhook, which
 * carries the customer email and is often the first time we learn the
 * customer_code and account number.
 */
export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("dedicated_accounts")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
  },
});
