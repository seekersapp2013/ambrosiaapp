import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, internal } from "./_generated/api";

// Follow/Unfollow a user
export const followUser = mutation({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    console.log('Follow mutation called:', { userId, followingId: args.followingId });

    if (userId === args.followingId) {
      throw new Error("Cannot follow yourself");
    }

    // Check if already following
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .filter((q) => q.eq(q.field("followingId"), args.followingId))
      .first();

    console.log('Existing follow:', existingFollow);

    if (existingFollow) {
      // Unfollow
      await ctx.db.delete(existingFollow._id);
      console.log('Unfollowed user');
      return { following: false };
    } else {
      // Follow
      const followId = await ctx.db.insert("follows", {
        followerId: userId,
        followingId: args.followingId,
        createdAt: Date.now(),
      });
      console.log('Followed user, follow ID:', followId);

      // Track follow and update interests
      await ctx.scheduler.runAfter(0, internal.userInterestTracking.trackFollowAndUpdateInterests, {
        userId,
        followingId: args.followingId,
      });

      // Trigger notification for the followed user
      await ctx.runMutation(internal.notifications.createNotificationEvent, {
        type: 'NEW_FOLLOWER',
        recipientUserId: args.followingId,
        actorUserId: userId,
      });

      return { following: true };
    }
  },
});

// Get followers of a user
export const getFollowers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();

    // Get follower details
    const followers = await Promise.all(
      follows.map(async (follow) => {
        const user = await ctx.db.get(follow.followerId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), follow.followerId))
          .first();

        return {
          id: user?._id,
          name: user?.name || profile?.name,
          username: profile?.username,
          avatar: profile?.avatar,
          followedAt: follow.createdAt,
        };
      })
    );

    return followers.filter(f => f.id);
  },
});

// Get users that a user is following
export const getFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();

    // Get following details
    const following = await Promise.all(
      follows.map(async (follow) => {
        const user = await ctx.db.get(follow.followingId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), follow.followingId))
          .first();

        return {
          id: user?._id,
          name: user?.name || profile?.name,
          username: profile?.username,
          avatar: profile?.avatar,
          followedAt: follow.createdAt,
        };
      })
    );

    return following.filter(f => f.id);
  },
});

// Get follow counts for a user
export const getFollowCounts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const followersCount = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect()
      .then(follows => follows.length);

    const followingCount = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect()
      .then(follows => follows.length);

    return {
      followers: followersCount,
      following: followingCount,
    };
  },
});

// Check if current user is following another user
export const isFollowing = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return false;

    const follow = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", currentUserId))
      .filter((q) => q.eq(q.field("followingId"), args.userId))
      .first();

    return !!follow;
  },
});