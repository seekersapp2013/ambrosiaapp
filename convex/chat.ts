import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Start a chat with a content author
export const startChatWithAuthor = mutation({
  args: {
    authorId: v.id("users"),
    contentType: v.union(v.literal("article"), v.literal("reel"), v.literal("stream")),
    contentId: v.union(v.id("articles"), v.id("reels"), v.id("bookings")),
    initialMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    // Can't chat with yourself
    if (currentUserId === args.authorId) {
      throw new Error("Cannot start a chat with yourself");
    }

    // Check if user can message the author based on privacy settings
    const canMessage = await ctx.runQuery(api.chatPrivacy.canUserMessage, {
      targetUserId: args.authorId,
    });

    if (!canMessage) {
      throw new Error("You don't have permission to message this user");
    }

    // Check if a conversation already exists between these users
    const existingConversation = await ctx.db
      .query("chatConversations")
      .filter((q) => 
        q.or(
          q.eq(q.field("participants"), [currentUserId, args.authorId]),
          q.eq(q.field("participants"), [args.authorId, currentUserId])
        )
      )
      .first();

    let conversationId: Id<"chatConversations">;

    if (existingConversation) {
      conversationId = existingConversation._id;
    } else {
      // Create new conversation
      conversationId = await ctx.db.insert("chatConversations", {
        participants: [currentUserId, args.authorId],
        lastActivity: Date.now(),
        createdAt: Date.now(),
        isActive: true,
      });
    }

    // Send initial message if provided
    if (args.initialMessage) {
      const messageId = await ctx.db.insert("chatMessages", {
        conversationId,
        senderId: currentUserId,
        messageType: "text",
        content: args.initialMessage,
        createdAt: Date.now(),
        isRead: false,
      });

      // Update conversation's last message reference
      await ctx.db.patch(conversationId, {
        lastMessageId: messageId,
        lastActivity: Date.now(),
      });
    }

    return { conversationId, success: true };
  },
});

// Get conversation between current user and another user
export const getConversationWith = query({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      return null;
    }

    const conversation = await ctx.db
      .query("chatConversations")
      .filter((q) => 
        q.or(
          q.eq(q.field("participants"), [currentUserId, args.otherUserId]),
          q.eq(q.field("participants"), [args.otherUserId, currentUserId])
        )
      )
      .first();

    return conversation;
  },
});

// Get conversation details with participants
export const getConversation = query({
  args: {
    conversationId: v.id("chatConversations"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    // Check if current user is a participant
    if (!conversation.participants.includes(currentUserId)) {
      throw new Error("Access denied");
    }

    // Get participant details
    const participants = await Promise.all(
      conversation.participants.map(async (participantId) => {
        const user = await ctx.db.get(participantId);
        if (!user) return null;
        
        // Get profile for additional info
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", participantId))
          .first();
        
        return {
          _id: user._id,
          name: profile?.name || user.name,
          username: profile?.username,
          avatar: profile?.avatar || user.image,
        };
      })
    );

    return {
      ...conversation,
      participants: participants.filter(Boolean),
      currentUserId,
    };
  },
});

// Get messages for a conversation
export const getMessages = query({
  args: {
    conversationId: v.id("chatConversations"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    // Verify user is part of conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participants.includes(currentUserId)) {
      throw new Error("Access denied");
    }

    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation_created", (q) => 
        q.eq("conversationId", args.conversationId)
      )
      .order("asc")
      .collect();

    console.log('Retrieved messages:', messages.map(m => ({
      id: m._id,
      senderId: m.senderId,
      content: m.content,
      messageType: m.messageType,
      createdAt: m.createdAt
    })));

    return messages;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("chatConversations"),
    content: v.string(),
    messageType: v.union(v.literal("text"), v.literal("image"), v.literal("emoji")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Not authenticated");
    }

    // Verify user is part of conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || !conversation.participants.includes(currentUserId)) {
      throw new Error("Access denied");
    }

    // Create the message
    const messageId = await ctx.db.insert("chatMessages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      messageType: args.messageType,
      content: args.content,
      createdAt: Date.now(),
      isRead: false,
    });

    // Update conversation's last activity
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastActivity: Date.now(),
    });

    return { messageId, success: true };
  },
});