import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { EmptyStateCard } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { ProviderCard } from "@/components/booking/ProviderCard";
import { EventCard, type EventData } from "@/components/booking/EventCard";
import {
  ProviderFilters,
  type FilterState,
  DEFAULT_FILTERS,
} from "@/components/booking/ProviderFilters";

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProvidersScreen() {
  const router = useRouter();

  // ── Search + filter state ─────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]   = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [filters, setFilters]         = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [offset, setOffset]           = useState(0);
  const debounceTimer                 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const LIMIT = 20;

  // ── Convex queries ────────────────────────────────────────────────────────
  const result = useQuery(api.bookingSubscribers.getProvidersWithPagination, {
    searchTerm:     debouncedSearch || undefined,
    specialization: filters.specialization,
    jobTitle:       filters.jobTitle,
    minPrice:       filters.minPrice,
    maxPrice:       filters.maxPrice,
    offset:         0,
    limit:          offset + LIMIT,
  });

  const eventsResult = useQuery(api.events.getPublicEvents, {
    limit: 10,
    offset: 0,
  });

  const expertRequestsResult = useQuery(
    api.expertRequests.getAllOpenExpertRequests,
    { limit: 10, offset: 0 }
  );

  const applyToRequest = useMutation(api.expertRequests.applyToExpertRequest);

  const isLoading  = result === undefined;
  const providers  = result?.providers ?? [];
  const hasMore    = result?.hasMore ?? false;
  const totalCount = result?.totalCount ?? 0;
  const events     = eventsResult?.events ?? [];
  const requests   = expertRequestsResult?.requests ?? [];

  // ── Active filter count for badge ─────────────────────────────────────────
  const activeFilterCount = [
    filters.specialization,
    filters.jobTitle,
    filters.minPrice !== undefined || filters.maxPrice !== undefined,
  ].filter(Boolean).length;

  // ── Debounced search handler ──────────────────────────────────────────────
  function handleSearchChange(text: string) {
    setSearchTerm(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebounced(text);
      setOffset(0);
    }, 350);
  }

  // ── Apply filters callback ────────────────────────────────────────────────
  const handleApplyFilters = useCallback((f: FilterState) => {
    setFilters(f);
    setOffset(0);
  }, []);

  // ── Active filter chips (dismissible) ────────────────────────────────────
  function clearFilter(key: keyof FilterState) {
    setFilters((prev) => ({
      ...prev,
      [key]:
        key === "minPrice" || key === "maxPrice" ? undefined : undefined,
    }));
    setOffset(0);
  }

  function clearPriceFilter() {
    setFilters((prev) => ({ ...prev, minPrice: undefined, maxPrice: undefined }));
    setOffset(0);
  }

  // ── Expert request apply ──────────────────────────────────────────────────
  async function handleApplyToRequest(requestId: string) {
    try {
      await applyToRequest({
        requestId: requestId as any,
        coverLetter: "I am interested in this expert request.",
      });
    } catch {
      // silently fail — real validation handled in Phase 9 form
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AppBackground>
      <ScreenHeader
        title="Find Providers"
        onBack={() => router.replace("/(tabs)/booking" as any)}
        trailing={
          <TouchableOpacity
            onPress={() => setFiltersVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.filterIconWrap}
          >
            <Ionicons
              name="options-outline"
              size={22}
              color={activeFilterCount > 0 ? Colors.actionPrimary : Colors.iconPrimary}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText} allowFontScaling={false}>
                  {activeFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <FlatList
        data={providers}
        keyExtractor={(item) => item.subscriber._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (hasMore && !isLoading) setOffset((o) => o + LIMIT);
        }}
        ListHeaderComponent={
          <MobileCard>
            {/* ── Search bar ──────────────────────────────────── */}
            <View style={styles.searchWrap}>
              <View style={styles.searchBar}>
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={Colors.iconSecondary}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, skill, or specialization…"
                  placeholderTextColor={Colors.textDisabled}
                  value={searchTerm}
                  onChangeText={handleSearchChange}
                  returnKeyType="search"
                  autoCapitalize="none"
                  accessibilityLabel="Search providers"
                  selectionColor={Colors.actionPrimary}
                />
                {searchTerm.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchTerm("");
                      setDebounced("");
                      setOffset(0);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={Colors.iconSecondary}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  activeFilterCount > 0 && styles.filterBtnActive,
                ]}
                onPress={() => setFiltersVisible(true)}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Open filters"
              >
                <Ionicons
                  name="options-outline"
                  size={18}
                  color={
                    activeFilterCount > 0
                      ? Colors.actionPrimary
                      : Colors.iconSecondary
                  }
                />
              </TouchableOpacity>
            </View>

            {/* ── Active filter chips ──────────────────────────── */}
            {activeFilterCount > 0 && (
              <View style={styles.activeChips}>
                {filters.specialization && (
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => clearFilter("specialization")}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove specialization filter: ${filters.specialization}`}
                  >
                    <Text style={styles.chipText} allowFontScaling={false}>
                      {filters.specialization}
                    </Text>
                    <Ionicons name="close" size={11} color={Colors.actionPrimary} />
                  </TouchableOpacity>
                )}
                {filters.jobTitle && (
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={() => clearFilter("jobTitle")}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove job title filter: ${filters.jobTitle}`}
                  >
                    <Text style={styles.chipText} allowFontScaling={false}>
                      {filters.jobTitle}
                    </Text>
                    <Ionicons name="close" size={11} color={Colors.actionPrimary} />
                  </TouchableOpacity>
                )}
                {(filters.minPrice !== undefined ||
                  filters.maxPrice !== undefined) && (
                  <TouchableOpacity
                    style={styles.chip}
                    onPress={clearPriceFilter}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Remove price filter"
                  >
                    <Text style={styles.chipText} allowFontScaling={false}>
                      {filters.minPrice !== undefined && filters.maxPrice !== undefined
                        ? `$${filters.minPrice}–$${filters.maxPrice}`
                        : filters.maxPrice !== undefined
                        ? `Under $${filters.maxPrice}`
                        : `$${filters.minPrice}+`}
                    </Text>
                    <Ionicons name="close" size={11} color={Colors.actionPrimary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── Results count ────────────────────────────────── */}
            {!isLoading && (
              <View style={styles.resultsMeta}>
                <Text style={styles.resultsText} allowFontScaling={false}>
                  {totalCount === 0
                    ? "No providers found"
                    : `${totalCount} provider${totalCount !== 1 ? "s" : ""}`}
                </Text>
              </View>
            )}

            {/* ── Loading indicator ────────────────────────────── */}
            {isLoading && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={Colors.actionPrimary} />
              </View>
            )}

            {/* ── Empty state ──────────────────────────────────── */}
            {!isLoading && providers.length === 0 && (
              <EmptyStateCard
                icon="search-outline"
                title="No providers found"
                subtitle="Try adjusting your search or filters."
                style={styles.emptyState}
              />
            )}
          </MobileCard>
        }
        renderItem={({ item }) => (
          <View style={styles.cardPadding}>
            <ProviderCard
              provider={item}
              onPress={() =>
                router.push(`/(tabs)/booking/${item.subscriber.userId}` as any)
              }
            />
          </View>
        )}
        ListFooterComponent={
          <>
            {/* Load more indicator */}
            {hasMore && (
              <View style={styles.loadMoreWrap}>
                <ActivityIndicator color={Colors.actionPrimary} size="small" />
              </View>
            )}

            {/* ── Events section ────────────────────────────────── */}
            {events.length > 0 && (
              <MobileCard style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Upcoming Events</Text>
                  <Text style={styles.sectionSub}>
                    Live & audio sessions open to all
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.eventsScroll}
                >
                  {events.map((event) => (
                    <EventCard
                      key={event._id}
                      event={event as EventData}
                      onPress={() =>
                        router.push(`/(tabs)/booking/${event._id}` as any)
                      }
                    />
                  ))}
                </ScrollView>
              </MobileCard>
            )}

            {/* ── Expert Requests section ───────────────────────── */}
            {requests.length > 0 && (
              <MobileCard style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Expert Requests</Text>
                  <Text style={styles.sectionSub}>
                    Open opportunities from circles
                  </Text>
                </View>
                {requests.map((req) => (
                  <View key={req._id} style={styles.requestCard}>
                    {/* Title + circle */}
                    <View style={styles.requestTop}>
                      <View style={styles.requestTitleBlock}>
                        <Text
                          style={styles.requestTitle}
                          numberOfLines={1}
                          allowFontScaling={false}
                        >
                          {req.title}
                        </Text>
                        <Text
                          style={styles.requestCircle}
                          numberOfLines={1}
                          allowFontScaling={false}
                        >
                          {req.circle?.name ?? "Circle"}
                        </Text>
                      </View>
                      <View style={styles.requestAmountWrap}>
                        <Text style={styles.requestAmount} allowFontScaling={false}>
                          {req.agreedCurrency} {req.agreedAmount}
                        </Text>
                        {req.duration && (
                          <Text style={styles.requestDuration} allowFontScaling={false}>
                            {req.duration} min
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Description */}
                    <Text
                      style={styles.requestDesc}
                      numberOfLines={2}
                      allowFontScaling={false}
                    >
                      {req.description}
                    </Text>

                    {/* Tags */}
                    {req.tags && req.tags.length > 0 && (
                      <View style={styles.requestTags}>
                        {req.tags.slice(0, 3).map((tag: string) => (
                          <View key={tag} style={styles.requestTag}>
                            <Text
                              style={styles.requestTagText}
                              allowFontScaling={false}
                            >
                              {tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Footer: apps + apply btn */}
                    <View style={styles.requestFooter}>
                      <View style={styles.requestAppsInfo}>
                        <Ionicons
                          name="people-outline"
                          size={12}
                          color={Colors.iconSecondary}
                        />
                        <Text style={styles.requestAppsText} allowFontScaling={false}>
                          {req.applicationCount} applicant
                          {req.applicationCount !== 1 ? "s" : ""}
                        </Text>
                      </View>

                      {req.userHasApplied ? (
                        <View style={styles.appliedBadge}>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={12}
                            color={Colors.statusSuccess}
                          />
                          <Text
                            style={styles.appliedText}
                            allowFontScaling={false}
                          >
                            Applied
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.applyBtn}
                          onPress={() => handleApplyToRequest(req._id)}
                          activeOpacity={0.82}
                          accessibilityRole="button"
                          accessibilityLabel={`Apply to ${req.title}`}
                        >
                          <Text
                            style={styles.applyBtnText}
                            allowFontScaling={false}
                          >
                            Apply
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </MobileCard>
            )}

            <View style={{ height: spacing.scrollBottomPadding }} />
          </>
        }
      />

      {/* ── Filter bottom sheet ──────────────────────────────────────── */}
      <ProviderFilters
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 0,
  },

  // Filter icon in header
  filterIconWrap: {
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Search bar
  searchWrap: {
    flexDirection: "row",
    gap: spacing.space2,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space4,
    paddingBottom: spacing.space3,
  },
  searchBar: {
    flex: 1,
    height: 46,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    gap: spacing.space2,
  },
  searchInput: {
    flex: 1,
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
    height: "100%",
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  filterBtnActive: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.borderFilled,
  },

  // Active filter chips
  activeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.space2,
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.actionPrimary,
  },

  // Results meta
  resultsMeta: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
  },
  resultsText: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },

  // Loading
  loadingWrap: {
    paddingVertical: spacing.space6,
    alignItems: "center",
  },
  loadMoreWrap: {
    paddingVertical: spacing.space4,
    alignItems: "center",
  },

  // Empty state
  emptyState: {
    paddingVertical: spacing.space10,
  },

  // Provider card container (adds horizontal padding)
  cardPadding: {
    paddingHorizontal: spacing.space4,
  },

  // Section cards (events, requests)
  sectionCard: {
    marginTop: 0,
  },
  sectionHeader: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: spacing.space3,
  },
  sectionTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
  },
  sectionSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Events horizontal scroll
  eventsScroll: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space4,
  },

  // Expert request cards
  requestCard: {
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space3,
    padding: spacing.space4,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  requestTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
    marginBottom: spacing.space2,
  },
  requestTitleBlock: {
    flex: 1,
    gap: 2,
  },
  requestTitle: {
    ...typeScale.headingSM,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  requestCircle: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  requestAmountWrap: {
    alignItems: "flex-end",
    flexShrink: 0,
    gap: 2,
  },
  requestAmount: {
    ...typeScale.labelSM,
    fontWeight: "700",
    color: Colors.statusSuccess,
  },
  requestDuration: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  requestDesc: {
    ...typeScale.bodySM,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    marginBottom: spacing.space2,
  },
  requestTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: spacing.space3,
  },
  requestTag: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  requestTagText: {
    fontSize: 9,
    fontWeight: "500",
    color: Colors.actionPrimary,
  },
  requestFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  requestAppsInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  requestAppsText: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  appliedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.statusSuccessBg,
  },
  appliedText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.statusSuccess,
  },
  applyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.actionPrimary,
  },
  applyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
