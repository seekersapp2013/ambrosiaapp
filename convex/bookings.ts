import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Create a new 1-on-1 booking
export const createBooking = mutation({
  args: {
    providerId: v.id("users"),
    sessionDate: v.string(), // YYYY-MM-DD format
    sessionTime: v.string(), // HH:MM format
    duration: v.optional(v.number()), // Duration in minutes (default 60)
    paymentTxHash: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate that user is not booking themselves
    if (userId === args.providerId) {
      throw new Error("Cannot book a session with yourself");
    }

    // Get provider subscription
    const provider = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.providerId))
      .first();

    if (!provider || !provider.isActive) {
      throw new Error("Provider not found or inactive");
    }

    // Get provider settings
    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.providerId))
      .first();

    const confirmationType = settings?.confirmationType || "AUTOMATIC";
    const duration = args.duration || 60;

    // Check if time slot is available
    const isAvailable = await checkTimeSlotAvailabilityHelper(ctx, {
      providerId: args.providerId,
      sessionDate: args.sessionDate,
      sessionTime: args.sessionTime,
      duration
    });

    if (!isAvailable) {
      throw new Error("Time slot is not available");
    }

    // Calculate total amount for 1-on-1 session
    const totalAmount = (duration / 60) * (provider.oneOnOnePrice || provider.sessionPrice);

    // Get user's wallet to determine currency
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();
    
    const currency = wallet?.primaryCurrency || "USD";

    const now = Date.now();

    // Generate unique room name for live streaming
    const roomName = `booking-${userId}-${args.providerId}-${Date.now()}`;

    // Create booking
    const bookingId = await ctx.db.insert("bookings", {
      providerId: args.providerId,
      clientId: userId,
      sessionDate: args.sessionDate,
      sessionTime: args.sessionTime,
      duration,
      totalAmount,
      currency,
      status: confirmationType === "AUTOMATIC" ? "CONFIRMED" : "PENDING",
      paymentTxHash: args.paymentTxHash,
      confirmationType,
      sessionType: "ONE_ON_ONE",
      liveStreamRoomName: roomName,
      liveStreamStatus: "NOT_STARTED",
      createdAt: now
    });

    // Send notifications
    try {
      // Notify client about booking status
      await ctx.scheduler.runAfter(0, internal.bookingNotifications.sendBookingConfirmationNotification, {
        bookingId,
        isAutomatic: confirmationType === "AUTOMATIC"
      });

      // Notify provider about new booking
      await ctx.scheduler.runAfter(0, internal.bookingNotifications.sendNewBookingNotification, {
        bookingId
      });
    } catch (error) {
      console.error("Failed to send booking notifications:", error);
      // Don't fail the booking creation if notifications fail
    }

    return bookingId;
  }
});

