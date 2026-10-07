import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 5 minutes to update booking statuses
crons.interval(
  "update booking statuses",
  { minutes: 5 },
  internal.bookings.updateBookingStatusByTime
);

// Run every hour to auto-complete expired sessions
crons.interval(
  "auto complete expired sessions",
  { minutes: 60 },
  internal.bookings.autoCompleteExpiredSessions
);

// AI Recommendation System Cron Jobs

// Run every 6 hours to analyze new/expired content
crons.interval(
  "analyze content with AI",
  { hours: 6 },
  internal.scheduledJobs.batchAnalyzeContent
);

// Run daily at 2 AM to generate recommendations for all users
crons.daily(
  "generate user recommendations",
  { hourUTC: 2, minuteUTC: 0 },
  internal.scheduledJobs.generateAllUserRecommendations
);

// Run every 12 hours to clean up expired caches
crons.interval(
  "cleanup expired caches",
  { hours: 12 },
  internal.scheduledJobs.cleanupExpiredCaches
);

// Run every hour to update user interests from engagement
crons.interval(
  "update user interests",
  { hours: 1 },
  internal.scheduledJobs.updateUserInterestsFromEngagement
);

// Provider Tier System Cron Jobs

// Run daily at 3 AM to check provider inactivity and apply warnings/demotions
crons.daily(
  "check provider inactivity",
  { hourUTC: 3, minuteUTC: 0 },
  internal.tierCalculation.checkInactivityDemotions
);

// Run monthly on 1st at 4 AM for full provider tier recalculations
crons.monthly(
  "monthly tier recalculation",
  { day: 1, hourUTC: 4, minuteUTC: 0 },
  internal.tierCalculation.batchRecalculateAllProviders
);

// Run daily at 5 AM to check tenure anniversaries and award tenure EXP
crons.daily(
  "check tenure anniversaries",
  { hourUTC: 5, minuteUTC: 0 },
  internal.providerExp.checkTenureAnniversaries
);

// Run daily at 1 AM to validate provider licences and flag expirations for admin review
crons.daily(
  "validate provider licences",
  { hourUTC: 1, minuteUTC: 0 },
  (internal as any).tierRevalidation.validateProviderLicences
);

export default crons;