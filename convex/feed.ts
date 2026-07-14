import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve a storage ID to a public URL.
 * Returns undefined (not null) so spread into objects is clean.
 */
async function storageUrl(
  ctx: any,
  storageId: string | undefined | null
): Promise<string | undefined> {
  if (!storageId) return undefined;
  const url = await ctx.storage.getUrl(storageId);
  return url ?? undefined;
}

/**
 * Fetch all profiles for a set of userIds in parallel but as a single
 * batch — one query per userId (indexed) rather than a full table scan.
 */
async function batchProfiles(
  ctx: any,
  userIds: string[]
): Promise<Map<string, any>> {
  const unique = [...new Set(userIds)];
  const results = await Promise.all(
    unique.map((uid) =>
      ctx.db
        .query("profiles")
        .withIndex("by_userId", (q: any) => q.eq("userId", uid))
        .first()
    )
  );
  const map = new Map<string, any>();
  unique.forEach((uid, i) => {
    if (results[i]) map.set(uid, results[i]);
  });
  return map;
}

/**
 * Fetch all users for a set of IDs in parallel.
 */
async function batchUsers(
  ctx: any,
  userIds: string[]
): Promise<Map<string, any>> {
  const unique = [...new Set(userIds)];
  const results = await Promise.all(
    unique.map((uid) => ctx.db.get(uid as Id<"users">))
  );
  const map = new Map<string, any>();
  unique.forEach((uid, i) => {
    if (results[i]) map.set(uid, results[i]);
  });
  return map;
}

/**
 * Resolve courseInfo for a batch of content items.
 * One query per item (unavoidable given the index shape), but runs in parallel.
 */
async function batchCourseInfo(
  ctx: any,
  items: Array<{ contentType: "article" | "reel"; contentId: string }>
): Promise<Map<string, { courseTitle: string; order: number } | null>> {
  const memberships = await Promise.all(
    items.map(({ contentType, contentId }) =>
      ctx.db
        .query("courseContent")
        .withIndex("by_content", (q: any) =>
          q.eq("contentType", contentType).eq("contentId", contentId)
        )
        .first()
    )
  );

  // Collect unique course IDs to fetch in one batch
  const courseIds = [
    ...new Set(
      memberships
        .filter(Boolean)
        .map((m: any) => m.courseId as string)
    ),
  ];
  const courses = await Promise.all(
    courseIds.map((id) => ctx.db.get(id as Id<"courses">))
  );
  const courseMap = new Map<string, any>();
  courseIds.forEach((id, i) => {
    if (courses[i]) courseMap.set(id, courses[i]);
  });

  const result = new Map<string, { courseTitle: string; order: number } | null>();
  items.forEach(({ contentId }, i) => {
    const membership = memberships[i];
    if (!membership) {
      result.set(contentId, null);
      return;
    }
    const course = courseMap.get(membership.courseId);
    result.set(
      contentId,
      course ? { courseTitle: course.title, order: membership.order } : null
    );
  });
  return result;
}

/**
 * Resolve circleInfo for a batch of circleIds.
 * Returns a map from circleId → { circleId, circleName, parentCircleId?, parentCircleName?, coverImage? }
 */
