import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create or update booking settings
export const createOrUpdateSettings = mutation({
  args: {
    confirmationType: v.string(), // AUTOMATIC | MANUAL
    bufferTime: v.optional(v.number()), // Minutes between sessions (default 15)
    maxAdvanceBooking: v.optional(v.number()), // Days in advance (default 30)
    cancellationPolicy: v.optional(v.string()), // Hours before session (default 24)
    sessionInstructions: v.optional(v.string()) // Default meeting instructions
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate confirmation type
    if (!['AUTOMATIC', 'MANUAL'].includes(args.confirmationType)) {
      throw new Error("Invalid confirmation type");
    }

    // Check if settings already exist
    const existingSettings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    const settingsData = {
      confirmationType: args.confirmationType,
      bufferTime: args.bufferTime ?? 15,
      maxAdvanceBooking: args.maxAdvanceBooking ?? 30,
      cancellationPolicy: args.cancellationPolicy ?? "24",
      sessionInstructions: args.sessionInstructions,
      updatedAt: now
    };

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, settingsData);
      return existingSettings._id;
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert("bookingSettings", {
        userId,
        ...settingsData,
        createdAt: now
      });
      return settingsId;
    }
  }
});

// Get user's booking settings
export const getMySettings = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Return default settings if none exist
    if (!settings) {
      return {
        userId,
        confirmationType: "AUTOMATIC",
        bufferTime: 15,
        maxAdvanceBooking: 30,
        cancellationPolicy: "24",
        sessionInstructions: undefined,
        createdAt: Date.now(),
        updatedAt: undefined
      };
    }

    return settings;
  }
});

// Get settings by user ID (for other users to see)
export const getSettingsByUserId = query({
  args: {
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    // Return default settings if none exist
    if (!settings) {
      return {
        userId: args.userId,
        confirmationType: "AUTOMATIC",
        bufferTime: 15,
        maxAdvanceBooking: 30,
        cancellationPolicy: "24",
        sessionInstructions: undefined,
        createdAt: Date.now(),
        updatedAt: undefined
      };
    }

    return settings;
  }
});

// Update confirmation type only
export const updateConfirmationType = mutation({
  args: {
    confirmationType: v.string()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate confirmation type
    if (!['AUTOMATIC', 'MANUAL'].includes(args.confirmationType)) {
      throw new Error("Invalid confirmation type");
    }

    // Get existing settings
    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (settings) {
      // Update existing settings
      await ctx.db.patch(settings._id, {
        confirmationType: args.confirmationType,
        updatedAt: Date.now()
      });
      return settings._id;
    } else {
      // Create new settings with default values
      const settingsId = await ctx.db.insert("bookingSettings", {
        userId,
        confirmationType: args.confirmationType,
        bufferTime: 15,
        maxAdvanceBooking: 30,
        cancellationPolicy: "24",
        createdAt: Date.now()
      });
      return settingsId;
    }
  }
});

// Update buffer time
export const updateBufferTime = mutation({
  args: {
    bufferTime: v.number()
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Validate buffer time
    if (args.bufferTime < 0 || args.bufferTime > 120) {
      throw new Error("Buffer time must be between 0 and 120 minutes");
    }

    // Get existing settings
    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        bufferTime: args.bufferTime,
        updatedAt: Date.now()
      });
      return settings._id;
    } else {
      // Create new settings with default values
      const settingsId = await ctx.db.insert("bookingSettings", {
        userId,
        confirmationType: "AUTOMATIC",
        bufferTime: args.bufferTime,
        maxAdvanceBooking: 30,
        cancellationPolicy: "24",
        createdAt: Date.now()
      });
      return settingsId;
    }
  }
});

// Update session instructions
export const updateSessionInstructions = mutation({
  args: {
    sessionInstructions: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get existing settings
    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        sessionInstructions: args.sessionInstructions,
        updatedAt: Date.now()
      });
      return settings._id;
    } else {
      // Create new settings with default values
      const settingsId = await ctx.db.insert("bookingSettings", {
        userId,
        confirmationType: "AUTOMATIC",
        bufferTime: 15,
        maxAdvanceBooking: 30,
        cancellationPolicy: "24",
        sessionInstructions: args.sessionInstructions,
        createdAt: Date.now()
      });
      return settingsId;
    }
  }
});

// Reset settings to defaults
export const resetToDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get existing settings
    const settings = await ctx.db
      .query("bookingSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const defaultSettings = {
      confirmationType: "AUTOMATIC",
      bufferTime: 15,
      maxAdvanceBooking: 30,
      cancellationPolicy: "24",
      sessionInstructions: undefined,
      updatedAt: Date.now()
    };

    if (settings) {
      await ctx.db.patch(settings._id, defaultSettings);
      return settings._id;
    } else {
      const settingsId = await ctx.db.insert("bookingSettings", {
        userId,
        ...defaultSettings,
        createdAt: Date.now()
      });
      return settingsId;
    }
  }
});