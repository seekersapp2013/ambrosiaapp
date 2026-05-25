import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Track notification delivery events
export const trackDeliveryEvent = internalMutation({
  args: {
    notificationId: v.id("notifications"),
    channel: v.string(), // 'in_app' | 'email' | 'whatsapp' | 'sms'
    event: v.string(), // 'delivered' | 'viewed' | 'opened' | 'clicked' | 'dismissed' | 'failed'
    metadata: v.optional(v.object({
      messageId: v.optional(v.string()),
      error: v.optional(v.string()),
      userAgent: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      timestamp: v.optional(v.number())
    }))
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    const now = Date.now();
    const currentStatus = notification.deliveryStatus || {};
    const channelStatus = currentStatus[args.channel as keyof typeof currentStatus] || {};

    // Update delivery status based on event
    let updatedChannelStatus = { ...channelStatus };

    switch (args.event) {
      case 'delivered':
        updatedChannelStatus = {
          ...updatedChannelStatus,
          delivered: true,
          deliveredAt: now,
          messageId: args.metadata?.messageId
        };
        break;
      
      case 'viewed':
        updatedChannelStatus = {
          ...updatedChannelStatus,
          viewed: true,
          viewedAt: now
        };
        break;
      
      case 'opened':
        updatedChannelStatus = {
          ...updatedChannelStatus,
          opened: true,
          openedAt: now
        };
        break;
      
      case 'clicked':
        updatedChannelStatus = {
          ...updatedChannelStatus,
          clicked: true,
          clickedAt: now
        };
        break;
      
      case 'dismissed':
        updatedChannelStatus = {
          ...updatedChannelStatus,
          dismissed: true,
          dismissedAt: now
        };
        break;
      
      case 'failed':
        updatedChannelStatus = {
          ...updatedChannelStatus,
          delivered: false,
          error: args.metadata?.error,
          errorAt: now,
          retryCount: ((updatedChannelStatus as any).retryCount || 0) + 1
        };
        break;
    }

    // Update the notification with new delivery status
    await ctx.db.patch(args.notificationId, {
      deliveryStatus: {
        ...currentStatus,
        [args.channel]: updatedChannelStatus
      }
    });

    // Create analytics event record with proper metadata typing
    const eventMetadata = {
      messageId: args.metadata?.messageId,
      error: args.metadata?.error,
      userAgent: args.metadata?.userAgent,
      ipAddress: args.metadata?.ipAddress,
      timestamp: args.metadata?.timestamp
    };

    await ctx.db.insert("notificationEvents", {
      notificationId: args.notificationId,
      userId: notification.userId,
      channel: args.channel,
      event: args.event,
      timestamp: now,
      metadata: eventMetadata
    });
  }
});

