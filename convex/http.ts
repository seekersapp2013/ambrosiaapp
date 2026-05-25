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

export default http;
