import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if username is available (also checks signupPending for in-flight registrations)
export const checkUsernameAvailability = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const normalized = args.username.toLowerCase().trim();
    if (!normalized) return { available: false };

    // Check profiles table
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", normalized))
      .first();

    if (existingProfile) return { available: false };

    // Also check signupPending so in-flight registrations block the username
    const pendingWithUsername = await ctx.db
      .query("signupPending")
      .collect()
      .then((rows) => rows.find((r) => r.username.toLowerCase() === normalized));

    return { available: !pendingWithUsername };
  },
});

// Create or update user profile with multi-currency support
export const createOrUpdateProfile = mutation({
  args: {
    username: v.string(),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar: v.optional(v.string()),
    phoneNumber: v.optional(v.string()), // Now optional for backward compatibility
    phoneCountryCode: v.optional(v.string()),
    detectedCountry: v.optional(v.string()),
    pinHash: v.optional(v.string()),
    primaryCurrency: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.error('createOrUpdateProfile: No authenticated user');
      throw new Error("Not authenticated");
    }

    console.log('createOrUpdateProfile called:', { userId, args: { ...args, pinHash: args.pinHash ? '[REDACTED]' : undefined } });

    try {
      // Check if username is already taken by another user
      const existingProfile = await ctx.db
        .query("profiles")
        .withIndex("by_username", (q) => q.eq("username", args.username.toLowerCase()))
        .first();

      console.log('Existing profile check:', { existingProfile, userId });

      if (existingProfile && existingProfile.userId !== userId) {
        console.error('Username already taken:', args.username);
        throw new Error("Username already taken");
      }

      // Check if profile exists for this user
      const userProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();

      console.log('User profile check:', { userProfile });

      if (userProfile) {
        // Update existing profile
        console.log('Updating existing profile:', userProfile._id);
        
        // Build update object with only provided fields
        const updateData: any = {
          username: args.username.toLowerCase(),
          updatedAt: Date.now(),
        };
        
        // Only update fields that are explicitly provided
        if (args.name !== undefined) updateData.name = args.name;
        if (args.bio !== undefined) updateData.bio = args.bio;
        if (args.avatar !== undefined) updateData.avatar = args.avatar;
        if (args.phoneNumber !== undefined) updateData.phoneNumber = args.phoneNumber;
        if (args.phoneCountryCode !== undefined) updateData.phoneCountryCode = args.phoneCountryCode;
        if (args.detectedCountry !== undefined) updateData.detectedCountry = args.detectedCountry;
        if (args.pinHash !== undefined) updateData.pinHash = args.pinHash;
        if (args.primaryCurrency !== undefined) updateData.primaryCurrency = args.primaryCurrency;
        if (args.interests !== undefined) updateData.interests = args.interests;
        
        await ctx.db.patch(userProfile._id, updateData);
        console.log('Profile updated successfully');

        // Create or update wallet with multi-currency support
        await createOrUpdateMultiCurrencyWallet(ctx, userId, args.primaryCurrency || 'USD', !!args.phoneCountryCode);

        return userProfile._id;
      } else {
        // Create new profile
        console.log('Creating new profile for user:', userId);
        const profileData: any = {
          userId,
          username: args.username.toLowerCase(),
          createdAt: Date.now(),
        };
        
        // Only include fields that are provided
        if (args.name !== undefined) profileData.name = args.name;
        if (args.bio !== undefined) profileData.bio = args.bio;
        if (args.avatar !== undefined) profileData.avatar = args.avatar;
        if (args.phoneNumber !== undefined) profileData.phoneNumber = args.phoneNumber;
        if (args.phoneCountryCode !== undefined) profileData.phoneCountryCode = args.phoneCountryCode;
        if (args.detectedCountry !== undefined) profileData.detectedCountry = args.detectedCountry;
        if (args.pinHash !== undefined) profileData.pinHash = args.pinHash;
        if (args.interests !== undefined) profileData.interests = args.interests;
        
        console.log('Profile data to insert:', { ...profileData, pinHash: profileData.pinHash ? '[REDACTED]' : undefined });

        const profileId = await ctx.db.insert("profiles", profileData);
        console.log('Profile created successfully:', profileId);
        
        // Create multi-currency wallet
        await createOrUpdateMultiCurrencyWallet(ctx, userId, args.primaryCurrency || 'USD', !!args.phoneCountryCode);

        return profileId;
      }
    } catch (error) {
      console.error('Error in createOrUpdateProfile:', error);
      throw error;
    }
  },
});

