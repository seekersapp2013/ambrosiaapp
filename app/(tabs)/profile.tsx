import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Image,
  TextInput, Share, Dimensions, Pressable, Alert,
} from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { verifyPin } from "@/utils/pinHash";
import { useAuthActions } from "@convex-dev/auth/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/tokens/colors";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { typeScale } from "@/tokens/typography";
import { elevation } from "@/tokens/shadows";

import { AppBackground } from "@/components/AppBackground";
import { AppLoader } from "@/components/AppLoader";
import { PrimaryButton, SecondaryButton, DestructiveButton, GhostButton, IconButton } from "@/components/ui/Button";
import { AppInput, TextareaInput } from "@/components/ui/Input";
import { SettingsRow, EmptyStateCard } from "@/components/ui/Card";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { SectionDivider } from "@/components/ui/Badge";
import { MobileCard } from "@/components/MobileCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────
type ProfileData = {
  userId: string;
  username: string | null;
  name?: string | null;
  bio?: string | null;
  avatar?: string | null;
  phoneNumber?: string | null;
  detectedCountry?: string | null;
  interests?: string[] | null;
  pinHash?: string | null;
  primaryCurrency?: string | null;
  user?: { email?: string | null } | null;
  stats?: { articles: number; reels: number; followers: number; following: number } | null;
};

type ProfileTab = "posts" | "bookmarks" | "interests" | "followers" | "following";

const INTEREST_OPTIONS = [
  "Health & Wellness", "Fitness", "Nutrition", "Mental Health",
  "Yoga & Meditation", "Sports", "Medical News", "Lifestyle",
  "Parenting", "Relationships", "Personal Finance", "Career Growth",
];

