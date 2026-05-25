"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ErcasPay API types
interface ErcaspayInitializeResponse {
  requestSuccessful: boolean;
  responseCode: string;
  responseMessage: string;
  responseBody: {
    paymentReference: string;
    transactionReference: string;
    checkoutUrl: string;
  };
}

interface ErcaspayVerifyResponse {
  requestSuccessful: boolean;
  responseCode: string;
  responseMessage: string;
  responseBody: {
    domain: string;
    status: string;
    ercs_reference: string;
    tx_reference: string;
    amount: number;
    description: string | null;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    metadata: string;
    fee: number;
    fee_bearer: string;
    settled_amount: number;
    customer: {
      name: string;
      phone_number: string;
      email: string;
      reference: string;
    };
  };
}

export const initializeDepositPayment = action({
  args: {
    amount: v.number(),
    currency: v.string(),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    paymentMethods: v.optional(v.string()),
    description: v.optional(v.string()),
    feeBearer: v.optional(v.string()),
    redirectUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    requestSuccessful: boolean;
    responseCode: string;
    responseMessage: string;
    responseBody: {
      paymentReference: string;
      transactionReference: string;
      checkoutUrl: string;
    };
  }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get Ercaspay secret key from environment
    const ercaspaySecret = process.env.ERCASPAY_SECRET;
    if (!ercaspaySecret) {
      throw new Error('ErcasPay secret key not configured on server');
    }

    try {
      const paymentReference = `DEPOSIT_${Date.now()}_${identity.subject}`;
      
      const response = await fetch('https://api.ercaspay.com/api/v1/payment/initiate', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ercaspaySecret}`,
        },
        body: JSON.stringify({
          amount: args.amount,
          paymentReference: paymentReference,
          paymentMethods: args.paymentMethods || "card,bank-transfer,ussd,qrcode",
          customerName: args.customerName,
          customerEmail: args.customerEmail,
          customerPhoneNumber: args.customerPhone || "",
          currency: args.currency,
          feeBearer: args.feeBearer || "customer",
          redirectUrl: args.redirectUrl || "http://localhost:5173/callback",
          description: args.description || `Wallet deposit - ${args.currency} ${args.amount}`,
          metadata: {
            userId: identity.subject,
            depositAmount: args.amount,
            depositCurrency: args.currency,
            timestamp: Date.now(),
          },
        }),
      });

      const responseText = await response.text();
      console.log('ErcasPay API response status:', response.status);
      console.log('ErcasPay API response:', responseText);

      if (!response.ok) {
        throw new Error(`ErcasPay API error: ${response.status} - ${responseText}`);
      }

      let data: ErcaspayInitializeResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response:', responseText);
        throw new Error('Invalid response from ErcasPay API');
      }

      if (!data.requestSuccessful || data.responseCode !== 'success') {
        throw new Error(data.responseMessage || 'Payment initialization failed');
      }

      return {
        requestSuccessful: data.requestSuccessful,
        responseCode: data.responseCode,
        responseMessage: data.responseMessage,
        responseBody: {
          paymentReference: data.responseBody.paymentReference,
          transactionReference: data.responseBody.transactionReference,
          checkoutUrl: data.responseBody.checkoutUrl,
        },
      };

    } catch (error: any) {
      console.error('ErcasPay initialization error:', error);
      throw new Error(error.message || 'Failed to initialize ErcasPay payment');
    }
  },
});

export const verifyDepositPayment = action({
  args: {
    transactionReference: v.string(),
  },
  handler: async (ctx, args): Promise<{
    status: 'success' | 'failed' | 'pending';
    amount?: number;
    currency?: string;
    transactionReference?: string;
    paymentReference?: string;
    newBalance?: any;
    message?: string;
    verificationData: ErcaspayVerifyResponse;
  }> => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const ercaspaySecret = process.env.ERCASPAY_SECRET;
    if (!ercaspaySecret) {
      throw new Error('ErcasPay secret key not configured on server');
    }

    try {
      const response = await fetch(
        `https://api.ercaspay.com/api/v1/payment/transaction/verify/${args.transactionReference}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ercaspaySecret}`,
          },
        }
      );

      const responseText = await response.text();
      console.log('ErcasPay verify response status:', response.status);
      console.log('ErcasPay verify response:', responseText);

      if (!response.ok) {
        throw new Error(`ErcasPay verify API error: ${response.status} - ${responseText}`);
      }

      let data: ErcaspayVerifyResponse;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse verify response:', responseText);
        throw new Error('Invalid response from ErcasPay verify API');
      }

      if (!data.requestSuccessful) {
        throw new Error(data.responseMessage || 'Payment verification failed');
      }

      const paymentStatus = data.responseBody.status;
      
      if (paymentStatus === 'SUCCESSFUL') {
        // Use the existing deposit function to credit the wallet
        const depositResult: any = await ctx.runMutation(api.wallets.depositFunds.depositFunds, {
          amount: data.responseBody.amount,
          currency: data.responseBody.currency,
        });

        return {
          status: 'success',
          amount: data.responseBody.amount,
          currency: data.responseBody.currency,
          transactionReference: data.responseBody.ercs_reference,
          paymentReference: data.responseBody.tx_reference,
          newBalance: depositResult.newBalance,
          verificationData: data,
        };
      } else if (paymentStatus === 'FAILED') {
        return {
          status: 'failed',
          message: 'Payment failed',
          verificationData: data,
        };
      } else {
        return {
          status: 'pending',
          message: 'Payment is still being processed',
          verificationData: data,
        };
      }

    } catch (error: any) {
      console.error('ErcasPay verification error:', error);
      throw new Error(error.message || 'Failed to verify ErcasPay payment');
    }
  },
});

export const processDepositWebhook = action({
  args: {
    body: v.string(),
    signature: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    try {
      const data = JSON.parse(args.body);
      console.log('ErcasPay deposit webhook received:', data);

      // Handle successful payment webhook
      if (data.requestSuccessful && 
          data.responseCode === "success" && 
          data.responseBody?.status === "SUCCESSFUL") {
        
        const paymentData = data.responseBody;
        const transactionReference = paymentData.ercs_reference;
        const amount = paymentData.amount;
        const currency = paymentData.currency;

        // Extract user ID from metadata
        let userId = null;
        try {
          const metadata = JSON.parse(paymentData.metadata || '{}');
          userId = metadata.userId;
        } catch (e) {
          console.error('Failed to parse metadata:', e);
        }

        if (userId) {
          // Use the existing deposit function to credit the wallet
          await ctx.runMutation(api.wallets.depositFunds.depositFunds, {
            amount: amount,
            currency: currency,
          });

          console.log(`ErcasPay webhook: Deposited ${amount} ${currency} to user ${userId}`);
          return { success: true, message: 'Deposit processed successfully' };
        } else {
          console.log('ErcasPay webhook: Could not find user ID in metadata for transaction:', transactionReference);
          return { success: false, message: 'User ID not found in transaction metadata' };
        }
      }

      // Handle failed payment webhook
      if (data.requestSuccessful && data.responseBody?.status === "FAILED") {
        const transactionReference = data.responseBody.ercs_reference;
        console.log(`ErcasPay deposit payment failed via webhook: ${transactionReference}`);
        return { success: true, message: 'Failed payment webhook processed' };
      }

      return { success: true, message: 'Webhook processed' };

    } catch (error: any) {
      console.error('ErcasPay deposit webhook processing error:', error);
      throw new Error('Failed to process ErcasPay deposit webhook');
    }
  },
});