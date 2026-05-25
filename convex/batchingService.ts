import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { NOTIFICATION_TYPES } from "./notifications";

// Batching configuration
export const BATCHING_CONFIG = {
  BATCH_WINDOW_MINUTES: 5, // Group notifications within 5 minutes
  MIN_BATCH_SIZE: 2, // Minimum notifications to create a batch
  MAX_BATCH_SIZE: 10, // Maximum notifications in a single batch
  DIGEST_WINDOW_HOURS: 1, // For digest mode, group notifications within 1 hour
  MAX_DIGEST_SIZE: 50, // Maximum notifications in a digest
};

// Batch notification interface
export interface BatchNotification {
  id: string;
  userId: string;
  type: string;
  notifications: string[]; // Array of notification IDs
  batchCount: number;
  createdAt: number;
  scheduledFor?: number;
  title: string;
  message: string;
  category: string;
  priority: string;
}

// Create or update notification batch
export const createOrUpdateBatch = internalMutation({
  args: {
    userId: v.id("users"),
    notificationType: v.string(),
    newNotificationId: v.id("notifications"),
    batchingMode: v.string(), // 'batched' | 'digest'
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const windowMinutes = args.batchingMode === 'digest' 
      ? BATCHING_CONFIG.DIGEST_WINDOW_HOURS * 60 
      : BATCHING_CONFIG.BATCH_WINDOW_MINUTES;
    const windowStart = now - (windowMinutes * 60 * 1000);

    // Find existing batch for this user and notification type
    const existingBatch = await ctx.db
      .query("notificationBatches")
      .withIndex("by_user_type", (q) => 
        q.eq("userId", args.userId).eq("type", args.notificationType)
      )
      .filter((q) => 
        q.and(
          q.gte(q.field("createdAt"), windowStart),
          q.eq(q.field("processed"), false)
        )
      )
      .first();

    if (existingBatch) {
      // Add to existing batch
      const updatedNotifications = [...existingBatch.notifications, args.newNotificationId];
      const maxSize = args.batchingMode === 'digest' 
        ? BATCHING_CONFIG.MAX_DIGEST_SIZE 
        : BATCHING_CONFIG.MAX_BATCH_SIZE;

      if (updatedNotifications.length <= maxSize) {
        await ctx.db.patch(existingBatch._id, {
          notifications: updatedNotifications,
          batchCount: updatedNotifications.length,
          updatedAt: now
        });

        // Update the new notification with batch ID
        await ctx.db.patch(args.newNotificationId, {
          batchId: existingBatch._id
        });

        return { batchId: existingBatch._id, action: 'updated' };
      } else {
        // Batch is full, process it and create a new one
        await ctx.runMutation(internal.batchingService.processBatch, {
          batchId: existingBatch._id
        });
        return await createNewBatch(ctx, args);
      }
    } else {
      // Create new batch
      return await createNewBatch(ctx, args);
    }
  },
});

// Create a new notification batch
async function createNewBatch(ctx: any, args: any) {
  const now = Date.now();
  const notificationType = NOTIFICATION_TYPES[args.notificationType];
  
  if (!notificationType) {
    throw new Error(`Invalid notification type: ${args.notificationType}`);
  }

  const batchId = await ctx.db.insert("notificationBatches", {
    userId: args.userId,
    type: args.notificationType,
    notifications: [args.newNotificationId],
    batchCount: 1,
    category: notificationType.category,
    priority: notificationType.priority,
    batchingMode: args.batchingMode,
    processed: false,
    createdAt: now,
    updatedAt: now
  });

  // Update the notification with batch ID
  await ctx.db.patch(args.newNotificationId, {
    batchId
  });

  return { batchId, action: 'created' };
}

