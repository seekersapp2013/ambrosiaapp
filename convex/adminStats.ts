/**
 * adminStats — Platform-level analytics for the admin dashboard.
 * Bird's eye view: total users, active users, creators, providers.
 */

import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Total registered users
    const allUsers = await ctx.db.query("users").collect();
    const totalUsers = allUsers.length;

    // Active users (logged in within last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const activeUsers = allUsers.filter(
      (u: any) => u.lastLoginAt && u.lastLoginAt > sevenDaysAgo
    ).length;

    // Total profiles (completed signups)
    const allProfiles = await ctx.db.query("profiles").collect();
    const totalProfiles = allProfiles.length;

    // Creators — users who have published at least one article or reel
    const articles = await ctx.db.query("articles").collect();
    const reels = await ctx.db.query("reels").collect();
    const creatorIds = new Set<string>();
    for (const a of articles) creatorIds.add(a.authorId);
    for (const r of reels) creatorIds.add(r.authorId);
    const totalCreators = creatorIds.size;

    // Providers (active booking subscribers)
    const allSubscribers = await ctx.db.query("bookingSubscribers").collect();
    const totalProviders = allSubscribers.filter((s: any) => s.isActive).length;

    // Circles
    const allCircles = await ctx.db.query("circles").collect();
    const totalCircles = allCircles.filter((c: any) => c.isActive).length;

    return {
      totalUsers,
      activeUsers,
      totalProfiles,
      totalCreators,
      totalProviders,
      totalCircles,
    };
  },
});
