/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as otp_ResendOTP from "../otp/ResendOTP.js";
import type * as otp_TwilioOTP from "../otp/TwilioOTP.js";
import type * as otp_TwilioSDK from "../otp/TwilioSDK.js";
import type * as otp_VerificationCodeEmail from "../otp/VerificationCodeEmail.js";
import type * as passwordChange from "../passwordChange.js";
import type * as passwordReset_PasswordResetEmail from "../passwordReset/PasswordResetEmail.js";
import type * as passwordReset_ResendOTPPasswordReset from "../passwordReset/ResendOTPPasswordReset.js";
import type * as signup from "../signup.js";
import type * as users from "../users.js";
import type * as wallets from "../wallets.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  http: typeof http;
  notifications: typeof notifications;
  "otp/ResendOTP": typeof otp_ResendOTP;
  "otp/TwilioOTP": typeof otp_TwilioOTP;
  "otp/TwilioSDK": typeof otp_TwilioSDK;
  "otp/VerificationCodeEmail": typeof otp_VerificationCodeEmail;
  passwordChange: typeof passwordChange;
  "passwordReset/PasswordResetEmail": typeof passwordReset_PasswordResetEmail;
  "passwordReset/ResendOTPPasswordReset": typeof passwordReset_ResendOTPPasswordReset;
  signup: typeof signup;
  users: typeof users;
  wallets: typeof wallets;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
