import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Nightly cron mutation to scan approved professional licences for expirations
 * and create pending downgrade entries for admin manual investigation & confirmation.
 */
export const validateProviderLicences = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Query all approved professional licences
    const licences = await ctx.db
      .query("verificationDocuments")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .filter((q) => q.eq(q.field("documentType"), "professional_license"))
      .collect();

    let flaggedCount = 0;

    for (const doc of licences) {
      // Check if licence has expired and has not already been flagged
      if (doc.expiryDate && doc.expiryDate < now && !doc.isExpired) {
        // Mark document as expired
        await ctx.db.patch(doc._id, {
          isExpired: true,
        });

        // Get provider's tier data
        const tierData = await ctx.db
          .query("providerTierData")
          .withIndex("by_userId", (q) => q.eq("userId", doc.userId))
          .first();

        if (tierData) {
          const currentTier = tierData.tier;

          // Create pending audit log entry for admin review
          const expiryDateFormatted = new Date(doc.expiryDate).toLocaleDateString();
          await ctx.db.insert("tierAuditLog", {
            userId: doc.userId,
            previousTier: currentTier,
            newTier: "sapphire", // Suggested downgrade baseline if unverified
            previousPrs: tierData.prsScore,
            newPrs: Math.max(0, tierData.prsScore - 20),
            reason: `Professional licence expired on ${expiryDateFormatted}. Awaiting admin offline verification.`,
            triggeredBy: "manual_review",
            pendingDowngrade: true,
            timestamp: now,
          });

          flaggedCount++;
        }
      }
    }

    return { success: true, flaggedCount, timestamp: now };
  },
});

/**
 * Admin Query: Get all pending tier revalidation audit entries
 */
export const getPendingRevalidations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const pendingAudits = await ctx.db
      .query("tierAuditLog")
      .withIndex("by_pendingDowngrade", (q) => q.eq("pendingDowngrade", true))
      .collect();

    // Join each entry with profile info for provider name
    const enriched = await Promise.all(
      pendingAudits.map(async (audit) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", audit.userId))
          .first();

        return {
          ...audit,
          providerName: profile?.name || "Unknown Provider",
          providerUsername: profile?.username || "unknown",
        };
      })
    );

    return enriched;
  },
});

/**
 * Admin Mutation: Confirm or reject a pending tier downgrade after offline verification
 */
export const resolveRevalidation = mutation({
  args: {
    auditLogId: v.id("tierAuditLog"),
    action: v.union(v.literal("confirm"), v.literal("reject")),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) throw new Error("Not authenticated");

    const auditEntry = await ctx.db.get(args.auditLogId);
    if (!auditEntry) throw new Error("Audit log entry not found");
    if (!auditEntry.pendingDowngrade) throw new Error("This entry is not pending review");

    const now = Date.now();

    if (args.action === "confirm") {
      // Downgrade provider tier
      const tierData = await ctx.db
        .query("providerTierData")
        .withIndex("by_userId", (q) => q.eq("userId", auditEntry.userId))
        .first();

      if (tierData) {
        await ctx.db.patch(tierData._id, {
          tier: auditEntry.newTier as any,
          prsScore: auditEntry.newPrs,
          updatedAt: now,
        });
      }

      // Mark audit entry resolved
      await ctx.db.patch(auditEntry._id, {
        pendingDowngrade: false,
        resolvedAt: now,
        resolvedBy: adminId,
        adminComment: args.comment || "Admin confirmed downgrade following offline licence investigation.",
      });

      // Send notification to provider
      await ctx.db.insert("notifications", {
        userId: auditEntry.userId,
        type: "TIER_DEMOTION",
        title: "Tier Status Update",
        message: `Your tier status has been updated to ${auditEntry.newTier.toUpperCase()} following licence status review.`,
        isRead: false,
        category: "system",
        priority: "high",
        createdAt: now,
      });
    } else {
      // Admin rejected downgrade (e.g. licence was renewed offline)
      await ctx.db.patch(auditEntry._id, {
        pendingDowngrade: false,
        resolvedAt: now,
        resolvedBy: adminId,
        adminComment: args.comment || "Admin rejected downgrade. Licence verified valid offline.",
      });
    }

    return { success: true, action: args.action };
  },
});

/**
 * Admin Query: Get all tier audit logs with optional pagination
 */
export const getAllTierAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const maxItems = args.limit || 100;
    const logs = await ctx.db
      .query("tierAuditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(maxItems);

    const enriched = await Promise.all(
      logs.map(async (audit) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", audit.userId))
          .first();

        return {
          ...audit,
          providerName: profile?.name || "Unknown Provider",
          providerUsername: profile?.username || "unknown",
        };
      })
    );

    return enriched;
  },
});
