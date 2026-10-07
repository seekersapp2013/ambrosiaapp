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
          let email = (user.email as string | undefined)?.toLowerCase().trim();
          if (!email) {
            const authAcc = await (ctx.db as any)
              .query("authAccounts")
              .withIndex("userIdAndProvider", (q: any) => q.eq("userId", userId))
              .first();
            if (authAcc && authAcc.providerAccountId) {
              email = (authAcc.providerAccountId as string).toLowerCase().trim();
            }
          }

          let pending: any = email
            ? await (ctx.db as any)
                .query("signupPending")
                .withIndex("by_email", (q: any) => q.eq("email", email))
                .first()
            : null;

          // Fallback: If not found by email, check for recent pending signup (within last 10 mins)
          if (!pending) {
            const recentPending = await (ctx.db as any)
              .query("signupPending")
              .collect();
            const tenMinsAgo = Date.now() - 10 * 60 * 1000;
            pending = recentPending
              .filter((r: any) => r.createdAt > tenMinsAgo)
              .sort((a: any, b: any) => b.createdAt - a.createdAt)[0] ?? null;
          }

          if (pending) {
            // Use the username from the wizard if provided
            const wizardUsername = pending.username?.toLowerCase().replace(/[^a-z0-9_]/g, "");
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

          // If user signed up as a provider, create booking subscriber record & enroll in tiering
          if (pending && pending.signupRole === "provider") {
            console.log('Auto-creating provider subscription and tier enrollment for new provider user:', userId);
            const { createSubscriberHelper } = await import("./bookingSubscribers");
            await createSubscriberHelper(ctx, userId, pending.providerKycData || {
              jobTitle: "Service Provider",
              specialization: "General Practice",
              aboutUser: "Service Provider at Ambrosia.",
              offerDescription: "1-on-1 and group consultations.",
              sessionPrice: 100,
            });
          }

          // Clean up pending signup record after successful initialization
          if (pending) {
            await ctx.db.delete(pending._id);
          }

          // Auto-initialize AI recommendations
          await ctx.scheduler.runAfter(5000, internal.autoInitializeAI.runAutoInitialization, {
            userId,
          });

          // Initialize moderation system to ensure first user has primary admin role
          console.log('Checking/initializing primary admin role...');
          const { ensurePrimaryAdminExists } = await import("./moderationHelpers");
          await ensurePrimaryAdminExists(ctx);
        } catch (error) {
          console.error('Error creating profile and wallet for new user:', error);
        }
      }
    },
  },
});