// Create a new event booking (1-to-many)
export const createEventBooking = mutation({
  args: {
    eventId: v.id("events"),
    paymentTxHash: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (event.status !== "ACTIVE") {
      throw new Error("Event is not active");
    }

    // Validate that user is not booking their own event
    if (userId === event.providerId) {
      throw new Error("Cannot book your own event");
    }

    // Check if event is full
    if (event.currentParticipants >= event.maxParticipants) {
      throw new Error("Event is full");
    }

    // Check if user already booked this event
    const existingBooking = await ctx.db
      .query("bookings")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.and(
        q.eq(q.field("clientId"), userId),
        q.or(
          q.eq(q.field("status"), "CONFIRMED"),
          q.eq(q.field("status"), "PENDING")
        )
      ))
      .first();

    if (existingBooking) {
      throw new Error("You have already booked this event");
    }

    // Get provider settings for confirmation type
    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", event.providerId))
      .first();

    const confirmationType = settings?.confirmationType || "AUTOMATIC";
    const now = Date.now();

    // Use event's room name if it exists, otherwise create one
    const roomName = event.liveStreamRoomName || `event-${args.eventId}-${Date.now()}`;

    // Get user's wallet to determine currency
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();
    
    const currency = event.priceCurrency || wallet?.primaryCurrency || "USD";

    // Create booking
    const bookingId = await ctx.db.insert("bookings", {
      providerId: event.providerId,
      clientId: userId,
      sessionDate: event.sessionDate,
      sessionTime: event.sessionTime,
      duration: event.duration,
      totalAmount: event.pricePerPerson,
      currency,
      status: confirmationType === "AUTOMATIC" ? "CONFIRMED" : "PENDING",
      paymentTxHash: args.paymentTxHash,
      confirmationType,
      sessionType: "ONE_TO_MANY",
      eventId: args.eventId,
      liveStreamRoomName: roomName,
      liveStreamStatus: "NOT_STARTED",
      createdAt: now
    });

    // Update event with room name if it didn't have one
    if (!event.liveStreamRoomName) {
      await ctx.db.patch(args.eventId, {
        liveStreamRoomName: roomName,
        liveStreamStatus: "NOT_STARTED",
        updatedAt: now
      });
    }

    // Update event participant count if booking is confirmed
    if (confirmationType === "AUTOMATIC") {
      await ctx.db.patch(args.eventId, {
        currentParticipants: event.currentParticipants + 1,
        status: event.currentParticipants + 1 >= event.maxParticipants ? "FULL" : "ACTIVE",
        updatedAt: now
      });
    }

    // Send notifications
    try {
      // Notify client about booking status
      await ctx.scheduler.runAfter(0, internal.bookingNotifications.sendBookingConfirmationNotification, {
        bookingId,
        isAutomatic: confirmationType === "AUTOMATIC"
      });

      // Notify provider about new event booking
      await ctx.scheduler.runAfter(0, internal.bookingNotifications.sendNewBookingNotification, {
        bookingId
      });
    } catch (error) {
      console.error("Failed to send event booking notifications:", error);
      // Don't fail the booking creation if notifications fail
    }

    return bookingId;
  }
});

// Get provider availability for a date range
export const getProviderAvailability = query({
  args: {
    providerId: v.id("users"),
    startDate: v.string(), // YYYY-MM-DD format
    endDate: v.string()    // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    // Get provider subscription
    const provider = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.providerId))
      .first();

    if (!provider || !provider.isActive) {
      return { available: false, reason: "Provider not found or inactive" };
    }

    // Get provider settings
    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.providerId))
      .first();

    const bufferTime = settings?.bufferTime || 15;

    // Generate date range
    const startDateObj = new Date(args.startDate);
    const endDateObj = new Date(args.endDate);
    const availabilityData = [];

    for (let date = new Date(startDateObj); date <= endDateObj; date.setDate(date.getDate() + 1)) {
      const dateString = date.toISOString().split('T')[0];
      const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];

      const daySchedule = provider.openHours[dayOfWeek as keyof typeof provider.openHours];

      if (!daySchedule.available) {
        availabilityData.push({
          date: dateString,
          available: false,
          reason: "Provider not available on this day",
          timeSlots: []
        });
        continue;
      }

      // Get existing bookings for this date
      const allBookingsForDate = await ctx.db
        .query("bookings")
        .withIndex("by_provider_date", (q) =>
          q.eq("providerId", args.providerId).eq("sessionDate", dateString)
        )
        .collect();

      const existingBookings = allBookingsForDate.filter((booking: any) =>
        booking.status === "CONFIRMED" || booking.status === "PENDING"
      );

      // Generate time slots
      const timeSlots = generateTimeSlots(daySchedule.start, daySchedule.end, 60, bufferTime, existingBookings);

      availabilityData.push({
        date: dateString,
        available: timeSlots.some(slot => slot.available),
        dayOfWeek,
        timeSlots
      });
    }

    return {
      available: true,
      provider: {
        name: provider.jobTitle,
        oneOnOnePrice: provider.oneOnOnePrice || provider.sessionPrice,
        groupSessionPrice: provider.groupSessionPrice || provider.sessionPrice
      },
      availability: availabilityData
    };
  }
});

// Check if a specific time slot is available
export const checkTimeSlotAvailability = query({
  args: {
    providerId: v.id("users"),
    sessionDate: v.string(),
    sessionTime: v.string(),
    duration: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    return await checkTimeSlotAvailabilityHelper(ctx, args);
  }
});

