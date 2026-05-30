import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { vEmailId } from "@convex-dev/resend";

export default defineSchema({
  ...authTables,
  // Override authRefreshTokens to accommodate legacy documents that contain
  // fields from an older version of @convex-dev/auth (firstUsedTime, parentRefreshTokenId)
  authRefreshTokens: defineTable({
    expirationTime: v.float64(),
    sessionId: v.id("authSessions"),
    firstUsedTime: v.optional(v.float64()),
    parentRefreshTokenId: v.optional(v.string()),
  }).index("sessionId", ["sessionId"]),

  emails: defineTable({
    userId: v.id("users"),
    emailId: vEmailId,
    notificationId: v.optional(v.id("notifications")), // Link to notification if this is a notification email
    batchId: v.optional(v.string()), // For batch notification emails
  }).index("userId", ["userId"])
    .index("emailId", ["emailId"])
    .index("notificationId", ["notificationId"]),

  // ✅ Currency metadata and exchange rates
  currencyMetadata: defineTable({
    code: v.string(), // Currency code (USD, NGN, etc.)
    name: v.string(), // Full name (US Dollar, Nigerian Naira, etc.)
    symbol: v.string(), // Currency symbol ($, ₦, etc.)
    decimals: v.number(), // Number of decimal places
    isActive: v.boolean(), // Whether currency is currently supported
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  // ✅ Exchange rates cache
  exchangeRates: defineTable({
    baseCurrency: v.string(), // Base currency (e.g., USD)
    targetCurrency: v.string(), // Target currency (e.g., NGN)
    rate: v.number(), // Exchange rate
    source: v.string(), // API source (exchangerate-api, frankfurter, etc.)
    lastUpdated: v.number(), // Timestamp of last update
    expiresAt: v.number(), // When this rate expires
    createdAt: v.number()
  }).index("by_pair", ["baseCurrency", "targetCurrency"])
    .index("by_base", ["baseCurrency"])
    .index("by_expires", ["expiresAt"])
    .index("by_source", ["source"]),

  // ✅ Multi-currency wallet table
  wallets: defineTable({
    userId: v.id("users"),      // Link to authenticated user
    primaryCurrency: v.string(), // User's primary currency (USD, NGN, GBP, etc.)
    phoneCountryDetected: v.boolean(), // Whether country was detected from phone
    balances: v.object({
      USD: v.number(),
      NGN: v.number(),
      GBP: v.number(),
      EUR: v.number(),
      CAD: v.number(),
      GHS: v.number(),
      KES: v.number(),
      GMD: v.number(),
      ZAR: v.number()
    }),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("userId", ["userId"])
    .index("by_primary_currency", ["primaryCurrency"]),

  // ✅ Multi-currency transactions table
  transactions: defineTable({
    id: v.string(),             // Unique transaction ID
    fromUserId: v.optional(v.id("users")), // null for deposits
    toUserId: v.optional(v.id("users")),   // null for withdrawals
    amount: v.number(),
    currency: v.string(),       // Any of the 9 supported currencies
    type: v.string(),           // "deposit" | "withdrawal" | "transfer"
    status: v.string(),         // "pending" | "completed" | "failed"
    description: v.string(),
    paymentGateway: v.optional(v.string()), // "direct" | "ercaspay"
    externalTransactionId: v.optional(v.string()), // ErcasPay transaction reference
    paymentUrl: v.optional(v.string()), // ErcasPay checkout URL
    webhookData: v.optional(v.any()), // Webhook response data
    metadata: v.optional(v.any()), // Additional data like recipient username, exchange rates
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_from_user", ["fromUserId"])
    .index("by_to_user", ["toUserId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_currency", ["currency"])
    .index("by_external_id", ["externalTransactionId"])
    .index("by_payment_gateway", ["paymentGateway"]),

  // ✅ Enhanced user profiles with phone detection and PIN security
  profiles: defineTable({
    userId: v.id("users"),
    username: v.string(),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()), // storage id
    phoneNumber: v.optional(v.string()), // Required for country detection
    phoneCountryCode: v.optional(v.string()), // Extracted from phone (+234, +1, etc.)
    detectedCountry: v.optional(v.string()), // Country code from phone (NG, US, etc.)
    pinHash: v.optional(v.string()), // Bcrypt hashed PIN for withdrawals
    interests: v.optional(v.array(v.string())), // Health-related interests
    tags: v.optional(v.array(v.string())), // User tags for recommendations
    // TEMPORARY: Old wallet fields - remove after migration
    walletAddress: v.optional(v.string()),
    privateKey: v.optional(v.string()),
    seedPhrase: v.optional(v.string()),
    walletSeedEnc: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_username", ["username"])
    .index("by_userId", ["userId"])
    .index("by_phone", ["phoneNumber"])
    .index("by_country", ["detectedCountry"]),

  // ✅ Articles table
  articles: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    subtitle: v.optional(v.string()),
    slug: v.string(),
    contentHtml: v.string(),
    contentDelta: v.optional(v.any()),
    coverImage: v.optional(v.string()), // storage id
    readTimeMin: v.number(),
    tags: v.array(v.string()),
    status: v.string(), // DRAFT | PUBLISHED | ARCHIVED
    publishedAt: v.optional(v.number()),
    isSensitive: v.boolean(),
    isPublic: v.optional(v.boolean()), // Optional for migration compatibility
    // Gating with custom token (sellerAddress temporarily optional for migration)
    isGated: v.boolean(),
    priceToken: v.optional(v.string()), // e.g., "USD"
    priceAmount: v.optional(v.number()),
    sellerAddress: v.optional(v.string()), // TEMPORARY: Remove after migration
    views: v.number(),
    // Moderation fields
    approvalStatus: v.optional(v.string()), // "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED"
    approvalRequestedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedByRole: v.optional(v.id("moderationRoles")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_slug", ["slug"])
    .index("by_author", ["authorId"])
    .index("by_tag", ["tags"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_public", ["isPublic"])
    .index("by_public_status", ["isPublic", "status"])
    .index("by_approval_status", ["approvalStatus"]),

  // ✅ Reels table
  reels: defineTable({
    authorId: v.id("users"),
    video: v.string(), // storage id
    poster: v.optional(v.string()), // storage id
    durationS: v.optional(v.number()),
    caption: v.optional(v.string()),
    tags: v.array(v.string()),
    isSensitive: v.boolean(),
    isPublic: v.optional(v.boolean()), // Optional for migration compatibility
    // Gating with custom token (sellerAddress temporarily optional for migration)
    isGated: v.boolean(),
    priceToken: v.optional(v.string()),
    priceAmount: v.optional(v.number()),
    sellerAddress: v.optional(v.string()), // TEMPORARY: Remove after migration
    views: v.number(),
    // Moderation fields
    approvalStatus: v.optional(v.string()), // "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED"
    approvalRequestedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedByRole: v.optional(v.id("moderationRoles")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number()
  }).index("by_author", ["authorId"])
    .index("by_created", ["createdAt"])
    .index("by_public", ["isPublic"])
    .index("by_approval_status", ["approvalStatus"]),

  // ✅ Comments table
  comments: defineTable({
    articleId: v.optional(v.id("articles")),
    reelId: v.optional(v.id("reels")),
    authorId: v.id("users"),
    parentId: v.optional(v.id("comments")),
    content: v.string(),
    createdAt: v.number()
  }).index("by_article", ["articleId"]).index("by_reel", ["reelId"]),

  // ✅ Stream Comments table (for live stream chat)
  streamComments: defineTable({
    streamId: v.id("bookings"),
    authorId: v.id("users"),
    parentId: v.optional(v.id("streamComments")),
    content: v.string(),
    createdAt: v.number()
  }).index("by_stream", ["streamId"]).index("by_author", ["authorId"]),

  // ✅ Likes table
  likes: defineTable({
    userId: v.id("users"),
    articleId: v.optional(v.id("articles")),
    reelId: v.optional(v.id("reels")),
    streamId: v.optional(v.id("bookings")), // For live stream likes
    createdAt: v.number()
  }).index("by_user_article", ["userId", "articleId"]).index("by_user_reel", ["userId", "reelId"]).index("by_user_stream", ["userId", "streamId"]),

  // ✅ Claps table (per-user clap counts per article)
  claps: defineTable({
    userId: v.id("users"),
    articleId: v.id("articles"),
    count: v.number(), // 0..100 per user per article
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_user_article", ["userId", "articleId"]).index("by_article", ["articleId"]),

  // ✅ Reads table (tracks if a user has opened an article)
  reads: defineTable({
    userId: v.id("users"),
    articleId: v.id("articles"),
    createdAt: v.number(),
  }).index("by_user_article", ["userId", "articleId"]).index("by_article", ["articleId"]),

  // ✅ Bookmarks table
  bookmarks: defineTable({
    userId: v.id("users"),
    articleId: v.optional(v.id("articles")),
    reelId: v.optional(v.id("reels")),
    streamId: v.optional(v.id("bookings")), // For live stream bookmarks
    createdAt: v.number()
  }).index("by_user", ["userId"]).index("by_user_article", ["userId", "articleId"]).index("by_user_reel", ["userId", "reelId"]).index("by_user_stream", ["userId", "streamId"]),

  // ✅ Follows table
  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
    createdAt: v.number()
  }).index("by_follower", ["followerId"]).index("by_following", ["followingId"]),

  // ✅ Payments audit trail (updated for internal transactions)
  payments: defineTable({
    payerId: v.id("users"),
    contentType: v.string(), // 'article' | 'reel' | 'course'
    contentId: v.union(v.id("articles"), v.id("reels"), v.id("courses")),
    token: v.string(),
    amount: v.number(),
    transactionId: v.string(), // Reference to internal transaction
    createdAt: v.number()
  }).index("by_content", ["contentType", "contentId"]).index("by_payer", ["payerId"]).index("by_token", ["token"]).index("by_user_content", ["payerId", "contentType", "contentId"]).index("by_transaction", ["transactionId"]),

  // ✅ Payment Intents for ErcasPay integration
  paymentIntents: defineTable({
    userId: v.string(),
    amount: v.number(),
    currency: v.string(),
    reference: v.string(), // ErcasPay transaction reference
    paymentReference: v.string(), // ErcasPay payment reference
    provider: v.string(), // "ercaspay"
    status: v.string(), // "pending" | "success" | "failed"
    customerEmail: v.string(),
    customerName: v.string(),
    customerPhone: v.optional(v.string()),
    ercasPayData: v.optional(v.any()), // ErcasPay response data
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_reference", ["reference"])
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_provider", ["provider"]),

  // ✅ ErcasPay Transactions for tracking payment flow
  ercasPayTransactions: defineTable({
    id: v.string(), // Internal transaction ID
    userId: v.string(),
    amount: v.number(),
    currency: v.string(),
    paymentReference: v.string(),
    externalTransactionId: v.optional(v.string()), // ErcasPay transaction reference
    paymentUrl: v.optional(v.string()), // ErcasPay checkout URL
    status: v.string(), // "pending" | "completed" | "failed"
    webhookData: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number())
  }).index("by_transaction_id", ["id"])
    .index("by_user", ["userId"])
    .index("by_external_id", ["externalTransactionId"])
    .index("by_status", ["status"])
    .index("by_payment_reference", ["paymentReference"]),

  // ✅ Enhanced Notifications table
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),

    // Enhanced fields
    category: v.optional(v.string()), // 'engagement' | 'social' | 'content' | 'system'
    priority: v.optional(v.string()), // 'low' | 'medium' | 'high'

    // Related content
    relatedContentType: v.optional(v.string()), // 'article' | 'reel' | 'comment' | 'user'
    relatedContentId: v.optional(v.string()),
    relatedId: v.optional(v.string()), // Legacy field for backward compatibility

    // Actor information (who triggered the notification)
    actorUserId: v.optional(v.id("users")),

    // Metadata for additional context
    metadata: v.optional(v.any()),

    // Batching
    batchId: v.optional(v.union(v.string(), v.id("notificationBatches"))),
    batchCount: v.optional(v.number()),
    batchedInto: v.optional(v.id("notifications")), // If this notification was batched into a summary notification
    hiddenFromFeed: v.optional(v.boolean()), // Hide individual notifications that are part of a batch

    // Delivery tracking
    deliveryChannels: v.optional(v.array(v.string())),
    deliveryStatus: v.optional(v.object({
      in_app: v.optional(v.object({
        delivered: v.boolean(),
        deliveredAt: v.optional(v.number()),
        viewed: v.optional(v.boolean()),
        viewedAt: v.optional(v.number()),
        clicked: v.optional(v.boolean()),
        clickedAt: v.optional(v.number()),
        dismissed: v.optional(v.boolean()),
        dismissedAt: v.optional(v.number()),
        error: v.optional(v.string()),
        errorAt: v.optional(v.number()),
        retryCount: v.optional(v.number())
      })),
      email: v.optional(v.object({
        delivered: v.boolean(),
        deliveredAt: v.optional(v.number()),
        messageId: v.optional(v.string()),
        opened: v.optional(v.boolean()),
        openedAt: v.optional(v.number()),
        clicked: v.optional(v.boolean()),
        clickedAt: v.optional(v.number()),
        sentAt: v.optional(v.number()),
        error: v.optional(v.string()),
        errorAt: v.optional(v.number()),
        retryCount: v.optional(v.number()),
        batchId: v.optional(v.string())
      })),
      whatsapp: v.optional(v.object({
        delivered: v.boolean(),
        deliveredAt: v.optional(v.number()),
        messageId: v.optional(v.string()),
        error: v.optional(v.string()),
        errorAt: v.optional(v.number()),
        retryCount: v.optional(v.number())
      })),
      sms: v.optional(v.object({
        delivered: v.boolean(),
        deliveredAt: v.optional(v.number()),
        messageId: v.optional(v.string()),
        error: v.optional(v.string()),
        errorAt: v.optional(v.number()),
        retryCount: v.optional(v.number())
      }))
    })),

    createdAt: v.number(),
    scheduledFor: v.optional(v.number()), // For delayed delivery
    expiresAt: v.optional(v.number())
  }).index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_type", ["type"])
    .index("by_category", ["category"])
    .index("by_priority", ["priority"])
    .index("by_scheduled", ["scheduledFor"])
    .index("by_batch", ["batchId"])
    .index("by_actor", ["actorUserId"])
    .index("by_created", ["createdAt"]),

  // ✅ User notification settings
  notificationSettings: defineTable({
    userId: v.id("users"),
    notificationType: v.string(),
    enabled: v.boolean(),
    channels: v.object({
      in_app: v.boolean(),
      email: v.boolean(),
      whatsapp: v.boolean(),
      sms: v.boolean(),
      push: v.boolean()
    }),
    quietHours: v.optional(v.object({
      enabled: v.boolean(),
      startTime: v.string(), // "22:00"
      endTime: v.string(), // "08:00"
      timezone: v.string()
    })),
    batchingPreference: v.string(), // 'immediate' | 'batched' | 'digest'
    updatedAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_user_type", ["userId", "notificationType"]),

  // ✅ Notification batches for grouping similar notifications
  notificationBatches: defineTable({
    userId: v.id("users"),
    type: v.string(), // Notification type being batched
    notifications: v.array(v.id("notifications")), // Array of notification IDs in this batch
    batchCount: v.number(),
    category: v.string(),
    priority: v.string(),
    batchingMode: v.string(), // 'batched' | 'digest'
    processed: v.boolean(),
    processedAt: v.optional(v.number()),
    summaryNotificationId: v.optional(v.id("notifications")), // The summary notification created from this batch
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"])
    .index("by_processed", ["processed"])
    .index("by_created", ["createdAt"]),

  // ✅ User activity tracking for intelligent timing
  userActivity: defineTable({
    userId: v.id("users"),
    lastActiveAt: v.number(),
    sessionCount: v.number(),
    averageSessionDuration: v.number(), // in milliseconds
    preferredActiveHours: v.array(v.number()), // Hours of day when user is typically active (0-23)
    timezone: v.string(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_last_active", ["lastActiveAt"]),

  // ✅ Notification events for detailed analytics tracking
  notificationEvents: defineTable({
    notificationId: v.id("notifications"),
    userId: v.id("users"),
    channel: v.string(), // 'in_app' | 'email' | 'whatsapp' | 'sms' | 'push'
    event: v.string(), // 'delivered' | 'viewed' | 'opened' | 'clicked' | 'dismissed' | 'failed'
    timestamp: v.number(),
    metadata: v.object({
      messageId: v.optional(v.string()),
      error: v.optional(v.string()),
      userAgent: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      source: v.optional(v.string()), // 'notification_center' | 'email' | 'push'
      duration: v.optional(v.number()), // Time spent viewing
      clickTarget: v.optional(v.string()), // What was clicked
      batchId: v.optional(v.string())
    })
  }).index("by_notification", ["notificationId"])
    .index("by_user", ["userId"])
    .index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_channel", ["channel"])
    .index("by_event", ["event"])
    .index("by_timestamp", ["timestamp"]),

  // ✅ Booking Subscribers table
  bookingSubscribers: defineTable({
    userId: v.id("users"),
    jobTitle: v.string(),
    specialization: v.string(),
    sessionPrice: v.number(), // Legacy field - Price in USD for 60-minute session (kept for backward compatibility)
    oneOnOnePrice: v.optional(v.number()), // Price for 1-on-1 sessions per hour
    groupSessionPrice: v.optional(v.number()), // Price for group sessions per person per hour
    aboutUser: v.string(),
    xLink: v.optional(v.string()),
    linkedInLink: v.optional(v.string()),
    offerDescription: v.string(), // What users can learn
    openHours: v.object({
      monday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      tuesday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      wednesday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      thursday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      friday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      saturday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      sunday: v.object({ start: v.string(), end: v.string(), available: v.boolean() })
    }),
    isActive: v.boolean(),
    // Moderation fields
    approvalStatus: v.optional(v.string()), // "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED"
    approvalRequestedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedByRole: v.optional(v.id("moderationRoles")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_user", ["userId"])
    .index("by_specialization", ["specialization"])
    .index("by_job_title", ["jobTitle"])
    .index("by_active", ["isActive"])
    .index("by_approval_status", ["approvalStatus"]),

  // ✅ Bookings table
  bookings: defineTable({
    providerId: v.id("users"), // The service provider
    clientId: v.id("users"), // The person booking
    sessionDate: v.string(), // YYYY-MM-DD format
    sessionTime: v.string(), // HH:MM format
    duration: v.number(), // Duration in minutes (default 60)
    totalAmount: v.number(), // Total price paid
    currency: v.string(), // Currency code (USD, NGN, GBP, etc.)
    status: v.string(), // PENDING | CONFIRMED | CANCELLED | COMPLETED
    paymentTxHash: v.optional(v.string()),
    sessionDetails: v.optional(v.string()), // Meeting link or instructions
    confirmationType: v.string(), // AUTOMATIC | MANUAL
    // New fields for 1-to-many bookings
    sessionType: v.string(), // "ONE_ON_ONE" | "ONE_TO_MANY"
    eventId: v.optional(v.id("events")), // Reference to event for 1-to-many bookings
    // Audio room participant role (PHASE 1: Audio-only events)
    participantRole: v.optional(v.string()), // "SPEAKER" | "LISTENER" (for audio-only events)
    handRaised: v.optional(v.boolean()),
    handRaisedAt: v.optional(v.number()),
    // LiveKit streaming fields
    liveStreamRoomName: v.optional(v.string()), // LiveKit room name
    liveStreamStatus: v.optional(v.string()), // "NOT_STARTED" | "LIVE" | "ENDED"
    recordingId: v.optional(v.string()), // LiveKit recording ID
    recordingUrl: v.optional(v.string()), // URL to recorded session
    recordingStorageId: v.optional(v.string()), // Convex storage ID for recording
    uploadedToReels: v.optional(v.boolean()), // Whether recording was uploaded to reels
    reelId: v.optional(v.id("reels")), // Reference to created reel
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_provider", ["providerId"])
    .index("by_client", ["clientId"])
    .index("by_date", ["sessionDate"])
    .index("by_status", ["status"])
    .index("by_provider_date", ["providerId", "sessionDate"])
    .index("by_event", ["eventId"])
    .index("by_session_type", ["sessionType"])
    .index("by_stream_status", ["liveStreamStatus"])
    .index("by_room_name", ["liveStreamRoomName"])
    .index("by_currency", ["currency"])
    .index("by_hand_raised", ["handRaised"]),

  // ✅ Events table for 1-to-many bookings
  events: defineTable({
    providerId: v.id("users"), // The service provider creating the event
    title: v.string(), // Event title
    description: v.string(), // Event description
    sessionDate: v.string(), // YYYY-MM-DD format
    sessionTime: v.string(), // HH:MM format
    duration: v.number(), // Duration in minutes
    maxParticipants: v.number(), // Maximum number of participants
    currentParticipants: v.number(), // Current number of bookings
    pricePerPerson: v.number(), // Price per participant
    priceCurrency: v.string(), // Currency code (USD, NGN, GBP, etc.)
    status: v.string(), // "ACTIVE" | "CANCELLED" | "COMPLETED" | "FULL"
    sessionDetails: v.optional(v.string()), // Meeting link or instructions
    tags: v.optional(v.array(v.string())), // Event tags/categories
    isPublic: v.boolean(), // Whether event is publicly visible
    // Circle integration fields
    circleId: v.optional(v.id("circles")), // Link event to a circle
    isCircleExclusive: v.optional(v.boolean()), // Only circle members can join
    // Event type fields (PHASE 1: Audio-only events)
    eventType: v.optional(v.string()), // "LIVE_STREAM" | "AUDIO_ONLY" (default: LIVE_STREAM for backward compatibility)
    audioSettings: v.optional(v.object({
      maxSpeakers: v.number(), // Max simultaneous speakers (default 10)
      allowHandRaise: v.boolean(),
      autoPromoteSpeakers: v.boolean(), // Auto-promote or require approval
      recordAudio: v.boolean()
    })),
    // LiveKit streaming fields
    liveStreamRoomName: v.optional(v.string()), // LiveKit room name
    liveStreamStatus: v.optional(v.string()), // "NOT_STARTED" | "LIVE" | "ENDED"
    recordingId: v.optional(v.string()), // LiveKit recording ID
    recordingUrl: v.optional(v.string()), // URL to recorded session
    recordingStorageId: v.optional(v.string()), // Convex storage ID for recording
    uploadedToReels: v.optional(v.boolean()), // Whether recording was uploaded to reels
    reelId: v.optional(v.id("reels")), // Reference to created reel
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_provider", ["providerId"])
    .index("by_date", ["sessionDate"])
    .index("by_status", ["status"])
    .index("by_provider_date", ["providerId", "sessionDate"])
    .index("by_public", ["isPublic"])
    .index("by_tags", ["tags"])
    .index("by_stream_status", ["liveStreamStatus"])
    .index("by_room_name", ["liveStreamRoomName"])
    .index("by_circle", ["circleId"])
    .index("by_currency", ["priceCurrency"])
    .index("by_event_type", ["eventType"]),

  // ✅ Booking Settings table
  bookingSettings: defineTable({
    userId: v.id("users"), // Provider's user ID
    confirmationType: v.string(), // AUTOMATIC | MANUAL
    bufferTime: v.number(), // Minutes between sessions (default 15)
    maxAdvanceBooking: v.number(), // Days in advance (default 30)
    cancellationPolicy: v.string(), // Hours before session (default 24)
    sessionInstructions: v.optional(v.string()), // Default meeting instructions
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_user", ["userId"]),

  // ✅ Chat Conversations table
  chatConversations: defineTable({
    participants: v.array(v.id("users")), // Array of user IDs in the chat
    lastMessageId: v.optional(v.id("chatMessages")), // Reference to the last message
    lastActivity: v.number(), // Timestamp of last message/activity
    isActive: v.boolean(), // Whether the chat is active
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_participant", ["participants"])
    .index("by_last_activity", ["lastActivity"])
    .index("by_active", ["isActive"]),

  // ✅ Chat Messages table
  chatMessages: defineTable({
    conversationId: v.id("chatConversations"),
    senderId: v.id("users"),
    messageType: v.string(), // "text" | "image" | "emoji"
    content: v.string(), // Message content (text, image storage ID, or emoji)
    isRead: v.boolean(),
    readAt: v.optional(v.number()),
    createdAt: v.number()
  }).index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"])
    .index("by_conversation_created", ["conversationId", "createdAt"])
    .index("by_read_status", ["isRead"]),

  // ✅ Chat Privacy Settings table
  chatPrivacySettings: defineTable({
    userId: v.id("users"),
    whoCanMessage: v.string(), // "everyone" | "followers" | "following" | "mutual_follows" | "none"
    allowMessagesFromArticles: v.boolean(), // Allow messages from article viewers
    allowMessagesFromBookings: v.boolean(), // Allow messages from booking clients/providers
    autoAcceptFromFollowing: v.boolean(), // Auto-accept conversations from people you follow
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_user", ["userId"]),

  // ✅ Courses table
  courses: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    description: v.string(),
    coverImage: v.optional(v.string()), // storage id
    category: v.string(),
    tags: v.array(v.string()),
    totalPrice: v.number(), // Calculated from all content
    priceCurrency: v.string(),
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_author", ["authorId"])
    .index("by_category", ["category"])
    .index("by_published", ["isPublished"])
    .index("by_created", ["createdAt"])
    .index("by_tags", ["tags"]),

  // ✅ Course content (links existing articles/reels to courses)
  courseContent: defineTable({
    courseId: v.id("courses"),
    contentType: v.string(), // "article" | "reel"
    contentId: v.union(v.id("articles"), v.id("reels")),
    order: v.number(), // Position in course
    isRequired: v.boolean(),
    createdAt: v.number()
  }).index("by_course", ["courseId"])
    .index("by_content", ["contentType", "contentId"])
    .index("by_course_order", ["courseId", "order"]),

  // ✅ Course enrollments
  courseEnrollments: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    enrolledAt: v.number(),
    completedAt: v.optional(v.number()),
    progress: v.number(), // 0-100 percentage
    lastAccessedAt: v.optional(v.number())
  }).index("by_user", ["userId"])
    .index("by_course", ["courseId"])
    .index("by_user_course", ["userId", "courseId"])
    .index("by_enrolled", ["enrolledAt"])
    .index("by_completed", ["completedAt"]),

  // ✅ Course progress tracking
  courseProgress: defineTable({
    userId: v.id("users"),
    courseId: v.id("courses"),
    contentId: v.union(v.id("articles"), v.id("reels")),
    completedAt: v.number(),
    timeSpent: v.optional(v.number()) // in seconds
  }).index("by_user_course", ["userId", "courseId"])
    .index("by_user_content", ["userId", "contentId"])
    .index("by_course", ["courseId"])
    .index("by_completed", ["completedAt"]),

  // ✅ Circles table (Slack-like community channels)
  circles: defineTable({
    name: v.string(),
    description: v.string(),
    creatorId: v.id("users"),
    communityId: v.optional(v.id("communities")), // For future multi-community support
    type: v.string(), // "PUBLIC" | "PRIVATE"
    accessType: v.string(), // "FREE" | "PAID"
    price: v.optional(v.number()),
    priceCurrency: v.optional(v.string()),
    coverImage: v.optional(v.string()), // storage id
    inviteCode: v.optional(v.string()), // Unique code for private circles
    maxMembers: v.optional(v.number()),
    currentMembers: v.number(),
    tags: v.array(v.string()),
    isActive: v.boolean(),
    // Admin-only posting feature (like WhatsApp admin-only groups)
    postingPermission: v.string(), // "EVERYONE" | "ADMINS_ONLY"
    // Moderation fields
    approvalStatus: v.optional(v.string()), // "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED"
    approvalRequestedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedByRole: v.optional(v.id("moderationRoles")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_creator", ["creatorId"])
    .index("by_type", ["type"])
    .index("by_access", ["accessType"])
    .index("by_active", ["isActive"])
    .index("by_invite_code", ["inviteCode"])
    .index("by_posting_permission", ["postingPermission"])
    .index("by_created", ["createdAt"])
    .index("by_approval_status", ["approvalStatus"]),

  // ✅ Circle Members table
  circleMembers: defineTable({
    circleId: v.id("circles"),
    userId: v.id("users"),
    role: v.string(), // "CREATOR" | "ADMIN" | "MODERATOR" | "MEMBER"
    joinedAt: v.number(),
    lastActiveAt: v.optional(v.number()),
    paymentTxId: v.optional(v.string()), // For paid circles
    isActive: v.boolean(),
    isMuted: v.optional(v.boolean()), // User muted the circle
    isBanned: v.optional(v.boolean()) // User banned from circle
  }).index("by_circle", ["circleId"])
    .index("by_user", ["userId"])
    .index("by_circle_user", ["circleId", "userId"])
    .index("by_role", ["role"])
    .index("by_circle_active", ["circleId", "isActive"]),

  // ✅ Circle Messages table
  circleMessages: defineTable({
    circleId: v.id("circles"),
    senderId: v.id("users"),
    messageType: v.string(), // "text" | "image" | "video" | "audio" | "emoji" | "file"
    content: v.string(), // Text content or storage ID for media
    replyToId: v.optional(v.id("circleMessages")), // For threading
    isEdited: v.boolean(),
    isPinned: v.boolean(),
    isDeleted: v.optional(v.boolean()), // Soft delete
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    editedAt: v.optional(v.number())
  }).index("by_circle", ["circleId"])
    .index("by_sender", ["senderId"])
    .index("by_circle_created", ["circleId", "createdAt"])
    .index("by_reply", ["replyToId"])
    .index("by_pinned", ["isPinned"]),

  // ✅ Circle Message Reactions table (emoji reactions)
  circleMessageReactions: defineTable({
    messageId: v.id("circleMessages"),
    userId: v.id("users"),
    emoji: v.string(),
    createdAt: v.number()
  }).index("by_message", ["messageId"])
    .index("by_user", ["userId"])
    .index("by_message_user", ["messageId", "userId"])
    .index("by_message_emoji", ["messageId", "emoji"]),

  // ✅ Circle Invites table
  circleInvites: defineTable({
    circleId: v.id("circles"),
    inviterId: v.id("users"),
    inviteeId: v.optional(v.id("users")), // null for invite links
    inviteCode: v.string(),
    status: v.string(), // "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
    expiresAt: v.optional(v.number()),
    maxUses: v.optional(v.number()), // For invite links
    currentUses: v.optional(v.number()),
    createdAt: v.number()
  }).index("by_circle", ["circleId"])
    .index("by_invitee", ["inviteeId"])
    .index("by_code", ["inviteCode"])
    .index("by_status", ["status"])
    .index("by_inviter", ["inviterId"]),

  // ✅ Circle Audio/Video Rooms table
  circleRooms: defineTable({
    circleId: v.id("circles"),
    roomName: v.string(), // LiveKit room name
    roomType: v.string(), // "AUDIO" | "VIDEO"
    creatorId: v.id("users"),
    status: v.string(), // "ACTIVE" | "ENDED"
    maxParticipants: v.optional(v.number()),
    currentParticipants: v.number(),
    isRecording: v.boolean(),
    recordingId: v.optional(v.string()),
    recordingStorageId: v.optional(v.string()),
    createdAt: v.number(),
    endedAt: v.optional(v.number())
  }).index("by_circle", ["circleId"])
    .index("by_status", ["status"])
    .index("by_room_name", ["roomName"])
    .index("by_creator", ["creatorId"]),

  // ✅ Expert Requests table (for hiring experts into circles)
  expertRequests: defineTable({
    circleId: v.id("circles"),
    requesterId: v.id("users"), // Circle creator
    title: v.string(),
    description: v.string(),
    agreedAmount: v.number(),
    agreedCurrency: v.string(),
    duration: v.optional(v.number()), // Expected duration in hours
    status: v.string(), // "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED"
    selectedExpertId: v.optional(v.id("users")),
    escrowTxId: v.optional(v.string()), // Transaction ID for escrowed funds
    completedAt: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    // Moderation fields
    approvalStatus: v.optional(v.string()), // "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED"
    approvalRequestedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedByRole: v.optional(v.id("moderationRoles")),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_circle", ["circleId"])
    .index("by_requester", ["requesterId"])
    .index("by_status", ["status"])
    .index("by_expert", ["selectedExpertId"])
    .index("by_created", ["createdAt"])
    .index("by_approval_status", ["approvalStatus"]),

  // ✅ Expert Applications table
  expertApplications: defineTable({
    requestId: v.id("expertRequests"),
    expertId: v.id("users"),
    coverLetter: v.string(),
    proposedAmount: v.optional(v.number()), // If expert wants to negotiate
    status: v.string(), // "PENDING" | "ACCEPTED" | "REJECTED"
    createdAt: v.number()
  }).index("by_request", ["requestId"])
    .index("by_expert", ["expertId"])
    .index("by_status", ["status"])
    .index("by_request_expert", ["requestId", "expertId"]),

  // ✅ Communities table (for future multi-community support)
  communities: defineTable({
    name: v.string(),
    description: v.string(),
    creatorId: v.id("users"),
    coverImage: v.optional(v.string()),
    isPublic: v.boolean(),
    memberCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_creator", ["creatorId"])
    .index("by_public", ["isPublic"])
    .index("by_created", ["createdAt"]),

  // ✅ Audio Room Participants table (PHASE 1: Audio-only events)
  audioRoomParticipants: defineTable({
    eventId: v.id("events"),
    bookingId: v.id("bookings"),
    userId: v.id("users"),
    role: v.string(), // "HOST" | "SPEAKER" | "LISTENER"
    isMuted: v.boolean(),
    isSpeaking: v.boolean(),
    handRaised: v.boolean(),
    handRaisedAt: v.optional(v.number()),
    joinedAt: v.number(),
    lastActiveAt: v.number()
  }).index("by_event", ["eventId"])
    .index("by_event_user", ["eventId", "userId"])
    .index("by_booking", ["bookingId"])
    .index("by_role", ["role"])
    .index("by_hand_raised", ["handRaised"])
    .index("by_event_hand_raised", ["eventId", "handRaised"]),

  // ✅ Referrals table (Expert-to-Expert patient referrals)
  referrals: defineTable({
    referringExpertId: v.id("users"), // Expert making the referral
    patientId: v.id("users"), // Patient being referred
    title: v.string(),
    healthNote: v.string(), // Brief on patient's health challenges (only visible to selected expert)
    suggestedExperts: v.array(v.id("users")), // 3+ experts suggested by referring expert
    selectedExpertId: v.optional(v.id("users")), // Expert chosen by patient
    status: v.string(), // "PENDING" | "ACCEPTED" | "COMPLETED" | "DECLINED"
    declineReason: v.optional(v.string()), // If patient declines all suggestions
    
    // Booking details (once patient selects expert and books)
    bookingId: v.optional(v.id("bookings")),
    
    // Commission tracking (10% to referring expert)
    commissionRate: v.number(), // 0.10 for 10%
    commissionAmount: v.optional(v.number()),
    commissionCurrency: v.optional(v.string()),
    commissionPaid: v.boolean(),
    commissionTxId: v.optional(v.string()),
    
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    completedAt: v.optional(v.number())
  }).index("by_referring_expert", ["referringExpertId"])
    .index("by_patient", ["patientId"])
    .index("by_selected_expert", ["selectedExpertId"])
    .index("by_status", ["status"])
    .index("by_booking", ["bookingId"])
    .index("by_patient_status", ["patientId", "status"])
    .index("by_created", ["createdAt"]),

  // ✅ MODERATION SYSTEM TABLES

  // Moderation Roles - Define custom roles with permissions
  moderationRoles: defineTable({
    name: v.string(),
    description: v.string(),
    permissions: v.array(v.string()), // Array of permission strings
    canApprove: v.array(v.string()), // Array of content types this role can approve
    isSystemRole: v.boolean(), // True for "Primary Admin" role (cannot be deleted/edited)
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_name", ["name"])
    .index("by_created", ["createdAt"])
    .index("by_system_role", ["isSystemRole"]),

  // Moderation Assignments - Assign roles to users
  moderationAssignments: defineTable({
    userId: v.id("users"),
    roleId: v.id("moderationRoles"),
    assignedBy: v.id("users"),
    assignedAt: v.number(),
    isActive: v.boolean(),
    isPrimaryAdmin: v.boolean(), // Only one user can have this true (the first user)
    expiresAt: v.optional(v.number()) // Optional expiration for temporary assignments
  }).index("by_user", ["userId"])
    .index("by_role", ["roleId"])
    .index("by_active", ["isActive"])
    .index("by_primary_admin", ["isPrimaryAdmin"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_assigned_by", ["assignedBy"]),

  // Moderation Settings - Global moderation configuration (singleton)
  moderationSettings: defineTable({
    articlesRequireApproval: v.boolean(),
    reelsRequireApproval: v.boolean(),
    circlesRequireApproval: v.boolean(),
    expertRequestsRequireApproval: v.boolean(),
    bookingSubscribersRequireApproval: v.boolean(),
    primaryAdminUserId: v.id("users"), // The first user
    updatedBy: v.id("users"),
    updatedAt: v.number(),
    createdAt: v.number()
  }),

  // Content Approvals - Track approval status for content
  contentApprovals: defineTable({
    contentType: v.string(), // "article" | "reel" | "circle" | "expertRequest" | "bookingSubscriber"
    contentId: v.string(), // ID of the content
    status: v.string(), // "PENDING" | "APPROVED" | "REJECTED"
    submittedBy: v.id("users"),
    reviewedBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    approverRole: v.optional(v.id("moderationRoles")), // Which role was used to approve
    rejectionReason: v.optional(v.string()),
    createdAt: v.number()
  }).index("by_content", ["contentType", "contentId"])
    .index("by_status", ["status"])
    .index("by_submitter", ["submittedBy"])
    .index("by_reviewer", ["reviewedBy"])
    .index("by_content_type", ["contentType"])
    .index("by_content_type_status", ["contentType", "status"]),

  // Moderation Actions - Audit log for all moderation actions
  moderationActions: defineTable({
    actionType: v.string(), // "APPROVE" | "REJECT" | "DELETE" | "BAN" | "UNBAN" | "ASSIGN_ROLE" | "REMOVE_ROLE" | "UPDATE_SETTINGS" | "CREATE_ROLE" | "DELETE_ROLE"
    performedBy: v.id("users"),
    performerRole: v.optional(v.id("moderationRoles")), // Which role was used for the action
    targetUserId: v.optional(v.id("users")),
    targetContentType: v.optional(v.string()),
    targetContentId: v.optional(v.string()),
    reason: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional context
    createdAt: v.number()
  }).index("by_performer", ["performedBy"])
    .index("by_target_user", ["targetUserId"])
    .index("by_action_type", ["actionType"])
    .index("by_created", ["createdAt"])
    .index("by_performer_role", ["performerRole"]),

  // User Bans - Track banned users
  userBans: defineTable({
    userId: v.id("users"),
    bannedBy: v.id("users"),
    bannedByRole: v.optional(v.id("moderationRoles")),
    reason: v.string(),
    banType: v.string(), // "TEMPORARY" | "PERMANENT"
    expiresAt: v.optional(v.number()), // For temporary bans
    isActive: v.boolean(),
    createdAt: v.number(),
    unbannedBy: v.optional(v.id("users")),
    unbannedAt: v.optional(v.number())
  }).index("by_user", ["userId"])
    .index("by_active", ["isActive"])
    .index("by_expires", ["expiresAt"])
    .index("by_banned_by", ["bannedBy"])
    .index("by_user_active", ["userId", "isActive"]),

  // ✅ AI RECOMMENDATION SYSTEM TABLES

  // Content Analysis - Store AI analysis of content
  contentAnalysis: defineTable({
    contentType: v.string(), // "article" | "reel" | "course" | "circle" | "event"
    contentId: v.string(),
    aiAnalysis: v.object({
      summary: v.string(),
      topics: v.array(v.string()),
      keywords: v.array(v.string()),
      sentiment: v.string(),
      category: v.string(),
      targetAudience: v.array(v.string()),
      difficulty: v.optional(v.string()),
      healthTopics: v.optional(v.array(v.string()))
    }),
    novaResponse: v.string(), // Raw Nova API response
    analyzedAt: v.number(),
    expiresAt: v.number() // Re-analyze after 30 days
  }).index("by_content", ["contentType", "contentId"])
    .index("by_expires", ["expiresAt"])
    .index("by_analyzed", ["analyzedAt"]),

  // User Recommendation Scores - Store calculated scores for user-content pairs
  userRecommendationScores: defineTable({
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    score: v.number(), // 0-100
    reasoning: v.array(v.string()), // Why this was recommended
    calculatedAt: v.number(),
    expiresAt: v.number() // Recalculate after 24 hours
  }).index("by_user_content", ["userId", "contentType", "contentId"])
    .index("by_user", ["userId"])
    .index("by_score", ["score"])
    .index("by_expires", ["expiresAt"]),

  // Recommendation Cache - Store ranked content IDs for quick retrieval
  recommendationCache: defineTable({
    userId: v.id("users"),
    contentType: v.string(), // "all" | "articles" | "reels" | "courses" | "circles"
    rankedContentIds: v.array(v.string()), // Ordered by score
    generatedAt: v.number(),
    expiresAt: v.number() // Refresh after 6 hours
  }).index("by_user_type", ["userId", "contentType"])
    .index("by_expires", ["expiresAt"])
    .index("by_generated", ["generatedAt"]),

  // User Interests - Dynamic interest tracking
  userInterests: defineTable({
    userId: v.id("users"),
    interest: v.string(),
    source: v.string(), // "explicit" | "inferred" | "engagement"
    strength: v.number(), // 0-100
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_user", ["userId"])
    .index("by_interest", ["interest"])
    .index("by_user_strength", ["userId", "strength"]),

  // Engagement tracking for AI recommendations
  engagement: defineTable({
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    type: v.string(), // "like" | "clap" | "bookmark" | "read" | "watch" | "comment"
    createdAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_content", ["contentType", "contentId"])
    .index("by_user_type", ["userId", "type"])
    .index("by_created", ["createdAt"]),

  // User Journey Events - Track cross-tab behavior
  userJourneyEvents: defineTable({
    userId: v.id("users"),
    tab: v.string(), // "for-you" | "learn" | "community" | "booking"
    action: v.string(), // "view" | "engage" | "create"
    contentType: v.optional(v.string()),
    contentId: v.optional(v.string()),
    topics: v.array(v.string()),
    timestamp: v.number()
  }).index("by_user_timestamp", ["userId", "timestamp"])
    .index("by_tab", ["tab"])
    .index("by_timestamp", ["timestamp"]),

  // Progressive Profiles - User stage and preferences
  progressiveProfiles: defineTable({
    userId: v.id("users"),
    userStage: v.string(), // "new" | "growing" | "established" | "veteran"
    engagementLevel: v.string(), // "low" | "medium" | "high"
    preferredContentTypes: v.array(v.string()),
    weeksSinceJoin: v.number(),
    totalEvents: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_user", ["userId"])
    .index("by_stage", ["userStage"])
    .index("by_engagement", ["engagementLevel"]),

  // Recommendation Metrics - Track recommendation effectiveness
  recommendationMetrics: defineTable({
    userId: v.id("users"),
    contentType: v.string(),
    contentId: v.string(),
    score: v.number(),
    position: v.number(), // Position in feed
    tab: v.string(), // Which tab
    wasShown: v.boolean(),
    wasClicked: v.boolean(),
    wasEngaged: v.boolean(),
    engagementType: v.optional(v.string()),
    timeSpent: v.number(), // seconds
    shownAt: v.number(),
    clickedAt: v.optional(v.number()),
    engagedAt: v.optional(v.number())
  }).index("by_user_content", ["userId", "contentType", "contentId"])
    .index("by_shown_at", ["shownAt"])
    .index("by_tab", ["tab"])
    .index("by_score", ["score"]),

  // Nova API Usage Tracking
  novaAPIUsage: defineTable({
    endpoint: v.string(), // "analyze" | "recommend"
    contentType: v.string(),
    tokensUsed: v.number(),
    latencyMs: v.number(),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
    timestamp: v.number()
  }).index("by_timestamp", ["timestamp"])
    .index("by_endpoint", ["endpoint"])
    .index("by_success", ["success"]),

  // ✅ Ad Placements - Admin-configured ad zones
  adPlacements: defineTable({
    zoneId: v.string(),       // Unique zone identifier (e.g. "feed_top")
    label: v.string(),        // Human-readable name for admin UI
    description: v.string(),  // Where this zone appears in the app
    publisherId: v.string(),  // ca-pub-XXXXXXXXXXXXXXXX
    adSlotId: v.string(),     // AdSense slot ID for this zone
    isEnabled: v.boolean(),   // Toggle this zone on/off
    createdAt: v.number(),
    updatedAt: v.optional(v.number())
  }).index("by_zone", ["zoneId"])
    .index("by_enabled", ["isEnabled"]),

  // ✅ Ad Settings - Global kill-switch and config
  adSettings: defineTable({
    adsGloballyEnabled: v.boolean(), // Master kill-switch for all ads
    updatedBy: v.id("users"),
    updatedAt: v.number(),
    createdAt: v.number()
  }),

  // ✅ Platform Settings - Key/value store for admin-configurable settings and caches
  platform_settings: defineTable({
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // ✅ Bank Accounts - User-linked bank accounts for NGN withdrawals
  bank_accounts: defineTable({
    userId: v.id("users"),
    bankName: v.string(),
    bankCode: v.string(),
    bankSlug: v.optional(v.string()),
    accountNumber: v.string(),
    accountName: v.string(),
    recipientCode: v.string(), // Paystack transfer recipient code
    isDefault: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_account", ["userId", "accountNumber"]),

  // ✅ Signup Pending - Temporary store for wizard data until afterUserCreatedOrUpdated fires
  signupPending: defineTable({
    email: v.string(),
    username: v.string(),
    phoneNumber: v.string(),
    phoneCountryCode: v.string(),
    detectedCountry: v.string(),
    primaryCurrency: v.string(),
    interests: v.array(v.string()),
    transactionPin: v.string(), // already hashed
    createdAt: v.number(),
  }).index("by_email", ["email"]),
});
