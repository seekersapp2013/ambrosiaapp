import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

// TODO: When admin role is created, allow admins to set custom revenue splits per user
// Default revenue split: 70% to creator, 30% to platform
const DEFAULT_CREATOR_SHARE = 0.70;
const DEFAULT_PLATFORM_SHARE = 0.30;

// Purchase content using internal wallet transfer with multi-currency support
export const purchaseContent = mutation({
  args: {
    contentType: v.string(), // 'article' | 'reel' | 'course'
    contentId: v.union(v.id("articles"), v.id("reels"), v.id("courses")),
    priceToken: v.string(),
    priceAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify the content exists and is gated
    let content: any = null;
    let contentAuthorId: Id<"users"> | undefined;

    if (args.contentType === 'article') {
      content = await ctx.db
        .query("articles")
        .filter((q) => q.eq(q.field("_id"), args.contentId))
        .first();
      contentAuthorId = content?.authorId;
      
      if (!content || !content.isGated) {
        throw new Error("Content not found or not gated");
      }
    } else if (args.contentType === 'reel') {
      content = await ctx.db
        .query("reels")
        .filter((q) => q.eq(q.field("_id"), args.contentId))
        .first();
      contentAuthorId = content?.authorId;
      
      if (!content || !content.isGated) {
        throw new Error("Content not found or not gated");
      }
    } else if (args.contentType === 'course') {
      content = await ctx.db
        .query("courses")
        .filter((q) => q.eq(q.field("_id"), args.contentId))
        .first();
      contentAuthorId = content?.authorId;
      
      if (!content || !content.isPublished) {
        throw new Error("Course not found or not published");
      }
    } else {
      throw new Error("Invalid content type");
    }

    // Verify payment amount matches content price
    if (args.contentType === 'course') {
      if (content.priceCurrency !== args.priceToken || content.totalPrice !== args.priceAmount) {
        throw new Error("Payment amount mismatch");
      }
    } else {
      if (content.priceToken !== args.priceToken || content.priceAmount !== args.priceAmount) {
        throw new Error("Payment amount mismatch");
      }
    }

    if (!contentAuthorId) {
      throw new Error("Content author not found");
    }

    // Check if already purchased
    const existingPayment = await ctx.db
      .query("payments")
      .withIndex("by_content", (q) => 
        q.eq("contentType", args.contentType).eq("contentId", args.contentId)
      )
      .filter((q) => q.eq(q.field("payerId"), userId))
      .first();

    if (existingPayment) {
      throw new Error("Content already purchased");
    }

    // Check if user is trying to buy their own content
    if (contentAuthorId === userId) {
      throw new Error("Cannot purchase your own content");
    }

    // Get buyer's wallet
    const buyerWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!buyerWallet) {
      throw new Error("Buyer wallet not found");
    }

    // Multi-currency payment logic
    const contentCurrency = args.priceToken;
    const contentPrice = args.priceAmount;

    // Check if buyer has sufficient balance in the content currency
    const buyerBalance = buyerWallet.balances[contentCurrency as keyof typeof buyerWallet.balances];
    
    if (buyerBalance === undefined) {
      throw new Error(`Currency ${contentCurrency} not supported`);
    }

    if (buyerBalance < contentPrice) {
      // TODO: Implement cross-currency conversion using exchange rates
      throw new Error(`Insufficient ${contentCurrency} balance. Required: ${contentPrice}, Available: ${buyerBalance}`);
    }

    // Calculate revenue split (70% creator, 30% platform)
    // TODO: When admin role is implemented, fetch custom split for this creator from admin settings
    const creatorAmount = contentPrice * DEFAULT_CREATOR_SHARE;
    const platformAmount = contentPrice * DEFAULT_PLATFORM_SHARE;

    console.log(`Revenue split for ${contentPrice} ${contentCurrency}: Creator: ${creatorAmount}, Platform: ${platformAmount}`);

    // Get or create seller wallet
    let sellerWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", contentAuthorId))
      .first();

    if (!sellerWallet) {
      const walletId = await ctx.db.insert("wallets", {
        userId: contentAuthorId,
        primaryCurrency: contentCurrency, // Use content currency as default
        phoneCountryDetected: false,
        balances: {
          USD: 0, NGN: 0, GBP: 0, EUR: 0,
          CAD: 0, GHS: 0, KES: 0, GMD: 0, ZAR: 0
        },
        createdAt: Date.now(),
      });
      sellerWallet = await ctx.db.get(walletId);
      if (!sellerWallet) {
        throw new Error("Failed to create seller wallet");
      }
    }

    // Generate unique transaction ID
    const transactionId = `cnt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create transaction record for content purchase (buyer to creator)
    await ctx.db.insert("transactions", {
      id: transactionId,
      fromUserId: userId,
      toUserId: contentAuthorId,
      amount: creatorAmount,
      currency: contentCurrency,
      type: "transfer",
      status: "completed",
      description: `Purchase of ${args.contentType}: ${content.title || content.caption || 'Untitled'}`,
      metadata: {
        contentType: args.contentType,
        contentId: args.contentId,
        platformFee: platformAmount,
        originalAmount: contentPrice,
        revenueSplit: `${DEFAULT_CREATOR_SHARE * 100}% creator, ${DEFAULT_PLATFORM_SHARE * 100}% platform`,
      },
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    // Create platform fee transaction record
    const platformTransactionId = `plf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await ctx.db.insert("transactions", {
      id: platformTransactionId,
      fromUserId: userId,
      toUserId: undefined, // Platform fee has no specific recipient
      amount: platformAmount,
      currency: contentCurrency,
      type: "platform_fee",
      status: "completed",
      description: `Platform fee for ${args.contentType} purchase`,
      metadata: {
        contentType: args.contentType,
        contentId: args.contentId,
        originalTransactionId: transactionId,
      },
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    // Update buyer wallet balance (deduct full amount)
    const newBuyerBalances = {
      ...buyerWallet.balances,
      [contentCurrency]: buyerBalance - contentPrice
    };

    await ctx.db.patch(buyerWallet._id, {
      balances: newBuyerBalances,
      updatedAt: Date.now()
    });

    // Update seller wallet balance (add creator amount only)
    const currentSellerBalance = sellerWallet.balances[contentCurrency as keyof typeof sellerWallet.balances];
    const newSellerBalances = {
      ...sellerWallet.balances,
      [contentCurrency]: currentSellerBalance + creatorAmount
    };

    await ctx.db.patch(sellerWallet._id, {
      balances: newSellerBalances,
      updatedAt: Date.now()
    });

    // Record the payment for access control
    const paymentId = await ctx.db.insert("payments", {
      payerId: userId,
      contentType: args.contentType,
      contentId: args.contentId,
      token: args.priceToken,
      amount: args.priceAmount,
      transactionId,
      createdAt: Date.now(),
    });

    // Send notifications
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
      type: 'CONTENT_PURCHASED',
      recipientUserId: contentAuthorId,
      actorUserId: userId,
      relatedContentType: args.contentType,
      relatedContentId: args.contentId,
      metadata: {
        buyerName: buyerWallet.userId,
        contentType: args.contentType,
        contentTitle: content.title || content.caption || 'Untitled',
        amount: creatorAmount.toString(),
        currency: contentCurrency,
        platformFee: platformAmount.toString(),
      }
    });

    // Auto-enroll in course if purchasing a course
    if (args.contentType === 'course') {
      try {
        // Check if already enrolled
        const existingEnrollment = await ctx.db
          .query("courseEnrollments")
          .withIndex("by_user_course", (q) => 
            q.eq("userId", userId).eq("courseId", args.contentId as Id<"courses">)
          )
          .first();

        if (!existingEnrollment) {
          await ctx.db.insert("courseEnrollments", {
            userId,
            courseId: args.contentId as Id<"courses">,
            enrolledAt: Date.now(),
            progress: 0,
          });

          // Notify course author about enrollment
          await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
            type: 'COURSE_STARTED',
            recipientUserId: contentAuthorId,
            actorUserId: userId,
            relatedContentType: 'course',
            relatedContentId: args.contentId,
          });
        }
      } catch (error) {
        console.error("Failed to auto-enroll in course:", error);
        // Don't fail the payment, just log the error
      }
    }

    // Auto-enroll in courses if purchasing individual content that's part of courses
    if (args.contentType === 'article' || args.contentType === 'reel') {
      try {
        // Find courses containing this content
        const courseContent = await ctx.db
          .query("courseContent")
          .withIndex("by_content", (q) => 
            q.eq("contentType", args.contentType).eq("contentId", args.contentId as Id<"articles"> | Id<"reels">)
          )
          .collect();

        for (const courseItem of courseContent) {
          const course = await ctx.db.get(courseItem.courseId);
          if (!course || !course.isPublished) continue;

          // Check if already enrolled
          const existingEnrollment = await ctx.db
            .query("courseEnrollments")
            .withIndex("by_user_course", (q) => 
              q.eq("userId", userId).eq("courseId", courseItem.courseId)
            )
            .first();

          if (!existingEnrollment) {
            await ctx.db.insert("courseEnrollments", {
              userId,
              courseId: courseItem.courseId,
              enrolledAt: Date.now(),
              progress: 0,
            });

            // Notify course author about enrollment
            await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
              type: 'COURSE_STARTED',
              recipientUserId: course.authorId,
              actorUserId: userId,
              relatedContentType: 'course',
              relatedContentId: courseItem.courseId,
            });
          }

          // Update course progress since user now has access to this content
          await ctx.scheduler.runAfter(0, internal.courseProgress.updateCourseProgress, {
            userId,
            courseId: courseItem.courseId,
          });
        }
      } catch (error) {
        console.error("Failed to auto-enroll in courses from individual content purchase:", error);
        // Don't fail the payment, just log the error
      }
    }

    return {
      success: true,
      paymentId,
      transactionId,
      creatorAmount,
      platformAmount,
      currency: contentCurrency,
    };
  },
});

