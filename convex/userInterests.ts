import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get comprehensive user interests including dynamic interests from interactions
export const getComprehensiveUserInterests = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = args.userId || await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    
    // Get user profile with static interests
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();

    // Get dynamic interests from user interactions
    const dynamicInterests = await generateDynamicInterests(ctx, userId);
    
    // Get social graph data
    const socialGraph = await generateSocialGraph(ctx, userId);
    
    return {
      staticInterests: profile?.interests || [],
      dynamicInterests,
      socialGraph,
      lastUpdated: Date.now()
    };
  },
});

// Generate dynamic interests based on user interactions
async function generateDynamicInterests(ctx: any, userId: Id<"users">) {
  const interests = {
    contentInteractions: await getContentInteractionInterests(ctx, userId),
    socialInteractions: await getSocialInteractionInterests(ctx, userId),
    bookingInteractions: await getBookingInteractionInterests(ctx, userId),
    notificationInteractions: await getNotificationInteractionInterests(ctx, userId),
  };
  
  return interests;
}

// Get interests from content interactions (likes, claps, comments, bookmarks)
async function getContentInteractionInterests(ctx: any, userId: Id<"users">) {
  // Get liked articles and their tags
  const likedArticles = await ctx.db
    .query("likes")
    .withIndex("by_user_article", (q: any) => q.eq("userId", userId))
    .collect();
    
  const likedArticleTags: string[] = [];
  for (const like of likedArticles) {
    if (like.articleId) {
      const article = await ctx.db.get(like.articleId);
      if (article) {
        likedArticleTags.push(...article.tags);
      }
    }
  }
  
  // Get liked reels and their tags
  const likedReels = await ctx.db
    .query("likes")
    .withIndex("by_user_reel", (q: any) => q.eq("userId", userId))
    .collect();
    
  const likedReelTags: string[] = [];
  for (const like of likedReels) {
    if (like.reelId) {
      const reel = await ctx.db.get(like.reelId);
      if (reel) {
        likedReelTags.push(...reel.tags);
      }
    }
  }
  
  // Get clapped articles and their tags
  const clappedArticles = await ctx.db
    .query("claps")
    .withIndex("by_user_article", (q: any) => q.eq("userId", userId))
    .collect();
    
  const clappedArticleTags: string[] = [];
  for (const clap of clappedArticles) {
    const article = await ctx.db.get(clap.articleId);
    if (article) {
      clappedArticleTags.push(...article.tags);
    }
  }
  
  // Get bookmarked content tags
  const bookmarks = await ctx.db
    .query("bookmarks")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
    
  const bookmarkedTags: string[] = [];
  for (const bookmark of bookmarks) {
    if (bookmark.articleId) {
      const article = await ctx.db.get(bookmark.articleId);
      if (article) bookmarkedTags.push(...article.tags);
    }
    if (bookmark.reelId) {
      const reel = await ctx.db.get(bookmark.reelId);
      if (reel) bookmarkedTags.push(...reel.tags);
    }
  }
  
  // Get commented content tags - simplified approach
  const commentedTags: string[] = [];
  // Note: We'll implement this differently to avoid circular dependencies
  
  // Count tag frequencies and return top interests
  const tagCounts: Record<string, number> = {};
  
  [...likedArticleTags, ...likedReelTags, ...clappedArticleTags, ...bookmarkedTags, ...commentedTags]
    .forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  
  const topTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([tag, count]) => ({ tag, count, source: 'content_interactions' }));
  
  return {
    likedArticleTags: getTopTags(likedArticleTags),
    likedReelTags: getTopTags(likedReelTags),
    clappedTags: getTopTags(clappedArticleTags),
    bookmarkedTags: getTopTags(bookmarkedTags),
    commentedTags: getTopTags(commentedTags),
    topContentInterests: topTags
  };
}

// Get interests from social interactions (following patterns)
async function getSocialInteractionInterests(ctx: any, userId: Id<"users">) {
  // Get people user is following
  const following = await ctx.db
    .query("follows")
    .withIndex("by_follower", (q: any) => q.eq("followerId", userId))
    .collect();
    
  const followingInterests: string[] = [];
  for (const follow of following) {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", follow.followingId))
      .first();
    if (profile?.interests) {
      followingInterests.push(...profile.interests);
    }
  }
  
  // Get followers
  const followers = await ctx.db
    .query("follows")
    .withIndex("by_following", (q: any) => q.eq("followingId", userId))
    .collect();
    
  return {
    followingCount: following.length,
    followersCount: followers.length,
    followingInterests: getTopTags(followingInterests),
    following: following.map((f: any) => f.followingId),
    followers: followers.map((f: any) => f.followerId)
  };
}

