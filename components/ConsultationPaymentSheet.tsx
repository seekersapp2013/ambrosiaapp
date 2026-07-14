/**
 * ConsultationPaymentSheet
 *
 * Bottom-sheet for unlocking a paid consultation with an expert.
 * Shows fee, wallet balance, and handles payment flow.
 *
 * Usage:
 *   <ConsultationPaymentSheet
 *     visible={showPayment}
 *     circleId={circleId}
 *     expertName="Dr. Smith"
 *     specialization="Cardiology"
 *     fee={50}
 *     currency="USD"
 *     onClose={() => setShowPayment(false)}
 *     onSuccess={(circleId) => navigate to circle-chat}
 *   />
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Animated,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "convex/react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";

export interface ConsultationPaymentSheetProps {
  visible: boolean;
  circleId: string;
  expertName: string;
  specialization?: string | null;
  fee: number;
  currency: string;
  initialMessage?: string;
  onClose: () => void;
  onSuccess: (circleId: string) => void;
}

export function ConsultationPaymentSheet({
  visible,
  circleId,
  expertName,
  specialization,
  fee,
  currency,
  initialMessage,
  onClose,
  onSuccess,
}: ConsultationPaymentSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const C = useColors();

  const [step, setStep] = useState<"summary" | "processing" | "success" | "error">("summary");
  const [errorMsg, setErrorMsg] = useState("");

  // Animate slide in/out
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
    if (visible) {
      setStep("summary");
      setErrorMsg("");
    }
  }, [visible, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // Wallet balance check
  const affordability = useQuery(
    api.bookingPayment.checkBookingAffordability,
    visible ? { amount: fee, currency } : "skip"
  );

  // Unlock mutation
  const unlockConsultation = useMutation(api.consultations.unlockConsultation);

  // Handle payment
  async function handlePay() {
    if (!affordability?.canAfford) return;
    setStep("processing");
    setErrorMsg("");

    try {
      await unlockConsultation({
        circleId: circleId as Id<"circles">,
        initialMessage,
      });
      setStep("success");
      setTimeout(() => onSuccess(circleId), 1200);
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Payment failed. Please try again.");
      setStep("error");
    }
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={StyleSheet.absoluteFill} />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: C.isDark ? "#1A1A2E" : "#FFFFFF",
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: C.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)" }]} />

        {step === "summary" && (
          <View style={styles.content}>
            {/* Expert info */}
            <View style={[styles.expertCard, { backgroundColor: C.isDark ? "rgba(198,34,41,0.08)" : "rgba(198,34,41,0.05)" }]}>
              <View style={[styles.expertIconWrap, { backgroundColor: C.isDark ? "rgba(198,34,41,0.15)" : "rgba(198,34,41,0.1)" }]}>
                <Ionicons name="medical-outline" size={28} color={C.isDark ? "#F87171" : "#C62229"} />
              </View>
              <Text style={[styles.expertName, { color: C.textPrimary }]}>{expertName}</Text>
              {specialization && (
                <Text style={[styles.expertSpec, { color: C.textMuted }]}>{specialization}</Text>
              )}
            </View>

            {/* Fee breakdown */}
            <View style={[styles.feeCard, { backgroundColor: C.bgElevated, borderColor: C.borderSubtle }]}>
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: C.textSecondary }]}>Consultation Fee</Text>
                <Text style={[styles.feeAmount, { color: C.textPrimary }]}>
                  {currency} {fee.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.feeDivider, { backgroundColor: C.borderSubtle }]} />
              <View style={styles.feeRow}>
                <Text style={[styles.feeLabel, { color: C.textMuted }]}>One-time unlock</Text>
                <Text style={[styles.feeNote, { color: C.textMuted }]}>
                  Subsequent messages are free
                </Text>
              </View>
            </View>

            {/* Wallet balance */}
            {affordability !== undefined && (
              <View style={styles.balanceRow}>
                <Ionicons
                  name="wallet-outline"
                  size={16}
                  color={affordability.canAfford ? "#22C55E" : "#EF4444"}
                />
                <Text style={[styles.balanceText, { color: affordability.canAfford ? "#22C55E" : "#EF4444" }]}>
                  Balance: {currency} {(affordability.balance ?? 0).toFixed(2)}
                </Text>
                {!affordability.canAfford && (
                  <TouchableOpacity onPress={() => { onClose(); router.push("/(tabs)/wallet"); }}>
                    <Text style={styles.fundLink}>Fund Wallet</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Action buttons */}
            <TouchableOpacity
              style={[
                styles.payBtn,
                { backgroundColor: "#C62229" },
                (!affordability?.canAfford) && styles.payBtnDisabled,
              ]}
              onPress={handlePay}
              disabled={!affordability?.canAfford}
              activeOpacity={0.85}
            >
              <Ionicons name="lock-open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.payBtnText}>Unlock Consultation</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={[styles.cancelBtnText, { color: C.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "processing" && (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#C62229" />
            <Text style={[styles.stateTitle, { color: C.textPrimary }]}>Processing Payment…</Text>
            <Text style={[styles.stateSub, { color: C.textMuted }]}>Please wait while we unlock your consultation.</Text>
          </View>
        )}

        {step === "success" && (
          <View style={styles.stateWrap}>
            <View style={[styles.successCircle, { backgroundColor: "rgba(34,197,94,0.1)" }]}>
              <Ionicons name="checkmark-circle" size={48} color="#22C55E" />
            </View>
            <Text style={[styles.stateTitle, { color: C.textPrimary }]}>Consultation Unlocked!</Text>
            <Text style={[styles.stateSub, { color: C.textMuted }]}>You can now message {expertName}.</Text>
          </View>
        )}

        {step === "error" && (
          <View style={styles.stateWrap}>
            <View style={[styles.successCircle, { backgroundColor: "rgba(239,68,68,0.1)" }]}>
              <Ionicons name="close-circle" size={48} color="#EF4444" />
            </View>
            <Text style={[styles.stateTitle, { color: C.textPrimary }]}>Payment Failed</Text>
            <Text style={[styles.stateSub, { color: C.textMuted }]}>{errorMsg}</Text>
            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: "#C62229", marginTop: 16 }]}
              onPress={() => setStep("summary")}
              activeOpacity={0.85}
            >
              <Text style={styles.payBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  content: {
    gap: 16,
  },
  expertCard: {
    alignItems: "center",
    paddingVertical: 20,
    borderRadius: 16,
    gap: 8,
  },
  expertIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  expertName: {
    fontSize: 18,
    fontWeight: "700",
  },
  expertSpec: {
    fontSize: 13,
    fontWeight: "500",
  },
  feeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: "800",
  },
  feeDivider: {
    height: StyleSheet.hairlineWidth,
  },
  feeNote: {
    fontSize: 11,
    fontStyle: "italic",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  fundLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  payBtnDisabled: {
    opacity: 0.4,
  },
  payBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  stateWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  stateSub: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
  },
});
