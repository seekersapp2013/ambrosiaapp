"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Cast helpers — generated api/internal use slash-path keys that dot-notation
// types don't expose. Same pattern used across the wallet actions.
const anyApi = api as any;
const anyInternal = internal as any;

const PAYSTACK_BASE = "https://api.paystack.co";

/**
 * Preferred bank slug for the Dedicated Virtual Account.
 *
 * Paystack only supports Wema Bank and Titan Paystack for live DVAs. In test
 * mode you must use "test-bank". We detect test mode from the secret key prefix
 * (sk_test_...) so development works without hitting live providers.
 */
/**
 * Normalize a Nigerian phone number to international format for Paystack
 * (e.g. "08012345678" → "+2348012345678", "2348012345678" → "+2348012345678").
 */
function normalizePhoneIntl(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "234" + digits.slice(1);
  else if (digits.length === 10) digits = "234" + digits;
  if (!digits.startsWith("234")) return raw.trim(); // leave non-NG numbers as-is
  return "+" + digits;
}

function preferredBank(secretKey: string): string {
  const isTest = secretKey.startsWith("sk_test_");
  if (isTest) return "test-bank";
  // Allow override via env; default to wema-bank for live.
  return process.env.PAYSTACK_DVA_PREFERRED_BANK || "wema-bank";
}

interface AssignResponse {
  status: boolean;
  message: string;
}

/**
 * Provision a Dedicated Virtual Account for the authenticated user using the
 * Paystack "Assign Dedicated Virtual Account" endpoint. This single call
 * creates the customer, validates them with their BVN, and assigns a DVA.
 *
 * The assignment is asynchronous: Paystack returns "in progress" and later
 * fires a `dedicatedaccount.assign.success` webhook carrying the account
 * details, which we persist (see http.ts + wallets/dedicatedAccounts.ts).
 *
 * SECURITY: the BVN is forwarded to Paystack and never persisted anywhere in
 * our system or database.
 */
export const provisionDedicatedAccount = action({
  args: {
    bvn: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    email: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; status: "pending" | "active"; message: string }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!/^\d{11}$/.test(args.bvn.trim())) {
      throw new Error("BVN must be exactly 11 digits");
    }
    const firstName = args.firstName.trim();
    const lastName = args.lastName.trim();
    // Paystack expects an international phone format (e.g. +2348012345678).
    const phone = normalizePhoneIntl(args.phone);
    const email = args.email.trim();
    if (!firstName || !lastName) throw new Error("First and last name are required");
    if (!email) throw new Error("Email is required");
    if (!phone) throw new Error("Phone number is required");

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("Paystack secret key not configured");

    // ── Guard: don't re-provision if the user already has an account ──────────
    const existing: any = await ctx.runQuery(
      anyApi["wallets/dedicatedAccounts"].getMyDedicatedAccount,
      {},
    );
    if (existing && existing.status === "active") {
      return { success: true, status: "active", message: "Account already active" };
    }

    // ── Call Paystack Assign DVA (creates customer + validates BVN + assigns) ─
    const response = await fetch(`${PAYSTACK_BASE}/dedicated_account/assign`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        bvn: args.bvn.trim(),
        country: "NG",
        preferred_bank: preferredBank(secretKey),
      }),
    });

    const data: AssignResponse = await response.json();
    if (!response.ok || !data.status) {
      throw new Error(
        data?.message || "Could not create your bank account. Please verify your BVN and details.",
      );
    }

    // ── Persist a pending record keyed by email + userId ──────────────────────
    // The webhook (dedicatedaccount.assign.success) will fill in account details
    // and flip status to "active".
    await ctx.runMutation(anyInternal["wallets/dedicatedAccounts"].saveDedicatedAccount, {
      userId,
      email,
      status: "pending",
    });

    return {
      success: true,
      status: "pending",
      message: data.message || "Your bank account is being set up. This usually takes a few seconds.",
    };
  },
});

interface PaystackTransaction {
  id: number;
  status: string;
  reference: string;
  amount: number; // kobo
  channel: string;
  currency: string;
}

interface ListTransactionsResponse {
  status: boolean;
  message: string;
  data: PaystackTransaction[];
}

/**
 * Manual reconciliation triggered by the "I have made Payment" button.
 *
 * Rate limited to once per 60s per user via dedicated_accounts.lastManualCheckAt
 * to avoid hitting Paystack API limits. Lists the user's recent successful
 * transactions, filters to dedicated_nuban deposits, and credits any that
 * haven't been credited yet (idempotent via the credit mutation).
 */
export const reconcileDedicatedDeposits = action({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    status: "ok" | "cooldown" | "no_account";
    credited: number;
    newBalance?: number;
    retryAfterSeconds?: number;
    message: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const account: any = await ctx.runQuery(
      anyApi["wallets/dedicatedAccounts"].getMyDedicatedAccount,
      {},
    );
    if (!account || account.status !== "active" || !account.paystackCustomerCode) {
      return {
        status: "no_account",
        credited: 0,
        message: "Your bank account is not ready yet. Please try again shortly.",
      };
    }

    // ── Cooldown gate (60s) ───────────────────────────────────────────────────
    const COOLDOWN_MS = 60_000;
    const now = Date.now();
    const last = account.lastManualCheckAt ?? 0;
    if (now - last < COOLDOWN_MS) {
      return {
        status: "cooldown",
        credited: 0,
        retryAfterSeconds: Math.ceil((COOLDOWN_MS - (now - last)) / 1000),
        message: "Please wait a moment before checking again.",
      };
    }

    // Record the attempt immediately so rapid taps can't bypass the cooldown.
    await ctx.runMutation(anyInternal["wallets/dedicatedAccounts"].touchManualCheck, {
      accountId: account._id,
    });

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new Error("Paystack secret key not configured");

    // ── List recent successful transactions for this customer ─────────────────
    const customerId = account.paystackCustomerId ?? account.paystackCustomerCode;
    const url = `${PAYSTACK_BASE}/transaction?customer=${encodeURIComponent(
      String(customerId),
    )}&status=success&perPage=20`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const data: ListTransactionsResponse = await response.json();
    if (!response.ok || !data.status) {
      throw new Error(data?.message || "Could not check for new payments. Please try again.");
    }

    // ── Credit any dedicated_nuban deposits not yet seen (idempotent) ─────────
    let credited = 0;
    let newBalance: number | undefined;
    for (const tx of data.data) {
      if (tx.channel !== "dedicated_nuban") continue;
      if (tx.currency !== "NGN") continue;
      if (tx.status !== "success") continue;

      const result: any = await ctx.runMutation(
        anyInternal["wallets/dvaCredit"].creditNgnDepositByUserId,
        {
          userId,
          amountNGN: tx.amount / 100,
          reference: tx.reference,
          source: "manual",
          paystackData: tx,
        },
      );
      if (result.credited) credited += 1;
      newBalance = result.newBalance;
    }

    return {
      status: "ok",
      credited,
      newBalance,
      message:
        credited > 0
          ? `Credited ${credited} new payment${credited > 1 ? "s" : ""} to your wallet.`
          : "No new payments found yet. If you just paid, it may take a moment to arrive.",
    };
  },
});
