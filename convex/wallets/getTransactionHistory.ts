import { query } from "../_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getTransactionHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const limit = args.limit || 50;

    // Get transactions where user is sender or recipient
    const sentTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_from_user", (q) => q.eq("fromUserId", userId))
      .order("desc")
      .take(limit);

    const receivedTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_to_user", (q) => q.eq("toUserId", userId))
      .order("desc")
      .take(limit);

    // Combine and sort by creation date
    const allTransactions = [...sentTransactions, ...receivedTransactions]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    // Enrich with user information
    const enrichedTransactions = await Promise.all(
      allTransactions.map(async (transaction) => {
        let fromUser = null;
        let toUser = null;

        if (transaction.fromUserId) {
          const fromProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", transaction.fromUserId!))
            .first();
          fromUser = fromProfile ? { username: fromProfile.username, name: fromProfile.name } : null;
        }

        if (transaction.toUserId) {
          const toProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", transaction.toUserId!))
            .first();
          toUser = toProfile ? { username: toProfile.username, name: toProfile.name } : null;
        }

        return {
          ...transaction,
          fromUser,
          toUser,
          isIncoming: transaction.toUserId === userId,
          isOutgoing: transaction.fromUserId === userId,
        };
      })
    );

    return enrichedTransactions;
  },
});