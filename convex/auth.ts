import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const password = Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      name: params.name as string,
    };
  },
});

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      // Only create profile for new users
      if (!existingUserId) {
        console.log('Creating profile for new user:', userId);
        
        const user = await ctx.db.get(userId);
        if (!user) {
          console.error('User not found after creation:', userId);
          return;
        }

        // Check if profile already exists
        const existingProfile = await ctx.db
          .query("profiles")
          .filter((q) => q.eq(q.field("userId"), userId))
          .first();

        if (existingProfile) {
          console.log('Profile already exists for user:', userId);
          return;
        }

        // Use username from signup params, or derive from name/email
        const rawUsername = (user as any).username as string | undefined;
        const userName = user.name || (user.email as string | undefined)?.split("@")[0] || "user";
        let baseUsername = rawUsername
          ? rawUsername.toLowerCase().replace(/[^a-z0-9_]/g, "")
          : userName.toLowerCase().replace(/[^a-z0-9]/g, "");

        if (!baseUsername) baseUsername = "user";

        // Ensure username is unique
        let counter = 1;
        let finalUsername = baseUsername;
        while (true) {
          const taken = await ctx.db
            .query("profiles")
            .filter((q) => q.eq(q.field("username"), finalUsername))
            .first();
          if (!taken) break;
          finalUsername = `${baseUsername}${counter}`;
          counter++;
        }

        try {
          const profileData: Record<string, unknown> = {
            userId,
            username: finalUsername,
            name: userName,
            createdAt: Date.now(),
          };

          // Look up wizard data stored in signupPending before signIn was called
          const email = (user.email as string | undefined)?.toLowerCase();
          const pending = email
            ? await ctx.db
                .query("signupPending")
                .filter((q) => q.eq(q.field("email"), email))
                .first()
            : null;

          if (pending) {
            // Use the username from the wizard if provided
            const wizardUsername = pending.username.toLowerCase().replace(/[^a-z0-9_]/g, "");
            if (wizardUsername) {
              // Re-check uniqueness for wizard username
              const taken = await ctx.db
                .query("profiles")
                .filter((q) => q.eq(q.field("username"), wizardUsername))
                .first();
              if (!taken) profileData.username = wizardUsername;
            }
            profileData.phoneNumber = pending.phoneNumber;
            profileData.phoneCountryCode = pending.phoneCountryCode;
            profileData.detectedCountry = pending.detectedCountry;
            profileData.interests = pending.interests;
            profileData.pinHash = pending.transactionPin;
            // Clean up
            await ctx.db.delete(pending._id);
          }

          // Write all wizard fields if present on user record (legacy path)
          const u = user as any;
          if (!pending && u.phone) profileData.phoneNumber = u.phone;

          const profileId = await ctx.db.insert("profiles", profileData as any);

          // Create multi-currency wallet, using detected primary currency if provided
          const primaryCurrency = pending?.primaryCurrency || "USD";
          const walletId = await ctx.db.insert("wallets", {
            userId,
            primaryCurrency,
            phoneCountryDetected: !!(pending?.phoneCountryCode),
            balances: {
              USD: 0, NGN: 0, GBP: 0, EUR: 0,
              CAD: 0, GHS: 0, KES: 0, GMD: 0, ZAR: 0,
            },
            createdAt: Date.now(),
          });

          console.log('Profile and wallet created for new user:', {
            userId, profileId, walletId, username: finalUsername,
          });

          // Auto-initialize AI recommendations
          await ctx.scheduler.runAfter(5000, internal.autoInitializeAI.runAutoInitialization, {
            userId,
          });

          // Initialize moderation system for the very first user
          const allUsers = await ctx.db.query("users").collect();
          if (allUsers.length === 1) {
            console.log('First user — initializing moderation system...');
            const { ensurePrimaryAdminExists } = await import("./moderationHelpers");
            await ensurePrimaryAdminExists(ctx);
          }
        } catch (error) {
          console.error('Error creating profile and wallet for new user:', error);
        }
      }
    },
  },
});
