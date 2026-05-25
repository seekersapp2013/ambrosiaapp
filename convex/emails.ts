import { components, internal } from "./_generated/api";
import { Resend, vEmailEvent, vEmailId } from "@convex-dev/resend";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { generateEmailTemplate, generateBatchEmailTemplate, validateTemplateData, TemplateData } from "./emailTemplates";
import { Id } from "./_generated/dataModel";

export const resend: Resend = new Resend(components.resend, {
  testMode: false,
  onEmailEvent: internal.emails.handleEmailEvent,
});

export const sendEmail = mutation({
  args: {
    to: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const me = await ctx.db.get(userId);
    if (!me) throw new Error("User not found");

    const emailId = await resend.sendEmail(ctx, {
      from: `${me.name ?? "Me"} <${me.email}>`,
      to: args.to,
      subject: args.subject,
      text: args.body,
    });
    
    await ctx.db.insert("emails", {
      userId,
      emailId,
    });

    // Create notification for email sent
    await ctx.db.insert("notifications", {
      userId,
      type: "email_sent",
      title: "Email Sent",
      message: `Email sent to ${args.to}: ${args.subject}`,
      isRead: false,
      category: "system",
      priority: "low",
      relatedContentType: "email",
      relatedContentId: emailId,
      deliveryChannels: ["in_app"],
      deliveryStatus: {
        in_app: {
          delivered: true,
          deliveredAt: Date.now(),
          viewed: false
        }
      },
      createdAt: Date.now(),
    });
  },
});

export const listMyEmailsAndStatuses = query({
  args: {},
  handler: async (ctx, _args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const emails = await ctx.db
      .query("emails")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);

    const emailAndStatuses = await Promise.all(
      emails.map(async (email) => {
        const emailData = await resend.get(ctx, email.emailId);
        return {
          emailId: email.emailId,
          sentAt: email._creationTime,
          to: emailData?.to ?? "<Deleted>",
          subject: emailData?.subject ?? "<Deleted>",
          status: emailData?.status,
          errorMessage: emailData?.errorMessage,
          opened: emailData?.opened,
          complained: emailData?.complained,
        };
      }),
    );

    return emailAndStatuses;
  },
});

export const handleEmailEvent = internalMutation({
  args: {
    id: vEmailId,
    event: vEmailEvent,
  },
  handler: async (ctx, args) => {
    console.log("Email event:", args.id, args.event);
    
    // Update notification delivery status based on email events
    const emailRecord = await ctx.db
      .query("emails")
      .withIndex("emailId", (q) => q.eq("emailId", args.id))
      .first();

    if (emailRecord && emailRecord.notificationId) {
      const notification = await ctx.db.get(emailRecord.notificationId);
      if (notification && notification.deliveryStatus?.email) {
        const updatedDeliveryStatus = { ...notification.deliveryStatus };
        
        switch (args.event.type) {
          case "email.delivered":
            updatedDeliveryStatus.email = {
              ...updatedDeliveryStatus.email,
              delivered: true,
              deliveredAt: Date.now(),
              messageId: args.id
            };
            // Track delivery event
            await ctx.runMutation(internal.notificationAnalytics.trackDeliveryEvent, {
              notificationId: notification._id,
              channel: 'email',
              event: 'delivered',
              metadata: {
                messageId: args.id,
                timestamp: Date.now()
              }
            });
            break;
          case "email.opened":
            updatedDeliveryStatus.email = {
              ...updatedDeliveryStatus.email,
              delivered: updatedDeliveryStatus.email?.delivered || false,
              opened: true,
              openedAt: Date.now()
            };
            // Track open event
            await ctx.runMutation(internal.notificationAnalytics.trackDeliveryEvent, {
              notificationId: notification._id,
              channel: 'email',
              event: 'opened',
              metadata: {
                messageId: args.id,
                timestamp: Date.now()
              }
            });
            break;
          case "email.bounced":
          case "email.complained":
          case "email.failed":
            updatedDeliveryStatus.email = {
              ...updatedDeliveryStatus.email,
              delivered: false,
              error: `Email ${args.event.type}`,
              errorAt: Date.now()
            };
            // Track failure event
            await ctx.runMutation(internal.notificationAnalytics.trackDeliveryEvent, {
              notificationId: notification._id,
              channel: 'email',
              event: 'failed',
              metadata: {
                messageId: args.id,
                error: `Email ${args.event.type}`,
                timestamp: Date.now()
              }
            });
            break;
        }

        await ctx.db.patch(notification._id, {
          deliveryStatus: updatedDeliveryStatus
        });
      }
    }
  },
});