// Helper function to create or update multi-currency wallet
async function createOrUpdateMultiCurrencyWallet(
  ctx: any, 
  userId: string, 
  primaryCurrency: string, 
  phoneCountryDetected: boolean
) {
  console.log('Creating/updating multi-currency wallet for user:', userId);

  // Check if wallet already exists
  const existingWallet = await ctx.db
    .query("wallets")
    .withIndex("userId", (q: any) => q.eq("userId", userId))
    .first();

  const balances = {
    USD: 0,
    NGN: 0,
    GBP: 0,
    EUR: 0,
    CAD: 0,
    GHS: 0,
    KES: 0,
    GMD: 0,
    ZAR: 0
  };

  if (existingWallet) {
    // Update existing wallet to multi-currency structure if needed
    console.log('Updating existing wallet:', existingWallet._id);
    
    // Preserve existing balances if they exist in old format
    if ((existingWallet as any).balanceUSD !== undefined) {
      balances.USD = (existingWallet as any).balanceUSD || 0;
    }
    if ((existingWallet as any).balanceNGN !== undefined) {
      balances.NGN = (existingWallet as any).balanceNGN || 0;
    }
    
    // If wallet already has new structure, preserve those balances
    if ((existingWallet as any).balances) {
      Object.assign(balances, (existingWallet as any).balances);
    }

    await ctx.db.patch(existingWallet._id, {
      primaryCurrency,
      phoneCountryDetected,
      balances,
      updatedAt: Date.now()
    });
    
    console.log('Wallet updated successfully');
  } else {
    // Create new multi-currency wallet
    console.log('Creating new multi-currency wallet');
    
    const walletId = await ctx.db.insert("wallets", {
      userId,
      primaryCurrency,
      phoneCountryDetected,
      balances,
      createdAt: Date.now()
    });
    
    console.log('Multi-currency wallet created successfully:', walletId);
  }
}

// Get user profile by username
export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!profile) return null;

    const user = await ctx.db.get(profile.userId);

    // Get article count
    const articleCount = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", profile.userId))
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .collect()
      .then(articles => articles.length);

    // Get reel count
    const reelCount = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", profile.userId))
      .collect()
      .then(reels => reels.length);

    // Get follow counts
    const followersCount = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", profile.userId))
      .collect()
      .then(follows => follows.length);

    const followingCount = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", profile.userId))
      .collect()
      .then(follows => follows.length);

    return {
      ...profile,
      user,
      stats: {
        articles: articleCount,
        reels: reelCount,
        followers: followersCount,
        following: followingCount,
      },
    };
  },
});

// Get profile by user ID
export const getProfileByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) return null;

    const user = await ctx.db.get(args.userId);

    return {
      ...profile,
      user,
    };
  },
});

// Get current user's profile
export const getMyProfile = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const user = await ctx.db.get(userId);

    if (!profile) {
      return {
        userId,
        user,
        username: null,
        name: user?.name,
        bio: null,
        avatar: null,
        phoneNumber: null,
        interests: null,
        pinHash: null,
        primaryCurrency: null,
        stats: {
          articles: 0,
          reels: 0,
          followers: 0,
          following: 0,
        },
      };
    }

    // Get stats
    const articleCount = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .collect()
      .then(articles => articles.length);

    const reelCount = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect()
      .then(reels => reels.length);

    const followers = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect();
    const followersCount = followers.length;

    const following = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .collect();
    const followingCount = following.length;

    console.log('Profile stats for user:', userId, {
      articleCount,
      reelCount,
      followersCount,
      followingCount,
      followersData: followers,
      followingData: following
    });

    // Get wallet for primaryCurrency
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    return {
      ...profile,
      user,
      primaryCurrency: wallet?.primaryCurrency ?? null,
      stats: {
        articles: articleCount,
        reels: reelCount,
        followers: followersCount,
        following: followingCount,
      },
    };
  },
});

