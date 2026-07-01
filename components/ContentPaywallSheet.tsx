/**
 * ContentPaywallSheet
 *
 * Unified bottom-sheet paywall for articles, pulses (reels), and courses.
 * Modelled after BookingConfirmation — same 4-state flow:
 *   summary → processing → success → error
 *
 * Usage:
 *   <ContentPaywallSheet
 *     visible={paywallOpen}
 *     contentType="article"
 *     contentId={articleId}
 *     price={article.priceAmount}
 *     currency={article.priceToken}
 *     title={article.title}
 *     creatorName="Dr. Smith"
 *     onClose={() => setPaywallOpen(false)}
 *     onSuccess={(paymentId) => { /* access is now granted * / }}
 *   />
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Animated,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { MobileCard } from "@/components/MobileCard";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";

// ─── Types ─────────────────────────────────────────────────────────────────
type ContentType = "article" | "reel" | "course";

export interface ContentPaywallSheetProps {
  visible: boolean;
  contentType: ContentType;
  contentId: string;
  /** Display price (must match what backend expects) */
  price: number;
  currency: string;
  /** Human-readable title shown in the summary */
  title: string;
  /** Creator name shown in the summary */
  creatorName?: string;
  onClose: () => void;
  /** Called with the new paymentId after a successful purchase */
  onSuccess: (paymentId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function contentTypeLabel(type: ContentType): string {
  switch (type) {
    case "article": return "Article";
    case "reel":    return "Pulse";
    case "course":  return "Course";
  }
}

function contentTypeIcon(type: ContentType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "article": return "newspaper-outline";
    case "reel":    return "videocam-outline";
    case "course":  return "school-outline";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────
export function ContentPaywallSheet({
  visible,
  contentType,
  contentId,
  price,
  currency,
  title,
  creatorName,
  onClose,
  onSuccess,
}: ContentPaywallSheetProps) {
  const insets      = useSafeAreaInsets();
  const router      = useRouter();
  const slideAnim   = useRef(new Animated.Value(0)).current;

  const [step, setStep]       = useState<"summary" | "processing" | "success" | "error">("summary");
  const [errorMsg, setErrorMsg] = useState("");
  const [paymentId, setPaymentId] = useState("");

  // ── Animate slide in/out ──────────────────────────────────────────────────
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    // Reset to summary when opened fresh
    if (visible) {
      setStep("summary");
      setErrorMsg("");
    }
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // ── Wallet affordability check ────────────────────────────────────────────
  const affordability = useQuery(
    api.bookingPayment.checkBookingAffordability,
    visible ? { amount: price, currency } : "skip"
  );

  // ── Purchase mutation ─────────────────────────────────────────────────────
  const purchaseContent = useMutation(api.payments.purchaseContent);

  // ── Handle payment ────────────────────────────────────────────────────────
  async function handleConfirmAndPay() {
    if (!affordability?.canAfford) return;
    setStep("processing");
    setErrorMsg("");

    try {
      const result = await purchaseContent({
        contentType,
        contentId: contentId as Id<"articles"> | Id<"reels"> | Id<"courses">,
        priceToken: currency,
        priceAmount: price,
      });

      const newPaymentId = String(result.paymentId);
      setPaymentId(newPaymentId);
      setStep("success");
      onSuccess(newPaymentId);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Something went wrong. Please try again.");
      setStep("error");
    }
  }

  function handleRetry() {
    setStep("summary");
    setErrorMsg("");
  }

  // ── Don't render at all when fully hidden ────────────────────────────────
  if (!visible && step === "summary") return null;

  const isLoadingAffordability = affordability === undefined;
  const canAfford    = affordability?.canAfford ?? false;
  const walletBalance = affordability?.balance ?? 0;
  const shortfall    = affordability?.shortfall ?? 0;

  // ── PROCESSING ─────────────────────────────────────────────────────────────
  const innerContent = (() => {
    if (step === "processing") {
      return (
        <View style={styles.centeredWrap}>
          <ActivityIndicator size="large" color={Colors.actionPrimary} />
          <Text style={styles.processingTitle} allowFontScaling={false}>
            Processing payment…
          </Text>
          <Text style={styles.processingSubtext} allowFontScaling={false}>
            Debiting {currency} {price.toFixed(2)} from your wallet
          </Text>
        </View>
      );
    }

    // ── SUCCESS ───────────────────────────────────────────────────────────────
    if (step === "success") {
      return (
        <View style={styles.centeredWrap}>
          <View style={styles.successIconWrap}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.statusSuccess} />
          </View>
          <Text style={styles.successTitle} allowFontScaling={false}>
            Access Granted!
          </Text>
          <Text style={styles.successSubtitle} allowFontScaling={false}>
            You now have full access to this {contentTypeLabel(contentType).toLowerCase()}.
          </Text>
          <View style={styles.successDetails}>
            <View style={styles.successRow}>
              <Ionicons name={contentTypeIcon(contentType)} size={16} color={Colors.iconSecondary} />
              <Text style={styles.successDetailText} numberOfLines={2} allowFontScaling={false}>
                {title}
              </Text>
            </View>
            <View style={styles.successRow}>
              <Ionicons name="wallet-outline" size={16} color={Colors.iconSecondary} />
              <Text style={styles.successDetailText} allowFontScaling={false}>
                {currency} {price.toFixed(2)} deducted from wallet
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={styles.doneBtnText} allowFontScaling={false}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── ERROR ──────────────────────────────────────────────────────────────────
    if (step === "error") {
      return (
        <View style={styles.centeredWrap}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle" size={56} color={Colors.statusDanger} />
          </View>
          <Text style={styles.errorTitle} allowFontScaling={false}>Payment Failed</Text>
          <Text style={styles.errorMsg} allowFontScaling={false}>{errorMsg}</Text>
          <View style={styles.errorBtns}>
            <SecondaryButton label="Cancel" onPress={onClose} style={styles.errorBtn} />
            <PrimaryButton label="Try Again" onPress={handleRetry} style={styles.errorBtn} />
          </View>
        </View>
      );
    }

    // ── SUMMARY (default) ──────────────────────────────────────────────────────
    return (
      <View style={styles.summaryRoot}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Content preview card */}
          <View style={styles.contentCard}>
            <View style={styles.contentIconWrap}>
              <Ionicons name={contentTypeIcon(contentType)} size={24} color={Colors.actionPrimary} />
            </View>
            <View style={styles.contentInfo}>
              <View style={styles.contentTypeBadge}>
                <Text style={styles.contentTypeText} allowFontScaling={false}>
                  {contentTypeLabel(contentType)}
                </Text>
              </View>
              <Text style={styles.contentTitle} numberOfLines={2} allowFontScaling={false}>
                {title}
              </Text>
              {creatorName ? (
                <Text style={styles.contentCreator} numberOfLines={1} allowFontScaling={false}>
                  by {creatorName}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Pricing breakdown */}
          <View style={styles.pricingCard}>
            <Text style={styles.sectionTitle} allowFontScaling={false}>Payment Breakdown</Text>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel} allowFontScaling={false}>
                {contentTypeLabel(contentType)} access
              </Text>
              <Text style={styles.pricingValue} allowFontScaling={false}>
                {currency} {price.toFixed(2)}
              </Text>
            </View>
            <View style={styles.pricingDivider} />
            <View style={styles.pricingRow}>
              <Text style={styles.pricingTotalLabel} allowFontScaling={false}>Total Due</Text>
              <Text style={styles.pricingTotalValue} allowFontScaling={false}>
                {currency} {price.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Revenue split info */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo} />
            <Text style={styles.infoText} allowFontScaling={false}>
              70% goes directly to the creator. 30% supports the platform.
            </Text>
          </View>

          {/* Wallet balance card */}
          <View
            style={[
              styles.walletCard,
              !canAfford && !isLoadingAffordability && styles.walletCardInsufficient,
            ]}
          >
            <View style={styles.walletRow}>
              <Ionicons
                name="wallet-outline"
                size={18}
                color={canAfford ? Colors.statusSuccess : Colors.statusDanger}
              />
              <Text style={styles.walletLabel} allowFontScaling={false}>
                Wallet Balance ({currency})
              </Text>
              {isLoadingAffordability ? (
                <ActivityIndicator size="small" color={Colors.actionPrimary} />
              ) : (
                <Text
                  style={[
                    styles.walletBalance,
                    { color: canAfford ? Colors.statusSuccess : Colors.statusDanger },
                  ]}
                  allowFontScaling={false}
                >
                  {currency} {walletBalance.toFixed(2)}
                </Text>
              )}
            </View>
            {!isLoadingAffordability && !canAfford && (
              <View style={styles.insufficientWrap}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.statusDanger} />
                <Text style={styles.insufficientText} allowFontScaling={false}>
                  Insufficient balance. You need {currency} {shortfall.toFixed(2)} more.
                </Text>
              </View>
            )}
          </View>

          {/* Fund wallet CTA when insufficient */}
          {!isLoadingAffordability && !canAfford && (
            <TouchableOpacity
              style={styles.fundWalletBtn}
              onPress={() => {
                onClose();
                router.push("/(tabs)/wallet");
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Fund your wallet"
            >
              <Ionicons name="add-circle-outline" size={18} color={Colors.statusInfo} />
              <Text style={styles.fundWalletText} allowFontScaling={false}>Fund Wallet</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Sticky footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.space3 }]}>
          <SecondaryButton label="Cancel" onPress={onClose} style={styles.footerCancel} />
          <PrimaryButton
            label={`Unlock · ${currency} ${price.toFixed(2)}`}
            onPress={handleConfirmAndPay}
            disabled={!canAfford || isLoadingAffordability}
            loading={step === "processing"}
            style={styles.footerPay}
            icon={<Ionicons name="lock-open-outline" size={18} color="#fff" />}
            accessibilityLabel={`Unlock for ${currency} ${price.toFixed(2)}`}
          />
        </View>
      </View>
    );
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={step === "processing" ? undefined : onClose} />

      {/* Animated sheet */}
      <Animated.View style={[styles.sheetOuter, { transform: [{ translateY }] }]}>
        <MobileCard style={styles.card} containerStyle={styles.cardContainer}>
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} allowFontScaling={false}>
              {step === "success"
                ? "Payment Successful"
                : step === "error"
                ? "Payment Failed"
                : "Unlock Content"}
            </Text>
            {step !== "processing" && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={Colors.iconPrimary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Body */}
          <View style={styles.body}>
            {innerContent}
          </View>
        </MobileCard>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  sheetOuter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "85%",
  },

  cardContainer: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },

  card: {
    flex: 1,
    padding: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  handleWrap: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderDefault,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  sheetTitle: {
    flex: 1,
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },

  body: { flex: 1 },

  // ── Centered states ────────────────────────────────────────────────────────
  centeredWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.space6,
    paddingVertical: spacing.space8,
    gap: spacing.space3,
  },

  // Processing
  processingTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    marginTop: spacing.space4,
    textAlign: "center",
  },
  processingSubtext: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Success
  successIconWrap: { marginBottom: spacing.space2 },
  successTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  successSubtitle: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
  },
  successDetails: {
    width: "100%",
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
    marginTop: spacing.space4,
  },
  successRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
  },
  successDetailText: {
    ...typeScale.bodyMD,
    color: Colors.textSecondary,
    flex: 1,
  },
  doneBtn: {
    marginTop: spacing.space4,
    height: 52,
    borderRadius: 999,
    backgroundColor: Colors.statusSuccessBg,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.space8,
    minWidth: 160,
  },
  doneBtnText: {
    ...typeScale.labelLG,
    color: Colors.statusSuccess,
    fontWeight: "700",
  },

  // Error
  errorIconWrap: { marginBottom: spacing.space2 },
  errorTitle: {
    ...typeScale.headingMD,
    color: Colors.statusDanger,
    fontWeight: "700",
  },
  errorMsg: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  errorBtns: {
    flexDirection: "row",
    gap: spacing.space3,
    marginTop: spacing.space4,
    width: "100%",
  },
  errorBtn: { flex: 1 },

  // ── Summary ────────────────────────────────────────────────────────────────
  summaryRoot: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    paddingBottom: spacing.space4,
    gap: spacing.space3,
  },

  // Content preview card
  contentCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
  },
  contentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  contentInfo: { flex: 1, gap: 4 },
  contentTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
  },
  contentTypeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.actionPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contentTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  contentCreator: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
  },

  // Pricing card
  pricingCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space2,
  },
  sectionTitle: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.space2,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.space1,
  },
  pricingLabel: { ...typeScale.bodyMD, color: Colors.textMuted },
  pricingValue: { ...typeScale.bodyMD, color: Colors.textSecondary, fontWeight: "500" },
  pricingDivider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginVertical: spacing.space2,
  },
  pricingTotalLabel: { ...typeScale.headingSM, color: Colors.textPrimary, fontWeight: "700" },
  pricingTotalValue: { ...typeScale.headingMD, color: Colors.actionPrimary, fontWeight: "700" },

  // Info note
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    padding: spacing.space3,
  },
  infoText: {
    ...typeScale.bodySM,
    color: Colors.statusInfo,
    flex: 1,
    lineHeight: 18,
  },

  // Wallet card
  walletCard: {
    backgroundColor: Colors.statusSuccessBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    padding: spacing.space4,
  },
  walletCardInsufficient: {
    backgroundColor: Colors.statusDangerBg,
    borderColor: Colors.statusDanger,
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
  },
  walletLabel: { ...typeScale.bodyMD, color: Colors.textSecondary, flex: 1 },
  walletBalance: { ...typeScale.headingSM, fontWeight: "700" },
  insufficientWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    marginTop: spacing.space2,
  },
  insufficientText: {
    ...typeScale.bodySM,
    color: Colors.statusDanger,
    flex: 1,
    lineHeight: 17,
  },

  // Fund wallet CTA
  fundWalletBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.space2,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    backgroundColor: Colors.statusInfoBg,
  },
  fundWalletText: {
    ...typeScale.labelMD,
    color: Colors.statusInfo,
    fontWeight: "600",
  },

  // Footer
  footer: {
    flexDirection: "row",
    gap: spacing.space3,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space3,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  footerCancel: { flex: 1 },
  footerPay:    { flex: 2 },
});
