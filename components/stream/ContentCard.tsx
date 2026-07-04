/**
 * ContentCard
 * Dispatcher: renders ArticleCard (articles) or ReelCardFeed/PulseCard (pulses)
 * based on the `contentType` field of a unified feed item.
 *
 * Each item is wrapped in a MobileCard so feed items are visually distinct
 * from one another — bordered, rounded, subtle red glow.
 *
 * onGatedArticlePress — when provided, ArticleCard calls this instead of
 * onArticlePress for gated articles so the parent can open a paywall.
 *
 * Phase 2: delete flow is owned here.
 *   - Trash button in sub-cards calls onDeleteRequest → opens BottomSheet dialog.
 *   - BottomSheet (variant="dialog") works on web + native.
 *   - On confirm the mutation runs and permanently deletes all related data.
 */

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { ArticleCard, ArticleCardItem } from "./ArticleCard";
import { ReelCardFeed, ReelCardItem } from "./ReelCardFeed";
import { MobileCard } from "@/components/MobileCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SecondaryButton, DestructiveButton } from "@/components/ui/Button";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// Shape returned by api.feed.listUnifiedFeed — article variant
interface FeedArticle extends ArticleCardItem {
  contentType: "article";
  authorId?: string;
}

// Shape returned by api.feed.listUnifiedFeed — reel/pulse variant
interface FeedPulse extends ReelCardItem {
  contentType: "reel";
  authorId?: string;
}

type FeedItem = FeedArticle | FeedPulse;

interface ContentCardProps {
  item: FeedItem;
  onArticlePress: (articleId: string) => void;
  onPulsePress: (pulseId: string) => void;
  /**
   * Called when the user taps a gated article card.
   * Receives the articleId so the parent can open a targeted paywall.
   * If not provided, gated articles fall through to onArticlePress.
   */
  onGatedArticlePress?: (articleId: string) => void;
  /** The current authenticated user's ID — used to bypass gating for own content */
  currentUserId?: string;
  /**
   * Optional callback fired after a successful delete.
   * Convex's reactive query is the primary refresh mechanism — this is for
   * any extra local state the parent wants to clear.
   */
  onDeleteSuccess?: (itemId: string) => void;
}

export function ContentCard({
  item,
  onArticlePress,
  onPulsePress,
  onGatedArticlePress,
  currentUserId,
  onDeleteSuccess,
}: ContentCardProps) {
  // Content creators always have full access to their own posts
  const isOwnContent = !!currentUserId && item.authorId === currentUserId;

  // Query once at the card level — avoids N queries in each sub-card
  const canDeleteContent = useQuery(api.moderation.canIDeleteContent) ?? false;

  // Delete confirmation dialog state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Delete mutations — permanent, cascades all related data
  const deleteArticle = useMutation(api.articles.deleteArticle);
  const deleteReel = useMutation(api.reels.deleteReel);

  // Called by the trash button inside sub-cards — opens the dialog
  function handleDeleteRequest() {
    setConfirmVisible(true);
  }

  // Called when user confirms in the dialog — runs the actual mutation
  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      if (item.contentType === "article") {
        await deleteArticle({ articleId: item._id as Id<"articles"> });
      } else {
        await deleteReel({ reelId: item._id as Id<"reels"> });
      }
      setConfirmVisible(false);
      onDeleteSuccess?.(item._id);
    } catch (err) {
      console.error("Delete failed:", err);
      setConfirmVisible(false);
    } finally {
      setDeleting(false);
    }
  }

  const contentLabel = item.contentType === "article" ? "article" : "pulse";

  // Build card item — always include authorId so FollowPill has it
  const inner =
    item.contentType === "article" ? (
      <ArticleCard
        article={{ ...(item as ArticleCardItem), authorId: item.authorId }}
        isOwnContent={isOwnContent}
        onPress={() => onArticlePress(item._id)}
        onGatedPress={
          isOwnContent
            ? undefined
            : onGatedArticlePress
            ? () => onGatedArticlePress(item._id)
            : undefined
        }
        onDeleteRequest={handleDeleteRequest}
        canDeleteContent={canDeleteContent}
      />
    ) : (
      <ReelCardFeed
        reel={{ ...(item as ReelCardItem), authorId: item.authorId }}
        isOwnContent={isOwnContent}
        onPress={() => onPulsePress(item._id)}
        onDeleteRequest={handleDeleteRequest}
        canDeleteContent={canDeleteContent}
      />
    );

  return (
    <>
      <MobileCard
        containerStyle={cardContainerStyle}
        style={cardStyle}
      >
        {inner}
      </MobileCard>

      {/* ── Delete confirmation dialog — web + native compatible ─── */}
      <BottomSheet
        visible={confirmVisible}
        onClose={() => !deleting && setConfirmVisible(false)}
        title={`Delete ${contentLabel}`}
        body={`This will permanently delete this ${contentLabel} and all its associated data (comments, likes, bookmarks). This action cannot be undone.`}
        variant="dialog"
        dismissable={!deleting}
      >
        <View style={dialogStyles.btnRow}>
          <SecondaryButton
            label="Cancel"
            onPress={() => setConfirmVisible(false)}
            style={dialogStyles.btnHalf}
            disabled={deleting}
          />
          <DestructiveButton
            label={deleting ? "Deleting…" : "Delete"}
            loading={deleting}
            onPress={handleDeleteConfirm}
            style={dialogStyles.btnHalf}
          />
        </View>
      </BottomSheet>
    </>
  );
}

// Defined outside render to avoid object recreation per item
const cardContainerStyle = {
  paddingHorizontal: 12,
  paddingVertical: 6,
};

const cardStyle = {
  padding: 0,
  overflow: "hidden" as const,
};

const dialogStyles = StyleSheet.create({
  btnRow: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 8,
  },
  btnHalf: {
    flex: 1,
  },
});
