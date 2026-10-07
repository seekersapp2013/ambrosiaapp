import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Linking,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TierBadge } from "@/components/tier/TierBadge";
import { VerifiedBadge } from "@/components/tier/VerifiedBadge";
import { AskProviderModal } from "@/components/provider/AskProviderModal";
import { ReviewSummary } from "@/components/tier/ReviewSummary";
import { ReviewCard } from "@/components/tier/ReviewCard";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

function formatTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function ProviderProfileByUsernameScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();

  const [activeTab, setActiveTab] = useState<"content" | "events" | "circles" | "learn" | "reviews">("content");
  const [askModalOpen, setAskModalOpen] = useState(false);

  const providerData = useQuery(api.providerPage.getProviderPageDataByUsername, {
    username: username || "",
  });

  if (providerData === undefined) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00BFA6" />
        <Text style={styles.loadingText}>Loading Provider Profile...</Text>
      </View>
    );
  }

  if (!providerData) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="person-remove-outline" size={48} color="#F59E0B" />
        <Text style={styles.errorTitle}>Provider Not Found</Text>
        <Text style={styles.errorSub}>
          The user @{username} does not exist or is not a registered healthcare provider.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { subscriber, tierData, leaderboard, reviewsSummary } = providerData;

  const handleShareProfile = async () => {
    try {
      const shareUrl = `https://app.ambrosia.africa/${providerData.username}`;
      await Share.share({
        message: `Check out Dr. ${providerData.name} (@${providerData.username}) on Ambrosia:\n${shareUrl}`,
        url: shareUrl,
        title: `Ambrosia Provider: ${providerData.name}`,
      });
    } catch {
      // User cancelled
    }
  };

  return (
    <View style={styles.screen}>
      {/* Navigation Bar */}
      <View style={styles.navHeader}>
        <TouchableOpacity style={styles.navBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>@{providerData.username}</Text>
        <TouchableOpacity style={styles.navBack} onPress={handleShareProfile}>
          <Ionicons name="share-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarWrap}>
              {providerData.avatar ? (
                <Image source={{ uri: providerData.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.initialText}>{(providerData.name || "P")[0].toUpperCase()}</Text>
                </View>
              )}
            </View>

            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.providerName}>{providerData.name}</Text>
                <VerifiedBadge {...({ isVerified: true, size: "medium" } as any)} />
              </View>
              <Text style={styles.handleText}>@{providerData.username}</Text>
              {subscriber && (
                <Text style={styles.jobTitleText}>
                  {subscriber.jobTitle} • {subscriber.specialization}
                </Text>
              )}
            </View>
          </View>

          {/* Social Links */}
          {(subscriber?.xLink || subscriber?.linkedInLink) && (
            <View style={styles.socialRow}>
              {subscriber.xLink && (
                <TouchableOpacity style={styles.socialChip} onPress={() => Linking.openURL(subscriber.xLink!)}>
                  <Ionicons name="logo-twitter" size={14} color="#00BFA6" />
                  <Text style={styles.socialText}>X / Twitter</Text>
                </TouchableOpacity>
              )}
              {subscriber.linkedInLink && (
                <TouchableOpacity style={styles.socialChip} onPress={() => Linking.openURL(subscriber.linkedInLink!)}>
                  <Ionicons name="logo-linkedin" size={14} color="#00BFA6" />
                  <Text style={styles.socialText}>LinkedIn</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Recognition Tier & Leaderboard Rank Banner */}
          <View style={styles.tierBanner}>
            <View style={styles.tierBannerLeft}>
              <TierBadge tier={tierData.tier} {...({ size: "medium", showLabel: true } as any)} />
              <View style={styles.prsGauge}>
                <Text style={styles.prsNum}>{tierData.prsScore}</Text>
                <Text style={styles.prsLabel}>PRS SCORE</Text>
              </View>
            </View>

            <View style={styles.rankGauge}>
              <Ionicons name="trophy" size={18} color="#FFD700" />
              <View>
                <Text style={styles.rankNumText}>Rank #{leaderboard.overallRank}</Text>
                <Text style={styles.rankSubText}>
                  {leaderboard.specialtyRank ? `#${leaderboard.specialtyRank} in ${subscriber?.specialization}` : "Overall Leaderboard"}
                </Text>
              </View>
            </View>
          </View>

          {/* Primary Action Buttons: Book Session & Ask Question */}
          <View style={styles.primaryActions}>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => {
                if (subscriber) {
                  router.push({
                    pathname: "/(tabs)/booking/[id]",
                    params: { id: subscriber.id },
                  } as any);
                }
              }}
            >
              <Ionicons name="calendar-outline" size={18} color="#FFFFFF" />
              <Text style={styles.bookBtnText}>Book Session</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.askBtn}
              onPress={() => setAskModalOpen(true)}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#00BFA6" />
              <Text style={styles.askBtnText}>Ask Question</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: About & Available Hours */}
        {subscriber && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About & Offerings</Text>
            <Text style={styles.aboutText}>{subscriber.aboutUser}</Text>
            <Text style={[styles.aboutText, { marginTop: 6 }]}>{subscriber.offerDescription}</Text>

            {/* Session Pricing */}
            <View style={styles.priceRow}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>1-on-1 Session</Text>

                <Text style={styles.priceVal}>
                  {subscriber.sessionCurrency} ${subscriber.oneOnOnePrice}
                </Text>
              </View>
              {subscriber.groupSessionPrice && (
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Group Session</Text>
                  <Text style={styles.priceVal}>
                    {subscriber.sessionCurrency} ${subscriber.groupSessionPrice}
                  </Text>
                </View>
              )}
            </View>

            {/* Open Hours Schedule */}
            {subscriber.openHours && (
              <View style={styles.hoursBox}>
                <Text style={styles.hoursTitle}>Available Weekly Schedule</Text>
                {Object.entries(subscriber.openHours).map(([day, sched]: [string, any]) => (
                  <View key={day} style={styles.dayRow}>
                    <Text style={styles.dayName}>{day.toUpperCase()}</Text>
                    {sched.available ? (
                      <Text style={styles.dayHours}>
                        {formatTime(sched.start)} – {formatTime(sched.end)}
                      </Text>
                    ) : (
                      <Text style={styles.dayOff}>Unavailable</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tabbed Content Navigation */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "content" && styles.tabItemActive]}
            onPress={() => setActiveTab("content")}
          >
            <Text style={[styles.tabText, activeTab === "content" && styles.tabTextActive]}>
              Content ({providerData.articles.length + providerData.reels.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "events" && styles.tabItemActive]}
            onPress={() => setActiveTab("events")}
          >
            <Text style={[styles.tabText, activeTab === "events" && styles.tabTextActive]}>
              Events ({providerData.events.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "circles" && styles.tabItemActive]}
            onPress={() => setActiveTab("circles")}
          >
            <Text style={[styles.tabText, activeTab === "circles" && styles.tabTextActive]}>
              Circles ({providerData.circles.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === "reviews" && styles.tabItemActive]}
            onPress={() => setActiveTab("reviews")}
          >
            <Text style={[styles.tabText, activeTab === "reviews" && styles.tabTextActive]}>
              Reviews ({reviewsSummary.totalReviews})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: Content (Articles & Pulse Reels) */}
        {activeTab === "content" && (
          <View style={styles.tabContent}>
            {providerData.articles.map((art) => (
              <TouchableOpacity
                key={art.id}
                style={styles.itemCard}
                onPress={() => router.push({ pathname: "/(tabs)/article-viewer", params: { id: art.id } } as any)}
              >
                <Ionicons name="newspaper-outline" size={24} color="#00BFA6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{art.title}</Text>
                  <Text style={styles.itemSub}>{art.readTimeMin} min read • {art.views} views</Text>
                </View>
              </TouchableOpacity>
            ))}

            {providerData.reels.map((reel) => (
              <TouchableOpacity
                key={reel.id}
                style={styles.itemCard}
                onPress={() => router.push({ pathname: "/(tabs)/reel-viewer", params: { id: reel.id } } as any)}
              >
                <Ionicons name="play-circle-outline" size={24} color="#00BFA6" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{reel.title}</Text>
                  <Text style={styles.itemSub}>Pulse Reel • {reel.views} views</Text>
                </View>
              </TouchableOpacity>
            ))}

            {providerData.articles.length === 0 && providerData.reels.length === 0 && (
              <Text style={styles.emptyTabText}>No articles or reels published yet.</Text>
            )}
          </View>
        )}

        {/* TAB 2: Events */}
        {activeTab === "events" && (
          <View style={styles.tabContent}>
            {providerData.events.map((evt) => (
              <View key={evt.id} style={styles.itemCard}>
                <Ionicons name="calendar" size={24} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{evt.title}</Text>
                  <Text style={styles.itemSub}>{evt.description}</Text>
                  <Text style={styles.itemSub}>
                    {evt.priceAmount ? `${evt.currency} $${evt.priceAmount}` : "Free Event"}
                  </Text>
                </View>
              </View>
            ))}
            {providerData.events.length === 0 && (
              <Text style={styles.emptyTabText}>No live events scheduled currently.</Text>
            )}
          </View>
        )}

        {/* TAB 3: Circles */}
        {activeTab === "circles" && (
          <View style={styles.tabContent}>
            {providerData.circles.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.itemCard}
                onPress={() => router.push({ pathname: "/(tabs)/circle-detail", params: { circleId: c.id } } as any)}
              >
                <Ionicons name="people-outline" size={24} color="#2196F3" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{c.name}</Text>
                  <Text style={styles.itemSub}>{c.description}</Text>
                  <Text style={styles.itemSub}>{c.memberCount} members</Text>
                </View>
              </TouchableOpacity>
            ))}
            {providerData.circles.length === 0 && (
              <Text style={styles.emptyTabText}>No active public circles found.</Text>
            )}
          </View>
        )}

        {/* TAB 4: Reviews */}
        {activeTab === "reviews" && (
          <View style={styles.tabContent}>
            <ReviewSummary
              {...(reviewsSummary as any)}
            />

            {reviewsSummary.recentReviews.map((rev) => (
              <ReviewCard
                key={rev.id}
                {...(rev as any)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Interactive Dual-Choice Ask Modal */}
      <AskProviderModal
        visible={askModalOpen}
        providerId={providerData.userId}
        providerName={providerData.name}
        articles={providerData.articles}
        reels={providerData.reels}
        courses={providerData.courses}
        onClose={() => setAskModalOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0A0A15",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A15",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: "#9CA3AF",
    marginTop: spacing.md,
  },
  errorTitle: {
    ...typeScale.titleMedium,
    color: "#FFFFFF",
    marginTop: spacing.md,
  },
  errorSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
    marginBottom: spacing.md,
  },
  backBtn: {
    backgroundColor: "#00BFA6",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  backBtnText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: "#0F101D",
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
  },
  navBack: {
    padding: 4,
  },
  navTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.md,
  },
  heroCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    backgroundColor: "#262945",
    justifyContent: "center",
    alignItems: "center",
  },
  initialText: {
    ...typeScale.titleLarge,
    color: "#00BFA6",
    fontWeight: "700",
  },
  heroInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  providerName: {
    ...typeScale.titleMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  handleText: {
    ...typeScale.bodySmall,
    color: "#00BFA6",
  },
  jobTitleText: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  socialRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  socialChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#00BFA615",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#00BFA630",
  },
  socialText: {
    ...typeScale.labelSmall,
    color: "#00BFA6",
  },
  tierBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0F101D",
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: "#262945",
  },
  tierBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  prsGauge: {
    alignItems: "center",
  },
  prsNum: {
    ...typeScale.titleSmall,
    color: "#00BFA6",
    fontWeight: "800",
  },
  prsLabel: {
    fontSize: 9,
    color: "#9CA3AF",
    fontWeight: "700",
  },
  rankGauge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFD70015",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#FFD70030",
  },
  rankNumText: {
    ...typeScale.labelSmall,
    color: "#FFD700",
    fontWeight: "800",
  },
  rankSubText: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  primaryActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bookBtn: {
    flex: 1,
    backgroundColor: "#00BFA6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  bookBtnText: {
    ...typeScale.labelMedium,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  askBtn: {
    flex: 1,
    backgroundColor: "#00BFA615",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#00BFA6",
  },
  askBtnText: {
    ...typeScale.labelMedium,
    color: "#00BFA6",
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#16182B",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  aboutText: {
    ...typeScale.bodyMedium,
    color: "#D1D5DB",
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: "#0F101D",
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  priceItem: {
    flex: 1,
  },
  priceLabel: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
  },
  priceVal: {
    ...typeScale.titleSmall,
    color: "#10B981",
    fontWeight: "700",
    marginTop: 2,
  },
  hoursBox: {
    marginTop: spacing.sm,
  },
  hoursTitle: {
    ...typeScale.labelMedium,
    color: "#00BFA6",
    fontWeight: "700",
    marginBottom: 6,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#262945",
  },
  dayName: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
  },
  dayHours: {
    ...typeScale.bodySmall,
    color: "#FFFFFF",
  },
  dayOff: {
    ...typeScale.bodySmall,
    color: "#6B7280",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#0F101D",
    borderRadius: radius.sm,
    padding: 2,
    marginBottom: spacing.sm,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
  },
  tabItemActive: {
    backgroundColor: "#00BFA6",
  },
  tabText: {
    ...typeScale.labelSmall,
    color: "#9CA3AF",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  tabContent: {
    marginBottom: spacing.xl,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#16182B",
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#262945",
    marginBottom: spacing.xs,
  },
  itemTitle: {
    ...typeScale.titleSmall,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  itemSub: {
    ...typeScale.bodySmall,
    color: "#9CA3AF",
    marginTop: 2,
  },
  emptyTabText: {
    ...typeScale.bodyMedium,
    color: "#6B7280",
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});
