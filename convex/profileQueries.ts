import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Get user by ID (internal query for ErcasPay integration)
export const getUserById = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    return {
      ...user,
      username: profile?.username,
      name: profile?.name,
      phoneNumber: profile?.phoneNumber,
    };
  },
});