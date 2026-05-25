import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// User activity tracking
export interface UserActivity {
  userId: string;
  lastActiveAt: number;
  sessionCount: number;
  averageSessionDuration: number;
  preferredActiveHours: number[]; // Hours of day when user is typically active (0-23)
  timezone: string;
}

// Intelligent timing configuration
export const TIMING_CONFIG = {
  ACTIVE_USER_THRESHOLD_MINUTES: 15, // Consider user active if seen within 15 minutes
  EMAIL_DELAY_WHEN_ACTIVE_MINUTES: 30, // Delay email notifications when user is active
  QUIET_HOURS_DEFAULT_START: "22:00",
  QUIET_HOURS_DEFAULT_END: "08:00",
  DIGEST_DELIVERY_HOUR: 9, // Default hour to send digest emails (9 AM)
  MAX_NOTIFICATIONS_PER_HOUR: 5, // Rate limiting
  BATCH_PROCESSING_INTERVAL_MINUTES: 5,
};

// Track user activity
export const trackUserActivity = internalMutation({
  args: {
    userId: v.id("users"),
    sessionDuration: v.optional(v.number()), // in milliseconds
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get or create user activity record
    let userActivity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (userActivity) {
      // Update existing activity
      const newSessionCount = userActivity.sessionCount + 1;
      const newAverageDuration = args.sessionDuration 
        ? (userActivity.averageSessionDuration * userActivity.sessionCount + args.sessionDuration) / newSessionCount
        : userActivity.averageSessionDuration;

      await ctx.db.patch(userActivity._id, {
        lastActiveAt: now,
        sessionCount: newSessionCount,
        averageSessionDuration: newAverageDuration,
        updatedAt: now
      });
    } else {
      // Create new activity record
      await ctx.db.insert("userActivity", {
        userId: args.userId,
        lastActiveAt: now,
        sessionCount: 1,
        averageSessionDuration: args.sessionDuration || 0,
        preferredActiveHours: [], // Will be calculated over time
        timezone: "UTC", // Default, should be updated from user profile
        createdAt: now,
        updatedAt: now
      });
    }

    // Update preferred active hours based on current time
    await updatePreferredActiveHours(ctx, args.userId, now);
  },
});

// Update user's preferred active hours based on activity patterns
async function updatePreferredActiveHours(ctx: any, userId: string, timestamp: number) {
  const userActivity = await ctx.db
    .query("userActivity")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!userActivity) return;

  const currentHour = new Date(timestamp).getUTCHours();
  const preferredHours = userActivity.preferredActiveHours || [];
  
  // Add current hour if not already tracked
  if (!preferredHours.includes(currentHour)) {
    const updatedHours = [...preferredHours, currentHour].sort((a, b) => a - b);
    
    await ctx.db.patch(userActivity._id, {
      preferredActiveHours: updatedHours
    });
  }
}

// Check if user is currently active
export const isUserActive = internalQuery({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const userActivity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!userActivity) return false;

    const now = Date.now();
    const thresholdTime = now - (TIMING_CONFIG.ACTIVE_USER_THRESHOLD_MINUTES * 60 * 1000);
    
    return userActivity.lastActiveAt > thresholdTime;
  },
});

// Calculate optimal delivery time for a notification
export const calculateOptimalDeliveryTime = internalQuery({
  args: {
    userId: v.id("users"),
    notificationPriority: v.string(),
    batchingPreference: v.string()
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // High priority notifications are always immediate
    if (args.notificationPriority === 'high') {
      return { deliveryTime: now, reason: 'high_priority' };
    }

    // Get user settings and activity
    const [userActivity, userSettings] = await Promise.all([
      ctx.db.query("userActivity").withIndex("by_user", (q: any) => q.eq("userId", args.userId)).first(),
      ctx.db.query("notificationSettings").withIndex("by_user", (q: any) => q.eq("userId", args.userId)).first()
    ]);

    // Check if user is currently active
    const isActive = userActivity && 
      (now - userActivity.lastActiveAt) < (TIMING_CONFIG.ACTIVE_USER_THRESHOLD_MINUTES * 60 * 1000);

    // Check quiet hours
    const inQuietHours = userSettings?.quietHours?.enabled && 
      isInQuietHours(now, userSettings.quietHours);

    // Calculate delivery time based on various factors
    if (args.batchingPreference === 'immediate') {
      if (inQuietHours) {
        // Schedule for after quiet hours
        const nextDeliveryTime = calculateNextDeliveryAfterQuietHours(now, userSettings!.quietHours!);
        return { deliveryTime: nextDeliveryTime, reason: 'quiet_hours' };
      } else if (isActive && args.notificationPriority === 'low') {
        // Only delay low priority notifications when user is active
        const delayTime = now + (TIMING_CONFIG.EMAIL_DELAY_WHEN_ACTIVE_MINUTES * 60 * 1000);
        return { deliveryTime: delayTime, reason: 'user_active_delay' };
      } else {
        return { deliveryTime: now, reason: 'immediate' };
      }
    } else if (args.batchingPreference === 'batched') {
      // Batch notifications - delay by 5-10 minutes for grouping
      const batchDelay = 5 * 60 * 1000; // 5 minutes
      let deliveryTime = now + batchDelay;

      if (inQuietHours) {
        deliveryTime = calculateNextDeliveryAfterQuietHours(now, userSettings!.quietHours!);
      }

      return { deliveryTime, reason: 'batching' };
    } else if (args.batchingPreference === 'digest') {
      // Digest mode - schedule for next digest time
      const digestTime = calculateNextDigestTime(now, userActivity, userSettings);
      return { deliveryTime: digestTime, reason: 'digest' };
    }

    return { deliveryTime: now, reason: 'default' };
  },
});