// Helper function to check time slot availability
async function checkTimeSlotAvailabilityHelper(ctx: any, args: {
  providerId: string;
  sessionDate: string;
  sessionTime: string;
  duration?: number;
}) {
  const duration = args.duration || 60;

  // Get provider subscription
  const provider = await ctx.db
    .query("bookingSubscribers")
    .withIndex("by_user", (q: any) => q.eq("userId", args.providerId))
    .first();

  if (!provider || !provider.isActive) {
    return false;
  }

  // Check if provider is available on this day
  const date = new Date(args.sessionDate);
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  const daySchedule = provider.openHours[dayOfWeek as keyof typeof provider.openHours];

  if (!daySchedule.available) {
    return false;
  }

  // Check if time is within open hours
  const sessionStart = timeToMinutes(args.sessionTime);
  const sessionEnd = sessionStart + duration;
  const dayStart = timeToMinutes(daySchedule.start);
  const dayEnd = timeToMinutes(daySchedule.end);

  if (sessionStart < dayStart || sessionEnd > dayEnd) {
    return false;
  }

  // Check for conflicts with existing 1-on-1 bookings
  const allBookings = await ctx.db
    .query("bookings")
    .withIndex("by_provider_date", (q: any) =>
      q.eq("providerId", args.providerId).eq("sessionDate", args.sessionDate)
    )
    .collect();

  const existingBookings = allBookings.filter((booking: any) =>
    (booking.status === "CONFIRMED" || booking.status === "PENDING") &&
    booking.sessionType === "ONE_ON_ONE"
  );

  // Check for conflicts with existing events
  const existingEvents = await ctx.db
    .query("events")
    .withIndex("by_provider_date", (q: any) =>
      q.eq("providerId", args.providerId).eq("sessionDate", args.sessionDate)
    )
    .filter((q: any) => q.eq(q.field("status"), "ACTIVE"))
    .collect();

  // Get provider settings for buffer time
  const allSettings = await ctx.db
    .query("bookingSettings")
    .withIndex("by_user", (q: any) => q.eq("userId", args.providerId))
    .collect();

  const settings = allSettings[0];
  const bufferTime = settings?.bufferTime || 15;

  // Check conflicts with 1-on-1 bookings
  for (const booking of existingBookings) {
    const bookingStart = timeToMinutes(booking.sessionTime);
    const bookingEnd = bookingStart + booking.duration;

    // Check for overlap with buffer time
    if (
      (sessionStart >= bookingStart - bufferTime && sessionStart < bookingEnd + bufferTime) ||
      (sessionEnd > bookingStart - bufferTime && sessionEnd <= bookingEnd + bufferTime) ||
      (sessionStart <= bookingStart - bufferTime && sessionEnd >= bookingEnd + bufferTime)
    ) {
      return false;
    }
  }

  // Check conflicts with events
  for (const event of existingEvents) {
    const eventStart = timeToMinutes(event.sessionTime);
    const eventEnd = eventStart + event.duration;

    // Check for overlap with buffer time
    if (
      (sessionStart >= eventStart - bufferTime && sessionStart < eventEnd + bufferTime) ||
      (sessionEnd > eventStart - bufferTime && sessionEnd <= eventEnd + bufferTime) ||
      (sessionStart <= eventStart - bufferTime && sessionEnd >= eventEnd + bufferTime)
    ) {
      return false;
    }
  }

  return true;
}

// Helper function to convert time string to minutes
function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper function to convert minutes to time string
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Helper function to generate time slots
function generateTimeSlots(startTime: string, endTime: string, slotDuration: number, bufferTime: number, existingBookings: any[]) {
  const slots = [];
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  for (let time = startMinutes; time + slotDuration <= endMinutes; time += slotDuration) {
    const timeString = minutesToTime(time);

    // Check if this slot conflicts with existing bookings
    let available = true;
    for (const booking of existingBookings) {
      const bookingStart = timeToMinutes(booking.sessionTime);
      const bookingEnd = bookingStart + booking.duration;

      if (
        (time >= bookingStart - bufferTime && time < bookingEnd + bufferTime) ||
        (time + slotDuration > bookingStart - bufferTime && time + slotDuration <= bookingEnd + bufferTime) ||
        (time <= bookingStart - bufferTime && time + slotDuration >= bookingEnd + bufferTime)
      ) {
        available = false;
        break;
      }
    }

    slots.push({
      time: timeString,
      available,
      booked: !available
    });
  }

  return slots;
}