// Check if user has access to content
export const hasAccess = query({
  args: {
    contentType: v.string(),
    contentId: v.union(v.id("articles"), v.id("reels"), v.id("courses")),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) {
        return false;
      }

      // Check if user is the creator
      if (args.contentType === 'article') {
        const content = await ctx.db
          .query("articles")
          .filter((q) => q.eq(q.field("_id"), args.contentId))
          .first();
        
        if (!content) {
          return false;
        }

        // Free content or user is the author
        if (!content.isGated || content.authorId === userId) {
          return true;
        }
      } else if (args.contentType === 'reel') {
        const content = await ctx.db
          .query("reels")
          .filter((q) => q.eq(q.field("_id"), args.contentId))
          .first();
        
        if (!content) {
          return false;
        }

        // Free content or user is the author
        if (!content.isGated || content.authorId === userId) {
          return true;
        }
      } else if (args.contentType === 'course') {
        const content = await ctx.db
          .query("courses")
          .filter((q) => q.eq(q.field("_id"), args.contentId))
          .first();
        
        if (!content) {
          return false;
        }

        // User is the author
        if (content.authorId === userId) {
          return true;
        }

        // Free course
        if (content.totalPrice === 0) {
          return true;
        }

        // Check if enrolled (for paid courses)
        const enrollment = await ctx.db
          .query("courseEnrollments")
          .withIndex("by_user_course", (q) => 
            q.eq("userId", userId).eq("courseId", args.contentId as Id<"courses">)
          )
          .first();

        if (enrollment) {
          return true;
        }
      }

      // Check if user has purchased access
      const payment = await ctx.db
        .query("payments")
        .withIndex("by_content", (q) => 
          q.eq("contentType", args.contentType).eq("contentId", args.contentId)
        )
        .filter((q) => q.eq(q.field("payerId"), userId))
        .first();

      return !!payment;
    } catch (error) {
      console.error('Error in hasAccess query:', error);
      return false;
    }
  },
});

