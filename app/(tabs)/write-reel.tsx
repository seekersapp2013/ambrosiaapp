/**
 * Write Reel Screen
 * Create and publish a new reel.
 * Route: /(tabs)/write-reel
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import * as ImagePicker from "expo-image-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppBackground } from "@/components/AppBackground";
import { AppLoader } from "@/components/AppLoader";
import { MobileCard } from "@/components/MobileCard";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { CURRENCIES, Currency, CURRENCY_SYMBOLS } from "@/utils/currency";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";

// ─── Form content ─────────────────────────────────────────────────────────────
function WriteReelContent() {
  const router = useRouter();
  const history = useNavigationHistory();
  const insets = useSafeAreaInsets();

  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [isGated, setIsGated] = useState(false);
  const [priceAmount, setPriceAmount] = useState("1");
  const [priceCurrency, setPriceCurrency] = useState<Currency>("USD");
  const [isSensitive, setIsSensitive] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createReel = useMutation(api.reels.createReel);
  const myProfile = useQuery(api.profiles.getMyProfile);
  const walletData = useQuery((api as any)["wallets/getWalletBalance"].getWalletBalance, {});

  // Sync wallet primary currency into priceCurrency once loaded
  const walletSynced = useRef(false);
  React.useEffect(() => {
    if (!walletSynced.current && walletData?.primaryCurrency) {
      setPriceCurrency(walletData.primaryCurrency as Currency);
      walletSynced.current = true;
    }
  }, [walletData]);

  // ── Video preview player ──────────────────────────────────────────────────
  const previewPlayer = useVideoPlayer(videoUri ?? null, (p) => {
    p.loop = true;
    p.muted = true;
  });

  // ── Pick video ────────────────────────────────────────────────────────────
  const handlePickVideo = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"] as any,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]) {
      setVideoUri(result.assets[0].uri);
    }
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!videoUri) {
      Alert.alert("No video", "Please select a video first.");
      return;
    }
    const parsedPrice = parseFloat(priceAmount);
    if (isGated && (isNaN(parsedPrice) || parsedPrice <= 0)) {
      Alert.alert("Invalid price", "Please enter a valid price.");
      return;
    }

    setSubmitting(true);
    try {
      // Upload video
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(videoUri);
      const blob = await response.blob();
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "video/mp4" },
        body: blob,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { storageId } = await uploadRes.json();

      const tagsArray = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await createReel({
        video: storageId,
        caption: caption.trim() || undefined,
        tags: tagsArray,
        isGated,
        priceToken: isGated ? priceCurrency : undefined,
        priceAmount: isGated ? parsedPrice : undefined,
        isSensitive,
        isPublic,
      });

      Alert.alert(
        "Published!",
        "Your reel has been submitted and will appear once approved.",
        [{ text: "OK", onPress: () => router.replace("/(tabs)/pulse") }]
      );
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to publish reel.");
    } finally {
      setSubmitting(false);
    }
  }, [
    videoUri,
    caption,
    tags,
    isGated,
    priceAmount,
    priceCurrency,
    isSensitive,
    isPublic,
    generateUploadUrl,
    createReel,
    router,
  ]);

  return (
    <AppBackground style={styles.root}>
      {/* Header — outside card, full width */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => history.goBack(router)}
          style={styles.headerBtn}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Ionicons name="close" size={24} color={Colors.iconPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Create Pulse
        </Text>
        <TouchableOpacity
          style={[styles.publishBtn, (!videoUri || submitting) && styles.publishBtnDisabled]}
          onPress={handleSubmit}
          disabled={!videoUri || submitting}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Publish reel"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.publishBtnText} allowFontScaling={false}>
              Publish
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Card wraps the form content */}
      <MobileCard style={styles.formCard} containerStyle={styles.formCardContainer}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* Video picker */}
        {!videoUri ? (
          <TouchableOpacity
            style={styles.videoPicker}
            onPress={handlePickVideo}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Select video"
          >
            <Ionicons name="videocam-outline" size={48} color={Colors.iconDisabled} />
            <Text style={styles.videoPickerTitle} allowFontScaling={false}>
              Select a Video
            </Text>
            <Text style={styles.videoPickerSub} allowFontScaling={false}>
              MP4, MOV up to 100 MB
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.videoPreviewWrap}>
            <VideoView
              player={previewPlayer}
              style={styles.videoPreview}
              contentFit="cover"
              nativeControls={false}
              accessibilityLabel="Video preview"
            />
            <TouchableOpacity
              style={styles.removeVideoBtn}
              onPress={() => setVideoUri(null)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Remove video"
            >
              <Ionicons name="close-circle" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {/* Caption */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel} allowFontScaling={false}>
            Caption
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="Write a caption…"
            placeholderTextColor={Colors.textDisabled}
            value={caption}
            onChangeText={setCaption}
            maxLength={500}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            accessibilityLabel="Caption"
          />
          <Text style={styles.charCount} allowFontScaling={false}>
            {caption.length}/500
          </Text>
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel} allowFontScaling={false}>
            Tags
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="fitness, health, wellness"
            placeholderTextColor={Colors.textDisabled}
            value={tags}
            onChangeText={setTags}
            accessibilityLabel="Tags"
          />
          <Text style={styles.fieldHint} allowFontScaling={false}>
            Comma-separated
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Visibility */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel} allowFontScaling={false}>
            Visibility
          </Text>
          <View style={styles.radioGroup}>
            {[
              { value: true, label: "Public", sub: "Shows in the Reels feed" },
              { value: false, label: "Course-only", sub: "Only available in courses" },
            ].map(({ value, label, sub }) => (
              <TouchableOpacity
                key={String(value)}
                style={[styles.radioRow, isPublic === value && styles.radioRowActive]}
                onPress={() => setIsPublic(value)}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: isPublic === value }}
              >
                <View style={[styles.radioCircle, isPublic === value && styles.radioCircleActive]}>
                  {isPublic === value && <View style={styles.radioDot} />}
                </View>
                <View style={styles.radioText}>
                  <Text style={styles.radioLabel} allowFontScaling={false}>
                    {label}
                  </Text>
                  <Text style={styles.radioSub} allowFontScaling={false}>
                    {sub}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sensitive toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel} allowFontScaling={false}>
              Sensitive Content
            </Text>
            <Text style={styles.toggleSub} allowFontScaling={false}>
              Adds a warning before playback
            </Text>
          </View>
          <Switch
            value={isSensitive}
            onValueChange={setIsSensitive}
            trackColor={{ false: Colors.bgElevated, true: Colors.actionPrimary }}
            thumbColor="#fff"
            accessibilityLabel="Mark as sensitive"
          />
        </View>

        {/* Gated toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel} allowFontScaling={false}>
              Premium (Paid)
            </Text>
            <Text style={styles.toggleSub} allowFontScaling={false}>
              Viewers must pay to watch
            </Text>
          </View>
          <Switch
            value={isGated}
            onValueChange={setIsGated}
            trackColor={{ false: Colors.bgElevated, true: Colors.actionPrimary }}
            thumbColor="#fff"
            accessibilityLabel="Make premium"
          />
        </View>

        {/* Price fields */}
        {isGated && (
          <View style={styles.priceRow}>
            <View style={styles.priceAmountWrap}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Price
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="1.00"
                placeholderTextColor={Colors.textDisabled}
                value={priceAmount}
                onChangeText={setPriceAmount}
                keyboardType="decimal-pad"
                accessibilityLabel="Price amount"
              />
            </View>
            <View style={styles.priceCurrencyWrap}>
              <Text style={styles.fieldLabel} allowFontScaling={false}>
                Currency
              </Text>
              <TouchableOpacity
                style={styles.textInput}
                onPress={() => setCurrencyOpen((o) => !o)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Select currency"
              >
                <Text style={styles.currencyBtnText} allowFontScaling={false}>
                  {CURRENCY_SYMBOLS[priceCurrency]} {priceCurrency}
                </Text>
              </TouchableOpacity>
              {currencyOpen && (
                <View style={styles.currencyDropdown}>
                  {CURRENCIES.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.currencyItem,
                        priceCurrency === c && styles.currencyItemActive,
                      ]}
                      onPress={() => {
                        setPriceCurrency(c);
                        setCurrencyOpen(false);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.currencyItemText} allowFontScaling={false}>
                        {CURRENCY_SYMBOLS[c]} {c}
                      </Text>
                      {priceCurrency === c && (
                        <Ionicons name="checkmark" size={14} color={Colors.actionPrimary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
        </ScrollView>
      </MobileCard>
    </AppBackground>
  );
}

export default function WriteReelScreen() {
  return (
    <>
      <AuthLoading>
        <AppLoader />
      </AuthLoading>
      <Unauthenticated>
        <Redirect href="/" />
      </Unauthenticated>
      <Authenticated>
        <WriteReelContent />
      </Authenticated>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Form card
  formCardContainer: {
    flex: 1,
    paddingTop: 0,       // header is outside, no top padding needed
    paddingBottom: 16,
  },
  formCard: {
    flex: 1,
    padding: 0,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.bgBase,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  publishBtn: {
    backgroundColor: Colors.actionPrimary,
    borderRadius: 20,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space2,
    minWidth: 72,
    alignItems: "center",
  },
  publishBtnDisabled: {
    opacity: 0.45,
  },
  publishBtnText: {
    ...typeScale.labelMD,
    color: "#fff",
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.space4,
    gap: spacing.space4,
  },

  // Video picker
  videoPicker: {
    height: 220,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.borderDefault,
    borderStyle: "dashed",
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
  },
  videoPickerTitle: {
    ...typeScale.headingSM,
    color: Colors.textSecondary,
  },
  videoPickerSub: {
    ...typeScale.bodySM,
    color: Colors.textDisabled,
  },

  // Video preview
  videoPreviewWrap: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  removeVideoBtn: {
    position: "absolute",
    top: spacing.space2,
    right: spacing.space2,
  },

  // Fields
  field: { gap: spacing.space2 },
  fieldLabel: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  fieldHint: {
    ...typeScale.caption,
    color: Colors.textDisabled,
  },
  charCount: {
    ...typeScale.caption,
    color: Colors.textDisabled,
    textAlign: "right",
  },
  textInput: {
    height: 48,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    paddingHorizontal: spacing.space4,
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
    justifyContent: "center",
  },
  textArea: {
    minHeight: 80,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: spacing.space2,
  },

  // Radio group
  radioGroup: { gap: spacing.space2 },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    padding: spacing.space3,
  },
  radioRowActive: {
    borderColor: Colors.actionPrimary,
    backgroundColor: Colors.bgPrimarySubtle,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.borderDefault,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: Colors.actionPrimary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.actionPrimary,
  },
  radioText: { flex: 1 },
  radioLabel: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
  },
  radioSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Toggle rows
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    padding: spacing.space4,
  },
  toggleInfo: { flex: 1, marginRight: spacing.space4 },
  toggleLabel: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
  },
  toggleSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Price row
  priceRow: {
    flexDirection: "row",
    gap: spacing.space3,
  },
  priceAmountWrap: { flex: 1, gap: spacing.space2 },
  priceCurrencyWrap: { flex: 1, gap: spacing.space2, zIndex: 10 },
  currencyBtnText: {
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
  },
  currencyDropdown: {
    position: "absolute",
    top: 80,
    left: 0,
    right: 0,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 100,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  currencyItemActive: {
    backgroundColor: Colors.bgPrimarySubtle,
  },
  currencyItemText: {
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
  },
});