// Get user's bookings (as client)
export const getMyBookings = query({
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
      .withIndex("by_client", (q) => q.eq("clientId", userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const bookings = await query.order("desc").collect();

    // Get provider information for each booking
    const bookingsWithProviders = await Promise.all(
      bookings.map(async (booking) => {
        const provider = await ctx.db
          .query("bookingSubscribers")
          .withIndex("by_user", (q) => q.eq("userId", booking.providerId))
          .first();

        const providerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", booking.providerId))
          .first();

        return {
          ...booking,
          provider: {
            subscription: provider,
            profile: providerProfile
          }
        };
      })
    );

    return bookingsWithProviders;
  }
});

// Get provider's bookings (as provider)
export const getProviderBookings = query({
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
      .withIndex("by_provider", (q) => q.eq("providerId", userId));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    const bookings = await query.order("desc").collect();

    // Get client information for each booking
    const bookingsWithClients = await Promise.all(
      bookings.map(async (booking) => {
        const clientProfile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", booking.clientId))
          .first();

        return {
          ...booking,
          client: {
            profile: clientProfile
          }
        };
      })
    );

    return bookingsWithClients;
  }
});

// Update booking status
export const updateBookingStatus = mutation({
  args: {
    bookingId: v.id("bookings"),
    status: v.string(),
    sessionDetails: v.optional(v.string())
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

    // Only provider can update booking status
    if (booking.providerId !== userId) {
      throw new Error("Not authorized to update this booking");
    }

    const oldStatus = booking.status;

    await ctx.db.patch(args.bookingId, {
      status: args.status,
      sessionDetails: args.sessionDetails,
      updatedAt: Date.now()
    });

    // Handle event booking status changes
    if (booking.sessionType === "ONE_TO_MANY" && booking.eventId) {
      const event = await ctx.db.get(booking.eventId);
      if (event) {
        // If booking was confirmed from pending, increment participant count
        if (args.status === "CONFIRMED" && oldStatus === "PENDING") {
          const newParticipantCount = event.currentParticipants + 1;
          await ctx.db.patch(booking.eventId, {
            currentParticipants: newParticipantCount,
            status: newParticipantCount >= event.maxParticipants ? "FULL" : "ACTIVE",
            updatedAt: Date.now()
          });
        }
        // If booking was cancelled or rejected, decrement participant count
        else if ((args.status === "CANCELLED" || args.status === "REJECTED") &&
          (oldStatus === "CONFIRMED" || oldStatus === "PENDING")) {
          const newParticipantCount = Math.max(0, event.currentParticipants - (oldStatus === "CONFIRMED" ? 1 : 0));
          await ctx.db.patch(booking.eventId, {
            currentParticipants: newParticipantCount,
            status: newParticipantCount < event.maxParticipants ? "ACTIVE" : event.status,
            updatedAt: Date.now()
          });
        }
      }
    }

    // Send notification if booking was approved or rejected
    if (args.status === "CONFIRMED" && booking.status === "PENDING") {
      try {
        await ctx.scheduler.runAfter(0, internal.bookingNotifications.sendBookingApprovalNotification, {
          bookingId: args.bookingId,
          approved: true,
          sessionDetails: args.sessionDetails
        });
      } catch (error) {
        console.error("Failed to send booking approval notification:", error);
      }
    } else if (args.status === "CANCELLED" && booking.status === "PENDING") {
      try {
        await ctx.scheduler.runAfter(0, internal.bookingNotifications.sendBookingApprovalNotification, {
          bookingId: args.bookingId,
          approved: false
        });
      } catch (error) {
        console.error("Failed to send booking rejection notification:", error);
      }
    }

    return args.bookingId;
  }
});

