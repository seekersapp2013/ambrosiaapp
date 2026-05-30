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
    const amount: number | undefined = data?.amount; // in kobo
    const reason: string | undefined = data?.reason;

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
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
