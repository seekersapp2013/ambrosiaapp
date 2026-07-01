/**
 * Create Circle Screen
 *
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
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/constants/Colors";

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "CAD", "GHS", "KES", "GMD", "ZAR"];

export default function CreateCircleScreen() {
  const router = useRouter();
  const createCircle = useMutation(api.circles.createCircle);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [circleType, setCircleType] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [accessType, setAccessType] = useState<"FREE" | "PAID">("FREE");
  const [price, setPrice] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("USD");
  const [postingPermission, setPostingPermission] = useState<"EVERYONE" | "ADMINS_ONLY">("EVERYONE");
  const [maxMembers, setMaxMembers] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inline feedback state (replaces Alert.alert on success)
  const [successResult, setSuccessResult] = useState<{
    circleId: string;
    requiresApproval: boolean;
    circleName: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bottom sheet states
  const [showCurrencySheet, setShowCurrencySheet] = useState(false);

  // Reset all state on every mount (web doesn't unmount between navigations)
  useEffect(() => {
    setSuccessResult(null);
    setErrorMsg(null);
    setName("");
    setDescription("");
    setCircleType("PUBLIC");
    setAccessType("FREE");
    setPrice("");
    setPriceCurrency("USD");
    setPostingPermission("EVERYONE");
    setMaxMembers("");
    setTagsInput("");
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg("Circle name is required.");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("Description is required.");
      return;
    }
    if (accessType === "PAID" && (!price || parseFloat(price) <= 0)) {
      setErrorMsg("A valid price is required for paid circles.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const result = await createCircle({
        name: name.trim(),
        description: description.trim(),
        type: circleType,
        accessType,
        price: accessType === "PAID" ? parseFloat(price) : undefined,
        priceCurrency: accessType === "PAID" ? priceCurrency : undefined,
        maxMembers: maxMembers ? parseInt(maxMembers, 10) : undefined,
        tags,
        postingPermission,
      });

      // Show inline success state — always navigate to circle-detail so the
      // creator can see their circle regardless of approval status.
      setSuccessResult({
        circleId: result.circleId,
        requiresApproval: result.requiresApproval,
        circleName: name.trim(),
      });
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Failed to create circle. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (successResult) {
    return (
      <AppBackground>
        <MobileCard>
          <View style={styles.successContainer}>
            {/* Icon */}
            <View style={[
              styles.successIconWrap,
              successResult.requiresApproval
                ? styles.successIconWrapPending
                : styles.successIconWrapLive,
            ]}>
              <Ionicons
                name={successResult.requiresApproval ? "time-outline" : "checkmark-circle"}
                size={52}
                color={successResult.requiresApproval ? Colors.statusWarning : Colors.statusSuccess}
              />
            </View>

            {/* Headline */}
            <Text style={styles.successTitle}>
              {successResult.requiresApproval
                ? "Circle Submitted for Review"
                : "Circle Created!"}
            </Text>

            {/* Circle name */}
            <Text style={styles.successCircleName}>{successResult.circleName}</Text>

            {/* Message */}
            {successResult.requiresApproval ? (
              <View style={styles.reviewNotice}>
                <Ionicons name="shield-checkmark-outline" size={16} color={Colors.statusWarning} />
                <Text style={styles.reviewNoticeText}>
                  Your circle is pending admin review. It will appear publicly once approved.
                  You can still access and set it up in the meantime.
                </Text>
              </View>
            ) : (
              <Text style={styles.successSubtitle}>
                Your circle is live and ready to accept members.
              </Text>
            )}

            {/* CTA — behaviour depends on approval status */}
            <TouchableOpacity
              style={styles.goToCircleBtn}
              onPress={() => {
                if (successResult.requiresApproval) {
                  // Pending review — go to the Circles browse tab,
                  // circle-detail is not useful until the circle is live.
                  router.replace("/(tabs)/circle" as any);
                } else {
                  // Live immediately — go straight to the circle detail.
                  router.replace({
                    pathname: "/(tabs)/circle-detail",
                    params: { circleId: successResult.circleId },
                  } as any);
                }
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={successResult.requiresApproval ? "Go to circles" : "Go to my circle"}
            >
              <Ionicons name="people-circle-outline" size={18} color="#fff" />
              <Text style={styles.goToCircleBtnText}>
                {successResult.requiresApproval ? "Go to Circles" : "Go to My Circle"}
              </Text>
            </TouchableOpacity>

            {/* Secondary — back to browse */}
            <TouchableOpacity
              style={styles.backToCirclesBtn}
              onPress={() => router.replace("/(tabs)/circle" as any)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Back to circles"
            >
              <Text style={styles.backToCirclesBtnText}>Back to Circles</Text>
            </TouchableOpacity>
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <MobileCard>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/circle" as any)}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back to circles"
            >
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Circle</Text>
            <View style={{ width: 36 }} />
          </View>

          <View style={styles.form}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Circle Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Heart Health Warriors"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                maxLength={60}
                accessibilityLabel="Circle name"
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What is this circle about?"
                placeholderTextColor={Colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                maxLength={500}
                accessibilityLabel="Circle description"
              />
            </View>

            {/* Circle Type */}
            <View style={styles.field}>
              <Text style={styles.label}>Circle Type</Text>
              <View style={styles.tileRow}>
                {(["PUBLIC", "PRIVATE"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tile, circleType === t && styles.tileActive]}
                    onPress={() => setCircleType(t)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: circleType === t }}
                  >
                    <Ionicons
                      name={t === "PUBLIC" ? "globe-outline" : "lock-closed-outline"}
                      size={18}
                      color={circleType === t ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.tileText, circleType === t && styles.tileTextActive]}>
                      {t === "PUBLIC" ? "Public" : "Private"}
                    </Text>
                    <Text style={styles.tileDesc}>
                      {t === "PUBLIC" ? "Anyone can join" : "Invite only"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Access Type */}
            <View style={styles.field}>
              <Text style={styles.label}>Access Type</Text>
              <View style={styles.tileRow}>
                {(["FREE", "PAID"] as const).map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.tile, accessType === a && styles.tileActive]}
                    onPress={() => setAccessType(a)}
                    activeOpacity={0.8}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: accessType === a }}
                  >
                    <Ionicons
                      name={a === "FREE" ? "gift-outline" : "cash-outline"}
                      size={18}
                      color={accessType === a ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.tileText, accessType === a && styles.tileTextActive]}>
                      {a === "FREE" ? "Free" : "Paid"}
                    </Text>
                    <Text style={styles.tileDesc}>
                      {a === "FREE" ? "No membership fee" : "Membership fee required"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price (conditional) */}
            {accessType === "PAID" && (
              <View style={styles.field}>
                <Text style={styles.label}>Membership Price *</Text>
                <View style={styles.priceRow}>
                  <TextInput
                    style={[styles.input, styles.priceInput]}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Price"
                  />
                  <TouchableOpacity
                    style={styles.currencyBtn}
                    onPress={() => setShowCurrencySheet(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select currency"
                  >
                    <Text style={styles.currencyBtnText}>{priceCurrency}</Text>
                    <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

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
                      size={18}
                      color={postingPermission === p ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.tileText, postingPermission === p && styles.tileTextActive]}>
                      {p === "EVERYONE" ? "Everyone" : "Admins Only"}
                    </Text>
                    <Text style={styles.tileDesc}>
                      {p === "EVERYONE" ? "All members can post" : "Only admins & mods"}
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
                placeholder="e.g. health, wellness, nutrition"
                placeholderTextColor={Colors.textMuted}
                value={tagsInput}
                onChangeText={setTagsInput}
                accessibilityLabel="Tags"
              />
            </View>

            {/* Inline error banner */}
            {errorMsg && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.statusDanger} />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.replace("/(tabs)/circle" as any)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, isSubmitting && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Create circle"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.createBtnText}>Create Circle</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </MobileCard>
      </ScrollView>

      {/* Currency picker bottom sheet */}
      <Modal
        visible={showCurrencySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCurrencySheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Currency</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sheetItem, priceCurrency === item && styles.sheetItemActive]}
                  onPress={() => { setPriceCurrency(item); setShowCurrencySheet(false); }}
                  accessibilityRole="button"
                  accessibilityLabel={item}
                >
                  <Text style={[styles.sheetItemText, priceCurrency === item && styles.sheetItemTextActive]}>
                    {item}
                  </Text>
                  {priceCurrency === item && (
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
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
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  form: {
    padding: 16,
    gap: 16,
  },
  field: {
    gap: 8,
  },
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
    height: 96,
    paddingTop: 12,
    paddingBottom: 12,
  },

  // Tile selector
  tileRow: {
    flexDirection: "row",
    gap: 10,
  },
  tile: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    gap: 4,
  },
  tileActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.bgPrimarySubtle,
  },
  tileText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  tileTextActive: {
    color: Colors.primary,
  },
  tileDesc: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Price row
  priceRow: {
    flexDirection: "row",
    gap: 10,
  },
  priceInput: {
    flex: 1,
  },
  currencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    height: 48,
  },
  currencyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
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
    backgroundColor: Colors.statusSuccess,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },

  // ── Success screen ─────────────────────────────────────────────────────────
  successContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 16,
  },
  successIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successIconWrapPending: {
    backgroundColor: Colors.statusWarningBg,
    borderWidth: 2,
    borderColor: Colors.amberBorder,
  },
  successIconWrapLive: {
    backgroundColor: Colors.statusSuccessBg,
    borderWidth: 2,
    borderColor: Colors.greenBorder,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
    lineHeight: 30,
  },
  successCircleName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: Colors.bgElevated,
    borderRadius: 8,
  },
  reviewNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    backgroundColor: Colors.statusWarningBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.amberBorder,
    width: "100%",
  },
  reviewNoticeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.statusWarning,
    lineHeight: 20,
  },
  successSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  goToCircleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  goToCircleBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  backToCirclesBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToCirclesBtnText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: "500",
    textDecorationLine: "underline",
  },

  // ── Inline error banner ─────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    backgroundColor: Colors.statusDangerBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.statusDanger,
    lineHeight: 20,
  },

  // Bottom sheet
  sheetOverlay: {    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: "60%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDefault,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sheetItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  sheetItemActive: {
    backgroundColor: Colors.bgPrimarySubtle,
  },
  sheetItemText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sheetItemTextActive: {
    fontWeight: "700",
    color: Colors.primary,
  },
});
