import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get the current authenticated user merged with their profile data
export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    return {
      ...user,
      username: profile?.username ?? null,
      displayName: profile?.name ?? null,
      phone: profile?.phoneNumber ?? null,
      interests: profile?.interests ?? [],
      walletAddress: profile?.walletAddress ?? null,
      walletPrivateKey: profile?.privateKey ?? null,
      walletMnemonic: profile?.seedPhrase ?? null,
      transactionPin: profile?.pinHash ?? null,
      profilePictureStorageId: profile?.avatar ?? null,
    };
  },
});

// Update display name, interests, or profile picture
export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    profilePictureStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.displayName !== undefined) patch.name = args.displayName;
    if (args.interests !== undefined) patch.interests = args.interests;
    if (args.profilePictureStorageId !== undefined) patch.avatar = args.profilePictureStorageId;

    await ctx.db.patch(profile._id, patch);
  },
});

// Generate a Convex storage upload URL for profile pictures
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

// Get a public URL for a stored profile picture
export const getProfilePictureUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