// Send notification email
export const sendNotificationEmail = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    retryCount: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    try {
      const notification = await ctx.db.get(args.notificationId);
      if (!notification) {
        console.error(`Notification not found: ${args.notificationId}`);
        return { success: false, error: 'Notification not found' };
      }

      // Get recipient user and profile
      const recipient = await ctx.db.get(notification.userId);
      if (!recipient) {
        console.error(`Recipient user not found: ${notification.userId}`);
        return { success: false, error: 'Recipient not found' };
      }

      const recipientProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", notification.userId))
        .first();

      // Get actor information if available
      let actorProfile = null;
      if (notification.actorUserId) {
        actorProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", notification.actorUserId!))
          .first();
      }

      // Prepare template data
      const templateData = validateTemplateData({
        recipientName: recipientProfile?.name || recipient.name || 'User',
        actorName: actorProfile?.name || 'Someone',
        actorUsername: actorProfile?.username || 'user',
        contentTitle: await getContentTitle(ctx, notification.relatedContentType, notification.relatedContentId),
        contentType: notification.relatedContentType || 'content',
        appName: 'Ambrosia',
        appUrl: process.env.SITE_URL || 'https://oathstone.cloud',
        unsubscribeUrl: `${process.env.SITE_URL || 'https://oathstone.cloud'}/unsubscribe?token=${notification.userId}`,
        notificationSettingsUrl: `${process.env.SITE_URL || 'https://oathstone.cloud'}/settings/notifications`
      });

      // Generate email template
      const emailTemplate = generateEmailTemplate(notification.type, templateData);
      if (!emailTemplate) {
        console.error(`No email template found for notification type: ${notification.type}`);
        return { success: false, error: 'No email template found' };
      }

      // Validate recipient email
      if (!recipient.email) {
        console.error(`Recipient has no email address: ${notification.userId}`);
        return { success: false, error: 'Recipient has no email address' };
      }

      // Send email
      const emailId = await resend.sendEmail(ctx, {
        from: `Ambrosia <noreply@ambrosia.africa>`,
        to: recipient.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      // Record email in database
      await ctx.db.insert("emails", {
        userId: notification.userId,
        emailId,
        notificationId: args.notificationId,
      });

      // Update notification delivery status
      const updatedDeliveryStatus = { ...notification.deliveryStatus };
      updatedDeliveryStatus.email = {
        delivered: false, // Will be updated by webhook
        deliveredAt: undefined,
        messageId: emailId,
        sentAt: Date.now(),
        opened: false,
        error: undefined
      };

      await ctx.db.patch(args.notificationId, {
        deliveryStatus: updatedDeliveryStatus
      });

      // Track email sent event
      await ctx.runMutation(internal.notificationAnalytics.trackDeliveryEvent, {
        notificationId: args.notificationId,
        channel: 'email',
        event: 'sent',
        metadata: {
          messageId: emailId,
          timestamp: Date.now()
        }
      });

      return { success: true, emailId };

    } catch (error) {
      console.error('Error sending notification email:', error);
      
      // Update notification with error status
      const notification = await ctx.db.get(args.notificationId);
      if (notification) {
        const updatedDeliveryStatus = { ...notification.deliveryStatus };
        updatedDeliveryStatus.email = {
          delivered: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorAt: Date.now(),
          retryCount: (args.retryCount || 0) + 1
        };

        await ctx.db.patch(args.notificationId, {
          deliveryStatus: updatedDeliveryStatus
        });

        // Track email failure event
        await ctx.runMutation(internal.notificationAnalytics.trackDeliveryEvent, {
          notificationId: args.notificationId,
          channel: 'email',
          event: 'failed',
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
          }
        });
      }

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

// Send batch notification email
export const sendBatchNotificationEmail = internalMutation({
  args: {
    userId: v.id("users"),
    notificationIds: v.array(v.id("notifications")),
    batchId: v.string()
  },
  handler: async (ctx, args) => {
    try {
      // Get recipient user and profile
      const recipient = await ctx.db.get(args.userId);
      if (!recipient) {
        console.error(`Recipient user not found: ${args.userId}`);
        return { success: false, error: 'Recipient not found' };
      }

      const recipientProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .first();

      // Get all notifications
      const notifications = await Promise.all(
        args.notificationIds.map(id => ctx.db.get(id))
      );

      const validNotifications = notifications.filter(Boolean);
      if (validNotifications.length === 0) {
        return { success: false, error: 'No valid notifications found' };
      }

      // Prepare notification data for template
      const notificationData = await Promise.all(
        validNotifications.map(async (notification) => {
          let actorProfile = null;
          if (notification!.actorUserId) {
            actorProfile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", notification!.actorUserId!))
              .first();
          }

          return {
            type: notification!.type,
            actorName: actorProfile?.name || 'Someone',
            contentTitle: await getContentTitle(ctx, notification!.relatedContentType, notification!.relatedContentId),
            contentType: notification!.relatedContentType || 'content'
          };
        })
      );

      // Prepare template data
      const templateData = validateTemplateData({
        recipientName: recipientProfile?.name || recipient.name || 'User',
        appName: 'Ambrosia',
        appUrl: process.env.SITE_URL || 'https://oathstone.cloud',
        unsubscribeUrl: `${process.env.SITE_URL || 'https://oathstone.cloud'}/unsubscribe?token=${args.userId}`,
        notificationSettingsUrl: `${process.env.SITE_URL || 'https://oathstone.cloud'}/settings/notifications`
      });

      // Generate batch email template
      const emailTemplate = generateBatchEmailTemplate(notificationData, templateData);

      // Validate recipient email
      if (!recipient.email) {
        console.error(`Recipient has no email address: ${args.userId}`);
        return { success: false, error: 'Recipient has no email address' };
      }

      // Send email
      const emailId = await resend.sendEmail(ctx, {
        from: `Ambrosia <noreply@ambrosia.africa>`,
        to: recipient.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      // Record email in database
      await ctx.db.insert("emails", {
        userId: args.userId,
        emailId,
        batchId: args.batchId,
      });

      // Update all notifications with email delivery status
      for (const notificationId of args.notificationIds) {
        const notification = await ctx.db.get(notificationId);
        if (notification) {
          const updatedDeliveryStatus = { ...notification.deliveryStatus };
          updatedDeliveryStatus.email = {
            delivered: false, // Will be updated by webhook
            deliveredAt: undefined,
            messageId: emailId,
            sentAt: Date.now(),
            opened: false,
            batchId: args.batchId,
            error: undefined
          };

          await ctx.db.patch(notificationId, {
            deliveryStatus: updatedDeliveryStatus
          });
        }
      }

      return { success: true, emailId, batchId: args.batchId };

    } catch (error) {
      console.error('Error sending batch notification email:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});

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

// Retry failed email deliveries
export const retryFailedEmails = internalMutation({
  args: {
    maxRetries: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const maxRetries = args.maxRetries || 3;
    const retryWindow = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();

    // Find notifications with failed email delivery that haven't exceeded max retries
    const allNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.neq(q.field("deliveryStatus"), undefined))
      .take(200); // Get more to filter in memory

    const failedNotifications = allNotifications.filter(notification => {
      const emailStatus = notification.deliveryStatus?.email;
      if (!emailStatus) return false;
      
      return (
        !emailStatus.delivered &&
        emailStatus.error &&
        (emailStatus.retryCount || 0) < maxRetries &&
        (emailStatus.errorAt || 0) > now - retryWindow
      );
    }).slice(0, 50); // Limit batch size

    let retryCount = 0;
    for (const notification of failedNotifications) {
      const currentRetryCount = notification.deliveryStatus?.email?.retryCount || 0;
      
      // Exponential backoff: wait 2^retryCount hours
      const backoffHours = Math.pow(2, currentRetryCount);
      const backoffMs = backoffHours * 60 * 60 * 1000;
      const errorTime = notification.deliveryStatus?.email?.errorAt || 0;
      
      if (now - errorTime >= backoffMs) {
        await ctx.runMutation(internal.emails.sendNotificationEmail, {
          notificationId: notification._id,
          retryCount: currentRetryCount
        });
        retryCount++;
      }
    }

    return { retriedCount: retryCount };
  },
});