// Search profiles by username
export const searchProfiles = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    // Get all profiles and filter client-side for partial matching
    const allProfiles = await ctx.db.query("profiles").collect();
    const queryLower = args.query.toLowerCase();

    // Filter profiles that match username or name
    const matchingProfiles = allProfiles
      .filter(profile =>
        profile.username?.toLowerCase().includes(queryLower) ||
        profile.name?.toLowerCase().includes(queryLower)
      )
      .slice(0, 20);

    const profilesWithUsers = await Promise.all(
      matchingProfiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const avatarUrl = profile.avatar
          ? await ctx.storage.getUrl(profile.avatar)
          : null;
        return {
          ...profile,
          user,
          avatarUrl,
        };
      })
    );

    return profilesWithUsers.filter(p => p.user);
  },
});

// Debug function to check profile creation
export const debugProfile = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    console.log('Debug profile for user:', userId);

    // Check if user exists
    const user = await ctx.db.get(userId);
    console.log('User data:', user);

    // Check if profile exists
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    console.log('Profile data:', profile);

    // Try to create a basic profile
    if (!profile) {
      console.log('Creating basic profile...');
      try {
        const userName = user?.name || 'User';
        let username = userName.toLowerCase().replace(/[^a-z0-9]/g, '');

        // If the cleaned username is empty, use a fallback
        if (!username) {
          username = 'user';
        }

        // Ensure username is unique
        let counter = 1;
        let finalUsername = username;
        while (true) {
          const existingUsernameProfile = await ctx.db
            .query("profiles")
            .withIndex("by_username", (q) => q.eq("username", finalUsername))
            .first();

          if (!existingUsernameProfile) break;

          finalUsername = `${username}${counter}`;
          counter++;
        }

        const profileId = await ctx.db.insert("profiles", {
          userId,
          username: finalUsername,
          name: userName,
          createdAt: Date.now(),
        });
        console.log('Basic profile created:', profileId);
        return { success: true, profileId, message: 'Profile created', username: finalUsername };
      } catch (error) {
        console.error('Error creating basic profile:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    } else {
      return { success: true, profile, message: 'Profile already exists' };
    }
  },
});

// Get user's articles
export const getMyArticles = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .filter((q) => q.eq(q.field("status"), "PUBLISHED"))
      .order("desc")
      .collect();

    return articles;
  },
});

// Get user's followers
export const getMyFollowers = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_following", (q) => q.eq("followingId", userId))
      .collect();

    const followers = await Promise.all(
      follows.map(async (follow) => {
        const user = await ctx.db.get(follow.followerId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", follow.followerId))
          .first();

        return {
          _id: follow._id,
          userId: follow.followerId,
          user,
          profile,
          createdAt: follow.createdAt,
        };
      })
    );

    return followers.filter(f => f.user);
  },
});

// Get users I'm following
export const getMyFollowing = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower", (q) => q.eq("followerId", userId))
      .collect();

    const following = await Promise.all(
      follows.map(async (follow) => {
        const user = await ctx.db.get(follow.followingId);
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", follow.followingId))
          .first();

        return {
          _id: follow._id,
          userId: follow.followingId,
          user,
          profile,
          createdAt: follow.createdAt,
        };
      })
    );

    return following.filter(f => f.user);
  },
});

