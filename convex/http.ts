import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { resend } from "./emails";
import { 
  initiateErcasPayPayment, 
  handleErcasPayWebhook, 
  verifyErcasPayPayment,
  testErcasPayAPI
} from "./ercaspay";
import { internal } from "./_generated/api";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/resend-webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    return await resend.handleResendEventWebhook(ctx, req);
  }),
});

// ErcasPay routes
http.route({
  path: "/ercaspay/initiate",
  method: "POST",
  handler: initiateErcasPayPayment,
});

http.route({
  path: "/ercaspay/webhook",
  method: "POST",
  handler: handleErcasPayWebhook,
});

http.route({
  path: "/ercaspay/verify",
  method: "POST",
  handler: verifyErcasPayPayment,
});

// Test route for debugging
http.route({
  path: "/ercaspay/test",
  method: "GET",
  handler: testErcasPayAPI,
});

// Paystack transfer webhook
http.route({
  path: "/paystack/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return new Response("Server misconfiguration", { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") ?? "";

    // Validate HMAC-SHA512 signature using Web Crypto API (available in Convex runtime)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(paystackSecretKey);
    const msgData = encoder.encode(rawBody);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"],
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const expectedSig = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (signature !== expectedSig) {
      return new Response("Invalid signature", { status: 401 });
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const { event: eventType, data } = event;
    const transferCode: string | undefined = data?.transfer_code;

    // ── Transfer (withdrawal) events ──────────────────────────────────────────
    if (transferCode) {
      if (eventType === "transfer.success") {
        await ctx.runMutation(internal.paystackWebhook.handleTransferSuccess, {
          transferCode,
          paystackData: data,
        });
      } else if (eventType === "transfer.failed" || eventType === "transfer.reversed") {
        await ctx.runMutation(internal.paystackWebhook.handleTransferFailed, {
          transferCode,
          reason: data?.gateway_response ?? eventType,
          paystackData: data,
        });
      }
      return new Response("OK", { status: 200 });
    }

    // Slash-path module references (not exposed on the dot-notation internal type)
    const anyInternal = internal as any;

    // ── Dedicated Virtual Account assignment completed ────────────────────────
    // Paystack creates the account asynchronously after /dedicated_account/assign
    // and reports it here with the account details.
    if (eventType === "dedicatedaccount.assign.success") {
      const customer = data?.customer ?? {};
      const dva = data?.dedicated_account ?? data; // some payloads nest, some flatten
      const customerCode: string | undefined = customer?.customer_code;
      const customerId: number | undefined = customer?.id;
      const customerEmail: string | undefined = customer?.email;
      const accountNumber: string | undefined = dva?.account_number;
      const accountName: string | undefined = dva?.account_name;
      const bankName: string | undefined = dva?.bank?.name;
      const bankSlug: string | undefined = dva?.bank?.slug;
      const dvaId: number | undefined = dva?.id;

      // Find the pending record: prefer email (set at provisioning), then code.
      let record: any = null;
      if (customerEmail) {
        record = await ctx.runQuery(
          anyInternal["wallets/dedicatedAccounts"].getByEmail,
          { email: customerEmail },
        );
      }
      if (!record && customerCode) {
        record = await ctx.runQuery(
          anyInternal["wallets/dedicatedAccounts"].getByCustomerCode,
          { customerCode },
        );
      }

      if (record) {
        await ctx.runMutation(
          anyInternal["wallets/dedicatedAccounts"].saveDedicatedAccount,
          {
            userId: record.userId,
            status: "active",
            ...(customerCode && { paystackCustomerCode: customerCode }),
            ...(customerId !== undefined && { paystackCustomerId: customerId }),
            ...(dvaId !== undefined && { dvaId }),
            ...(accountName && { accountName }),
            ...(accountNumber && { accountNumber }),
            ...(bankName && { bankName }),
            ...(bankSlug && { bankSlug }),
          },
        );
      }
      return new Response("OK", { status: 200 });
    }

    if (eventType === "dedicatedaccount.assign.failed") {
      const customerEmail: string | undefined = data?.customer?.email;
      const customerCode: string | undefined = data?.customer?.customer_code;
      let record: any = null;
      if (customerEmail) {
        record = await ctx.runQuery(
          anyInternal["wallets/dedicatedAccounts"].getByEmail,
          { email: customerEmail },
        );
      }
      if (!record && customerCode) {
        record = await ctx.runQuery(
          anyInternal["wallets/dedicatedAccounts"].getByCustomerCode,
          { customerCode },
        );
      }
      if (record) {
        await ctx.runMutation(
          anyInternal["wallets/dedicatedAccounts"].saveDedicatedAccount,
          { userId: record.userId, status: "failed" },
        );
      }
      return new Response("OK", { status: 200 });
    }

    // ── Incoming deposit into a dedicated virtual account ─────────────────────
    if (eventType === "charge.success" && data?.channel === "dedicated_nuban") {
      const reference: string | undefined = data?.reference;
      const amountKobo: number | undefined = data?.amount;
      const currency: string = data?.currency ?? "NGN";
      const customerCode: string | undefined = data?.customer?.customer_code;
      // The receiving DVA details may be present on the authorization object.
      const receiverAccount: string | undefined =
        data?.authorization?.receiver_bank_account_number ??
        data?.metadata?.receiver_account_number;

      if (reference && typeof amountKobo === "number" && currency === "NGN") {
        // Map to a user via customer code first, then receiving account number.
        let record: any = null;
        if (customerCode) {
          record = await ctx.runQuery(
            anyInternal["wallets/dedicatedAccounts"].getByCustomerCode,
            { customerCode },
          );
        }
        if (!record && receiverAccount) {
          record = await ctx.runQuery(
            anyInternal["wallets/dedicatedAccounts"].getByAccountNumber,
            { accountNumber: receiverAccount },
          );
        }

        if (record) {
          await ctx.runMutation(anyInternal["wallets/dvaCredit"].creditNgnDepositByUserId, {
            userId: record.userId,
            amountNGN: amountKobo / 100,
            reference,
            source: "webhook",
            paystackData: data,
          });
        }
      }
      return new Response("OK", { status: 200 });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
