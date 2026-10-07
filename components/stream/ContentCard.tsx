/**
 * ContentCard
 * Dispatcher: renders ArticleCard (articles), ReelCardFeed (pulses),
 * EventSearchCard (events), CircleCard (circles), ProviderSearchCard (providers),
 * or CourseCard (courses) based on the `contentType` field of a stream item.
 */

import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { ArticleCard, ArticleCardItem } from "./ArticleCard";
import { ReelCardFeed, ReelCardItem } from "./ReelCardFeed";
import { CircleCard } from "./CircleCard";
import { CourseCard } from "./CourseCard";
import { EventSearchCard, EventSearchItem } from "./EventSearchCard";
import { ProviderSearchCard, ProviderSearchItem } from "./ProviderSearchCard";
import { MobileCard } from "@/components/MobileCard";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SecondaryButton, DestructiveButton } from "@/components/ui/Button";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "expo-router";

interface ContentCardProps {
  item: any;
  onArticlePress: (articleId: string) => void;
  onPulsePress: (pulseId: string) => void;
  onGatedArticlePress?: (articleId: string) => void;
  currentUserId?: string;
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
  const router = useRouter();

  // Content creators always have full access to their own posts
  const isOwnContent = !!currentUserId && item.authorId === currentUserId;

  // Query once at the card level
  const canDeleteContent = useQuery(api.moderation.canIDeleteContent) ?? false;

  // Delete confirmation dialog state
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Delete mutations
  const deleteArticle = useMutation(api.articles.deleteArticle);
  const deleteReel = useMutation(api.reels.deleteReel);

  function handleDeleteRequest() {
    setConfirmVisible(true);
  }

  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      if (item.contentType === "article") {
        await deleteArticle({ articleId: item._id as Id<"articles"> });
      } else if (item.contentType === "reel") {
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

  // Dispatch renderer based on contentType
  let inner: React.ReactNode = null;

  if (item.contentType === "article") {
    inner = (
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
    );
  } else if (item.contentType === "reel") {
    inner = (
      <ReelCardFeed
        reel={{ ...(item as ReelCardItem), authorId: item.authorId }}
        isOwnContent={isOwnContent}
        onPress={() => onPulsePress(item._id)}
        onDeleteRequest={handleDeleteRequest}
        canDeleteContent={canDeleteContent}
      />
    );
  } else if (item.contentType === "event") {
    inner = (
      <EventSearchCard
        event={item as EventSearchItem}
        onPress={() => {
          router.push({
            pathname: "/(tabs)/booking",
            params: { eventId: item._id },
          });
        }}
      />
    );
  } else if (item.contentType === "circle") {
    inner = (
      <CircleCard
        circle={{
          _id: item._id,
          name: item.name,
          description: item.description,
          type: item.type || "PUBLIC",
          accessType: item.accessType || "FREE",
          coverImage: item.coverImageUrl,
          currentMembers: item.currentMembers || 1,
          tags: item.tags,
        }}
        onPress={() => {
          router.push({
            pathname: "/(tabs)/circle-detail",
            params: { circleId: item._id },
          });
        }}
        onJoin={() => {
          router.push({
            pathname: "/(tabs)/circle-detail",
            params: { circleId: item._id },
          });
        }}
      />
    );
  } else if (item.contentType === "provider") {
    inner = (
      <ProviderSearchCard
        provider={item as ProviderSearchItem}
        onPress={() => {
          router.push({
            pathname: "/(tabs)/booking",
            params: { providerUserId: item.userId },
          });
        }}
      />
    );
  } else if (item.contentType === "course") {
    inner = (
      <CourseCard
        course={{
          _id: item._id,
          title: item.title,
          description: item.description,
          coverImage: item.coverImageUrl,
          category: item.category,
          tags: item.tags,
          author: item.author,
        }}
        onPress={() => {
          router.push({
            pathname: "/(tabs)/course-viewer",
            params: { courseId: item._id },
          });
        }}
      />
    );
  } else {
    // Default fallback to article
    inner = (
      <ArticleCard
        article={{ ...(item as ArticleCardItem), authorId: item.authorId }}
        isOwnContent={isOwnContent}
        onPress={() => onArticlePress(item._id)}
        onDeleteRequest={handleDeleteRequest}
        canDeleteContent={canDeleteContent}
      />
    );
  }

  const isRawCard =
    item.contentType === "event" ||
    item.contentType === "circle" ||
    item.contentType === "provider" ||
    item.contentType === "course";

  return (
    <>
      {isRawCard ? (
        <View style={rawCardStyle}>{inner}</View>
      ) : (
        <MobileCard containerStyle={cardContainerStyle} style={cardStyle}>
          {inner}
        </MobileCard>
      )}

      {/* ── Delete confirmation dialog ── */}
      {(item.contentType === "article" || item.contentType === "reel") && (
        <BottomSheet
          visible={confirmVisible}
          onClose={() => !deleting && setConfirmVisible(false)}
          title={`Delete ${contentLabel}`}
          body={`This will permanently delete this ${contentLabel} and all its associated data. This action cannot be undone.`}
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
      )}
    </>
  );
}

const cardContainerStyle = {
  paddingHorizontal: 12,
  paddingVertical: 6,
};

const rawCardStyle = {
  paddingHorizontal: 12,
  paddingVertical: 2,
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
