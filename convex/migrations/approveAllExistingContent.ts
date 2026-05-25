import { mutation } from "../_generated/server";

// Migration to approve all existing content
// This ensures backward compatibility - all content created before moderation system
// will be automatically approved so it continues to show in feeds
//
// Run with: npx convex run migrations/approveAllExistingContent:run

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 Starting migration: approveAllExistingContent");
    
    let articlesUpdated = 0;
    let reelsUpdated = 0;
    let circlesUpdated = 0;
    let expertRequestsUpdated = 0;
    let bookingSubscribersUpdated = 0;

    // Update all articles
    console.log("📄 Processing articles...");
    const articles = await ctx.db.query("articles").collect();
    for (const article of articles) {
      // Only update if approvalStatus is undefined or PENDING
      if (!article.approvalStatus || article.approvalStatus === "PENDING") {
        await ctx.db.patch(article._id, {
          approvalStatus: "APPROVED",
          status: "PUBLISHED", // Ensure published
          publishedAt: article.publishedAt || article.createdAt,
          updatedAt: Date.now(),
        });
        articlesUpdated++;
      }
    }
    console.log(`   ✅ Updated ${articlesUpdated} articles`);

    // Update all reels
    console.log("🎥 Processing reels...");
    const reels = await ctx.db.query("reels").collect();
    for (const reel of reels) {
      if (!reel.approvalStatus || reel.approvalStatus === "PENDING") {
        await ctx.db.patch(reel._id, {
          approvalStatus: "APPROVED",
        });
        reelsUpdated++;
      }
    }
    console.log(`   ✅ Updated ${reelsUpdated} reels`);

    // Update all circles
    console.log("⭕ Processing circles...");
    const circles = await ctx.db.query("circles").collect();
    for (const circle of circles) {
      if (!circle.approvalStatus || circle.approvalStatus === "PENDING") {
        await ctx.db.patch(circle._id, {
          approvalStatus: "APPROVED",
          updatedAt: Date.now(),
        });
        circlesUpdated++;
      }
    }
    console.log(`   ✅ Updated ${circlesUpdated} circles`);

    // Update all expert requests
    console.log("👨‍⚕️ Processing expert requests...");
    const expertRequests = await ctx.db.query("expertRequests").collect();
    for (const request of expertRequests) {
      if (!request.approvalStatus || request.approvalStatus === "PENDING") {
        await ctx.db.patch(request._id, {
          approvalStatus: "APPROVED",
          updatedAt: Date.now(),
        });
        expertRequestsUpdated++;
      }
    }
    console.log(`   ✅ Updated ${expertRequestsUpdated} expert requests`);

    // Update all booking subscribers
    console.log("📅 Processing booking subscribers...");
    const bookingSubscribers = await ctx.db.query("bookingSubscribers").collect();
    for (const subscriber of bookingSubscribers) {
      if (!subscriber.approvalStatus || subscriber.approvalStatus === "PENDING") {
        await ctx.db.patch(subscriber._id, {
          approvalStatus: "APPROVED",
          isActive: true,
          updatedAt: Date.now(),
        });
        bookingSubscribersUpdated++;
      }
    }
    console.log(`   ✅ Updated ${bookingSubscribersUpdated} booking subscribers`);

    const summary = {
      articlesUpdated,
      reelsUpdated,
      circlesUpdated,
      expertRequestsUpdated,
      bookingSubscribersUpdated,
      totalUpdated: articlesUpdated + reelsUpdated + circlesUpdated + expertRequestsUpdated + bookingSubscribersUpdated,
    };

    console.log("\n✨ Migration complete!");
    console.log("📊 Summary:", summary);
    
    if (summary.totalUpdated === 0) {
      console.log("✅ All content was already approved. No changes needed.");
    } else {
      console.log(`✅ Successfully approved ${summary.totalUpdated} items!`);
    }
    
    return summary;
  },
});