// Get user's purchase history
export const getUserPurchases = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const purchases = await ctx.db
      .query("payments")
      .withIndex("by_payer", (q) => q.eq("payerId", userId))
      .order("desc")
      .collect();

    // Get content details for each purchase
    const purchasesWithContent = await Promise.all(
      purchases.map(async (purchase) => {
        if (purchase.contentType === 'article') {
          const content = await ctx.db
            .query("articles")
            .filter((q) => q.eq(q.field("_id"), purchase.contentId as any))
            .first();
          if (content) {
            const author = await ctx.db.get(content.authorId);
            const profile = await ctx.db
              .query("profiles")
              .filter((q) => q.eq(q.field("userId"), content.authorId))
              .first();

            return {
              ...purchase,
              content: {
                ...content,
                author: {
                  id: author?._id,
                  name: author?.name || profile?.name,
                  username: profile?.username,
                  avatar: profile?.avatar,
                },
              },
            };
          }
        } else if (purchase.contentType === 'reel') {
          const content = await ctx.db
            .query("reels")
            .filter((q) => q.eq(q.field("_id"), purchase.contentId as any))
            .first();
          if (content) {
            const author = await ctx.db.get(content.authorId);
            const profile = await ctx.db
              .query("profiles")
              .filter((q) => q.eq(q.field("userId"), content.authorId))
              .first();

            return {
              ...purchase,
              content: {
                ...content,
                author: {
                  id: author?._id,
                  name: author?.name || profile?.name,
                  username: profile?.username,
                  avatar: profile?.avatar,
                },
              },
            };
          }
        }
        return null;
      })
    );

    return purchasesWithContent.filter(p => p !== null);
  },
});

