/**
 * bookingPayment.ts
 *
 * Dedicated booking payment mutation.
 * Atomically debits the client's wallet and returns a transaction ID
 * that is then passed as `paymentTxHash` to `createBooking`.
 *
 * This separates concerns cleanly:
 *   1. bookingPayment.payForBooking  → wallet debit + transaction record
 *   2. bookings.createBooking        → booking record with paymentTxHash
 *   3. livekit.generateAccessToken   → access granted on CONFIRMED status
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const payForBooking = mutation({
  args: {
    providerId: v.id("users"),
    amount: v.number(),
    currency: v.string(),
    sessionDate: v.string(),
    sessionTime: v.string(),
    duration: v.number(),
    sessionType: v.string(), // "ONE_ON_ONE" | "ONE_TO_MANY"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.amount <= 0) throw new Error("Amount must be greater than 0");
    if (userId === args.providerId) throw new Error("Cannot book yourself");

    // ── Get client wallet ────────────────────────────────────────────────────
    const clientWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!clientWallet) throw new Error("Wallet not found. Please fund your wallet first.");

    const clientBalance =
      clientWallet.balances[args.currency as keyof typeof clientWallet.balances];

    if (clientBalance === undefined) {
      throw new Error(`Currency ${args.currency} is not supported`);
    }

    if (clientBalance < args.amount) {
      throw new Error(
        `Insufficient balance. You have ${clientBalance.toFixed(2)} ${args.currency} but need ${args.amount.toFixed(2)} ${args.currency}. Please fund your wallet.`
      );
    }

    // ── Get or create provider wallet ────────────────────────────────────────
    let providerWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", args.providerId))
      .first();

    if (!providerWallet) {
      const walletId = await ctx.db.insert("wallets", {
        userId: args.providerId,
        primaryCurrency: args.currency,
        phoneCountryDetected: false,
        balances: {
          USD: 0, NGN: 0, GBP: 0, EUR: 0,
          CAD: 0, GHS: 0, KES: 0, GMD: 0, ZAR: 0,
        },
        createdAt: Date.now(),
      });
      providerWallet = await ctx.db.get(walletId);
      if (!providerWallet) throw new Error("Failed to create provider wallet");
    }

    const now = Date.now();
    const transactionId = `bkp_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // ── Debit client wallet ───────────────────────────────────────────────────
    const newClientBalances = { ...clientWallet.balances };
    (newClientBalances as any)[args.currency] = clientBalance - args.amount;

    await ctx.db.patch(clientWallet._id, {
      balances: newClientBalances,
      updatedAt: now,
    });

    // ── Credit provider wallet (held in escrow until session completes) ───────
    // Provider wallet is credited immediately — on session completion the
    // provider retains funds; on cancellation the client is refunded.
    const providerBalance =
      providerWallet.balances[args.currency as keyof typeof providerWallet.balances] ?? 0;
    const newProviderBalances = { ...providerWallet.balances };
    (newProviderBalances as any)[args.currency] = providerBalance + args.amount;

    await ctx.db.patch(providerWallet._id, {
      balances: newProviderBalances,
      updatedAt: now,
    });

    // ── Create transaction record ─────────────────────────────────────────────
    await ctx.db.insert("transactions", {
      id: transactionId,
      fromUserId: userId,
      toUserId: args.providerId,
      amount: args.amount,
      currency: args.currency,
      type: "transfer",
      status: "completed",
      description: `Booking payment — ${args.sessionType === "ONE_TO_MANY" ? "Group" : "1-on-1"} session on ${args.sessionDate} at ${args.sessionTime} (${args.duration} min)`,
      metadata: {
        paymentType: "booking",
        sessionDate: args.sessionDate,
        sessionTime: args.sessionTime,
        duration: args.duration,
        sessionType: args.sessionType,
      },
      createdAt: now,
      completedAt: now,
    });

    return {
      success: true,
      transactionId,
      amountPaid: args.amount,
      currency: args.currency,
      newClientBalance: (newClientBalances as any)[args.currency],
    };
  },
});

/**
 * Refund a booking payment back to the client.
 * Called when a booking is cancelled before the session starts.
 */
