import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Migration to remove sellerAddress from articles and reels, and wallet fields from profiles
export const removeSellerAddressFields = mutation({
  handler: async (ctx): Promise<{
    success: boolean;
    articlesUpdated?: number;
    articlesTotal?: number;
    reelsUpdated?: number;
    reelsTotal?: number;
    profilesUpdated?: number;
    profilesTotal?: number;
    totalUpdated?: number;
    error?: string;
    message: string;
  }> => {
    console.log("🚀 Starting migration to remove deprecated fields...");

    try {
      // Remove sellerAddress from articles
      console.log("📄 Processing articles...");
      const articleResult: { updated: number; total: number } = await ctx.runMutation(internal.migrations.removeSellerAddress.removeSellerAddressFromArticles);
      console.log(`✅ Articles: ${articleResult.updated}/${articleResult.total} updated`);

      // Remove sellerAddress from reels
      console.log("🎬 Processing reels...");
      const reelResult: { updated: number; total: number } = await ctx.runMutation(internal.migrations.removeSellerAddress.removeSellerAddressFromReels);
      console.log(`✅ Reels: ${reelResult.updated}/${reelResult.total} updated`);

      // Remove wallet fields from profiles
      console.log("👤 Processing profiles...");
      const profileResult: { updated: number; total: number } = await ctx.runMutation(internal.migrations.removeSellerAddress.removeWalletFieldsFromProfiles);
      console.log(`✅ Profiles: ${profileResult.updated}/${profileResult.total} updated`);

      console.log("🎉 Migration completed successfully!");
      
      return {
        success: true,
        articlesUpdated: articleResult.updated,
        articlesTotal: articleResult.total,
        reelsUpdated: reelResult.updated,
        reelsTotal: reelResult.total,
        profilesUpdated: profileResult.updated,
        profilesTotal: profileResult.total,
        totalUpdated: articleResult.updated + reelResult.updated + profileResult.updated,
        message: "Migration completed successfully"
      };
    } catch (error) {
      console.error("❌ Migration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Migration failed"
      };
    }
  },
});