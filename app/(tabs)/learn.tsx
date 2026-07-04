/**
 * Learn Tab
 * Course-centric content feed — articles and reels that have been
 * approved by an admin (approvalStatus APPROVED | NOT_REQUIRED).
 *
 * View modes:
 *   "all"        — all publicly approved content
 *   "my-courses" — content belonging to courses the current user created
 *   "enrolled"   — content from courses the user is enrolled in
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard, useCardInsets } from "@/components/MobileCard";
import { TopNav } from "@/components/TopNav";
import { ContentCard } from "@/components/stream/ContentCard";
import { EmptyState } from "@/components/stream/EmptyState";
import { LoadingSpinner } from "@/components/stream/LoadingSpinner";
import { Colors } from "@/constants/Colors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = "all" | "my-courses" | "enrolled";

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function LearnScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [showManageSheet, setShowManageSheet] = useState(false);
  const cardInsets = useCardInsets();

  // Feed query — backend enforces approval filtering
  const feedData = useQuery(api.courses.getCourseRelatedContent, {
    limit: 50,
    viewMode,
  });

  // Courses list for the manage sheet
  const myCourses = useQuery(api.courses.getMyCourses, { limit: 50 });

  // Current user — needed for follow/delete features in ContentCard
  const currentUser = useQuery(api.users.viewer);

  // Build a merged + sorted flat feed list — same shape as listUnifiedFeed
  // Each item already has contentType stamped on it by getCourseRelatedContent
  const feedItems: any[] = React.useMemo(() => {
    if (!feedData) return [];
    const articles = (feedData.articles ?? []).map((a: any) => ({
      ...a,
      contentType: "article" as const,
    }));
    const reels = (feedData.reels ?? []).map((r: any) => ({
      ...r,
      contentType: "reel" as const,
    }));
    return [...articles, ...reels].sort((a, b) => b.createdAt - a.createdAt);
  }, [feedData]);

  const isLoading = feedData === undefined;

  const handleArticlePress = useCallback(
    (articleId: string) => {
      history.push("/(tabs)/learn");
      router.push({
        pathname: "/(tabs)/article-viewer" as any,
        params: { articleId },
      });
    },
    [router, history]
  );

  const handleReelPress = useCallback(
    (_reelId: string) => {
      // All reels open in the Pulse full-screen viewer (pulse.tsx)
      history.push("/(tabs)/learn");
      router.push("/(tabs)/pulse" as any);
    },
    [router, history]
  );

  const handleCoursePress = useCallback(
    (courseId: string) => {
      history.push("/(tabs)/learn");
      router.push({
        pathname: "/(tabs)/course-viewer" as any,
        params: { courseId },
      });
    },
    [router, history]
  );

  const handleManageCoursePress = useCallback(
    (courseId: string) => {
      setShowManageSheet(false);
      history.push("/(tabs)/learn");
      router.push({
        pathname: "/(tabs)/edit-course" as any,
        params: { courseId },
      });
    },
    [router, history]
  );

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      return (
        <ContentCard
          item={item}
          currentUserId={currentUser?._id}
          onArticlePress={handleArticlePress}
          onPulsePress={handleReelPress}
          onDeleteSuccess={(_id) => {
            // Convex reactive query auto-removes the item — no local state needed
          }}
        />
      );
    },
    [handleArticlePress, handleReelPress, currentUser?._id]
  );

  const emptyMessages: Record<ViewMode, { title: string; subtitle: string }> = {
    all: {
      title: "No content yet",
      subtitle: "Approved articles and reels will appear here.",
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
              onPress={() => {
                history.push("/(tabs)/learn");
                router.push("/(tabs)/write-article" as any);
              }}
            />
            <CreationCircle
              icon="videocam-outline"
              label="Pulse"
              color={Colors.palette.purple}
              onPress={() => {
                history.push("/(tabs)/learn");
                router.push("/(tabs)/write-reel" as any);
              }}
            />
            <CreationCircle
              icon="school-outline"
              label="Course"
              color={Colors.palette.blue}
              onPress={() => {
                history.push("/(tabs)/learn");
                router.push("/(tabs)/create-course" as any);
              }}
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
                style={[
                  styles.viewModeTab,
                  viewMode === mode && styles.viewModeTabActive,
                ]}
                onPress={() => setViewMode(mode)}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: viewMode === mode }}
              >
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === mode && styles.viewModeTextActive,
                  ]}
                >
                  {mode === "all"
                    ? "All Content"
                    : mode === "my-courses"
                    ? "My Courses"
                    : "Enrolled"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Content Feed ── */}
          {isLoading ? (
            <LoadingSpinner label="Loading content…" />
          ) : (
            <FlatList
              data={feedItems}
              keyExtractor={(item) => item._id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <EmptyState
                  icon="school-outline"
                  title={empty.title}
                  subtitle={empty.subtitle}
                  ctaLabel={viewMode === "all" ? "Create a Course" : undefined}
                  onCta={
                    viewMode === "all"
                      ? () => {
                          history.push("/(tabs)/learn");
                          router.push("/(tabs)/create-course" as any);
                        }
                      : undefined
                  }
                />
              }
            />
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
