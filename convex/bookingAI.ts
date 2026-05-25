import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// AI-ENHANCED BOOKING PROVIDER DISCOVERY
// ============================================================================

export const getBookingProvidersAI = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    specialization: v.optional(v.string()),
    searchTerm: v.optional(v.string()),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // If not authenticated or AI disabled or searching, use regular query
    if (!userId || args.useAI === false || args.searchTerm) {
      return await getRegularBookingProviders(ctx, args);
    }

    try {
      // Try to get AI-ranked providers
      const aiRankedProviders = await getAIRankedProviders(ctx, userId, args);
      
      if (aiRankedProviders && aiRankedProviders.length > 0) {
        return {
          providers: aiRankedProviders,
          useAI: true,
          source: "ai_recommendations"
        };
      }
    } catch (error) {
      console.error("AI provider recommendations error, falling back:", error);
    }

    // Fallback to regular providers
    const regularProviders = await getRegularBookingProviders(ctx, args);
    return {
      providers: regularProviders,
      useAI: false,
      source: "regular_query"
    };
  },
});

// Get AI-ranked booking providers
async function getAIRankedProviders(ctx: any, userId: any, args: any) {
  // Check for cached recommendations
  const cached = await ctx.db
    .query("recommendationCache")
    .withIndex("by_user_type", (q: any) =>
      q.eq("userId", userId).eq("contentType", "booking_providers")
    )
    .first();

  const now = Date.now();
  
  // If cache is valid, use it
  if (cached && cached.expiresAt > now && cached.rankedContentIds.length > 0) {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    const rankedIds = cached.rankedContentIds.slice(offset, offset + limit);
    return await fetchProvidersByIds(ctx, rankedIds, args.specialization);
  }

  // No valid cache, return null to trigger fallback
  return null;
}

// Fetch providers by IDs maintaining order
async function fetchProvidersByIds(ctx: any, providerIds: string[], specialization?: string) {
  const providers: any[] = [];
  
  for (const id of providerIds) {
    const providerId = id.replace("provider:", "");
    const provider = await ctx.db.get(providerId as any);
    
    if (provider && provider.isActive) {
      // Apply specialization filter if specified
      if (specialization && provider.specialization !== specialization) {
        continue;
      }
      
      // Get provider user info
      const user = await ctx.db.get(provider.userId);
      const profile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), provider.userId))
        .first();

      // Get booking count
      const bookingCount = await ctx.db
        .query("bookings")
        .withIndex("by_provider", (q: any) => q.eq("providerId", provider.userId))
        .collect()
        .then((bookings: any[]) => bookings.length);

      providers.push({
        ...provider,
        user: {
          id: user?._id,
          name: user?.name || profile?.name,
          username: profile?.username,
          avatar: profile?.avatar,
        },
        bookingCount,
      });
    }
  }
  
  return providers;
}

// Regular booking providers without AI (fallback)
async function getRegularBookingProviders(ctx: any, args: any) {
  const limit = args.limit || 20;
  const offset = args.offset || 0;
  
  let query = ctx.db
    .query("bookingSubscribers")
    .withIndex("by_active", (q: any) => q.eq("isActive", true));

  // Apply specialization filter
  if (args.specialization) {
    query = query.filter((q: any) => q.eq(q.field("specialization"), args.specialization));
  }

  // Apply search filter
  if (args.searchTerm) {
    const searchLower = args.searchTerm.toLowerCase();
    query = query.filter((q: any) =>
      q.or(
        q.eq(q.field("jobTitle").toLowerCase(), searchLower),
        q.eq(q.field("specialization").toLowerCase(), searchLower),
        q.eq(q.field("aboutUser").toLowerCase(), searchLower)
      )
    );
  }

  const providers = await query
    .order("desc")
    .take(limit + offset);

  // Paginate
  const paginatedProviders = providers.slice(offset, offset + limit);

  // Get user info for each provider
  const providersWithUsers = await Promise.all(
    paginatedProviders.map(async (provider: any) => {
      const user = await ctx.db.get(provider.userId);
      const profile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), provider.userId))
        .first();

      // Get booking count
      const bookingCount = await ctx.db
        .query("bookings")
        .withIndex("by_provider", (q: any) => q.eq("providerId", provider.userId))
        .collect()
        .then((bookings: any[]) => bookings.length);

      return {
        ...provider,
        user: {
          id: user?._id,
          name: user?.name || profile?.name,
          username: profile?.username,
          avatar: profile?.avatar,
        },
        bookingCount,
      };
    })
  );

  return providersWithUsers;
}

// ============================================================================
// AI-ENHANCED EVENT DISCOVERY
// ============================================================================

