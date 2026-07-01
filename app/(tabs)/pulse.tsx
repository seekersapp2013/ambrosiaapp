/**
 * Reels Tab Screen
 * Full-screen vertical pager — swipe up/down to navigate reels.
 *
 * Architecture note:
 * The engagement bar is rendered OUTSIDE MobileCard as a sibling overlay
 * on AppBackground. This is required because MobileCard has overflow:hidden
 * which cannot be overridden on Android, and would clip the bar.
 */

import React, { useCallback, useRef, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  ViewToken,
  Platform,
} from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBackground } from "@/components/AppBackground";
import { AppLoader } from "@/components/AppLoader";
import { MobileCard, MOBILE_CARD_ENABLED } from "@/components/MobileCard";
import { ReelFeedItem, ReelItem } from "@/components/ReelFeedItem";
import { ReelEngagementBar } from "@/components/ReelEngagementBar";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { useTabBarHeight } from "@/utils/useDeviceClass";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// ─── Feed ─────────────────────────────────────────────────────────────────────
function ReelsFeed() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTabFocused, setIsTabFocused] = useState(true);
  const flatListRef = useRef<FlatList<ReelItem>>(null);

  const reels = useQuery(api.reels.listReels, { limit: 20 });

  // ── Pause video when leaving this tab, resume when returning ─────────────
  useFocusEffect(
    useCallback(() => {
      setIsTabFocused(true);
      return () => {
        setIsTabFocused(false);
      };
    }, [])
  );

  // ── Card geometry ─────────────────────────────────────────────────────────
  const cardPaddingH = MOBILE_CARD_ENABLED ? 16 : 0;
  const cardMaxWidth = 500;
  const cardWidth = Math.min(SCREEN_W - cardPaddingH * 2, cardMaxWidth);

  // cellHeight = full screen minus the tab bar (+ safe area on Android).
  // Do NOT subtract card vertical padding — the card container is flex:1
  // so the FlatList already fills the remaining height. Using SCREEN_H
  // minus the padding was making each page taller than its container,
  // which broke snap-paging.
  const effectiveTabBarHeight =
    tabBarHeight + (Platform.OS === "android" ? insets.bottom : 0);
  const cellHeight = SCREEN_H - effectiveTabBarHeight - (MOBILE_CARD_ENABLED ? 32 : 0);

  // Right edge of card in screen coordinates
  const cardRight = (SCREEN_W - cardWidth) / 2;

  // ── Active reel for engagement bar ────────────────────────────────────────
  const activeReel = reels && reels.length > 0
    ? (reels as ReelItem[])[activeIndex] ?? null
    : null;

  // Resolve active reel author avatar for engagement bar
  const activeAvatarUrl = useQuery(
    api.files.getFileUrl,
    activeReel?.author?.avatar ? { storageId: activeReel.author.avatar } : "skip"
  );
  const activeHasAccess = useQuery(
    api.payments.hasAccess,
    activeReel ? { contentType: "reel", contentId: activeReel._id } : "skip"
  );

  // ── Viewability ───────────────────────────────────────────────────────────
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  // ── Web nav ───────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!reels || activeIndex >= reels.length - 1) return;
    const next = activeIndex + 1;
    flatListRef.current?.scrollToIndex({ index: next, animated: true });
    setActiveIndex(next);
  }, [reels, activeIndex]);

  const goPrev = useCallback(() => {
    if (activeIndex <= 0) return;
    const prev = activeIndex - 1;
    flatListRef.current?.scrollToIndex({ index: prev, animated: true });
    setActiveIndex(prev);
  }, [activeIndex]);

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item, index }: { item: ReelItem; index: number }) => (
      <ReelFeedItem
        reel={item}
        isActive={index === activeIndex && isTabFocused}
        tabBarHeight={effectiveTabBarHeight}
        cellHeight={cellHeight}
      />
    ),
    [activeIndex, isTabFocused, effectiveTabBarHeight, cellHeight]
  );

  const keyExtractor = useCallback((item: ReelItem) => item._id, []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (reels === undefined) {
    return (
      <AppBackground style={styles.root}>
        <AppLoader />
      </AppBackground>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (reels.length === 0) {
    return (
      <AppBackground style={styles.root}>
        <MobileCard style={styles.emptyCard}>
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={64} color={Colors.iconDisabled} />
            <Text style={styles.emptyTitle} allowFontScaling={false}>
              No reels yet
            </Text>
            <Text style={styles.emptySub} allowFontScaling={false}>
              Be the first to share a Pulse
            </Text>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => router.push("/(tabs)/write-reel")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Create Pulse"
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createBtnText} allowFontScaling={false}>
                Create Pulse
              </Text>
            </TouchableOpacity>
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  // ── Feed ──────────────────────────────────────────────────────────────────
  // Engagement bar bottom — above tab bar
  const engagementBottom = effectiveTabBarHeight + 24;

  return (
    <AppBackground style={styles.root}>
      {/* ── Card: video pager only, no engagement bar inside ─────────── */}
      <MobileCard
        style={styles.feedCard}
        containerStyle={styles.feedCardContainer}
      >
        <FlatList
          ref={flatListRef}
          data={reels as ReelItem[]}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          pagingEnabled
          snapToInterval={cellHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: cellHeight,
            offset: cellHeight * index,
            index,
          })}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={5}
          removeClippedSubviews
          scrollEventThrottle={16}
          bounces={false}
          overScrollMode="never"
          style={{ flex: 1 }}
        />

        {/* Nav dots */}
        <View
          style={[
            styles.dotsContainer,
            { top: insets.top + 48, bottom: effectiveTabBarHeight + 48 },
          ]}
          pointerEvents="none"
        >
          {(reels as ReelItem[]).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Web arrow buttons */}
        {Platform.OS === "web" && (
          <>
            <TouchableOpacity
              style={[styles.arrowBtn, styles.arrowUp]}
              onPress={goPrev}
              disabled={activeIndex === 0}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Previous reel"
            >
              <Ionicons
                name="chevron-up"
                size={22}
                color={activeIndex === 0 ? "rgba(255,255,255,0.3)" : "#fff"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.arrowBtn, styles.arrowDown]}
              onPress={goNext}
              disabled={activeIndex >= (reels?.length ?? 0) - 1}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Next reel"
            >
              <Ionicons
                name="chevron-down"
                size={22}
                color={
                  activeIndex >= (reels?.length ?? 0) - 1
                    ? "rgba(255,255,255,0.3)"
                    : "#fff"
                }
              />
            </TouchableOpacity>
          </>
        )}
      </MobileCard>

      {/* ── Pulse wordmark — top-right, outside card ─────────────────── */}
      <View
        style={[
          styles.wordmarkPill,
          { top: insets.top + 12, right: cardRight + spacing.space4 },
        ]}
        pointerEvents="none"
      >
        <Text style={styles.wordmarkText} allowFontScaling={false}>
          Pulse
        </Text>
      </View>

      {/* ── Engagement bar — OUTSIDE card, never clipped ─────────────── */}
      {activeReel && (
        <View
          style={[
            styles.engagementOverlay,
            {
              right: cardRight + spacing.space3,
              bottom: engagementBottom,
            },
          ]}
          pointerEvents="box-none"
        >
          <ReelEngagementBar
            reel={activeReel}
            hasAccess={activeHasAccess}
            disabled={false}
            resolvedAvatarUrl={activeAvatarUrl}
          />
        </View>
      )}

      {/* ── FAB — OUTSIDE card so it's never clipped either ──────────── */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            right: cardRight + spacing.space4,
            bottom: effectiveTabBarHeight + 16,
          },
        ]}
        onPress={() => router.push("/(tabs)/write-reel")}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create reel"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </AppBackground>
  );
}

