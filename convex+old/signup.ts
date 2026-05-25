import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const completeSignup = mutation({
  args: {
    userId: v.id("users"),
    walletAddress: v.string(),
    walletPrivateKey: v.string(),
    walletMnemonic: v.string(),
    transactionPin: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("completeSignup called for user:", args.userId);
    
    // Update the user with wallet information
    await ctx.db.patch(args.userId, {
      walletAddress: args.walletAddress,
      walletPrivateKey: args.walletPrivateKey,
      walletMnemonic: args.walletMnemonic,
      transactionPin: args.transactionPin,
    });
    
    console.log("User wallet data updated successfully");
    
    return { success: true };
  },
});
