import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Create expert request
export const createExpertRequest = mutation({
  args: {
    circleId: v.id("circles"),
    title: v.string(),
    description: v.string(),
    agreedAmount: v.number(),
    agreedCurrency: v.string(),
    duration: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is circle creator or admin
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || (membership.role !== "CREATOR" && membership.role !== "ADMIN")) {
      throw new Error("Only circle creators or admins can create expert requests");
    }

    // Check if expert requests require approval
    const settings = await ctx.db.query("moderationSettings").first();
    const requiresApproval = settings?.expertRequestsRequireApproval ?? false;

    const now = Date.now();

    const requestId = await ctx.db.insert("expertRequests", {
      circleId: args.circleId,
      requesterId: userId,
      title: args.title.trim(),
      description: args.description.trim(),
      agreedAmount: args.agreedAmount,
      agreedCurrency: args.agreedCurrency,
      duration: args.duration,
      status: requiresApproval ? "PENDING" : "OPEN",
      tags: args.tags || [],
      approvalStatus: requiresApproval ? "PENDING" : "NOT_REQUIRED",
      approvalRequestedAt: requiresApproval ? now : undefined,
      createdAt: now,
    });

    // If approval is required, create approval record
    if (requiresApproval) {
      await ctx.db.insert("contentApprovals", {
        contentType: "expertRequests",
        contentId: requestId,
        status: "PENDING",
        submittedBy: userId,
        createdAt: now,
      });
    }

    return { requestId, requiresApproval };
  },
});

// Get expert requests for a circle
export const getCircleExpertRequests = query({
  args: {
    circleId: v.id("circles"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You must be a member to view expert requests");
    }

    let query = ctx.db
      .query("expertRequests")
      .withIndex("by_circle", (q) => q.eq("circleId", args.circleId));

    const requests = await query.collect();

    // Filter by status if provided
    const filteredRequests = args.status
      ? requests.filter(r => r.status === args.status)
      : requests;

    // Get requester profiles and application counts
    const requestsWithDetails = await Promise.all(
      filteredRequests.map(async (request) => {
        const requesterProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", request.requesterId))
          .first();

        const applications = await ctx.db
          .query("expertApplications")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .collect();

        const selectedExpert = request.selectedExpertId
          ? await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", request.selectedExpertId!))
              .first()
          : null;

        return {
          ...request,
          requester: {
            id: request.requesterId,
            name: requesterProfile?.name,
            username: requesterProfile?.username,
            avatar: requesterProfile?.avatar,
          },
          applicationCount: applications.length,
          selectedExpert: selectedExpert ? {
            id: request.selectedExpertId,
            name: selectedExpert.name,
            username: selectedExpert.username,
            avatar: selectedExpert.avatar,
          } : null,
        };
      })
    );

    return requestsWithDetails;
  },
});

// Apply to expert request
export const applyToExpertRequest = mutation({
  args: {
    requestId: v.id("expertRequests"),
    coverLetter: v.string(),
    proposedAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Expert request not found");
    }

    if (request.status !== "OPEN") {
      throw new Error("This request is no longer accepting applications");
    }

    // Check if user is a member of the circle
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", request.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You must be a member of the circle to apply");
    }

    // Check if already applied
    const existingApplication = await ctx.db
      .query("expertApplications")
      .withIndex("by_request_expert", (q) => 
        q.eq("requestId", args.requestId).eq("expertId", userId)
      )
      .first();

    if (existingApplication) {
      throw new Error("You have already applied to this request");
    }

    const applicationId = await ctx.db.insert("expertApplications", {
      requestId: args.requestId,
      expertId: userId,
      coverLetter: args.coverLetter.trim(),
      proposedAmount: args.proposedAmount,
      status: "PENDING",
      createdAt: Date.now(),
    });

    return { applicationId };
  },
});

// Get applications for a request
export const getRequestApplications = query({
  args: {
    requestId: v.id("expertRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Expert request not found");
    }

    // Check if user is the requester
    if (request.requesterId !== userId) {
      throw new Error("Only the requester can view applications");
    }

    const applications = await ctx.db
      .query("expertApplications")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();

    // Get expert profiles
    const applicationsWithProfiles = await Promise.all(
      applications.map(async (application) => {
        const expertProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", application.expertId))
          .first();

        return {
          ...application,
          expert: {
            id: application.expertId,
            name: expertProfile?.name,
            username: expertProfile?.username,
            avatar: expertProfile?.avatar,
            bio: expertProfile?.bio,
          },
        };
      })
    );

    return applicationsWithProfiles;
  },
});