async function batchCircleInfo(
  ctx: any,
  circleIds: string[]
): Promise<Map<string, { circleId: string; circleName: string; parentCircleId?: string; parentCircleName?: string; coverImage?: string }>> {
  const unique = [...new Set(circleIds)];
  if (unique.length === 0) return new Map();

  const circles = await Promise.all(
    unique.map((id) => ctx.db.get(id as Id<"circles">))
  );

  // Collect parent circle IDs for sub-circles
  const parentIds = circles
    .filter((c: any) => c?.parentCircleId)
    .map((c: any) => c.parentCircleId as string);
  const uniqueParentIds = [...new Set(parentIds)];
  const parents = await Promise.all(
    uniqueParentIds.map((id) => ctx.db.get(id as Id<"circles">))
  );
  const parentMap = new Map<string, any>();
  uniqueParentIds.forEach((id, i) => {
    if (parents[i]) parentMap.set(id, parents[i]);
  });

  // Resolve cover images
  const coverUrls = await Promise.all(
    circles.map((c: any) => storageUrl(ctx, c?.coverImage))
  );

  const result = new Map<string, any>();
  unique.forEach((id, i) => {
    const circle = circles[i];
    if (!circle) return;

    const parentCircle = circle.parentCircleId ? parentMap.get(circle.parentCircleId) : null;

    // For display: if this is a sub-circle, show parent info; otherwise show own info
    const displayCircleId = parentCircle ? parentCircle._id : circle._id;
    const displayCircleName = parentCircle ? parentCircle.name : circle.name;

    result.set(id, {
      circleId: displayCircleId as string,
      circleName: displayCircleName,
      parentCircleId: parentCircle ? (parentCircle._id as string) : undefined,
      parentCircleName: parentCircle ? parentCircle.name : undefined,
      coverImage: coverUrls[i],
    });
  });

  return result;
}

// ─── Query ────────────────────────────────────────────────────────────────────

