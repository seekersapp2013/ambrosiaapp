import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Submit or update a verification document
 */
export const submitDocument = mutation({
  args: {
    documentType: v.union(
      v.literal("professional_license"),
      v.literal("registration_council"),
      v.literal("employer_verification"),
      v.literal("hospital_verification"),
      v.literal("association_membership"),
      v.literal("identity")
    ),
    documentUrl: v.string(), // Storage ID or URL
    documentName: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Check if provider already submitted a document of this type
    const existing = await ctx.db
      .query("verificationDocuments")
      .withIndex("by_userId_type", (q) =>
        q.eq("userId", userId).eq("documentType", args.documentType)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        documentUrl: args.documentUrl,
        documentName: args.documentName,
        status: "pending",
        submittedAt: now,
        reviewedAt: undefined,
        reviewedBy: undefined,
        notes: undefined,
        rejectionReason: undefined,
      });
      return { documentId: existing._id, action: "updated" };
    }

    const docId = await ctx.db.insert("verificationDocuments", {
      userId,
      documentType: args.documentType,
      documentUrl: args.documentUrl,
      documentName: args.documentName,
      status: "pending",
      submittedAt: now,
    });

    return { documentId: docId, action: "created" };
  },
});

/**
 * Query documents submitted by current user
 */
export const getMyDocuments = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("verificationDocuments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

/**
 * Get aggregated verification status summary for provider
 */
export const getMyVerificationStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isVerified: false, approvedCount: 0, pendingCount: 0, requiredTypes: [] };
    }

    const docs = await ctx.db
      .query("verificationDocuments")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const requiredTypes = [
      "professional_license",
      "registration_council",
      "identity",
    ];

    const approvedDocs = docs.filter((d) => d.status === "approved");
    const pendingDocs = docs.filter((d) => d.status === "pending");

    const hasLicenseVerified = approvedDocs.some(
      (d) => d.documentType === "professional_license"
    );

    return {
      isVerified: hasLicenseVerified,
      approvedCount: approvedDocs.length,
      pendingCount: pendingDocs.length,
      totalSubmitted: docs.length,
      documents: docs,
    };
  },
});

/**
 * Admin action: approve or reject a submitted verification document
 */
export const reviewDocument = mutation({
  args: {
    documentId: v.id("verificationDocuments"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
    notes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new Error("Document not found");

    const now = Date.now();

    await ctx.db.patch(args.documentId, {
      status: args.status,
      notes: args.notes,
      rejectionReason: args.rejectionReason,
      reviewedAt: now,
      reviewedBy: adminUserId,
    });

    // Notify provider
    await ctx.db.insert("notifications", {
      userId: doc.userId,
      type: args.status === "approved" ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
      title: args.status === "approved" ? "Document Approved!" : "Document Review Update",
      message:
        args.status === "approved"
          ? `Your ${doc.documentType.replace("_", " ")} document has been verified!`
          : `Your ${doc.documentType.replace("_", " ")} document was not approved. ${args.rejectionReason || ""}`,
      isRead: false,
      category: "system",
      priority: "medium",
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Admin query: pending documents queue
 */
export const getPendingDocuments = query({
  args: {},
  handler: async (ctx) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) return [];

    const pending = await ctx.db
      .query("verificationDocuments")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    const hydrated = await Promise.all(
      pending.map(async (d) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", d.userId))
          .first();
        return {
          ...d,
          providerName: profile?.name || profile?.username || "Unknown Provider",
        };
      })
    );

    return hydrated;
  },
});