// Track notification engagement (user interactions)
export const trackEngagement = mutation({
  args: {
    notificationId: v.id("notifications"),
    action: v.string(), // 'viewed' | 'clicked' | 'dismissed' | 'marked_read'
    metadata: v.optional(v.object({
      source: v.optional(v.string()), // 'notification_center' | 'email' | 'push'
      duration: v.optional(v.number()), // Time spent viewing
      clickTarget: v.optional(v.string()) // What was clicked
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) {
      throw new Error("Notification not found or not authorized");
    }

    // Track the engagement event with proper metadata mapping
    const trackingMetadata = args.metadata ? {
      messageId: undefined,
      error: undefined,
      userAgent: undefined,
      ipAddress: undefined,
      timestamp: undefined
    } : undefined;

    await ctx.runMutation(internal.notificationAnalytics.trackDeliveryEvent, {
      notificationId: args.notificationId,
      channel: args.metadata?.source || 'in_app',
      event: args.action,
      metadata: trackingMetadata
    });

    // Mark as read if viewed
    if (args.action === 'viewed' && !notification.isRead) {
      await ctx.db.patch(args.notificationId, { isRead: true });
    }
  }
});

// Get comprehensive delivery analytics
export const getDeliveryAnalytics = query({
  args: {
    timeRange: v.optional(v.string()), // 'hour' | 'day' | 'week' | 'month'
    channel: v.optional(v.string()), // Filter by specific channel
    notificationType: v.optional(v.string()) // Filter by notification type
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    // Calculate time range
    const now = Date.now();
    let startTime = 0;
    
    switch (args.timeRange) {
      case 'hour':
        startTime = now - (60 * 60 * 1000);
        break;
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
        startTime = now - (7 * 24 * 60 * 60 * 1000); // Default to week
    }

    // Get notifications in time range
    let notificationsQuery = ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("createdAt"), startTime));

    if (args.notificationType) {
      notificationsQuery = notificationsQuery.filter((q) => 
        q.eq(q.field("type"), args.notificationType)
      );
    }

    const notifications = await notificationsQuery.collect();

    // Get analytics events in time range
    const events = await ctx.db
      .query("notificationEvents")
      .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("timestamp"), startTime))
      .collect();

    // Calculate metrics
    const metrics = {
      totalNotifications: notifications.length,
      deliveryMetrics: {
        in_app: { sent: 0, delivered: 0, viewed: 0, clicked: 0, dismissed: 0 },
        email: { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0 },
        whatsapp: { sent: 0, delivered: 0, failed: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 }
      },
      engagementMetrics: {
        totalViews: 0,
        totalClicks: 0,
        totalDismissals: 0,
        averageTimeToView: 0,
        clickThroughRate: 0,
        dismissalRate: 0
      },
      performanceMetrics: {
        deliverySuccessRate: 0,
        averageDeliveryTime: 0,
        failureRate: 0,
        retryRate: 0
      }
    };

    // Process notifications for delivery metrics
    notifications.forEach(notification => {
      if (notification.deliveryChannels) {
        notification.deliveryChannels.forEach(channel => {
          if (channel in metrics.deliveryMetrics) {
            const channelMetrics = metrics.deliveryMetrics[channel as keyof typeof metrics.deliveryMetrics];
            channelMetrics.sent++;

            const status = notification.deliveryStatus?.[channel as keyof typeof notification.deliveryStatus] as any;
            if (status?.delivered) {
              channelMetrics.delivered++;
            }
            
            // Handle different channel types properly
            if (channel === 'in_app') {
              if (status?.viewed) {
                (channelMetrics as any).viewed++;
              }
              if (status?.clicked) {
                (channelMetrics as any).clicked++;
              }
              if (status?.dismissed) {
                (channelMetrics as any).dismissed++;
              }
            } else if (channel === 'email') {
              if (status?.opened) {
                (channelMetrics as any).opened++;
              }
              if (status?.clicked) {
                (channelMetrics as any).clicked++;
              }
            }
            
            if (status?.error) {
              (channelMetrics as any).failed++;
            }
          }
        });
      }
    });

    // Process events for engagement metrics
    let totalViewTime = 0;
    let viewCount = 0;
    let deliveryTimes: number[] = [];

    events.forEach(event => {
      switch (event.event) {
        case 'viewed':
          metrics.engagementMetrics.totalViews++;
          if (event.metadata.duration) {
            totalViewTime += event.metadata.duration;
            viewCount++;
          }
          break;
        case 'clicked':
          metrics.engagementMetrics.totalClicks++;
          break;
        case 'dismissed':
          metrics.engagementMetrics.totalDismissals++;
          break;
        case 'delivered':
          const notification = notifications.find(n => n._id === event.notificationId);
          if (notification) {
            const deliveryTime = event.timestamp - notification.createdAt;
            deliveryTimes.push(deliveryTime);
          }
          break;
      }
    });

    // Calculate derived metrics
    if (viewCount > 0) {
      metrics.engagementMetrics.averageTimeToView = totalViewTime / viewCount;
    }

    const totalDelivered = Object.values(metrics.deliveryMetrics)
      .reduce((sum, channel) => sum + channel.delivered, 0);
    const totalSent = Object.values(metrics.deliveryMetrics)
      .reduce((sum, channel) => sum + channel.sent, 0);

    if (totalSent > 0) {
      metrics.performanceMetrics.deliverySuccessRate = (totalDelivered / totalSent) * 100;
      metrics.engagementMetrics.clickThroughRate = (metrics.engagementMetrics.totalClicks / totalSent) * 100;
      metrics.engagementMetrics.dismissalRate = (metrics.engagementMetrics.totalDismissals / totalSent) * 100;
    }

    if (deliveryTimes.length > 0) {
      metrics.performanceMetrics.averageDeliveryTime = 
        deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
    }

    const totalFailed = Object.values(metrics.deliveryMetrics)
      .reduce((sum, channel) => sum + ((channel as any).failed || 0), 0);
    
    if (totalSent > 0) {
      metrics.performanceMetrics.failureRate = (totalFailed / totalSent) * 100;
    }

    return {
      timeRange: args.timeRange || 'week',
      startTime,
      endTime: now,
      ...metrics
    };
  }
});