// Cancel booking
export const cancelBooking = mutation({
  args: {
    bookingId: v.id("bookings"),
    reason: v.optional(v.string())
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

    // Only client or provider can cancel
    if (booking.clientId !== userId && booking.providerId !== userId) {
      throw new Error("Not authorized to cancel this booking");
    }

    // Check if booking can be cancelled (not already completed)
    if (booking.status === "COMPLETED") {
      throw new Error("Cannot cancel completed booking");
    }

    await ctx.db.patch(args.bookingId, {
      status: "CANCELLED",
      updatedAt: Date.now()
    });

    // Send cancellation notification
    try {
      const cancelledBy = booking.clientId === userId ? "client" : "provider";
      await ctx.scheduler.runAfter(0, internal.bookingNotifications.sendBookingCancellationNotification, {
        bookingId: args.bookingId,
        cancelledBy,
        reason: args.reason
      });
    } catch (error) {
      console.error("Failed to send booking cancellation notification:", error);
    }

    return args.bookingId;
  }
});

// Start a live session (provider only)
export const startSession = mutation({
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

    // Only provider can start session
    if (booking.providerId !== userId) {
      throw new Error("Only provider can start session");
    }

    // Check if booking is confirmed
    if (booking.status !== "CONFIRMED") {
      throw new Error("Booking must be confirmed to start session");
    }

    // Check if session is already started
    if (booking.liveStreamStatus === "LIVE") {
      throw new Error("Session is already live");
    }

    // Update booking status to live
    await ctx.db.patch(args.bookingId, {
      liveStreamStatus: "LIVE",
      updatedAt: Date.now()
    });

    // If this is an event booking, update the event status too
    if (booking.sessionType === "ONE_TO_MANY" && booking.eventId) {
      await ctx.db.patch(booking.eventId, {
        liveStreamStatus: "LIVE",
        updatedAt: Date.now()
      });
    }

    return { success: true, roomName: booking.liveStreamRoomName };
  }
});

// Stop a live session (provider only)
export const stopSession = mutation({
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

    // Only provider can stop session
    if (booking.providerId !== userId) {
      throw new Error("Only provider can stop session");
    }

    // Check if session is live
    if (booking.liveStreamStatus !== "LIVE") {
      throw new Error("Session is not currently live");
    }

    // Update booking status to ended and completed
    await ctx.db.patch(args.bookingId, {
      liveStreamStatus: "ENDED",
      status: "COMPLETED",
      updatedAt: Date.now()
    });

    // If this is an event booking, update the event status too
    if (booking.sessionType === "ONE_TO_MANY" && booking.eventId) {
      await ctx.db.patch(booking.eventId, {
        liveStreamStatus: "ENDED",
        status: "COMPLETED",
        updatedAt: Date.now()
      });
    }

    // Check if this booking is linked to a referral and complete it with commission
    const referral = await ctx.db
      .query("referrals")
      .withIndex("by_booking", (q) => q.eq("bookingId", args.bookingId))
      .first();

    if (referral && referral.status === "ACCEPTED" && !referral.commissionPaid && referral.commissionAmount && referral.commissionCurrency) {
      try {
        // Get or create referring expert's wallet
        let referringExpertWallet = await ctx.db
          .query("wallets")
          .withIndex("userId", (q) => q.eq("userId", referral.referringExpertId))
          .first();

        if (!referringExpertWallet) {
          const walletId = await ctx.db.insert("wallets", {
            userId: referral.referringExpertId,
            primaryCurrency: "USD",
            phoneCountryDetected: false,
            balances: {
              USD: 0,
              NGN: 0,
              GBP: 0,
              EUR: 0,
              CAD: 0,
              GHS: 0,
              KES: 0,
              GMD: 0,
              ZAR: 0,
            },
            createdAt: Date.now(),
          });
          referringExpertWallet = await ctx.db.get(walletId);
        }

        if (referringExpertWallet) {
          const now = Date.now();
          const newBalances = { ...referringExpertWallet.balances };
          const currency = referral.commissionCurrency as keyof typeof newBalances;
          newBalances[currency] += referral.commissionAmount;

          await ctx.db.patch(referringExpertWallet._id, {
            balances: newBalances,
            updatedAt: now,
          });

          // Create commission transaction record
          const txId = `referral-commission-${referral._id}-${now}`;
          await ctx.db.insert("transactions", {
            id: txId,
            toUserId: referral.referringExpertId,
            fromUserId: referral.selectedExpertId,
            amount: referral.commissionAmount,
            currency: referral.commissionCurrency,
            type: "transfer",
            status: "completed",
            description: `Referral commission for: ${referral.title}`,
            metadata: {
              referralId: referral._id,
              bookingId: referral.bookingId,
              commissionRate: referral.commissionRate,
            },
            createdAt: now,
            completedAt: now,
          });

          // Update referral
          await ctx.db.patch(referral._id, {
            status: "COMPLETED",
            commissionPaid: true,
            commissionTxId: txId,
            completedAt: now,
            updatedAt: now,
          });
        }
      } catch (error) {
        console.error("Failed to complete referral commission:", error);
        // Don't fail the session stop if referral completion fails
      }
    }

    return { success: true };
  }
});

