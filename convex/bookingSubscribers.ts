import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a new booking subscriber
export const createSubscriber = mutation({
  args: {
    jobTitle: v.string(),
    specialization: v.string(),
    oneOnOnePrice: v.optional(v.number()),
    groupSessionPrice: v.optional(v.number()),
    sessionPrice: v.number(), // Legacy field for backward compatibility
    aboutUser: v.string(),
    xLink: v.optional(v.string()),
    linkedInLink: v.optional(v.string()),
    offerDescription: v.string(),
    openHours: v.object({
      monday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      tuesday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      wednesday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      thursday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      friday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      saturday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      sunday: v.object({ start: v.string(), end: v.string(), available: v.boolean() })
    })
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user already has a subscription
    const existingSubscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existingSubscriber) {
      throw new Error("User already has a booking subscription");
    }

    // Handle backward compatibility and set default values
    const oneOnOnePrice = args.oneOnOnePrice ?? args.sessionPrice;
    const groupSessionPrice = args.groupSessionPrice ?? Math.round(args.sessionPrice * 0.7); // Default to 70% of session price

    // Validate session prices
    if (oneOnOnePrice <= 0) {
      throw new Error("1-on-1 session price must be greater than 0");
    }

    if (groupSessionPrice <= 0) {
      throw new Error("Group session price must be greater than 0");
    }

    // Validate required fields
    if (!args.jobTitle.trim() || !args.specialization.trim() || !args.aboutUser.trim() || !args.offerDescription.trim()) {
      throw new Error("All required fields must be filled");
    }

    // Check if booking subscribers require approval
    const settings = await ctx.db.query("moderationSettings").first();
    const requiresApproval = settings?.bookingSubscribersRequireApproval ?? false;

    const now = Date.now();

    const subscriberId = await ctx.db.insert("bookingSubscribers", {
      userId,
      jobTitle: args.jobTitle.trim(),
      specialization: args.specialization.trim(),
      oneOnOnePrice: oneOnOnePrice,
      groupSessionPrice: groupSessionPrice,
      sessionPrice: args.sessionPrice,
      aboutUser: args.aboutUser.trim(),
      xLink: args.xLink?.trim() || undefined,
      linkedInLink: args.linkedInLink?.trim() || undefined,
      offerDescription: args.offerDescription.trim(),
      openHours: args.openHours,
      isActive: !requiresApproval, // Only active if no approval required
      approvalStatus: requiresApproval ? "PENDING" : "NOT_REQUIRED",
      approvalRequestedAt: requiresApproval ? now : undefined,
      createdAt: now
    });

    // If approval is required, create approval record
    if (requiresApproval) {
      await ctx.db.insert("contentApprovals", {
        contentType: "bookingSubscribers",
        contentId: subscriberId,
        status: "PENDING",
        submittedBy: userId,
        createdAt: now,
      });
    }

    // Create default booking settings
    await ctx.db.insert("bookingSettings", {
      userId,
      confirmationType: "AUTOMATIC",
      bufferTime: 15,
      maxAdvanceBooking: 30,
      cancellationPolicy: "24",
      createdAt: now
    });

    return { subscriberId, requiresApproval };
  }
});

