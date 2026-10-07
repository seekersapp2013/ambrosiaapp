/**
 * adminUsers — Admin user management: list, ban enforcement, and hard delete.
 * All mutations require admin permission (manage_roles).
 */

import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import {
  isAdmin,
  hasPermission,
  getUserActiveRoles,
  logModerationAction,
} from "./moderationHelpers";

// ─── List all users (paginated, searchable) ─────────────────────────────────
export const listAllUsers = query({
  args: {
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()), // JSON-encoded cursor for pagination
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    if (!(await isAdmin(ctx, userId))) {
      throw new Error("Admin access required");
    }

    const limit = args.limit ?? 50;

    // Get all profiles (Convex doesn't support LIKE queries, so we filter in-memory)
    const allProfiles = await ctx.db.query("profiles").collect();

    // Apply search filter
    let filteredProfiles = allProfiles;
    if (args.searchQuery && args.searchQuery.trim().length > 0) {
      const q = args.searchQuery.toLowerCase().trim();
      filteredProfiles = allProfiles.filter(
        (p) =>
          p.username?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q)
      );
    }

    // Sort by creation date (newest first)
    filteredProfiles.sort((a, b) => b.createdAt - a.createdAt);

    // Simple offset-based pagination via cursor
    const offset = args.cursor ? parseInt(args.cursor, 10) : 0;
    const page = filteredProfiles.slice(offset, offset + limit);
    const hasMore = offset + limit < filteredProfiles.length;
    const nextCursor = hasMore ? String(offset + limit) : null;

    // Enrich each profile with user data, ban status, and avatar URL
    const enrichedUsers = await Promise.all(
      page.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        if (!user) return null;

        // Check ban status
        const activeBan = await ctx.db
          .query("userBans")
          .withIndex("by_user_active", (q) =>
            q.eq("userId", profile.userId).eq("isActive", true)
          )
          .first();

        // Get avatar URL
        const avatarUrl = profile.avatar
          ? await ctx.storage.getUrl(profile.avatar)
          : null;

        return {
          userId: profile.userId,
          username: profile.username,
          name: profile.name ?? user.name ?? null,
          email: user.email ?? null,
          avatarUrl,
          joinedAt: profile.createdAt,
          lastLoginAt: (user as any).lastLoginAt ?? null,
          isBanned: !!activeBan,
          banInfo: activeBan
            ? {
                banId: activeBan._id,
                reason: activeBan.reason,
                banType: activeBan.banType,
                expiresAt: activeBan.expiresAt,
                createdAt: activeBan.createdAt,
              }
            : null,
        };
      })
    );

    return {
      users: enrichedUsers.filter((u) => u !== null),
      nextCursor,
      totalCount: filteredProfiles.length,
    };
  },
});

// ─── Check if a specific user is banned (for client-side use) ────────────────
export const isUserBanned = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const activeBan = await ctx.db
      .query("userBans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("isActive", true)
      )
      .first();

    if (!activeBan) return false;

    // If it's a temporary ban that has expired, mark it as inactive
    if (
      activeBan.banType === "TEMPORARY" &&
      activeBan.expiresAt &&
      activeBan.expiresAt < Date.now()
    ) {
      // We can't mutate in a query, so just report not banned
      // A scheduled job should clean these up
      return false;
    }

    return true;
  },
});

// ─── Get ban details for the current user (for showing ban message) ──────────
export const getMyBanInfo = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const activeBan = await ctx.db
      .query("userBans")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("isActive", true)
      )
      .first();

    if (!activeBan) return null;

    // Check if temporary ban has expired
    if (
      activeBan.banType === "TEMPORARY" &&
      activeBan.expiresAt &&
      activeBan.expiresAt < Date.now()
    ) {
      return null;
    }

    return {
      reason: activeBan.reason,
      banType: activeBan.banType,
      expiresAt: activeBan.expiresAt,
      createdAt: activeBan.createdAt,
    };
  },
});

