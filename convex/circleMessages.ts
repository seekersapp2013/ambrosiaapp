import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

// Send message to circle
export const sendMessage = mutation({
  args: {
    circleId: v.id("circles"),
    messageType: v.string(), // "text" | "image" | "video" | "audio" | "emoji" | "file"
    content: v.string(),
    replyToId: v.optional(v.id("circleMessages")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const circle = await ctx.db.get(args.circleId);
    if (!circle || !circle.isActive) {
      throw new Error("Circle not found or inactive");
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You must be a member to send messages");
    }

    if (membership.isBanned) {
      throw new Error("You are banned from this circle");
    }

    // Check posting permissions
    if (circle.postingPermission === "ADMINS_ONLY") {
      const isAdmin = membership.role === "CREATOR" || 
                     membership.role === "ADMIN" || 
                     membership.role === "MODERATOR";
      
      if (!isAdmin) {
        throw new Error("Only admins can post in this circle");
      }
    }

    const now = Date.now();

    // Create message
    const messageId = await ctx.db.insert("circleMessages", {
      circleId: args.circleId,
      senderId: userId,
      messageType: args.messageType,
      content: args.content,
      replyToId: args.replyToId,
      isEdited: false,
      isPinned: false,
      createdAt: now,
    });

    // Update member's last active time
    await ctx.db.patch(membership._id, {
      lastActiveAt: now,
    });

    return { messageId, success: true };
  },
});

// Get circle messages
export const getMessages = query({
  args: {
    circleId: v.id("circles"),
    limit: v.optional(v.number()),
    before: v.optional(v.number()), // Timestamp for pagination
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You must be a member to view messages");
    }

    const limit = args.limit || 50;

    let query = ctx.db
      .query("circleMessages")
      .withIndex("by_circle_created", (q) => q.eq("circleId", args.circleId))
      .filter((q) => q.eq(q.field("isDeleted"), undefined));

    if (args.before) {
      query = query.filter((q) => q.lt(q.field("createdAt"), args.before!));
    }

    const messages = await query
      .order("desc")
      .take(limit);

    // Get sender profiles and reaction counts
    const messagesWithDetails = await Promise.all(
      messages.map(async (message) => {
        const senderProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", message.senderId))
          .first();

        const senderMembership = await ctx.db
          .query("circleMembers")
          .withIndex("by_circle_user", (q) => 
            q.eq("circleId", args.circleId).eq("userId", message.senderId)
          )
          .first();

        // Get reactions
        const reactions = await ctx.db
          .query("circleMessageReactions")
          .withIndex("by_message", (q) => q.eq("messageId", message._id))
          .collect();

        // Group reactions by emoji - return as array to avoid emoji field names
        const reactionMap = new Map<string, { count: number; userReacted: boolean }>();
        reactions.forEach(reaction => {
          const existing = reactionMap.get(reaction.emoji);
          if (!existing) {
            reactionMap.set(reaction.emoji, { count: 1, userReacted: reaction.userId === userId });
          } else {
            existing.count++;
            if (reaction.userId === userId) {
              existing.userReacted = true;
            }
          }
        });

        // Convert to array format
        const reactionsList = Array.from(reactionMap.entries()).map(([emoji, data]) => ({
          emoji,
          count: data.count,
          userReacted: data.userReacted,
        }));

        // Get reply-to message if exists
        let replyTo = null;
        if (message.replyToId) {
          const replyToMessage = await ctx.db.get(message.replyToId);
          if (replyToMessage) {
            const replyToSenderProfile = await ctx.db
              .query("profiles")
              .withIndex("by_userId", (q) => q.eq("userId", replyToMessage.senderId))
              .first();
            
            replyTo = {
              _id: replyToMessage._id,
              content: replyToMessage.content.substring(0, 100), // Preview only
              senderName: replyToSenderProfile?.name || replyToSenderProfile?.username,
            };
          }
        }

        return {
          ...message,
          sender: {
            id: message.senderId,
            name: senderProfile?.name,
            username: senderProfile?.username,
            avatar: senderProfile?.avatar,
            role: senderMembership?.role,
          },
          reactions: reactionsList,
          replyTo,
        };
      })
    );

    return messagesWithDetails.reverse(); // Return in chronological order
  },
});

// Edit message
export const editMessage = mutation({
  args: {
    messageId: v.id("circleMessages"),
    newContent: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== userId) {
      throw new Error("You can only edit your own messages");
    }

    if (message.isDeleted) {
      throw new Error("Cannot edit deleted message");
    }

    await ctx.db.patch(args.messageId, {
      content: args.newContent,
      isEdited: true,
      editedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Delete message
export const deleteMessage = mutation({
  args: {
    messageId: v.id("circleMessages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is sender or admin
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", message.circleId).eq("userId", userId)
      )
      .first();

    const isAdmin = membership && (
      membership.role === "CREATOR" || 
      membership.role === "ADMIN" || 
      membership.role === "MODERATOR"
    );

    if (message.senderId !== userId && !isAdmin) {
      throw new Error("You can only delete your own messages or be an admin");
    }

    // Soft delete
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Pin/unpin message
export const togglePinMessage = mutation({
  args: {
    messageId: v.id("circleMessages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is admin
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", message.circleId).eq("userId", userId)
      )
      .first();

    const isAdmin = membership && (
      membership.role === "CREATOR" || 
      membership.role === "ADMIN" || 
      membership.role === "MODERATOR"
    );

    if (!isAdmin) {
      throw new Error("Only admins can pin messages");
    }

    await ctx.db.patch(args.messageId, {
      isPinned: !message.isPinned,
      updatedAt: Date.now(),
    });

    return { isPinned: !message.isPinned };
  },
});

// Get pinned messages
export const getPinnedMessages = query({
  args: {
    circleId: v.id("circles"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", args.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You must be a member to view pinned messages");
    }

    const pinnedMessages = await ctx.db
      .query("circleMessages")
      .withIndex("by_circle_created", (q) => q.eq("circleId", args.circleId))
      .filter((q) => 
        q.and(
          q.eq(q.field("isPinned"), true),
          q.eq(q.field("isDeleted"), undefined)
        )
      )
      .order("desc")
      .collect();

    // Get sender profiles
    const messagesWithSenders = await Promise.all(
      pinnedMessages.map(async (message) => {
        const senderProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", message.senderId))
          .first();

        return {
          ...message,
          sender: {
            id: message.senderId,
            name: senderProfile?.name,
            username: senderProfile?.username,
            avatar: senderProfile?.avatar,
          },
        };
      })
    );

    return messagesWithSenders;
  },
});

// Add reaction to message
export const addReaction = mutation({
  args: {
    messageId: v.id("circleMessages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Check if user is a member
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => 
        q.eq("circleId", message.circleId).eq("userId", userId)
      )
      .first();

    if (!membership || !membership.isActive) {
      throw new Error("You must be a member to react to messages");
    }

    // Check if user already reacted with this emoji
    const existingReaction = await ctx.db
      .query("circleMessageReactions")
      .withIndex("by_message_user", (q) => 
        q.eq("messageId", args.messageId).eq("userId", userId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .first();

    if (existingReaction) {
      // Remove reaction
      await ctx.db.delete(existingReaction._id);
      return { action: "removed" };
    } else {
      // Add reaction
      await ctx.db.insert("circleMessageReactions", {
        messageId: args.messageId,
        userId,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
      return { action: "added" };
    }
  },
});