// Update existing booking subscriber
export const updateSubscriber = mutation({
  args: {
    jobTitle: v.string(),
    specialization: v.string(),
    oneOnOnePrice: v.optional(v.number()),
    groupSessionPrice: v.optional(v.number()),
    sessionPrice: v.number(), // Legacy field for backward compatibility
    aboutUser: v.string(),
    xLink: v.optional(v.string()),
    linkedInLink: v.optional(v.string()),
    offerDescription: v.string(),
    openHours: v.object({
      monday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      tuesday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      wednesday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      thursday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      friday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      saturday: v.object({ start: v.string(), end: v.string(), available: v.boolean() }),
      sunday: v.object({ start: v.string(), end: v.string(), available: v.boolean() })
    })
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!subscriber) {
      throw new Error("Booking subscription not found");
    }

    // Handle backward compatibility and set default values
    const oneOnOnePrice = args.oneOnOnePrice ?? args.sessionPrice;
    const groupSessionPrice = args.groupSessionPrice ?? Math.round(args.sessionPrice * 0.7); // Default to 70% of session price

    // Validate session prices
    if (oneOnOnePrice <= 0) {
      throw new Error("1-on-1 session price must be greater than 0");
    }

    if (groupSessionPrice <= 0) {
      throw new Error("Group session price must be greater than 0");
    }

    // Validate required fields
    if (!args.jobTitle.trim() || !args.specialization.trim() || !args.aboutUser.trim() || !args.offerDescription.trim()) {
      throw new Error("All required fields must be filled");
    }

    await ctx.db.patch(subscriber._id, {
      jobTitle: args.jobTitle.trim(),
      specialization: args.specialization.trim(),
      oneOnOnePrice: oneOnOnePrice,
      groupSessionPrice: groupSessionPrice,
      sessionPrice: args.sessionPrice,
      aboutUser: args.aboutUser.trim(),
      xLink: args.xLink?.trim() || undefined,
      linkedInLink: args.linkedInLink?.trim() || undefined,
      offerDescription: args.offerDescription.trim(),
      openHours: args.openHours,
      updatedAt: Date.now()
    });

    return subscriber._id;
  }
});

// Get current user's booking subscriber record
export const getMySubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  }
});

// Get all active booking subscribers with optional filtering
export const getActiveSubscribers = query({
  args: {
    specialization: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true));

    const subscribers = await query.collect();

    // Apply filters
    let filteredSubscribers = subscribers;

    if (args.specialization) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.specialization.toLowerCase().includes(args.specialization!.toLowerCase())
      );
    }

    if (args.jobTitle) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.jobTitle.toLowerCase().includes(args.jobTitle!.toLowerCase())
      );
    }

    // Apply limit
    if (args.limit && args.limit > 0) {
      filteredSubscribers = filteredSubscribers.slice(0, args.limit);
    }

    return filteredSubscribers;
  }
});

// Get subscribers with their profile information
export const getSubscribersWithProfiles = query({
  args: {
    specialization: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    // Get active subscribers with filtering
    let query = ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true));

    const subscribers = await query.collect();

    // Apply filters
    let filteredSubscribers = subscribers;

    if (args.specialization) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.specialization.toLowerCase().includes(args.specialization!.toLowerCase())
      );
    }

    if (args.jobTitle) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.jobTitle.toLowerCase().includes(args.jobTitle!.toLowerCase())
      );
    }

    // Apply limit
    if (args.limit && args.limit > 0) {
      filteredSubscribers = filteredSubscribers.slice(0, args.limit);
    }

    const subscribersWithProfiles = await Promise.all(
      filteredSubscribers.map(async (subscriber) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", subscriber.userId))
          .first();

        return {
          subscriber,
          profile: profile ? {
            name: profile.name,
            username: profile.username,
            avatar: profile.avatar
          } : null
        };
      })
    );

    return subscribersWithProfiles;
  }
});

// Get a specific subscriber by user ID
export const getSubscriberByUserId = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  }
});

// Toggle subscriber active status
export const toggleSubscriberStatus = mutation({
  args: {
    isActive: v.boolean()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!subscriber) {
      throw new Error("Booking subscription not found");
    }

    await ctx.db.patch(subscriber._id, {
      isActive: args.isActive,
      updatedAt: Date.now()
    });

    return subscriber._id;
  }
});

// Get unique specializations for filtering
export const getSpecializations = query({
  args: {},
  handler: async (ctx) => {
    const subscribers = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const specializations = [...new Set(subscribers.map(sub => sub.specialization))];
    return specializations.sort();
  }
});

// Get unique job titles for filtering
export const getJobTitles = query({
  args: {},
  handler: async (ctx) => {
    const subscribers = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    const jobTitles = [...new Set(subscribers.map(sub => sub.jobTitle))];
    return jobTitles.sort();
  }
});

// Deactivate provider subscription when user account is deactivated
export const deactivateProviderSubscription = mutation({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (subscriber) {
      await ctx.db.patch(subscriber._id, {
        isActive: false,
        updatedAt: Date.now()
      });

      // Cancel all pending bookings for this provider
      const pendingBookings = await ctx.db
        .query("bookings")
        .withIndex("by_provider", (q) => q.eq("providerId", args.userId))
        .filter((q) => q.eq(q.field("status"), "PENDING"))
        .collect();

      for (const booking of pendingBookings) {
        await ctx.db.patch(booking._id, {
          status: "CANCELLED",
          updatedAt: Date.now()
        });
      }

      return subscriber._id;
    }

    return null;
  }
});