// ─── Screen with auth guard ───────────────────────────────────────────────────
export default function ReelsScreen() {
  return (
    <>
      <AuthLoading>
        <AppLoader />
      </AuthLoading>
      <Unauthenticated>
        <Redirect href="/" />
      </Unauthenticated>
      <Authenticated>
        <ReelsFeed />
      </Authenticated>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Card: video pager fills it edge-to-edge
  feedCardContainer: {
    flex: 1,
    paddingVertical: 16,
  },
  feedCard: {
    flex: 1,
    padding: 0,
    backgroundColor: "#000",
  },

  // Empty state
  emptyCard: {
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptySub: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.actionPrimary,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  createBtnText: {
    ...typeScale.labelMD,
    color: "#fff",
  },

  // Nav dots
  dotsContainer: {
    position: "absolute",
    right: 6,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dot: { width: 3, borderRadius: 2 },
  dotActive: { height: 20, backgroundColor: "#fff" },
  dotInactive: { height: 8, backgroundColor: "rgba(255,255,255,0.3)" },

  // Web arrows
  arrowBtn: {
    position: "absolute",
    alignSelf: "center",
    left: 0,
    right: 0,
    marginHorizontal: "auto" as any,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowUp: { top: 12 },
  arrowDown: { bottom: 12 },

  // Engagement bar overlay — sits outside card, never clipped
  engagementOverlay: {
    position: "absolute",
  },

  // Pulse wordmark pill — top-right corner over the card
  wordmarkPill: {
    position: "absolute",
    backgroundColor: Colors.bgBase,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  wordmarkText: {
    ...typeScale.headingMD,
    color: Colors.statusInfo,
    textShadowColor: "rgba(59, 130, 246, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },

  fab: {
    position: "absolute",
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.actionPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
