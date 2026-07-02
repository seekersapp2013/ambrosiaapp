/**
 * referralNotifications.ts
 * In-app notification triggers for all referral lifecycle events.
 * Mirrors the pattern used in bookingNotifications.ts.
 *
 * Events covered:
 *   NEW_REFERRAL_RECEIVED   — patient is notified when an expert creates a referral for them
 *   REFERRAL_EXPERT_SELECTED — referring expert is notified when the patient picks someone
 *   REFERRAL_DECLINED        — referring expert is notified when the patient declines
 *   REFERRAL_COMPLETED       — referring expert is notified once commission is paid
 *   REFERRAL_SELECTED_EXPERT — the selected expert is notified they've been chosen
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─── Type constants ───────────────────────────────────────────────────────────
export const REFERRAL_NOTIFICATION_TYPES = {
  NEW_REFERRAL_RECEIVED:    "referral_new_received",
  REFERRAL_EXPERT_SELECTED: "referral_expert_selected",
  REFERRAL_DECLINED:        "referral_declined",
  REFERRAL_COMPLETED:       "referral_completed",
  REFERRAL_SELECTED_EXPERT: "referral_selected_expert",
} as const;

// ─── Helper ───────────────────────────────────────────────────────────────────
async function getDisplayName(
  ctx: any,
  userId: Id<"users">,
  fallback: string
): Promise<string> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();
  return profile?.name ?? profile?.username ?? fallback;
}

// ─── 1. Notify patient: new referral from an expert ──────────────────────────
export const notifyPatientNewReferral = internalMutation({
  args: {
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) return;

    const expertName = await getDisplayName(
      ctx,
      referral.referringExpertId,
      "A provider"
    );

    await ctx.db.insert("notifications", {
      userId: referral.patientId,
      type: REFERRAL_NOTIFICATION_TYPES.NEW_REFERRAL_RECEIVED,
      title: "New Referral Received",
      message: `${expertName} has referred you to a specialist. Open to choose your preferred expert and book a session.`,
      category: "booking",
      priority: "high",
      isRead: false,
      actorUserId: referral.referringExpertId,
      metadata: {
        referralId: referral._id,
        referralTitle: referral.title,
        referringExpertId: referral.referringExpertId,
        expertName,
      },
      createdAt: Date.now(),
    });
  },
});

// ─── 2. Notify referring expert: patient selected an expert ──────────────────
export const notifyExpertPatientSelected = internalMutation({
  args: {
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral || !referral.selectedExpertId) return;

    const patientName = await getDisplayName(ctx, referral.patientId, "Your patient");
    const selectedExpertName = await getDisplayName(
      ctx,
      referral.selectedExpertId,
      "an expert"
    );

    // Notify the referring expert
    await ctx.db.insert("notifications", {
      userId: referral.referringExpertId,
      type: REFERRAL_NOTIFICATION_TYPES.REFERRAL_EXPERT_SELECTED,
      title: "Patient Selected an Expert",
      message: `${patientName} has selected ${selectedExpertName} from your referral "${referral.title}". You will earn a 10% commission once they complete a session.`,
      category: "booking",
      priority: "medium",
      isRead: false,
      actorUserId: referral.patientId,
      metadata: {
        referralId: referral._id,
        referralTitle: referral.title,
        patientId: referral.patientId,
        patientName,
        selectedExpertId: referral.selectedExpertId,
        selectedExpertName,
        commissionRate: referral.commissionRate,
      },
      createdAt: Date.now(),
    });

    // Also notify the selected expert that a patient is coming their way
    await ctx.db.insert("notifications", {
      userId: referral.selectedExpertId,
      type: REFERRAL_NOTIFICATION_TYPES.REFERRAL_SELECTED_EXPERT,
      title: "Referral — New Patient",
      message: `${patientName} has selected you from a referral by ${await getDisplayName(ctx, referral.referringExpertId, "a colleague")}. They should be booking a session with you shortly.`,
      category: "booking",
      priority: "medium",
      isRead: false,
      actorUserId: referral.patientId,
      metadata: {
        referralId: referral._id,
        referralTitle: referral.title,
        patientId: referral.patientId,
        patientName,
        referringExpertId: referral.referringExpertId,
      },
      createdAt: Date.now(),
    });
  },
});

// ─── 3. Notify referring expert: patient declined all suggestions ─────────────
export const notifyExpertReferralDeclined = internalMutation({
  args: {
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) return;

    const patientName = await getDisplayName(ctx, referral.patientId, "Your patient");

    await ctx.db.insert("notifications", {
      userId: referral.referringExpertId,
      type: REFERRAL_NOTIFICATION_TYPES.REFERRAL_DECLINED,
      title: "Referral Declined",
      message: `${patientName} has declined your referral "${referral.title}". No further action is required.`,
      category: "booking",
      priority: "low",
      isRead: false,
      actorUserId: referral.patientId,
      metadata: {
        referralId: referral._id,
        referralTitle: referral.title,
        patientId: referral.patientId,
        patientName,
        declineReason: (referral as any).declineReason,
      },
      createdAt: Date.now(),
    });
  },
});

// ─── 4. Notify referring expert: referral completed, commission paid ──────────
export const notifyExpertReferralCompleted = internalMutation({
  args: {
    referralId: v.id("referrals"),
  },
  handler: async (ctx, args) => {
    const referral = await ctx.db.get(args.referralId);
    if (!referral) return;

    const commissionDisplay =
      referral.commissionAmount != null && referral.commissionCurrency
        ? `${referral.commissionCurrency} ${referral.commissionAmount.toFixed(2)}`
        : "your referral commission";

    const patientName = await getDisplayName(ctx, referral.patientId, "a patient");

    await ctx.db.insert("notifications", {
      userId: referral.referringExpertId,
      type: REFERRAL_NOTIFICATION_TYPES.REFERRAL_COMPLETED,
      title: "Referral Commission Earned 🎉",
      message: `Your referral for ${patientName} ("${referral.title}") has been completed. ${commissionDisplay} has been added to your wallet.`,
      category: "booking",
      priority: "high",
      isRead: false,
      actorUserId: referral.patientId,
      metadata: {
        referralId: referral._id,
        referralTitle: referral.title,
        patientId: referral.patientId,
        patientName,
        commissionAmount: referral.commissionAmount,
        commissionCurrency: referral.commissionCurrency,
        commissionTxId: (referral as any).commissionTxId,
      },
      createdAt: Date.now(),
    });
  },
});