// Sync profile changes with booking subscriber data
export const syncProfileChanges = mutation({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    // Get updated profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) {
      return null;
    }

    // Get booking subscriber
    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (subscriber) {
      // Update subscriber with latest profile info
      await ctx.db.patch(subscriber._id, {
        updatedAt: Date.now()
      });

      return subscriber._id;
    }

    return null;
  }
});

// Get providers with pagination and advanced filtering
export const getProvidersWithPagination = query({
  args: {
    specialization: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const offset = args.offset || 0;
    const limit = args.limit || 20;

    // Get all active subscribers
    const allSubscribers = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Apply filters
    let filteredSubscribers = allSubscribers;

    if (args.specialization) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.specialization.toLowerCase().includes(args.specialization!.toLowerCase())
      );
    }

    if (args.jobTitle) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.jobTitle.toLowerCase().includes(args.jobTitle!.toLowerCase())
      );
    }

    if (args.minPrice !== undefined) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        (sub.oneOnOnePrice || sub.sessionPrice) >= args.minPrice! ||
        (sub.groupSessionPrice || sub.sessionPrice) >= args.minPrice!
      );
    }

    if (args.maxPrice !== undefined) {
      filteredSubscribers = filteredSubscribers.filter(sub =>
        (sub.oneOnOnePrice || sub.sessionPrice) <= args.maxPrice! ||
        (sub.groupSessionPrice || sub.sessionPrice) <= args.maxPrice!
      );
    }

    if (args.searchTerm) {
      const searchLower = args.searchTerm.toLowerCase();
      filteredSubscribers = filteredSubscribers.filter(sub =>
        sub.jobTitle.toLowerCase().includes(searchLower) ||
        sub.specialization.toLowerCase().includes(searchLower) ||
        sub.aboutUser.toLowerCase().includes(searchLower) ||
        sub.offerDescription.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation date (newest first)
    filteredSubscribers.sort((a, b) => b.createdAt - a.createdAt);

    // Apply pagination
    const paginatedSubscribers = filteredSubscribers.slice(offset, offset + limit);

    // Get profile information for each subscriber
    const subscribersWithProfiles = await Promise.all(
      paginatedSubscribers.map(async (subscriber) => {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", subscriber.userId))
          .first();

        return {
          subscriber,
          profile: profile ? {
            name: profile.name,
            username: profile.username,
            avatar: profile.avatar
          } : null
        };
      })
    );

    return {
      providers: subscribersWithProfiles,
      totalCount: filteredSubscribers.length,
      hasMore: offset + limit < filteredSubscribers.length
    };
  }
});

// Check if a provider is available on a specific date
export const checkProviderAvailability = query({
  args: {
    providerId: v.id("users"),
    date: v.string() // YYYY-MM-DD format
  },
  handler: async (ctx, args) => {
    // Get provider's subscription
    const subscriber = await ctx.db
      .query("bookingSubscribers")
      .withIndex("by_user", (q) => q.eq("userId", args.providerId))
      .first();

    if (!subscriber || !subscriber.isActive) {
      return { available: false, reason: "Provider not found or inactive" };
    }

    // Get day of week for the date
    const date = new Date(args.date);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[date.getDay()] as keyof typeof subscriber.openHours;

    // Check if provider is available on this day
    const daySchedule = subscriber.openHours[dayOfWeek];
    if (!daySchedule.available) {
      return { available: false, reason: "Provider not available on this day" };
    }

    // Get existing bookings for this date
    const existingBookings = await ctx.db
      .query("bookings")
      .withIndex("by_provider_date", (q) =>
        q.eq("providerId", args.providerId).eq("sessionDate", args.date)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "CONFIRMED"),
          q.eq(q.field("status"), "PENDING")
        )
      )
      .collect();

    return {
      available: true,
      daySchedule,
      existingBookings: existingBookings.map(booking => ({
        time: booking.sessionTime,
        duration: booking.duration,
        status: booking.status
      }))
    };
  }
});