/**
 * Migration: Add Default Sub-Circles to Existing Circles
 *
 * For all existing circles that:
 * - Are NOT consultation circles
 * - Are NOT referral circles
 * - Do NOT already have a parentCircleId (i.e. they are top-level)
 * - Do NOT already have default sub-circles
 *
 * Creates "Announcements" and "General" default sub-circles.
 *
 * Run this migration once after deploying the schema changes.
 * Usage: npx convex run migrations/addDefaultSubCircles:migrate
 */

import { internalMutation, mutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

export const migrate = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all top-level circles (not consultation, not referral, no parent)
    const allCircles = await ctx.db
      .query("circles")
      .filter((q) =>
        q.and(
          // Not a sub-circle
          q.or(
            q.eq(q.field("parentCircleId"), undefined),
            q.eq(q.field("parentCircleId"), null)
          ),
          // Not a consultation circle
          q.or(
            q.eq(q.field("isConsultationCircle"), undefined),
            q.eq(q.field("isConsultationCircle"), false)
          ),
          // Not a referral circle
          q.or(
            q.eq(q.field("isReferralCircle"), undefined),
            q.eq(q.field("isReferralCircle"), false)
          )
        )
      )
      .collect();

    let created = 0;
    let skipped = 0;

    for (const circle of allCircles) {
      // Check if this circle already has default sub-circles
      const existingDefaults = await ctx.db
        .query("circles")
        .withIndex("by_parent", (q) => q.eq("parentCircleId", circle._id))
        .filter((q) => q.eq(q.field("isDefault"), true))
        .collect();

      if (existingDefaults.length >= 2) {
        skipped++;
        continue; // Already has defaults
      }

      const now = Date.now();
      const hasAnnouncement = existingDefaults.some(
        (sc) => sc.subCircleType === "ANNOUNCEMENT"
      );
      const hasGeneral = existingDefaults.some(
        (sc) => sc.subCircleType === "GENERAL"
      );

      // Create Announcements if missing
      if (!hasAnnouncement) {
        const announcementsId = await ctx.db.insert("circles", {
          name: "Announcements",
          description: `Announcements for ${circle.name}`,
          creatorId: circle.creatorId,
          type: "PRIVATE",
          accessType: "FREE",
          currentMembers: 0,
          tags: [],
          isActive: circle.isActive,
          postingPermission: "ADMINS_ONLY",
          approvalStatus: "NOT_REQUIRED",
          createdAt: now,
          parentCircleId: circle._id,
          isDefault: true,
          subCircleOrder: 0,
          subCircleType: "ANNOUNCEMENT",
        });

        // Add circle creator as member of Announcements
        await ctx.db.insert("circleMembers", {
          circleId: announcementsId,
          userId: circle.creatorId,
          role: "CREATOR",
          joinedAt: now,
          lastActiveAt: now,
          isActive: true,
        });

        // Also add all existing members of the parent circle
        const parentMembers = await ctx.db
          .query("circleMembers")
          .withIndex("by_circle", (q) => q.eq("circleId", circle._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        for (const member of parentMembers) {
          if (member.userId === circle.creatorId) continue; // Already added
          await ctx.db.insert("circleMembers", {
            circleId: announcementsId,
            userId: member.userId,
            role: "MEMBER",
            joinedAt: now,
            lastActiveAt: now,
            isActive: true,
          });
        }

        // Update member count
        await ctx.db.patch(announcementsId, {
          currentMembers: parentMembers.length,
        });
      }

      // Create General if missing
      if (!hasGeneral) {
        const generalId = await ctx.db.insert("circles", {
          name: "General",
          description: `General discussion for ${circle.name}`,
          creatorId: circle.creatorId,
          type: "PUBLIC",
          accessType: "FREE",
          currentMembers: 0,
          tags: [],
          isActive: circle.isActive,
          postingPermission: "EVERYONE",
          approvalStatus: "NOT_REQUIRED",
          createdAt: now,
          parentCircleId: circle._id,
          isDefault: true,
          subCircleOrder: 1,
          subCircleType: "GENERAL",
        });

        // Add circle creator as member of General
        await ctx.db.insert("circleMembers", {
          circleId: generalId,
          userId: circle.creatorId,
          role: "CREATOR",
          joinedAt: now,
          lastActiveAt: now,
          isActive: true,
        });

        // Also add all existing members of the parent circle
        const parentMembers = await ctx.db
          .query("circleMembers")
          .withIndex("by_circle", (q) => q.eq("circleId", circle._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .collect();

        for (const member of parentMembers) {
          if (member.userId === circle.creatorId) continue; // Already added
          await ctx.db.insert("circleMembers", {
            circleId: generalId,
            userId: member.userId,
            role: "MEMBER",
            joinedAt: now,
            lastActiveAt: now,
            isActive: true,
          });
        }

        // Update member count
        await ctx.db.patch(generalId, {
          currentMembers: parentMembers.length,
        });
      }

      created++;
    }

    return {
      success: true,
      totalCircles: allCircles.length,
      circlesWithNewDefaults: created,
      circlesSkipped: skipped,
    };
  },
});