// Update user interests
export const updateInterests = mutation({
  args: {
    interests: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Update interests
    await ctx.db.patch(profile._id, {
      interests: args.interests,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Interests updated successfully" };
  }
});

// Delete profile picture
export const deleteProfilePicture = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    if (!profile.avatar) {
      throw new Error("No profile picture to delete");
    }

    // Remove the avatar from the profile
    await ctx.db.patch(profile._id, {
      avatar: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Profile picture deleted successfully" };
  }
});

// Delete entire profile (and all associated data)
export const deleteProfile = mutation({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get user's profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      throw new Error("Profile not found");
    }

    // Get all user's content and related data
    const articles = await ctx.db
      .query("articles")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .collect();

    const comments = await ctx.db
      .query("comments")
      .filter((q) => q.eq(q.field("authorId"), userId))
      .collect();

    const likes = await ctx.db
      .query("likes")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const bookmarks = await ctx.db
      .query("bookmarks")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    const follows = await ctx.db
      .query("follows")
      .filter((q) => q.or(
        q.eq(q.field("followerId"), userId),
        q.eq(q.field("followingId"), userId)
      ))
      .collect();

    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    // This is a destructive operation - we should warn the user
    // For now, we'll just return what would be deleted
    return {
      warning: "This would permanently delete your entire profile and all associated data",
      wouldDelete: {
        articles: articles.length,
        reels: reels.length,
        comments: comments.length,
        likes: likes.length,
        bookmarks: bookmarks.length,
        follows: follows.length,
        notifications: notifications.length
      },
      message: "Profile deletion not implemented for safety. Contact support if you need to delete your account."
    };
  }
});

// Migration function to create profiles for existing users
export const createProfilesForExistingUsers = mutation({
  handler: async (ctx) => {
    console.log('Starting migration to create profiles for existing users...');

    // Get all users
    const users = await ctx.db.query("users").collect();
    console.log(`Found ${users.length} users`);

    let created = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if profile already exists
      const existingProfile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .first();

      if (existingProfile) {
        skipped++;
        continue;
      }

      // Create username from name
      const userName = user.name || 'User';
      let username = userName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // If the cleaned username is empty, use a fallback
      if (!username) {
        username = 'user';
      }

      // Ensure username is unique
      let counter = 1;
      let finalUsername = username;
      while (true) {
        const existingUsernameProfile = await ctx.db
          .query("profiles")
          .withIndex("by_username", (q) => q.eq("username", finalUsername))
          .first();

        if (!existingUsernameProfile) break;

        finalUsername = `${username}${counter}`;
        counter++;
      }

      try {
        await ctx.db.insert("profiles", {
          userId: user._id,
          username: finalUsername,
          name: userName,
          createdAt: Date.now(),
        });
        created++;
        console.log(`Created profile for user ${user._id}: ${finalUsername}`);
      } catch (error) {
        console.error(`Error creating profile for user ${user._id}:`, error);
      }
    }

    console.log(`Migration complete: ${created} profiles created, ${skipped} skipped`);
    return { created, skipped, total: users.length };
  },
});

// Update profile fields (name, bio, interests, avatar storage ID)
export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    interests: v.optional(v.array(v.string())),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const updateData: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updateData.name = args.name;
    if (args.bio !== undefined) updateData.bio = args.bio;
    if (args.interests !== undefined) updateData.interests = args.interests;
    if (args.avatar !== undefined) updateData.avatar = args.avatar;

    await ctx.db.patch(profile._id, updateData as any);
    return { success: true };
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

// Get the URL for a stored profile picture
export const getProfilePictureUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get user's reels
export const getMyReels = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const reels = await ctx.db
      .query("reels")
      .withIndex("by_author", (q) => q.eq("authorId", userId))
      .order("desc")
      .collect();

    const reelsWithUrls = await Promise.all(
      reels.map(async (reel) => {
        const posterUrl = reel.poster
          ? await ctx.storage.getUrl(reel.poster)
          : null;
        return { ...reel, posterUrl };
      })
    );

    return reelsWithUrls;
  },
});
