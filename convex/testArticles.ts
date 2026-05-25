import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a test article for debugging purposes
export const createTestArticle = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const testContent = `<p>This is a test article created to verify that the article viewing functionality works correctly.</p><p>This paragraph contains some <strong>bold text</strong> and <em>italic text</em> to test HTML rendering.</p><p>Here's a paragraph with line breaks:<br>Line 1<br>Line 2<br>Line 3</p><p>This is the final paragraph of the test article. If you can see this content properly formatted, then the article viewing system is working correctly.</p>`;

    const slug = `test-article-${Date.now()}`;

    const articleId = await ctx.db.insert("articles", {
      authorId: userId,
      title: "Test Article - Article Viewing Fix",
      subtitle: "A test article to verify the article viewing functionality",
      slug,
      contentHtml: testContent,
      readTimeMin: 2,
      tags: ["test", "debugging", "article-viewing"],
      status: "PUBLISHED",
      publishedAt: Date.now(),
      isSensitive: false,
      isPublic: true, // Add the missing field
      isGated: false,
      views: 0,
      createdAt: Date.now(),
    });

    console.log("Test article created:", {
      id: articleId,
      slug,
      contentLength: testContent.length,
      hasValidHTML: testContent.includes('<p>')
    });

    return { articleId, slug };
  },
});

// Get all articles for debugging
export const debugAllArticles = query({
  args: {},
  handler: async (ctx) => {
    const articles = await ctx.db
      .query("articles")
      .order("desc")
      .take(10);

    // Get author info for each article
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article) => {
        const author = await ctx.db.get(article.authorId);
        const profile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), article.authorId))
          .first();

        return {
          id: article._id,
          title: article.title,
          slug: article.slug,
          status: article.status,
          hasContentHtml: !!article.contentHtml,
          contentLength: article.contentHtml?.length || 0,
          contentPreview: article.contentHtml ? article.contentHtml.substring(0, 100) + '...' : 'None',
          fullContent: article.contentHtml || '',
          createdAt: article.createdAt,
          authorUsername: profile?.username || author?.name || 'unknown',
          authorName: author?.name || profile?.name || 'Unknown Author',
        };
      })
    );

    return articlesWithAuthors;
  }
});
