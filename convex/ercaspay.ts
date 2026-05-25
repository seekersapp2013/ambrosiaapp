import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// ErcasPay API configuration
const ERCASPAY_BASE_URL = "https://api.ercaspay.com/api/v1";
const ERCASPAY_SECRET_KEY = process.env.ERCASPAY_SECRET;

// Debug environment variables
console.log("Environment check:", {
  hasErcasPaySecret: !!ERCASPAY_SECRET_KEY,
  secretKeyLength: ERCASPAY_SECRET_KEY?.length || 0,
  secretKeyPrefix: ERCASPAY_SECRET_KEY?.substring(0, 5) || 'undefined',
  baseUrl: ERCASPAY_BASE_URL
});

// Test endpoint to debug ErcasPay API
export const testErcasPayAPI = httpAction(async (ctx, request) => {
  console.log("=== ErcasPay API Test ===");
  console.log("Environment variables:", {
    hasSecret: !!ERCASPAY_SECRET_KEY,
    secretLength: ERCASPAY_SECRET_KEY?.length || 0,
    secretPrefix: ERCASPAY_SECRET_KEY?.substring(0, 10) || 'undefined',
    baseUrl: ERCASPAY_BASE_URL
  });

  if (!ERCASPAY_SECRET_KEY) {
    return new Response(JSON.stringify({
      success: false,
      error: "ErcasPay secret key not found in environment variables"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Test with minimal payload matching your curl format
  const testPayload = {
    amount: 100,
    paymentReference: `TEST_${Date.now()}`,
    paymentMethods: "card,bank-transfer,ussd,qrcode",
    customerName: "Test User",
    customerEmail: "test@example.com",
    customerPhoneNumber: "08121303854",
    redirectUrl: "https://yourwebsite.com/callback",
    description: "Test payment description",
    currency: "NGN",
    feeBearer: "customer"
  };

  try {
    const apiUrl = `${ERCASPAY_BASE_URL}/payment/initiate`;
    console.log("Testing API URL:", apiUrl);
    console.log("Test payload:", JSON.stringify(testPayload, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ERCASPAY_SECRET_KEY}`
      },
      body: JSON.stringify(testPayload)
    });

    console.log("Test response status:", response.status);
    console.log("Test response statusText:", response.statusText);

    const responseText = await response.text();
    console.log("Test response body:", responseText);

    return new Response(JSON.stringify({
      success: true,
      apiUrl,
      requestPayload: testPayload,
      responseStatus: response.status,
      responseStatusText: response.statusText,
      responseBody: responseText,
      hasSecretKey: !!ERCASPAY_SECRET_KEY,
      secretKeyLength: ERCASPAY_SECRET_KEY?.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Test API error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      hasSecretKey: !!ERCASPAY_SECRET_KEY
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// Initiate ErcasPay payment
export const initiateErcasPayPayment = httpAction(async (ctx, request) => {
  try {
    const { 
      userId, 
      amount, 
      currency, 
      paymentReference,
      customerName,
      customerEmail,
      customerPhoneNumber
    } = await request.json();

    console.log("ErcasPay initiation request:", { 
      userId, 
      amount, 
      currency, 
      paymentReference,
      customerName,
      customerEmail,
      customerPhoneNumber
    });

    if (!ERCASPAY_SECRET_KEY) {
      console.error("ErcasPay secret key not configured");
      return new Response(JSON.stringify({
        success: false,
        error: "ErcasPay secret key not configured"
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Validate required customer details
    if (!customerName || !customerEmail) {
      console.error("Missing required customer details");
      return new Response(JSON.stringify({
        success: false,
        error: "Customer name and email are required"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Get user profile for fallback details (optional now since we have customer details from frontend)
    const user = await ctx.runQuery(internal.profileQueries.getUserById, { userId });
    if (!user) {
      console.error("User not found:", userId);
      return new Response(JSON.stringify({
        success: false,
        error: "User not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log("User found:", { username: user.username, name: user.name });

    // Create pending transaction record
    const transactionId = `ercas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await ctx.runMutation(internal.ercasPayMutations.createPendingTransaction, {
      transactionId,
      userId,
      amount,
      currency,
      paymentReference,
    });

    console.log("Pending transaction created:", transactionId);

    // Prepare ErcasPay payment data - matching your exact curl format
    const paymentData = {
      amount: amount,
      paymentReference: paymentReference,
      paymentMethods: "card,bank-transfer,ussd,qrcode",
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhoneNumber: customerPhoneNumber || user.phoneNumber || user.phone || "",
      redirectUrl: `${process.env.VITE_CONVEX_SITE_URL || 'http://localhost:5173'}/deposit-success?ref=${paymentReference}`,
      description: `Wallet deposit of ${amount} ${currency}`,
      currency: currency,
      feeBearer: "customer"
    };

    console.log("Payment data prepared:", paymentData);

    // Call ErcasPay API - using the exact endpoint from your curl example
    const apiUrl = `${ERCASPAY_BASE_URL}/payment/initiate`;
    console.log("Calling ErcasPay API:", apiUrl);
    console.log("Request headers:", {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ERCASPAY_SECRET_KEY?.substring(0, 10)}...` // Only log first 10 chars for security
    });
    console.log("Request body:", JSON.stringify(paymentData, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ERCASPAY_SECRET_KEY}`
      },
      body: JSON.stringify(paymentData)
    });

    console.log("ErcasPay API response status:", response.status);
    console.log("ErcasPay API response statusText:", response.statusText);
    // Log headers in a Node.js compatible way
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log("ErcasPay API response headers:", headers);

    let result;
    const responseText = await response.text();
    console.log("=== COMPLETE ErcasPay API RAW RESPONSE ===");
    console.log("Response length:", responseText.length);
    console.log("Response content:", responseText);
    console.log("Response content (first 500 chars):", responseText.substring(0, 500));
    console.log("=== END RAW RESPONSE ===");

    if (!responseText || responseText.trim() === '') {
      console.error("Empty response from ErcasPay API");
      await ctx.runMutation(internal.ercasPayMutations.updateTransactionStatus, {
        transactionId,
        status: "failed",
        webhookData: { 
          error: "Empty response from payment gateway", 
          httpStatus: response.status,
          httpStatusText: response.statusText,
          headers: headers
        }
      });

      return new Response(JSON.stringify({
        success: false,
        error: `Empty response from payment gateway (HTTP ${response.status}: ${response.statusText})`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      result = JSON.parse(responseText);
      console.log("=== PARSED ErcasPay RESPONSE ===");
      console.log(JSON.stringify(result, null, 2));
      console.log("=== END PARSED RESPONSE ===");
    } catch (parseError) {
      console.error("Failed to parse ErcasPay response as JSON:", parseError);
      console.error("Parse error details:", {
        message: parseError instanceof Error ? parseError.message : 'Unknown parse error',
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 200)
      });
      
      await ctx.runMutation(internal.ercasPayMutations.updateTransactionStatus, {
        transactionId,
        status: "failed",
        webhookData: { 
          error: "Invalid JSON response from payment gateway", 
          rawResponse: responseText,
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error',
          httpStatus: response.status,
          httpStatusText: response.statusText
        }
      });

      return new Response(JSON.stringify({
        success: false,
        error: `Invalid JSON response from payment gateway. HTTP ${response.status}: ${response.statusText}. Response: ${responseText.substring(0, 100)}...`
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log("Parsed ErcasPay response:", result);

    if (!response.ok || !result.requestSuccessful) {
      const errorMessage = result.responseMessage || `HTTP ${response.status}: Payment initiation failed`;
      console.error("ErcasPay API error:", errorMessage, result);
      
      await ctx.runMutation(internal.ercasPayMutations.updateTransactionStatus, {
        transactionId,
        status: "failed",
        webhookData: { error: errorMessage, apiResponse: result }
      });

      return new Response(JSON.stringify({
        success: false,
        error: errorMessage
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Update transaction with ErcasPay details
    await ctx.runMutation(internal.ercasPayMutations.updateTransactionWithPaymentUrl, {
      transactionId,
      externalTransactionId: result.responseBody.transactionReference,
      paymentUrl: result.responseBody.checkoutUrl,
    });

    console.log("Transaction updated with payment URL:", result.responseBody.checkoutUrl);

    return new Response(JSON.stringify({
      success: true,
      checkoutUrl: result.responseBody.checkoutUrl,
      transactionReference: result.responseBody.transactionReference,
      paymentReference: result.responseBody.paymentReference
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("ErcasPay initiation error:", error);
    
    // Try to mark transaction as failed if we have the transactionId
    try {
      const transactionId = `ercas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await ctx.runMutation(internal.ercasPayMutations.updateTransactionStatus, {
        transactionId,
        status: "failed",
        webhookData: { error: error instanceof Error ? error.message : "Unknown error" }
      });
    } catch (updateError) {
      console.error("Failed to update transaction status:", updateError);
    }

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Payment initiation failed"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

// Handle ErcasPay webhook
export const handleErcasPayWebhook = httpAction(async (ctx, request) => {
  try {
    const webhookData = await request.json();
    
    // Verify webhook (basic validation)
    if (!webhookData.transaction_reference || !webhookData.payment_reference) {
      return new Response("Invalid webhook data", { status: 400 });
    }

    // Find transaction by external reference
    const transaction = await ctx.runQuery(internal.ercasPayMutations.getTransactionByExternalId, {
      externalTransactionId: webhookData.transaction_reference
    });

    if (!transaction) {
      return new Response("Transaction not found", { status: 404 });
    }

    // Process webhook based on status
    if (webhookData.status === "SUCCESSFUL") {
      await ctx.runMutation(internal.ercasPayMutations.completeErcasPayDeposit, {
        transactionId: transaction.id,
        webhookData: webhookData
      });
    } else {
      await ctx.runMutation(internal.ercasPayMutations.updateTransactionStatus, {
        transactionId: transaction.id,
        status: "failed",
        webhookData: webhookData
      });
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Webhook processing failed", { status: 500 });
  }
});

// Verify payment status
export const verifyErcasPayPayment = httpAction(async (ctx, request) => {
  const { transactionReference } = await request.json();

  if (!ERCASPAY_SECRET_KEY) {
    throw new Error("ErcasPay secret key not configured");
  }

  try {
    // In a real implementation, you would call ErcasPay's verify endpoint
    // For now, we'll check our local transaction status
    const transaction = await ctx.runQuery(internal.ercasPayMutations.getTransactionByExternalId, {
      externalTransactionId: transactionReference
    });

    if (!transaction) {
      return new Response(JSON.stringify({
        success: false,
        error: "Transaction not found"
      }), {
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      status: transaction.status,
      transaction: transaction
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Verification failed"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});