// Process a batch (send notifications)
export const processBatch = internalMutation({
  args: {
    batchId: v.id("notificationBatches")
  },
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch || batch.processed) {
      return { success: false, error: 'Batch not found or already processed' };
    }

    try {
      // Get all notifications in the batch
      const notifications = await Promise.all(
        batch.notifications.map(id => ctx.db.get(id))
      );

      const validNotifications = notifications.filter(Boolean);
      if (validNotifications.length === 0) {
        await ctx.db.patch(args.batchId, { processed: true });
        return { success: false, error: 'No valid notifications in batch' };
      }

      // Generate batch content
      const batchContent = await generateBatchContent(ctx, validNotifications, batch);

      // Send batch email if email delivery is enabled
      const hasEmailDelivery = validNotifications.some(n => 
        n!.deliveryChannels?.includes('email')
      );

      if (hasEmailDelivery) {
        await ctx.runMutation(internal.emails.sendBatchNotificationEmail, {
          userId: batch.userId,
          notificationIds: batch.notifications,
          batchId: args.batchId
        });
      }

      // Create a summary notification for in-app display
      const summaryNotificationId = await ctx.db.insert("notifications", {
        userId: batch.userId,
        type: `${batch.type}_BATCH`,
        title: batchContent.title,
        message: batchContent.message,
        isRead: false,
        category: batch.category,
        priority: batch.priority,
        batchId: args.batchId,
        batchCount: batch.batchCount,
        deliveryChannels: ['in_app'],
        deliveryStatus: {
          in_app: {
            delivered: true,
            deliveredAt: Date.now(),
            viewed: false
          }
        },
        createdAt: Date.now(),
      });

      // Mark individual notifications as batched (hide from main feed)
      for (const notificationId of batch.notifications) {
        await ctx.db.patch(notificationId, {
          batchedInto: summaryNotificationId,
          hiddenFromFeed: true
        });
      }

      // Mark batch as processed
      await ctx.db.patch(args.batchId, {
        processed: true,
        processedAt: Date.now(),
        summaryNotificationId
      });

      return { 
        success: true, 
        batchId: args.batchId,
        summaryNotificationId,
        notificationCount: batch.batchCount 
      };

    } catch (error) {
      console.error('Error processing batch:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

// Generate batch content based on notification type and count
async function generateBatchContent(ctx: any, notifications: any[], batch: any) {
  const notificationType = NOTIFICATION_TYPES[batch.type];
  const count = notifications.length;

  // Get unique actors
  const actors = new Set();
  const contentItems = new Set();

  for (const notification of notifications) {
    if (notification.actorUserId) {
      const actorProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q: any) => q.eq("userId", notification.actorUserId))
        .first();
      if (actorProfile) {
        actors.add(actorProfile.name || actorProfile.username);
      }
    }

    if (notification.relatedContentId) {
      const contentTitle = await getContentTitle(ctx, notification.relatedContentType, notification.relatedContentId);
      contentItems.add(contentTitle);
    }
  }

  const actorList = Array.from(actors);
  const contentList = Array.from(contentItems);

  // Generate title and message based on notification type
  switch (batch.type) {
    case 'CONTENT_LIKED':
      return {
        title: `${count} new likes`,
        message: count === 1 
          ? `${actorList[0]} liked your content`
          : `${actorList.slice(0, 2).join(', ')}${actorList.length > 2 ? ` and ${actorList.length - 2} others` : ''} liked your content`
      };

    case 'CONTENT_CLAPPED':
      return {
        title: `${count} new claps`,
        message: count === 1
          ? `${actorList[0]} clapped for your content`
          : `${actorList.slice(0, 2).join(', ')}${actorList.length > 2 ? ` and ${actorList.length - 2} others` : ''} clapped for your content`
      };

    case 'NEW_FOLLOWER':
      return {
        title: `${count} new followers`,
        message: count === 1
          ? `${actorList[0]} started following you`
          : `${actorList.slice(0, 2).join(', ')}${actorList.length > 2 ? ` and ${actorList.length - 2} others` : ''} started following you`
      };

    case 'CONTENT_COMMENTED':
      return {
        title: `${count} new comments`,
        message: count === 1
          ? `${actorList[0]} commented on your content`
          : `${actorList.slice(0, 2).join(', ')}${actorList.length > 2 ? ` and ${actorList.length - 2} others` : ''} commented on your content`
      };

    case 'FOLLOWER_NEW_POST':
      return {
        title: `${count} new posts from people you follow`,
        message: contentList.length === 1
          ? `New content: "${contentList[0]}"`
          : `${count} new posts from people you follow`
      };

    default:
      return {
        title: `${count} new ${notificationType?.name || 'notifications'}`,
        message: `You have ${count} new ${notificationType?.name?.toLowerCase() || 'notifications'}`
      };
  }
}

// Helper function to get content title
async function getContentTitle(ctx: any, contentType?: string, contentId?: string): Promise<string> {
  if (!contentType || !contentId) return 'content';

  try {
    if (contentType === 'article') {
      const article = await ctx.db.get(contentId);
      return article?.title || 'article';
    } else if (contentType === 'reel') {
      const reel = await ctx.db.get(contentId);
      return reel?.caption || 'reel';
    }
  } catch (error) {
    // Content might have been deleted
  }

  return contentType;
}

// Get pending batches for processing
export const getPendingBatches = internalQuery({
  args: {
    olderThanMinutes: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cutoffTime = now - ((args.olderThanMinutes || 5) * 60 * 1000);

    return await ctx.db
      .query("notificationBatches")
      .filter((q) =>
        q.and(
          q.eq(q.field("processed"), false),
          q.lte(q.field("createdAt"), cutoffTime),
          q.gte(q.field("batchCount"), BATCHING_CONFIG.MIN_BATCH_SIZE)
        )
      )
      .take(50);
  },
});

// Process all pending batches
export const processAllPendingBatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pendingBatches = await ctx.runQuery(internal.batchingService.getPendingBatches, {});
    
    let processedCount = 0;
    for (const batch of pendingBatches) {
      try {
        await ctx.runMutation(internal.batchingService.processBatch, {
          batchId: batch._id
        });
        processedCount++;
      } catch (error) {
        console.error(`Error processing batch ${batch._id}:`, error);
      }
    }

    return { processedCount };
  },
});

// Clean up old processed batches
export const cleanupOldBatches = internalMutation({
  args: {
    olderThanDays: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - ((args.olderThanDays || 7) * 24 * 60 * 60 * 1000);

    const oldBatches = await ctx.db
      .query("notificationBatches")
      .filter((q) =>
        q.and(
          q.eq(q.field("processed"), true),
          q.lte(q.field("processedAt"), cutoffTime)
        )
      )
      .collect();

    for (const batch of oldBatches) {
      await ctx.db.delete(batch._id);
    }

    return { deletedCount: oldBatches.length };
  },
});