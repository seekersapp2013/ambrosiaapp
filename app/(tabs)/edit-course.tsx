/**
 * Edit Course Screen
 * Pre-filled form to update an existing course.
 * Header includes "Manage Content" and "Publish" buttons.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { LoadingSpinner } from "@/components/stream/LoadingSpinner";
import { EmptyState } from "@/components/stream/EmptyState";
import { Colors } from "@/constants/Colors";

const CATEGORIES = [
  "Health", "Fitness", "Nutrition", "Mental Health", "Medicine",
  "Wellness", "Rehabilitation", "Pediatrics", "Gerontology",
  "Women's Health", "Sports Medicine", "Alternative Medicine", "Other",
];

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "CAD", "AUD", "GHS", "KES", "ZAR"];

export default function EditCourseScreen() {
  const router = useRouter();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();

  const course = useQuery(
    api.courses.getCourse,
    courseId ? { courseId: courseId as Id<"courses"> } : "skip"
  );

  const updateCourse = useMutation(api.courses.updateCourse);
  const publishCourse = useMutation(api.courses.publishCourse);
  const deleteCourse = useMutation(api.courses.deleteCourse);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [coverStorageId, setCoverStorageId] = useState<string | null>(null);

  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Pre-fill form when course loads
  useEffect(() => {
    if (course) {
      setTitle(course.title ?? "");
      setDescription(course.description ?? "");
      setCategory(course.category ?? "");
      setTagsInput((course.tags ?? []).join(", "));
      setCurrency(course.priceCurrency ?? "USD");
    }
  }, [course?._id]);

  if (!courseId) return null;
  if (course === undefined) return (
    <AppBackground><LoadingSpinner label="Loading course…" /></AppBackground>
  );
  if (course === null) return (
    <AppBackground><EmptyState icon="alert-circle-outline" title="Course not found" /></AppBackground>
  );

  const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
  const canSave = title.trim().length > 0 && description.trim().length > 0 && !isSaving;

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setCoverUri(asset.uri);
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "image/jpeg" },
        body: blob,
      });
      const { storageId } = await uploadResponse.json();
      setCoverStorageId(storageId);
    } catch {
      Alert.alert("Upload failed", "Could not upload cover image.");
      setCoverUri(null);
      setCoverStorageId(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await updateCourse({
        courseId: courseId as Id<"courses">,
        title: title.trim(),
        description: description.trim(),
        category,
        tags,
        priceCurrency: currency,
        ...(coverStorageId ? { coverImage: coverStorageId } : {}),
      });
      Alert.alert("Saved", "Course updated successfully.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    Alert.alert("Publish Course", "Make this course visible to all users?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Publish",
        onPress: async () => {
          setIsPublishing(true);
          try {
            await publishCourse({ courseId: courseId as Id<"courses"> });
            Alert.alert("Published!", "Your course is now live.");
          } catch (err: any) {
            Alert.alert("Error", err?.message ?? "Failed to publish.");
          } finally {
            setIsPublishing(false);
          }
        },
      },
    ]);
  };

  const handleDelete = () => {
    Alert.alert("Delete Course", `Delete "${course.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCourse({ courseId: courseId as Id<"courses"> });
            router.replace("/(tabs)/learn" as any);
          } catch (err: any) {
            Alert.alert("Error", err?.message ?? "Failed to delete.");
          }
        },
      },
    ]);
  };

  const displayCover = coverUri ?? (course.coverImage ? `${course.coverImage}` : null);

  return (
    <AppBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MobileCard>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>Edit Course</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.manageBtn}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/course-content-manager" as any,
                    params: { courseId },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Manage content"
              >
                <Text style={styles.manageBtnText}>Content</Text>
              </TouchableOpacity>
              {!course.isPublished && (
                <TouchableOpacity
                  style={styles.publishBtn}
                  onPress={handlePublish}
                  disabled={isPublishing}
                  accessibilityRole="button"
                  accessibilityLabel="Publish course"
                >
                  {isPublishing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.publishBtnText}>Publish</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{course.content?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {course.totalPrice ? `${course.priceCurrency} ${course.totalPrice}` : "Free"}
              </Text>
              <Text style={styles.statLabel}>Price</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={[styles.statusBadge, course.isPublished ? styles.publishedBadge : styles.draftBadge]}>
                <Text style={[styles.statusBadgeText, course.isPublished ? styles.publishedText : styles.draftText]}>
                  {course.isPublished ? "Published" : "Draft"}
                </Text>
              </View>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Field label="Course Title *">
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Course title"
                placeholderTextColor={Colors.textMuted}
                maxLength={120}
              />
            </Field>

            <Field label="Description *">
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Course description"
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
                numberOfLines={4}
                maxLength={1000}
              />
            </Field>

            <Field label="Category">
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowCategoryPicker(true)}
                accessibilityRole="button"
              >
                <Text style={[styles.pickerBtnText, !category && styles.pickerBtnPlaceholder]}>
                  {category || "Select a category"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </Field>

            <Field label="Tags" hint="Comma-separated">
              <TextInput
                style={styles.input}
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="e.g. diabetes, nutrition"
                placeholderTextColor={Colors.textMuted}
              />
              {tags.length > 0 && (
                <View style={styles.tagsPreview}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tagChip}>
                      <Text style={styles.tagChipText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Field>

            <Field label="Price Currency">
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowCurrencyPicker(true)}
                accessibilityRole="button"
              >
                <Text style={styles.pickerBtnText}>{currency}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </Field>

            {/* Cover Image */}
            <Field label="Cover Image">
              {displayCover ? (
                <View style={styles.coverPreview}>
                  <Image source={{ uri: displayCover }} style={styles.coverImg} resizeMode="cover" />
                  {isUploading && (
                    <View style={styles.coverUploadOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeCoverBtn}
                    onPress={() => { setCoverUri(null); setCoverStorageId(null); }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove cover"
                  >
                    <Ionicons name="close-circle" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.coverPicker}
                  onPress={pickCoverImage}
                  accessibilityRole="button"
                  accessibilityLabel="Pick cover image"
                >
                  <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
                  <Text style={styles.coverPickerText}>Tap to add cover image (16:9)</Text>
                </TouchableOpacity>
              )}
            </Field>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.back()}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={!canSave}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Danger zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Delete course"
              >
                <Ionicons name="trash-outline" size={16} color={Colors.statusDanger} />
                <Text style={styles.deleteBtnText}>Delete Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </MobileCard>
      </ScrollView>

      <PickerModal
        visible={showCategoryPicker}
        title="Select Category"
        items={CATEGORIES}
        selected={category}
        onSelect={(val) => { setCategory(val); setShowCategoryPicker(false); }}
        onClose={() => setShowCategoryPicker(false)}
      />
      <PickerModal
        visible={showCurrencyPicker}
        title="Select Currency"
        items={CURRENCIES}
        selected={currency}
        onSelect={(val) => { setCurrency(val); setShowCurrencyPicker(false); }}
        onClose={() => setShowCurrencyPicker(false)}
      />
    </AppBackground>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={fieldStyles.wrapper}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{label}</Text>
        {hint ? <Text style={fieldStyles.hint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}
const fieldStyles = StyleSheet.create({
  wrapper: { gap: 6 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  hint: { fontSize: 11, color: Colors.textMuted },
});

// ─── Picker Modal ─────────────────────────────────────────────────────────────
function PickerModal({ visible, title, items, selected, onSelect, onClose }: {
  visible: boolean; title: string; items: string[];
  selected: string; onSelect: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={20} color={Colors.textMuted} /></TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item}
          style={pickerStyles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[pickerStyles.item, selected === item && pickerStyles.itemSelected]}
              onPress={() => onSelect(item)}
            >
              <Text style={[pickerStyles.itemText, selected === item && pickerStyles.itemTextSelected]}>{item}</Text>
              {selected === item && <Ionicons name="checkmark" size={16} color={Colors.primary} />}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}
const pickerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: Colors.redBorder, maxHeight: "60%", paddingBottom: 32,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderDefault, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  title: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  list: { paddingHorizontal: 16 },
  item: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  itemSelected: { backgroundColor: Colors.redSurface },
  itemText: { fontSize: 15, color: Colors.textPrimary },
  itemTextSelected: { color: Colors.primary, fontWeight: "600" },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.redBorder, backgroundColor: Colors.surface, gap: 8,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  manageBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderDefault,
  },
  manageBtnText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  publishBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.primary, minWidth: 64, alignItems: "center",
  },
  publishBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  statsStrip: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle, backgroundColor: Colors.bgSurface,
  },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: Colors.borderSubtle },
  statValue: { fontSize: 13, fontWeight: "700", color: Colors.textPrimary },
  statLabel: { fontSize: 10, color: Colors.textMuted },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  publishedBadge: { backgroundColor: Colors.statusSuccessBg, borderWidth: 1, borderColor: Colors.greenBorder },
  draftBadge: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.borderDefault },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  publishedText: { color: Colors.statusSuccess },
  draftText: { color: Colors.textMuted },

  form: { padding: 20, gap: 20 },
  input: {
    height: 50, backgroundColor: Colors.bgElevated, borderWidth: 1.5,
    borderColor: Colors.borderNeutral, borderRadius: 12, paddingHorizontal: 14,
    fontSize: 14, color: Colors.textPrimary,
  },
  textArea: { height: 100, paddingTop: 12 },
  pickerBtn: {
    height: 50, backgroundColor: Colors.bgElevated, borderWidth: 1.5,
    borderColor: Colors.borderNeutral, borderRadius: 12, paddingHorizontal: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  pickerBtnText: { fontSize: 14, color: Colors.textPrimary },
  pickerBtnPlaceholder: { color: Colors.textMuted },
  tagsPreview: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tagChip: { backgroundColor: Colors.bgElevated, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.borderDefault },
  tagChipText: { fontSize: 12, color: Colors.textMuted },
  coverPicker: {
    width: "100%", aspectRatio: 16 / 9, backgroundColor: Colors.bgElevated,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.borderNeutral,
    borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 8,
  } as any,
  coverPickerText: { fontSize: 13, color: Colors.textMuted },
  coverPreview: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", position: "relative" },
  coverImg: { width: "100%", height: "100%" },
  coverUploadOverlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  removeCoverBtn: { position: "absolute", top: 8, right: 8 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, height: 50, borderRadius: 999, borderWidth: 1, borderColor: Colors.borderNeutral, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: Colors.textSecondary },
  saveBtn: { flex: 2, height: 50, borderRadius: 999, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center" },
  saveBtnDisabled: { backgroundColor: Colors.actionPrimaryDisabled },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  dangerZone: { margin: 0, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: Colors.errorBorder, backgroundColor: Colors.errorSurface, gap: 12 },
  dangerZoneTitle: { fontSize: 13, fontWeight: "700", color: Colors.statusDanger, textTransform: "uppercase", letterSpacing: 0.5 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.errorBorder, alignSelf: "flex-start" },
  deleteBtnText: { fontSize: 14, fontWeight: "600", color: Colors.statusDanger },
});
