import { mutation } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createWallet = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if wallet already exists
    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (existingWallet) {
      return existingWallet;
    }

    // Create new wallet with 0 balance for all currencies
    const walletId = await ctx.db.insert("wallets", {
      userId,
      primaryCurrency: "USD", // Default primary currency
      phoneCountryDetected: false, // Will be updated when user completes profile
      balances: {
        USD: 0,
        NGN: 0,
        GBP: 0,
        EUR: 0,
        CAD: 0,
        GHS: 0,
        KES: 0,
        GMD: 0,
        ZAR: 0
      },
      createdAt: Date.now(),
    });

    return await ctx.db.get(walletId);
  },
});