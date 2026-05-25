import { internalMutation } from "../_generated/server";

// Migration to set existing articles and reels to isPublic: true
export const setExistingContentPublic = internalMutation({
  handler: async (ctx) => {
    console.log("Starting migration: setExistingContentPublic");

    // Update all existing articles to be public
    const articles = await ctx.db.query("articles").collect();
    let updatedArticles = 0;

    for (const article of articles) {
      if (article.isPublic === undefined) {
        await ctx.db.patch(article._id, { isPublic: true });
        updatedArticles++;
      }
    }

    // Update all existing reels to be public
    const reels = await ctx.db.query("reels").collect();
    let updatedReels = 0;

    for (const reel of reels) {
      if (reel.isPublic === undefined) {
        await ctx.db.patch(reel._id, { isPublic: true });
        updatedReels++;
      }
    }

    console.log(`Migration completed: Updated ${updatedArticles} articles and ${updatedReels} reels to be public`);
    
    return {
      success: true,
      updatedArticles,
      updatedReels,
    };
  },
});