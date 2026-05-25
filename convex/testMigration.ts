import { mutation } from "./_generated/server";

export const runMigration = mutation({
  handler: async (ctx) => {
    const articles = await ctx.db
      .query("articles")
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .collect();

    let fixedCount = 0;

    for (const article of articles) {
      // Check if content is plain text (doesn't start with HTML tags)
      if (article.contentHtml && 
          typeof article.contentHtml === 'string' && 
          !article.contentHtml.trim().startsWith('<')) {
        
        console.log(`Fixing article: ${article.title} - Content: ${article.contentHtml.substring(0, 100)}...`);
        
        // Convert plain text to HTML
        const contentHtml = article.contentHtml.trim()
          .split('\n\n')
          .map(paragraph => paragraph.trim())
          .filter(paragraph => paragraph.length > 0)
          .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
          .join('');

        console.log(`New HTML content: ${contentHtml}`);

        await ctx.db.patch(article._id, {
          contentHtml: contentHtml,
          updatedAt: Date.now(),
        });

        fixedCount++;
      }
    }

    return { message: `Fixed ${fixedCount} articles with plain text content` };
  },
});