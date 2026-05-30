import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Read cached bank list from platform_settings
export const getCachedBanks = query({
  args: {},
  handler: async (ctx): Promise<{ name: string; slug: string; code: string }[] | null> => {
    const setting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "paystack_banks_cache"))
      .first();
    if (!setting) return null;
    const { banks, cachedAt } = setting.value as {
      banks: { name: string; slug: string; code: string }[];
      cachedAt: number;
    };
    const TTL = 24 * 60 * 60 * 1000;
    if (Date.now() - cachedAt > TTL) return null;
    return banks;
  },
});

// Write bank list to platform_settings cache
export const cacheBanks = mutation({
  args: {
    banks: v.array(v.object({ name: v.string(), slug: v.string(), code: v.string() })),
  },
  handler: async (ctx, { banks }) => {
    const existing = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "paystack_banks_cache"))
      .first();
    const firstUser = await ctx.db.query("users").first();
    if (!firstUser) return;
    const value = { banks, cachedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("platform_settings", {
        key: "paystack_banks_cache",
        value,
        description: "Cached list of Nigerian banks from Paystack API",
        updatedBy: firstUser._id,
        updatedAt: Date.now(),
      });
    }
  },
});