// Accept expert application
export const acceptExpertApplication = mutation({
  args: {
    applicationId: v.id("expertApplications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const request = await ctx.db.get(application.requestId);
    if (!request) {
      throw new Error("Expert request not found");
    }

    // Check if user is the requester
    if (request.requesterId !== userId) {
      throw new Error("Only the requester can accept applications");
    }

    if (request.status !== "OPEN") {
      throw new Error("This request is no longer accepting applications");
    }

    // Get requester's wallet
    const requesterWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!requesterWallet) {
      throw new Error("Wallet not found. Please create a wallet first.");
    }

    // Check if requester has sufficient balance in the agreed currency
    const currencyBalance = requesterWallet.balances[request.agreedCurrency as keyof typeof requesterWallet.balances];
    
    if (currencyBalance === undefined) {
      throw new Error(`Currency ${request.agreedCurrency} not supported`);
    }

    if (currencyBalance < request.agreedAmount) {
      throw new Error(
        `Insufficient balance. You have ${currencyBalance} ${request.agreedCurrency} but need ${request.agreedAmount} ${request.agreedCurrency}`
      );
    }

    const now = Date.now();

    // Deduct funds from requester's wallet and move to escrow
    const newBalance = currencyBalance - request.agreedAmount;
    await ctx.db.patch(requesterWallet._id, {
      balances: {
        ...requesterWallet.balances,
        [request.agreedCurrency]: newBalance,
      },
      updatedAt: now,
    });

    // Create escrow transaction
    const escrowTxId = await ctx.db.insert("transactions", {
      id: `escrow-${request._id}-${now}`,
      fromUserId: userId,
      toUserId: application.expertId,
      amount: request.agreedAmount,
      currency: request.agreedCurrency,
      type: "transfer",
      status: "pending", // Held in escrow
      description: `Escrow for expert request: ${request.title}`,
      metadata: {
        requestId: request._id,
        applicationId: args.applicationId,
        escrowType: "expert_request",
        releaseCondition: "completion",
      },
      createdAt: now,
    });

    // Update application status
    await ctx.db.patch(args.applicationId, {
      status: "ACCEPTED",
    });

    // Update request with selected expert and escrow info
    await ctx.db.patch(application.requestId, {
      selectedExpertId: application.expertId,
      status: "IN_PROGRESS",
      escrowTxId: escrowTxId.toString(),
      updatedAt: now,
    });

    // Reject other applications
    const otherApplications = await ctx.db
      .query("expertApplications")
      .withIndex("by_request", (q) => q.eq("requestId", application.requestId))
      .collect();

    await Promise.all(
      otherApplications
        .filter(app => app._id !== args.applicationId && app.status === "PENDING")
        .map(app => ctx.db.patch(app._id, { status: "REJECTED" }))
    );

    return { 
      success: true,
      escrowTxId: escrowTxId.toString(),
      amountEscrowed: request.agreedAmount,
      currency: request.agreedCurrency,
    };
  },
});

// Reject expert application
export const rejectExpertApplication = mutation({
  args: {
    applicationId: v.id("expertApplications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const request = await ctx.db.get(application.requestId);
    if (!request) {
      throw new Error("Expert request not found");
    }

    // Check if user is the requester
    if (request.requesterId !== userId) {
      throw new Error("Only the requester can reject applications");
    }

    if (application.status !== "PENDING") {
      throw new Error("This application has already been processed");
    }

    // Update application status
    await ctx.db.patch(args.applicationId, {
      status: "REJECTED",
    });

    return { success: true };
  },
});

// Complete expert request
export const completeExpertRequest = mutation({
  args: {
    requestId: v.id("expertRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Expert request not found");
    }

    // Check if user is the requester
    if (request.requesterId !== userId) {
      throw new Error("Only the requester can complete the request");
    }

    if (request.status !== "IN_PROGRESS") {
      throw new Error("Request must be in progress to complete");
    }

    if (!request.selectedExpertId) {
      throw new Error("No expert selected for this request");
    }

    if (!request.escrowTxId) {
      throw new Error("No escrow transaction found");
    }

    // Find the escrow transaction
    const escrowTransaction = await ctx.db
      .query("transactions")
      .filter((q) => q.eq(q.field("id"), request.escrowTxId))
      .first();

    if (!escrowTransaction) {
      throw new Error("Escrow transaction not found");
    }

    if (escrowTransaction.status !== "pending") {
      throw new Error("Escrow transaction is not in pending state");
    }

    // Get expert's wallet
    let expertWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", request.selectedExpertId!))
      .first();

    if (!expertWallet) {
      // Create wallet for expert if it doesn't exist
      const walletId = await ctx.db.insert("wallets", {
        userId: request.selectedExpertId,
        primaryCurrency: "USD",
        phoneCountryDetected: false,
        balances: {
          USD: 0, NGN: 0, GBP: 0, EUR: 0,
          CAD: 0, GHS: 0, KES: 0, GMD: 0, ZAR: 0
        },
        createdAt: Date.now(),
      });
      expertWallet = await ctx.db.get(walletId);
      if (!expertWallet) {
        throw new Error("Failed to create expert wallet");
      }
    }

    const now = Date.now();

    // Add funds to expert's wallet
    const newExpertBalances = { ...expertWallet.balances };
    newExpertBalances[request.agreedCurrency as keyof typeof newExpertBalances] += request.agreedAmount;
    await ctx.db.patch(expertWallet._id, {
      balances: newExpertBalances,
      updatedAt: now,
    });

    // Update escrow transaction status to completed
    await ctx.db.patch(escrowTransaction._id, {
      status: "completed",
      completedAt: now,
    });

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "COMPLETED",
      completedAt: now,
      updatedAt: now,
    });

    return { 
      success: true,
      amountReleased: request.agreedAmount,
      currency: request.agreedCurrency,
    };
  },
});

