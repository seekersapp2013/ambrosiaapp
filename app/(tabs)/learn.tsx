/**
 * Learn Tab
 * Course-centric content feed.
 *
 * "All Content" tab — uses the same For You / AI dual-feed pattern as
 * for-you.tsx, but filters to ONLY show content that belongs to a course.
 * Items without courseInfo are excluded.
 *
 * "My Courses" / "Enrolled" tabs — unchanged, scoped by the backend.
 *
 * Gated content opens ContentPaywallSheet inline.
 * Payment auto-enrolls the user into the associated course (handled in payments.ts).
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  SafeAreaView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useAction } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard, useCardInsets } from "@/components/MobileCard";
import { TopNav } from "@/components/TopNav";
import { ContentCard } from "@/components/stream/ContentCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { LoadingSpinner } from "@/components/stream/LoadingSpinner";
import { ContentPaywallSheet } from "@/components/ContentPaywallSheet";
import { Colors } from "@/constants/Colors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = "all" | "my-courses" | "enrolled";
type FeedMode = "for_you" | "ai";

interface PaywallTarget {
  articleId: string;
  title: string;
  price: number;
  currency: string;
  creatorName?: string;
}

// ─── Feed Mode Toggle (mirrored from for-you.tsx) ─────────────────────────────
const PILL_WIDTH = 76;
const TOGGLE_HEIGHT = 34;

interface FeedModeToggleProps {
  mode: FeedMode;
  onChange: (mode: FeedMode) => void;
}

function FeedModeToggle({ mode, onChange }: FeedModeToggleProps) {
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
    outputRange: [2, PILL_WIDTH + 4],
  });

  return (
    <View style={toggleStyles.track} accessibilityRole="switch" accessibilityLabel="Feed mode toggle">
      <Animated.View
        style={[
          toggleStyles.pill,
          { transform: [{ translateX: pillTranslate }] },
          mode === "ai" ? toggleStyles.pillAI : toggleStyles.pillForYou,
        ]}
      />
      <TouchableOpacity
        style={toggleStyles.option}
        onPress={() => onChange("for_you")}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="For You feed"
        accessibilityState={{ selected: mode === "for_you" }}
      >
        <Ionicons name="newspaper-outline" size={13} color={mode === "for_you" ? "#fff" : Colors.textMuted} />
        <Text style={[toggleStyles.label, mode === "for_you" && toggleStyles.labelActive]}>For You</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={toggleStyles.option}
        onPress={() => onChange("ai")}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="AI curated feed"
        accessibilityState={{ selected: mode === "ai" }}
      >
        <Ionicons name="sparkles-outline" size={13} color={mode === "ai" ? "#fff" : Colors.textMuted} />
        <Text style={[toggleStyles.label, mode === "ai" && toggleStyles.labelActive]}>AI</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LearnScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [feedMode, setFeedMode] = useState<FeedMode>("for_you");
  const [showManageSheet, setShowManageSheet] = useState(false);
  const [paywallTarget, setPaywallTarget] = useState<PaywallTarget | null>(null);
  const cardInsets = useCardInsets();

  // ── AI feed state (same pattern as for-you.tsx) ───────────────────────────
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

  // ── Queries ───────────────────────────────────────────────────────────────
  // For You feed — all published content (we filter to course-only below)
  const forYouRaw = useQuery(api.feed.listUnifiedFeed, { limit: 50 });

  // AI feed
  const aiFeedResult = useQuery(api.feedAI.listUnifiedFeedAI, { limit: 50, useAI: true });

  // Courses list for the manage sheet
  const myCourses = useQuery(api.courses.getMyCourses, { limit: 50 });

  // Current user
  const currentUser = useQuery(api.users.viewer);

  // AI action
  const generateRecommendations = useAction(api.feedAI.generateFeedRecommendations);
  const clearFeedCache = useMutation(api.aiRecommendations.clearFeedRecommendationCache);

  // ── Unwrap AI feed (same logic as for-you.tsx) ────────────────────────────
  const aiFeedRaw = aiFeedResult as any;
  const aiFeedItems: any[] | undefined = aiFeedResult === undefined
    ? undefined
    : Array.isArray(aiFeedRaw)
      ? aiFeedRaw
      : aiFeedRaw?.items ?? [];
  const aiIsPersonalised = !Array.isArray(aiFeedRaw) && aiFeedRaw?.useAI === true;

  // ── Filter helper: keep only items that belong to a course ────────────────
  // courseInfo is set by batchCourseInfo in feed.ts / courses.ts when an item
  // has a corresponding row in courseContent. null / undefined = not in a course.
  function onlyCourseContent(items: any[] | undefined): any[] {
    if (!items) return [];
    return items.filter((item) => item.courseInfo != null);
  }

  // ── Derived feed arrays (course-filtered) ────────────────────────────────
  const forYouFeed = React.useMemo(() => onlyCourseContent(forYouRaw ?? []), [forYouRaw]);
  const aiFeed     = React.useMemo(() => onlyCourseContent(aiFeedItems), [aiFeedItems]);

  const isLoading = viewMode !== "all"
    ? false // my-courses / enrolled use feedData below
    : feedMode === "for_you"
      ? forYouRaw === undefined
      : aiFeedResult === undefined;

  // ── My Courses / Enrolled still use the existing backend query ─────────────
  const feedData = useQuery(
    api.courses.getCourseRelatedContent,
    viewMode !== "all" ? { limit: 50, viewMode } : "skip"
  );

  const otherFeedItems: any[] = React.useMemo(() => {
    if (viewMode === "all" || !feedData) return [];
    const articles = (feedData.articles ?? []).map((a: any) => ({ ...a, contentType: "article" as const }));
    const reels    = (feedData.reels    ?? []).map((r: any) => ({ ...r, contentType: "reel"    as const }));
    return [...articles, ...reels].sort((a, b) => b.createdAt - a.createdAt);
  }, [feedData, viewMode]);

  // ── On-demand AI ranking (same pattern as for-you.tsx) ────────────────────
  useEffect(() => {
    if (
      viewMode === "all" &&
      feedMode === "ai" &&
      !aiIsPersonalised &&
      !hasTriggeredGeneration.current &&
      currentUser?._id &&
      aiFeedResult !== undefined
    ) {
      hasTriggeredGeneration.current = true;
      setIsGeneratingAI(true);
      setAiUnavailable(false);
      setLastGenResult(null);
      setLastGenError(null);
      generateRecommendations({ userId: currentUser._id as any })
        .then((result) => {
          setLastGenResult(result);
          const apiFailureReasons = ["no_nova_key", "empty_ranker_response"];
          if (result && result.success === false && apiFailureReasons.includes(result.reason ?? "")) {
            setAiUnavailable(true);
          }
        })
        .catch((err) => {
          setLastGenError(String(err));
          setAiUnavailable(true);
        })
        .finally(() => setIsGeneratingAI(false));
    }
  }, [viewMode, feedMode, aiIsPersonalised, currentUser?._id, aiFeedResult]);

  // ── Gated article tap handler ─────────────────────────────────────────────
  function handleGatedArticlePress(articleId: string) {
    const activeFeed = viewMode === "all"
      ? (feedMode === "ai" ? aiFeed : forYouFeed)
      : otherFeedItems;
    const item = activeFeed.find((f) => f._id === articleId);
    if (!item) return;

    // Content creator can always access their own content — bypass paywall
    if (currentUser && (item as any).authorId === currentUser._id) {
      history.push("/(tabs)/learn");
      router.push({ pathname: "/(tabs)/article-viewer" as any, params: { articleId } });
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

  const handleArticlePress = useCallback(
    (articleId: string) => {
      history.push("/(tabs)/learn");
      router.push({ pathname: "/(tabs)/article-viewer" as any, params: { articleId } });
    },
    [router, history]
  );

  const handleReelPress = useCallback(
    (_reelId: string) => {
      history.push("/(tabs)/learn");
      router.push("/(tabs)/pulse" as any);
    },
    [router, history]
  );

  const handleManageCoursePress = useCallback(
    (courseId: string) => {
      setShowManageSheet(false);
      history.push("/(tabs)/learn");
      router.push({ pathname: "/(tabs)/edit-course" as any, params: { courseId } });
    },
    [router, history]
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <ContentCard
        item={item}
        currentUserId={currentUser?._id}
        onArticlePress={handleArticlePress}
        onPulsePress={handleReelPress}
        onGatedArticlePress={handleGatedArticlePress}
        onDeleteSuccess={() => {}}
      />
    ),
    [handleArticlePress, handleReelPress, currentUser?._id, paywallTarget]
  );

  // ── Which feed array to render in the "all" tab ───────────────────────────
  const allTabFeed = feedMode === "for_you" ? forYouFeed : aiFeed;

  const emptyMessages: Record<ViewMode, { title: string; subtitle: string }> = {
    all: {
      title: "No course content yet",
      subtitle: "Articles and reels assigned to a course will appear here.",
    },
    "my-courses": {
      title: "No course content yet",
      subtitle: "Create a course and add content to see it here.",
    },
    enrolled: {
      title: "Not enrolled in any courses",
      subtitle: "Browse and enroll in courses to see their content here.",
    },
  };

  const empty = emptyMessages[viewMode];

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <MobileCard style={styles.card} containerStyle={styles.cardContainer}>
          {/* ── Header ── */}
          <TopNav />

          {/* ── Creation Bar ── */}
          <View style={styles.creationBar}>
            <CreationCircle
              icon="create-outline"
              label="Article"
              color={Colors.primary}
              onPress={() => { history.push("/(tabs)/learn"); router.push("/(tabs)/write-article" as any); }}
            />
            <CreationCircle
              icon="videocam-outline"
              label="Pulse"
              color={Colors.palette.purple}
              onPress={() => { history.push("/(tabs)/learn"); router.push("/(tabs)/write-reel" as any); }}
            />
            <CreationCircle
              icon="school-outline"
              label="Course"
              color={Colors.palette.blue}
              onPress={() => { history.push("/(tabs)/learn"); router.push("/(tabs)/create-course" as any); }}
            />
            <CreationCircle
              icon="settings-outline"
              label="Manage"
              color={Colors.palette.green}
              onPress={() => setShowManageSheet(true)}
            />
          </View>

          {/* ── View Mode Strip ── */}
          <View style={styles.viewModeStrip}>
            {(["all", "my-courses", "enrolled"] as ViewMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.viewModeTab, viewMode === mode && styles.viewModeTabActive]}
                onPress={() => setViewMode(mode)}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: viewMode === mode }}
              >
                <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>
                  {mode === "all" ? "All Content" : mode === "my-courses" ? "My Courses" : "Enrolled"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── For You / AI toggle — only on "all" tab ── */}
          {viewMode === "all" && (
            <View style={styles.toggleRow}>
              <FeedModeToggle mode={feedMode} onChange={setFeedMode} />
              {/* DEBUG tap zone — dev only */}
              {__DEV__ && (
                <TouchableOpacity
                  onPress={() => setDebugVisible((v) => !v)}
                  style={styles.debugTrigger}
                  accessibilityLabel="Toggle debug panel"
                >
                  <Ionicons name="bug-outline" size={15} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* DEBUG PANEL — dev only, never ships to production */}
          {__DEV__ && viewMode === "all" && debugVisible && (
            <View style={styles.debugPanel}>
              <Text style={styles.debugTitle}>🐛 Learn Feed Debug</Text>

              {/* Tab switcher */}
              <View style={styles.debugTabRow}>
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
              </View>

              {/* STATUS TAB */}
              {activeDebugTab === "status" && (
                <View>
                  <Text style={styles.debugLine}>feed mode: <Text style={styles.debugVal}>{feedMode}</Text></Text>
                  <Text style={styles.debugLine}>aiFeedResult shape: <Text style={styles.debugVal}>{aiFeedResult === undefined ? "⏳ loading" : Array.isArray(aiFeedResult) ? "array (fallback)" : `object (source: ${(aiFeedResult as any)?.source})`}</Text></Text>
                  <Text style={styles.debugLine}>aiIsPersonalised: <Text style={styles.debugVal}>{String(aiIsPersonalised)}</Text></Text>
                  <Text style={styles.debugLine}>isGeneratingAI: <Text style={styles.debugVal}>{String(isGeneratingAI)}</Text></Text>
                  <Text style={styles.debugLine}>aiUnavailable: <Text style={styles.debugVal}>{String(aiUnavailable)}</Text></Text>
                  <Text style={styles.debugLine}>forYouRaw count: <Text style={styles.debugVal}>{forYouRaw?.length ?? "—"}</Text></Text>
                  <Text style={styles.debugLine}>forYouFeed (course-filtered): <Text style={styles.debugVal}>{forYouFeed.length}</Text></Text>
                  <Text style={styles.debugLine}>aiFeedItems count: <Text style={styles.debugVal}>{aiFeedItems?.length ?? "—"}</Text></Text>
                  <Text style={styles.debugLine}>aiFeed (course-filtered): <Text style={styles.debugVal}>{aiFeed.length}</Text></Text>
                  <Text style={styles.debugLine}>userId: <Text style={[styles.debugVal, { fontSize: 9 }]}>{currentUser?._id ?? "—"}</Text></Text>

                  {lastGenResult !== null && (
                    <View style={styles.debugResultBox}>
                      <Text style={styles.debugLine}>Last gen result:</Text>
                      <Text style={[styles.debugVal, { fontSize: 10 }]}>{JSON.stringify(lastGenResult, null, 2)}</Text>
                    </View>
                  )}
                  {lastGenError !== null && (
                    <View style={[styles.debugResultBox, { borderColor: "#f87171" }]}>
                      <Text style={[styles.debugLine, { color: "#f87171" }]}>Last gen ERROR:</Text>
                      <Text style={[styles.debugVal, { fontSize: 10, color: "#f87171" }]}>{lastGenError}</Text>
                    </View>
                  )}

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
                    <Text style={styles.debugButtonText}>{isGeneratingAI ? "⏳ Ranking…" : "⚡ Force Re-rank Now"}</Text>
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
                    <Text style={styles.debugButtonText}>{isClearingCache ? "⏳ Clearing & Ranking…" : "🗑 Clear Cache + Re-rank"}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* FOR YOU ITEMS TAB */}
              {activeDebugTab === "for_you_items" && (
                <View>
                  <Text style={styles.debugLine}>Raw: {forYouRaw?.length ?? 0} — After course filter: {forYouFeed.length}</Text>
                  {forYouFeed.map((item: any, i: number) => (
                    <View key={item._id} style={styles.debugItemRow}>
                      <Text style={styles.debugItemIndex}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.debugItemTitle} numberOfLines={1}>
                          [{item.contentType}] {item.title || item.caption || "(no title)"}
                        </Text>
                        <Text style={styles.debugItemMeta}>id: {item._id}</Text>
                        <Text style={styles.debugItemMeta}>course: {item.courseInfo?.courseTitle ?? "—"}</Text>
                        <Text style={styles.debugItemMeta}>author: {item.author?.username ?? item.author?.name ?? item.authorId}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* AI ITEMS TAB */}
              {activeDebugTab === "ai_items" && (
                <View>
                  <Text style={styles.debugLine}>
                    Raw AI items: {aiFeedItems?.length ?? 0} — After course filter: {aiFeed.length}
                    {" "}source: <Text style={styles.debugVal}>{(aiFeedResult as any)?.source ?? (Array.isArray(aiFeedResult) ? "array/fallback" : "unknown")}</Text>
                  </Text>
                  <Text style={[styles.debugLine, { marginBottom: 4 }]}>
                    personalised: <Text style={styles.debugVal}>{String(aiIsPersonalised)}</Text>
                  </Text>
                  {aiFeed.map((item: any, i: number) => (
                    <View key={item._id} style={styles.debugItemRow}>
                      <Text style={styles.debugItemIndex}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.debugItemTitle} numberOfLines={1}>
                          [{item.contentType}] {item.title || item.caption || "(no title)"}
                        </Text>
                        <Text style={styles.debugItemMeta}>id: {item._id}</Text>
                        <Text style={styles.debugItemMeta}>course: {item.courseInfo?.courseTitle ?? "—"}</Text>
                        <Text style={styles.debugItemMeta}>author: {item.author?.username ?? item.author?.name ?? item.authorId}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ── Content Feed ── */}
          {viewMode === "all" ? (
            /* ── ALL TAB: For You / AI feeds, course-filtered ── */
            feedMode === "ai" && aiUnavailable && !aiIsPersonalised ? (
              /* AI unavailable error state */
              <View style={styles.aiUnavailableContainer}>
                <Ionicons name="cloud-offline-outline" size={48} color={Colors.textMuted} style={{ marginBottom: 16 }} />
                <Text style={styles.aiUnavailableTitle}>AI is currently not available</Text>
                <Text style={styles.aiUnavailableSubtitle}>Please try again later</Text>
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
              </View>
            ) : isLoading ? (
              <LoadingSpinner label={feedMode === "ai" && isGeneratingAI ? "AI is ranking your feed…" : "Loading feed…"} />
            ) : (
              <FlatList
                data={allTabFeed}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  feedMode === "ai" && aiIsPersonalised ? (
                    <View style={styles.aiBadgeRow}>
                      <Ionicons name="sparkles" size={13} color={Colors.blue} />
                      <Text style={styles.aiBadgeText}>Ranked for you</Text>
                    </View>
                  ) : feedMode === "ai" && isGeneratingAI ? (
                    <View style={styles.aiBadgeRow}>
                      <Ionicons name="sparkles-outline" size={13} color={Colors.textMuted} />
                      <Text style={[styles.aiBadgeText, { color: Colors.textMuted }]}>Ranking your feed…</Text>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <EmptyState
                    icon="school-outline"
                    title={empty.title}
                    subtitle={empty.subtitle}
                    ctaLabel="Create a Course"
                    onCta={() => { history.push("/(tabs)/learn"); router.push("/(tabs)/create-course" as any); }}
                  />
                }
              />
            )
          ) : (
            /* ── MY COURSES / ENROLLED TABS ── */
            feedData === undefined ? (
              <LoadingSpinner label="Loading content…" />
            ) : (
              <FlatList
                data={otherFeedItems}
                keyExtractor={(item) => item._id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <EmptyState
                    icon="school-outline"
                    title={empty.title}
                    subtitle={empty.subtitle}
                  />
                }
              />
            )
          )}
        </MobileCard>
      </SafeAreaView>

      {/* ── Manage Courses Bottom Sheet ── */}
      <ManageCoursesSheet
        visible={showManageSheet}
        courses={myCourses ?? []}
        onClose={() => setShowManageSheet(false)}
        onCreateCourse={() => {
          setShowManageSheet(false);
          history.push("/(tabs)/learn");
          router.push("/(tabs)/create-course" as any);
        }}
        onCoursePress={handleManageCoursePress}
        cardLeft={cardInsets.left}
        cardRight={cardInsets.right}
      />

      {/* ── Inline paywall for gated content ── */}
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
            // Payment auto-enrolls user in the associated course (payments.ts)
            // Navigate to article viewer — access is now granted
            history.push("/(tabs)/learn");
            router.push({ pathname: "/(tabs)/article-viewer" as any, params: { articleId } });
          }
        }}
      />
    </AppBackground>
  );
}

// ─── Creation Circle ──────────────────────────────────────────────────────────
interface CreationCircleProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}

function CreationCircle({ icon, label, color, onPress }: CreationCircleProps) {
  return (
    <TouchableOpacity
      style={styles.creationItem}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={[styles.creationCircle, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <Text style={styles.creationLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Manage Courses Sheet ─────────────────────────────────────────────────────
interface ManageCoursesSheetProps {
  visible: boolean;
  courses: any[];
  onClose: () => void;
  onCreateCourse: () => void;
  onCoursePress: (courseId: string) => void;
  cardLeft?: number;
  cardRight?: number;
}

function ManageCoursesSheet({
  visible,
  courses,
  onClose,
  onCreateCourse,
  onCoursePress,
  cardLeft = 0,
  cardRight = 0,
}: ManageCoursesSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.sheetOverlay}
        activeOpacity={1}
        onPress={onClose}
      />
      <View style={[styles.sheet, { left: cardLeft, right: cardRight }]}>
        {/* Sheet handle */}
        <View style={styles.sheetHandle} />

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>My Courses</Text>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Create Course row */}
        <TouchableOpacity
          style={styles.createCourseRow}
          onPress={onCreateCourse}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Create new course"
        >
          <View style={styles.createCourseIcon}>
            <Ionicons name="add" size={20} color={Colors.palette.blue} />
          </View>
          <Text style={styles.createCourseText}>+ Create New Course</Text>
        </TouchableOpacity>

        {/* Course list */}
        <FlatList
          data={courses}
          keyExtractor={(c) => c._id}
          style={styles.sheetList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.sheetEmpty}>
              <Text style={styles.sheetEmptyText}>No courses yet. Create your first one!</Text>
            </View>
          }
          renderItem={({ item: course }) => (
            <TouchableOpacity
              style={styles.courseRow}
              onPress={() => onCoursePress(course._id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Edit course: ${course.title}`}
            >
              <View style={styles.courseRowInfo}>
                <Text style={styles.courseRowTitle} numberOfLines={1}>
                  {course.title}
                </Text>
                <View style={styles.courseRowMeta}>
                  <View
                    style={[
                      styles.statusBadge,
                      course.isPublished ? styles.publishedBadge : styles.draftBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        course.isPublished
                          ? styles.publishedBadgeText
                          : styles.draftBadgeText,
                      ]}
                    >
                      {course.isPublished ? "Published" : "Draft"}
                    </Text>
                  </View>
                  <Text style={styles.courseRowStat}>
                    {course.contentCount ?? 0} items
                  </Text>
                  {(course.enrollmentCount ?? 0) > 0 && (
                    <Text style={styles.courseRowStat}>
                      {course.enrollmentCount} enrolled
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

// ─── Feed mode toggle styles ──────────────────────────────────────────────────
const toggleStyles = StyleSheet.create({
  track: {
    flexDirection: "row",
    alignItems: "center",
    height: TOGGLE_HEIGHT,
    width: PILL_WIDTH * 2 + 8,
    borderRadius: TOGGLE_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 2,
    overflow: "hidden",
    position: "relative",
  },
  pill: {
    position: "absolute",
    top: 2,
    width: PILL_WIDTH,
    height: TOGGLE_HEIGHT - 4,
    borderRadius: (TOGGLE_HEIGHT - 4) / 2,
  },
  pillForYou: { backgroundColor: Colors.primary },
  pillAI:     { backgroundColor: Colors.blue },
  option: {
    width: PILL_WIDTH,
    height: TOGGLE_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    zIndex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    letterSpacing: 0.2,
  },
  labelActive: { color: "#fff" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  cardContainer: {
    flex: 1,
    paddingVertical: 0,
  },
  card: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.redBorder,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Creation bar
  creationBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.bgSurface,
  },
  creationItem: {
    alignItems: "center",
    gap: 6,
  },
  creationCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  creationLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textSecondary,
  },

  // View mode strip
  viewModeStrip: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.bgSurface,
  },
  viewModeTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
  },
  viewModeTabActive: {
    backgroundColor: Colors.redSurface,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  viewModeTextActive: {
    color: Colors.primary,
    fontWeight: "700",
  },

  // Feed list
  listContent: {
    padding: 16,
    paddingBottom: 120,
  },

  // Toggle row — sits below view mode strip on "all" tab
  toggleRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.bgSurface,
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

  // AI unavailable screen
  aiUnavailableContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 4,
  },
  aiUnavailableTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  aiUnavailableSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
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

  // Debug panel — dev only
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

  // Manage sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.redBorder,
    paddingBottom: 40,
    maxHeight: "75%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDefault,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  sheetList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sheetEmpty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  sheetEmptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Create course row
  createCourseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  createCourseIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.blueSurface,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  createCourseText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.palette.blue,
  },

  // Course row in sheet
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 10,
  },
  courseRowInfo: {
    flex: 1,
    gap: 5,
  },
  courseRowTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  courseRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  publishedBadge: {
    backgroundColor: Colors.statusSuccessBg,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
  },
  draftBadge: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  publishedBadgeText: { color: Colors.statusSuccess },
  draftBadgeText: { color: Colors.textMuted },
  courseRowStat: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
