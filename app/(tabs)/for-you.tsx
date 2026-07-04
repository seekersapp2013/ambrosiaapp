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
 *      │    └─ Feed mode toggle  ← "For You" | "AI"  (persisted in Convex)
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

import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  TouchableOpacity,
  StyleSheet,
  View as RNView,
  Animated,
} from "react-native";
import { View, Text } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
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

type FeedMode = "for_you" | "ai";

// ─── Feed Mode Toggle ───────────────────────────────────────────────────────
interface FeedModeToggleProps {
  mode: FeedMode;
  onChange: (mode: FeedMode) => void;
}

function FeedModeToggle({ mode, onChange }: FeedModeToggleProps) {
  // Animated slide for the pill indicator
  const slideAnim = React.useRef(new Animated.Value(mode === "ai" ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: mode === "ai" ? 1 : 0,
      useNativeDriver: true,
      tension: 300,
      friction: 28,
    }).start();
  }, [mode]);

  const pillTranslate = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, PILL_WIDTH + 4], // left offset: 2px padding, right: pill width + gap
  });

  return (
    <RNView style={styles.toggleTrack} accessibilityRole="switch" accessibilityLabel="Feed mode toggle">
      {/* Sliding pill */}
      <Animated.View
        style={[
          styles.togglePill,
          { transform: [{ translateX: pillTranslate }] },
          mode === "ai" ? styles.pillAI : styles.pillForYou,
        ]}
      />

      {/* For You option */}
      <TouchableOpacity
        style={styles.toggleOption}
        onPress={() => onChange("for_you")}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="For You feed"
        accessibilityState={{ selected: mode === "for_you" }}
      >
        <Ionicons
          name="newspaper-outline"
          size={13}
          color={mode === "for_you" ? "#fff" : Colors.textMuted}
          style={styles.toggleIcon}
        />
        <Text style={[styles.toggleLabel, mode === "for_you" && styles.toggleLabelActive]}>
          For You
        </Text>
      </TouchableOpacity>

      {/* AI option */}
      <TouchableOpacity
        style={styles.toggleOption}
        onPress={() => onChange("ai")}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="AI curated feed"
        accessibilityState={{ selected: mode === "ai" }}
      >
        <Ionicons
          name="sparkles-outline"
          size={13}
          color={mode === "ai" ? "#fff" : Colors.textMuted}
          style={styles.toggleIcon}
        />
        <Text style={[styles.toggleLabel, mode === "ai" && styles.toggleLabelActive]}>
          AI
        </Text>
      </TouchableOpacity>
    </RNView>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────
export default function ForYouScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();

  // ── Data ──────────────────────────────────────────────────────────────────
  const feed = useQuery(api.feed.listUnifiedFeed, { limit: 20 });
  const recentUnread = useQuery(api.notifications.getRecentUnreadNotifications, { limit: 5 });
  const currentUser = useQuery(api.users.viewer);
  const persistedFeedMode = useQuery(api.users.getFeedMode);
  const setFeedModeMutation = useMutation(api.users.setFeedMode);

  // ── Local state ───────────────────────────────────────────────────────────
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
  const [paywallTarget, setPaywallTarget] = useState<PaywallTarget | null>(null);
  // Optimistic local mode — starts undefined until server value arrives
  const [localMode, setLocalMode] = useState<FeedMode | undefined>(undefined);

  // Sync local mode once server value loads (only on first load)
  useEffect(() => {
    if (persistedFeedMode !== undefined && localMode === undefined) {
      setLocalMode(persistedFeedMode);
    }
  }, [persistedFeedMode]);

  const feedMode: FeedMode = localMode ?? persistedFeedMode ?? "for_you";

  const handleModeChange = useCallback(
    (newMode: FeedMode) => {
      setLocalMode(newMode); // optimistic
      setFeedModeMutation({ mode: newMode }).catch(() => {
        // revert on error
        setLocalMode(feedMode);
      });
    },
    [feedMode, setFeedModeMutation]
  );

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

          {/* Feed mode toggle — For You / AI */}
          <RNView style={styles.toggleRow}>
            <FeedModeToggle mode={feedMode} onChange={handleModeChange} />
          </RNView>
        </View>

        {/* ── Scrollable feed ───────────────────────────────────────── */}
        {feedMode === "for_you" ? (
          <FlatList
            data={feed ?? []}
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
                  onDeleteSuccess={(_id) => {
                    // Convex reactive query auto-removes the item — no local state needed
                  }}
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
        ) : (
          /* ── AI feed placeholder ─────────────────────────────────── */
          <RNView style={[styles.aiPlaceholder, { paddingBottom: feedPaddingBottom }]}>
            <Ionicons name="sparkles" size={48} color={Colors.blue} style={{ marginBottom: 16 }} />
            <Text style={styles.aiPlaceholderTitle}>AI Curated Feed</Text>
            <Text style={styles.aiPlaceholderSub}>
              Personalised content picked just for you — coming soon.
            </Text>
          </RNView>
        )}

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

// ─── Layout constants ─────────────────────────────────────────────────────────
const PILL_WIDTH = 76; // width of each toggle option
const TOGGLE_HEIGHT = 34;

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

  // Toggle row — right-aligned, sits below notification banner
  toggleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // Toggle pill track
  toggleTrack: {
    flexDirection: "row",
    alignItems: "center",
    height: TOGGLE_HEIGHT,
    width: PILL_WIDTH * 2 + 8, // two options + 4px side padding each
    borderRadius: TOGGLE_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 2,
    overflow: "hidden",
    position: "relative",
  },

  // Animated sliding pill
  togglePill: {
    position: "absolute",
    top: 2,
    width: PILL_WIDTH,
    height: TOGGLE_HEIGHT - 4,
    borderRadius: (TOGGLE_HEIGHT - 4) / 2,
  },
  pillForYou: {
    backgroundColor: Colors.primary,
  },
  pillAI: {
    backgroundColor: Colors.blue,
  },

  // Each option label area
  toggleOption: {
    width: PILL_WIDTH,
    height: TOGGLE_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    zIndex: 1, // above the pill so taps register
  },
  toggleIcon: {
    // size handled inline
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  toggleLabelActive: {
    color: "#fff",
  },

  // Feed
  feedList: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  // AI placeholder
  aiPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  aiPlaceholderTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  aiPlaceholderSub: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
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
