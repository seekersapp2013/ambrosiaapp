"use node";
import { v } from "convex/values";
import { action } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal, api } from "../_generated/api";
import CryptoJS from "crypto-js";

// Cast helpers — the generated api/internal objects use slash-path keys that
// TypeScript's dot-notation types don't expose directly. Casting through `any`
// is the same pattern used throughout the frontend for sub-folder modules.
const anyApi = api as any;
const anyInternal = internal as any;

export const processWithdrawal = action({
  args: {
    amount: v.number(),
    currency: v.string(),
    bankAccountId: v.id("bank_accounts"),
    pin: v.string(), // 4-digit PIN (plain text — verified here via SHA256)
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (args.amount <= 0) throw new Error("Amount must be greater than 0");
    if (args.currency !== "NGN") throw new Error("Withdrawals are only supported in NGN");

    // ── 1. Verify PIN ─────────────────────────────────────────────────────
    const profile = await ctx.runQuery(anyApi.profiles.getMyProfile);
    if (!profile?.pinHash) {
      throw new Error("No transaction PIN set. Please set a PIN in your profile settings.");
    }
    const enteredHash = CryptoJS.SHA256(args.pin).toString();
    if (enteredHash !== profile.pinHash) {
      throw new Error("Incorrect PIN. Please try again.");
    }

    // ── 2. Validate bank account belongs to user ──────────────────────────
    const bankAccounts: any[] = await ctx.runQuery(
      anyApi["wallets/bankAccounts"].getWithdrawalBankAccounts,
    );
    const account = bankAccounts.find((a: any) => a._id === args.bankAccountId);
    if (!account) throw new Error("Bank account not found or does not belong to you");
    if (!account.recipientCode) throw new Error("Bank account is not registered for transfers");

    // ── 3. Check balance ──────────────────────────────────────────────────
    const walletData: any = await ctx.runQuery(
      anyApi["wallets/getWalletBalance"].getWalletBalance,
      {},
    );
    const ngnBalance = walletData?.balances?.NGN ?? 0;
    if (ngnBalance < args.amount) throw new Error("Insufficient NGN balance");

    // ── 4. Deduct balance + create pending transaction ────────────────────
    const transactionId = `wit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await ctx.runMutation(
      anyInternal["wallets/withdrawalMutations"].deductAndCreateTx,
      {
        userId,
        amount: args.amount,
        bankAccountId: args.bankAccountId,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        transactionId,
      },
    );

    // ── 5. Initiate Paystack transfer ─────────────────────────────────────
    try {
      const result: any = await ctx.runAction(anyApi.paystack.initiateTransfer, {
        amountNGN: args.amount,
        recipientCode: account.recipientCode,
        reason: `Ambrosia withdrawal — ${account.accountName}`,
        reference: transactionId,
      });

      await ctx.runMutation(
        anyInternal["wallets/withdrawalMutations"].updateTxWithTransferCode,
        {
          transactionId,
          transferCode: result.transferCode,
          paystackStatus: result.status,
        },
      );

      await ctx.runMutation(anyInternal.notifications.createNotificationEvent, {
        type: "WALLET_WITHDRAWAL",
        recipientUserId: userId,
        metadata: {
          amount: args.amount.toString(),
          currency: "NGN",
          transactionId,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
        },
      });

      return {
        success: true,
        transactionId,
        transferCode: result.transferCode,
        status: result.status,
        message: `Withdrawal of ₦${args.amount.toFixed(2)} submitted to ${account.bankName}. Processing may take a few hours.`,
      };
    } catch (err: any) {
      // Paystack call failed — refund the balance
      await ctx.runMutation(
        anyInternal["wallets/withdrawalMutations"].refundAndFailTx,
        {
          userId,
          amount: args.amount,
          transactionId,
          reason: err.message || "Paystack transfer failed",
        },
      );
      throw new Error(
        err.message ||
          "Failed to initiate bank transfer. Your balance has been restored.",
      );
    }
  },
});
