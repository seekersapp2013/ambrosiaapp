/**
 * Expert Requests Screen
 *
 * Lists expert requests for a circle. Admins can create new ones.
 * Phase 8 — PLAN.MD
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  OPEN:        { bg: Colors.statusInfoBg,     border: Colors.blueBorder,    text: Colors.statusInfo },
  IN_PROGRESS: { bg: Colors.amberSurface,     border: Colors.amberBorder,   text: Colors.statusWarning },
  COMPLETED:   { bg: Colors.statusSuccessBg,  border: Colors.greenBorder,   text: Colors.statusSuccess },
  CANCELLED:   { bg: Colors.statusDangerBg,   border: Colors.errorBorder,   text: Colors.statusDanger },
  PENDING:     { bg: Colors.bgElevated,       border: Colors.borderSubtle,  text: Colors.textMuted },
};

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "CAD", "GHS", "KES", "GMD", "ZAR"];

export default function ExpertRequestsScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const { circleId } = useLocalSearchParams<{ circleId: string }>();

  // ── Data ────────────────────────────────────────────────────────────────────
  const circle = useQuery(
    api.circles.getCircleById,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip"
  );
  const requests = useQuery(
    api.expertRequests.getCircleExpertRequests,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip"
  );
  const createRequest = useMutation(api.expertRequests.createExpertRequest);

  // ── Create modal state ─────────────────────────────────────────────────────
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isAdmin =
    circle?.membership?.role === "CREATOR" ||
    circle?.membership?.role === "ADMIN";

  // ── Submit new request ────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Title is required.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Validation", "Description is required.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Validation", "A valid budget amount is required.");
      return;
    }
    if (!circleId) return;

    setIsSubmitting(true);
    try {
      const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
      await createRequest({
        circleId: circleId as Id<"circles">,
        title: title.trim(),
        description: description.trim(),
        agreedAmount: parseFloat(amount),
        agreedCurrency: currency,
        tags,
      });
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      setAmount("");
      setTagsInput("");
      Alert.alert("Created", "Expert request submitted.");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render request card ───────────────────────────────────────────────────
  const renderRequest = ({ item }: { item: any }) => {
    const statusConf = STATUS_COLORS[item.status] ?? STATUS_COLORS.PENDING;
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusConf.bg, borderColor: statusConf.border }]}>
            <Text style={[styles.statusText, { color: statusConf.text }]}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.requestDescription} numberOfLines={3}>
          {item.description}
        </Text>

        <View style={styles.requestMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={14} color={Colors.statusWarning} />
            <Text style={styles.metaText}>
              {item.agreedCurrency} {item.agreedAmount}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.metaText}>{item.applicationCount} applicant{item.applicationCount !== 1 ? "s" : ""}</Text>
          </View>
        </View>

        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.map((tag: string) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {item.requester && (
          <Text style={styles.requesterText}>
            By{" "}
            <Text style={{ color: Colors.textSecondary }}>
              {item.requester.name ?? item.requester.username ?? "Unknown"}
            </Text>
          </Text>
        )}
      </View>
    );
  };

  return (
    <AppBackground>
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
          <Text style={styles.headerTitle}>Expert Requests</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateModal(true)}
              accessibilityRole="button"
              accessibilityLabel="Create expert request"
            >
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {/* List */}
        {requests === undefined ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="briefcase-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No expert requests</Text>
            <Text style={styles.emptySubtitle}>
              {isAdmin
                ? "Create a request to find expert help for this circle."
                : "No expert requests for this circle yet."}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => setShowCreateModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Create Request</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={requests as any[]}
            renderItem={renderRequest}
            keyExtractor={(item: any) => item._id}
            contentContainerStyle={styles.listContent}
            scrollEnabled={false}
          />
        )}

        <View style={{ height: 16 }} />
      </MobileCard>

      {/* ── Create Modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.sheetOverlay}>
            <View style={styles.sheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>New Expert Request</Text>

              <ScrollView
                contentContainerStyle={styles.sheetForm}
                keyboardShouldPersistTaps="handled"
              >
                {/* Title */}
                <View style={styles.field}>
                  <Text style={styles.label}>Title *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="What expertise do you need?"
                    placeholderTextColor={Colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={100}
                    accessibilityLabel="Request title"
                  />
                </View>

                {/* Description */}
                <View style={styles.field}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe what you need help with…"
                    placeholderTextColor={Colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    textAlignVertical="top"
                    maxLength={1000}
                    accessibilityLabel="Request description"
                  />
                </View>

                {/* Budget */}
                <View style={styles.field}>
                  <Text style={styles.label}>Budget *</Text>
                  <View style={styles.budgetRow}>
                    <TextInput
                      style={[styles.input, styles.budgetInput]}
                      placeholder="0.00"
                      placeholderTextColor={Colors.textMuted}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      accessibilityLabel="Budget amount"
                    />
                    <TouchableOpacity
                      style={styles.currencyBtn}
                      onPress={() => setShowCurrencyPicker(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Select currency"
                    >
                      <Text style={styles.currencyBtnText}>{currency}</Text>
                      <Ionicons name="chevron-down" size={13} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Tags */}
                <View style={styles.field}>
                  <Text style={styles.label}>Tags (comma-separated)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. nutrition, coaching"
                    placeholderTextColor={Colors.textMuted}
                    value={tagsInput}
                    onChangeText={setTagsInput}
                    accessibilityLabel="Tags"
                  />
                </View>

                {/* Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setShowCreateModal(false)}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                    onPress={handleCreate}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Submit request"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.submitBtnText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Currency picker */}
      <Modal
        visible={showCurrencyPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencyPicker(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { maxHeight: "50%" }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Currency</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.currencyItem, currency === item && styles.currencyItemActive]}
                  onPress={() => { setCurrency(item); setShowCurrencyPicker(false); }}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                >
                  <Text style={[styles.currencyItemText, currency === item && styles.currencyItemTextActive]}>
                    {item}
                  </Text>
                  {currency === item && (
                    <Ionicons name="checkmark" size={16} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
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
  createBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.statusSuccess,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingWrap: { paddingVertical: 48, alignItems: "center" },
  emptyWrap: {
    paddingVertical: 48,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: Colors.textSecondary },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
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
    backgroundColor: Colors.primary,
    borderRadius: 22,
  },
  emptyBtnText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  listContent: { padding: 12, gap: 12 },

  requestCard: {
    backgroundColor: Colors.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 14,
    gap: 8,
  },
  requestHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  requestTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
  requestDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 19,
  },
  requestMeta: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { fontSize: 12, color: Colors.textMuted },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  tag: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  tagText: { fontSize: 10, color: Colors.textMuted },
  requesterText: { fontSize: 11, color: Colors.textMuted },

  // Modal / sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    maxHeight: "85%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDefault,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sheetForm: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
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
  budgetRow: { flexDirection: "row", gap: 8 },
  budgetInput: { flex: 1 },
  currencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    height: 48,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  currencyBtnText: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  btnRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: Colors.textSecondary },
  submitBtn: {
    flex: 2,
    height: 48,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  currencyItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  currencyItemActive: { backgroundColor: Colors.bgPrimarySubtle },
  currencyItemText: { fontSize: 14, color: Colors.textSecondary },
  currencyItemTextActive: { fontWeight: "700", color: Colors.primary },
});
