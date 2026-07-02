/**
 * Circle Settings Screen
 *
 * Edit circle details (creator/admin). Delete circle (creator only).
 * Phase 8 — PLAN.MD
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

export default function CircleSettingsScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();

  // ── Data ────────────────────────────────────────────────────────────────────
  const circle = useQuery(
    api.circles.getCircleById,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip"
  );
  const updateCircle = useMutation(api.circles.updateCircle);
  const deleteCircle = useMutation(api.circles.deleteCircle);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [postingPermission, setPostingPermission] = useState<"EVERYONE" | "ADMINS_ONLY">("EVERYONE");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  // ── Populate from circle ───────────────────────────────────────────────────
  useEffect(() => {
    if (circle) {
      setName(circle.name ?? "");
      setDescription(circle.description ?? "");
      setMaxMembers(circle.maxMembers ? String(circle.maxMembers) : "");
      setTagsInput((circle.tags ?? []).join(", "));
      setPostingPermission(
        (circle.postingPermission as "EVERYONE" | "ADMINS_ONLY") ?? "EVERYONE"
      );
    }
  }, [circle?._id]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isCreator = circle?.membership?.role === "CREATOR";
  const isAdmin =
    circle?.membership?.role === "CREATOR" ||
    circle?.membership?.role === "ADMIN";

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Circle name is required.");
      return;
    }
    if (!circleId) return;
    setIsSaving(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await updateCircle({
        circleId: circleId as Id<"circles">,
        name: name.trim(),
        description: description.trim(),
        maxMembers: maxMembers ? parseInt(maxMembers, 10) : undefined,
        tags,
        postingPermission,
      });
      Alert.alert("Saved", "Circle settings updated.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (deleteConfirmText !== circle?.name) {
      Alert.alert("Incorrect Name", "Please type the exact circle name to confirm deletion.");
      return;
    }
    if (!circleId) return;
    try {
      await deleteCircle({ circleId: circleId as Id<"circles"> });
      router.replace("/(tabs)/circle" as any);
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to delete.");
    }
  };

  const copyInviteCode = async () => {
    if (circle?.inviteCode) {
      await Clipboard.setStringAsync(circle.inviteCode);
      Alert.alert("Copied", "Invite code copied.");
    }
  };

  if (circle === undefined) {
    return (
      <AppBackground>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </AppBackground>
    );
  }

  if (circle === null || !isAdmin) {
    return (
      <AppBackground>
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>No access.</Text>
          <TouchableOpacity onPress={() => history.goBack(router, "/(tabs)/circle")}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <MobileCard>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => history.goBack(router, "/(tabs)/circle")}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Circle Settings</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.form}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Circle Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                maxLength={60}
                accessibilityLabel="Circle name"
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                maxLength={500}
                accessibilityLabel="Description"
              />
            </View>

            {/* Type & Access (read-only) */}
            <View style={styles.readOnlyCard}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo} />
              <Text style={styles.readOnlyText}>
                Circle type ({circle.type}) and access type ({circle.accessType}) cannot be changed
                after creation.
              </Text>
            </View>

            {/* Posting Permission */}
            <View style={styles.field}>
              <Text style={styles.label}>Posting Permission</Text>
              <View style={styles.tileRow}>
                {(["EVERYONE", "ADMINS_ONLY"] as const).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.tile, postingPermission === p && styles.tileActive]}
                    onPress={() => setPostingPermission(p)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: postingPermission === p }}
                  >
                    <Ionicons
                      name={p === "EVERYONE" ? "chatbubbles-outline" : "shield-outline"}
                      size={16}
                      color={postingPermission === p ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.tileText, postingPermission === p && styles.tileTextActive]}>
                      {p === "EVERYONE" ? "Everyone" : "Admins Only"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Max Members */}
            <View style={styles.field}>
              <Text style={styles.label}>Max Members (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="No limit"
                placeholderTextColor={Colors.textMuted}
                value={maxMembers}
                onChangeText={setMaxMembers}
                keyboardType="number-pad"
                accessibilityLabel="Max members"
              />
            </View>

            {/* Tags */}
            <View style={styles.field}>
              <Text style={styles.label}>Tags (comma-separated)</Text>
              <TextInput
                style={styles.input}
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="health, wellness"
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Tags"
              />
            </View>

            {/* Invite code (private circles) */}
            {circle.type === "PRIVATE" && circle.inviteCode && (
              <View style={styles.field}>
                <Text style={styles.label}>Invite Code</Text>
                <View style={styles.inviteRow}>
                  <Text style={styles.inviteCode}>{circle.inviteCode}</Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={copyInviteCode}
                    accessibilityRole="button"
                    accessibilityLabel="Copy invite code"
                  >
                    <Ionicons name="copy-outline" size={14} color={Colors.statusInfo} />
                    <Text style={styles.copyBtnText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save settings"
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Settings</Text>
              )}
            </TouchableOpacity>

            {/* ── Danger Zone (creator only) ─────────────────────────────── */}
            {isCreator && (
              <View style={styles.dangerZone}>
                <TouchableOpacity
                  style={styles.dangerHeader}
                  onPress={() => setShowDeleteSection(!showDeleteSection)}
                  accessibilityRole="button"
                  accessibilityLabel="Toggle danger zone"
                >
                  <Ionicons name="warning-outline" size={18} color={Colors.statusDanger} />
                  <Text style={styles.dangerTitle}>Danger Zone</Text>
                  <Ionicons
                    name={showDeleteSection ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={Colors.statusDanger}
                    style={{ marginLeft: "auto" }}
                  />
                </TouchableOpacity>

                {showDeleteSection && (
                  <View style={styles.dangerContent}>
                    <Text style={styles.dangerWarning}>
                      Deleting this circle is permanent and cannot be undone. All messages and
                      memberships will be lost.
                    </Text>
                    <Text style={styles.dangerInstructions}>
                      Type the circle name{" "}
                      <Text style={{ fontWeight: "700", color: Colors.textPrimary }}>
                        {circle.name}
                      </Text>{" "}
                      to confirm:
                    </Text>
                    <TextInput
                      style={styles.deleteInput}
                      placeholder={circle.name}
                      placeholderTextColor={Colors.textMuted}
                      value={deleteConfirmText}
                      onChangeText={setDeleteConfirmText}
                      accessibilityLabel="Confirm circle name to delete"
                    />
                    <TouchableOpacity
                      style={[
                        styles.deleteBtn,
                        deleteConfirmText !== circle.name && styles.deleteBtnDisabled,
                      ]}
                      onPress={handleDelete}
                      disabled={deleteConfirmText !== circle.name}
                      accessibilityRole="button"
                      accessibilityLabel="Delete circle"
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                      <Text style={styles.deleteBtnText}>Delete Circle Forever</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>
        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: { fontSize: 15, color: Colors.textMuted },
  backLink: { fontSize: 14, color: Colors.primary, marginTop: 8 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.bgElevated,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  form: {
    padding: 16,
    gap: 16,
  },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  input: {
    height: 48,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    paddingHorizontal: 14,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 90,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: "top",
  },

  readOnlyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },
  readOnlyText: {
    flex: 1,
    fontSize: 12,
    color: Colors.statusInfo,
    lineHeight: 18,
  },

  tileRow: { flexDirection: "row", gap: 10 },
  tile: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgElevated,
  },
  tileActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.bgPrimarySubtle,
  },
  tileText: { fontSize: 13, fontWeight: "600", color: Colors.textMuted },
  tileTextActive: { color: Colors.primary },

  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    letterSpacing: 4,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },
  copyBtnText: { fontSize: 12, fontWeight: "600", color: Colors.statusInfo },

  saveBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },

  // Danger Zone
  dangerZone: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderError,
    backgroundColor: Colors.errorSurface,
    overflow: "hidden",
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
  },
  dangerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.statusDanger,
  },
  dangerContent: {
    padding: 14,
    paddingTop: 0,
    gap: 10,
  },
  dangerWarning: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  dangerInstructions: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  deleteInput: {
    height: 44,
    backgroundColor: Colors.bgBase,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderError,
    paddingHorizontal: 12,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.actionDestructive,
  },
  deleteBtnDisabled: { opacity: 0.4 },
  deleteBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
