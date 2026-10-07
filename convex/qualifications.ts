import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Add a new qualification (degree, certification, fellowship, etc.)
 */
export const addQualification = mutation({
  args: {
    category: v.union(
      v.literal("basic_degree"),
      v.literal("additional_certification"),
      v.literal("fellowship"),
      v.literal("residency"),
      v.literal("consultant_status"),
      v.literal("masters"),
      v.literal("doctorate")
    ),
    name: v.string(),
    institution: v.optional(v.string()),
    yearObtained: v.optional(v.number()),
    documentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (!args.name.trim()) {
      throw new Error("Qualification name is required");
    }

    const now = Date.now();

    // Determine default base points based on category
    const pointValues: Record<string, number> = {
      basic_degree: 10,
      additional_certification: 3,
      fellowship: 8,
      residency: 10,
      consultant_status: 12,
      masters: 6,
      doctorate: 10,
    };

    const points = pointValues[args.category] || 5;

    const id = await ctx.db.insert("providerQualifications", {
      userId,
      category: args.category,
      name: args.name.trim(),
      institution: args.institution?.trim(),
      yearObtained: args.yearObtained,
      documentUrl: args.documentUrl,
      isVerified: false,
      points,
      createdAt: now,
    });

    return { qualificationId: id };
  },
});

/**
 * Get qualifications belonging to current authenticated provider
 */
export const getMyQualifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("providerQualifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Update an existing qualification
 */
export const updateQualification = mutation({
  args: {
    qualificationId: v.id("providerQualifications"),
    name: v.optional(v.string()),
    institution: v.optional(v.string()),
    yearObtained: v.optional(v.number()),
    documentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const qual = await ctx.db.get(args.qualificationId);
    if (!qual) throw new Error("Qualification not found");

    if (qual.userId !== userId) {
      throw new Error("Not authorized to update this qualification");
    }

    const updates: Partial<typeof qual> = {};
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.institution !== undefined) updates.institution = args.institution.trim();
    if (args.yearObtained !== undefined) updates.yearObtained = args.yearObtained;
    if (args.documentUrl !== undefined) updates.documentUrl = args.documentUrl;

    // Reset verification if document or core detail changes
    if (args.documentUrl !== undefined || args.name !== undefined) {
      updates.isVerified = false;
      updates.verifiedAt = undefined;
      updates.verifiedBy = undefined;
    }

    await ctx.db.patch(args.qualificationId, updates);
    return { success: true };
  },
});

/**
 * Remove a qualification
 */
export const removeQualification = mutation({
  args: {
    qualificationId: v.id("providerQualifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const qual = await ctx.db.get(args.qualificationId);
    if (!qual) throw new Error("Qualification not found");

    if (qual.userId !== userId) {
      throw new Error("Not authorized to delete this qualification");
    }

    await ctx.db.delete(args.qualificationId);
    return { success: true };
  },
});

/**
 * Admin action: verify or reject a qualification
 */
export const verifyQualification = mutation({
  args: {
    qualificationId: v.id("providerQualifications"),
    isVerified: v.boolean(),
    customPoints: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const qual = await ctx.db.get(args.qualificationId);
    if (!qual) throw new Error("Qualification not found");

    const now = Date.now();

    await ctx.db.patch(args.qualificationId, {
      isVerified: args.isVerified,
      verifiedAt: args.isVerified ? now : undefined,
      verifiedBy: args.isVerified ? adminUserId : undefined,
      points: args.customPoints !== undefined ? args.customPoints : qual.points,
    });

    return { success: true };
  },
});

/**
 * Admin query: list unverified qualifications
 */
export const getUnverifiedQualifications = query({
  args: {},
  handler: async (ctx) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) return [];

    const unverified = await ctx.db
      .query("providerQualifications")
      .withIndex("by_verified", (q) => q.eq("isVerified", false))
      .collect();

    // Hydrate with user profile info
    const hydrated = await Promise.all(
      unverified.map(async (q) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (query) => query.eq("userId", q.userId))
          .first();
        return {
          ...q,
          providerName: profile?.name || profile?.username || "Unknown Provider",
        };
      })
    );

    return hydrated;
  },
});
