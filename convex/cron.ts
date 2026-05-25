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

export default crons;