import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { AD_ZONES } from "../constants/adZones";

export { AD_ZONES } from "../constants/adZones";
export type { AdZoneId } from "../constants/adZones";

// ─── Queries ────────────────────────────────────────────────────────────────

/** Returns all enabled placements. Used by AdSlot component. */
export const getActivePlacements = query({
  args: {},
  handler: async (ctx) => {
    // Ads are disabled by default — require explicit admin setup to serve any ads
    const settings = await ctx.db.query("adSettings").first();
    if (!settings || !settings.adsGloballyEnabled) return [];

    return ctx.db
      .query("adPlacements")
      .withIndex("by_enabled", (q) => q.eq("isEnabled", true))
      .collect();
  },
});

/** Returns all placements (enabled or not) for the admin panel. */
export const getAllPlacements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return ctx.db.query("adPlacements").collect();
  },
});

/** Returns the global ad settings. */
export const getAdSettings = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db.query("adSettings").first();
  },
});

// ─── Mutations ───────────────────────────────────────────────────────────────

/** Create or update a placement zone. Admin only. */
export const upsertPlacement = mutation({
  args: {
    zoneId: v.string(),
    label: v.string(),
    description: v.string(),
    publisherId: v.string(),
    adSlotId: v.string(),
    isEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("adPlacements")
      .withIndex("by_zone", (q) => q.eq("zoneId", args.zoneId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        label: args.label,
        description: args.description,
        publisherId: args.publisherId,
        adSlotId: args.adSlotId,
        isEnabled: args.isEnabled,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return ctx.db.insert("adPlacements", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/** Toggle a placement zone on or off. Admin only. */
export const togglePlacement = mutation({
  args: { zoneId: v.string(), isEnabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("adPlacements")
      .withIndex("by_zone", (q) => q.eq("zoneId", args.zoneId))
      .first();

    if (!existing) throw new Error(`Zone "${args.zoneId}" not found`);

    await ctx.db.patch(existing._id, {
      isEnabled: args.isEnabled,
      updatedAt: Date.now(),
    });
  },
});

/** Set the global ads kill-switch. Admin only. */
export const setGlobalAdsEnabled = mutation({
  args: { enabled: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.query("adSettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        adsGloballyEnabled: args.enabled,
        updatedBy: userId,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("adSettings", {
        adsGloballyEnabled: args.enabled,
        updatedBy: userId,
        updatedAt: Date.now(),
        createdAt: Date.now(),
      });
    }
  },
});