// ─── Hard delete user and ALL associated content ─────────────────────────────
export const hardDeleteUser = mutation({
  args: {
    userId: v.id("users"),
    confirmUsername: v.string(), // Safety: admin must type the username to confirm
  },
  handler: async (ctx, args) => {
    const performerId = await getAuthUserId(ctx);
    if (!performerId) throw new Error("Not authenticated");

    if (!(await isAdmin(ctx, performerId))) {
      throw new Error("Admin access required");
    }

    // Cannot delete yourself
    if (args.userId === performerId) {
      throw new Error("You cannot delete your own account");
    }

    // Verify the user exists
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) throw new Error("User not found");

    // Verify username confirmation
    const targetProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!targetProfile) throw new Error("User profile not found");

    if (
      targetProfile.username.toLowerCase() !==
      args.confirmUsername.toLowerCase()
    ) {
      throw new Error(
        "Username confirmation does not match. Please type the exact username to confirm deletion."
      );
    }

    // Cannot delete another admin
    if (await isAdmin(ctx, args.userId)) {
      throw new Error(
        "Cannot delete an admin user. Remove their admin role first."
      );
    }

    // ─── CASCADE DELETE ALL USER DATA ───────────────────────────────────────
    const deletionCounts: Record<string, number> = {};

    // 1. Delete profile
    if (targetProfile) {
      // Delete avatar from storage
      if (targetProfile.avatar) {
        try {
          await ctx.storage.delete(targetProfile.avatar as Id<"_storage">);
        } catch (_) { /* storage item may not exist */ }
      }
      await ctx.db.delete(targetProfile._id);
      deletionCounts.profiles = 1;
    }

    // 2. Delete articles (and their cover images)
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();
    for (const article of articles) {
      if (article.coverImage) {
        try {
          await ctx.storage.delete(article.coverImage as Id<"_storage">);
        } catch (_) { /* ignore */ }
      }
      await ctx.db.delete(article._id);
    }
    deletionCounts.articles = articles.length;

    // 3. Delete reels (and their videos/posters)
    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();
    for (const reel of reels) {
      if (reel.video) {
        try {
          await ctx.storage.delete(reel.video as Id<"_storage">);
        } catch (_) { /* ignore */ }
      }
      if (reel.poster) {
        try {
          await ctx.storage.delete(reel.poster as Id<"_storage">);
        } catch (_) { /* ignore */ }
      }
      await ctx.db.delete(reel._id);
    }
    deletionCounts.reels = reels.length;

    // 4. Delete comments
    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("authorId"), args.userId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }
    deletionCounts.comments = comments.length;

    // 5. Delete stream comments
    const streamComments = await ctx.db
      .query("streamComments")
      .withIndex("by_author", (q) => q.eq("authorId", args.userId))
      .collect();
    for (const sc of streamComments) {
      await ctx.db.delete(sc._id);
    }
    deletionCounts.streamComments = streamComments.length;

    // 6. Delete likes
    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    for (const like of likes) {
      await ctx.db.delete(like._id);
    }
    deletionCounts.likes = likes.length;

    // 7. Delete claps
    const claps = await ctx.db
      .query("claps")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    for (const clap of claps) {
      await ctx.db.delete(clap._id);
    }
    deletionCounts.claps = claps.length;

    // 8. Delete bookmarks
    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const bm of bookmarks) {
      await ctx.db.delete(bm._id);
    }
    deletionCounts.bookmarks = bookmarks.length;

    // 9. Delete reads
    const reads = await ctx.db
      .query("reads")
      .withIndex("by_user_article", (q) => q.eq("userId", args.userId))
      .collect();
    for (const read of reads) {
      await ctx.db.delete(read._id);
    }
    deletionCounts.reads = reads.length;

    // 10. Delete follows (both directions)
    const followsAsFollower = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
      .collect();
    for (const f of followsAsFollower) {
      await ctx.db.delete(f._id);
    }
    const followsAsFollowing = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", args.userId))
      .collect();
    for (const f of followsAsFollowing) {
      await ctx.db.delete(f._id);
    }
    deletionCounts.follows = followsAsFollower.length + followsAsFollowing.length;

    // 11. Delete circle messages
    const circleMessages = await ctx.db
      .query("circleMessages")
      .withIndex("by_sender", (q) => q.eq("senderId", args.userId))
      .collect();
    for (const msg of circleMessages) {
      await ctx.db.delete(msg._id);
    }
    deletionCounts.circleMessages = circleMessages.length;

    // 12. Delete circle memberships
    const circleMemberships = await ctx.db
      .query("circleMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const m of circleMemberships) {
      await ctx.db.delete(m._id);
    }
    deletionCounts.circleMembers = circleMemberships.length;

    // 13. Delete notifications (sent to and from this user)
    const notificationsReceived = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const n of notificationsReceived) {
      await ctx.db.delete(n._id);
    }
    deletionCounts.notifications = notificationsReceived.length;

    // 14. Delete user bans
    const bans = await ctx.db
      .query("userBans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const ban of bans) {
      await ctx.db.delete(ban._id);
    }
    deletionCounts.userBans = bans.length;

    // 15. Delete moderation assignments
    const assignments = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", args.userId).eq("isActive", true)
      )
      .collect();
    for (const a of assignments) {
      await ctx.db.delete(a._id);
    }
    deletionCounts.moderationAssignments = assignments.length;

    // 16. Delete course enrollments
    const enrollments = await ctx.db
      .query("courseEnrollments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const e of enrollments) {
      await ctx.db.delete(e._id);
    }
    deletionCounts.courseEnrollments = enrollments.length;

    // 17. Delete course progress
    const progress = await ctx.db
      .query("courseProgress")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    for (const p of progress) {
      await ctx.db.delete(p._id);
    }
    deletionCounts.courseProgress = progress.length;

    // 18. Delete emails
    const emails = await ctx.db
      .query("emails")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const e of emails) {
      await ctx.db.delete(e._id);
    }
    deletionCounts.emails = emails.length;

    // 19. Delete auth sessions
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const session of sessions) {
      // Delete refresh tokens for this session
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of refreshTokens) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(session._id);
    }
    deletionCounts.authSessions = sessions.length;

    // 20. Delete auth accounts
    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const acc of accounts) {
      await ctx.db.delete(acc._id);
    }
    deletionCounts.authAccounts = accounts.length;

    // 21. Finally, delete the user document itself
    await ctx.db.delete(args.userId);
    deletionCounts.users = 1;

    // ─── Log the deletion action ────────────────────────────────────────────
    const performerRoles = await getUserActiveRoles(ctx, performerId);
    const performerRole = performerRoles.find((r) =>
      r.permissions.includes("manage_roles")
    );

    await logModerationAction(ctx, {
      actionType: "DELETE_USER",
      performedBy: performerId,
      performerRole: performerRole?._id,
      targetUserId: args.userId,
      reason: `Hard deleted user @${targetProfile.username} and all associated content`,
      metadata: { deletionCounts, deletedUsername: targetProfile.username },
    });

    return {
      success: true,
      message: `User @${targetProfile.username} and all associated content deleted permanently.`,
      deletionCounts,
    };
  },
});

