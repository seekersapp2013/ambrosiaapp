/**
 * For You Tab
 * Default landing tab (position 0).
 *
 * Layout:
 *   AppBackground (flex:1)
 *   └─ MobileCard (flex:1, centered, max-width 500)
 *      ├─ Header chrome (top nav + notification banner)
 *      ├─ FlatList (flex:1 — scrolls freely)
 *      └─ FAB cluster (position:absolute inside card, bottom-right)
 *           ├─ Write Article button
 *           └─ Create Pulse button
 *
 * All content is inside MobileCard so it stays within the card boundary
 * on large screens (web/tablet). FABs are position:absolute relative to
 * the card, not the window.
 *
 * Gated article taps open ContentPaywallSheet inline instead of navigating.
 * On payment success the user is sent to article-viewer (access now granted).
 */

import React, { useState } from "react";
import {
  FlatList,
  TouchableOpacity,
  StyleSheet,
  View as RNView,
} from "react-native";
import { View, Text } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { TopNav } from "@/components/TopNav";
import { MobileCard } from "@/components/MobileCard";
import { NotificationBanner } from "./notification/NotificationBanner";
import { ContentCard } from "@/components/stream/ContentCard";
import { AdSlotNative } from "@/components/stream/AdSlotNative";
import { LoadingSpinner } from "@/components/stream/LoadingSpinner";
import { EmptyState } from "@/components/stream/EmptyState";
import { ContentPaywallSheet } from "@/components/ContentPaywallSheet";
import { Colors } from "@/constants/Colors";
import { useTabBarHeight } from "@/utils/useDeviceClass";

// ─── Types ─────────────────────────────────────────────────────────────────
interface PaywallTarget {
  articleId: string;
  title: string;
  price: number;
  currency: string;
  creatorName?: string;
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function ForYouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  // ── Data ──────────────────────────────────────────────────────────────────
  const feed = useQuery(api.feed.listUnifiedFeed, { limit: 20 });
  const recentUnread = useQuery(api.notifications.getRecentUnreadNotifications, { limit: 5 });

  // ── Local state ───────────────────────────────────────────────────────────
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [paywallTarget, setPaywallTarget] = useState<PaywallTarget | null>(null);

  const visibleNotifications = recentUnread
    ? recentUnread.filter((n) => !dismissedNotifications.has(n._id))
    : [];

  // FABs sit this far above the bottom of the screen
  const fabBottom = tabBarHeight + insets.bottom + 16;

  // Feed content bottom padding: clear FABs (44px button + 16 gap) + tab bar
  const feedPaddingBottom = tabBarHeight + insets.bottom + 44 + 32;

  // ── Gated article tap handler ─────────────────────────────────────────────
  function handleGatedArticlePress(articleId: string) {
    const item = (feed ?? []).find((f) => f._id === articleId);
    if (!item) return;

    setPaywallTarget({
      articleId,
      title:       (item as any).title ?? "",
      price:       (item as any).priceAmount ?? 0,
      currency:    (item as any).priceToken  ?? "USD",
      creatorName: (item as any).author?.name ?? (item as any).author?.username,
    });
  }

  return (
    <AppBackground>
      <MobileCard containerStyle={styles.cardContainer} style={styles.card}>

        {/* ── Sticky header chrome ──────────────────────────────────── */}
        <View style={styles.headerInner}>
          {/* Shared top nav — title auto-detected from route */}
          <TopNav />

          {/* Notification banner */}
          {visibleNotifications.length > 0 && (
            <NotificationBanner
              notifications={visibleNotifications}
              onNotificationClick={(id) => {
                setDismissedNotifications((prev) => new Set([...prev, id]));
                router.push({
                  pathname: "/(tabs)/notification",
                  params: { highlightId: id },
                });
              }}
              onNotificationDismiss={(id) =>
                setDismissedNotifications((prev) => new Set([...prev, id]))
              }
              onDismiss={() => router.push("/(tabs)/notification")}
            />
          )}
        </View>

        {/* ── Scrollable feed ───────────────────────────────────────── */}
        <FlatList
          data={feed ?? []}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <>
              <ContentCard
                item={item as any}
                onArticlePress={(articleId) =>
                  router.push({
                    pathname: "/(tabs)/article-viewer",
                    params: { articleId },
                  })
                }
                onPulsePress={(reelId) =>
                  router.push({
                    pathname: "/(tabs)/reel-viewer",
                    params: { reelId },
                  })
                }
                onGatedArticlePress={handleGatedArticlePress}
              />
              {(index + 1) % 5 === 0 && (
                <AdSlotNative zoneId="feed_between_posts" />
              )}
            </>
          )}
          ListEmptyComponent={
            feed === undefined ? (
              <LoadingSpinner label="Loading feed…" />
            ) : (
              <EmptyState
                icon="newspaper-outline"
                title="Nothing here yet"
                subtitle="Be the first to share something with the community."
                ctaLabel="Write an article"
                onCta={() => router.push("/(tabs)/write-article")}
              />
            )
          }
          ListFooterComponent={<AdSlotNative zoneId="feed_bottom" />}
          showsVerticalScrollIndicator={false}
          style={styles.feedList}
          contentContainerStyle={[
            styles.feedContent,
            { paddingBottom: feedPaddingBottom },
          ]}
        />

        {/* ── Floating action buttons — inside card, bottom-right ───── */}
        <RNView
          style={[styles.fabCluster, { bottom: fabBottom }]}
          pointerEvents="box-none"
        >
          {/* Write Article */}
          <TouchableOpacity
            style={[styles.fab, styles.fabWrite]}
            onPress={() => router.push("/(tabs)/write-article")}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Write an article"
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Create Pulse */}
          <TouchableOpacity
            style={[styles.fab, styles.fabPulse]}
            onPress={() => router.push("/(tabs)/write-reel")}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Create a pulse"
          >
            <Ionicons name="videocam-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </RNView>

      </MobileCard>

      {/* ── Inline paywall for gated articles ────────────────────────── */}
      <ContentPaywallSheet
        visible={paywallTarget !== null}
        contentType="article"
        contentId={paywallTarget?.articleId ?? ""}
        price={paywallTarget?.price ?? 0}
        currency={paywallTarget?.currency ?? "USD"}
        title={paywallTarget?.title ?? ""}
        creatorName={paywallTarget?.creatorName}
        onClose={() => setPaywallTarget(null)}
        onSuccess={(_paymentId) => {
          const articleId = paywallTarget?.articleId;
          setPaywallTarget(null);
          if (articleId) {
            // Access is now granted — navigate to the viewer
            router.push({
              pathname: "/(tabs)/article-viewer",
              params: { articleId },
            });
          }
        }}
      />
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Outer card fills full height, centered
  cardContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  card: {
    flex: 1,
    // Override border radius for top — full card shape
  },

  // Header divider line
  headerInner: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(198, 34, 41, 0.3)",
  },

  // Feed
  feedList: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  // FAB cluster — stacked vertically, right-aligned, above tab bar, inside card
  fabCluster: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
    gap: 10,
  },

  // Individual FAB — 44×44 circle
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabWrite: {
    backgroundColor: Colors.primary,
  },
  fabPulse: {
    backgroundColor: Colors.purple,
  },
});
