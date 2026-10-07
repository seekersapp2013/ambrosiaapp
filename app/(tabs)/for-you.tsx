/**
 * For You Tab
 * Default landing tab (position 0).
 *
 * Layout:
 *   AppBackground (flex:1)
 *   └─ MobileCard (flex:1, centered, max-width 500)
 *      ├─ Header chrome
 *      │    ├─ TopNav
 *      │    ├─ NotificationBanner (conditional)
 *      │    └─ Search bar
 *      ├─ FlatList (flex:1 — scrolls freely) — AI-ranked feed
 *      └─ FAB cluster (position:absolute inside card, bottom-right)
 *           ├─ Write Article button
 *           └─ Create Pulse button
 *
 * The feed is AI-ranked only. On-demand ranking is triggered when the feed
 * is not yet personalised; the result is cached in Convex for 6 hours and the
 * reactive query updates automatically. When AI is unavailable and there's no
 * cached personalised feed, the backend query falls back to the chronological
 * feed so the user always sees content.
 *
 * Gated article taps open ContentPaywallSheet inline instead of navigating.
 * On payment success the user is sent to article-viewer (access now granted).
 */

import React, { useState, useEffect, useRef } from "react";
import {
  FlatList,
  TouchableOpacity,
  StyleSheet,
  View as RNView,
} from "react-native";
import { View, Text } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { navigateToNotificationTarget } from "@/utils/notificationNavigation";
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
import { useColors } from "@/hooks/useColors";
import { useTabBarHeight } from "@/utils/useDeviceClass";
import { useIsApprovedProvider } from "@/hooks/useIsApprovedProvider";
import { HomeSearchBar, SearchCategory } from "@/components/stream/HomeSearchBar";

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
  const C = useColors();

  // ── Data ──────────────────────────────────────────────────────────────────
  const aiFeedResult = useQuery(api.feedAI.listUnifiedFeedAI, { limit: 20, useAI: true });
  const recentUnread = useQuery(api.notifications.getRecentUnreadNotifications, { limit: 5 });
  const markAsRead = useMutation(api.notifications.markAsRead);
  const currentUser = useQuery(api.users.viewer);
  const generateRecommendations = useAction(api.feedAI.generateFeedRecommendations);

  // Unwrap AI feed — handles both return shapes (fallback returns plain array)
  const aiFeedRaw = aiFeedResult as any;
  const aiFeed: any[] | undefined = aiFeedResult === undefined
    ? undefined
    : Array.isArray(aiFeedRaw)
      ? aiFeedRaw
      : aiFeedRaw?.items ?? [];
  const aiIsPersonalised = !Array.isArray(aiFeedRaw) && aiFeedRaw?.useAI === true;

  // ── Local state ───────────────────────────────────────────────────────────
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [paywallTarget, setPaywallTarget] = useState<PaywallTarget | null>(null);
  // Whether we've kicked off an on-demand AI ranking for this session
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const hasTriggeredGeneration = useRef(false);

  // ── Search State ──────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedSearchCategory, setSelectedSearchCategory] = useState<SearchCategory>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSearchActive = debouncedSearchQuery.trim().length > 0;

  const searchResults = useQuery(
    api.search.searchUnifiedFeed,
    isSearchActive
      ? {
          query: debouncedSearchQuery,
          category: selectedSearchCategory,
          feedMode: "ai",
          limit: 30,
        }
      : "skip"
  );

  // ── On-demand AI ranking ──────────────────────────────────────────────────
  // Triggered when the feed isn't personalised yet. Runs once per session —
  // the result is cached in Convex for 6 hours and the reactive query
  // (aiFeedResult) updates automatically when the cache lands.
  useEffect(() => {
    if (
      !aiIsPersonalised &&
      !hasTriggeredGeneration.current &&
      currentUser?._id &&
      aiFeedResult !== undefined // query has resolved (not still loading)
    ) {
      hasTriggeredGeneration.current = true;
      setIsGeneratingAI(true);
      setAiUnavailable(false);
      generateRecommendations({ userId: currentUser._id as any })
        .then((result) => {
          // API is considered unavailable when it explicitly failed to reach Nova
          // (no key, bad response). success / no_content / no_profile are data
          // issues, not API unavailability.
          const apiFailureReasons = ["no_nova_key", "empty_ranker_response"];
          if (result && result.success === false && apiFailureReasons.includes(result.reason ?? "")) {
            setAiUnavailable(true);
          }
        })
        .catch((err) => {
          // Action threw — network-level failure, treat as unavailable
          setAiUnavailable(true);
          console.warn("[AI feed] generation failed:", err);
        })
        .finally(() => setIsGeneratingAI(false));
    }
  }, [aiIsPersonalised, currentUser?._id, aiFeedResult]);

  const visibleNotifications = recentUnread
    ? recentUnread.filter((n) => !dismissedNotifications.has(n._id))
    : [];

  const { isApprovedProvider } = useIsApprovedProvider();

  // FABs sit this far above the bottom of the screen
  const fabBottom = tabBarHeight + insets.bottom + 16;

  // Feed content bottom padding: clear FABs (44px button + 16 gap) + tab bar
  const feedPaddingBottom = tabBarHeight + insets.bottom + 44 + 32;

  // ── Gated article tap handler ─────────────────────────────────────────────
  function handleGatedArticlePress(articleId: string) {
    const item = (aiFeed ?? []).find((f) => f._id === articleId);
    if (!item) return;

    // Content creator can always access their own content — bypass paywall
    if (currentUser && (item as any).authorId === currentUser._id) {
      router.push({
        pathname: "/(tabs)/article-viewer",
        params: { articleId },
      });
      return;
    }

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
        <View style={[styles.headerInner, { borderBottomColor: C.borderSubtle }]}>
          {/* Shared top nav — title auto-detected from route */}
          <TopNav />

          {/* Notification banner */}
          {visibleNotifications.length > 0 && (
            <NotificationBanner
              notifications={visibleNotifications}
              onNotificationClick={(id) => {
                setDismissedNotifications((prev) => new Set([...prev, id]));
                const notif = recentUnread?.find((n) => n._id === id);
                if (notif) {
                  navigateToNotificationTarget(router, notif as any, undefined, (notifId) => {
                    markAsRead({ notificationId: notifId as Id<"notifications"> }).catch(() => {});
                  });
                } else {
                  router.push({
                    pathname: "/(tabs)/notification",
                    params: { highlightId: id },
                  });
                }
              }}
              onNotificationDismiss={(id) =>
                setDismissedNotifications((prev) => new Set([...prev, id]))
              }
              onDismiss={() => router.push("/(tabs)/notification")}
            />
          )}

          {/* General Search Bar */}
          <HomeSearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() => setSearchQuery("")}
            selectedCategory={selectedSearchCategory}
            onSelectCategory={setSelectedSearchCategory}
          />
        </View>

        {/* ── Scrollable feed / Search Results ───────────────────────── */}
        {isSearchActive ? (
          <FlatList
            data={searchResults ?? []}
            keyExtractor={(item: any) => `${item.contentType}-${item._id}`}
            renderItem={({ item, index }) => (
              <>
                <ContentCard
                  item={item as any}
                  currentUserId={currentUser?._id}
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
              searchResults === undefined ? (
                <LoadingSpinner label="Searching content…" />
              ) : (
                <EmptyState
                  icon="search-outline"
                  title="No results found"
                  subtitle={`No matching content found for "${debouncedSearchQuery}"`}
                />
              )
            }
            showsVerticalScrollIndicator={false}
            style={styles.feedList}
            contentContainerStyle={[
              styles.feedContent,
              { paddingBottom: feedPaddingBottom },
            ]}
          />
        ) : aiUnavailable && !aiIsPersonalised ? (
          /* ── AI unavailable (no cached personalised feed) ──────────── */
          <RNView style={[styles.aiUnavailableContainer, { backgroundColor: C.bgBase }]}>
            <Ionicons name="cloud-offline-outline" size={48} color={C.textMuted} style={{ marginBottom: 16 }} />
            <Text style={[styles.aiUnavailableTitle, { color: C.textPrimary }]}>Feed is currently not available</Text>
            <Text style={[styles.aiUnavailableSubtitle, { color: C.textMuted }]}>Please try again later</Text>
            <TouchableOpacity
              style={styles.aiRetryButton}
              onPress={() => {
                if (!currentUser?._id) return;
                hasTriggeredGeneration.current = false;
                setAiUnavailable(false);
                setIsGeneratingAI(true);
                generateRecommendations({ userId: currentUser._id as any })
                  .then((r) => {
                    const apiFailureReasons = ["no_nova_key", "empty_ranker_response"];
                    if (r && r.success === false && apiFailureReasons.includes(r.reason ?? "")) {
                      setAiUnavailable(true);
                    }
                  })
                  .catch(() => setAiUnavailable(true))
                  .finally(() => setIsGeneratingAI(false));
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.aiRetryButtonText}>Try again</Text>
            </TouchableOpacity>
          </RNView>
        ) : (
          /* ── AI-ranked feed ────────────────────────────────────────── */
          <FlatList
            data={(aiFeed ?? []).filter((item: any) => item.contentType !== "event")}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => (
              <>
                <ContentCard
                  item={item as any}
                  currentUserId={currentUser?._id}
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
                  onDeleteSuccess={(_id) => {}}
                />
                {(index + 1) % 5 === 0 && (
                  <AdSlotNative zoneId="feed_between_posts" />
                )}
              </>
            )}
            ListEmptyComponent={
              aiFeedResult === undefined || isGeneratingAI ? (
                <LoadingSpinner label={isGeneratingAI ? "Ranking your feed…" : "Loading feed…"} />
              ) : (
                <EmptyState
                  icon="newspaper-outline"
                  title="Nothing here yet"
                  subtitle="Be the first to share something with the community."
                  ctaLabel={isApprovedProvider ? "Write an article" : undefined}
                  onCta={isApprovedProvider ? () => router.push("/(tabs)/write-article") : undefined}
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
        )}

        {/* ── Floating action buttons — inside card, bottom-right ───── */}
        {isApprovedProvider && (
          <RNView
            style={[styles.fabCluster, { bottom: fabBottom }]}
            pointerEvents="box-none"
          >
            {/* Write Article */}
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: C.primary }]}
              onPress={() => router.push("/(tabs)/write-article")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Write an article"
            >
              <Ionicons name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>

            {/* Create Pulse */}
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: C.purple }]}
              onPress={() => router.push("/(tabs)/write-reel")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel="Create a pulse"
            >
              <Ionicons name="videocam-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </RNView>
        )}

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

  // AI unavailable screen
  aiUnavailableContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 120,
    gap: 4,
  },
  aiUnavailableTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  aiUnavailableSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  aiRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.blue,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  aiRetryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