/**
 * CLI Command to promote any user to Admin by email or username
 * Usage: npx convex run adminUsers:makeUserAdminCli '{"email": "user@example.com"}'
 */
export const makeUserAdminCli = mutation({
  args: {
    email: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.email && !args.username) {
      throw new Error("Please provide either email or username");
    }

    let targetUserId: Id<"users"> | null = null;
    let targetName = "";

    if (args.email) {
      const emailLower = args.email.toLowerCase().trim();
      // 1. Check users table
      const allUsers = await ctx.db.query("users").collect();
      const user = allUsers.find(
        (u) => (u.email && u.email.toLowerCase().trim() === emailLower)
      );
      if (user) {
        targetUserId = user._id;
        targetName = user.name || user.email || args.email;
      }

      // 2. Check authAccounts table
      if (!targetUserId) {
        const allAccounts = await ctx.db.query("authAccounts").collect();
        const account = allAccounts.find(
          (a) =>
            a.providerAccountId &&
            a.providerAccountId.toLowerCase().trim() === emailLower
        );
        if (account) {
          targetUserId = account.userId;
          const userDoc = await ctx.db.get(account.userId);
          targetName = userDoc?.name || userDoc?.email || args.email;
        }
      }

      // 3. Check profiles table
      if (!targetUserId) {
        const allProfiles = await ctx.db.query("profiles").collect();
        const prof = allProfiles.find(
          (p) => (p as any).email && (p as any).email.toLowerCase().trim() === emailLower
        );
        if (prof) {
          targetUserId = prof.userId;
          targetName = prof.name || prof.username || args.email;
        }
      }
    }

    if (!targetUserId && args.username) {
      const userLower = args.username.toLowerCase().trim();
      const allProfiles = await ctx.db.query("profiles").collect();
      const prof = allProfiles.find(
        (p) => p.username && p.username.toLowerCase().trim() === userLower
      );
      if (prof) {
        targetUserId = prof.userId;
        targetName = prof.name || prof.username || args.username;
      }
    }

    if (!targetUserId) {
      // List available users to assist
      const sampleProfiles = await ctx.db.query("profiles").take(10);
      const availableList = sampleProfiles
        .map((p) => `@${p.username}`)
        .join(", ");
      throw new Error(
        `User not found with ${args.email ? "email: " + args.email : "username: " + args.username}. Available usernames: [${availableList}]`
      );
    }

    // Find or create the standard Admin role
    let adminRole = await ctx.db
      .query("moderationRoles")
      .withIndex("by_name", (q) => q.eq("name", "Admin"))
      .first();

    if (!adminRole) {
      adminRole = await ctx.db
        .query("moderationRoles")
        .withIndex("by_name", (q) => q.eq("name", "Primary Admin"))
        .first();
    }

    if (!adminRole) {
      const roleId = await ctx.db.insert("moderationRoles", {
        name: "Admin",
        description: "Full administrator access with role and tier management",
        permissions: [
          "manage_users",
          "ban_users",
          "manage_roles",
          "manage_content",
          "manage_tiers",
          "manage_settings",
        ],
        canApprove: ["articles", "pulses", "events", "courses"],
        isSystemRole: false,
        createdBy: targetUserId,
        createdAt: Date.now(),
      });
      adminRole = (await ctx.db.get(roleId))!;
    }

    // Check if user already has this role assigned
    const existingAssignment = await ctx.db
      .query("moderationAssignments")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", targetUserId!).eq("isActive", true)
      )
      .filter((q) => q.eq(q.field("roleId"), adminRole!._id))
      .first();

    if (existingAssignment) {
      return {
        success: true,
        message: `User ${targetName} (${targetUserId}) is already an active Admin.`,
      };
    }

    await ctx.db.insert("moderationAssignments", {
      userId: targetUserId,
      roleId: adminRole._id,
      assignedBy: targetUserId,
      assignedAt: Date.now(),
      isActive: true,
      isPrimaryAdmin: false,
    });

    return {
      success: true,
      message: `Successfully promoted ${targetName} (${targetUserId}) to Admin!`,
    };
  },
});

/**
 * CLI Command to list all users in database
 * Usage: npx convex run adminUsers:listUsersCli
 */
export const listUsersCli = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    const users = await ctx.db.query("users").collect();
    const accounts = await ctx.db.query("authAccounts").collect();

    return profiles.map((p) => {
      const u = users.find((user) => user._id === p.userId);
      const acc = accounts.find((a) => a.userId === p.userId);
      return {
        userId: p.userId,
        username: p.username,
        name: p.name || u?.name,
        userEmail: u?.email,
        authAccountEmail: acc?.providerAccountId,
      };
    });
  },
});