export const getPublicEventsAI = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    searchTerm: v.optional(v.string()),
    useAI: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    // If not authenticated or AI disabled or searching, use regular query
    if (!userId || args.useAI === false || args.searchTerm) {
      return await getRegularPublicEvents(ctx, args);
    }

    try {
      // Try to get AI-ranked events
      const aiRankedEvents = await getAIRankedEvents(ctx, userId, args);
      
      if (aiRankedEvents && aiRankedEvents.length > 0) {
        return {
          events: aiRankedEvents,
          useAI: true,
          source: "ai_recommendations"
        };
      }
    } catch (error) {
      console.error("AI event recommendations error, falling back:", error);
    }

    // Fallback to regular events
    const regularEvents = await getRegularPublicEvents(ctx, args);
    return {
      events: regularEvents,
      useAI: false,
      source: "regular_query"
    };
  },
});

// Get AI-ranked events
async function getAIRankedEvents(ctx: any, userId: any, args: any) {
  // Check for cached recommendations
  const cached = await ctx.db
    .query("recommendationCache")
    .withIndex("by_user_type", (q: any) =>
      q.eq("userId", userId).eq("contentType", "events")
    )
    .first();

  const now = Date.now();
  
  // If cache is valid, use it
  if (cached && cached.expiresAt > now && cached.rankedContentIds.length > 0) {
    const limit = args.limit || 20;
    const offset = args.offset || 0;
    const rankedIds = cached.rankedContentIds.slice(offset, offset + limit);
    return await fetchEventsByIds(ctx, rankedIds);
  }

  // No valid cache, return null to trigger fallback
  return null;
}

// Fetch events by IDs maintaining order
async function fetchEventsByIds(ctx: any, eventIds: string[]) {
  const events: any[] = [];
  
  for (const id of eventIds) {
    const eventId = id.replace("event:", "");
    const event = await ctx.db.get(eventId as any);
    
    if (event && event.status === "ACTIVE" && event.isPublic) {
      // Get provider info
      const provider = await ctx.db.get(event.providerId);
      const providerProfile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), event.providerId))
        .first();

      events.push({
        ...event,
        provider: {
          id: provider?._id,
          name: provider?.name || providerProfile?.name,
          username: providerProfile?.username,
          avatar: providerProfile?.avatar,
        },
      });
    }
  }
  
  return events;
}

// Regular public events without AI (fallback)
async function getRegularPublicEvents(ctx: any, args: any) {
  const limit = args.limit || 20;
  const offset = args.offset || 0;
  
  let query = ctx.db
    .query("events")
    .withIndex("by_public", (q: any) => q.eq("isPublic", true))
    .filter((q: any) => q.eq(q.field("status"), "ACTIVE"));

  // Apply search filter
  if (args.searchTerm) {
    const searchLower = args.searchTerm.toLowerCase();
    query = query.filter((q: any) =>
      q.or(
        q.eq(q.field("title").toLowerCase(), searchLower),
        q.eq(q.field("description").toLowerCase(), searchLower)
      )
    );
  }

  const events = await query
    .order("desc")
    .take(limit + offset);

  // Paginate
  const paginatedEvents = events.slice(offset, offset + limit);

  // Get provider info for each event
  const eventsWithProviders = await Promise.all(
    paginatedEvents.map(async (event: any) => {
      const provider = await ctx.db.get(event.providerId);
      const providerProfile = await ctx.db
        .query("profiles")
        .filter((q: any) => q.eq(q.field("userId"), event.providerId))
        .first();

      return {
        ...event,
        provider: {
          id: provider?._id,
          name: provider?.name || providerProfile?.name,
          username: providerProfile?.username,
          avatar: providerProfile?.avatar,
        },
      };
    })
  );

  return eventsWithProviders;
}

// ============================================================================
// GENERATE BOOKING PROVIDER RECOMMENDATIONS
// ============================================================================