export const listUnifiedFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    // Fetch third-limit each so merged total ≈ limit
    const third = Math.ceil(limit / 3);
    const half = Math.ceil(limit / 2);

    // ── 1. Fetch raw rows ────────────────────────────────────────────────────
    const [articles, reels, circleEvents] = await Promise.all([
      ctx.db
        .query("articles")
        .withIndex("by_status", (q: any) => q.eq("status", "PUBLISHED"))
        .order("desc")
        .take(half),
      ctx.db.query("reels").order("desc").take(half),
      // Fetch upcoming circle-exclusive events (publicly visible in feed)
      ctx.db
        .query("events")
        .withIndex("by_status", (q: any) => q.eq("status", "ACTIVE"))
        .order("desc")
        .take(third),
    ]);

    // Filter out circle-only content UNLESS it has a circleId (community content shows with badge)
    // Circle-only articles/reels appear in the feed as teasers with CommunityBadge
    const filteredArticles = articles;
    const filteredReels = reels;
    // Only include circle-exclusive events in the feed (non-circle events are in booking section)
    const filteredEvents = circleEvents.filter((e: any) => e.isCircleExclusive && e.circleId);

    // ── 2. Collect all author IDs and batch-fetch users + profiles ───────────
    const allAuthorIds = [
      ...filteredArticles.map((a: any) => a.authorId as string),
      ...filteredReels.map((r: any) => r.authorId as string),
      ...filteredEvents.map((e: any) => e.providerId as string),
    ];

    const [userMap, profileMap] = await Promise.all([
      batchUsers(ctx, allAuthorIds),
      batchProfiles(ctx, allAuthorIds),
    ]);

    // ── 3. Collect all storage IDs and resolve URLs in one parallel batch ────
    // Article cover images + avatar storage IDs
    const articleCoverIds = filteredArticles.map((a: any) => a.coverImage as string | undefined);
    const reelPosterIds   = filteredReels.map((r: any)    => r.poster  as string | undefined);
    const reelVideoIds    = filteredReels.map((r: any)    => r.video   as string | undefined);

    // Avatar IDs per unique author (profiles)
    const profileAvatarIds = allAuthorIds.map(
      (uid) => profileMap.get(uid)?.avatar as string | undefined
    );

    // Resolve all storage URLs in one big parallel batch
    const allStorageIds = [
      ...articleCoverIds,
      ...reelPosterIds,
      ...reelVideoIds,
      ...profileAvatarIds,
    ];
    const resolvedUrls = await Promise.all(
      allStorageIds.map((id) => storageUrl(ctx, id))
    );

    // Slice resolved URLs back into their buckets
    const aLen = filteredArticles.length;
    const rLen = filteredReels.length;
    let offset = 0;
    const articleCoverUrls  = resolvedUrls.slice(offset, offset + aLen); offset += aLen;
    const reelPosterUrls    = resolvedUrls.slice(offset, offset + rLen); offset += rLen;
    const reelVideoUrls     = resolvedUrls.slice(offset, offset + rLen); offset += rLen;
    const profileAvatarUrls = resolvedUrls.slice(offset);

    // Build a per-authorId avatar URL map (deduplicated)
    // We kept allAuthorIds in insertion order; profileAvatarIds aligns with it.
    const avatarUrlByAuthor = new Map<string, string | undefined>();
    allAuthorIds.forEach((uid, i) => {
      if (!avatarUrlByAuthor.has(uid)) {
        avatarUrlByAuthor.set(uid, profileAvatarUrls[i]);
      }
    });

    // ── 4. Batch-resolve course info ─────────────────────────────────────────
    const courseInfoMap = await batchCourseInfo(ctx, [
      ...filteredArticles.map((a: any) => ({ contentType: "article" as const, contentId: a._id as string })),
      ...filteredReels.map((r: any)    => ({ contentType: "reel"    as const, contentId: r._id as string })),
    ]);

    // ── 4b. Batch-resolve circle info for community content ──────────────────
    const circleInfoMap = await batchCircleInfo(ctx, [
      ...filteredArticles.filter((a: any) => a.circleId).map((a: any) => a.circleId as string),
      ...filteredReels.filter((r: any) => r.circleId).map((r: any) => r.circleId as string),
      ...filteredEvents.filter((e: any) => e.circleId).map((e: any) => e.circleId as string),
    ]);

    // ── 5. Assemble output ───────────────────────────────────────────────────
    const articlesOut = filteredArticles.map((article: any, i: number) => {
      const uid     = article.authorId as string;
      const user    = userMap.get(uid);
      const profile = profileMap.get(uid);
      return {
        ...article,
        contentType:    "article" as const,
        coverImageUrl:  articleCoverUrls[i],
        courseInfo:     courseInfoMap.get(article._id as string) ?? undefined,
        circleInfo:    article.circleId ? circleInfoMap.get(article.circleId as string) ?? null : null,
        author: {
          id:       user?._id,
          name:     user?.name ?? profile?.name,
          username: profile?.username,
          avatar:   avatarUrlByAuthor.get(uid) ?? profile?.avatar,
        },
      };
    });

    const reelsOut = filteredReels.map((reel: any, i: number) => {
      const uid     = reel.authorId as string;
      const user    = userMap.get(uid);
      const profile = profileMap.get(uid);
      return {
        ...reel,
        contentType: "reel" as const,
        posterUrl:   reelPosterUrls[i],
        videoUrl:    reelVideoUrls[i],
        courseInfo:  courseInfoMap.get(reel._id as string) ?? undefined,
        circleInfo:  reel.circleId ? circleInfoMap.get(reel.circleId as string) ?? null : null,
        author: {
          id:       user?._id,
          name:     user?.name ?? profile?.name,
          username: profile?.username,
          avatar:   avatarUrlByAuthor.get(uid) ?? profile?.avatar,
        },
      };
    });

    const eventsOut = filteredEvents.map((event: any) => {
      const uid     = event.providerId as string;
      const user    = userMap.get(uid);
      const profile = profileMap.get(uid);
      return {
        ...event,
        contentType: "event" as const,
        circleInfo:  event.circleId ? circleInfoMap.get(event.circleId as string) ?? null : null,
        availableSpots: event.maxParticipants - event.currentParticipants,
        author: {
          id:       user?._id,
          name:     user?.name ?? profile?.name,
          username: profile?.username,
          avatar:   avatarUrlByAuthor.get(uid) ?? profile?.avatar,
        },
      };
    });

    // ── 6. Merge, sort by recency, trim to limit ─────────────────────────────
    return [...articlesOut, ...reelsOut, ...eventsOut]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});
