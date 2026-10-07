import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Search across articles, users, and reels
export const searchAll = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    // Search articles
    const articles = await ctx.db
      .query("articles")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "PUBLISHED"),
          q.or(
            q.eq(q.field("title"), searchTerm),
            q.eq(q.field("subtitle"), searchTerm)
          )
        )
      )
      .take(10);

    // Get author info for articles
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        return {
          ...article,
          type: 'article',
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    // Search users by username
    const profiles = await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("username"), searchTerm))
      .take(10);

    const users = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          id: user?._id,
          type: 'user',
          name: user?.name || profile.name,
          username: profile.username,
          bio: profile.bio,
          avatar: profile.avatar,
        };
      })
    );

    // Search reels
    const reels = await ctx.db
      .query("reels")
      .filter((q) => 
        q.eq(q.field("caption"), searchTerm)
      )
      .take(10);

    // Get author info for reels
    const reelsWithAuthors = await Promise.all(
      reels.map(async (reel) => {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), reel.authorId))
          .first();

        return {
          ...reel,
          type: 'reel',
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return {
      articles: articlesWithAuthors,
      users: users.filter(u => u.id),
      reels: reelsWithAuthors,
    };
  },
});

// Search articles by tags
export const searchByTag = query({
  args: { tag: v.string() },
  handler: async (ctx, args) => {
    const articles = await ctx.db
      .query("articles")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "PUBLISHED")
        )
      )
      .take(20);

    // Filter articles that contain the tag
    const filteredArticles = articles.filter(article => 
      article.tags.includes(args.tag)
    );

    const reels = await ctx.db
      .query("reels")
      .collect();

    // Filter reels that contain the tag
    const filteredReels = reels.filter(reel => 
      reel.tags.includes(args.tag)
    ).slice(0, 20);

    // Get author info
    const articlesWithAuthors = await Promise.all(
      filteredArticles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        return {
          ...article,
          type: 'article',
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    const reelsWithAuthors = await Promise.all(
      filteredReels.map(async (reel) => {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), reel.authorId))
          .first();

        return {
          ...reel,
          type: 'reel',
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: profile?.avatar,
          },
        };
      })
    );

    return {
      articles: articlesWithAuthors,
      reels: reelsWithAuthors,
    };
  },
});

