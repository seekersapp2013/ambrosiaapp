import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Notification Types Registry
export interface NotificationType {
  id: string;
  name: string;
  description: string;
  category: 'engagement' | 'social' | 'content' | 'system';
  priority: 'low' | 'medium' | 'high';
  batchable: boolean;
  defaultChannels: string[];
}

export const NOTIFICATION_TYPES: Record<string, NotificationType> = {
  NEW_FOLLOWER: {
    id: 'NEW_FOLLOWER',
    name: 'New Follower',
    description: 'Someone started following you',
    category: 'social',
    priority: 'medium',
    batchable: true,
    defaultChannels: ['in_app', 'email']
  },
  FOLLOWER_NEW_POST: {
    id: 'FOLLOWER_NEW_POST',
    name: 'New Post from Following',
    description: 'Someone you follow posted new content',
    category: 'content',
    priority: 'low',
    batchable: true,
    defaultChannels: ['in_app', 'email']
  },
  CONTENT_LIKED: {
    id: 'CONTENT_LIKED',
    name: 'Content Liked',
    description: 'Someone liked your content',
    category: 'engagement',
    priority: 'low',
    batchable: true,
    defaultChannels: ['in_app', 'email']
  },
  CONTENT_CLAPPED: {
    id: 'CONTENT_CLAPPED',
    name: 'Content Clapped',
    description: 'Someone clapped for your content',
    category: 'engagement',
    priority: 'medium',
    batchable: true,
    defaultChannels: ['in_app', 'email']
  },
  CONTENT_COMMENTED: {
    id: 'CONTENT_COMMENTED',
    name: 'New Comment',
    description: 'Someone commented on your content',
    category: 'engagement',
    priority: 'medium',
    batchable: false,
    defaultChannels: ['in_app', 'email']
  },
  COMMENT_REPLY: {
    id: 'COMMENT_REPLY',
    name: 'Comment Reply',
    description: 'Someone replied to your comment',
    category: 'engagement',
    priority: 'medium',
    batchable: false,
    defaultChannels: ['in_app', 'email']
  },
  CONTENT_PAYMENT: {
    id: 'CONTENT_PAYMENT',
    name: 'Content Payment',
    description: 'Someone paid to access your content',
    category: 'engagement',
    priority: 'high',
    batchable: false,
    defaultChannels: ['in_app', 'email']
  },
  WALLET_DEPOSIT: {
    id: 'WALLET_DEPOSIT',
    name: 'Wallet Deposit',
    description: 'Funds were deposited to your wallet',
    category: 'system',
    priority: 'medium',
    batchable: false,
    defaultChannels: ['in_app']
  },
  WALLET_WITHDRAWAL: {
    id: 'WALLET_WITHDRAWAL',
    name: 'Wallet Withdrawal',
    description: 'Funds were withdrawn from your wallet',
    category: 'system',
    priority: 'medium',
    batchable: false,
    defaultChannels: ['in_app']
  },
  WALLET_TRANSFER_SENT: {
    id: 'WALLET_TRANSFER_SENT',
    name: 'Transfer Sent',
    description: 'You sent funds to another user',
    category: 'system',
    priority: 'medium',
    batchable: false,
    defaultChannels: ['in_app']
  },
  WALLET_TRANSFER_RECEIVED: {
    id: 'WALLET_TRANSFER_RECEIVED',
    name: 'Transfer Received',
    description: 'You received funds from another user',
    category: 'system',
    priority: 'medium',
    batchable: false,
    defaultChannels: ['in_app']
  },
  USER_MENTIONED: {
    id: 'USER_MENTIONED',
    name: 'User Mentioned',
    description: 'You were mentioned in content or comments',
    category: 'social',
    priority: 'high',
    batchable: false,
    defaultChannels: ['in_app', 'email']
  },
  NEW_COURSE: {
    id: 'NEW_COURSE',
    name: 'New Course',
    description: 'Someone you follow published a new course',
    category: 'content',
    priority: 'medium',
    batchable: true,
    defaultChannels: ['in_app', 'email']
  },
  COURSE_STARTED: {
    id: 'COURSE_STARTED',
    name: 'Course Started',
    description: 'Someone enrolled in your course',
    category: 'engagement',
    priority: 'medium',
    batchable: true,
    defaultChannels: ['in_app', 'email']
  },
  COURSE_COMPLETED: {
    id: 'COURSE_COMPLETED',
    name: 'Course Completed',
    description: 'Someone completed your course',
    category: 'engagement',
    priority: 'high',
    batchable: false,
    defaultChannels: ['in_app', 'email']
  },
  COURSE_PROGRESS: {
    id: 'COURSE_PROGRESS',
    name: 'Course Progress',
    description: 'You reached a milestone in a course',
    category: 'content',
    priority: 'low',
    batchable: true,
    defaultChannels: ['in_app']
  }
};

// Notification Event Interface
export interface NotificationEvent {
  type: string;
  recipientUserId: string;
  actorUserId?: string;
  relatedContentType?: string;
  relatedContentId?: string;
  metadata?: Record<string, any>;
}

