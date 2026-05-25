import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Called from the wizard BEFORE signIn — stores extra profile data
// keyed by email so afterUserCreatedOrUpdated can pick it up.
// No auth required since the user doesn't exist yet.
export const storeSignupData = mutation({
  args: {
    email: v.string(),
    username: v.string(),
    phoneNumber: v.string(),
    phoneCountryCode: v.string(),
    detectedCountry: v.string(),
    primaryCurrency: v.string(),
    interests: v.array(v.string()),
    transactionPin: v.string(),
  },
  handler: async (ctx, args) => {
    // Remove any stale entry for this email first
    const existing = await ctx.db
      .query("signupPending")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();
    if (existing) await ctx.db.delete(existing._id);

    await ctx.db.insert("signupPending", {
      ...args,
      email: args.email.toLowerCase(),
      createdAt: Date.now(),
    });
  },
});

// Fallback: called after signIn to patch any fields that auth.ts didn't store
// (handles existing users and any edge cases)
export const completeSignup = mutation({
  args: {
    username: v.string(),
    phone: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    walletAddress: v.optional(v.string()),
    walletPrivateKey: v.optional(v.string()),
    walletMnemonic: v.optional(v.string()),
    transactionPin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Retry up to 5 times with 500ms delay to handle the race condition
    // where afterUserCreatedOrUpdated hasn't finished yet
    let profile = null;
    for (let i = 0; i < 5; i++) {
      profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
      if (profile) break;
      // Wait 500ms before retrying (Convex mutations can use Date.now() for timing)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (!profile) {
      // Profile still not found — create it directly as a last resort
      const patch: Record<string, unknown> = {
        userId,
        username: args.username.toLowerCase(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      if (args.phone !== undefined) patch.phoneNumber = args.phone;
      if (args.interests !== undefined) patch.interests = args.interests;
      if (args.walletAddress !== undefined) patch.walletAddress = args.walletAddress;
      if (args.walletPrivateKey !== undefined) patch.privateKey = args.walletPrivateKey;
      if (args.walletMnemonic !== undefined) patch.seedPhrase = args.walletMnemonic;
      if (args.transactionPin !== undefined) patch.pinHash = args.transactionPin;
      await ctx.db.insert("profiles", patch as any);
      return;
    }

    // Check username uniqueness
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
      .first();

    if (existing && existing.userId !== userId) {
      throw new Error("Username already taken");
    }

    const patch: Record<string, unknown> = {
      username: args.username.toLowerCase(),
      updatedAt: Date.now(),
    };

    if (args.phone !== undefined) patch.phoneNumber = args.phone;
    if (args.interests !== undefined) patch.interests = args.interests;
    if (args.walletAddress !== undefined) patch.walletAddress = args.walletAddress;
    if (args.walletPrivateKey !== undefined) patch.privateKey = args.walletPrivateKey;
    if (args.walletMnemonic !== undefined) patch.seedPhrase = args.walletMnemonic;
    if (args.transactionPin !== undefined) patch.pinHash = args.transactionPin;

    await ctx.db.patch(profile._id, patch);
  },
});