const TABS: { key: ProfileTab; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { key: "posts",      icon: "grid-outline",       activeIcon: "grid",        label: "Posts" },
  { key: "bookmarks",  icon: "bookmark-outline",   activeIcon: "bookmark",    label: "Saved" },
  { key: "interests",  icon: "heart-outline",      activeIcon: "heart",       label: "Topics" },
  { key: "followers",  icon: "people-outline",     activeIcon: "people",      label: "Followers" },
  { key: "following",  icon: "person-add-outline", activeIcon: "person-add",  label: "Following" },
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// ─── Styles (defined before component so they are in scope) ──────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  mutedText: { ...typeScale.bodyMD, color: Colors.textMuted },
  cardOverride: { overflow: "visible" },

  // Hero
  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.screenPaddingH,
    paddingBottom: spacing.space6,
    backgroundColor: Colors.bgBase,
  },
  avatarWrap: {
    width: 88, height: 88,
    borderRadius: radius.radiusFull,
    marginBottom: spacing.space3,
    position: "relative",
  },
  avatar: {
    width: 88, height: 88,
    borderRadius: radius.radiusFull,
    borderWidth: 3,
    borderColor: Colors.actionPrimary,
  },
  avatarPlaceholder: {
    width: 88, height: 88,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 3,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraOverlay: {
    position: "absolute", bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.actionPrimary,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: Colors.bgBase,
  },
  heroName: { ...typeScale.headingLG, color: Colors.textPrimary, marginBottom: 4 },
  heroMeta: {
    flexDirection: "row", alignItems: "center",
    gap: spacing.space2, marginBottom: 6,
    flexWrap: "wrap", justifyContent: "center",
  },
  heroUsername: { ...typeScale.bodySM, color: Colors.textMuted },
  rolePill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderRadius: radius.radiusFull, borderWidth: 1,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  rolePillText: { fontSize: 10, fontWeight: "700" as const },
  rolePillUser: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  rolePillUserText: { fontSize: 10, color: Colors.textMuted, fontWeight: "600" as const },
  jobBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.goldBorder,
    borderRadius: radius.radiusFull,
    paddingHorizontal: spacing.space2, paddingVertical: 3,
    marginBottom: 6,
  },
  jobBadgeText: { fontSize: 11, color: Colors.textGold, fontWeight: "600" as const },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.space3 },
  locationText: { ...typeScale.bodySM, color: Colors.textMuted },
  statsRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusLG,
    borderWidth: 1, borderColor: Colors.borderSubtle,
    paddingVertical: spacing.space3,
    paddingHorizontal: spacing.space5,
    marginBottom: spacing.space4,
    width: "100%",
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statValue: { ...typeScale.headingSM, color: Colors.textPrimary },
  statLabel: { ...typeScale.caption, color: Colors.textMuted },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.borderSubtle },
  heroActions: {
    flexDirection: "row", alignItems: "center",
    gap: spacing.space2, width: "100%",
  },
  heroBtn: { flex: 1 },

  // Bio
  bioSection: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.space4,
    gap: spacing.space3,
  },
  bioText: { ...typeScale.bodyMD, color: Colors.textSecondary, lineHeight: 22 },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.space2, alignItems: "center" },
  chip: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderWidth: 1, borderColor: Colors.borderFilled,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  chipText: { ...typeScale.caption, fontWeight: "600" as const, color: Colors.actionPrimary },

  // Edit form
  editSection: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.space5,
  },
  editSectionTitle: { ...typeScale.headingMD, color: Colors.textPrimary, marginBottom: spacing.space5 },
  fieldLabel: {
    ...typeScale.bodySM, fontWeight: "600" as const,
    color: Colors.textSecondary,
    marginBottom: spacing.space2, marginTop: spacing.space2,
  },
  interestGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.space2, marginBottom: spacing.space5 },
  interestTag: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.borderDefault,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  interestTagSelected: { backgroundColor: Colors.actionPrimary, borderColor: Colors.actionPrimary },
  interestTagText: { ...typeScale.bodySM, color: Colors.textMuted },
  interestTagTextSelected: { color: "#FFFFFF", fontWeight: "600" as const },
  editBtnRow: { flexDirection: "row", gap: spacing.space3, marginTop: spacing.space2 },
  editBtnHalf: { flex: 1 },

  // Tab bar
  tabBar: {
    borderTopWidth: 1, borderTopColor: Colors.borderSubtle,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  tabBarContent: { paddingHorizontal: spacing.space2 },
  tabItem: {
    alignItems: "center",
    paddingHorizontal: spacing.space4, paddingVertical: spacing.space3,
    borderBottomWidth: 2, borderBottomColor: "transparent",
    gap: 3,
  },
  tabItemActive: { borderBottomColor: Colors.actionPrimary },
  tabLabel: { ...typeScale.labelSM, color: Colors.iconDisabled },
  tabLabelActive: { color: Colors.iconAccent },
  tabContent: { minHeight: 200, paddingTop: spacing.space3 },

  // Post cards
  listGap: {
    paddingHorizontal: spacing.screenPaddingH,
    gap: spacing.space3,
    paddingBottom: spacing.space4,
  },
  postCard: {
    flexDirection: "row", gap: spacing.space3,
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: spacing.space3,
  },
  postThumb: { width: 72, height: 72, borderRadius: radius.radiusSM, flexShrink: 0 },
  postThumbPlaceholder: { backgroundColor: Colors.bgElevated, alignItems: "center", justifyContent: "center" },
  postInfo: { flex: 1, gap: 4 },
  postTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.space2 },
  postTitle: { ...typeScale.headingSM, fontSize: 14, color: Colors.textPrimary, flex: 1 },
  tagRow: { flexDirection: "row", gap: 6 },
  tagChip: {
    backgroundColor: Colors.statusInfoBg,
    borderRadius: radius.radiusXS,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  tagChipText: { fontSize: 10, color: Colors.statusInfo, fontWeight: "600" as const },
  postMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  postMetaText: { ...typeScale.caption, color: Colors.textDisabled },

  // Bookmark cards
  bookmarkCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: spacing.space4, gap: 6,
  },
  bookmarkBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  bookmarkBadgeText: { fontSize: 10, fontWeight: "700" as const },
  bookmarkTitle: { ...typeScale.headingSM, fontSize: 14, color: Colors.textPrimary },
  bookmarkAuthor: { ...typeScale.bodySM, fontSize: 12, color: Colors.textMuted },

  // Interests / stats grid
  interestsWrap: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.space4,
    gap: spacing.space4,
  },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.space3 },
  statCard: {
    width: "48%",
    backgroundColor: Colors.bgSurface,
    borderRadius: radius.radiusMD,
    borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: spacing.space4, gap: 4,
  },
  statCardValue: { ...typeScale.headingLG, fontSize: 22 },
  statCardLabel: { ...typeScale.bodySM, fontSize: 12, color: Colors.textMuted },
  interestsFooter: { ...typeScale.bodySM, fontSize: 12, color: Colors.textDisabled, lineHeight: 18 },

  // Follow list
  followRow: {
    flexDirection: "row", alignItems: "center",
    gap: spacing.space3, paddingVertical: spacing.space3,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  followAvatar: {
    width: 44, height: 44,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.borderSubtle,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden", flexShrink: 0,
  },
  followAvatarImg: { width: 44, height: 44, borderRadius: radius.radiusFull },
  followInfo: { flex: 1, gap: 2 },
  followName: { ...typeScale.headingSM, fontSize: 14, color: Colors.textPrimary },
  followUsername: { ...typeScale.bodySM, color: Colors.textMuted },
  followTime: { ...typeScale.caption, color: Colors.textDisabled },

  // Empty state
  emptyPad: { paddingVertical: spacing.space8 },

  // Settings menu
  menuSection: {
    paddingHorizontal: spacing.screenPaddingH,
    paddingVertical: spacing.space5,
  },
  sectionLabel: {
    ...typeScale.overline,
    color: Colors.textMuted,
    marginBottom: spacing.space3,
    letterSpacing: 1,
  },
  menuGroup: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    overflow: "hidden",
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },

  // Sheet buttons
  sheetBtnRow: { flexDirection: "row", gap: spacing.space3, marginTop: spacing.space2 },
  sheetBtnHalf: { flex: 1 },

  // PIN input
  pinInput: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    borderRadius: radius.radiusMD,
    padding: spacing.space4,
    fontSize: 24, color: Colors.textPrimary,
    textAlign: "center", letterSpacing: 12,
    marginBottom: spacing.space4,
  },
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthActions();

  const profileRaw = useQuery(api.profiles.getMyProfile);
  const profile = profileRaw as ProfileData | null | undefined;
  const updateProfile = useMutation(api.profiles.updateProfile);
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl);
  const profilePictureUrl = useQuery(
    api.profiles.getProfilePictureUrl,
    profile?.avatar ? { storageId: profile.avatar } : "skip"
  );
  const myArticles = useQuery(api.profiles.getMyArticles);
  const bookmarks = useQuery(api.engagement.getUserBookmarks);
  const mySubscription = useQuery(api.bookingSubscribers.getMySubscription);
  const comprehensiveInterests = useQuery(
    api.userInterests.getComprehensiveUserInterests,
    profile?.userId ? { userId: profile.userId as any } : "skip"
  );
  const myFollowers = useQuery(api.profiles.getMyFollowers);
  const myFollowing = useQuery(api.profiles.getMyFollowing);
  const myRoles = useQuery(api.moderation.getMyRoles);
  const isModerator = useQuery(api.moderation.amIModerator);
  const needsSetup = useQuery(api.moderationQueries.needsModerationSetup);
  const deleteArticle = useMutation(api.articles.deleteArticle);
  const deleteProfilePicture = useMutation(api.profiles.deleteProfilePicture);

  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [showInterestsExpanded, setShowInterestsExpanded] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [showPinSheet, setShowPinSheet] = useState(false);
  const [showSignOutSheet, setShowSignOutSheet] = useState(false);

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.name || "");
      setBio(profile.bio || "");
      setInterests(profile.interests || []);
    }
  }, [profile]);

  const toggleInterest = (interest: string) =>
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );

  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to your photo library");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]) await uploadProfilePicture(result.assets[0].uri);
    } catch (e: any) {
      Alert.alert("Error", "Failed to pick image: " + (e.message || "Unknown error"));
    }
  };

  const uploadProfilePicture = async (uri: string) => {
    setIsUploadingImage(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      if (!uploadResponse.ok) throw new Error("Upload failed: " + uploadResponse.status);
      const { storageId } = await uploadResponse.json();
      await updateProfile({ avatar: storageId });
      Alert.alert("Success", "Profile picture updated");
    } catch (e: any) {
      Alert.alert("Error", "Failed to upload: " + (e.message || "Unknown error"));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateProfile({
        name: displayName || undefined,
        bio: bio || undefined,
        interests: interests.length > 0 ? interests : undefined,
      });
      Alert.alert("Success", "Profile updated successfully");
      setIsEditing(false);
    } catch {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setDisplayName(profile.name || "");
      setBio(profile.bio || "");
      setInterests(profile.interests || []);
    }
    setIsEditing(false);
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out ${profile?.name || profile?.username || "my"} profile on Ambrosia: @${profile?.username || ""}`,
      });
    } catch {}
  };

  const doSignOut = async () => {
    setShowSignOutSheet(false);
    try { await signOut(); } catch (e) { console.error("signOut error:", e); }
    try {
      const authKeys = [
        "__convexAuthJWT_ambrosiaauth",
        "__convexAuthRefreshToken_ambrosiaauth",
        "__convexAuthOAuthVerifier_ambrosiaauth",
        "__convexAuthServerStateFetchTime_ambrosiaauth",
      ];
      await Promise.allSettled(authKeys.map((k) => SecureStore.deleteItemAsync(k)));
      if (typeof window !== "undefined" && window.localStorage)
        authKeys.forEach((k) => window.localStorage.removeItem(k));
    } catch (e) { console.error("Storage clear error:", e); }
    router.replace("/");
  };

  const handlePinSubmit = () => {
    if (!profile?.pinHash) { Alert.alert("Error", "No PIN found"); setShowPinSheet(false); return; }
    if (pinInput.length !== 4) { Alert.alert("Invalid PIN", "Please enter a 4-digit PIN"); return; }
    if (verifyPin(pinInput, profile.pinHash)) {
      setShowPinSheet(false); setPinInput("");
      Alert.alert("PIN Verified", "Your PIN is correct.");
    } else {
      Alert.alert("Incorrect PIN", "The PIN you entered is incorrect."); setPinInput("");
    }
  };

  const handleDeleteArticle = (articleId: Id<"articles">) => {
    Alert.alert("Delete Article", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await deleteArticle({ articleId }); }
          catch (e: any) { Alert.alert("Error", e.message || "Failed to delete article"); }
        },
      },
    ]);
  };

  const handleDeleteProfilePicture = () => {
    if (!profile?.avatar) { Alert.alert("Error", "No profile picture to delete"); return; }
    Alert.alert("Remove Photo", "Remove your profile picture?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove", style: "destructive",
        onPress: async () => {
          try { await deleteProfilePicture(); }
          catch (e: any) { Alert.alert("Error", e.message || "Failed to delete profile picture"); }
        },
      },
    ]);
  };

  if (profile === undefined) return <AppLoader />;
  if (profile === null) {
    return (
      <AppBackground style={styles.centered}>
        <Text style={styles.mutedText}>No profile found. Please sign in again.</Text>
      </AppBackground>
    );
  }

  // ── Tab renderers ─────────────────────────────────────────────────────────
  const renderPosts = () => {
    if (myArticles === undefined)
      return <ActivityIndicator color={Colors.actionPrimary} style={{ marginTop: 32 }} />;
    if (!myArticles.length)
      return <EmptyStateCard icon="document-text-outline" title="No posts yet" subtitle="Your published articles will appear here." style={styles.emptyPad} />;
    return (
      <View style={styles.listGap}>
        {(myArticles as any[]).map((article) => (
          <View key={article._id} style={styles.postCard}>
            {article.coverImage
              ? <Image source={{ uri: article.coverImage }} style={styles.postThumb} resizeMode="cover" accessible={false} />
              : <View style={[styles.postThumb, styles.postThumbPlaceholder]}><Ionicons name="document-text-outline" size={22} color={Colors.iconSecondary} /></View>
            }
            <View style={styles.postInfo}>
              <View style={styles.postTitleRow}>
                <Text style={styles.postTitle} numberOfLines={2} allowFontScaling={true}>{article.title}</Text>
                <Pressable onPress={() => handleDeleteArticle(article._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="Delete article">
                  <Ionicons name="trash-outline" size={15} color={Colors.statusDanger} />
                </Pressable>
              </View>
              {article.tags?.length > 0 && (
                <View style={styles.tagRow}>
                  {(article.tags as string[]).slice(0, 2).map((tag: string) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText} allowFontScaling={false}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.postMeta}>
                <Ionicons name="eye-outline" size={12} color={Colors.iconDisabled} />
                <Text style={styles.postMetaText} allowFontScaling={false}>{article.views ?? 0} views</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderBookmarks = () => {
    if (bookmarks === undefined)
      return <ActivityIndicator color={Colors.actionPrimary} style={{ marginTop: 32 }} />;
    if (!bookmarks.length)
      return <EmptyStateCard icon="bookmark-outline" title="No bookmarks yet" subtitle="Articles and reels you save will appear here." style={styles.emptyPad} />;
    return (
      <View style={styles.listGap}>
        {(bookmarks as any[]).map((bm) => (
          <View key={bm._id} style={styles.bookmarkCard}>
            <View style={styles.bookmarkBadge}>
              <Ionicons
                name={bm.type === "reel" ? "play-circle-outline" : "document-text-outline"}
                size={11}
                color={bm.type === "reel" ? Colors.palette.primaryCoral : Colors.statusInfo}
              />
              <Text style={[styles.bookmarkBadgeText, { color: bm.type === "reel" ? Colors.palette.primaryCoral : Colors.statusInfo }]} allowFontScaling={false}>
                {bm.type === "reel" ? "Reel" : "Article"}
              </Text>
            </View>
            <Text style={styles.bookmarkTitle} numberOfLines={2} allowFontScaling={true}>
              {bm.content?.title || bm.content?.caption || "Untitled"}
            </Text>
            {(bm.content?.author?.name || bm.content?.author?.username) ? (
              <Text style={styles.bookmarkAuthor} allowFontScaling={true}>
                by {bm.content.author.name || `@${bm.content.author.username}`}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    );
  };

  const renderInterests = () => {
    if (comprehensiveInterests === undefined)
      return <ActivityIndicator color={Colors.actionPrimary} style={{ marginTop: 32 }} />;
    const si = (comprehensiveInterests.dynamicInterests as any)?.socialInteractions;
    const ci = (comprehensiveInterests.dynamicInterests as any)?.contentInteractions;
    const bi = (comprehensiveInterests.dynamicInterests as any)?.bookingInteractions;
    const ni = (comprehensiveInterests.dynamicInterests as any)?.notificationInteractions;
    const sg = comprehensiveInterests.socialGraph as any;
    const stats = [
      { label: "Health Topics",     value: comprehensiveInterests.staticInterests?.length ?? 0, icon: "heart-outline" as const,       color: Colors.actionPrimary },
      { label: "Following",         value: si?.followingCount ?? 0,                              icon: "person-add-outline" as const,   color: Colors.statusInfo },
      { label: "Followers",         value: si?.followersCount ?? 0,                              icon: "people-outline" as const,       color: Colors.palette.purple },
      { label: "Content Interests", value: ci?.topContentInterests?.length ?? 0,                 icon: "newspaper-outline" as const,    color: Colors.statusWarning },
      { label: "Bookings & Events", value: (bi?.clientBookingsCount ?? 0) + (bi?.providerBookingsCount ?? 0), icon: "calendar-outline" as const, color: Colors.statusSuccess },
      { label: "Social Network",    value: sg?.mutualConnections ?? 0,                           icon: "git-network-outline" as const,  color: Colors.palette.primaryCoral },
      { label: "Engagement",        value: ni?.clickedCount ?? 0,                                icon: "trending-up-outline" as const,  color: Colors.textGold },
    ];
    return (
      <View style={styles.interestsWrap}>
        <Text style={styles.sectionLabel} allowFontScaling={false}>Activity Overview</Text>
        <View style={styles.statsGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={18} color={s.color} />
              <Text style={[styles.statCardValue, { color: s.color }]} allowFontScaling={false}>{s.value}</Text>
              <Text style={styles.statCardLabel} allowFontScaling={true}>{s.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.interestsFooter} allowFontScaling={true}>
          Your interests update automatically based on your activity, helping us surface better content and connections.
        </Text>
      </View>
    );
  };

  const renderFollowList = (
    list: any[] | undefined,
    emptyIcon: keyof typeof Ionicons.glyphMap,
    emptyTitle: string,
    emptySub: string,
  ) => {
    if (list === undefined)
      return <ActivityIndicator color={Colors.actionPrimary} style={{ marginTop: 32 }} />;
    if (!list.length)
      return <EmptyStateCard icon={emptyIcon} title={emptyTitle} subtitle={emptySub} style={styles.emptyPad} />;
    return (
      <View style={styles.listGap}>
        {list.map((f) => (
          <View key={f._id} style={styles.followRow}>
            <View style={styles.followAvatar}>
              {f.profile?.avatar
                ? <Image source={{ uri: f.profile.avatar }} style={styles.followAvatarImg} accessible={false} />
                : <Ionicons name="person" size={20} color={Colors.iconSecondary} />}
            </View>
            <View style={styles.followInfo}>
              <Text style={styles.followName} numberOfLines={1} allowFontScaling={true}>
                {f.user?.name || f.profile?.name || "Unknown"}
              </Text>
              {f.profile?.username
                ? <Text style={styles.followUsername} allowFontScaling={true}>@{f.profile.username}</Text>
                : null}
              {f.createdAt
                ? <Text style={styles.followTime} allowFontScaling={false}>{timeAgo(f.createdAt)}</Text>
                : null}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "posts":     return renderPosts();
      case "bookmarks": return renderBookmarks();
      case "interests": return renderInterests();
      case "followers": return renderFollowList(myFollowers as any[], "people-outline", "No followers yet", "When people follow you, they'll appear here.");
      case "following": return renderFollowList(myFollowing as any[], "person-add-outline", "Not following anyone", "Discover and follow people to see their content.");
    }
  };

  // ── Derived role info ─────────────────────────────────────────────────────
  const isPrimaryAdmin = myRoles?.some((r: any) => r.isPrimaryAdmin);
  const isAdmin = myRoles?.some((r: any) => r.name === "Admin");
  const roleName = myRoles?.find((r: any) => r.isPrimaryAdmin)?.name ?? myRoles?.[0]?.name;
  const roleColor = isPrimaryAdmin
    ? Colors.palette.purple
    : isAdmin
    ? Colors.statusInfo
    : Colors.statusSuccess;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppBackground style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <MobileCard style={styles.cardOverride}>
        {/* HERO */}
        <View style={[styles.hero, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={handlePickImage}
            disabled={isUploadingImage}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Change profile picture"
          >
            {profilePictureUrl
              ? <Image source={{ uri: profilePictureUrl }} style={styles.avatar} accessible={false} />
              : <View style={styles.avatarPlaceholder}><Ionicons name="person" size={40} color={Colors.iconSecondary} /></View>
            }
            <View style={styles.cameraOverlay}>
              {isUploadingImage
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Ionicons name="camera" size={13} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          <Text style={styles.heroName} numberOfLines={1} allowFontScaling={false}>
            {profile.name || profile.username || "No name"}
          </Text>

          <View style={styles.heroMeta}>
            {profile.username
              ? <Text style={styles.heroUsername} allowFontScaling={false}>@{profile.username}</Text>
              : null}
            {myRoles && myRoles.length > 0
              ? <View style={[styles.rolePill, { backgroundColor: roleColor + "22", borderColor: roleColor + "55" }]}>
                  <Ionicons name="shield-checkmark" size={9} color={roleColor} />
                  <Text style={[styles.rolePillText, { color: roleColor }]} allowFontScaling={false}>{roleName}</Text>
                </View>
              : <View style={styles.rolePillUser}>
                  <Text style={styles.rolePillUserText} allowFontScaling={false}>Member</Text>
                </View>
            }
          </View>

          {mySubscription?.jobTitle
            ? <View style={styles.jobBadge}>
                <Ionicons name="briefcase-outline" size={11} color={Colors.textGold} />
                <Text style={styles.jobBadgeText} allowFontScaling={false}>{mySubscription.jobTitle}</Text>
              </View>
            : null}

          {profile.detectedCountry
            ? <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={Colors.iconAccent} />
                <Text style={styles.locationText} allowFontScaling={false}>{profile.detectedCountry}</Text>
              </View>
            : null}

          <View style={[styles.statsRow, elevation.elevation1]}>
            {[
              { value: profile.stats?.articles ?? 0,  label: "Posts" },
              { value: profile.stats?.followers ?? 0, label: "Followers" },
              { value: profile.stats?.following ?? 0, label: "Following" },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue} allowFontScaling={false}>{s.value}</Text>
                  <Text style={styles.statLabel} allowFontScaling={false}>{s.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={styles.statDivider} />}
              </React.Fragment>
            ))}
          </View>

          <View style={styles.heroActions}>
            <SecondaryButton label="Edit Profile" onPress={() => setIsEditing(true)} style={styles.heroBtn} />
            <IconButton
              icon={<Ionicons name="share-social-outline" size={18} color={Colors.iconPrimary} />}
              onPress={handleShareProfile}
              accessibilityLabel="Share profile"
            />
            {profile.avatar
              ? <IconButton
                  icon={<Ionicons name="trash-outline" size={16} color={Colors.statusDanger} />}
                  onPress={handleDeleteProfilePicture}
                  accessibilityLabel="Remove profile picture"
                />
              : null}
          </View>
        </View>

        {/* BIO */}
        {(profile.bio || (profile.interests && profile.interests.length > 0))
          ? <View style={styles.bioSection}>
              {profile.bio
                ? <Text style={styles.bioText} allowFontScaling={true}>{profile.bio}</Text>
                : null}
              {profile.interests && profile.interests.length > 0
                ? <View style={styles.chipsRow}>
                    {(showInterestsExpanded ? profile.interests : profile.interests.slice(0, 4)).map((interest) => (
                      <View key={interest} style={styles.chip}>
                        <Text style={styles.chipText} allowFontScaling={false}>{interest}</Text>
                      </View>
                    ))}
                    {profile.interests.length > 4 && (
                      <GhostButton
                        label={showInterestsExpanded ? "less" : `+${profile.interests.length - 4} more`}
                        onPress={() => setShowInterestsExpanded((v) => !v)}
                      />
                    )}
                  </View>
                : null}
            </View>
          : null}

        <SectionDivider />

        {/* EDIT FORM */}
        {isEditing && (
          <View style={styles.editSection}>
            <Text style={styles.editSectionTitle} allowFontScaling={false}>Edit Profile</Text>
            <AppInput
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              accessibilityLabel="Display name"
            />
            <TextareaInput
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself"
              maxLength={200}
              accessibilityLabel="Bio"
            />
            <Text style={styles.fieldLabel} allowFontScaling={false}>Interests</Text>
            <View style={styles.interestGrid}>
              {INTEREST_OPTIONS.map((interest) => {
                const selected = interests.includes(interest);
                return (
                  <Pressable
                    key={interest}
                    onPress={() => toggleInterest(interest)}
                    accessibilityRole="checkbox"
                    accessibilityLabel={interest}
                    accessibilityState={{ checked: selected }}
                    style={[styles.interestTag, selected && styles.interestTagSelected]}
                  >
                    <Text style={[styles.interestTagText, selected && styles.interestTagTextSelected]} allowFontScaling={false}>
                      {interest}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.editBtnRow}>
              <SecondaryButton label="Cancel" onPress={handleCancel} disabled={isLoading} style={styles.editBtnHalf} />
              <PrimaryButton label="Save Changes" onPress={handleSave} loading={isLoading} style={styles.editBtnHalf} />
            </View>
          </View>
        )}

        {/* TABS */}
        {!isEditing && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabBar}
              contentContainerStyle={styles.tabBarContent}
            >
              {TABS.map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    accessibilityRole="tab"
                    accessibilityLabel={tab.label}
                    accessibilityState={{ selected: active }}
                    style={[styles.tabItem, active && styles.tabItemActive]}
                  >
                    <Ionicons
                      name={active ? tab.activeIcon : tab.icon}
                      size={20}
                      color={active ? Colors.iconAccent : Colors.iconDisabled}
                    />
                    <Text style={[styles.tabLabel, active && styles.tabLabelActive]} allowFontScaling={false}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.tabContent}>{renderTabContent()}</View>

            <SectionDivider style={{ marginTop: 8 }} />

            {/* SETTINGS MENU */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionLabel} allowFontScaling={false}>Account</Text>
              <View style={styles.menuGroup}>
                <SettingsRow icon="create-outline"       label="Edit Profile"  iconColor={Colors.iconAccent}   onPress={() => setIsEditing(true)} />
                <SettingsRow icon="settings-outline"     label="Settings"      iconColor={Colors.iconAccent}   onPress={() => router.push("/auth/password/ChangePassword")} />
                <SettingsRow icon="share-social-outline" label="Share Profile" iconColor={Colors.statusInfo}   onPress={handleShareProfile} isLast />
              </View>

              {(needsSetup || isModerator) && (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 16 }]} allowFontScaling={false}>Moderation</Text>
                  <View style={styles.menuGroup}>
                    {needsSetup
                      ? <SettingsRow
                          icon="construct-outline"
                          label="Setup Moderation"
                          iconColor={Colors.statusWarning}
                          onPress={() => Alert.alert("Moderation Setup", "Navigate to the moderation setup screen to initialize the system.")}
                          isLast={!isModerator}
                        />
                      : null}
                    {isModerator
                      ? <SettingsRow
                          icon="shield-checkmark-outline"
                          label="Admin Dashboard"
                          iconColor={Colors.palette.purple}
                          onPress={() => router.push("/(tabs)/admin/AdminDashboard")}
                          isLast
                        />
                      : null}
                  </View>
                </>
              )}

              <View style={[styles.menuGroup, { marginTop: 16 }]}>
                <SettingsRow
                  icon="log-out-outline"
                  label="Sign Out"
                  iconColor={Colors.statusDanger}
                  isDestructive
                  showChevron={false}
                  onPress={() => setShowSignOutSheet(true)}
                  isLast
                />
              </View>
            </View>
          </>
        )}
        </MobileCard>
      </ScrollView>

      {/* SIGN OUT DIALOG */}
      <BottomSheet
        visible={showSignOutSheet}
        onClose={() => setShowSignOutSheet(false)}
        title="Sign Out"
        body="Are you sure you want to sign out of your account?"
        variant="dialog"
      >
        <View style={styles.sheetBtnRow}>
          <SecondaryButton label="Cancel" onPress={() => setShowSignOutSheet(false)} style={styles.sheetBtnHalf} />
          <DestructiveButton label="Sign Out" onPress={doSignOut} style={styles.sheetBtnHalf} />
        </View>
      </BottomSheet>

      {/* PIN SHEET */}
      <BottomSheet
        visible={showPinSheet}
        onClose={() => { setShowPinSheet(false); setPinInput(""); }}
        title="Enter Your PIN"
        body="Enter your 4-digit transaction PIN to continue."
      >
        <TextInput
          style={styles.pinInput}
          value={pinInput}
          onChangeText={(t) => setPinInput(t.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          secureTextEntry
          placeholder="••••"
          placeholderTextColor={Colors.textDisabled}
          autoFocus
          accessibilityLabel="PIN input"
        />
        <View style={styles.sheetBtnRow}>
          <SecondaryButton label="Cancel" onPress={() => { setShowPinSheet(false); setPinInput(""); }} style={styles.sheetBtnHalf} />
          <PrimaryButton label="Verify" onPress={handlePinSubmit} disabled={pinInput.length !== 4} style={styles.sheetBtnHalf} />
        </View>
      </BottomSheet>
    </AppBackground>
  );
}
