import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create or get existing conversation between two users
export const createOrGetConversation = mutation({
  args: {
    otherUserId: v.id("users")
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    if (userId === args.otherUserId) {
      throw new Error("Cannot create conversation with yourself");
    }

    // Check if conversation already exists between these users
    const conversations = await ctx.db.query("chatConversations").collect();
    const existingConversation = conversations.find(conv =>
      conv.participants.length === 2 &&
      conv.participants.includes(userId) &&
      conv.participants.includes(args.otherUserId)
    );

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new conversation
    const conversationId = await ctx.db.insert("chatConversations", {
      participants: [userId, args.otherUserId],
      lastActivity: Date.now(),
      isActive: true,
      createdAt: Date.now()
    });

    return conversationId;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("chatConversations"),
    messageType: v.string(), // "text" | "image" | "emoji"
    content: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user is participant in this conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      throw new Error("Not authorized to send message in this conversation");
    }

    // Create message
    const messageId = await ctx.db.insert("chatMessages", {
      conversationId: args.conversationId,
      senderId: userId,
      messageType: args.messageType,
      content: args.content,
      isRead: false,
      createdAt: Date.now()
    });

    // Update conversation's last activity and last message
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      lastActivity: Date.now(),
      updatedAt: Date.now()
    });

    return messageId;
  },
});

// Get conversation messages
export const getConversationMessages = query({
  args: {
    conversationId: v.id("chatConversations"),
    paginationOpts: v.optional(v.object({
      numItems: v.number(),
      cursor: v.optional(v.string())
    }))
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user is participant in this conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      throw new Error("Not authorized to view this conversation");
    }

    // Get messages with pagination
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .paginate({
        numItems: args.paginationOpts?.numItems || 50,
        cursor: args.paginationOpts?.cursor || null
      });

    // Get sender profiles for each message
    const messagesWithSenders = await Promise.all(
      messages.page.map(async (message) => {
        const senderProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", message.senderId))
          .first();

        return {
          ...message,
          sender: senderProfile
        };
      })
    );

    return {
      ...messages,
      page: messagesWithSenders.reverse() // Reverse to show oldest first
    };
  },
});

// Get user's conversations
export const getUserConversations = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get conversations where user is a participant
    const allConversations = await ctx.db
      .query("chatConversations")
      .withIndex("by_last_activity")
      .order("desc")
      .collect();

    const conversations = allConversations
      .filter(conv => conv.participants.includes(userId))
      .slice(0, 50);

    // Get conversation details with other participant info and last message
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUserId = conversation.participants.find(id => id !== userId);

        if (!otherUserId) {
          return null;
        }

        const otherUserProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
          .first();

        const otherUser = await ctx.db.get(otherUserId);

        let lastMessage = null;
        if (conversation.lastMessageId) {
          lastMessage = await ctx.db.get(conversation.lastMessageId);
        }

        // Get unread message count for this conversation
        const unreadCount = await ctx.db
          .query("chatMessages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("isRead"), false),
              q.neq(q.field("senderId"), userId)
            )
          )
          .collect()
          .then(messages => messages.length);

        return {
          ...conversation,
          otherUser: {
            _id: otherUserId,
            user: otherUser,
            profile: otherUserProfile
          },
          lastMessage,
          unreadCount
        };
      })
    );

    return conversationsWithDetails.filter(Boolean);
  },
});

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("chatConversations")
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user is participant in this conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      throw new Error("Not authorized to mark messages as read in this conversation");
    }

    // Get unread messages from other users in this conversation
    const unreadMessages = await ctx.db
      .query("chatMessages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("isRead"), false),
          q.neq(q.field("senderId"), userId)
        )
      )
      .collect();

    // Mark all unread messages as read
    await Promise.all(
      unreadMessages.map(async (message) => {
        await ctx.db.patch(message._id, {
          isRead: true,
          readAt: Date.now()
        });
      })
    );

    return { markedAsRead: unreadMessages.length };
  },
});

// Get conversation by ID (for direct access)
export const getConversation = query({
  args: { conversationId: v.id("chatConversations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      throw new Error("Not authorized to view this conversation");
    }

    // Get other participant info
    const otherUserId = conversation.participants.find(id => id !== userId);

    if (!otherUserId) {
      throw new Error("Invalid conversation");
    }

    const otherUserProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", otherUserId))
      .first();

    const otherUser = await ctx.db.get(otherUserId);

    return {
      ...conversation,
      otherUser: {
        _id: otherUserId,
        user: otherUser,
        profile: otherUserProfile
      }
    };
  },
});