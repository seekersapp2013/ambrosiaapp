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

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FlatList,
  TouchableOpacity,
  StyleSheet,
  View as RNView,
  Animated,
} from "react-native";
import { View, Text } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
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
import { useColors } from "@/hooks/useColors";
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
  const C = useColors();
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
    <RNView style={[styles.toggleTrack, {
      backgroundColor: C.isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
      borderColor: C.isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
    }]} accessibilityRole="switch" accessibilityLabel="Feed mode toggle">
      {/* Sliding pill */}
      <Animated.View
        style={[
          styles.togglePill,
          { transform: [{ translateX: pillTranslate }] },
          { backgroundColor: mode === "ai" ? C.blue : C.primary },
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
          color={mode === "for_you" ? "#fff" : C.textMuted}
          style={styles.toggleIcon}
        />
        <Text style={[styles.toggleLabel, { color: mode === "for_you" ? "#fff" : C.textMuted }]}>
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
          color={mode === "ai" ? "#fff" : C.textMuted}
          style={styles.toggleIcon}
        />
        <Text style={[styles.toggleLabel, { color: mode === "ai" ? "#fff" : C.textMuted }]}>
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
  const C = useColors();

  // ── Data ──────────────────────────────────────────────────────────────────
  const feed = useQuery(api.feed.listUnifiedFeed, { limit: 20 });
  const aiFeedResult = useQuery(api.feedAI.listUnifiedFeedAI, { limit: 20, useAI: true });
  const recentUnread = useQuery(api.notifications.getRecentUnreadNotifications, { limit: 5 });
  const currentUser = useQuery(api.users.viewer);
  const persistedFeedMode = useQuery(api.users.getFeedMode);
  const setFeedModeMutation = useMutation(api.users.setFeedMode);
  const generateRecommendations = useAction(api.feedAI.generateFeedRecommendations);
  const clearFeedCache = useMutation(api.aiRecommendations.clearFeedRecommendationCache);

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
  // Optimistic pending write — only alive for the few hundred ms until the
  // Convex mutation round-trips. After that, persistedFeedMode takes over.
  // This means ALL devices always reflect the server truth.
  const [pendingMode, setPendingMode] = useState<FeedMode | null>(null);
  // Whether we've kicked off an on-demand AI ranking for this session
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [debugVisible, setDebugVisible] = useState(false);
  const [debugTab, setDebugTab] = useState<"status" | "for_you_items" | "ai_items">("status");
  // non-narrowed alias to prevent TS false-positive narrowing in JSX conditionals
  const activeDebugTab: string = debugTab;
  const [lastGenResult, setLastGenResult] = useState<any>(null);
  const [lastGenError, setLastGenError] = useState<string | null>(null);
  const hasTriggeredGeneration = useRef(false);

  // Clear pending once the server value catches up
  useEffect(() => {
    if (pendingMode !== null && persistedFeedMode === pendingMode) {
      setPendingMode(null);
    }
  }, [persistedFeedMode, pendingMode]);

  // feedMode: use pending (optimistic) if we just wrote, else authoritative server value
  const feedMode: FeedMode = pendingMode ?? persistedFeedMode ?? "for_you";

  // ── On-demand AI ranking ──────────────────────────────────────────────────
  // Triggered when the user enters AI mode and the feed isn't personalised yet.
  // Runs once per session — the result is cached in Convex for 6 hours and
  // the reactive query (aiFeedResult) updates automatically when the cache lands.
  useEffect(() => {
    if (
      feedMode === "ai" &&
      !aiIsPersonalised &&
      !hasTriggeredGeneration.current &&
      currentUser?._id &&
      aiFeedResult !== undefined // query has resolved (not still loading)
    ) {
      hasTriggeredGeneration.current = true;
      setIsGeneratingAI(true);
      setLastGenResult(null);
      setLastGenError(null);
      setAiUnavailable(false);
      generateRecommendations({ userId: currentUser._id as any })
        .then((result) => {
          setLastGenResult(result);
          console.log("[AI feed] generation result:", result);
          // API is considered unavailable when it explicitly failed to reach Nova
          // (no key, bad response, network error). If success or no_content/no_profile,
          // those are data issues — not API unavailability.
          const apiFailureReasons = ["no_nova_key", "empty_ranker_response"];
          if (result && result.success === false && apiFailureReasons.includes(result.reason ?? "")) {
            setAiUnavailable(true);
          }
        })
        .catch((err) => {
          // Action threw — network-level failure, treat as unavailable
          setLastGenError(String(err));
          setAiUnavailable(true);
          console.warn("[AI feed] generation failed:", err);
        })
        .finally(() => setIsGeneratingAI(false));
    }
  }, [feedMode, aiIsPersonalised, currentUser?._id, aiFeedResult]);

  const handleModeChange = useCallback(
    (newMode: FeedMode) => {
      setPendingMode(newMode); // optimistic — clears automatically when server confirms
      setFeedModeMutation({ mode: newMode }).catch(() => {
        // revert on error
        setPendingMode(null);
      });
    },
    [setFeedModeMutation]
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
    const activeFeedItems = feedMode === "ai" ? (aiFeed ?? []) : (feed ?? []);
    const item = activeFeedItems.find((f) => f._id === articleId);
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
            {/* DEBUG TAP ZONE — dev only, hidden in production builds */}
            {__DEV__ && (
              <TouchableOpacity
                onPress={() => setDebugVisible((v) => !v)}
                style={styles.debugTrigger}
                accessibilityLabel="Toggle debug panel"
              >
                <Ionicons name="bug-outline" size={15} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </RNView>

          {/* DEBUG PANEL — dev only, never ships to production */}
          {__DEV__ && debugVisible && (
            <RNView style={styles.debugPanel}>
              {/* Header */}
              <Text style={styles.debugTitle}>🐛 AI Feed Debug</Text>

              {/* Tab switcher */}
              <RNView style={styles.debugTabRow}>
                {(["status", "for_you_items", "ai_items"] as const).map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.debugTabBtn, activeDebugTab === tab && styles.debugTabBtnActive]}
                    onPress={() => setDebugTab(tab as any)}
                  >
                    <Text style={[styles.debugTabLabel, activeDebugTab === tab && styles.debugTabLabelActive]}>
                      {tab === "status" ? "Status" : tab === "for_you_items" ? "For You" : "AI Items"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </RNView>

              {/* STATUS TAB */}
              {activeDebugTab === "status" && (
                <RNView>
                  <Text style={styles.debugLine}>persisted mode: <Text style={styles.debugVal}>{String(persistedFeedMode)}</Text></Text>
                  <Text style={styles.debugLine}>pending mode: <Text style={styles.debugVal}>{String(pendingMode)}</Text></Text>
                  <Text style={styles.debugLine}>active mode: <Text style={styles.debugVal}>{feedMode}</Text></Text>
                  <Text style={styles.debugLine}>aiFeedResult shape: <Text style={styles.debugVal}>{aiFeedResult === undefined ? "⏳ loading" : Array.isArray(aiFeedResult) ? "array (fallback)" : `object (source: ${(aiFeedResult as any)?.source})`}</Text></Text>
                  <Text style={styles.debugLine}>aiIsPersonalised: <Text style={styles.debugVal}>{String(aiIsPersonalised)}</Text></Text>
                  <Text style={styles.debugLine}>isGeneratingAI: <Text style={styles.debugVal}>{String(isGeneratingAI)}</Text></Text>
                  <Text style={styles.debugLine}>aiFeed count: <Text style={styles.debugVal}>{aiFeed?.length ?? "—"}</Text></Text>
                  <Text style={styles.debugLine}>for-you feed count: <Text style={styles.debugVal}>{feed?.length ?? "—"}</Text></Text>
                  <Text style={styles.debugLine}>userId: <Text style={[styles.debugVal, { fontSize: 9 }]}>{currentUser?._id ?? "—"}</Text></Text>

                  {/* Last generation result */}
                  {lastGenResult !== null && (
                    <RNView style={styles.debugResultBox}>
                      <Text style={styles.debugLine}>Last gen result:</Text>
                      <Text style={[styles.debugVal, { fontSize: 10 }]}>{JSON.stringify(lastGenResult, null, 2)}</Text>
                    </RNView>
                  )}
                  {lastGenError !== null && (
                    <RNView style={[styles.debugResultBox, { borderColor: "#f87171" }]}>
                      <Text style={[styles.debugLine, { color: "#f87171" }]}>Last gen ERROR:</Text>
                      <Text style={[styles.debugVal, { fontSize: 10, color: "#f87171" }]}>{lastGenError}</Text>
                    </RNView>
                  )}

                  {/* Action buttons */}
                  <TouchableOpacity
                    style={styles.debugButton}
                    onPress={() => {
                      if (!currentUser?._id) return;
                      hasTriggeredGeneration.current = false;
                      setIsGeneratingAI(true);
                      setLastGenResult(null);
                      setLastGenError(null);
                      setAiUnavailable(false);
                      generateRecommendations({ userId: currentUser._id as any })
                        .then((r) => {
                          setLastGenResult(r);
                          const apiFailureReasons = ["no_nova_key", "empty_ranker_response"];
                          if (r && r.success === false && apiFailureReasons.includes(r.reason ?? "")) {
                            setAiUnavailable(true);
                          }
                        })
                        .catch((e) => { setLastGenError(String(e)); setAiUnavailable(true); })
                        .finally(() => setIsGeneratingAI(false));
                    }}
                  >
                    <Text style={styles.debugButtonText}>
                      {isGeneratingAI ? "⏳ Ranking…" : "⚡ Force Re-rank Now"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.debugButton, styles.debugButtonDanger]}
                    onPress={() => {
                      if (!currentUser?._id) return;
                      setIsClearingCache(true);
                      setAiUnavailable(false);
                      setLastGenResult(null);
                      setLastGenError(null);
                      clearFeedCache()
                        .then(() => {
                          // Immediately re-rank after clearing so the feed repopulates
                          hasTriggeredGeneration.current = false;
                          setIsGeneratingAI(true);
                          return generateRecommendations({ userId: currentUser._id as any });
                        })
                        .then((r) => {
                          setLastGenResult(r);
                          const apiFailureReasons = ["no_nova_key", "empty_ranker_response"];
                          if (r && r.success === false && apiFailureReasons.includes(r.reason ?? "")) {
                            setAiUnavailable(true);
                          }
                        })
                        .catch((e) => { setLastGenError(String(e)); setAiUnavailable(true); })
                        .finally(() => { setIsClearingCache(false); setIsGeneratingAI(false); });
                    }}
                  >
                    <Text style={styles.debugButtonText}>
                      {isClearingCache ? "⏳ Clearing & Ranking…" : "🗑 Clear Cache + Re-rank"}
                    </Text>
                  </TouchableOpacity>
                </RNView>
              )}

              {/* FOR YOU ITEMS TAB */}
              {activeDebugTab === "for_you_items" && (
                <RNView>
                  <Text style={styles.debugLine}>Showing {feed?.length ?? 0} items (chronological)</Text>
                  {(feed ?? []).map((item: any, i: number) => (
                    <RNView key={item._id} style={styles.debugItemRow}>
                      <Text style={styles.debugItemIndex}>{i + 1}</Text>
                      <RNView style={{ flex: 1 }}>
                        <Text style={styles.debugItemTitle} numberOfLines={1}>
                          [{item.contentType ?? (item.title ? "article" : "reel")}] {item.title || item.caption || "(no title)"}
                        </Text>
                        <Text style={styles.debugItemMeta}>id: {item._id}</Text>
                        <Text style={styles.debugItemMeta}>author: {item.author?.username ?? item.author?.name ?? item.authorId}</Text>
                        <Text style={styles.debugItemMeta}>created: {item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 16) : "—"}</Text>
                      </RNView>
                    </RNView>
                  ))}
                </RNView>
              )}

              {/* AI ITEMS TAB */}
              {activeDebugTab === "ai_items" && (
                <RNView>
                  <Text style={styles.debugLine}>
                    Showing {aiFeed?.length ?? 0} items — source: <Text style={styles.debugVal}>{(aiFeedResult as any)?.source ?? (Array.isArray(aiFeedResult) ? "array/fallback" : "unknown")}</Text>
                  </Text>
                  <Text style={[styles.debugLine, { marginBottom: 4 }]}>
                    personalised: <Text style={styles.debugVal}>{String(aiIsPersonalised)}</Text>
                  </Text>
                  {(aiFeed ?? []).map((item: any, i: number) => (
                    <RNView key={item._id} style={styles.debugItemRow}>
                      <Text style={styles.debugItemIndex}>{i + 1}</Text>
                      <RNView style={{ flex: 1 }}>
                        <Text style={styles.debugItemTitle} numberOfLines={1}>
                          [{item.contentType ?? (item.title ? "article" : "reel")}] {item.title || item.caption || "(no title)"}
                        </Text>
                        <Text style={styles.debugItemMeta}>id: {item._id}</Text>
                        <Text style={styles.debugItemMeta}>author: {item.author?.username ?? item.author?.name ?? item.authorId}</Text>
                        <Text style={styles.debugItemMeta}>created: {item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 16) : "—"}</Text>
                        {/* Show if IDs match the for-you feed at same position */}
                        {feed?.[i] && feed[i]._id !== item._id && (
                          <Text style={[styles.debugItemMeta, { color: "#86efac" }]}>✓ different from For You pos {i + 1}</Text>
                        )}
                        {feed?.[i] && feed[i]._id === item._id && (
                          <Text style={[styles.debugItemMeta, { color: "#f87171" }]}>✗ SAME as For You pos {i + 1}</Text>
                        )}
                      </RNView>
                    </RNView>
                  ))}
                </RNView>
              )}
            </RNView>
          )}
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
          /* ── AI feed ─────────────────────────────────────────────── */
          /* If AI is unavailable and we have no cached personalised feed, show error screen */
          aiUnavailable && !aiIsPersonalised ? (
            <RNView style={[styles.aiUnavailableContainer, { backgroundColor: C.bgBase }]}>
              <Ionicons name="cloud-offline-outline" size={48} color={C.textMuted} style={{ marginBottom: 16 }} />
              <Text style={[styles.aiUnavailableTitle, { color: C.textPrimary }]}>AI is currently not available</Text>
              <Text style={[styles.aiUnavailableSubtitle, { color: C.textMuted }]}>Please try again later</Text>
              <TouchableOpacity
                style={styles.aiRetryButton}
                onPress={() => {
                  if (!currentUser?._id) return;
                  hasTriggeredGeneration.current = false;
                  setAiUnavailable(false);
                  setIsGeneratingAI(true);
                  setLastGenResult(null);
                  setLastGenError(null);
                  generateRecommendations({ userId: currentUser._id as any })
                    .then((r) => {
                      setLastGenResult(r);
                      const apiFailureReasons = ["no_nova_key", "empty_ranker_response"];
                      if (r && r.success === false && apiFailureReasons.includes(r.reason ?? "")) {
                        setAiUnavailable(true);
                      }
                    })
                    .catch((e) => { setLastGenError(String(e)); setAiUnavailable(true); })
                    .finally(() => setIsGeneratingAI(false));
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.aiRetryButtonText}>Try again</Text>
              </TouchableOpacity>
            </RNView>
          ) : (
            <FlatList
            data={aiFeed ?? []}
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
            ListHeaderComponent={
              aiIsPersonalised ? (
                <RNView style={styles.aiBadgeRow}>
                  <Ionicons name="sparkles" size={13} color={C.blue} />
                  <Text style={styles.aiBadgeText}>Ranked for you</Text>
                </RNView>
              ) : isGeneratingAI ? (
                <RNView style={styles.aiBadgeRow}>
                  <Ionicons name="sparkles-outline" size={13} color={C.textMuted} />
                  <Text style={[styles.aiBadgeText, { color: C.textMuted }]}>Ranking your feed…</Text>
                </RNView>
              ) : null
            }
            ListEmptyComponent={
              aiFeedResult === undefined || isGeneratingAI ? (
                <LoadingSpinner label={isGeneratingAI ? "AI is ranking your feed…" : "Loading feed…"} />
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
        ) /* end aiUnavailable ternary */
        )}

        {/* ── Floating action buttons — inside card, bottom-right ───── */}
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

  // AI badge row
  aiBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.blue,
    letterSpacing: 0.3,
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

  // Debug panel — temporary
  debugTrigger: {
    marginLeft: 8,
    padding: 4,
    opacity: 0.5,
  },
  debugPanel: {
    backgroundColor: "rgba(0,0,0,0.92)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxHeight: 420,
    overflow: "scroll" as any,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#facc15",
    marginBottom: 6,
  },
  debugTabRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  debugTabBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  debugTabBtnActive: {
    backgroundColor: Colors.blue,
    borderColor: Colors.blue,
  },
  debugTabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  debugTabLabelActive: {
    color: "#fff",
  },
  debugLine: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 2,
  },
  debugVal: {
    color: "#86efac",
    fontWeight: "600",
  },
  debugResultBox: {
    marginTop: 6,
    marginBottom: 4,
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#86efac",
    backgroundColor: "rgba(134,239,172,0.05)",
  },
  debugButton: {
    marginTop: 8,
    backgroundColor: Colors.blue,
    borderRadius: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  debugButtonDanger: {
    backgroundColor: "#7f1d1d",
  },
  debugButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  debugItemRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  debugItemIndex: {
    fontSize: 10,
    fontWeight: "700",
    color: "#facc15",
    width: 18,
    paddingTop: 1,
  },
  debugItemTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 1,
  },
  debugItemMeta: {
    fontSize: 9,
    color: "rgba(255,255,255,0.4)",
  },
});
