import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Credit a user's NGN wallet for a Dedicated Virtual Account deposit.
 *
 * Idempotent on the Paystack transaction `reference`: if a transaction with the
 * same `externalTransactionId` already exists, this is a no-op. This lets the
 * webhook and the manual reconcile path both call it safely without
 * double-crediting.
 *
 * Mirrors the balance/transaction/notification logic of wallets/depositFunds.ts
 * but is keyed by an explicit userId so it can run from an unauthenticated
 * webhook context.
 */
export const creditNgnDepositByUserId = internalMutation({
  args: {
    userId: v.id("users"),
    amountNGN: v.number(),
    reference: v.string(), // Paystack transaction reference — idempotency key
    source: v.string(), // "webhook" | "manual"
    paystackData: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<{ credited: boolean; newBalance: number }> => {
    if (args.amountNGN <= 0) {
      throw new Error("Deposit amount must be greater than 0");
    }

    // ── Idempotency check: has this reference already been credited? ──────────
    const existing = await ctx.db
      .query("transactions")
      .withIndex("by_external_id", (q) => q.eq("externalTransactionId", args.reference))
      .first();

    if (existing) {
      // Already processed — return current balance without re-crediting.
      const wallet = await ctx.db
        .query("wallets")
        .withIndex("userId", (q) => q.eq("userId", args.userId))
        .first();
      return { credited: false, newBalance: wallet?.balances.NGN ?? 0 };
    }

    // ── Get or create the wallet ─────────────────────────────────────────────
    let wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!wallet) {
      const walletId = await ctx.db.insert("wallets", {
        userId: args.userId,
        primaryCurrency: "NGN",
        phoneCountryDetected: false,
        balances: {
          USD: 0, NGN: 0, GBP: 0, EUR: 0, CAD: 0,
          GHS: 0, KES: 0, GMD: 0, ZAR: 0,
        },
        createdAt: Date.now(),
      });
      wallet = await ctx.db.get(walletId);
      if (!wallet) throw new Error("Failed to create wallet");
    }

    // ── Record transaction (idempotency marker via externalTransactionId) ─────
    const transactionId = `dva_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await ctx.db.insert("transactions", {
      id: transactionId,
      toUserId: args.userId,
      amount: args.amountNGN,
      currency: "NGN",
      type: "deposit",
      status: "completed",
      description: `Bank transfer deposit of ₦${args.amountNGN.toFixed(2)}`,
      paymentGateway: "paystack-dva",
      externalTransactionId: args.reference,
      webhookData: args.paystackData,
      metadata: { source: args.source },
      createdAt: Date.now(),
      completedAt: Date.now(),
    });

    // ── Credit the NGN balance ───────────────────────────────────────────────
    const newNgn = wallet.balances.NGN + args.amountNGN;
    await ctx.db.patch(wallet._id, {
      balances: { ...wallet.balances, NGN: newNgn },
      updatedAt: Date.now(),
    });

    // ── Notify the user ──────────────────────────────────────────────────────
    await ctx.scheduler.runAfter(0, internal.notifications.createNotificationEvent, {
      type: "WALLET_DEPOSIT",
      recipientUserId: args.userId,
      metadata: {
        amount: args.amountNGN.toString(),
        currency: "NGN",
        transactionId,
      },
    });

    return { credited: true, newBalance: newNgn };
  },
});
