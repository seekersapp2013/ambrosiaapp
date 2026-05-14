import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Password({
      profile(params) {
        console.log("Profile params received:", Object.keys(params));
        
        const profile: any = {
          email: params.email as string,
          isVerified: false,
          isCelebrity: false,
          createdAt: Date.now(),
        };
        
        if (params.username) {
          profile.username = params.username as string;
          console.log("Added username to profile");
        }
        if (params.phone) {
          profile.phone = params.phone as string;
          console.log("Added phone to profile");
        }
        if (params.displayName) {
          profile.displayName = params.displayName as string;
        }
        if (params.interests) {
          profile.interests = params.interests as string[];
          console.log("Added interests to profile:", params.interests);
        }
        if (params.walletAddress) {
          profile.walletAddress = params.walletAddress as string;
          console.log("Added walletAddress to profile");
        }
        if (params.walletPrivateKey) {
          profile.walletPrivateKey = params.walletPrivateKey as string;
          console.log("Added walletPrivateKey to profile (encrypted)");
        }
        if (params.walletMnemonic) {
          profile.walletMnemonic = params.walletMnemonic as string;
          console.log("Added walletMnemonic to profile (encrypted)");
        }
        if (params.transactionPin) {
          profile.transactionPin = params.transactionPin as string;
          console.log("Added transactionPin to profile (hashed)");
        }
        
        console.log("Final profile fields:", Object.keys(profile));
        return profile;
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      // Allow redirects to the mobile Expo URL or to the web URL.
      // Without this, only redirects to `SITE_URL` are allowed.
      if (
        redirectTo !== process.env.EXPO_URL! &&
        redirectTo !== process.env.SITE_URL!
      ) {
        throw new Error(`Invalid redirectTo URI ${redirectTo}`);
      }
      return redirectTo;
    },
    async afterUserCreatedOrUpdated(ctx, { userId, existingUserId }) {
      // Only run for new users, not updates
      if (existingUserId) {
        return;
      }

      const user = await ctx.db.get(userId);
      if (user) {
        console.log("New user created:", userId);
        console.log("User has wallet data:", {
          hasAddress: !!user.walletAddress,
          hasPrivateKey: !!user.walletPrivateKey,
          hasMnemonic: !!user.walletMnemonic,
          hasPin: !!user.transactionPin,
        });
        
        // Initialize wallet for new user
        try {
          const wallets = await ctx.db
            .query("wallets")
            .collect();
          
          const existingWallet = wallets.find((w: any) => w.userId === userId);

          if (!existingWallet) {
            await ctx.db.insert("wallets", {
              userId,
              balance: 0,
              updatedAt: Date.now(),
            });
            console.log("Wallet balance initialized");
          }
        } catch (error) {
          console.error("Error initializing wallet:", error);
        }

        // Send welcome notification
        try {
          await ctx.db.insert("notifications", {
            userId: userId,
            type: "welcome",
            title: "Welcome to VideoClub!",
            message:
              "Your account has been created successfully. Start exploring Nollywood movies and Nigerian music.",
            data: {},
            isRead: false,
            timestamp: Date.now(),
          });
          console.log("Welcome notification sent");
        } catch (error) {
          console.error("Error creating notification:", error);
        }
      }
    },
  },
});
