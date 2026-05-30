"use node";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

interface PaystackBank {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway: string | null;
  pay_with_bank: boolean;
  active: boolean;
  country: string;
  currency: string;
  type: string;
  is_deleted: boolean;
}

interface PaystackBanksResponse {
  status: boolean;
  message: string;
  data: PaystackBank[];
}

interface PaystackResolveResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

// Fetch all active Nigerian banks from Paystack, cached for 24h in platform_settings
export const listNigerianBanks = action({
  args: {},
  handler: async (ctx): Promise<{ name: string; slug: string; code: string }[]> => {
    const cached = await ctx.runQuery(api.paystackCache.getCachedBanks, {});
    if (cached) return cached;

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) throw new Error("Paystack secret key not configured");

    const response = await fetch(
      "https://api.paystack.co/bank?country=nigeria&use_cursor=false&perPage=100",
      { headers: { Authorization: `Bearer ${paystackSecretKey}` } },
    );
    if (!response.ok) {
      throw new Error(`Paystack banks API error: ${response.status}`);
    }
    const data: PaystackBanksResponse = await response.json();
    if (!data.status) throw new Error(data.message || "Failed to fetch banks");

    const banks = data.data
      .filter((b) => b.active && !b.is_deleted)
      .map((b) => ({ name: b.name, slug: b.slug, code: b.code }));

    await ctx.runMutation(api.paystackCache.cacheBanks, { banks });
    return banks;
  },
});

// Verify account number and return account holder name
export const resolveAccountNumber = action({
  args: {
    accountNumber: v.string(),
    bankCode: v.string(),
  },
  handler: async (
    _ctx,
    { accountNumber, bankCode },
  ): Promise<{ accountName: string; accountNumber: string }> => {
    if (!/^\d{10}$/.test(accountNumber)) {
      throw new Error("Account number must be exactly 10 digits");
    }
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) throw new Error("Paystack secret key not configured");

    const url = `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${paystackSecretKey}` },
    });
    const data: PaystackResolveResponse = await response.json();
    if (!response.ok || !data.status) {
      throw new Error(data.message || "Could not verify account. Please check the details.");
    }
    return {
      accountName: data.data.account_name,
      accountNumber: data.data.account_number,
    };
  },
});

// Create a Paystack transfer recipient for a verified bank account
export const createTransferRecipient = action({
  args: {
    accountName: v.string(),
    accountNumber: v.string(),
    bankCode: v.string(),
  },
  handler: async (_ctx, { accountName, accountNumber, bankCode }): Promise<{ recipientCode: string }> => {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) throw new Error("Paystack secret key not configured");

    const response = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: accountName,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: "NGN",
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      throw new Error(data.message || "Failed to register bank account for transfers");
    }
    return { recipientCode: data.data.recipient_code };
  },
});

// Initiate a Paystack transfer to a recipient
export const initiateTransfer = action({
  args: {
    amountNGN: v.number(), // in Naira — converted to kobo internally
    recipientCode: v.string(),
    reason: v.string(),
    reference: v.optional(v.string()), // idempotency key
  },
  handler: async (
    _ctx,
    { amountNGN, recipientCode, reason, reference },
  ): Promise<{ transferCode: string; status: string }> => {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) throw new Error("Paystack secret key not configured");

    const body: Record<string, unknown> = {
      source: "balance",
      amount: Math.round(amountNGN * 100), // kobo
      recipient: recipientCode,
      reason,
    };
    if (reference) body.reference = reference;

    const response = await fetch("https://api.paystack.co/transfer", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      throw new Error(data.message || "Paystack transfer request failed");
    }
    return {
      transferCode: data.data.transfer_code,
      status: data.data.status,
    };
  },
});
