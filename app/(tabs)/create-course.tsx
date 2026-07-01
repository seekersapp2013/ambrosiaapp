/**
 * Create Course Screen
 * Form to create a new draft course.
 * On success, navigates to course-content-manager.
 */

import React, { useState } from "react";
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
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  "Health",
  "Fitness",
  "Nutrition",
  "Mental Health",
  "Medicine",
  "Wellness",
  "Rehabilitation",
  "Pediatrics",
  "Gerontology",
  "Women's Health",
  "Sports Medicine",
  "Alternative Medicine",
  "Other",
];

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "CAD", "AUD", "GHS", "KES", "ZAR"];

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CreateCourseScreen() {
  const router = useRouter();
  const createCourse = useMutation(api.courses.createCourse);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tags = tagsInput
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !isSubmitting;

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
      Alert.alert("Upload failed", "Could not upload cover image. You can add one later.");
      setCoverUri(null);
      setCoverStorageId(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    if (!category) {
      Alert.alert("Category required", "Please select a category for your course.");
      return;
    }
    setIsSubmitting(true);
    try {
      const courseId = await createCourse({
        title: title.trim(),
        description: description.trim(),
        coverImage: coverStorageId ?? undefined,
        category,
        tags,
        priceCurrency: currency,
      });
      router.replace({
        pathname: "/(tabs)/course-content-manager" as any,
        params: { courseId },
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create course.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Course</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.form}>
            {/* Title */}
            <Field label="Course Title *">
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Understanding Diabetes"
                placeholderTextColor={Colors.textMuted}
                maxLength={120}
              />
            </Field>

            {/* Description */}
            <Field label="Description *">
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="What will students learn from this course?"
                placeholderTextColor={Colors.textMuted}
                multiline
                textAlignVertical="top"
                numberOfLines={4}
                maxLength={1000}
              />
            </Field>

            {/* Category */}
            <Field label="Category *">
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowCategoryPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select category"
              >
                <Text
                  style={[
                    styles.pickerBtnText,
                    !category && styles.pickerBtnPlaceholder,
                  ]}
                >
                  {category || "Select a category"}
                </Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </Field>

            {/* Tags */}
            <Field label="Tags" hint="Comma-separated">
              <TextInput
                style={styles.input}
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="e.g. diabetes, nutrition, health"
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

            {/* Currency */}
            <Field label="Price Currency">
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowCurrencyPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select currency"
              >
                <Text style={styles.pickerBtnText}>{currency}</Text>
                <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </Field>

            {/* Cover Image */}
            <Field label="Cover Image">
              {coverUri ? (
                <View style={styles.coverPreview}>
                  <Image
                    source={{ uri: coverUri }}
                    style={styles.coverImg}
                    resizeMode="cover"
                  />
                  {isUploading && (
                    <View style={styles.coverUploadOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeCoverBtn}
                    onPress={() => { setCoverUri(null); setCoverStorageId(null); }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove cover image"
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

            {/* Info note */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo} />
              <Text style={styles.infoText}>
                Your course will be created as a draft. Add articles and reels before publishing.
              </Text>
            </View>

            {/* Action buttons */}
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
                style={[styles.createBtn, !canSubmit && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!canSubmit}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Create course"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Create Course</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </MobileCard>
      </ScrollView>

      {/* Category Picker Modal */}
      <PickerModal
        visible={showCategoryPicker}
        title="Select Category"
        items={CATEGORIES}
        selected={category}
        onSelect={(val) => { setCategory(val); setShowCategoryPicker(false); }}
        onClose={() => setShowCategoryPicker(false)}
      />

      {/* Currency Picker Modal */}
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

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
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
function PickerModal({
  visible,
  title,
  items,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <Text style={pickerStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item}
          style={pickerStyles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[pickerStyles.item, selected === item && pickerStyles.itemSelected]}
              onPress={() => onSelect(item)}
              activeOpacity={0.8}
            >
              <Text style={[pickerStyles.itemText, selected === item && pickerStyles.itemTextSelected]}>
                {item}
              </Text>
              {selected === item && (
                <Ionicons name="checkmark" size={16} color={Colors.primary} />
              )}
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
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: Colors.redBorder,
    maxHeight: "60%",
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDefault,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  title: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  list: { paddingHorizontal: 16 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  itemSelected: { backgroundColor: Colors.redSurface },
  itemText: { fontSize: 15, color: Colors.textPrimary },
  itemTextSelected: { color: Colors.primary, fontWeight: "600" },
});

// ─── Main styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.redBorder,
    backgroundColor: Colors.surface,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  form: {
    padding: 20,
    gap: 20,
  },

  input: {
    height: 50,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5,
    borderColor: Colors.borderNeutral,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },

  pickerBtn: {
    height: 50,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5,
    borderColor: Colors.borderNeutral,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerBtnText: {
    fontSize: 14,
    color: Colors.textPrimary,
  },
  pickerBtnPlaceholder: {
    color: Colors.textMuted,
  },

  tagsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  tagChip: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  tagChipText: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  coverPicker: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderNeutral,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  } as any,
  coverPickerText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  coverPreview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  coverImg: {
    width: "100%",
    height: "100%",
  },
  coverUploadOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeCoverBtn: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.borderNeutral,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  createBtn: {
    flex: 2,
    height: 50,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnDisabled: {
    backgroundColor: Colors.actionPrimaryDisabled,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
});
