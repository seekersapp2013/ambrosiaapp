/**
 * Course Viewer Screen
 * View a course, enroll, and track progress through its curriculum.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { LoadingSpinner } from "@/components/stream/LoadingSpinner";
import { EmptyState } from "@/components/stream/EmptyState";
import { ContentPaywallSheet } from "@/components/ContentPaywallSheet";
import { Colors } from "@/constants/Colors";

export default function CourseViewerScreen() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const course = useQuery(
    api.courses.getCourse,
    courseId ? { courseId: courseId as Id<"courses"> } : "skip"
  );
  const progressData = useQuery(
    api.courseProgress.getCourseProgress,
    courseId ? { courseId: courseId as Id<"courses"> } : "skip"
  );

  const enroll = useMutation(api.courseProgress.enrollInCourse);
  const markCompleted = useMutation(api.courseProgress.markContentCompleted);

  const [isEnrolling, setIsEnrolling] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [purchaseGranted, setPurchaseGranted] = useState(false);

  if (!courseId) return null;
  if (course === undefined || progressData === undefined) {
    return <AppBackground><LoadingSpinner label="Loading course…" /></AppBackground>;
  }
  if (course === null) {
    return (
      <AppBackground>
        <View style={styles.centeredWrap}>
          <EmptyState icon="alert-circle-outline" title="Course not found" />
        </View>
      </AppBackground>
    );
  }

  const isEnrolled = progressData?.enrollment != null || purchaseGranted;
  const progress = progressData?.progressPercentage ?? 0;
  const completedIds = new Set((progressData?.completedContent ?? []).map((c: any) => c.contentId));
  const contentItems = course.content ?? [];
  const isFree = !course.totalPrice || course.totalPrice === 0;
  const authorName = course.author?.name ?? course.author?.username ?? "Unknown";

  const handleEnroll = async () => {
    setIsEnrolling(true);
    try {
      await enroll({ courseId: courseId as Id<"courses"> });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to enroll.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleOpenItem = async (item: any) => {
    const contentId = item.contentId;
    setOpeningId(contentId);
    try {
      if (isEnrolled) {
        await markCompleted({
          courseId: courseId as Id<"courses">,
          contentId: contentId as Id<"articles"> | Id<"reels">,
        });
      }
      if (item.contentType === "article") {
        router.push({
          pathname: "/(tabs)/article-viewer" as any,
          params: { articleId: contentId },
        });
      } else {
        router.push({
          pathname: "/(tabs)/reel-viewer" as any,
          params: { reelId: contentId },
        });
      }
    } catch {
      // Navigate anyway if mark-completed fails
      if (item.contentType === "article") {
        router.push({ pathname: "/(tabs)/article-viewer" as any, params: { articleId: contentId } });
      } else {
        router.push({ pathname: "/(tabs)/reel-viewer" as any, params: { reelId: contentId } });
      }
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <AppBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MobileCard>
          {/* Back button (floating over cover) */}
          <View style={styles.coverWrap}>
            {course.coverImage ? (
              <Image
                source={{ uri: course.coverImage }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="school-outline" size={40} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Course info */}
          <View style={styles.infoSection}>
            <Text style={styles.courseTitle}>{course.title}</Text>

            {/* Author row */}
            <View style={styles.authorRow}>
              <View style={styles.authorAvatar}>
                {course.author?.avatar ? (
                  <Image source={{ uri: course.author.avatar }} style={styles.authorAvatarImg} />
                ) : (
                  <Ionicons name="person-circle-outline" size={18} color={Colors.textMuted} />
                )}
              </View>
              <Text style={styles.authorName}>{authorName}</Text>
            </View>

            {/* Category + tags */}
            {course.category ? (
              <View style={styles.chipsRow}>
                <View style={styles.categoryChip}>
                  <Text style={styles.categoryChipText}>{course.category}</Text>
                </View>
                {(course.tags ?? []).slice(0, 3).map((tag: string) => (
                  <View key={tag} style={styles.tagChip}>
                    <Text style={styles.tagChipText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatPill icon="layers-outline" value={`${contentItems.length} lessons`} />
              <StatPill
                icon="pricetag-outline"
                value={isFree ? "Free" : `${course.priceCurrency} ${course.totalPrice}`}
                color={isFree ? Colors.statusInfo : Colors.statusWarning}
              />
              {isEnrolled && (
                <StatPill icon="checkmark-circle-outline" value="Enrolled" color={Colors.statusSuccess} />
              )}
            </View>

            {/* Description */}
            <TouchableOpacity
              onPress={() => setDescExpanded(!descExpanded)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={descExpanded ? "Collapse description" : "Expand description"}
            >
              <Text style={styles.description} numberOfLines={descExpanded ? undefined : 3}>
                {course.description}
              </Text>
              <Text style={styles.descToggle}>
                {descExpanded ? "Show less" : "Show more"}
              </Text>
            </TouchableOpacity>

            {/* Progress bar (if enrolled) */}
            {isEnrolled && (
              <View style={styles.progressWrap}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Your Progress</Text>
                  <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, progress)}%` as any }]} />
                </View>
              </View>
            )}
          </View>

          {/* Curriculum */}
          <View style={styles.curriculumSection}>
            <Text style={styles.curriculumTitle}>Curriculum</Text>

            {contentItems.length === 0 ? (
              <EmptyState
                icon="document-outline"
                title="No content yet"
                subtitle="This course has no lessons added yet."
              />
            ) : (
              contentItems.map((item: any, index: number) => {
                const isCompleted = completedIds.has(item.contentId);
                const contentTitle =
                  item.content?.title ?? item.content?.caption ?? `Lesson ${index + 1}`;
                const isGated = item.content?.isGated && !isEnrolled;
                const isOpening = openingId === item.contentId;

                return (
                  <View key={`${item.contentType}-${item.contentId}`} style={styles.lessonRow}>
                    {/* Completed / number badge */}
                    <View
                      style={[
                        styles.lessonBadge,
                        isCompleted && styles.lessonBadgeCompleted,
                      ]}
                    >
                      {isCompleted ? (
                        <Ionicons name="checkmark" size={14} color={Colors.statusSuccess} />
                      ) : (
                        <Text style={styles.lessonBadgeText}>{index + 1}</Text>
                      )}
                    </View>

                    {/* Type icon */}
                    <Ionicons
                      name={item.contentType === "article" ? "newspaper-outline" : "videocam-outline"}
                      size={15}
                      color={item.contentType === "article" ? Colors.primary : Colors.palette.purple}
                      style={styles.lessonTypeIcon}
                    />

                    {/* Title */}
                    <View style={styles.lessonInfo}>
                      <Text style={styles.lessonTitle} numberOfLines={2}>
                        {contentTitle}
                      </Text>
                      {isGated && (
                        <Text style={styles.lessonGated}>🔒 Requires enrollment</Text>
                      )}
                    </View>

                    {/* Open button */}
                    <TouchableOpacity
                      style={[styles.openBtn, isGated && styles.openBtnDisabled]}
                      onPress={isGated ? undefined : () => handleOpenItem(item)}
                      disabled={isGated || isOpening}
                      accessibilityRole="button"
                      accessibilityLabel={isGated ? "Requires enrollment" : "Open lesson"}
                    >
                      {isOpening ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={[styles.openBtnText, isGated && styles.openBtnTextDisabled]}>
                          {isCompleted ? "Review" : "Open"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </View>

          {/* Spacer for sticky CTA */}
          <View style={{ height: 100 }} />
        </MobileCard>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.ctaWrap}>
        {isEnrolled ? (
          <View style={styles.enrolledCta}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.statusSuccess} />
            <Text style={styles.enrolledCtaText}>Enrolled ✓</Text>
          </View>
        ) : isFree ? (
          <TouchableOpacity
            style={styles.enrollBtn}
            onPress={handleEnroll}
            disabled={isEnrolling}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Enroll for free"
          >
            {isEnrolling ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.enrollBtnText}>Enroll for Free</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.purchaseBtn}
            onPress={() => setPaywallOpen(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Purchase course for ${course.priceCurrency} ${course.totalPrice}`}
          >
            <Text style={styles.purchaseBtnText}>
              Purchase Course — {course.priceCurrency} {course.totalPrice}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ContentPaywallSheet — opened when user taps "Purchase Course" */}
      <ContentPaywallSheet
        visible={paywallOpen}
        contentType="course"
        contentId={courseId}
        price={course.totalPrice ?? 0}
        currency={course.priceCurrency ?? "USD"}
        title={course.title ?? ""}
        creatorName={authorName}
        onClose={() => setPaywallOpen(false)}
        onSuccess={(_paymentId) => {
          // purchaseContent auto-enrolls on the backend; reflect locally
          setPurchaseGranted(true);
          setPaywallOpen(false);
        }}
      />
    </AppBackground>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  color?: string;
}) {
  return (
    <View style={pillStyles.pill}>
      <Ionicons name={icon} size={12} color={color ?? Colors.textMuted} />
      <Text style={[pillStyles.text, color ? { color } : null]}>{value}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  centeredWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Cover
  coverWrap: { width: "100%", aspectRatio: 16 / 9, position: "relative" },
  cover: { width: "100%", height: "100%" },
  coverPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.blueSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Info
  infoSection: {
    padding: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 30,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  authorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  authorAvatarImg: { width: 22, height: 22, borderRadius: 11 },
  authorName: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  categoryChip: {
    backgroundColor: Colors.blueSurface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },
  categoryChipText: { fontSize: 11, color: Colors.statusInfo, fontWeight: "600" },
  tagChip: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagChipText: { fontSize: 10, color: Colors.textMuted },

  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },

  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },
  descToggle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },

  // Progress
  progressWrap: { gap: 6 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabel: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  progressPct: { fontSize: 13, fontWeight: "700", color: Colors.statusSuccess },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.bgElevated,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.statusSuccess,
    borderRadius: 3,
  },

  // Curriculum
  curriculumSection: {
    padding: 20,
    gap: 4,
  },
  curriculumTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  lessonBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    alignItems: "center",
    justifyContent: "center",
  },
  lessonBadgeCompleted: {
    backgroundColor: Colors.statusSuccessBg,
    borderColor: Colors.greenBorder,
  },
  lessonBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  lessonTypeIcon: { marginHorizontal: 2 },
  lessonInfo: { flex: 1, gap: 2 },
  lessonTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  lessonGated: {
    fontSize: 10,
    color: Colors.statusWarning,
  },
  openBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    minWidth: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  openBtnDisabled: {
    backgroundColor: Colors.bgSurface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  openBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  openBtnTextDisabled: {
    color: Colors.textDisabled,
  },

  // Sticky CTA
  ctaWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: Colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  enrollBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.statusSuccess,
    alignItems: "center",
    justifyContent: "center",
  },
  enrollBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  purchaseBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  enrolledCta: {
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.statusSuccessBg,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  enrolledCtaText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.statusSuccess,
  },
});