// Check if current time is within quiet hours
function isInQuietHours(timestamp: number, quietHours: any): boolean {
  const date = new Date(timestamp);
  const currentTime = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(quietHours.startTime);
  const end = timeToMinutes(quietHours.endTime);

  if (start <= end) {
    // Same day range (e.g., 09:00 to 17:00)
    return current >= start && current <= end;
  } else {
    // Overnight range (e.g., 22:00 to 08:00)
    return current >= start || current <= end;
  }
}

// Convert time string to minutes since midnight
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Calculate next delivery time after quiet hours
function calculateNextDeliveryAfterQuietHours(timestamp: number, quietHours: any): number {
  const date = new Date(timestamp);
  const endTime = quietHours.endTime;
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  // Set to end of quiet hours
  const nextDelivery = new Date(date);
  nextDelivery.setHours(endHours, endMinutes, 0, 0);

  // If end time is tomorrow (overnight quiet hours)
  if (nextDelivery <= date) {
    nextDelivery.setDate(nextDelivery.getDate() + 1);
  }

  return nextDelivery.getTime();
}

// Calculate next digest delivery time
function calculateNextDigestTime(timestamp: number, userActivity: any, userSettings: any): number {
  const date = new Date(timestamp);
  const digestHour = TIMING_CONFIG.DIGEST_DELIVERY_HOUR;

  // Use user's preferred active hours if available
  const preferredHours = userActivity?.preferredActiveHours || [];
  const targetHour = preferredHours.length > 0 ? Math.min(...preferredHours) : digestHour;

  const nextDigest = new Date(date);
  nextDigest.setHours(targetHour, 0, 0, 0);

  // If target time has passed today, schedule for tomorrow
  if (nextDigest <= date) {
    nextDigest.setDate(nextDigest.getDate() + 1);
  }

  // Respect quiet hours
  if (userSettings?.quietHours?.enabled) {
    const digestTime = `${targetHour.toString().padStart(2, '0')}:00`;
    if (isInQuietHours(nextDigest.getTime(), userSettings.quietHours)) {
      return calculateNextDeliveryAfterQuietHours(nextDigest.getTime(), userSettings.quietHours);
    }
  }

  return nextDigest.getTime();
}

// Rate limiting: check if user has exceeded notification limits
export const checkNotificationRateLimit = internalQuery({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gte(q.field("createdAt"), oneHourAgo))
      .collect();

    const notificationCount = recentNotifications.length;
    const isLimited = notificationCount >= TIMING_CONFIG.MAX_NOTIFICATIONS_PER_HOUR;

    return {
      isLimited,
      currentCount: notificationCount,
      maxPerHour: TIMING_CONFIG.MAX_NOTIFICATIONS_PER_HOUR,
      resetTime: now + (60 * 60 * 1000) // Next hour
    };
  },
});

// Process notifications with intelligent timing
export const processIntelligentDelivery = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find notifications scheduled for delivery
    const scheduledNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_scheduled", (q) => q.lte("scheduledFor", now))
      .filter((q) => q.neq(q.field("scheduledFor"), undefined))
      .take(100);

    let processedCount = 0;

    for (const notification of scheduledNotifications) {
      try {
        // Check rate limiting
        const rateLimit = await ctx.runQuery(internal.intelligentTiming.checkNotificationRateLimit, {
          userId: notification.userId
        });

        if (rateLimit.isLimited && notification.priority !== 'high') {
          // Delay non-high priority notifications if rate limited
          const delayTime = now + (30 * 60 * 1000); // 30 minutes
          await ctx.db.patch(notification._id, {
            scheduledFor: delayTime
          });
          continue;
        }

        // Process the notification
        if (notification.deliveryChannels?.includes('email')) {
          await ctx.runMutation(internal.emails.sendNotificationEmail, {
            notificationId: notification._id
          });
        }

        // Clear scheduled time
        await ctx.db.patch(notification._id, {
          scheduledFor: undefined
        });

        processedCount++;
      } catch (error) {
        console.error(`Error processing scheduled notification ${notification._id}:`, error);
      }
    }

    return { processedCount };
  },
});

// Update user timezone from profile
export const updateUserTimezone = internalMutation({
  args: {
    userId: v.id("users"),
    timezone: v.string()
  },
  handler: async (ctx, args) => {
    const userActivity = await ctx.db
      .query("userActivity")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (userActivity) {
      await ctx.db.patch(userActivity._id, {
        timezone: args.timezone,
        updatedAt: Date.now()
      });
    }
  },
});