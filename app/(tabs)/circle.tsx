/**
 * Circle Tab — Community Circles Hub
 *
 * Internal view switcher: Browse (2-col grid) / My Circles (full-width list).
 * Phase 7 of PLAN.MD — AI removed, uses api.circles.getPublicCircles directly.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { TopNav } from "@/components/TopNav";
import { Colors } from "@/constants/Colors";
import { CircleCard } from "@/components/stream/CircleCard";
import { MyCirclesRow } from "@/components/stream/MyCirclesRow";

type ViewMode = "browse" | "my";
type AccessFilter = "ALL" | "FREE" | "PAID";

export default function CircleScreen() {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [searchTerm, setSearchTerm] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("ALL");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const publicCirclesResult = useQuery(api.circles.getPublicCircles, {
    limit: 40,
    accessType: accessFilter !== "ALL" ? (accessFilter as "FREE" | "PAID") : undefined,
    searchTerm: searchTerm.trim() || undefined,
  });

  const myCircles = useQuery(api.circles.getMyCircles);

  const joinCircle = useMutation(api.circles.joinCircle);

  // ── Derived ────────────────────────────────────────────────────────────────
  const browseCircles: any[] = publicCirclesResult?.circles ?? [];
  const isLoadingBrowse = publicCirclesResult === undefined;
  const isLoadingMy = myCircles === undefined;

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleJoin = useCallback(
    async (circleId: string) => {
      setJoiningId(circleId);
      try {
        await joinCircle({ circleId: circleId as Id<"circles"> });
        // No Alert needed — the Convex query reactively re-runs and
        // the card button flips to "Joined ✓" automatically.
      } catch (err: any) {
        Alert.alert("Could not join", err?.message ?? "Something went wrong.");
      } finally {
        setJoiningId(null);
      }
    },
    [joinCircle]
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderBrowseItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      // Ad slot after every 3rd pair of items (every 6th item in a 2-col grid)
      if (index > 0 && index % 6 === 0) {
        return (
          <>
            <View style={styles.adSlot}>
              <Text style={styles.adSlotText}>Advertisement</Text>
            </View>
            <CircleCard
              circle={item}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/circle-detail",
                  params: { circleId: item._id },
                } as any)
              }
              onJoin={() => handleJoin(item._id)}
              isJoining={joiningId === item._id}
            />
          </>
        );
      }

      return (
        <CircleCard
          circle={item}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/circle-detail",
              params: { circleId: item._id },
            } as any)
          }
          onJoin={() => handleJoin(item._id)}
          isJoining={joiningId === item._id}
        />
      );
    },
    [joiningId, handleJoin, router]
  );

  const renderMyCircleItem = useCallback(
    ({ item }: { item: any }) => (
      <MyCirclesRow
        circle={item}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/circle-chat",
            params: { circleId: item._id },
          } as any)
        }
      />
    ),
    [router]
  );

  return (
    <AppBackground>
      <MobileCard>
        {/* ── Header — stays fixed, not part of the scroll ────────────────── */}
        <TopNav hideNotifications />
        <View style={styles.header}>

          {/* Browse / My Circles toggle */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "browse" && styles.toggleBtnActive]}
              onPress={() => setViewMode("browse")}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "browse" }}
            >
              <Text style={[styles.toggleText, viewMode === "browse" && styles.toggleTextActive]}>
                Browse
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "my" && styles.toggleBtnActive]}
              onPress={() => setViewMode("my")}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "my" }}
            >
              <Text style={[styles.toggleText, viewMode === "my" && styles.toggleTextActive]}>
                My Circles
              </Text>
            </TouchableOpacity>
          </View>

          {/* Create circle button */}
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push("/(tabs)/create-circle" as any)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create circle"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Browse view ─────────────────────────────────────────────── */}
          {viewMode === "browse" && (
            <View style={styles.browseContainer}>
              {/* Search + filter row */}
              <View style={styles.searchRow}>
                <View style={styles.searchInputWrap}>
                  <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search circles…"
                    placeholderTextColor={Colors.textMuted}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    returnKeyType="search"
                    accessibilityLabel="Search circles"
                  />
                  {searchTerm.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchTerm("")}>
                      <Ionicons name="close-circle" size={15} color={Colors.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterScrollContent}
                >
                  {(["ALL", "FREE", "PAID"] as AccessFilter[]).map((f) => (
                    <TouchableOpacity
                      key={f}
                      style={[styles.filterChip, accessFilter === f && styles.filterChipActive]}
                      onPress={() => setAccessFilter(f)}
                      activeOpacity={0.75}
                      accessibilityRole="button"
                      accessibilityState={{ selected: accessFilter === f }}
                    >
                      <Text style={[styles.filterChipText, accessFilter === f && styles.filterChipTextActive]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {isLoadingBrowse ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading circles…</Text>
                </View>
              ) : browseCircles.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-circle-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No circles found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchTerm ? "Try a different search term." : "Be the first to create one!"}
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => router.push("/(tabs)/create-circle" as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#fff" />
                    <Text style={styles.emptyBtnText}>Create Circle</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={browseCircles}
                  renderItem={renderBrowseItem}
                  keyExtractor={(item) => item._id}
                  numColumns={2}
                  columnWrapperStyle={styles.gridRow}
                  contentContainerStyle={styles.gridContent}
                  scrollEnabled={false}
                  removeClippedSubviews={false}
                />
              )}
            </View>
          )}

          {/* ── My Circles view ─────────────────────────────────────────── */}
          {viewMode === "my" && (
            <View style={styles.myCirclesContainer}>
              {isLoadingMy ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={styles.loadingText}>Loading your circles…</Text>
                </View>
              ) : !myCircles || myCircles.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-circle-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No circles yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Join or create a circle to connect with your community.
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyBtn}
                    onPress={() => setViewMode("browse")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search-outline" size={16} color="#fff" />
                    <Text style={styles.emptyBtnText}>Browse Circles</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={myCircles as any[]}
                  renderItem={renderMyCircleItem}
                  keyExtractor={(item: any) => item._id}
                  scrollEnabled={false}
                  removeClippedSubviews={false}
                />
              )}
            </View>
          )}
        </ScrollView>
      </MobileCard>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 8,
    flexWrap: "wrap",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: Colors.statusSuccess,
    gap: 3,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Browse ─────────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // clears tab bar
  },

  // ── Browse ─────────────────────────────────────────────────────────────────
  browseContainer: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  searchRow: {
    gap: 8,
    marginBottom: 8,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
    padding: 0,
  },
  filterScrollContent: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 2,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterChipActive: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.redBorder,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.primary,
  },

  // Grid
  gridRow: {
    gap: 12,
    justifyContent: "space-between",
  },
  gridContent: {
    paddingBottom: 8,
  },

  // Ad slot
  adSlot: {
    width: "100%",
    height: 56,
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  adSlotText: {
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // ── My Circles ─────────────────────────────────────────────────────────────
  myCirclesContainer: {
    paddingTop: 4,
  },

  // ── Shared: loading / empty ────────────────────────────────────────────────
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 22,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
