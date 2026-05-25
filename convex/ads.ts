import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// All supported ad zone IDs
export const AD_ZONES = [
  // Feed
  { zoneId: "feed_top", label: "Feed — Top", description: "Very top of the For You feed, above all content" },
  { zoneId: "feed_between_posts", label: "Feed — Between Posts", description: "Injected every 5 posts within the feed list" },
  { zoneId: "feed_bottom", label: "Feed — Bottom", description: "Below the last post in the feed" },
  // Articles
  { zoneId: "article_top", label: "Article — Top", description: "Above the article title and cover image" },
  { zoneId: "article_mid", label: "Article — Mid", description: "Between the article header and body content" },
  { zoneId: "article_bottom", label: "Article — Bottom", description: "Below the article body, above engagement bar" },
  { zoneId: "article_after_engagement", label: "Article — After Engagement", description: "Below the engagement bar, before related content" },
  // Reels
  { zoneId: "reels_feed_top", label: "Reels — Feed Top", description: "Top of the ReelsScreen before the first reel" },
  { zoneId: "reels_between", label: "Reels — Between", description: "Between reels when swiping (shown during transition)" },
  { zoneId: "reels_overlay_bottom", label: "Reels — Overlay Bottom", description: "Non-intrusive banner at the bottom of a reel" },
  { zoneId: "reels_after_engagement", label: "Reels — After Engagement", description: "Below reel engagement actions" },
  // Learn
  { zoneId: "learn_top", label: "Learn — Top", description: "Top of the Learn screen, above creation buttons" },
  { zoneId: "learn_between_content", label: "Learn — Between Content", description: "Between content cards in the Learn list" },
  { zoneId: "learn_bottom", label: "Learn — Bottom", description: "Bottom of the Learn content list" },
  // Community
  { zoneId: "community_top", label: "Community — Top", description: "Top of the Community/Circles browse view" },
  { zoneId: "community_between_circles", label: "Community — Between Circles", description: "Between circle cards in the browse list" },
  { zoneId: "community_circle_detail_top", label: "Community — Circle Detail Top", description: "Top of an individual circle detail view" },
  // Booking / Events
  { zoneId: "booking_top", label: "Booking — Top", description: "Top of the Booking screen main view" },
  { zoneId: "booking_between_providers", label: "Booking — Between Providers", description: "Between provider cards in the provider list" },
  { zoneId: "events_top", label: "Events — Top", description: "Top of the Events list" },
  { zoneId: "events_between", label: "Events — Between", description: "Between event cards" },
  // Profile
  { zoneId: "profile_top", label: "Profile — Top", description: "Below the profile header, above content tabs" },
  { zoneId: "profile_bottom", label: "Profile — Bottom", description: "Bottom of the profile screen" },
  // Wallet
  { zoneId: "wallet_top", label: "Wallet — Top", description: "Top of the wallet screen, above balance" },
  { zoneId: "wallet_between_transactions", label: "Wallet — Between Transactions", description: "Between transaction history items" },
  { zoneId: "wallet_bottom", label: "Wallet — Bottom", description: "Bottom of the wallet screen" },
  // Notifications
  { zoneId: "notifications_top", label: "Notifications — Top", description: "Top of the notifications list" },
  { zoneId: "notifications_between", label: "Notifications — Between", description: "Between notification items" },
] as const;

export type AdZoneId = typeof AD_ZONES[number]["zoneId"];

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
