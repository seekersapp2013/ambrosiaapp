/**
 * Circle Tab — Community Circles Hub
 *
 * Internal view switcher: My Circles (full-width list) / Discover (browse public circles).
 * FAB for creating new circles sits bottom-right above the tab bar.
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { TopNav } from "@/components/TopNav";
import { useColors } from "@/hooks/useColors";
import { useTabBarHeight } from "@/utils/useDeviceClass";
import { MyCirclesRow } from "@/components/stream/MyCirclesRow";
import { Id } from "@/convex/_generated/dataModel";

type ViewMode = "discover" | "my";
type AccessFilter = "ALL" | "FREE" | "PAID";

export default function CircleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useTabBarHeight();
  const C = useColors();

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("my");
  const [searchTerm, setSearchTerm] = useState("");
  const [accessFilter, setAccessFilter] = useState<AccessFilter>("ALL");

  // ── Data ───────────────────────────────────────────────────────────────────
  const publicCirclesResult = useQuery(api.circles.getPublicCircles, {
    limit: 40,
    accessType: accessFilter !== "ALL" ? (accessFilter as "FREE" | "PAID") : undefined,
    searchTerm: searchTerm.trim() || undefined,
  });

  const myCircles = useQuery(api.circles.getMyCircles);
  const contentFeed = useQuery(api.subCircles.getMyCirclesContentFeed, { limit: 20 });
  const pendingInvites = useQuery(api.circleInvitations.getMyPendingInvites);

  const acceptInvite = useMutation(api.circleInvitations.acceptInvite);
  const declineInvite = useMutation(api.circleInvitations.declineInvite);

  // ── Derived ────────────────────────────────────────────────────────────────
  const browseCircles: any[] = publicCirclesResult?.circles ?? [];
  const isLoadingBrowse = publicCirclesResult === undefined;
  const isLoadingMy = myCircles === undefined;

  // FAB positioning — above the tab bar, like for-you screen
  const fabBottom = tabBarHeight + insets.bottom + 16;

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
          // Consultation and referral circles go straight to chat
          if (item.isConsultationCircle || item.isReferralCircle) {
            router.push({
              pathname: "/(tabs)/circle-chat",
              params: { circleId: item._id },
            } as any);
          } else {
            // Regular circles go to detail (which shows sub-circles)
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
            <TouchableOpacity
              style={[styles.toggleBtn, viewMode === "discover" && { backgroundColor: C.primary }]}
              onPress={() => setViewMode("discover")}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: viewMode === "discover" }}
            >
              <Text style={[styles.toggleText, { color: C.textMuted }, viewMode === "discover" && { color: C.textInverse }]}>
                Discover
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Discover view ─────────────────────────────────────────────────── */}
        {viewMode === "discover" && (
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
            ListHeaderComponent={
              <>
                {/* Pending invitations */}
                {pendingInvites && (pendingInvites as any[]).length > 0 && (
                  <View style={styles.invitesSection}>
                    <Text style={[styles.contentFeedTitle, { color: C.textSecondary }]}>Invitations</Text>
                    {(pendingInvites as any[]).map((invite: any) => (
                      <TouchableOpacity
                        key={invite._id}
                        style={[styles.inviteRow, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}
                        activeOpacity={0.8}
                        onPress={() =>
                          router.push({
                            pathname: "/(tabs)/circle-detail",
                            params: { circleId: invite.circleId },
                          } as any)
                        }
                      >
                        <View style={[styles.inviteIcon, { backgroundColor: C.statusWarningBg }]}>
                          <Ionicons name="mail-outline" size={18} color={C.statusWarning} />
                        </View>
                        <View style={styles.inviteInfo}>
                          <Text style={[styles.inviteName, { color: C.textPrimary }]} numberOfLines={1}>
                            Invitation: {invite.circle?.name ?? "Circle"}
                          </Text>
                          <Text style={[styles.inviteMeta, { color: C.textMuted }]} numberOfLines={1}>
                            From {invite.inviter?.name ?? invite.inviter?.username ?? "someone"} · {invite.circle?.currentMembers ?? 0} members
                          </Text>
                        </View>
                        <View style={styles.inviteActions}>
                          <TouchableOpacity
                            style={[styles.inviteAcceptBtn, { backgroundColor: C.statusSuccess }]}
                            onPress={async (e) => {
                              e.stopPropagation?.();
                              try {
                                await acceptInvite({ inviteId: invite._id });
                                Alert.alert("Joined!", `You've joined ${invite.circle?.name ?? "the circle"}.`);
                              } catch (err: any) {
                                Alert.alert("Error", err?.message ?? "Failed to accept invite.");
                              }
                            }}
                          >
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.inviteDeclineBtn, { borderColor: C.borderSubtle }]}
                            onPress={async (e) => {
                              e.stopPropagation?.();
                              try {
                                await declineInvite({ inviteId: invite._id });
                              } catch (err: any) {
                                Alert.alert("Error", err?.message ?? "Failed to decline invite.");
                              }
                            }}
                          >
                            <Ionicons name="close" size={14} color={C.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Content feed */}
                {contentFeed && contentFeed.length > 0 ? (
                  <View style={styles.contentFeedSection}>
                  <Text style={[styles.contentFeedTitle, { color: C.textSecondary }]}>Recent from your circles</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.contentFeedScroll}
                  >
                    {contentFeed.map((item: any) => (
                      <TouchableOpacity
                        key={item.contentId}
                        style={[styles.contentCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}
                        activeOpacity={0.8}
                        onPress={() => {
                          if (item.contentType === "article") {
                            router.push({
                              pathname: "/(tabs)/article-viewer",
                              params: { articleId: item.contentId },
                            } as any);
                          } else if (item.contentType === "event") {
                            router.push({
                              pathname: "/(tabs)/booking/event-detail",
                              params: { eventId: item.contentId },
                            } as any);
                          } else {
                            router.push({
                              pathname: "/(tabs)/pulse",
                              params: { reelId: item.contentId },
                            } as any);
                          }
                        }}
                      >
                        {item.coverImage ? (
                          <Image source={{ uri: item.coverImage }} style={styles.contentCardImage} />
                        ) : (
                          <View style={[styles.contentCardImage, styles.contentCardPlaceholder, { backgroundColor: C.bgPrimaryMid }]}>
                            <Ionicons
                              name={item.contentType === "article" ? "document-text-outline" : "play-circle-outline"}
                              size={24}
                              color={C.primary}
                            />
                          </View>
                        )}
                        <View style={styles.contentCardOverlay}>
                          <View style={styles.contentCardAuthorRow}>
                            {item.author?.avatar ? (
                              <Image source={{ uri: item.author.avatar }} style={styles.contentCardAvatar} />
                            ) : (
                              <View style={[styles.contentCardAvatar, { backgroundColor: C.primary }]}>
                                <Text style={styles.contentCardAvatarInitial}>
                                  {(item.author?.name ?? "?")[0].toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <Text style={styles.contentCardAuthorName} numberOfLines={1}>
                              {item.author?.name ?? "Unknown"}
                            </Text>
                          </View>
                          <Text style={styles.contentCardTitle} numberOfLines={2}>
                            {item.title}
                          </Text>
                        </View>
                        <View style={[styles.contentTypeBadge, { backgroundColor: item.contentType === "article" ? C.statusInfoBg : C.bgPrimaryMid }]}>
                          <Ionicons
                            name={item.contentType === "article" ? "document-text" : "play"}
                            size={9}
                            color={item.contentType === "article" ? C.statusInfo : C.primary}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              </>
            }
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
                    onPress={() => setViewMode("discover")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="compass-outline" size={16} color="#fff" />
                    <Text style={styles.emptyBtnText}>Discover Circles</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        )}

        {/* ── FAB — New Circle, bottom-right above tab bar ─────────────────── */}
        <View
          style={[styles.fabCluster, { bottom: fabBottom }]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: C.primary }]}
            onPress={() => router.push("/(tabs)/create-circle" as any)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Create a new circle"
          >
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </MobileCard>
    </AppBackground>
  );
}

const styles: any = StyleSheet.create({
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

  // ── Discover ───────────────────────────────────────────────────────────────
  searchBlock: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
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

  // List row (discover)
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

  // ── FAB ────────────────────────────────────────────────────────────────────
  fabCluster: {
    position: "absolute",
    right: 16,
    alignItems: "flex-end",
    gap: 10,
  },
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

  // ── Invitations section ─────────────────────────────────────────────────────
  invitesSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  inviteIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteInfo: {
    flex: 1,
    gap: 2,
  },
  inviteName: {
    fontSize: 14,
    fontWeight: "700",
  },
  inviteMeta: {
    fontSize: 11,
  },
  inviteActions: {
    flexDirection: "row",
    gap: 6,
  },
  inviteAcceptBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteDeclineBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // ── Content Feed (horizontal cards) ────────────────────────────────────────
  contentFeedSection: {
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  contentFeedTitle: {
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 16,
    letterSpacing: 0.3,
  },
  contentFeedScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  contentCard: {
    width: 130,
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  contentCardImage: {
    width: "100%",
    height: "100%",
  },
  contentCardPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  contentCardOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    paddingTop: 28,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  contentCardAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  contentCardAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  contentCardAvatarInitial: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },
  contentCardAuthorName: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    flex: 1,
  },
  contentCardTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 15,
  },
  contentTypeBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
