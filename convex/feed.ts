import { query } from "./_generated/server";
import { v } from "convex/values";

// Unified feed that combines articles and reels
export const listUnifiedFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    // Fetch articles
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_status", (q) => q.eq("status", "PUBLISHED"))
      .order("desc")
      .take(limit);

    // Fetch reels
    const reels = await ctx.db
      .query("reels")
      .order("desc")
      .take(limit);

    // ── Helper: resolve courseInfo for a given content item ──────────────────
    // The by_content index enforces one-content-per-course, so at most 1 result.
    async function resolveCourseInfo(
      contentType: "article" | "reel",
      contentId: string
    ): Promise<{ courseTitle: string; order: number } | null> {
      const membership = await ctx.db
        .query("courseContent")
        .withIndex("by_content", (q) =>
          q.eq("contentType", contentType).eq("contentId", contentId as any)
        )
        .first();

      if (!membership) return null;

      const course = await ctx.db.get(membership.courseId);
      if (!course) return null;

      return {
        courseTitle: course.title,
        order: membership.order,
      };
    }

    // Get author info for articles (and resolve cover image URL)
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        // Resolve cover image storage ID → public URL
        const coverImageUrl = article.coverImage
          ? await ctx.storage.getUrl(article.coverImage)
          : null;

        // Resolve author avatar storage ID → public URL
        const avatarUrl = profile?.avatar
          ? await ctx.storage.getUrl(profile.avatar)
          : null;

        // Resolve course membership
        const courseInfo = await resolveCourseInfo("article", article._id);

        return {
          ...article,
          contentType: "article" as const,
          coverImageUrl: coverImageUrl ?? undefined,
          courseInfo: courseInfo ?? undefined,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: avatarUrl ?? profile?.avatar,
          },
        };
      })
    );

    // Get author info for reels (and resolve poster URL)
    const reelsWithAuthors = await Promise.all(
      reels.map(async (reel) => {
        const author = await ctx.db.get(reel.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), reel.authorId))
          .first();

        // Resolve poster storage ID → public URL
        const posterUrl = reel.poster
          ? await ctx.storage.getUrl(reel.poster)
          : null;

        // Resolve video storage ID → public URL
        const videoUrl = reel.video
          ? await ctx.storage.getUrl(reel.video)
          : null;

        // Resolve author avatar storage ID → public URL
        const avatarUrl = profile?.avatar
          ? await ctx.storage.getUrl(profile.avatar)
          : null;

        // Resolve course membership
        const courseInfo = await resolveCourseInfo("reel", reel._id);

        return {
          ...reel,
          contentType: "reel" as const,
          posterUrl: posterUrl ?? undefined,
          videoUrl: videoUrl ?? undefined,
          courseInfo: courseInfo ?? undefined,
          author: {
            id: author?._id,
            name: author?.name || profile?.name,
            username: profile?.username,
            avatar: avatarUrl ?? profile?.avatar,
          },
        };
      })
    );

    // Combine and sort by creation date
    const unifiedContent = [...articlesWithAuthors, ...reelsWithAuthors];
    
    // Sort by creation date (most recent first) and limit results
    return unifiedContent
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});