// Enhanced notification processing pipeline
export const processNotificationEvent = internalMutation({
  args: {
    type: v.string(),
    recipientUserId: v.id("users"),
    actorUserId: v.optional(v.id("users")),
    relatedContentType: v.optional(v.string()),
    relatedContentId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    priority: v.optional(v.string()), // Override default priority
    forceImmediate: v.optional(v.boolean()), // Skip batching
  },
  handler: async (ctx, args) => {
    try {
      // Step 1: Validate notification type
      const notificationType = NOTIFICATION_TYPES[args.type];
      if (!notificationType) {
        console.error(`Invalid notification type: ${args.type}`);
        return { success: false, error: 'Invalid notification type' };
      }

      // Step 2: Validate recipient exists
      const recipient = await ctx.db.get(args.recipientUserId);
      if (!recipient) {
        console.error(`Recipient user not found: ${args.recipientUserId}`);
        return { success: false, error: 'Recipient not found' };
      }

      // Step 3: Don't create notification if actor is the same as recipient
      if (args.actorUserId && args.actorUserId === args.recipientUserId) {
        return { success: true, skipped: 'Same user' };
      }

      // Step 4: Ensure user has notification settings and get them
      await ctx.runMutation(internal.notifications.ensureUserNotificationSettings, {
        userId: args.recipientUserId
      });
      const userSettings = await getUserNotificationSettings(ctx, args.recipientUserId, args.type);
      if (!userSettings.enabled) {
        return { success: true, skipped: 'User disabled' };
      }

      // Step 5: Determine delivery channels
      const deliveryChannels = Object.entries(userSettings.channels)
        .filter(([_, enabled]) => enabled)
        .map(([channel, _]) => channel);

      if (deliveryChannels.length === 0) {
        return { success: true, skipped: 'No channels enabled' };
      }

      // Step 6: Check for batching opportunities (if not forced immediate)
      const effectivePriority = args.priority || notificationType.priority;
      const shouldBatch = !args.forceImmediate &&
        notificationType.batchable &&
        effectivePriority !== 'high' &&
        (userSettings.batchingPreference === 'batched' || userSettings.batchingPreference === 'digest');

      // Step 7: Create individual notification
      const notificationId = await createIndividualNotification(ctx, args, notificationType, userSettings, deliveryChannels);

      if (shouldBatch) {
        // Add to batch instead of immediate delivery
        await ctx.runMutation(internal.batchingService.createOrUpdateBatch, {
          userId: args.recipientUserId,
          notificationType: args.type,
          newNotificationId: notificationId,
          batchingMode: userSettings.batchingPreference
        });
        return { success: true, batched: true, notificationId };
      }

      // Step 8: Schedule delivery based on intelligent timing
      await scheduleIntelligentDelivery(ctx, notificationId, userSettings, effectivePriority);

      return { success: true, notificationId };

    } catch (error) {
      console.error('Error processing notification event:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Legacy function - now calls the enhanced processor
export const createNotificationEvent = internalMutation({
  args: {
    type: v.string(),
    recipientUserId: v.id("users"),
    actorUserId: v.optional(v.id("users")),
    relatedContentType: v.optional(v.string()),
    relatedContentId: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args): Promise<string | undefined> => {
    const result: any = await ctx.runMutation(internal.notifications.processNotificationEvent, args);
    return result.notificationId;
  },
});

// Helper function to get user notification settings
async function getUserNotificationSettings(ctx: any, userId: string, notificationType: string) {
  const settings = await ctx.db
    .query("notificationSettings")
    .withIndex("by_user_type", (q: any) => q.eq("userId", userId).eq("notificationType", notificationType))
    .first();

  if (settings) {
    return settings;
  }

  // Return default settings if none exist
  const typeConfig = NOTIFICATION_TYPES[notificationType];
  return {
    enabled: true,
    channels: {
      in_app: typeConfig.defaultChannels.includes('in_app'),
      email: typeConfig.defaultChannels.includes('email'),
      whatsapp: typeConfig.defaultChannels.includes('whatsapp'),
      sms: typeConfig.defaultChannels.includes('sms'),
      push: typeConfig.defaultChannels.includes('push')
    },
    batchingPreference: 'immediate'
  };
}

// Helper function to generate notification content
async function generateNotificationContent(
  ctx: any,
  notificationType: NotificationType,
  actorProfile: any,
  relatedContentType?: string,
  relatedContentId?: string,
  metadata?: any
): Promise<{ title: string; message: string }> {
  const actorName = actorProfile?.name || actorProfile?.username || 'Someone';

  switch (notificationType.id) {
    case 'NEW_FOLLOWER':
      return {
        title: 'New Follower',
        message: `${actorName} started following you`
      };

    case 'CONTENT_LIKED':
      const likedContent = await getContentTitle(ctx, relatedContentType, relatedContentId);
      return {
        title: 'Content Liked',
        message: `${actorName} liked your ${relatedContentType}: "${likedContent}"`
      };

    case 'CONTENT_CLAPPED':
      const clappedContent = await getContentTitle(ctx, relatedContentType, relatedContentId);
      return {
        title: 'Content Clapped',
        message: `${actorName} clapped for your ${relatedContentType}: "${clappedContent}"`
      };

    case 'CONTENT_COMMENTED':
      const commentedContent = await getContentTitle(ctx, relatedContentType, relatedContentId);
      return {
        title: 'New Comment',
        message: `${actorName} commented on your ${relatedContentType}: "${commentedContent}"`
      };

    case 'COMMENT_REPLY':
      return {
        title: 'Comment Reply',
        message: `${actorName} replied to your comment`
      };

    case 'CONTENT_PAYMENT':
      const paidContent = await getContentTitle(ctx, relatedContentType, relatedContentId);
      const amount = metadata?.amount || 'some';
      const token = metadata?.token || 'tokens';
      return {
        title: 'Content Payment',
        message: `${actorName} paid ${amount} ${token} to access your ${relatedContentType}: "${paidContent}"`
      };

    case 'USER_MENTIONED':
      return {
        title: 'You were mentioned',
        message: `${actorName} mentioned you in a ${relatedContentType}`
      };

    case 'WALLET_DEPOSIT':
      const depositAmount = metadata?.amount || '0';
      const depositCurrency = metadata?.currency || 'USD';
      return {
        title: 'Wallet Deposit',
        message: `${depositCurrency === 'NGN' ? '₦' : '$'}${depositAmount} has been deposited to your wallet`
      };

    case 'WALLET_WITHDRAWAL':
      const withdrawAmount = metadata?.amount || '0';
      const withdrawCurrency = metadata?.currency || 'USD';
      return {
        title: 'Wallet Withdrawal',
        message: `${withdrawCurrency === 'NGN' ? '₦' : '$'}${withdrawAmount} has been withdrawn from your wallet`
      };

    case 'WALLET_TRANSFER_SENT':
      const sentAmount = metadata?.amount || '0';
      const sentCurrency = metadata?.currency || 'USD';
      const recipientUsername = metadata?.recipientUsername || 'user';
      return {
        title: 'Transfer Sent',
        message: `You sent ${sentCurrency === 'NGN' ? '₦' : '$'}${sentAmount} to @${recipientUsername}`
      };

    case 'WALLET_TRANSFER_RECEIVED':
      const receivedAmount = metadata?.amount || '0';
      const receivedCurrency = metadata?.currency || 'USD';
      const senderUsername = metadata?.senderUsername || 'user';
      return {
        title: 'Transfer Received',
        message: `You received ${receivedCurrency === 'NGN' ? '₦' : '$'}${receivedAmount} from @${senderUsername}`
      };

    case 'FOLLOWER_NEW_POST':
      const newContent = await getContentTitle(ctx, relatedContentType, relatedContentId);
      return {
        title: 'New Post',
        message: `${actorName} published a new ${relatedContentType}: "${newContent}"`
      };

    default:
      return {
        title: notificationType.name,
        message: notificationType.description
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

// Helper function to generate email content for notifications
async function generateNotificationEmailContent(
  ctx: any,
  notificationType: NotificationType,
  actorProfile: any,
  recipientProfile: any,
  relatedContentType?: string,
  relatedContentId?: string,
  metadata?: any
): Promise<{ subject: string; html: string; text: string }> {
  const actorName = actorProfile?.name || actorProfile?.username || 'Someone';
  const recipientName = recipientProfile?.name || recipientProfile?.username || 'there';
  const contentTitle = await getContentTitle(ctx, relatedContentType, relatedContentId);
  const appUrl = process.env.SITE_URL || 'https://oathstone.cloud';

  let subject = '';
  let message = '';

  switch (notificationType.id) {
    case 'NEW_FOLLOWER':
      subject = `${actorName} started following you on Ambrosia`;
      message = `${actorName} started following you. Check out their profile and see what they're sharing!`;
      break;

    case 'CONTENT_LIKED':
      subject = `${actorName} liked your ${relatedContentType}`;
      message = `${actorName} liked your ${relatedContentType}: "${contentTitle}". Your content is getting noticed!`;
      break;

    case 'CONTENT_CLAPPED':
      subject = `${actorName} clapped for your ${relatedContentType}`;
      message = `${actorName} clapped for your ${relatedContentType}: "${contentTitle}". Great work!`;
      break;

    case 'CONTENT_COMMENTED':
      subject = `${actorName} commented on your ${relatedContentType}`;
      message = `${actorName} left a comment on your ${relatedContentType}: "${contentTitle}". Join the conversation!`;
      break;

    case 'COMMENT_REPLY':
      subject = `${actorName} replied to your comment`;
      message = `${actorName} replied to your comment. See what they had to say!`;
      break;

    case 'WALLET_DEPOSIT':
      const depositAmount = metadata?.amount || '0';
      const depositCurrency = metadata?.currency || 'USD';
      subject = `Wallet Deposit Confirmation`;
      message = `${depositCurrency === 'NGN' ? '₦' : '$'}${depositAmount} has been successfully deposited to your Ambrosia wallet.`;
      break;

    case 'WALLET_WITHDRAWAL':
      const withdrawAmount = metadata?.amount || '0';
      const withdrawCurrency = metadata?.currency || 'USD';
      subject = `Wallet Withdrawal Confirmation`;
      message = `${withdrawCurrency === 'NGN' ? '₦' : '$'}${withdrawAmount} has been successfully withdrawn from your Ambrosia wallet.`;
      break;

    case 'WALLET_TRANSFER_SENT':
      const sentAmount = metadata?.amount || '0';
      const sentCurrency = metadata?.currency || 'USD';
      const recipientUsername = metadata?.recipientUsername || 'user';
      subject = `Transfer Sent Confirmation`;
      message = `You successfully sent ${sentCurrency === 'NGN' ? '₦' : '$'}${sentAmount} to @${recipientUsername}.`;
      break;

    case 'WALLET_TRANSFER_RECEIVED':
      const receivedAmount = metadata?.amount || '0';
      const receivedCurrency = metadata?.currency || 'USD';
      const senderUsername = metadata?.senderUsername || 'user';
      subject = `You Received Funds`;
      message = `You received ${receivedCurrency === 'NGN' ? '₦' : '$'}${receivedAmount} from @${senderUsername} in your Ambrosia wallet.`;
      break;

    case 'CONTENT_PAYMENT':
      const amount = metadata?.amount || 'some';
      const token = metadata?.token || 'tokens';
      subject = `${actorName} paid to access your content`;
      message = `${actorName} paid ${amount} ${token} to access your ${relatedContentType}: "${contentTitle}". You're earning from your content!`;
      break;

    case 'USER_MENTIONED':
      subject = `${actorName} mentioned you`;
      message = `${actorName} mentioned you in a ${relatedContentType}. See what they're talking about!`;
      break;

    case 'FOLLOWER_NEW_POST':
      subject = `${actorName} published new content`;
      message = `${actorName} published a new ${relatedContentType}: "${contentTitle}". Check it out!`;
      break;

    default:
      subject = `New notification from Ambrosia`;
      message = notificationType.description;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Ambrosia</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your crypto wallet dashboard</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">${subject}</h2>
        
        <p style="font-size: 16px; margin-bottom: 25px;">Hi ${recipientName},</p>
        
        <p style="font-size: 16px; margin-bottom: 25px;">${message}</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
            View on Ambrosia
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
          You received this email because you have notifications enabled for ${notificationType.name.toLowerCase()}.
        </p>
        
        <p style="font-size: 14px; color: #666;">
          <a href="${appUrl}/settings/notifications" style="color: #667eea;">Manage your notification preferences</a> | 
          <a href="${appUrl}/unsubscribe" style="color: #667eea;">Unsubscribe</a>
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© 2025 Oathstone. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
${subject}

Hi ${recipientName},

${message}

View on Ambrosia: ${appUrl}

---

You received this email because you have notifications enabled for ${notificationType.name.toLowerCase()}.

Manage your notification preferences: ${appUrl}/settings/notifications
Unsubscribe: ${appUrl}/unsubscribe

© 2025 Oathstone. All rights reserved.
  `.trim();

  return { subject, html, text };
}

// Legacy function for backward compatibility
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Use the new enhanced notification system
    await ctx.runMutation(internal.notifications.createNotificationEvent, {
      type: args.type,
      recipientUserId: args.userId,
      relatedContentId: args.relatedId,
    });
  },
});

export const getMyNotifications = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.string()),
    unreadOnly: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let notifications;

    if (args.unreadOnly) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) =>
          q.eq("userId", userId).eq("isRead", false)
        )
        .order("desc")
        .take(args.limit || 50);
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .take(args.limit || 50);
    }

    // Filter by category if specified
    if (args.category) {
      notifications = notifications.filter(n => n.category === args.category);
    }

    // Enrich notifications with actor information
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        let actorProfile = null;
        if (notification.actorUserId) {
          actorProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", notification.actorUserId!))
            .first();
        }

        return {
          ...notification,
          actor: actorProfile ? {
            id: actorProfile.userId,
            name: actorProfile.name,
            username: actorProfile.username,
            avatar: actorProfile.avatar
          } : null
        };
      })
    );

    return enrichedNotifications;
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();

    return unreadNotifications.length;
  },
});

export const getRecentUnreadNotifications = query({
  args: {
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .order("desc")
      .take(args.limit || 5);

    // Return minimal data for performance
    return notifications.map(notification => ({
      _id: notification._id,
      title: notification.title,
      type: notification.type,
      createdAt: notification.createdAt,
      priority: notification.priority || 'medium'
    }));
  },
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found or access denied");
    }

    // Update delivery status to mark as viewed
    const updatedDeliveryStatus = { ...notification.deliveryStatus || {} };
    if (updatedDeliveryStatus.in_app) {
      updatedDeliveryStatus.in_app = {
        ...updatedDeliveryStatus.in_app,
        viewed: true,
        viewedAt: Date.now()
      };
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      deliveryStatus: updatedDeliveryStatus
    });

    // Track view event
    await ctx.runMutation(internal.notificationAnalytics.trackDeliveryEvent, {
      notificationId: args.notificationId,
      channel: 'in_app',
      event: 'viewed',
      metadata: {
        timestamp: Date.now()
      }
    });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );
  },
});

export const deleteNotification = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    // Verify the notification belongs to the user
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    if (notification.userId !== userId) {
      throw new Error("Not authorized to delete this notification");
    }

    await ctx.db.delete(args.notificationId);
  },
});

// Get all notification types for settings UI
export const getNotificationTypes = query({
  args: {},
  handler: async () => {
    return Object.values(NOTIFICATION_TYPES);
  },
});

// Initialize default notification settings for a new user
export const initializeUserNotificationSettings = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if settings already exist
    const existingSettings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    if (existingSettings.length > 0) {
      return { created: 0, existing: existingSettings.length }; // Settings already exist
    }

    // Create default settings for each notification type
    const now = Date.now();
    let created = 0;
    for (const notificationType of Object.values(NOTIFICATION_TYPES)) {
      await ctx.db.insert("notificationSettings", {
        userId: args.userId,
        notificationType: notificationType.id,
        enabled: true,
        channels: {
          in_app: notificationType.defaultChannels.includes('in_app'),
          email: notificationType.defaultChannels.includes('email'),
          whatsapp: notificationType.defaultChannels.includes('whatsapp'),
          sms: notificationType.defaultChannels.includes('sms'),
          push: notificationType.defaultChannels.includes('push')
        },
        batchingPreference: 'immediate',
        updatedAt: now
      });
      created++;
    }

    return { created, existing: 0 };
  },
});

// Ensure user has notification settings (call this when creating notifications)
export const ensureUserNotificationSettings = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ created: number; existing: number }> => {
    return await ctx.runMutation(internal.notifications.initializeUserNotificationSettings, {
      userId: args.userId
    });
  },
});

// Public function to initialize notification settings for new users (can be called from auth flow)
export const initializeNotificationSettingsForNewUser = mutation({
  args: {},
  handler: async (ctx): Promise<{ created: number; existing: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    return await ctx.runMutation(internal.notifications.initializeUserNotificationSettings, {
      userId
    });
  },
});

// Test function to create a sample notification (for testing email delivery)
export const createTestNotification = mutation({
  args: {
    type: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Ensure user has notification settings
    await ctx.runMutation(internal.notifications.ensureUserNotificationSettings, {
      userId
    });

    // Create a test notification
    const notificationType = args.type || 'NEW_FOLLOWER';
    const result: any = await ctx.runMutation(internal.notifications.processNotificationEvent, {
      type: notificationType,
      recipientUserId: userId,
      actorUserId: userId, // Self-notification for testing
      metadata: {
        test: true,
        message: 'This is a test notification to verify email delivery'
      }
    });

    return result;
  },
});

// Frontend-driven notification creation with immediate email sending (like AuthForm)
export const createNotificationWithEmail = mutation({
  args: {
    type: v.string(),
    recipientUserId: v.id("users"),
    actorUserId: v.optional(v.id("users")),
    relatedContentType: v.optional(v.string()),
    relatedContentId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      // Step 1: Validate notification type
      const notificationType = NOTIFICATION_TYPES[args.type];
      if (!notificationType) {
        throw new Error(`Invalid notification type: ${args.type}`);
      }

      // Step 2: Validate recipient exists
      const recipient = await ctx.db.get(args.recipientUserId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Step 3: Don't create notification if actor is the same as recipient
      if (args.actorUserId && args.actorUserId === args.recipientUserId) {
        return { success: true, skipped: 'Same user' };
      }

      // Step 4: Ensure user has notification settings and get them
      await ctx.runMutation(internal.notifications.ensureUserNotificationSettings, {
        userId: args.recipientUserId
      });
      const userSettings = await getUserNotificationSettings(ctx, args.recipientUserId, args.type);
      
      if (!userSettings.enabled) {
        return { success: true, skipped: 'User disabled notifications' };
      }

      // Step 5: Determine delivery channels based on user settings
      const deliveryChannels = Object.entries(userSettings.channels)
        .filter(([_, enabled]) => enabled)
        .map(([channel, _]) => channel);

      if (deliveryChannels.length === 0) {
        return { success: true, skipped: 'No channels enabled' };
      }

      // Step 6: Create the in-app notification
      const notificationId = await createIndividualNotification(
        ctx, 
        args, 
        notificationType, 
        userSettings, 
        deliveryChannels
      );

      // Step 7: Send email immediately if email channel is enabled (like AuthForm)
      let emailResult = null;
      if (deliveryChannels.includes('email') && recipient.email) {
        try {
          // Get actor profile for email content
          let actorProfile = null;
          if (args.actorUserId) {
            actorProfile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", args.actorUserId!))
              .first();
          }

          // Get recipient profile for email content
          const recipientProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", args.recipientUserId))
            .first();

          // Generate email content based on notification type
          const emailContent = await generateNotificationEmailContent(
            ctx,
            notificationType,
            actorProfile,
            recipientProfile,
            args.relatedContentType,
            args.relatedContentId,
            args.metadata
          );

          // Import resend from emails module
          const { resend } = await import("./emails");
          
          // Send email using the same pattern as AuthForm
          const emailId = await resend.sendEmail(ctx, {
            from: `Ambrosia <admin@oathstone.cloud>`,
            to: recipient.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });

          // Record email in database
          await ctx.db.insert("emails", {
            userId: args.recipientUserId,
            emailId,
            notificationId,
          });

          // Update notification delivery status
          const notificationDoc = await ctx.db.get(notificationId);
          if (notificationDoc) {
            const updatedDeliveryStatus = { ...(notificationDoc as any).deliveryStatus || {} };
            updatedDeliveryStatus.email = {
              delivered: false, // Will be updated by webhook
              sentAt: Date.now(),
              messageId: emailId,
              opened: false,
              error: undefined
            };

            await ctx.db.patch(notificationId, {
              deliveryStatus: updatedDeliveryStatus
            });
          }

          emailResult = { success: true, emailId };

        } catch (emailError) {
          console.error('Error sending notification email:', emailError);
          
          // Update notification with email error
          const notificationDoc = await ctx.db.get(notificationId);
          if (notificationDoc) {
            const updatedDeliveryStatus = { ...(notificationDoc as any).deliveryStatus || {} };
            updatedDeliveryStatus.email = {
              delivered: false,
              error: emailError instanceof Error ? emailError.message : 'Unknown error',
              errorAt: Date.now()
            };

            await ctx.db.patch(notificationId, {
              deliveryStatus: updatedDeliveryStatus
            });
          }

          emailResult = { 
            success: false, 
            error: emailError instanceof Error ? emailError.message : 'Unknown error' 
          };
        }
      }

      return { 
        success: true, 
        notificationId,
        deliveryChannels,
        emailResult
      };

    } catch (error) {
      console.error('Error creating notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

// Test function to send a simple email (for debugging)
export const sendTestEmail = mutation({
  args: {
    to: v.string(),
    subject: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    try {
      // Import resend from emails module
      const { resend } = await import("./emails");
      
      const emailId = await resend.sendEmail(ctx, {
        from: `Ambrosia <admin@oathstone.cloud>`,
        to: args.to,
        subject: args.subject || "Test Email from Ambrosia",
        html: `
          <h1>Test Email</h1>
          <p>This is a test email to verify that the email system is working correctly.</p>
          <p>If you received this email, the Resend integration is working properly.</p>
        `,
        text: "This is a test email to verify that the email system is working correctly."
      });

      return { success: true, emailId };
    } catch (error) {
      console.error("Error sending test email:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },
});

// Debug function to check notification system status
export const debugNotificationSystem = query({
  args: {},
  handler: async (ctx) => {
    // Get counts of various entities
    const notificationCount = await ctx.db.query("notifications").collect().then(n => n.length);
    const settingsCount = await ctx.db.query("notificationSettings").collect().then(s => s.length);
    const emailCount = await ctx.db.query("emails").collect().then(e => e.length);
    const userCount = await ctx.db.query("users").collect().then(u => u.length);

    // Get recent notifications
    const recentNotifications = await ctx.db
      .query("notifications")
      .order("desc")
      .take(5);

    // Check for scheduled notifications
    const scheduledNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.neq(q.field("scheduledFor"), undefined))
      .take(10);

    // Get recent emails
    const recentEmails = await ctx.db
      .query("emails")
      .order("desc")
      .take(5);

    return {
      counts: {
        notifications: notificationCount,
        settings: settingsCount,
        emails: emailCount,
        users: userCount
      },
      recentNotifications: recentNotifications.map(n => ({
        id: n._id,
        type: n.type,
        title: n.title,
        deliveryChannels: n.deliveryChannels,
        deliveryStatus: n.deliveryStatus,
        createdAt: n.createdAt
      })),
      recentEmails: recentEmails.map(e => ({
        id: e._id,
        emailId: e.emailId,
        notificationId: e.notificationId,
        createdAt: e._creationTime
      })),
      scheduledNotifications: scheduledNotifications.map(n => ({
        id: n._id,
        type: n.type,
        scheduledFor: n.scheduledFor,
        createdAt: n.createdAt,
        deliveryChannels: n.deliveryChannels
      }))
    };
  },
});

// Migration function to initialize notification settings for all existing users
export const initializeAllUsersNotificationSettings = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ processedUsers: number; totalCreated: number }> => {
    // Get all users who don't have notification settings
    const allUsers = await ctx.db.query("users").collect();
    let processedUsers = 0;
    let totalCreated = 0;

    for (const user of allUsers) {
      const result = await ctx.runMutation(internal.notifications.initializeUserNotificationSettings, {
        userId: user._id
      });
      if (result.created > 0) {
        processedUsers++;
        totalCreated += result.created;
      }
    }

    return { processedUsers, totalCreated };
  },
});

// Get user notification settings with enhanced data
export const getUserSettings = query({
  args: {
    includeDefaults: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const settings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Create a map of existing settings
    const settingsMap = new Map(
      settings.map(setting => [setting.notificationType, setting])
    );

    // Return all notification types with user settings or defaults
    const allSettings = Object.values(NOTIFICATION_TYPES).map(type => {
      const userSetting = settingsMap.get(type.id);

      if (userSetting) {
        return {
          ...userSetting,
          typeInfo: {
            name: type.name,
            description: type.description,
            category: type.category,
            priority: type.priority,
            batchable: type.batchable,
            defaultChannels: type.defaultChannels
          }
        };
      }

      // Return defaults if no user setting exists
      if (args.includeDefaults !== false) {
        return {
          notificationType: type.id,
          enabled: true,
          channels: {
            in_app: type.defaultChannels.includes('in_app'),
            email: type.defaultChannels.includes('email'),
            whatsapp: type.defaultChannels.includes('whatsapp'),
            sms: type.defaultChannels.includes('sms'),
            push: type.defaultChannels.includes('push')
          },
          batchingPreference: 'immediate',
          typeInfo: {
            name: type.name,
            description: type.description,
            category: type.category,
            priority: type.priority,
            batchable: type.batchable,
            defaultChannels: type.defaultChannels
          }
        };
      }

      return null;
    }).filter(Boolean);

    return allSettings;
  },
});

// Update notification settings for a specific type
export const updateNotificationSetting = mutation({
  args: {
    notificationType: v.string(),
    enabled: v.boolean(),
    channels: v.object({
      in_app: v.boolean(),
      email: v.boolean(),
      whatsapp: v.boolean(),
      sms: v.boolean(),
      push: v.boolean()
    }),
    batchingPreference: v.optional(v.string()),
    quietHours: v.optional(v.object({
      enabled: v.boolean(),
      startTime: v.string(),
      endTime: v.string(),
      timezone: v.string()
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Validate notification type
    const notificationType = NOTIFICATION_TYPES[args.notificationType];
    if (!notificationType) {
      throw new Error(`Invalid notification type: ${args.notificationType}`);
    }

    // Validate batching preference
    const validBatchingPreferences = ['immediate', 'batched', 'digest'];
    if (args.batchingPreference && !validBatchingPreferences.includes(args.batchingPreference)) {
      throw new Error(`Invalid batching preference: ${args.batchingPreference}. Must be one of: ${validBatchingPreferences.join(', ')}`);
    }

    // Validate quiet hours if provided
    if (args.quietHours) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(args.quietHours.startTime)) {
        throw new Error("Invalid start time format. Use HH:MM format (e.g., 22:00)");
      }
      if (!timeRegex.test(args.quietHours.endTime)) {
        throw new Error("Invalid end time format. Use HH:MM format (e.g., 08:00)");
      }
      if (!args.quietHours.timezone) {
        throw new Error("Timezone is required when quiet hours are enabled");
      }
    }

    // Validate that at least one channel is enabled if notification is enabled
    if (args.enabled) {
      const hasEnabledChannel = Object.values(args.channels).some(enabled => enabled);
      if (!hasEnabledChannel) {
        throw new Error("At least one delivery channel must be enabled when notifications are enabled");
      }
    }

    // Find existing setting
    const existingSetting = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user_type", (q: any) =>
        q.eq("userId", userId).eq("notificationType", args.notificationType)
      )
      .first();

    const settingData = {
      enabled: args.enabled,
      channels: args.channels,
      batchingPreference: args.batchingPreference || 'immediate',
      quietHours: args.quietHours,
      updatedAt: Date.now()
    };

    try {
      if (existingSetting) {
        await ctx.db.patch(existingSetting._id, settingData);
        return {
          success: true,
          action: 'updated',
          notificationType: args.notificationType,
          settingId: existingSetting._id
        };
      } else {
        const settingId = await ctx.db.insert("notificationSettings", {
          userId,
          notificationType: args.notificationType,
          ...settingData
        });
        return {
          success: true,
          action: 'created',
          notificationType: args.notificationType,
          settingId
        };
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      throw new Error(`Failed to update notification setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Bulk update all notification settings
export const updateAllNotificationSettings = mutation({
  args: {
    settings: v.array(v.object({
      notificationType: v.string(),
      enabled: v.boolean(),
      channels: v.object({
        in_app: v.boolean(),
        email: v.boolean(),
        whatsapp: v.boolean(),
        sms: v.boolean(),
        push: v.boolean()
      }),
      batchingPreference: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const now = Date.now();

    for (const setting of args.settings) {
      // Validate notification type
      if (!NOTIFICATION_TYPES[setting.notificationType]) {
        continue; // Skip invalid types
      }

      const existingSetting = await ctx.db
        .query("notificationSettings")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", userId).eq("notificationType", setting.notificationType)
        )
        .first();

      const settingData = {
        enabled: setting.enabled,
        channels: setting.channels,
        batchingPreference: setting.batchingPreference || 'immediate',
        updatedAt: now
      };

      if (existingSetting) {
        await ctx.db.patch(existingSetting._id, settingData);
      } else {
        await ctx.db.insert("notificationSettings", {
          userId,
          notificationType: setting.notificationType,
          ...settingData
        });
      }
    }
  },
});

// Get notification statistics for analytics
export const getNotificationStats = query({
  args: {
    timeRange: v.optional(v.string()) // 'day' | 'week' | 'month'
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const timeRange = args.timeRange || 'week';
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case 'day':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (7 * 24 * 60 * 60 * 1000);
    }

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.isRead).length,
      byCategory: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      deliveryStats: {
        in_app: { delivered: 0, viewed: 0 },
        email: { delivered: 0, opened: 0 }
      }
    };

    notifications.forEach(notification => {
      // Category stats
      if (notification.category) {
        stats.byCategory[notification.category] = (stats.byCategory[notification.category] || 0) + 1;
      }

      // Priority stats
      if (notification.priority) {
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      }

      // Delivery stats
      if (notification.deliveryStatus?.in_app?.delivered) {
        stats.deliveryStats.in_app.delivered++;
        if (notification.deliveryStatus.in_app.viewed) {
          stats.deliveryStats.in_app.viewed++;
        }
      }

      if (notification.deliveryStatus?.email?.delivered) {
        stats.deliveryStats.email.delivered++;
        if (notification.deliveryStatus.email.opened) {
          stats.deliveryStats.email.opened++;
        }
      }
    });

    return stats;
  },
});

// Delete old notifications (for cleanup)
export const deleteOldNotifications = internalMutation({
  args: {
    olderThanDays: v.number()
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - (args.olderThanDays * 24 * 60 * 60 * 1000);

    const oldNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .collect();

    for (const notification of oldNotifications) {
      await ctx.db.delete(notification._id);
    }

    return { deleted: oldNotifications.length };
  },
});

// Validate notification type
export function validateNotificationType(type: string): boolean {
  return type in NOTIFICATION_TYPES;
}

// Get notification type configuration
export function getNotificationTypeConfig(type: string): NotificationType | null {
  return NOTIFICATION_TYPES[type] || null;
}

// Enhanced helper function to create individual notifications
async function createIndividualNotification(
  ctx: any,
  args: any,
  notificationType: NotificationType,
  userSettings: any,
  deliveryChannels: string[]
) {
  // Get actor information if provided
  let actorProfile = null;
  if (args.actorUserId) {
    actorProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.actorUserId!))
      .first();
  }

  // Generate notification content
  const { title, message } = await generateNotificationContent(
    ctx,
    notificationType,
    actorProfile,
    args.relatedContentType,
    args.relatedContentId,
    args.metadata
  );

  // Create the notification with enhanced delivery status
  const notificationId = await ctx.db.insert("notifications", {
    userId: args.recipientUserId,
    type: args.type,
    title,
    message,
    isRead: false,
    category: notificationType.category,
    priority: args.priority || notificationType.priority,
    relatedContentType: args.relatedContentType,
    relatedContentId: args.relatedContentId,
    actorUserId: args.actorUserId,
    deliveryChannels,
    deliveryStatus: initializeDeliveryStatus(deliveryChannels),
    createdAt: Date.now(),
  });

  // Track in-app delivery if enabled
  if (deliveryChannels.includes('in_app')) {
    await ctx.runMutation(internal.notificationAnalytics.trackDeliveryEvent, {
      notificationId,
      channel: 'in_app',
      event: 'delivered',
      metadata: {
        timestamp: Date.now()
      }
    });
  }

  return notificationId;
}

// Initialize delivery status for all channels
function initializeDeliveryStatus(deliveryChannels: string[]) {
  const status: any = {};

  if (deliveryChannels.includes('in_app')) {
    status.in_app = {
      delivered: true,
      deliveredAt: Date.now(),
      viewed: false
    };
  }

  if (deliveryChannels.includes('email')) {
    status.email = {
      delivered: false,
      deliveredAt: undefined,
      messageId: undefined,
      opened: false,
      error: undefined
    };
  }

  if (deliveryChannels.includes('whatsapp')) {
    status.whatsapp = {
      delivered: false,
      deliveredAt: undefined,
      messageId: undefined,
      error: undefined
    };
  }

  if (deliveryChannels.includes('sms')) {
    status.sms = {
      delivered: false,
      deliveredAt: undefined,
      messageId: undefined,
      error: undefined
    };
  }

  return status;
}

// Handle notification batching logic
async function handleNotificationBatching(
  ctx: any,
  args: any,
  notificationType: NotificationType,
  userSettings: any
): Promise<{ batched: boolean; batchId?: string }> {
  const batchWindow = 5 * 60 * 1000; // 5 minutes
  const now = Date.now();
  const windowStart = now - batchWindow;

  // Look for existing notifications of the same type within the batch window
  const recentNotifications = await ctx.db
    .query("notifications")
    .withIndex("by_user", (q: any) => q.eq("userId", args.recipientUserId))
    .filter((q: any) =>
      q.and(
        q.eq(q.field("type"), args.type),
        q.gte(q.field("createdAt"), windowStart),
        q.eq(q.field("isRead"), false)
      )
    )
    .collect();

  if (recentNotifications.length === 0) {
    return { batched: false };
  }

  // Find or create batch
  const existingBatch = recentNotifications.find((n: any) => n.batchId);
  let batchId: string;

  if (existingBatch) {
    batchId = existingBatch.batchId!;
    // Update existing batch notification
    await updateBatchNotification(ctx, existingBatch._id, args, notificationType);
  } else {
    // Create new batch from first notification
    batchId = `batch_${now}_${Math.random().toString(36).substr(2, 9)}`;
    await convertToBatchNotification(ctx, recentNotifications[0]._id, batchId, args, notificationType);
  }

  return { batched: true, batchId };
}

// Convert individual notification to batch notification
async function convertToBatchNotification(
  ctx: any,
  notificationId: string,
  batchId: string,
  newArgs: any,
  notificationType: NotificationType
) {
  const notification = await ctx.db.get(notificationId);
  if (!notification) return;

  const batchCount = 2; // Original + new
  const { title, message } = generateBatchContent(notificationType, batchCount);

  await ctx.db.patch(notificationId, {
    batchId,
    batchCount,
    title,
    message,
    createdAt: Date.now(), // Update timestamp to latest
  });
}

// Update existing batch notification
async function updateBatchNotification(
  ctx: any,
  notificationId: string,
  newArgs: any,
  notificationType: NotificationType
) {
  const notification = await ctx.db.get(notificationId);
  if (!notification) return;

  const newBatchCount = (notification.batchCount || 1) + 1;
  const { title, message } = generateBatchContent(notificationType, newBatchCount);

  await ctx.db.patch(notificationId, {
    batchCount: newBatchCount,
    title,
    message,
    createdAt: Date.now(), // Update timestamp to latest
  });
}

// Generate content for batch notifications
function generateBatchContent(notificationType: NotificationType, count: number): { title: string; message: string } {
  switch (notificationType.id) {
    case 'NEW_FOLLOWER':
      return {
        title: 'New Followers',
        message: `${count} people started following you`
      };
    case 'CONTENT_LIKED':
      return {
        title: 'Content Liked',
        message: `${count} people liked your content`
      };
    case 'CONTENT_CLAPPED':
      return {
        title: 'Content Clapped',
        message: `${count} people clapped for your content`
      };
    case 'FOLLOWER_NEW_POST':
      return {
        title: 'New Posts',
        message: `${count} new posts from people you follow`
      };
    default:
      return {
        title: `${notificationType.name} (${count})`,
        message: `${count} ${notificationType.description.toLowerCase()}`
      };
  }
}

// Schedule notification delivery based on user activity and settings
async function scheduleIntelligentDelivery(
  ctx: any,
  notificationId: string,
  userSettings: any,
  priority: string
) {
  const notification = await ctx.db.get(notificationId);
  if (!notification) return;

  // Calculate optimal delivery time using intelligent timing
  const timingResult = await ctx.runQuery(internal.intelligentTiming.calculateOptimalDeliveryTime, {
    userId: notification.userId,
    notificationPriority: priority,
    batchingPreference: userSettings.batchingPreference || 'immediate'
  });

  const now = Date.now();

  if (timingResult.deliveryTime <= now) {
    // Deliver immediately
    if (notification.deliveryChannels?.includes('email')) {
      await ctx.runMutation(internal.emails.sendNotificationEmail, {
        notificationId
      });
    }
  } else {
    // Schedule for later delivery
    await ctx.db.patch(notificationId, {
      scheduledFor: timingResult.deliveryTime
    });
  }
}

// Check if current time is within quiet hours
function isInQuietHours(currentTime: string, startTime: string, endTime: string): boolean {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start <= end) {
    // Same day range (e.g., 09:00 to 17:00)
    return current >= start && current <= end;
  } else {
    // Overnight range (e.g., 22:00 to 08:00)
    return current >= start || current <= end;
  }
}

// Convert time string to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Calculate next delivery time after quiet hours
function calculateNextDeliveryTime(quietHours: any): number {
  const now = new Date();
  const endTime = quietHours.endTime;
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const nextDelivery = new Date(now);
  nextDelivery.setHours(endHours, endMinutes, 0, 0);

  // If end time is today but already passed, schedule for tomorrow
  if (nextDelivery <= now) {
    nextDelivery.setDate(nextDelivery.getDate() + 1);
  }

  return nextDelivery.getTime();
}

// Process scheduled notifications (to be called by a cron job)
export const processScheduledNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const scheduledNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.and(
        q.neq(q.field("scheduledFor"), undefined),
        q.lte(q.field("scheduledFor"), now)
      ))
      .take(100); // Limit batch size

    let processed = 0;
    for (const notification of scheduledNotifications) {
      if (notification.scheduledFor && notification.scheduledFor <= now) {
        // Remove the schedule and trigger delivery
        await ctx.db.patch(notification._id, {
          scheduledFor: undefined
        });

        // Trigger actual delivery for each enabled channel
        if (notification.deliveryChannels?.includes('email')) {
          await ctx.runMutation(internal.emails.sendNotificationEmail, {
            notificationId: notification._id
          });
        }

        processed++;
      }
    }

    return { processed };
  },
});

// Validate notification event before processing
export function validateNotificationEvent(event: NotificationEvent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.type) {
    errors.push('Notification type is required');
  } else if (!NOTIFICATION_TYPES[event.type]) {
    errors.push(`Invalid notification type: ${event.type}`);
  }

  if (!event.recipientUserId) {
    errors.push('Recipient user ID is required');
  }

  // Validate related content consistency
  if (event.relatedContentType && !event.relatedContentId) {
    errors.push('Related content ID is required when content type is specified');
  }

  if (event.relatedContentId && !event.relatedContentType) {
    errors.push('Related content type is required when content ID is specified');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Get notification processing statistics
export const getNotificationProcessingStats = query({
  args: {
    timeRange: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || 'day';
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case 'hour':
        startTime = now - (60 * 60 * 1000);
        break;
      case 'day':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }

    const notifications = await ctx.db
      .query("notifications")
      .filter((q: any) => q.gte(q.field("createdAt"), startTime))
      .collect();

    const stats = {
      total: notifications.length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      batched: notifications.filter(n => n.batchId).length,
      scheduled: notifications.filter(n => n.scheduledFor).length,
      processed: notifications.filter(n => !n.scheduledFor).length
    };

    notifications.forEach(notification => {
      // Type stats
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;

      // Priority stats
      if (notification.priority) {
        stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      }
    });

    return stats;
  },
});

// Bulk notification event processor for high-volume scenarios
export const processBulkNotificationEvents = internalMutation({
  args: {
    events: v.array(v.object({
      type: v.string(),
      recipientUserId: v.id("users"),
      actorUserId: v.optional(v.id("users")),
      relatedContentType: v.optional(v.string()),
      relatedContentId: v.optional(v.string()),
      metadata: v.optional(v.any()),
    }))
  },
  handler: async (ctx, args) => {
    const results: any[] = [];

    for (const event of args.events) {
      try {
        const result: any = await ctx.runMutation(internal.notifications.processNotificationEvent, event);
        results.push({ ...event, result });
      } catch (error) {
        results.push({
          ...event,
          result: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
        });
      }
    }

    return {
      total: args.events.length,
      successful: results.filter(r => r.result.success).length,
      failed: results.filter(r => !r.result.success).length,
      results
    };
  },
});

// Notification event dispatcher - routes events to appropriate processors
export const dispatchNotificationEvent = internalMutation({
  args: {
    eventType: v.string(), // 'single' | 'bulk' | 'scheduled'
    events: v.union(
      v.object({
        type: v.string(),
        recipientUserId: v.id("users"),
        actorUserId: v.optional(v.id("users")),
        relatedContentType: v.optional(v.string()),
        relatedContentId: v.optional(v.string()),
        metadata: v.optional(v.any()),
      }),
      v.array(v.object({
        type: v.string(),
        recipientUserId: v.id("users"),
        actorUserId: v.optional(v.id("users")),
        relatedContentType: v.optional(v.string()),
        relatedContentId: v.optional(v.string()),
        metadata: v.optional(v.any()),
      }))
    ),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    switch (args.eventType) {
      case 'single':
        if (!Array.isArray(args.events)) {
          return await ctx.runMutation(internal.notifications.processNotificationEvent, args.events);
        }
        throw new Error('Single event expected, but array provided');

      case 'bulk':
        if (Array.isArray(args.events)) {
          return await ctx.runMutation(internal.notifications.processBulkNotificationEvents, { events: args.events });
        }
        throw new Error('Event array expected, but single event provided');

      case 'scheduled':
        // For scheduled events, we'll store them and process later
        // This is a simplified implementation
        if (Array.isArray(args.events)) {
          return await ctx.runMutation(internal.notifications.processBulkNotificationEvents, { events: args.events });
        } else {
          return await ctx.runMutation(internal.notifications.processNotificationEvent, args.events);
        }

      default:
        throw new Error(`Unknown event type: ${args.eventType}`);
    }
  },
});

// Notification deduplication - prevent duplicate notifications
export const deduplicateNotification = internalMutation({
  args: {
    type: v.string(),
    recipientUserId: v.id("users"),
    actorUserId: v.optional(v.id("users")),
    relatedContentType: v.optional(v.string()),
    relatedContentId: v.optional(v.string()),
    timeWindow: v.optional(v.number()), // Minutes to check for duplicates
  },
  handler: async (ctx, args) => {
    const timeWindow = args.timeWindow || 60; // Default 1 hour
    const windowStart = Date.now() - (timeWindow * 60 * 1000);

    // Build filter conditions
    let query = ctx.db
      .query("notifications")
      .withIndex("by_user", (q: any) => q.eq("userId", args.recipientUserId))
      .filter((q: any) =>
        q.and(
          q.eq(q.field("type"), args.type),
          q.gte(q.field("createdAt"), windowStart)
        )
      );

    // Add additional filters if provided
    if (args.actorUserId) {
      query = query.filter((q: any) => q.eq(q.field("actorUserId"), args.actorUserId!));
    }

    if (args.relatedContentId) {
      query = query.filter((q: any) => q.eq(q.field("relatedContentId"), args.relatedContentId));
    }

    const duplicates = await query.collect();

    return {
      isDuplicate: duplicates.length > 0,
      existingNotifications: duplicates.map(n => n._id),
      count: duplicates.length
    };
  },
});

// Notification retry mechanism for failed deliveries
export const retryFailedNotifications = internalMutation({
  args: {
    maxRetries: v.optional(v.number()),
    retryDelay: v.optional(v.number()), // Minutes
  },
  handler: async (ctx, args) => {
    const maxRetries = args.maxRetries || 3;
    const retryDelay = args.retryDelay || 30; // 30 minutes
    const retryTime = Date.now() - (retryDelay * 60 * 1000);

    // Find notifications with failed deliveries that haven't exceeded max retries
    const notifications = await ctx.db
      .query("notifications")
      .filter((q: any) =>
        q.and(
          q.lt(q.field("createdAt"), retryTime),
          q.neq(q.field("deliveryStatus"), undefined)
        )
      )
      .collect();

    const failedNotifications = notifications.filter(notification => {
      if (!notification.deliveryStatus) return false;

      // Check if any delivery channel has failed and needs retry
      const status = notification.deliveryStatus;
      const hasFailedEmail = status.email?.error && !status.email.delivered;
      const hasFailedWhatsApp = status.whatsapp?.error && !status.whatsapp.delivered;
      const hasFailedSMS = status.sms?.error && !status.sms.delivered;

      return hasFailedEmail || hasFailedWhatsApp || hasFailedSMS;
    });

    let retried = 0;
    for (const notification of failedNotifications) {
      // Here you would implement the actual retry logic
      // For now, we'll just mark them for retry
      retried++;
    }

    return {
      found: failedNotifications.length,
      retried,
      maxRetries,
      retryDelay
    };
  },
});

// Notification performance monitoring
export const getNotificationPerformanceMetrics = query({
  args: {
    timeRange: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || 'day';
    const now = Date.now();
    let startTime: number;

    switch (timeRange) {
      case 'hour':
        startTime = now - (60 * 60 * 1000);
        break;
      case 'day':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }

    const notifications = await ctx.db
      .query("notifications")
      .filter((q: any) => q.gte(q.field("createdAt"), startTime))
      .collect();

    // Calculate delivery success rates
    let emailDelivered = 0, emailFailed = 0;
    let whatsappDelivered = 0, whatsappFailed = 0;
    let smsDelivered = 0, smsFailed = 0;
    let inAppDelivered = 0;

    notifications.forEach(notification => {
      const status = notification.deliveryStatus;
      if (!status) return;

      if (status.email) {
        if (status.email.delivered) emailDelivered++;
        else if (status.email.error) emailFailed++;
      }

      if (status.whatsapp) {
        if (status.whatsapp.delivered) whatsappDelivered++;
        else if (status.whatsapp.error) whatsappFailed++;
      }

      if (status.sms) {
        if (status.sms.delivered) smsDelivered++;
        else if (status.sms.error) smsFailed++;
      }

      if (status.in_app?.delivered) inAppDelivered++;
    });

    return {
      timeRange,
      totalNotifications: notifications.length,
      deliveryRates: {
        email: {
          delivered: emailDelivered,
          failed: emailFailed,
          successRate: emailDelivered + emailFailed > 0 ?
            (emailDelivered / (emailDelivered + emailFailed)) * 100 : 0
        },
        whatsapp: {
          delivered: whatsappDelivered,
          failed: whatsappFailed,
          successRate: whatsappDelivered + whatsappFailed > 0 ?
            (whatsappDelivered / (whatsappDelivered + whatsappFailed)) * 100 : 0
        },
        sms: {
          delivered: smsDelivered,
          failed: smsFailed,
          successRate: smsDelivered + smsFailed > 0 ?
            (smsDelivered / (smsDelivered + smsFailed)) * 100 : 0
        },
        inApp: {
          delivered: inAppDelivered,
          successRate: notifications.length > 0 ? (inAppDelivered / notifications.length) * 100 : 0
        }
      },
      batchingStats: {
        totalBatched: notifications.filter(n => n.batchId).length,
        batchingRate: notifications.length > 0 ?
          (notifications.filter(n => n.batchId).length / notifications.length) * 100 : 0
      }
    };
  },
});

// Reset notification settings to defaults for a specific type
export const resetNotificationSetting = mutation({
  args: {
    notificationType: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Validate notification type
    const notificationType = NOTIFICATION_TYPES[args.notificationType];
    if (!notificationType) {
      throw new Error(`Invalid notification type: ${args.notificationType}`);
    }

    // Find existing setting
    const existingSetting = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user_type", (q: any) =>
        q.eq("userId", userId).eq("notificationType", args.notificationType)
      )
      .first();

    // Create default settings
    const defaultSettings = {
      enabled: true,
      channels: {
        in_app: notificationType.defaultChannels.includes('in_app'),
        email: notificationType.defaultChannels.includes('email'),
        whatsapp: notificationType.defaultChannels.includes('whatsapp'),
        sms: notificationType.defaultChannels.includes('sms'),
        push: notificationType.defaultChannels.includes('push')
      },
      batchingPreference: 'immediate',
      quietHours: undefined,
      updatedAt: Date.now()
    };

    try {
      if (existingSetting) {
        await ctx.db.patch(existingSetting._id, defaultSettings);
        return {
          success: true,
          action: 'reset',
          notificationType: args.notificationType,
          settingId: existingSetting._id
        };
      } else {
        const settingId = await ctx.db.insert("notificationSettings", {
          userId,
          notificationType: args.notificationType,
          ...defaultSettings
        });
        return {
          success: true,
          action: 'created_default',
          notificationType: args.notificationType,
          settingId
        };
      }
    } catch (error) {
      console.error('Error resetting notification setting:', error);
      throw new Error(`Failed to reset notification setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Reset all notification settings to defaults
export const resetAllNotificationSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    try {
      // Delete all existing settings
      const existingSettings = await ctx.db
        .query("notificationSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const setting of existingSettings) {
        await ctx.db.delete(setting._id);
      }

      // Initialize default settings
      await ctx.runMutation(internal.notifications.initializeUserNotificationSettings, {
        userId
      });

      return {
        success: true,
        action: 'reset_all',
        deletedCount: existingSettings.length,
        createdCount: Object.keys(NOTIFICATION_TYPES).length
      };
    } catch (error) {
      console.error('Error resetting all notification settings:', error);
      throw new Error(`Failed to reset all notification settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get notification settings for a specific category
export const getNotificationSettingsByCategory = query({
  args: {
    category: v.string() // 'engagement' | 'social' | 'content' | 'system'
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Validate category
    const validCategories = ['engagement', 'social', 'content', 'system'];
    if (!validCategories.includes(args.category)) {
      throw new Error(`Invalid category: ${args.category}. Must be one of: ${validCategories.join(', ')}`);
    }

    // Get notification types for this category
    const categoryTypes = Object.values(NOTIFICATION_TYPES).filter(
      type => type.category === args.category
    );

    // Get user settings for these types
    const settings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const settingsMap = new Map(
      settings.map(setting => [setting.notificationType, setting])
    );

    // Return settings with type info
    return categoryTypes.map(type => {
      const userSetting = settingsMap.get(type.id);

      if (userSetting) {
        return {
          ...userSetting,
          typeInfo: {
            name: type.name,
            description: type.description,
            category: type.category,
            priority: type.priority,
            batchable: type.batchable,
            defaultChannels: type.defaultChannels
          }
        };
      }

      // Return defaults if no user setting exists
      return {
        notificationType: type.id,
        enabled: true,
        channels: {
          in_app: type.defaultChannels.includes('in_app'),
          email: type.defaultChannels.includes('email'),
          whatsapp: type.defaultChannels.includes('whatsapp'),
          sms: type.defaultChannels.includes('sms'),
          push: type.defaultChannels.includes('push')
        },
        batchingPreference: 'immediate',
        typeInfo: {
          name: type.name,
          description: type.description,
          category: type.category,
          priority: type.priority,
          batchable: type.batchable,
          defaultChannels: type.defaultChannels
        }
      };
    });
  },
});

// Validate notification settings before saving
export const validateNotificationSettings = mutation({
  args: {
    settings: v.array(v.object({
      notificationType: v.string(),
      enabled: v.boolean(),
      channels: v.object({
        in_app: v.boolean(),
        email: v.boolean(),
        whatsapp: v.boolean(),
        sms: v.boolean(),
        push: v.boolean()
      }),
      batchingPreference: v.optional(v.string()),
      quietHours: v.optional(v.object({
        enabled: v.boolean(),
        startTime: v.string(),
        endTime: v.string(),
        timezone: v.string()
      }))
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const validationErrors: string[] = [];
    const validBatchingPreferences = ['immediate', 'batched', 'digest'];
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    for (const setting of args.settings) {
      // Validate notification type
      if (!NOTIFICATION_TYPES[setting.notificationType]) {
        validationErrors.push(`Invalid notification type: ${setting.notificationType}`);
        continue;
      }

      // Validate batching preference
      if (setting.batchingPreference && !validBatchingPreferences.includes(setting.batchingPreference)) {
        validationErrors.push(`Invalid batching preference for ${setting.notificationType}: ${setting.batchingPreference}`);
      }

      // Validate quiet hours
      if (setting.quietHours) {
        if (!timeRegex.test(setting.quietHours.startTime)) {
          validationErrors.push(`Invalid start time format for ${setting.notificationType}: ${setting.quietHours.startTime}`);
        }
        if (!timeRegex.test(setting.quietHours.endTime)) {
          validationErrors.push(`Invalid end time format for ${setting.notificationType}: ${setting.quietHours.endTime}`);
        }
        if (!setting.quietHours.timezone) {
          validationErrors.push(`Timezone is required for ${setting.notificationType} when quiet hours are enabled`);
        }
      }

      // Validate that at least one channel is enabled if notification is enabled
      if (setting.enabled) {
        const hasEnabledChannel = Object.values(setting.channels).some(enabled => enabled);
        if (!hasEnabledChannel) {
          validationErrors.push(`At least one delivery channel must be enabled for ${setting.notificationType}`);
        }
      }
    }

    return {
      valid: validationErrors.length === 0,
      errors: validationErrors,
      settingsCount: args.settings.length
    };
  },
});

// Get user's global notification preferences
export const getGlobalNotificationPreferences = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const settings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Calculate global preferences from individual settings
    const totalSettings = settings.length;
    const enabledSettings = settings.filter(s => s.enabled).length;

    // Channel preferences (percentage of notifications using each channel)
    const channelStats = {
      in_app: 0,
      email: 0,
      whatsapp: 0,
      sms: 0,
      push: 0
    };

    settings.forEach(setting => {
      if (setting.enabled) {
        Object.entries(setting.channels).forEach(([channel, enabled]) => {
          if (enabled && channel in channelStats) {
            channelStats[channel as keyof typeof channelStats]++;
          }
        });
      }
    });

    // Convert to percentages
    Object.keys(channelStats).forEach(channel => {
      channelStats[channel as keyof typeof channelStats] =
        enabledSettings > 0 ? (channelStats[channel as keyof typeof channelStats] / enabledSettings) * 100 : 0;
    });

    // Batching preferences
    const batchingStats = {
      immediate: 0,
      batched: 0,
      digest: 0
    };

    settings.forEach(setting => {
      const pref = setting.batchingPreference || 'immediate';
      if (pref in batchingStats) {
        batchingStats[pref as keyof typeof batchingStats]++;
      }
    });

    // Quiet hours (check if any notification type has quiet hours enabled)
    const quietHoursEnabled = settings.some(s => s.quietHours?.enabled);
    const commonQuietHours = settings.find(s => s.quietHours?.enabled)?.quietHours;

    return {
      totalNotificationTypes: Object.keys(NOTIFICATION_TYPES).length,
      configuredSettings: totalSettings,
      enabledNotifications: enabledSettings,
      enabledPercentage: totalSettings > 0 ? (enabledSettings / totalSettings) * 100 : 0,
      channelPreferences: channelStats,
      batchingPreferences: batchingStats,
      quietHours: {
        enabled: quietHoursEnabled,
        settings: commonQuietHours
      }
    };
  },
});

// Update global notification preferences (applies to all notification types)
export const updateGlobalNotificationPreferences = mutation({
  args: {
    enableAll: v.optional(v.boolean()),
    disableAll: v.optional(v.boolean()),
    channels: v.optional(v.object({
      in_app: v.boolean(),
      email: v.boolean(),
      whatsapp: v.boolean(),
      sms: v.boolean(),
      push: v.boolean()
    })),
    batchingPreference: v.optional(v.string()),
    quietHours: v.optional(v.object({
      enabled: v.boolean(),
      startTime: v.string(),
      endTime: v.string(),
      timezone: v.string()
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Validate inputs
    if (args.enableAll && args.disableAll) {
      throw new Error("Cannot enable and disable all notifications at the same time");
    }

    if (args.batchingPreference) {
      const validBatchingPreferences = ['immediate', 'batched', 'digest'];
      if (!validBatchingPreferences.includes(args.batchingPreference)) {
        throw new Error(`Invalid batching preference: ${args.batchingPreference}`);
      }
    }

    if (args.quietHours) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(args.quietHours.startTime)) {
        throw new Error("Invalid start time format. Use HH:MM format");
      }
      if (!timeRegex.test(args.quietHours.endTime)) {
        throw new Error("Invalid end time format. Use HH:MM format");
      }
    }

    try {
      // Get all existing settings
      const existingSettings = await ctx.db
        .query("notificationSettings")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      const settingsMap = new Map(
        existingSettings.map(setting => [setting.notificationType, setting])
      );

      let updatedCount = 0;
      let createdCount = 0;

      // Update or create settings for all notification types
      for (const notificationType of Object.values(NOTIFICATION_TYPES)) {
        const existingSetting = settingsMap.get(notificationType.id);

        // Determine new values
        let enabled = existingSetting?.enabled ?? true;
        if (args.enableAll) enabled = true;
        if (args.disableAll) enabled = false;

        const channels = args.channels || existingSetting?.channels || {
          in_app: notificationType.defaultChannels.includes('in_app'),
          email: notificationType.defaultChannels.includes('email'),
          whatsapp: notificationType.defaultChannels.includes('whatsapp'),
          sms: notificationType.defaultChannels.includes('sms'),
          push: notificationType.defaultChannels.includes('push')
        };

        const batchingPreference = args.batchingPreference ||
          existingSetting?.batchingPreference ||
          'immediate';

        const quietHours = args.quietHours || existingSetting?.quietHours;

        const settingData = {
          enabled,
          channels,
          batchingPreference,
          quietHours,
          updatedAt: Date.now()
        };

        if (existingSetting) {
          await ctx.db.patch(existingSetting._id, settingData);
          updatedCount++;
        } else {
          await ctx.db.insert("notificationSettings", {
            userId,
            notificationType: notificationType.id,
            ...settingData
          });
          createdCount++;
        }
      }

      return {
        success: true,
        updatedCount,
        createdCount,
        totalProcessed: updatedCount + createdCount
      };
    } catch (error) {
      console.error('Error updating global notification preferences:', error);
      throw new Error(`Failed to update global preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get notification settings summary for dashboard
export const getNotificationSettingsSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const settings = await ctx.db
      .query("notificationSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const summary = {
      totalTypes: Object.keys(NOTIFICATION_TYPES).length,
      configured: settings.length,
      enabled: settings.filter(s => s.enabled).length,
      byCategory: {} as Record<string, { total: number; enabled: number }>,
      channels: {
        in_app: settings.filter(s => s.enabled && s.channels.in_app).length,
        email: settings.filter(s => s.enabled && s.channels.email).length,
        whatsapp: settings.filter(s => s.enabled && s.channels.whatsapp).length,
        sms: settings.filter(s => s.enabled && s.channels.sms).length,
        push: settings.filter(s => s.enabled && s.channels.push).length
      },
      batchingEnabled: settings.filter(s => s.batchingPreference !== 'immediate').length,
      quietHoursEnabled: settings.filter(s => s.quietHours?.enabled).length
    };

    // Calculate by category
    Object.values(NOTIFICATION_TYPES).forEach(type => {
      if (!summary.byCategory[type.category]) {
        summary.byCategory[type.category] = { total: 0, enabled: 0 };
      }
      summary.byCategory[type.category].total++;

      const userSetting = settings.find(s => s.notificationType === type.id);
      if (userSetting?.enabled || (!userSetting && true)) { // Default is enabled
        summary.byCategory[type.category].enabled++;
      }
    });

    return summary;
  },
});