import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Test mutation to create sample follow data
export const createTestFollowData = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get all users except current user
    const allUsers = await ctx.db.query("users").collect();
    const otherUsers = allUsers.filter(user => user._id !== userId);

    if (otherUsers.length === 0) {
      throw new Error("No other users found to follow");
    }

    // Create some test follows
    const testFollows = [];
    for (let i = 0; i < Math.min(3, otherUsers.length); i++) {
      const followId = await ctx.db.insert("follows", {
        followerId: userId,
        followingId: otherUsers[i]._id,
        createdAt: Date.now(),
      });
      testFollows.push(followId);
    }

    // Also create some followers (other users following current user)
    for (let i = 0; i < Math.min(2, otherUsers.length); i++) {
      const followId = await ctx.db.insert("follows", {
        followerId: otherUsers[i]._id,
        followingId: userId,
        createdAt: Date.now(),
      });
      testFollows.push(followId);
    }

    return { created: testFollows.length, message: "Test follow data created" };
  },
});

// Test mutation to clear all follow data for current user
export const clearTestFollowData = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Delete all follows where user is follower or following
    const followsAsFollower = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .collect();

    const followsAsFollowing = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect();

    let deleted = 0;
    for (const follow of followsAsFollower) {
      await ctx.db.delete(follow._id);
      deleted++;
    }

    for (const follow of followsAsFollowing) {
      await ctx.db.delete(follow._id);
      deleted++;
    }

    return { deleted, message: "Test follow data cleared" };
  },
});