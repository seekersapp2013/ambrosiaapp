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
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { TopNav } from "@/components/TopNav";
import { useColors } from "@/hooks/useColors";
import { MyCirclesRow } from "@/components/stream/MyCirclesRow";

type ViewMode = "browse" | "my";
type AccessFilter = "ALL" | "FREE" | "PAID";

export default function CircleScreen() {
  const router = useRouter();
  const C = useColors();

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("browse");
  const [searchTerm, setSearchTerm] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("ALL");

  // ── Data ───────────────────────────────────────────────────────────────────
  const publicCirclesResult = useQuery(api.circles.getPublicCircles, {
    limit: 40,
    accessType: accessFilter !== "ALL" ? (accessFilter as "FREE" | "PAID") : undefined,
    searchTerm: searchTerm.trim() || undefined,
  });

  const myCircles = useQuery(api.circles.getMyCircles);

  // ── Derived ────────────────────────────────────────────────────────────────
  const browseCircles: any[] = publicCirclesResult?.circles ?? [];
  const isLoadingBrowse = publicCirclesResult === undefined;
  const isLoadingMy = myCircles === undefined;

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderBrowseItem = useCallback(
    ({ item }: { item: any }) => (
      <TouchableOpacity
        style={[styles.listRow, { backgroundColor: C.bgSurface, borderBottomColor: C.borderSubtle }]}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/circle-detail",
            params: { circleId: item._id },
          } as any)
        }
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Circle: ${item.name}`}
      >
        {/* Avatar */}
        <View style={[styles.listAvatar, { backgroundColor: C.bgElevated, borderColor: C.redBorder }]}>
          {item.coverImage ? (
            <Image source={{ uri: item.coverImage }} style={styles.listAvatarImage} />
          ) : (
            <Ionicons name="people-circle-outline" size={30} color={C.primary} />
          )}
        </View>

        {/* Info */}
        <View style={styles.listInfo}>
          <View style={styles.listTopRow}>
            <Text style={[styles.listName, { color: C.textPrimary }]} numberOfLines={1}>{item.name}</Text>
            <View style={[styles.accessBadge, item.accessType === "PAID"
              ? { backgroundColor: C.amberSurface, borderWidth: 1, borderColor: C.amberBorder }
              : { backgroundColor: C.statusInfoBg, borderWidth: 1, borderColor: C.blueBorder }
            ]}>
              <Text style={[styles.accessBadgeText, { color: item.accessType === "PAID" ? C.statusWarning : C.statusInfo }]}>
                {item.accessType === "PAID"
                  ? `${item.priceCurrency ?? ""}${item.price ?? ""}`.trim()
                  : "Free"}
              </Text>
            </View>
          </View>

          <View style={styles.listBottomRow}>
            <Text style={[styles.listDesc, { color: C.textMuted }]} numberOfLines={1}>{item.description}</Text>
            {item.isMember && (
              <View style={[styles.joinedPill, { backgroundColor: C.statusSuccessBg, borderColor: C.greenBorder }]}>
                <Ionicons name="checkmark-circle" size={10} color={C.statusSuccess} />
                <Text style={[styles.joinedPillText, { color: C.statusSuccess }]}>Joined</Text>
              </View>
            )}
          </View>

          <View style={styles.listMeta}>
            <Ionicons name="people-outline" size={12} color={C.textMuted} />
            <Text style={[styles.listMetaText, { color: C.textDisabled }]}>
              {item.currentMembers}{item.maxMembers ? `/${item.maxMembers}` : ""} members
            </Text>
            {item.tags?.slice(0, 1).map((tag: string) => (
              <View key={tag} style={[styles.tagChip, { backgroundColor: C.bgPrimarySubtle, borderColor: C.redBorder }]}>
                <Text style={[styles.tagChipText, { color: C.primary }]}>#{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={C.iconSecondary} />
      </TouchableOpacity>
    ),
    [router, C]
  );

  const renderMyCircleItem = useCallback(
    ({ item }: { item: any }) => (
      <MyCirclesRow
        circle={item}
        onPress={() => {
          // Referral circles go straight to chat — user is always already a member
          if (item.isReferralCircle) {
            router.push({
              pathname: "/(tabs)/circle-chat",
              params: { circleId: item._id },
            } as any);
          } else {
            router.push({
              pathname: "/(tabs)/circle-detail",
              params: { circleId: item._id },
            } as any);
          }
        }}
      />
    ),
    [router]
  );

  return (
    <AppBackground>
      <MobileCard containerStyle={styles.cardContainer} style={styles.card}>
        {/* ── Fixed header ─────────────────────────────────────────────────── */}
        <TopNav hideNotifications />
        <View style={[styles.header, { borderBottomColor: C.borderSubtle }]}>
          <View style={[styles.toggleRow, { backgroundColor: C.bgElevated }]}>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "browse" && { backgroundColor: C.primary }]}
              onPress={() => setViewMode("browse")}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "browse" }}
            >
              <Text style={[styles.toggleText, { color: C.textMuted }, viewMode === "browse" && { color: C.textInverse }]}>
                Browse
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "my" && { backgroundColor: C.primary }]}
              onPress={() => setViewMode("my")}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "my" }}
            >
              <Text style={[styles.toggleText, { color: C.textMuted }, viewMode === "my" && { color: C.textInverse }]}>
                My Circles
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: C.statusSuccess }]}
            onPress={() => router.push("/(tabs)/create-circle" as any)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create circle"
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        {/* ── Browse view ──────────────────────────────────────────────────── */}
        {viewMode === "browse" && (
          <FlatList
            data={isLoadingBrowse ? [] : browseCircles}
            renderItem={renderBrowseItem}
            keyExtractor={(item) => item._id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.searchBlock}>
                <View style={[styles.searchInputWrap, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
                  <Ionicons name="search-outline" size={15} color={C.textMuted} />
                  <TextInput
                    style={[styles.searchInput, { color: C.textPrimary }]}
                    placeholder="Search circles…"
                    placeholderTextColor={C.textMuted}
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    returnKeyType="search"
                    accessibilityLabel="Search circles"
                  />
                  {searchTerm.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchTerm("")}>
                      <Ionicons name="close-circle" size={15} color={C.textMuted} />
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
                      style={[
                        styles.filterChip,
                        { backgroundColor: C.bgElevated, borderColor: C.borderSubtle },
                        accessFilter === f && { backgroundColor: C.bgPrimaryMid, borderColor: C.redBorder },
                      ]}
                      onPress={() => setAccessFilter(f)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.filterChipText, { color: C.textMuted }, accessFilter === f && { color: C.primary }]}>
                        {f}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            }
            ListEmptyComponent={
              isLoadingBrowse ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={C.primary} />
                  <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading circles…</Text>
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-circle-outline" size={48} color={C.textMuted} />
                  <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No circles found</Text>
                  <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
                    {searchTerm ? "Try a different search term." : "Be the first to create one!"}
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: C.primary }]}
                    onPress={() => router.push("/(tabs)/create-circle" as any)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={16} color="#fff" />
                    <Text style={styles.emptyBtnText}>Create Circle</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        )}

        {/* ── My Circles view ──────────────────────────────────────────────── */}
        {viewMode === "my" && (
          <FlatList
            data={isLoadingMy ? [] : (myCircles as any[] ?? [])}
            renderItem={renderMyCircleItem}
            keyExtractor={(item: any) => item._id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              isLoadingMy ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color={C.primary} />
                  <Text style={[styles.loadingText, { color: C.textMuted }]}>Loading your circles…</Text>
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Ionicons name="people-circle-outline" size={48} color={C.textMuted} />
                  <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>No circles yet</Text>
                  <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>
                    Join or create a circle to connect with your community.
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: C.primary }]}
                    onPress={() => setViewMode("browse")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="search-outline" size={16} color="#fff" />
                    <Text style={styles.emptyBtnText}>Browse Circles</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        )}
      </MobileCard>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // ── MobileCard layout ──────────────────────────────────────────────────────
  cardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  card: {
    flex: 1,
    overflow: "hidden",
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
    flexWrap: "wrap",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  toggleRow: {
    flexDirection: "row",
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 3,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Browse ─────────────────────────────────────────────────────────────────
  searchBlock: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  searchRow: {
    gap: 8,
    marginBottom: 8,
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
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
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // List row (browse)
  listContent: {
    paddingBottom: 100,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  listAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  listAvatarImage: {
    width: "100%",
    height: "100%",
  },
  listInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  listTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  listName: {
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  listBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  listDesc: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  listMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 1,
  },
  listMetaText: {
    fontSize: 11,
  },
  tagChip: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  joinedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  joinedPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  accessBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  accessBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Shared: loading / empty ────────────────────────────────────────────────
  loadingWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
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
  },
  emptySubtitle: {
    fontSize: 13,
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
    borderRadius: 22,
  },
  emptyBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