// Get creator's earnings
export const getCreatorEarnings = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all payments for content created by this user
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    const contentIds = [
      ...articles.map(a => a._id),
      ...reels.map(r => r._id)
    ];

    const allPayments = [];
    for (const contentId of contentIds) {
      const payments = await ctx.db
        .query("payments")
        .withIndex("by_content", (q) => 
          q.eq("contentType", articles.find(a => a._id === contentId) ? "article" : "reel")
           .eq("contentId", contentId)
        )
        .collect();
      allPayments.push(...payments);
    }

    // Calculate total earnings by token
    const earnings = allPayments.reduce((acc, payment) => {
      if (!acc[payment.token]) {
        acc[payment.token] = 0;
      }
      acc[payment.token] += payment.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalPayments: allPayments.length,
      earnings,
      recentPayments: allPayments
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10),
    };
  },
});

// Create payment intent for ErcasPay
export const createPaymentIntent = mutation({
  args: {
    userId: v.string(),
    amount: v.number(),
    currency: v.string(),
    reference: v.string(),
    paymentReference: v.string(),
    provider: v.string(),
    status: v.string(),
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const paymentIntentId = await ctx.db.insert("paymentIntents", {
      userId: args.userId,
      amount: args.amount,
      currency: args.currency,
      reference: args.reference,
      paymentReference: args.paymentReference,
      provider: args.provider,
      status: args.status,
      customerEmail: args.customerEmail,
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      createdAt: Date.now(),
    });

    return paymentIntentId;
  },
});

// Get payment intent by reference
export const getPaymentIntentByReference = query({
  args: {
    reference: v.string(),
  },
  handler: async (ctx, args) => {
    const paymentIntent = await ctx.db
      .query("paymentIntents")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();

    return paymentIntent;
  },
});

// Update payment status
export const updatePaymentStatus = mutation({
  args: {
    reference: v.string(),
    status: v.string(),
    ercasPayData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const paymentIntent = await ctx.db
      .query("paymentIntents")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();

    if (!paymentIntent) {
      throw new Error("Payment intent not found");
    }

    await ctx.db.patch(paymentIntent._id, {
      status: args.status,
      ercasPayData: args.ercasPayData,
      updatedAt: Date.now(),
    });

    return paymentIntent._id;
  },
});