// Get notification funnel analytics (creation -> delivery -> engagement)
export const getFunnelAnalytics = query({
  args: {
    timeRange: v.optional(v.string()),
    notificationType: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    // Calculate time range
    const now = Date.now();
    let startTime = now - (7 * 24 * 60 * 60 * 1000); // Default to week
    
    switch (args.timeRange) {
      case 'day':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get notifications
    let query = ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .filter((q) => q.gte(q.field("createdAt"), startTime));

    if (args.notificationType) {
      query = query.filter((q) => q.eq(q.field("type"), args.notificationType));
    }

    const notifications = await query.collect();

    // Calculate funnel metrics
    const funnel = {
      created: notifications.length,
      delivered: 0,
      viewed: 0,
      clicked: 0,
      converted: 0 // Clicked through to content
    };

    notifications.forEach(notification => {
      // Check if delivered to any channel
      if (notification.deliveryStatus) {
        const hasDelivery = Object.values(notification.deliveryStatus).some(
          (status: any) => status?.delivered
        );
        if (hasDelivery) funnel.delivered++;

        // Check if viewed/opened in any channel
        const hasView = Object.values(notification.deliveryStatus).some(
          (status: any) => status?.viewed || status?.opened
        );
        if (hasView) funnel.viewed++;

        // Check if clicked in any channel
        const hasClick = Object.values(notification.deliveryStatus).some(
          (status: any) => status?.clicked
        );
        if (hasClick) {
          funnel.clicked++;
          // Consider clicks as conversions for now
          funnel.converted++;
        }
      }
    });

    // Calculate conversion rates
    const conversionRates = {
      deliveryRate: funnel.created > 0 ? (funnel.delivered / funnel.created) * 100 : 0,
      viewRate: funnel.delivered > 0 ? (funnel.viewed / funnel.delivered) * 100 : 0,
      clickRate: funnel.viewed > 0 ? (funnel.clicked / funnel.viewed) * 100 : 0,
      conversionRate: funnel.created > 0 ? (funnel.converted / funnel.created) * 100 : 0
    };

    return {
      timeRange: args.timeRange || 'week',
      funnel,
      conversionRates,
      totalNotifications: funnel.created
    };
  }
});

// Get real-time notification system health metrics
export const getSystemHealthMetrics = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Get recent notifications and events
    const [recentNotifications, recentEvents] = await Promise.all([
      ctx.db
        .query("notifications")
        .withIndex("by_created", (q) => q.gte("createdAt", oneHourAgo))
        .collect(),
      ctx.db
        .query("notificationEvents")
        .withIndex("by_timestamp", (q) => q.gte("timestamp", oneHourAgo))
        .collect()
    ]);

    // Calculate system health metrics
    const totalNotifications = recentNotifications.length;
    const deliveredCount = recentEvents.filter(e => e.event === 'delivered').length;
    const failedCount = recentEvents.filter(e => e.event === 'failed').length;
    
    const deliveryRate = totalNotifications > 0 ? (deliveredCount / totalNotifications) * 100 : 100;
    const failureRate = totalNotifications > 0 ? (failedCount / totalNotifications) * 100 : 0;

    // Calculate average processing time
    const processingTimes: number[] = [];
    recentNotifications.forEach(notification => {
      const deliveryEvent = recentEvents.find(
        e => e.notificationId === notification._id && e.event === 'delivered'
      );
      if (deliveryEvent) {
        processingTimes.push(deliveryEvent.timestamp - notification.createdAt);
      }
    });

    const avgProcessingTime = processingTimes.length > 0 
      ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
      : 0;

    // Get channel-specific metrics
    const channelMetrics = {
      in_app: { sent: 0, delivered: 0, failed: 0 },
      email: { sent: 0, delivered: 0, failed: 0 },
      whatsapp: { sent: 0, delivered: 0, failed: 0 },
      sms: { sent: 0, delivered: 0, failed: 0 }
    };

    recentEvents.forEach(event => {
      if (event.channel in channelMetrics) {
        const channel = channelMetrics[event.channel as keyof typeof channelMetrics];
        if (event.event === 'delivered') channel.delivered++;
        if (event.event === 'failed') channel.failed++;
      }
    });

    recentNotifications.forEach(notification => {
      notification.deliveryChannels?.forEach(channel => {
        if (channel in channelMetrics) {
          channelMetrics[channel as keyof typeof channelMetrics].sent++;
        }
      });
    });

    return {
      timestamp: now,
      timeRange: 'last_hour',
      overallHealth: {
        totalNotifications,
        deliveryRate,
        failureRate,
        avgProcessingTimeMs: avgProcessingTime,
        status: deliveryRate >= 95 ? 'healthy' : deliveryRate >= 85 ? 'warning' : 'critical'
      },
      channelHealth: channelMetrics,
      alerts: [
        ...(deliveryRate < 85 ? [{ type: 'critical', message: `Low delivery rate: ${deliveryRate.toFixed(1)}%` }] : []),
        ...(failureRate > 10 ? [{ type: 'warning', message: `High failure rate: ${failureRate.toFixed(1)}%` }] : []),
        ...(avgProcessingTime > 30000 ? [{ type: 'warning', message: `Slow processing: ${(avgProcessingTime/1000).toFixed(1)}s avg` }] : [])
      ]
    };
  }
});

