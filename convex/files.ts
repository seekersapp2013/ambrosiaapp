import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
  try {
    console.log('Generating upload URL...');
    const url = await ctx.storage.generateUploadUrl();
    console.log('Upload URL generated successfully:', url);
    return url;
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw error;
  }
});

export const getFileUrl = query({
  args: { storageId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    try {
      const url = await ctx.storage.getUrl(args.storageId);
      console.log('Generated file URL:', { storageId: args.storageId, url });
      return url;
    } catch (error) {
      console.error('Error generating file URL:', error);
      return null;
    }
  },
});