// Get all open expert requests (for experts to browse)
export const getAllOpenExpertRequests = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const limit = args.limit || 20;
    const offset = args.offset || 0;

    // Get all open expert requests
    const allRequests = await ctx.db
      .query("expertRequests")
      .withIndex("by_status", (q) => q.eq("status", "OPEN"))
      .order("desc")
      .collect();

    const requests = allRequests.slice(offset, offset + limit);

    // Get requester profiles, circle info, and check if user already applied
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const requesterProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", request.requesterId))
          .first();

        const circle = await ctx.db.get(request.circleId);

        const applications = await ctx.db
          .query("expertApplications")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .collect();

        // Check if current user already applied
        const userApplication = applications.find(app => app.expertId === userId);

        return {
          ...request,
          requester: {
            id: request.requesterId,
            name: requesterProfile?.name,
            username: requesterProfile?.username,
            avatar: requesterProfile?.avatar,
          },
          circle: {
            id: request.circleId,
            name: circle?.name,
            type: circle?.type,
          },
          applicationCount: applications.length,
          userHasApplied: !!userApplication,
          userApplicationStatus: userApplication?.status,
        };
      })
    );

    return {
      requests: requestsWithDetails,
      hasMore: offset + limit < allRequests.length,
      total: allRequests.length,
    };
  },
});

// Cancel expert request
export const cancelExpertRequest = mutation({
  args: {
    requestId: v.id("expertRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Expert request not found");
    }

    // Check if user is the requester
    if (request.requesterId !== userId) {
      throw new Error("Only the requester can cancel the request");
    }

    if (request.status === "COMPLETED") {
      throw new Error("Cannot cancel a completed request");
    }

    const now = Date.now();
    let refundAmount = 0;
    let refundCurrency = "";

    // If request is in progress, return funds from escrow to requester
    if (request.status === "IN_PROGRESS" && request.escrowTxId) {
      // Find the escrow transaction
      const escrowTransaction = await ctx.db
        .query("transactions")
        .filter((q) => q.eq(q.field("id"), request.escrowTxId))
        .first();

      if (escrowTransaction && escrowTransaction.status === "pending") {
        // Get requester's wallet
        const requesterWallet = await ctx.db
          .query("wallets")
          .withIndex("userId", (q) => q.eq("userId", userId))
          .first();

        if (!requesterWallet) {
          throw new Error("Requester wallet not found");
        }

        // Return funds to requester
        const newRequesterBalances = { ...requesterWallet.balances };
        newRequesterBalances[request.agreedCurrency as keyof typeof newRequesterBalances] += request.agreedAmount;
        await ctx.db.patch(requesterWallet._id, {
          balances: newRequesterBalances,
          updatedAt: now,
        });

        // Update escrow transaction status to cancelled
        await ctx.db.patch(escrowTransaction._id, {
          status: "failed",
          completedAt: now,
        });

        refundAmount = request.agreedAmount;
        refundCurrency = request.agreedCurrency;
      }
    }

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "CANCELLED",
      updatedAt: now,
    });

    return { 
      success: true,
      refunded: refundAmount > 0,
      refundAmount,
      refundCurrency,
    };
  },
});
