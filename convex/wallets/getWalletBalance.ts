import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getWalletBalance = query({
  args: {
    currency: v.optional(v.string()), // "USD" or "NGN"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) {
      return { 
        balances: {
          USD: 0, NGN: 0, GBP: 0, EUR: 0, CAD: 0,
          GHS: 0, KES: 0, GMD: 0, ZAR: 0
        },
        primaryCurrency: "USD",
        currency: args.currency || "USD"
      };
    }

    return { 
      balances: wallet.balances,
      primaryCurrency: wallet.primaryCurrency,
      currency: args.currency || wallet.primaryCurrency
    };
  },
});

export const getMyWallet = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();
  },
});