export const refundBookingPayment = mutation({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) throw new Error("Booking not found");

    // Only client or provider can trigger a refund
    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new Error("Not authorized to refund this booking");
    }

    // Only refund if booking hasn't been completed
    if (booking.status === "COMPLETED") {
      throw new Error("Cannot refund a completed session");
    }

    // Only refund if there's a payment record (paymentTxHash starts with "bkp_")
    if (!booking.paymentTxHash || !booking.paymentTxHash.startsWith("bkp_")) {
      throw new Error("No refundable payment found for this booking");
    }

    const now = Date.now();
    const refundTxId = `bkr_${now}_${Math.random().toString(36).substr(2, 9)}`;

    // ── Debit provider wallet ─────────────────────────────────────────────────
    const providerWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", booking.providerId))
      .first();

    if (providerWallet) {
      const providerBalance =
        providerWallet.balances[booking.currency as keyof typeof providerWallet.balances] ?? 0;

      if (providerBalance >= booking.totalAmount) {
        const newProviderBalances = { ...providerWallet.balances };
        (newProviderBalances as any)[booking.currency] = providerBalance - booking.totalAmount;
        await ctx.db.patch(providerWallet._id, {
          balances: newProviderBalances,
          updatedAt: now,
        });
      }
    }

    // ── Credit client wallet ──────────────────────────────────────────────────
    let clientWallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", booking.clientId))
      .first();

    if (!clientWallet) {
      const walletId = await ctx.db.insert("wallets", {
        userId: booking.clientId,
        primaryCurrency: booking.currency,
        phoneCountryDetected: false,
        balances: {
          USD: 0, NGN: 0, GBP: 0, EUR: 0,
          CAD: 0, GHS: 0, KES: 0, GMD: 0, ZAR: 0,
        },
        createdAt: now,
      });
      clientWallet = await ctx.db.get(walletId)!;
    }

    if (clientWallet) {
      const clientBalance =
        clientWallet.balances[booking.currency as keyof typeof clientWallet.balances] ?? 0;
      const newClientBalances = { ...clientWallet.balances };
      (newClientBalances as any)[booking.currency] = clientBalance + booking.totalAmount;
      await ctx.db.patch(clientWallet._id, {
        balances: newClientBalances,
        updatedAt: now,
      });
    }

    // ── Create refund transaction record ─────────────────────────────────────
    await ctx.db.insert("transactions", {
      id: refundTxId,
      fromUserId: booking.providerId,
      toUserId: booking.clientId,
      amount: booking.totalAmount,
      currency: booking.currency,
      type: "transfer",
      status: "completed",
      description: `Refund for cancelled booking on ${booking.sessionDate}`,
      metadata: {
        paymentType: "booking_refund",
        originalTxHash: booking.paymentTxHash,
        bookingId: args.bookingId,
      },
      createdAt: now,
      completedAt: now,
    });

    return {
      success: true,
      refundTxId,
      amountRefunded: booking.totalAmount,
      currency: booking.currency,
    };
  },
});

/**
 * Verify the client has sufficient balance for a booking.
 * Called before showing the confirmation screen.
 */
export const checkBookingAffordability = query({
  args: {
    amount: v.number(),
    currency: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { canAfford: false, balance: 0, shortfall: args.amount };

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    if (!wallet) return { canAfford: false, balance: 0, shortfall: args.amount };

    const balance =
      wallet.balances[args.currency as keyof typeof wallet.balances] ?? 0;

    return {
      canAfford: balance >= args.amount,
      balance,
      shortfall: Math.max(0, args.amount - balance),
      currency: args.currency,
    };
  },
});
