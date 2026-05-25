import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const updatePrimaryCurrency = mutation({
  args: {
    primaryCurrency: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Update the primary currency in wallet only
    await ctx.db.patch(wallet._id, {
      primaryCurrency: args.primaryCurrency,
      updatedAt: Date.now()
    });

    return { success: true, primaryCurrency: args.primaryCurrency };
  },
});

// Migration function to ensure wallet has primary currency
export const ensureWalletPrimaryCurrency = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // If wallet doesn't have primaryCurrency, set it to USD
    if (!wallet.primaryCurrency) {
      await ctx.db.patch(wallet._id, {
        primaryCurrency: "USD",
        updatedAt: Date.now()
      });

      return { 
        success: true, 
        updated: true,
        primaryCurrency: "USD"
      };
    }

    return { 
      success: true, 
      updated: false,
      primaryCurrency: wallet.primaryCurrency
    };
  },
});