// Get user engagement analytics dashboard
export const getUserEngagementDashboard = query({
  args: {
    timeRange: v.optional(v.string()) // 'day' | 'week' | 'month'
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const now = Date.now();
    let startTime = now - (7 * 24 * 60 * 60 * 1000); // Default to week
    
    switch (args.timeRange) {
      case 'day':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get user's notifications and events
    const [notifications, events] = await Promise.all([
      ctx.db
        .query("notifications")
        .withIndex("by_user_created", (q) => q.eq("userId", userId))
        .filter((q) => q.gte(q.field("createdAt"), startTime))
        .collect(),
      ctx.db
        .query("notificationEvents")
        .withIndex("by_user_timestamp", (q) => q.eq("userId", userId))
        .filter((q) => q.gte(q.field("timestamp"), startTime))
        .collect()
    ]);

    // Calculate engagement metrics by day
    const dailyMetrics: Record<string, any> = {};
    const days = Math.ceil((now - startTime) / (24 * 60 * 60 * 1000));
    
    for (let i = 0; i < days; i++) {
      const dayStart = startTime + (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);
      const dayKey = new Date(dayStart).toISOString().split('T')[0];
      
      const dayNotifications = notifications.filter(n => 
        n.createdAt >= dayStart && n.createdAt < dayEnd
      );
      const dayEvents = events.filter(e => 
        e.timestamp >= dayStart && e.timestamp < dayEnd
      );

      dailyMetrics[dayKey] = {
        date: dayKey,
        notificationsReceived: dayNotifications.length,
        notificationsViewed: dayEvents.filter(e => e.event === 'viewed').length,
        notificationsClicked: dayEvents.filter(e => e.event === 'clicked').length,
        notificationsDismissed: dayEvents.filter(e => e.event === 'dismissed').length,
        engagementRate: dayNotifications.length > 0 
          ? (dayEvents.filter(e => ['viewed', 'clicked'].includes(e.event)).length / dayNotifications.length) * 100 
          : 0
      };
    }

    // Calculate category preferences
    const categoryEngagement: Record<string, any> = {};
    notifications.forEach(notification => {
      if (notification.category) {
        if (!categoryEngagement[notification.category]) {
          categoryEngagement[notification.category] = {
            received: 0,
            viewed: 0,
            clicked: 0,
            engagementRate: 0
          };
        }
        categoryEngagement[notification.category].received++;
      }
    });

    events.forEach(event => {
      const notification = notifications.find(n => n._id === event.notificationId);
      if (notification?.category && categoryEngagement[notification.category]) {
        if (event.event === 'viewed') {
          categoryEngagement[notification.category].viewed++;
        }
        if (event.event === 'clicked') {
          categoryEngagement[notification.category].clicked++;
        }
      }
    });

    // Calculate engagement rates for categories
    Object.keys(categoryEngagement).forEach(category => {
      const cat = categoryEngagement[category];
      cat.engagementRate = cat.received > 0 
        ? ((cat.viewed + cat.clicked) / cat.received) * 100 
        : 0;
    });

    // Overall summary
    const totalReceived = notifications.length;
    const totalViewed = events.filter(e => e.event === 'viewed').length;
    const totalClicked = events.filter(e => e.event === 'clicked').length;
    const overallEngagementRate = totalReceived > 0 
      ? ((totalViewed + totalClicked) / totalReceived) * 100 
      : 0;

    return {
      timeRange: args.timeRange || 'week',
      summary: {
        totalReceived,
        totalViewed,
        totalClicked,
        engagementRate: overallEngagementRate
      },
      dailyMetrics: Object.values(dailyMetrics),
      categoryEngagement,
      recommendations: [
        ...(overallEngagementRate < 20 ? ['Consider adjusting notification frequency or content'] : []),
        ...(Object.values(categoryEngagement).some((cat: any) => cat.engagementRate < 10) 
          ? ['Some notification categories have low engagement - review settings'] : [])
      ]
    };
  }
});

// Get notification preference analytics (admin/system level)
export const getNotificationPreferenceAnalytics = query({
  args: {},
  handler: async (ctx) => {
    // This would typically require admin permissions
    // For now, we'll return aggregated, anonymized data
    
    const [allSettings, allNotifications] = await Promise.all([
      ctx.db.query("notificationSettings").collect(),
      ctx.db.query("notifications").collect()
    ]);

    // Analyze notification type preferences
    const typePreferences: Record<string, any> = {};
    allSettings.forEach(setting => {
      if (!typePreferences[setting.notificationType]) {
        typePreferences[setting.notificationType] = {
          totalUsers: 0,
          enabledUsers: 0,
          channelPreferences: {
            in_app: 0,
            email: 0,
            whatsapp: 0,
            sms: 0,
            push: 0
          }
        };
      }
      
      const pref = typePreferences[setting.notificationType];
      pref.totalUsers++;
      
      if (setting.enabled) {
        pref.enabledUsers++;
        Object.entries(setting.channels).forEach(([channel, enabled]) => {
          if (enabled && channel in pref.channelPreferences) {
            pref.channelPreferences[channel]++;
          }
        });
      }
    });

    // Calculate adoption rates
    Object.keys(typePreferences).forEach(type => {
      const pref = typePreferences[type];
      pref.adoptionRate = pref.totalUsers > 0 ? (pref.enabledUsers / pref.totalUsers) * 100 : 0;
      
      // Convert channel counts to percentages
      Object.keys(pref.channelPreferences).forEach(channel => {
        pref.channelPreferences[channel] = pref.enabledUsers > 0 
          ? (pref.channelPreferences[channel] / pref.enabledUsers) * 100 
          : 0;
      });
    });

    // Analyze batching preferences
    const batchingAnalysis = {
      immediate: 0,
      batched: 0,
      digest: 0
    };

    allSettings.forEach(setting => {
      const pref = setting.batchingPreference || 'immediate';
      if (pref in batchingAnalysis) {
        batchingAnalysis[pref as keyof typeof batchingAnalysis]++;
      }
    });

    const totalUsers = new Set(allSettings.map(s => s.userId)).size;

    return {
      totalUsers,
      typePreferences,
      batchingPreferences: batchingAnalysis,
      insights: [
        {
          type: 'adoption',
          message: `Average notification adoption rate: ${
            Object.values(typePreferences).reduce((sum: number, pref: any) => sum + pref.adoptionRate, 0) / 
            Object.keys(typePreferences).length
          }%`
        },
        {
          type: 'channel',
          message: `Most popular channel: ${
            ['in_app', 'email', 'whatsapp', 'sms', 'push'].reduce((most, channel) => {
              const currentTotal = Object.values(typePreferences).reduce((sum: number, pref: any) => 
                sum + pref.channelPreferences[channel], 0);
              const mostTotal = Object.values(typePreferences).reduce((sum: number, pref: any) => 
                sum + pref.channelPreferences[most], 0);
              return currentTotal > mostTotal ? channel : most;
            })
          }`
        }
      ]
    };
  }
});

// Get performance monitoring dashboard
export const getPerformanceMonitoring = query({
  args: {
    timeRange: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let startTime = now - (24 * 60 * 60 * 1000); // Default to day
    
    switch (args.timeRange) {
      case 'hour':
        startTime = now - (60 * 60 * 1000);
        break;
      case 'day':
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
    }

    const [notifications, events, batches] = await Promise.all([
      ctx.db
        .query("notifications")
        .withIndex("by_created", (q) => q.gte("createdAt", startTime))
        .collect(),
      ctx.db
        .query("notificationEvents")
        .withIndex("by_timestamp", (q) => q.gte("timestamp", startTime))
        .collect(),
      ctx.db
        .query("notificationBatches")
        .withIndex("by_created", (q) => q.gte("createdAt", startTime))
        .collect()
    ]);

    // Calculate throughput metrics
    const timeRangeMs = now - startTime;
    const throughput = {
      notificationsPerHour: (notifications.length / timeRangeMs) * (60 * 60 * 1000),
      eventsPerHour: (events.length / timeRangeMs) * (60 * 60 * 1000),
      batchesPerHour: (batches.length / timeRangeMs) * (60 * 60 * 1000)
    };

    // Calculate latency metrics
    const deliveryLatencies: number[] = [];
    const processingLatencies: number[] = [];

    notifications.forEach(notification => {
      const deliveryEvent = events.find(
        e => e.notificationId === notification._id && e.event === 'delivered'
      );
      if (deliveryEvent) {
        deliveryLatencies.push(deliveryEvent.timestamp - notification.createdAt);
      }

      // Processing latency (creation to first event)
      const firstEvent = events
        .filter(e => e.notificationId === notification._id)
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      if (firstEvent) {
        processingLatencies.push(firstEvent.timestamp - notification.createdAt);
      }
    });

    const avgDeliveryLatency = deliveryLatencies.length > 0 
      ? deliveryLatencies.reduce((sum, lat) => sum + lat, 0) / deliveryLatencies.length 
      : 0;

    const avgProcessingLatency = processingLatencies.length > 0 
      ? processingLatencies.reduce((sum, lat) => sum + lat, 0) / processingLatencies.length 
      : 0;

    // Calculate error rates
    const totalEvents = events.length;
    const errorEvents = events.filter(e => e.event === 'failed').length;
    const errorRate = totalEvents > 0 ? (errorEvents / totalEvents) * 100 : 0;

    // Batching efficiency
    const batchingEfficiency = {
      totalBatches: batches.length,
      avgBatchSize: batches.length > 0 
        ? batches.reduce((sum, batch) => sum + batch.batchCount, 0) / batches.length 
        : 0,
      batchingRate: notifications.length > 0 
        ? (notifications.filter(n => n.batchId).length / notifications.length) * 100 
        : 0
    };

    return {
      timeRange: args.timeRange || 'day',
      timestamp: now,
      throughput,
      latency: {
        avgDeliveryLatencyMs: avgDeliveryLatency,
        avgProcessingLatencyMs: avgProcessingLatency,
        p95DeliveryLatency: deliveryLatencies.length > 0 
          ? deliveryLatencies.sort((a, b) => a - b)[Math.floor(deliveryLatencies.length * 0.95)] 
          : 0
      },
      reliability: {
        errorRate,
        successRate: 100 - errorRate,
        totalNotifications: notifications.length,
        totalEvents: events.length
      },
      batchingEfficiency,
      systemStatus: {
        status: errorRate < 1 && avgDeliveryLatency < 5000 ? 'healthy' : 
                errorRate < 5 && avgDeliveryLatency < 15000 ? 'warning' : 'critical',
        uptime: 99.9, // This would be calculated from actual system monitoring
        lastIncident: null // This would come from incident tracking
      }
    };
  }
});