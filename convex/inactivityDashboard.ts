import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Inactivity summary breaking down providers and users by 90, 180, and 365 days
 */
export const getInactivitySummary = query({
  args: {},
  handler: async (ctx) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) return null;

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    const allTierData = await ctx.db.query("providerTierData").collect();
    const allProfiles = await ctx.db.query("profiles").collect();

    const providerInactivity90: any[] = [];
    const providerInactivity180: any[] = [];
    const providerInactivity365: any[] = [];

    for (const td of allTierData) {
      const daysInactive = Math.floor((now - td.lastActivityAt) / oneDayMs);
      const profile = allProfiles.find((p) => p.userId === td.userId);
      const item = {
        userId: td.userId,
        name: profile?.name || profile?.username || "Provider",
        tier: td.tier,
        prsScore: td.prsScore,
        lastActivityAt: td.lastActivityAt,
        daysInactive,
        riskLevel: daysInactive >= 365 ? "critical" : daysInactive >= 180 ? "warning" : "low",
      };

      if (daysInactive >= 365) providerInactivity365.push(item);
      else if (daysInactive >= 180) providerInactivity180.push(item);
      else if (daysInactive >= 90) providerInactivity90.push(item);
    }

    const userInactivity90: any[] = [];
    const userInactivity180: any[] = [];
    const userInactivity365: any[] = [];

    const providerUserIds = new Set(allTierData.map((t) => t.userId));

    for (const prof of allProfiles) {
      if (providerUserIds.has(prof.userId)) continue;

      const lastActive = prof.updatedAt || prof.createdAt || now;
      const daysInactive = Math.floor((now - lastActive) / oneDayMs);
      const item = {
        userId: prof.userId,
        name: prof.name || prof.username || "User",
        lastActivityAt: lastActive,
        daysInactive,
      };

      if (daysInactive >= 365) userInactivity365.push(item);
      else if (daysInactive >= 180) userInactivity180.push(item);
      else if (daysInactive >= 90) userInactivity90.push(item);
    }

    return {
      providers: {
        inactivity90Days: providerInactivity90,
        inactivity180Days: providerInactivity180,
        inactivity365Days: providerInactivity365,
      },
      users: {
        inactivity90Days: userInactivity90,
        inactivity180Days: userInactivity180,
        inactivity365Days: userInactivity365,
      },
    };
  },
});