export const generateProviderRecommendations = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      console.log(`Generating provider recommendations for user: ${args.userId}`);
      
      // Get user profile
      const userProfile = await ctx.runQuery(internal.aiRecommendations.buildUserProfile, {
        userId: args.userId,
      });

      if (!userProfile) {
        return { success: false, reason: "no_profile" };
      }

      // Get all active booking providers
      const providers = await ctx.runQuery(api.bookingSubscribers.getActiveSubscribers, { limit: 100 });

      // Score each provider
      const scoredProviders: Array<{ id: string; score: number; createdAt: number }> = [];

      for (const provider of providers) {
        const contentId = `provider:${provider._id}`;
        
        // Calculate provider-specific score
        const score = await calculateProviderScore(ctx, args.userId, provider, userProfile);

        scoredProviders.push({
          id: contentId,
          score,
          createdAt: provider._creationTime,
        });
      }

      // Sort by score (highest first)
      scoredProviders.sort((a, b) => b.score - a.score);

      // Apply booking-specific ranking
      const rankedIds = applyBookingRanking(scoredProviders, userProfile);

      // Cache the recommendations
      const now = Date.now();
      const expiresAt = now + 6 * 60 * 60 * 1000; // 6 hours

      const existing = await ctx.runQuery(internal.aiRecommendations.getCachedRecommendations, {
        userId: args.userId,
        contentType: "booking_providers",
      });

      if (existing) {
        await ctx.runMutation(internal.aiRecommendations.updateRecommendationCache, {
          cacheId: existing._id,
          rankedContentIds: rankedIds,
          expiresAt,
        });
      } else {
        await ctx.runMutation(internal.aiRecommendations.createRecommendationCache, {
          userId: args.userId,
          contentType: "booking_providers",
          rankedContentIds: rankedIds,
          expiresAt,
        });
      }

      return { success: true, count: rankedIds.length };
    } catch (error) {
      console.error("Error generating provider recommendations:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Calculate provider-specific score
async function calculateProviderScore(ctx: any, userId: any, provider: any, userProfile: any): Promise<number> {
  let score = 0;
  
  // 1. Specialization Match (40 points)
  const specializationScore = calculateSpecializationMatch(
    [...userProfile.interests, ...userProfile.tags],
    provider.specialization,
    provider.jobTitle
  );
  score += specializationScore * 0.4;
  
  // 2. Social Proof (20 points)
  const socialProofScore = calculateSocialProof(provider.bookingCount || 0);
  score += socialProofScore * 0.2;
  
  // 3. Price Compatibility (15 points)
  const priceScore = calculatePriceCompatibility(provider.oneOnOnePrice || provider.sessionPrice || 0);
  score += priceScore * 0.15;
  
  // 4. Availability (15 points)
  const availabilityScore = calculateAvailability(provider.openHours);
  score += availabilityScore * 0.15;
  
  // 5. Network Connection (10 points)
  const networkScore = userProfile.following.includes(provider.userId) ? 100 : 20;
  score += networkScore * 0.1;
  
  return Math.min(100, Math.round(score));
}

// Calculate specialization match
function calculateSpecializationMatch(userInterests: string[], specialization: string, jobTitle: string): number {
  if (userInterests.length === 0) return 50;
  
  const specializationLower = specialization.toLowerCase();
  const jobTitleLower = jobTitle.toLowerCase();
  
  let bestMatch = 0;
  
  for (const interest of userInterests) {
    const interestLower = interest.toLowerCase();
    
    // Exact match
    if (specializationLower === interestLower || jobTitleLower === interestLower) {
      bestMatch = Math.max(bestMatch, 100);
    }
    // Partial match
    else if (specializationLower.includes(interestLower) || interestLower.includes(specializationLower) ||
             jobTitleLower.includes(interestLower) || interestLower.includes(jobTitleLower)) {
      bestMatch = Math.max(bestMatch, 80);
    }
    // Word overlap
    else {
      const specializationWords = specializationLower.split(/\s+/);
      const jobTitleWords = jobTitleLower.split(/\s+/);
      const interestWords = interestLower.split(/\s+/);
      
      const specializationOverlap = specializationWords.filter(w => interestWords.includes(w)).length;
      const jobTitleOverlap = jobTitleWords.filter(w => interestWords.includes(w)).length;
      
      if (specializationOverlap > 0 || jobTitleOverlap > 0) {
        const maxOverlap = Math.max(specializationOverlap, jobTitleOverlap);
        const similarity = (maxOverlap / Math.max(interestWords.length, 1)) * 100;
        bestMatch = Math.max(bestMatch, similarity);
      }
    }
  }
  
  return bestMatch || 30; // Base score if no match
}

// Calculate social proof score
function calculateSocialProof(bookingCount: number): number {
  // More bookings = higher trust
  if (bookingCount >= 50) return 100;
  if (bookingCount >= 20) return 80;
  if (bookingCount >= 10) return 60;
  if (bookingCount >= 5) return 40;
  if (bookingCount >= 1) return 20;
  return 10; // New providers get some base score
}

// Calculate price compatibility
function calculatePriceCompatibility(price: number): number {
  // Assume most users prefer mid-range pricing
  // Very cheap might seem low quality, very expensive might be unaffordable
  if (price >= 20 && price <= 100) return 100; // Sweet spot
  if (price >= 10 && price < 20) return 70;
  if (price > 100 && price <= 200) return 70;
  if (price < 10) return 40;
  if (price > 200) return 40;
  return 50;
}

// Calculate availability score
function calculateAvailability(openHours: any): number {
  if (!openHours) return 50;
  
  // Count available days
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const availableDays = days.filter(day => openHours[day]?.available).length;
  
  // More available days = higher score
  return (availableDays / 7) * 100;
}

// Apply booking-specific ranking
function applyBookingRanking(
  scoredProviders: Array<{ id: string; score: number; createdAt: number }>,
  userProfile: any
): string[] {
  // Prioritize high-scoring providers but include some diversity
  const topProviders = scoredProviders.slice(0, Math.floor(scoredProviders.length * 0.8));
  const newProviders = scoredProviders.slice(Math.floor(scoredProviders.length * 0.8));

  const ranked: string[] = [];

  // Interleave: 4 top providers, 1 new provider
  let topIdx = 0;
  let newIdx = 0;

  while (topIdx < topProviders.length || newIdx < newProviders.length) {
    // Add 4 top providers
    for (let i = 0; i < 4 && topIdx < topProviders.length; i++) {
      ranked.push(topProviders[topIdx].id);
      topIdx++;
    }

    // Add 1 new provider
    if (newIdx < newProviders.length) {
      ranked.push(newProviders[newIdx].id);
      newIdx++;
    }
  }

  return ranked;
}

// ============================================================================
// GENERATE EVENT RECOMMENDATIONS
// ============================================================================

export const generateEventRecommendations = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      console.log(`Generating event recommendations for user: ${args.userId}`);
      
      // Get user profile
      const userProfile = await ctx.runQuery(internal.aiRecommendations.buildUserProfile, {
        userId: args.userId,
      });

      if (!userProfile) {
        return { success: false, reason: "no_profile" };
      }

      // Get all public events
      const eventsResult = await ctx.runQuery(api.events.getPublicEvents, { limit: 100 });
      const events = eventsResult.events || [];

      // Score each event
      const scoredEvents: Array<{ id: string; score: number; createdAt: number }> = [];

      for (const event of events) {
        const contentId = `event:${event._id}`;
        
        const analysis = await ctx.runQuery(internal.aiRecommendations.getContentAnalysis, {
          contentType: "event",
          contentId: event._id,
        });

        let score = 50;
        
        if (analysis) {
          const result = await ctx.runAction(api.aiRecommendations.calculateRecommendationScore, {
            userId: args.userId,
            contentType: "event",
            contentId: event._id,
            contentCreatedAt: event._creationTime,
          });
          score = result.score;
          
          // Bonus for events with available spots
          const spotsRemaining = event.maxParticipants - event.currentParticipants;
          if (spotsRemaining > 0 && spotsRemaining <= 5) {
            score += 10; // Urgency bonus for filling fast
          }
        } else {
          // Trigger analysis
          await ctx.runAction(api.aiRecommendations.analyzeContent, {
            contentType: "event",
            contentId: event._id,
            contentData: {
              title: event.title,
              description: event.description,
              tags: event.tags,
            },
          });
        }

        scoredEvents.push({
          id: contentId,
          score,
          createdAt: event._creationTime,
        });
      }

      // Sort by score
      scoredEvents.sort((a, b) => b.score - a.score);

      // Apply event-specific ranking
      const rankedIds = applyEventRanking(scoredEvents, userProfile);

      // Cache the recommendations
      const now = Date.now();
      const expiresAt = now + 6 * 60 * 60 * 1000; // 6 hours

      const existing = await ctx.runQuery(internal.aiRecommendations.getCachedRecommendations, {
        userId: args.userId,
        contentType: "events",
      });

      if (existing) {
        await ctx.runMutation(internal.aiRecommendations.updateRecommendationCache, {
          cacheId: existing._id,
          rankedContentIds: rankedIds,
          expiresAt,
        });
      } else {
        await ctx.runMutation(internal.aiRecommendations.createRecommendationCache, {
          userId: args.userId,
          contentType: "events",
          rankedContentIds: rankedIds,
          expiresAt,
        });
      }

      return { success: true, count: rankedIds.length };
    } catch (error) {
      console.error("Error generating event recommendations:", error);
      return { success: false, error: String(error) };
    }
  },
});

// Apply event-specific ranking
function applyEventRanking(
  scoredEvents: Array<{ id: string; score: number; createdAt: number }>,
  userProfile: any
): string[] {
  // Prioritize high-scoring events with some diversity
  return scoredEvents.map(e => e.id);
}
