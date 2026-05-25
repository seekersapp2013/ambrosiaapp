import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  
  // Users table (extended from auth)
  users: defineTable({
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    phone: v.optional(v.string()),
    displayName: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    profilePictureStorageId: v.optional(v.id("_storage")),
    isVerified: v.optional(v.boolean()),
    isCelebrity: v.optional(v.boolean()),
    verificationStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
    verificationData: v.optional(v.object({
      socialLinks: v.optional(v.array(v.string())),
      credentials: v.optional(v.array(v.string())),
    })),
    walletAddress: v.optional(v.string()),
    walletPrivateKey: v.optional(v.string()),
    walletMnemonic: v.optional(v.string()),
    transactionPin: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_phone", ["phone"]),

  // Content table
  content: defineTable({
    type: v.union(
      v.literal("movie"),
      v.literal("music_track"),
      v.literal("music_album"),
      v.literal("music_video")
    ),
    title: v.string(),
    description: v.string(),
    genre: v.array(v.string()),
    price: v.number(),
    isBlockbuster: v.optional(v.boolean()),
    duration: v.number(),
    fileStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    uploaderId: v.id("users"),
    releaseYear: v.optional(v.number()),
    artist: v.optional(v.string()),
    album: v.optional(v.string()),
    rating: v.number(),
    reviewCount: v.number(),
    isClassic: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_uploader", ["uploaderId"])
    .index("by_classic", ["isClassic"]),

  // Wallets table
  wallets: defineTable({
    userId: v.id("users"),
    balance: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Transactions table
  transactions: defineTable({
    userId: v.id("users"),
    amount: v.number(),
    type: v.union(v.literal("credit"), v.literal("debit")),
    purpose: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    metadata: v.any(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Rentals table
  rentals: defineTable({
    userId: v.id("users"),
    contentId: v.id("content"),
    rentedAt: v.number(),
    expiresAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"])
    .index("by_active", ["isActive"]),

  // Purchases table
  purchases: defineTable({
    userId: v.id("users"),
    contentId: v.id("content"),
    purchasedAt: v.number(),
    amount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"]),

  // Reviews table
  reviews: defineTable({
    userId: v.id("users"),
    contentId: v.id("content"),
    rating: v.number(),
    comment: v.string(),
    timestamp: v.number(),
    flagCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"]),

  // Interactions table
  interactions: defineTable({
    userId: v.id("users"),
    contentId: v.id("content"),
    type: v.union(
      v.literal("view"),
      v.literal("rent"),
      v.literal("purchase"),
      v.literal("review"),
      v.literal("search")
    ),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"])
    .index("by_type", ["type"]),

  // Streams table
  streams: defineTable({
    celebrityId: v.id("users"),
    title: v.string(),
    liveKitRoomName: v.string(),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("live"),
      v.literal("ended")
    ),
    viewerCount: v.number(),
    totalEarnings: v.number(),
    replayStorageId: v.optional(v.id("_storage")),
  })
    .index("by_celebrity", ["celebrityId"])
    .index("by_status", ["status"]),

  // Gifts table
  gifts: defineTable({
    streamId: v.id("streams"),
    userId: v.id("users"),
    celebrityId: v.id("users"),
    amount: v.number(),
    type: v.union(v.literal("emoji"), v.literal("spray")),
    timestamp: v.number(),
  })
    .index("by_stream", ["streamId"])
    .index("by_user", ["userId"])
    .index("by_celebrity", ["celebrityId"]),

  // Video calls table
  video_calls: defineTable({
    streamId: v.id("streams"),
    celebrityId: v.id("users"),
    viewerId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("ended"),
      v.literal("declined")
    ),
    initiatedAt: v.number(),
    endedAt: v.optional(v.number()),
  })
    .index("by_stream", ["streamId"])
    .index("by_celebrity", ["celebrityId"])
    .index("by_viewer", ["viewerId"]),

  // Notifications table
  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    data: v.any(),
    isRead: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["isRead"]),

  // Claps table
  claps: defineTable({
    userId: v.id("users"),
    contentId: v.string(),
    contentType: v.union(
      v.literal("movie"),
      v.literal("music"),
      v.literal("stream")
    ),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"])
    .index("by_user_and_content", ["userId", "contentId"]),

  // Comments table
  comments: defineTable({
    userId: v.id("users"),
    contentId: v.string(),
    contentType: v.union(
      v.literal("movie"),
      v.literal("music"),
      v.literal("stream")
    ),
    text: v.string(),
    timestamp: v.number(),
    flagCount: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"]),

  // Shares table
  shares: defineTable({
    userId: v.id("users"),
    contentId: v.string(),
    contentType: v.union(
      v.literal("movie"),
      v.literal("music"),
      v.literal("stream")
    ),
    shareId: v.string(),
    timestamp: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"])
    .index("by_share_id", ["shareId"]),

  // Engagement metrics table
  engagement_metrics: defineTable({
    contentId: v.string(),
    contentType: v.union(
      v.literal("movie"),
      v.literal("music"),
      v.literal("stream")
    ),
    clapCount: v.number(),
    commentCount: v.number(),
    shareCount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_content", ["contentId"])
    .index("by_content_type", ["contentType"]),
});

export default schema;
