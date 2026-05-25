import { v } from "convex/values";
import { mutation, action, query, internalMutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Notification types for bookings
export const BOOKING_NOTIFICATION_TYPES = {
    BOOKING_CONFIRMED: "booking_confirmed",
    BOOKING_PENDING: "booking_pending",
    BOOKING_APPROVED: "booking_approved",
    BOOKING_REJECTED: "booking_rejected",
    BOOKING_CANCELLED: "booking_cancelled",
    BOOKING_REMINDER: "booking_reminder",
    NEW_BOOKING_REQUEST: "new_booking_request"
} as const;

// Send booking confirmation notification to client
export const sendBookingConfirmationNotification = internalMutation({
    args: {
        bookingId: v.id("bookings"),
        isAutomatic: v.boolean()
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.bookingId);
        if (!booking) {
            throw new Error("Booking not found");
        }

        // Get provider info
        const provider = await ctx.db
            .query("bookingSubscribers")
            .withIndex("by_user", (q) => q.eq("userId", booking.providerId))
            .first();

        const providerProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", booking.providerId))
            .first();

        if (!provider || !providerProfile) {
            throw new Error("Provider information not found");
        }

        const providerName = providerProfile.name || providerProfile.username || "Provider";
        const sessionDate = new Date(booking.sessionDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const sessionTime = formatTime(booking.sessionTime);

        const notificationType = args.isAutomatic
            ? BOOKING_NOTIFICATION_TYPES.BOOKING_CONFIRMED
            : BOOKING_NOTIFICATION_TYPES.BOOKING_PENDING;

        const title = args.isAutomatic
            ? "Booking Confirmed!"
            : "Booking Pending Approval";

        const message = args.isAutomatic
            ? `Your session with ${providerName} has been confirmed for ${sessionDate} at ${sessionTime}.`
            : `Your booking request with ${providerName} is pending approval. You'll be notified once the provider responds.`;

        // Create notification
        await ctx.db.insert("notifications", {
            userId: booking.clientId,
            type: notificationType,
            title,
            message,
            category: "booking",
            priority: "high",
            isRead: false,
            actorUserId: booking.providerId,
            metadata: {
                bookingId: booking._id,
                providerId: booking.providerId,
                sessionDate: booking.sessionDate,
                sessionTime: booking.sessionTime,
                providerName,
                amount: booking.totalAmount
            },
            createdAt: Date.now()
        });

        return true;
    }
});

// Send new booking notification to provider
export const sendNewBookingNotification = internalMutation({
    args: {
        bookingId: v.id("bookings")
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.bookingId);
        if (!booking) {
            throw new Error("Booking not found");
        }

        // Get client info
        const clientProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", booking.clientId))
            .first();

        if (!clientProfile) {
            throw new Error("Client information not found");
        }

        const clientName = clientProfile.name || clientProfile.username || "Client";
        const sessionDate = new Date(booking.sessionDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const sessionTime = formatTime(booking.sessionTime);

        const title = booking.confirmationType === "MANUAL"
            ? "New Booking Request"
            : "New Booking Confirmed";

        const message = booking.confirmationType === "MANUAL"
            ? `${clientName} has requested a session on ${sessionDate} at ${sessionTime}. Please review and approve.`
            : `${clientName} has booked a session with you on ${sessionDate} at ${sessionTime}.`;

        // Create notification
        await ctx.db.insert("notifications", {
            userId: booking.providerId,
            type: BOOKING_NOTIFICATION_TYPES.NEW_BOOKING_REQUEST,
            title,
            message,
            category: "booking",
            priority: "high",
            isRead: false,
            actorUserId: booking.clientId,
            metadata: {
                bookingId: booking._id,
                clientId: booking.clientId,
                sessionDate: booking.sessionDate,
                sessionTime: booking.sessionTime,
                clientName,
                amount: booking.totalAmount,
                requiresApproval: booking.confirmationType === "MANUAL"
            },
            createdAt: Date.now()
        });

        return true;
    }
});

// Send booking approval notification to client
export const sendBookingApprovalNotification = internalMutation({
    args: {
        bookingId: v.id("bookings"),
        approved: v.boolean(),
        sessionDetails: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.bookingId);
        if (!booking) {
            throw new Error("Booking not found");
        }

        // Get provider info
        const providerProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", booking.providerId))
            .first();

        if (!providerProfile) {
            throw new Error("Provider information not found");
        }

        const providerName = providerProfile.name || providerProfile.username || "Provider";
        const sessionDate = new Date(booking.sessionDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const sessionTime = formatTime(booking.sessionTime);

        const notificationType = args.approved
            ? BOOKING_NOTIFICATION_TYPES.BOOKING_APPROVED
            : BOOKING_NOTIFICATION_TYPES.BOOKING_REJECTED;

        const title = args.approved ? "Booking Approved!" : "Booking Declined";

        const message = args.approved
            ? `${providerName} has approved your session for ${sessionDate} at ${sessionTime}.${args.sessionDetails ? ` Session details: ${args.sessionDetails}` : ''}`
            : `${providerName} has declined your booking request for ${sessionDate} at ${sessionTime}. Your payment will be refunded.`;

        // Create notification
        await ctx.db.insert("notifications", {
            userId: booking.clientId,
            type: notificationType,
            title,
            message,
            category: "booking",
            priority: "high",
            isRead: false,
            actorUserId: booking.providerId,
            metadata: {
                bookingId: booking._id,
                providerId: booking.providerId,
                sessionDate: booking.sessionDate,
                sessionTime: booking.sessionTime,
                providerName,
                approved: args.approved,
                sessionDetails: args.sessionDetails
            },
            createdAt: Date.now()
        });

        return true;
    }
});

// Send booking cancellation notification
export const sendBookingCancellationNotification = internalMutation({
    args: {
        bookingId: v.id("bookings"),
        cancelledBy: v.string(), // "client" or "provider"
        reason: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.bookingId);
        if (!booking) {
            throw new Error("Booking not found");
        }

        // Determine who to notify (the other party)
        const notifyUserId = args.cancelledBy === "client" ? booking.providerId : booking.clientId;
        const actorUserId = args.cancelledBy === "client" ? booking.clientId : booking.providerId;

        // Get actor info
        const actorProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", actorUserId))
            .first();

        if (!actorProfile) {
            throw new Error("Actor information not found");
        }

        const actorName = actorProfile.name || actorProfile.username || (args.cancelledBy === "client" ? "Client" : "Provider");
        const sessionDate = new Date(booking.sessionDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const sessionTime = formatTime(booking.sessionTime);

        const title = "Booking Cancelled";
        const message = `${actorName} has cancelled the session scheduled for ${sessionDate} at ${sessionTime}.${args.reason ? ` Reason: ${args.reason}` : ''}`;

        // Create notification
        await ctx.db.insert("notifications", {
            userId: notifyUserId,
            type: BOOKING_NOTIFICATION_TYPES.BOOKING_CANCELLED,
            title,
            message,
            category: "booking",
            priority: "medium",
            isRead: false,
            actorUserId,
            metadata: {
                bookingId: booking._id,
                sessionDate: booking.sessionDate,
                sessionTime: booking.sessionTime,
                cancelledBy: args.cancelledBy,
                reason: args.reason
            },
            createdAt: Date.now()
        });

        return true;
    }
});

// Send booking reminder notifications (24 hours before)
export const sendBookingReminderNotifications = action({
    args: {},
    handler: async (ctx) => {
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowString = tomorrow.toISOString().split('T')[0];

        // Get all confirmed bookings for tomorrow
        const bookings = await ctx.runQuery(internal.bookingNotifications.getBookingsForReminder, {
            date: tomorrowString
        });

        let remindersSent = 0;

        for (const booking of bookings) {
            try {
                // Send reminder to client
                await ctx.runMutation(internal.bookingNotifications.sendSingleBookingReminder, {
                    bookingId: booking._id,
                    recipientType: "client"
                });

                // Send reminder to provider
                await ctx.runMutation(internal.bookingNotifications.sendSingleBookingReminder, {
                    bookingId: booking._id,
                    recipientType: "provider"
                });

                remindersSent += 2;
            } catch (error) {
                console.error(`Failed to send reminder for booking ${booking._id}:`, error);
            }
        }

        return { remindersSent };
    }
});

// Internal query to get bookings for reminder
export const getBookingsForReminder = internalQuery({
    args: {
        date: v.string()
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("bookings")
            .withIndex("by_date", (q) => q.eq("sessionDate", args.date))
            .filter((q) => q.eq(q.field("status"), "CONFIRMED"))
            .collect();
    }
});

// Internal mutation to send single booking reminder
export const sendSingleBookingReminder = internalMutation({
    args: {
        bookingId: v.id("bookings"),
        recipientType: v.string() // "client" or "provider"
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.bookingId);
        if (!booking) {
            return false;
        }

        const isClient = args.recipientType === "client";
        const recipientId = isClient ? booking.clientId : booking.providerId;
        const otherPartyId = isClient ? booking.providerId : booking.clientId;

        // Get other party info
        const otherPartyProfile = await ctx.db
            .query("profiles")
            .withIndex("by_userId", (q) => q.eq("userId", otherPartyId))
            .first();

        if (!otherPartyProfile) {
            return false;
        }

        const otherPartyName = otherPartyProfile.name || otherPartyProfile.username || (isClient ? "Provider" : "Client");
        const sessionDate = new Date(booking.sessionDate).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const sessionTime = formatTime(booking.sessionTime);

        const title = "Session Reminder";
        const message = isClient
            ? `Reminder: You have a session with ${otherPartyName} tomorrow (${sessionDate}) at ${sessionTime}.`
            : `Reminder: You have a session with ${otherPartyName} tomorrow (${sessionDate}) at ${sessionTime}.`;

        // Create notification
        await ctx.db.insert("notifications", {
            userId: recipientId,
            type: BOOKING_NOTIFICATION_TYPES.BOOKING_REMINDER,
            title,
            message,
            category: "booking",
            priority: "medium",
            isRead: false,
            actorUserId: otherPartyId,
            metadata: {
                bookingId: booking._id,
                sessionDate: booking.sessionDate,
                sessionTime: booking.sessionTime,
                otherPartyName,
                isReminder: true
            },
            createdAt: Date.now()
        });

        return true;
    }
});

// Helper function to format time
function formatTime(timeString: string): string {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}