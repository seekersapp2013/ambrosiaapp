/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ads from "../ads.js";
import type * as aiRecommendations from "../aiRecommendations.js";
import type * as articles from "../articles.js";
import type * as auth from "../auth.js";
import type * as autoInitializeAI from "../autoInitializeAI.js";
import type * as batchingService from "../batchingService.js";
import type * as bookingAI from "../bookingAI.js";
import type * as bookingNotifications from "../bookingNotifications.js";
import type * as bookingSettings from "../bookingSettings.js";
import type * as bookingSubscribers from "../bookingSubscribers.js";
import type * as bookings from "../bookings.js";
import type * as chat from "../chat.js";
import type * as chatPrivacy from "../chatPrivacy.js";
import type * as chats from "../chats.js";
import type * as circleMembers from "../circleMembers.js";
import type * as circleMessages from "../circleMessages.js";
import type * as circles from "../circles.js";
import type * as circlesAI from "../circlesAI.js";
import type * as contentTriggers from "../contentTriggers.js";
import type * as courseProgress from "../courseProgress.js";
import type * as courses from "../courses.js";
import type * as coursesAI from "../coursesAI.js";
import type * as cron from "../cron.js";
import type * as crossTabIntelligence from "../crossTabIntelligence.js";
import type * as debugContent from "../debugContent.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as emails from "../emails.js";
import type * as engagement from "../engagement.js";
import type * as ercasPayActions from "../ercasPayActions.js";
import type * as ercasPayMutations from "../ercasPayMutations.js";
import type * as ercaspay from "../ercaspay.js";
import type * as events from "../events.js";
import type * as expertRequests from "../expertRequests.js";
import type * as feed from "../feed.js";
import type * as feedAI from "../feedAI.js";
import type * as files from "../files.js";
import type * as follows from "../follows.js";
import type * as http from "../http.js";
import type * as initializeAI from "../initializeAI.js";
import type * as initializeAIBasic from "../initializeAIBasic.js";
import type * as intelligentTiming from "../intelligentTiming.js";
import type * as liveStream from "../liveStream.js";
import type * as livekit from "../livekit.js";
import type * as livekitActions from "../livekitActions.js";
import type * as migrations from "../migrations.js";
import type * as migrations_approveAllExistingContent from "../migrations/approveAllExistingContent.js";
import type * as migrations_migrateToMultiCurrency from "../migrations/migrateToMultiCurrency.js";
import type * as migrations_removeSellerAddress from "../migrations/removeSellerAddress.js";
import type * as migrations_setExistingContentPublic from "../migrations/setExistingContentPublic.js";
import type * as moderation from "../moderation.js";
import type * as moderationActions from "../moderationActions.js";
import type * as moderationHelpers from "../moderationHelpers.js";
import type * as moderationQueries from "../moderationQueries.js";
import type * as moderationSettings from "../moderationSettings.js";
import type * as notificationAnalytics from "../notificationAnalytics.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as paystack from "../paystack.js";
import type * as paystackCache from "../paystackCache.js";
import type * as paystackWebhook from "../paystackWebhook.js";
import type * as profileQueries from "../profileQueries.js";
import type * as profiles from "../profiles.js";
import type * as recommendationMetrics from "../recommendationMetrics.js";
import type * as reels from "../reels.js";
import type * as referrals from "../referrals.js";
import type * as scheduledJobs from "../scheduledJobs.js";
import type * as search from "../search.js";
import type * as setupModeration from "../setupModeration.js";
import type * as signup from "../signup.js";
import type * as streamComments from "../streamComments.js";
import type * as testArticles from "../testArticles.js";
import type * as testData from "../testData.js";
import type * as testMigration from "../testMigration.js";
import type * as userInterestTracking from "../userInterestTracking.js";
import type * as userInterests from "../userInterests.js";
import type * as users from "../users.js";
import type * as wallets_bankAccounts from "../wallets/bankAccounts.js";
import type * as wallets_createWallet from "../wallets/createWallet.js";
import type * as wallets_depositFunds from "../wallets/depositFunds.js";
import type * as wallets_getMyWallet from "../wallets/getMyWallet.js";
import type * as wallets_getTransactionHistory from "../wallets/getTransactionHistory.js";
import type * as wallets_getWalletBalance from "../wallets/getWalletBalance.js";
import type * as wallets_transferFunds from "../wallets/transferFunds.js";
import type * as wallets_updatePrimaryCurrency from "../wallets/updatePrimaryCurrency.js";
import type * as wallets_withdrawFunds from "../wallets/withdrawFunds.js";
import type * as wallets_withdrawalMutations from "../wallets/withdrawalMutations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ads: typeof ads;
  aiRecommendations: typeof aiRecommendations;
  articles: typeof articles;
  auth: typeof auth;
  autoInitializeAI: typeof autoInitializeAI;
  batchingService: typeof batchingService;
  bookingAI: typeof bookingAI;
  bookingNotifications: typeof bookingNotifications;
  bookingSettings: typeof bookingSettings;
  bookingSubscribers: typeof bookingSubscribers;
  bookings: typeof bookings;
  chat: typeof chat;
  chatPrivacy: typeof chatPrivacy;
  chats: typeof chats;
  circleMembers: typeof circleMembers;
  circleMessages: typeof circleMessages;
  circles: typeof circles;
  circlesAI: typeof circlesAI;
  contentTriggers: typeof contentTriggers;
  courseProgress: typeof courseProgress;
  courses: typeof courses;
  coursesAI: typeof coursesAI;
  cron: typeof cron;
  crossTabIntelligence: typeof crossTabIntelligence;
  debugContent: typeof debugContent;
  emailTemplates: typeof emailTemplates;
  emails: typeof emails;
  engagement: typeof engagement;
  ercasPayActions: typeof ercasPayActions;
  ercasPayMutations: typeof ercasPayMutations;
  ercaspay: typeof ercaspay;
  events: typeof events;
  expertRequests: typeof expertRequests;
  feed: typeof feed;
  feedAI: typeof feedAI;
  files: typeof files;
  follows: typeof follows;
  http: typeof http;
  initializeAI: typeof initializeAI;
  initializeAIBasic: typeof initializeAIBasic;
  intelligentTiming: typeof intelligentTiming;
  liveStream: typeof liveStream;
  livekit: typeof livekit;
  livekitActions: typeof livekitActions;
  migrations: typeof migrations;
  "migrations/approveAllExistingContent": typeof migrations_approveAllExistingContent;
  "migrations/migrateToMultiCurrency": typeof migrations_migrateToMultiCurrency;
  "migrations/removeSellerAddress": typeof migrations_removeSellerAddress;
  "migrations/setExistingContentPublic": typeof migrations_setExistingContentPublic;
  moderation: typeof moderation;
  moderationActions: typeof moderationActions;
  moderationHelpers: typeof moderationHelpers;
  moderationQueries: typeof moderationQueries;
  moderationSettings: typeof moderationSettings;
  notificationAnalytics: typeof notificationAnalytics;
  notifications: typeof notifications;
  payments: typeof payments;
  paystack: typeof paystack;
  paystackCache: typeof paystackCache;
  paystackWebhook: typeof paystackWebhook;
  profileQueries: typeof profileQueries;
  profiles: typeof profiles;
  recommendationMetrics: typeof recommendationMetrics;
  reels: typeof reels;
  referrals: typeof referrals;
  scheduledJobs: typeof scheduledJobs;
  search: typeof search;
  setupModeration: typeof setupModeration;
  signup: typeof signup;
  streamComments: typeof streamComments;
  testArticles: typeof testArticles;
  testData: typeof testData;
  testMigration: typeof testMigration;
  userInterestTracking: typeof userInterestTracking;
  userInterests: typeof userInterests;
  users: typeof users;
  "wallets/bankAccounts": typeof wallets_bankAccounts;
  "wallets/createWallet": typeof wallets_createWallet;
  "wallets/depositFunds": typeof wallets_depositFunds;
  "wallets/getMyWallet": typeof wallets_getMyWallet;
  "wallets/getTransactionHistory": typeof wallets_getTransactionHistory;
  "wallets/getWalletBalance": typeof wallets_getWalletBalance;
  "wallets/transferFunds": typeof wallets_transferFunds;
  "wallets/updatePrimaryCurrency": typeof wallets_updatePrimaryCurrency;
  "wallets/withdrawFunds": typeof wallets_withdrawFunds;
  "wallets/withdrawalMutations": typeof wallets_withdrawalMutations;
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

export declare const components: {
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
};
