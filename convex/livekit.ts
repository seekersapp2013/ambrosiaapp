import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create LiveKit room and generate access token for booking
export const createLiveStreamRoom = mutation({
  args: {
    bookingId: v.id("bookings")
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Only provider or client can create room
    if (booking.providerId !== userId && booking.clientId !== userId) {
      throw new Error("Not authorized to create room for this booking");
    }

    // Generate unique room name
    const roomName = `booking-${args.bookingId}-${Date.now()}`;

    // Update booking with room information
    await ctx.db.patch(args.bookingId, {
      liveStreamRoomName: roomName,
      liveStreamStatus: "NOT_STARTED",
      updatedAt: Date.now()
    });

    return { roomName };
  }
});



// Get booking information for streaming
export const getBookingForStream = query({
  args: {
    bookingId: v.id("bookings")
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return null;
    }

    // Get provider and client information
    const provider = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", booking.providerId))
      .first();

    const client = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", booking.clientId))
      .first();

    return {
      ...booking,
      provider: provider ? {
        name: provider.name || provider.username,
        username: provider.username,
        avatar: provider.avatar
      } : null,
      client: client ? {
        name: client.name || client.username,
        username: client.username,
        avatar: client.avatar
      } : null,
      currentUserId: userId,
      isProvider: userId === booking.providerId
    };
  }
});



// Update live stream status (public mutation for client use)
export const updateStreamStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.string(), // "NOT_STARTED" | "LIVE" | "ENDED"
    recordingId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Only provider or client can update stream status
    if (booking.providerId !== userId && booking.clientId !== userId) {
      throw new Error("Not authorized to update stream status");
    }

    const updateData: any = {
      liveStreamStatus: args.status,
      updatedAt: Date.now()
    };

    if (args.recordingId) {
      updateData.recordingId = args.recordingId;
    }

    await ctx.db.patch(args.bookingId, updateData);

    return { success: true };
  }
});

// Internal version for server use
export const updateStreamStatusInternal = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.string(), // "NOT_STARTED" | "LIVE" | "ENDED"
    recordingId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const updateData: any = {
      liveStreamStatus: args.status,
      updatedAt: Date.now()
    };

    if (args.recordingId) {
      updateData.recordingId = args.recordingId;
    }

    await ctx.db.patch(args.bookingId, updateData);

    return { success: true };
  }
});



// Update recording URL
export const updateRecordingUrl = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    recordingUrl: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, {
      recordingUrl: args.recordingUrl,
      updatedAt: Date.now()
    });

    return { success: true };
  }
});

// Update recording storage ID
export const updateRecordingStorageId = internalMutation({
  args: {
    bookingId: v.id("bookings"),
    recordingStorageId: v.string()
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, {
      recordingStorageId: args.recordingStorageId,
      updatedAt: Date.now()
    });

    return { success: true };
  }
});

// Download recording
export const downloadRecording = mutation({
  args: {
    bookingId: v.id("bookings")
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Only provider or client can download recording
    if (booking.providerId !== userId && booking.clientId !== userId) {
      throw new Error("Not authorized to download this recording");
    }

    if (!booking.recordingUrl) {
      throw new Error("No recording available for download");
    }

    try {
      let downloadUrl: string;

      // Check if recording is still pending or processing
      if (booking.recordingUrl.startsWith('pending-') || booking.recordingUrl.startsWith('processing-')) {
        throw new Error("Recording is still being processed. Please try again in a few minutes.");
      }

      // Check if recording URL indicates it's stored in Convex storage (legacy)
      if (booking.recordingUrl.startsWith('stored:')) {
        const storageId = booking.recordingUrl.replace('stored:', '');
        const storageUrl = await ctx.storage.getUrl(storageId);
        if (!storageUrl) {
          throw new Error("Failed to generate download URL for stored recording");
        }
        downloadUrl = storageUrl;
      } else if (booking.recordingStorageId) {
        // Generate a signed URL for the stored file (legacy)
        const storageUrl = await ctx.storage.getUrl(booking.recordingStorageId);
        if (!storageUrl) {
          throw new Error("Failed to generate download URL for stored recording");
        }
        downloadUrl = storageUrl;
      } else {
        // Use the LiveKit download URL directly
        downloadUrl = booking.recordingUrl;
      }

      return { 
        downloadUrl,
        success: true 
      };
    } catch (error) {
      console.error("Failed to generate download URL:", error);
      throw new Error("Failed to prepare recording for download");
    }
  }
});

// Get user's live stream sessions
export const getMyLiveStreams = query({
  args: {
    status: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    let query = ctx.db
      .query("bookings")
      .filter((q) => 
        q.or(
          q.eq(q.field("providerId"), userId),
          q.eq(q.field("clientId"), userId)
        )
      )
      .filter((q) => q.neq(q.field("liveStreamRoomName"), undefined));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("liveStreamStatus"), args.status));
    }

    const bookings = await query.order("desc").collect();

    // Get additional information for each booking
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        const provider = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", booking.providerId))
          .first();

        const client = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", booking.clientId))
          .first();

        return {
          ...booking,
          provider: provider ? {
            name: provider.name || provider.username,
            username: provider.username,
            avatar: provider.avatar
          } : null,
          client: client ? {
            name: client.name || client.username,
            username: client.username,
            avatar: client.avatar
          } : null,
          isProvider: booking.providerId === userId
        };
      })
    );

    return bookingsWithDetails;
  }
});

// Internal function to get booking for stream (used by actions)
export const getBookingForStreamInternal = internalQuery({
  args: {
    bookingId: v.id("bookings")
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      return null;
    }

    return booking;
  }
});

// Debug function to test LiveKit configuration (no auth required)
export const debugLiveKitConfig = query({
  args: {},
  handler: async (ctx, args) => {
    // This is just for debugging - don't expose sensitive info in production
    return {
      hasApiKey: !!process.env.LIVEKIT_API_KEY,
      hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
      wsUrl: process.env.LIVEKIT_WS_URL,
      timestamp: Date.now(),
      apiKeyPrefix: process.env.LIVEKIT_API_KEY?.substring(0, 6) + '...',
    };
  }
});

// Test connection to LiveKit server
export const testLiveKitConnection = query({
  args: {},
  handler: async (ctx, args) => {
    const wsUrl = process.env.LIVEKIT_WS_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    
    return {
      configured: !!(wsUrl && apiKey && apiSecret),
      wsUrl: wsUrl,
      wsUrlValid: wsUrl?.startsWith('wss://') || wsUrl?.startsWith('ws://'),
      timestamp: Date.now()
    };
  }
});