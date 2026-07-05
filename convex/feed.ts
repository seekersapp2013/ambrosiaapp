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

// ─── Query ────────────────────────────────────────────────────────────────────

export const listUnifiedFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    // Fetch half-limit each so merged total = limit
    const half = Math.ceil(limit / 2);

    // ── 1. Fetch raw rows ────────────────────────────────────────────────────
    const [articles, reels] = await Promise.all([
      ctx.db
        .query("articles")
        .withIndex("by_status", (q: any) => q.eq("status", "PUBLISHED"))
        .order("desc")
        .take(half),
      ctx.db.query("reels").order("desc").take(half),
    ]);

    // ── 2. Collect all author IDs and batch-fetch users + profiles ───────────
    const allAuthorIds = [
      ...articles.map((a: any) => a.authorId as string),
      ...reels.map((r: any) => r.authorId as string),
    ];

    const [userMap, profileMap] = await Promise.all([
      batchUsers(ctx, allAuthorIds),
      batchProfiles(ctx, allAuthorIds),
    ]);

    // ── 3. Collect all storage IDs and resolve URLs in one parallel batch ────
    // Article cover images + avatar storage IDs
    const articleCoverIds = articles.map((a: any) => a.coverImage as string | undefined);
    const reelPosterIds   = reels.map((r: any)    => r.poster  as string | undefined);
    const reelVideoIds    = reels.map((r: any)    => r.video   as string | undefined);

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
    const aLen = articles.length;
    const rLen = reels.length;
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
      ...articles.map((a: any) => ({ contentType: "article" as const, contentId: a._id as string })),
      ...reels.map((r: any)    => ({ contentType: "reel"    as const, contentId: r._id as string })),
    ]);

    // ── 5. Assemble output ───────────────────────────────────────────────────
    const articlesOut = articles.map((article: any, i: number) => {
      const uid     = article.authorId as string;
      const user    = userMap.get(uid);
      const profile = profileMap.get(uid);
      return {
        ...article,
        contentType:    "article" as const,
        coverImageUrl:  articleCoverUrls[i],
        courseInfo:     courseInfoMap.get(article._id as string) ?? undefined,
        author: {
          id:       user?._id,
          name:     user?.name ?? profile?.name,
          username: profile?.username,
          avatar:   avatarUrlByAuthor.get(uid) ?? profile?.avatar,
        },
      };
    });

    const reelsOut = reels.map((reel: any, i: number) => {
      const uid     = reel.authorId as string;
      const user    = userMap.get(uid);
      const profile = profileMap.get(uid);
      return {
        ...reel,
        contentType: "reel" as const,
        posterUrl:   reelPosterUrls[i],
        videoUrl:    reelVideoUrls[i],
        courseInfo:  courseInfoMap.get(reel._id as string) ?? undefined,
        author: {
          id:       user?._id,
          name:     user?.name ?? profile?.name,
          username: profile?.username,
          avatar:   avatarUrlByAuthor.get(uid) ?? profile?.avatar,
        },
      };
    });

    // ── 6. Merge, sort by recency, trim to limit ─────────────────────────────
    return [...articlesOut, ...reelsOut]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});