// Auto-complete sessions that have ended (scheduled function)
export const autoCompleteExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // Find confirmed bookings that should have ended
    const expiredBookings = await ctx.db
      .query("bookings")
      .withIndex("by_status", (q) => q.eq("status", "CONFIRMED"))
      .filter((q) =>
        q.or(
          // Sessions from previous dates
          q.lt(q.field("sessionDate"), currentDate),
          // Sessions from today that have passed their end time
          q.and(
            q.eq(q.field("sessionDate"), currentDate),
            q.lt(q.field("sessionTime"), currentTime)
          )
        )
      )
      .collect();

    // Update expired sessions to completed
    for (const booking of expiredBookings) {
      const sessionDateTime = new Date(`${booking.sessionDate}T${booking.sessionTime}`);
      const sessionEndTime = new Date(sessionDateTime.getTime() + (booking.duration * 60 * 1000));

      if (now > sessionEndTime.getTime()) {
        await ctx.db.patch(booking._id, {
          status: "COMPLETED",
          liveStreamStatus: "ENDED",
          updatedAt: now
        });

        // Update event if it's an event booking
        if (booking.sessionType === "ONE_TO_MANY" && booking.eventId) {
          await ctx.db.patch(booking.eventId, {
            status: "COMPLETED",
            liveStreamStatus: "ENDED",
            updatedAt: now
          });
        }
      }
    }

    return { updatedBookings: expiredBookings.length };
  }
});

// Move confirmed bookings to pending status when session time approaches
export const updateBookingStatusByTime = internalMutation({
  args: {},
  handler: async (ctx, args) => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);

    // Find confirmed bookings for today that haven't started yet
    const todaysBookings = await ctx.db
      .query("bookings")
      .withIndex("by_date", (q) => q.eq("sessionDate", currentDate))
      .filter((q) => q.eq(q.field("status"), "CONFIRMED"))
      .collect();

    for (const booking of todaysBookings) {
      const sessionDateTime = new Date(`${booking.sessionDate}T${booking.sessionTime}`);
      const timeDiff = sessionDateTime.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      // If session is within 15 minutes, update status to PENDING (ready to start)
      if (minutesDiff <= 15 && minutesDiff >= 0 && booking.liveStreamStatus === "NOT_STARTED") {
        await ctx.db.patch(booking._id, {
          status: "PENDING", // This indicates ready to start
          updatedAt: Date.now()
        });
      }
    }

    return { success: true };
  }
});

// Get booking details by ID
export const getBookingById = query({
  args: { bookingId: v.id("bookings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Only allow provider or client to view booking details
    if (booking.providerId !== userId && booking.clientId !== userId) {
      throw new Error("Access denied");
    }

    // Get provider profile
    const providerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", booking.providerId))
      .first();

    // Get client profile
    const clientProfile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", booking.clientId))
      .first();

    return {
      ...booking,
      provider: {
        id: booking.providerId,
        name: providerProfile?.name,
        username: providerProfile?.username,
        avatar: providerProfile?.avatar,
      },
      client: {
        id: booking.clientId,
        name: clientProfile?.name,
        username: clientProfile?.username,
        avatar: clientProfile?.avatar,
      }
    };
  }
});