// Get interests from booking interactions
async function getBookingInteractionInterests(ctx: any, userId: Id<"users">) {
  // Get bookings as client
  const clientBookings = await ctx.db
    .query("bookings")
    .withIndex("by_client", (q: any) => q.eq("clientId", userId))
    .collect();
    
  // Get bookings as provider
  const providerBookings = await ctx.db
    .query("bookings")
    .withIndex("by_provider", (q: any) => q.eq("providerId", userId))
    .collect();
    
  // Get event participations
  const eventTags: string[] = [];
  for (const booking of clientBookings) {
    if (booking.eventId) {
      const event = await ctx.db.get(booking.eventId);
      if (event?.tags) {
        eventTags.push(...event.tags);
      }
    }
  }
  
  // Get provider specializations
  const providerProfile = await ctx.db
    .query("bookingSubscribers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
    
  return {
    clientBookingsCount: clientBookings.length,
    providerBookingsCount: providerBookings.length,
    eventTags: getTopTags(eventTags),
    providerSpecialization: providerProfile?.specialization,
    providerJobTitle: providerProfile?.jobTitle
  };
}

// Get interests from notification interactions
async function getNotificationInteractionInterests(ctx: any, userId: Id<"users">) {
  // Get notification events (clicks, views, etc.)
  const notificationEvents = await ctx.db
    .query("notificationEvents")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();
    
  const clickedNotifications = notificationEvents.filter((e: any) => e.event === 'clicked');
  const viewedNotifications = notificationEvents.filter((e: any) => e.event === 'viewed');
  
  return {
    totalNotificationEvents: notificationEvents.length,
    clickedCount: clickedNotifications.length,
    viewedCount: viewedNotifications.length,
    engagementRate: notificationEvents.length > 0 ? 
      (clickedNotifications.length / notificationEvents.length) * 100 : 0
  };
}

// Generate social graph showing user connections and interactions
async function generateSocialGraph(ctx: any, userId: Id<"users">) {
  // Get mutual connections
  const following = await ctx.db
    .query("follows")
    .withIndex("by_follower", (q: any) => q.eq("followerId", userId))
    .collect();
    
  const followers = await ctx.db
    .query("follows")
    .withIndex("by_following", (q: any) => q.eq("followingId", userId))
    .collect();
    
  const followingIds = new Set(following.map((f: any) => f.followingId));
  const followerIds = new Set(followers.map((f: any) => f.followerId));
  
  const mutualConnections = [...followingIds].filter(id => followerIds.has(id));
  
  // Get interaction patterns with connections
  const connectionInteractions = [];
  for (const connectionId of [...followingIds].slice(0, 10)) { // Limit for performance
    const interactions = await getInteractionsBetweenUsers(ctx, userId, connectionId as Id<"users">);
    connectionInteractions.push({
      userId: connectionId,
      interactions
    });
  }
  
  return {
    mutualConnections: mutualConnections.length,
    followingCount: following.length,
    followersCount: followers.length,
    connectionInteractions,
    networkStrength: calculateNetworkStrength(following.length, followers.length, mutualConnections.length)
  };
}

// Get interactions between two users
async function getInteractionsBetweenUsers(ctx: any, userId1: Id<"users">, userId2: Id<"users">) {
  // Get likes on each other's content
  const user1Articles = await ctx.db
    .query("articles")
    .withIndex("by_author", (q: any) => q.eq("authorId", userId1))
    .collect();
    
  const user2LikesOnUser1 = [];
  for (const article of user1Articles) {
    const like = await ctx.db
      .query("likes")
      .withIndex("by_user_article", (q: any) => q.eq("userId", userId2).eq("articleId", article._id))
      .first();
    if (like) user2LikesOnUser1.push(like);
  }
  
  // Get comments on each other's content
  const user2CommentsOnUser1 = [];
  for (const article of user1Articles) {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_article", (q: any) => q.eq("articleId", article._id))
      .filter((q: any) => q.eq(q.field("authorId"), userId2))
      .collect();
    user2CommentsOnUser1.push(...comments);
  }
  
  return {
    likesReceived: user2LikesOnUser1.length,
    commentsReceived: user2CommentsOnUser1.length,
    totalInteractions: user2LikesOnUser1.length + user2CommentsOnUser1.length
  };
}

// Helper function to get top tags from an array
function getTopTags(tags: string[], limit = 10) {
  const tagCounts: Record<string, number> = {};
  tags.forEach(tag => {
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
  
  return Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}

// Calculate network strength score
function calculateNetworkStrength(following: number, followers: number, mutual: number) {
  const totalConnections = following + followers;
  const mutualRatio = totalConnections > 0 ? mutual / totalConnections : 0;
  const balanceRatio = Math.min(following, followers) / Math.max(following, followers, 1);
  
  return Math.round((mutualRatio * 0.6 + balanceRatio * 0.4) * 100);
}

