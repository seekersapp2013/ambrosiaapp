import { internalMutation } from "../_generated/server";

// Migration to remove sellerAddress field from articles and reels
export const removeSellerAddressFromArticles = internalMutation({
  handler: async (ctx): Promise<{ updated: number; total: number }> => {
    console.log('Starting migration to remove sellerAddress from articles...');

    // Get all articles
    const articles = await ctx.db.query("articles").collect();
    console.log(`Found ${articles.length} articles to check`);

    let updated = 0;

    for (const article of articles) {
      // Check if article has sellerAddress field
      if ('sellerAddress' in article) {
        try {
          // Remove the sellerAddress field by patching with undefined
          await ctx.db.patch(article._id, {
            sellerAddress: undefined,
          } as any);
          updated++;
          console.log(`Removed sellerAddress from article ${article._id}`);
        } catch (error) {
          console.error(`Error updating article ${article._id}:`, error);
        }
      }
    }

    console.log(`Migration complete: ${updated} articles updated`);
    return { updated, total: articles.length };
  },
});

export const removeSellerAddressFromReels = internalMutation({
  handler: async (ctx): Promise<{ updated: number; total: number }> => {
    console.log('Starting migration to remove sellerAddress from reels...');

    // Get all reels
    const reels = await ctx.db.query("reels").collect();
    console.log(`Found ${reels.length} reels to check`);

    let updated = 0;

    for (const reel of reels) {
      // Check if reel has sellerAddress field
      if ('sellerAddress' in reel) {
        try {
          // Remove the sellerAddress field by patching with undefined
          await ctx.db.patch(reel._id, {
            sellerAddress: undefined,
          } as any);
          updated++;
          console.log(`Removed sellerAddress from reel ${reel._id}`);
        } catch (error) {
          console.error(`Error updating reel ${reel._id}:`, error);
        }
      }
    }

    console.log(`Migration complete: ${updated} reels updated`);
    return { updated, total: reels.length };
  },
});

export const removeWalletFieldsFromProfiles = internalMutation({
  handler: async (ctx): Promise<{ updated: number; total: number }> => {
    console.log('Starting migration to remove wallet fields from profiles...');

    // Get all profiles
    const profiles = await ctx.db.query("profiles").collect();
    console.log(`Found ${profiles.length} profiles to check`);

    let updated = 0;

    for (const profile of profiles) {
      // Check if profile has any wallet fields
      const hasWalletFields = 'walletAddress' in profile || 'privateKey' in profile || 'seedPhrase' in profile || 'walletSeedEnc' in profile;
      
      if (hasWalletFields) {
        try {
          // Remove all wallet fields by patching with undefined
          await ctx.db.patch(profile._id, {
            walletAddress: undefined,
            privateKey: undefined,
            seedPhrase: undefined,
            walletSeedEnc: undefined,
          } as any);
          updated++;
          console.log(`Removed wallet fields from profile ${profile._id}`);
        } catch (error) {
          console.error(`Error updating profile ${profile._id}:`, error);
        }
      }
    }

    console.log(`Migration complete: ${updated} profiles updated`);
    return { updated, total: profiles.length };
  },
});