// Get popular tags
export const getPopularTags = query({
  handler: async (ctx) => {
    const articles = await ctx.db
      .query("articles")
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .collect();

    const reels = await ctx.db
      .query("reels")
      .collect();

    // Count tag frequency
    const tagCounts: Record<string, number> = {};

    articles.forEach(article => {
      article.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    reels.forEach(reel => {
      reel.tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Sort by frequency and return top 20
    const popularTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([tag, count]) => ({ tag, count }));

    return popularTags;
  },
});

// Helper: storage URL resolver
async function resolveStorageUrl(ctx: any, storageId: string | undefined | null): Promise<string | undefined> {
  if (!storageId) return undefined;
  try {
    const url = await ctx.storage.getUrl(storageId);
    return url ?? undefined;
  } catch {
    return undefined;
  }
}

// ─── Unified Home Search Query ───
export const searchUnifiedFeed = query({
  args: {
    query: v.string(),
    category: v.optional(v.string()), // "all" | "article" | "reel" | "event" | "circle" | "provider" | "course"
    feedMode: v.optional(v.string()), // "for_you" | "ai"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rawTerm = args.query.trim().toLowerCase();
    if (!rawTerm) return [];

    const limit = args.limit ?? 30;
    const cat = args.category ?? "all";
    const tokens = rawTerm.split(/\s+/).filter(Boolean);

    const matchesToken = (text?: string | null) => {
      if (!text) return false;
      const lower = text.toLowerCase();
      return tokens.some((t) => lower.includes(t));
    };

    const matchesAllTokens = (text?: string | null) => {
      if (!text) return false;
      const lower = text.toLowerCase();
      return tokens.every((t) => lower.includes(t));
    };

    const scoredItems: Array<{ item: any; score: number }> = [];

    // Helper for profile lookups
    const getAuthorInfo = async (userId: string) => {
      const user = (await ctx.db.get(userId as Id<"users">)) as { name?: string; email?: string } | null;
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId as Id<"users">))
        .first();
      const avatarUrl = await resolveStorageUrl(ctx, profile?.avatar);

      return {
        id: userId,
        name: user?.name || profile?.name || "Ambrosia User",
        username: profile?.username || user?.email?.split("@")[0] || "",
        avatar: avatarUrl,
      };
    };

    // 1. SEARCH ARTICLES
    if (cat === "all" || cat === "article") {
      const articles = await ctx.db
        .query("articles")
        .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
        .collect();

      for (const article of articles) {
        let score = 0;
        const titleLower = (article.title || "").toLowerCase();
        const subtitleLower = (article.subtitle || "").toLowerCase();
        const tags = article.tags || [];

        if (titleLower === rawTerm) score += 100;
        else if (matchesAllTokens(titleLower)) score += 80;
        else if (matchesToken(titleLower)) score += 50;

        if (tags.some((t) => matchesToken(t))) score += 45;
        if (matchesToken(subtitleLower)) score += 25;
        if (matchesToken(article.contentHtml)) score += 10;

        if (score > 0) {
          const author = await getAuthorInfo(article.authorId as string);
          const coverImageUrl = await resolveStorageUrl(ctx, article.coverImage);
          scoredItems.push({
            score,
            item: {
              ...article,
              contentType: "article" as const,
              coverImageUrl,
              author,
            },
          });
        }
      }
    }

    // 2. SEARCH REELS / PULSES
    if (cat === "all" || cat === "reel") {
      const reels = await ctx.db.query("reels").collect();

      for (const reel of reels) {
        let score = 0;
        const captionLower = (reel.caption || "").toLowerCase();
        const tags = reel.tags || [];

        if (captionLower === rawTerm) score += 90;
        else if (matchesAllTokens(captionLower)) score += 70;
        else if (matchesToken(captionLower)) score += 40;

        if (tags.some((t) => matchesToken(t))) score += 45;

        if (score > 0) {
          const author = await getAuthorInfo(reel.authorId as string);
          const posterUrl = await resolveStorageUrl(ctx, reel.poster);
          const videoUrl = await resolveStorageUrl(ctx, reel.video);
          scoredItems.push({
            score,
            item: {
              ...reel,
              contentType: "reel" as const,
              posterUrl,
              videoUrl,
              author,
            },
          });
        }
      }
    }

    // 3. SEARCH EVENTS
    if (cat === "all" || cat === "event") {
      const events = await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("status"), "ACTIVE"))
        .collect();

      for (const event of events) {
        let score = 0;
        const titleLower = (event.title || "").toLowerCase();
        const descLower = (event.description || "").toLowerCase();
        const categoryLower = (event as any).category ? String((event as any).category).toLowerCase() : "";
        const tags = event.tags || [];

        if (titleLower === rawTerm) score += 95;
        else if (matchesAllTokens(titleLower)) score += 75;
        else if (matchesToken(titleLower)) score += 45;

        if (matchesToken(categoryLower)) score += 40;
        if (tags.some((t) => matchesToken(t))) score += 40;
        if (matchesToken(descLower)) score += 20;

        if (score > 0) {
          const provider = await getAuthorInfo(event.providerId as string);
          const coverImageUrl = await resolveStorageUrl(ctx, (event as any).coverImage);
          scoredItems.push({
            score,
            item: {
              ...event,
              contentType: "event" as const,
              coverImageUrl,
              availableSpots: (event.maxParticipants || 10) - (event.currentParticipants || 0),
              author: provider,
            },
          });
        }
      }
    }

    // 4. SEARCH CIRCLES
    if (cat === "all" || cat === "circle") {
      const circles = await ctx.db.query("circles").collect();

      for (const circle of circles) {
        let score = 0;
        const nameLower = (circle.name || "").toLowerCase();
        const descLower = (circle.description || "").toLowerCase();
        const categoryLower = (circle as any).category ? String((circle as any).category).toLowerCase() : "";
        const tags = circle.tags || [];

        if (nameLower === rawTerm) score += 100;
        else if (matchesAllTokens(nameLower)) score += 80;
        else if (matchesToken(nameLower)) score += 50;

        if (matchesToken(categoryLower)) score += 40;
        if (tags.some((t) => matchesToken(t))) score += 40;
        if (matchesToken(descLower)) score += 20;

        if (score > 0) {
          const coverImageUrl = await resolveStorageUrl(ctx, circle.coverImage);
          scoredItems.push({
            score,
            item: {
              ...circle,
              contentType: "circle" as const,
              coverImageUrl,
              currentMembers: circle.currentMembers || 1,
            },
          });
        }
      }
    }

    // 5. SEARCH PROVIDERS
    if (cat === "all" || cat === "provider") {
      const subscribers = await ctx.db
        .query("bookingSubscribers")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .collect();

      for (const sub of subscribers) {
        let score = 0;
        const jobTitleLower = (sub.jobTitle || "").toLowerCase();
        const specLower = (sub.specialization || "").toLowerCase();
        const aboutLower = (sub.aboutUser || "").toLowerCase();

        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", sub.userId as Id<"users">))
          .first();

        const user = (await ctx.db.get(sub.userId as Id<"users">)) as { name?: string; email?: string } | null;
        const nameLower = (user?.name || profile?.name || "").toLowerCase();

        if (nameLower === rawTerm || jobTitleLower === rawTerm) score += 95;
        else if (matchesToken(nameLower) || matchesToken(jobTitleLower)) score += 60;

        if (matchesToken(specLower)) score += 50;
        if (matchesToken(aboutLower)) score += 20;

        if (score > 0) {
          const avatarUrl = await resolveStorageUrl(ctx, profile?.avatar);
          const tierData = await ctx.db
            .query("providerTierData")
            .withIndex("by_userId", (q) => q.eq("userId", sub.userId as Id<"users">))
            .first();

          scoredItems.push({
            score: score + (tierData?.prsScore || 0) * 0.1,
            item: {
              ...sub,
              _id: sub._id,
              userId: sub.userId,
              contentType: "provider" as const,
              name: user?.name || profile?.name || "Healthcare Provider",
              username: profile?.username || "",
              avatarUrl,
              tier: tierData?.tier || "sapphire",
            },
          });
        }
      }
    }

    // 6. SEARCH COURSES
    if (cat === "all" || cat === "course") {
      const courses = await ctx.db
        .query("courses")
        .withIndex("by_published", (q) => q.eq("isPublished", true))
        .collect();

      for (const course of courses) {
        let score = 0;
        const titleLower = (course.title || "").toLowerCase();
        const descLower = (course.description || "").toLowerCase();
        const categoryLower = (course.category || "").toLowerCase();
        const tags = course.tags || [];

        if (titleLower === rawTerm) score += 95;
        else if (matchesAllTokens(titleLower)) score += 75;
        else if (matchesToken(titleLower)) score += 45;

        if (matchesToken(categoryLower)) score += 40;
        if (tags.some((t) => matchesToken(t))) score += 40;
        if (matchesToken(descLower)) score += 20;

        if (score > 0) {
          const author = await getAuthorInfo(course.authorId as string);
          const coverImageUrl = await resolveStorageUrl(ctx, course.coverImage);
          scoredItems.push({
            score,
            item: {
              ...course,
              contentType: "course" as const,
              coverImageUrl,
              author,
            },
          });
        }
      }
    }

    // AI mode boost for highly ranked / recent items
    if (args.feedMode === "ai") {
      for (const entry of scoredItems) {
        if (entry.item.createdAt) {
          const recencyDays = (Date.now() - entry.item.createdAt) / (1000 * 60 * 60 * 24);
          if (recencyDays < 7) entry.score += 15;
        }
      }
    }

    // Sort by final score descending
    scoredItems.sort((a, b) => b.score - a.score);

    return scoredItems.slice(0, limit).map((s) => s.item);
  },
});
