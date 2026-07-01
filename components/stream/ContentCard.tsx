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
 */

import React from "react";
import { ArticleCard, ArticleCardItem } from "./ArticleCard";
import { ReelCardFeed, ReelCardItem } from "./ReelCardFeed";
import { MobileCard } from "@/components/MobileCard";

// Shape returned by api.feed.listUnifiedFeed — article variant
interface FeedArticle extends ArticleCardItem {
  contentType: "article";
}

// Shape returned by api.feed.listUnifiedFeed — reel/pulse variant
interface FeedPulse extends ReelCardItem {
  contentType: "reel";
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
}

export function ContentCard({
  item,
  onArticlePress,
  onPulsePress,
  onGatedArticlePress,
}: ContentCardProps) {
  const inner =
    item.contentType === "article" ? (
      <ArticleCard
        article={item as ArticleCardItem}
        onPress={() => onArticlePress(item._id)}
        onGatedPress={
          onGatedArticlePress ? () => onGatedArticlePress(item._id) : undefined
        }
      />
    ) : (
      <ReelCardFeed
        reel={item as ReelCardItem}
        onPress={() => onPulsePress(item._id)}
      />
    );

  return (
    <MobileCard
      // Tighten vertical padding — the inner card already has its own padding
      containerStyle={cardContainerStyle}
      // Remove the card's overflow:hidden so the inner card's border radius shows
      style={cardStyle}
    >
      {inner}
    </MobileCard>
  );
}

// Defined outside render to avoid object recreation per item
const cardContainerStyle = {
  paddingHorizontal: 12,
  paddingVertical: 6,
};

const cardStyle = {
  // No extra padding inside — ArticleCard / ReelCardFeed handle their own
  padding: 0,
  overflow: "hidden" as const,
};
