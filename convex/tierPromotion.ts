import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Reusable internal mutation called after EXP awards or engagement events
 * to evaluate and trigger real-time tier promotions.
 */
export const maybePromoteTier = internalMutation({
  args: {
    userId: v.id("users"),
    trigger: v.string(),
  },
  handler: async (ctx, args) => {
    // Read platform tier_config settings
    const configSetting = await ctx.db
      .query("platform_settings")
      .withIndex("by_key", (q) => q.eq("key", "tier_config"))
      .first();

    const config = configSetting?.value || { autoPromoteOnExpAward: true };

    if (!config.autoPromoteOnExpAward) {
      return { skipped: true, reason: "Auto-promotion disabled in configuration" };
    }

    // Schedule immediate PRS recalculation
    await ctx.scheduler.runAfter(0, (internal as any).tierCalculation.internalRecalculateProviderPRS, {
      userId: args.userId,
      reason: `Auto-promotion check: ${args.trigger}`,
    });

    return { scheduled: true, trigger: args.trigger };
  },
});
