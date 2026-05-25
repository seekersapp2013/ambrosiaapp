import { query } from "../_generated/server"; // ✅ correct
import { v } from "convex/values";

export const getMyWallet = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});
