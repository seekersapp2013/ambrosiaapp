import React, { useState } from "react";
import {
  View, Text, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { AppBackground } from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { AppInput } from "@/components/ui/Input";
import { BaseCard } from "@/components/ui/Card";
import { formatAmount } from "@/utils/currency";
import { MobileCard } from "@/components/MobileCard";

export default function WithdrawScreen() {
  const router = useRouter();

  // ── Convex ────────────────────────────────────────────────────────────────
  const walletBalance = useQuery(
    (api as any)["wallets/getWalletBalance"].getWalletBalance,
    {},
  );
  const withdrawFunds = useMutation(
    (api as any)["wallets/withdrawFunds"].withdrawFunds,
  );

  // ── State ─────────────────────────────────────────────────────────────────
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────────
  const parsedAmount = parseFloat(amount);
  const ngnBalance = (walletBalance?.balances as Record<string, number> | undefined)?.NGN ?? 0;
  const hasAmount = !!parsedAmount && parsedAmount > 0;
  const hasSufficientFunds = parsedAmount <= ngnBalance;
  const isValid = hasAmount && hasSufficientFunds;

  // ── Handler ───────────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    if (!isValid) return;

    setIsProcessing(true);
    setMessage(null);
    try {
      const result = await withdrawFunds({ amount: parsedAmount, currency: "NGN" });
      setMessage({
        text: `Successfully withdrew ${formatAmount(parsedAmount, "NGN")}. New balance: ${formatAmount(result.newBalance, result.currency)}`,
        isError: false,
      });
      setAmount("");
      setTimeout(() => router.replace("/(tabs)/wallet"), 2000);
    } catch (error) {
      setMessage({
        text: `Error: ${error instanceof Error ? error.message : "Withdrawal failed"}`,
        isError: true,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppBackground style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <ScreenHeader
          title="Withdraw Funds"
          onBack={() => router.replace("/(tabs)/wallet")}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <MobileCard>
          {/* Balance pill */}
          {walletBalance !== undefined && (
            <View style={styles.balancePill}>
              <Ionicons name="wallet-outline" size={14} color={Colors.actionPrimary} />
              <Text style={styles.balancePillText}>
                Available:{" "}
                <Text style={styles.balancePillAmount}>
                  {formatAmount(ngnBalance, "NGN")}
                </Text>
              </Text>
            </View>
          )}

          {/* Info card */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.statusWarning} />
            <Text style={styles.infoText}>
              Withdrawals are only available in Nigerian Naira (NGN).
            </Text>
          </View>

          {/* Currency (locked) */}
          <BaseCard style={styles.section}>
            <Text style={styles.sectionTitle}>Currency</Text>
            <View style={styles.currencyLocked}>
              <Text style={styles.currencyLockedText}>🇳🇬  NGN — Nigerian Naira</Text>
              <Ionicons name="lock-closed-outline" size={14} color={Colors.textDisabled} />
            </View>
          </BaseCard>

          {/* Amount */}
          <BaseCard style={styles.section}>
            <Text style={styles.sectionTitle}>Amount (₦)</Text>
            <AppInput
              value={amount}
              onChangeText={(v) => { setAmount(v); setMessage(null); }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              returnKeyType="done"
              editable={!isProcessing}
              autoFocus
              error={hasAmount && !hasSufficientFunds ? "Insufficient NGN balance" : undefined}
              hint={walletBalance !== undefined ? `Available: ${formatAmount(ngnBalance, "NGN")}` : undefined}
              containerStyle={styles.noMargin}
            />
          </BaseCard>

          {/* Summary */}
          {hasAmount && hasSufficientFunds && (
            <View style={styles.summaryCard}>
              <Ionicons name="checkmark-circle-outline" size={16} color={Colors.statusSuccess} />
              <Text style={styles.summaryText}>
                You are withdrawing{" "}
                <Text style={styles.summaryHighlight}>{formatAmount(parsedAmount, "NGN")}</Text>
                . Remaining balance will be{" "}
                <Text style={styles.summaryHighlight}>
                  {formatAmount(ngnBalance - parsedAmount, "NGN")}
                </Text>
                .
              </Text>
            </View>
          )}

          {/* Status message */}
          {message && (
            <View style={[
              styles.messageCard,
              message.isError ? styles.messageError : styles.messageSuccess,
            ]}>
              <Ionicons
                name={message.isError ? "alert-circle-outline" : "checkmark-circle-outline"}
                size={16}
                color={message.isError ? Colors.statusDanger : Colors.statusSuccess}
              />
              <Text style={[
                styles.messageText,
                message.isError ? styles.messageTextError : styles.messageTextSuccess,
              ]}>
                {message.text}
              </Text>
            </View>
          )}

          {/* Submit button inside scroll — clears tab bar */}
          <View style={styles.submitWrap}>
            <PrimaryButton
              label={
                hasAmount && hasSufficientFunds
                  ? `Withdraw ${formatAmount(parsedAmount, "NGN")}`
                  : "Withdraw NGN"
              }
              onPress={handleWithdraw}
              disabled={!isValid}
              loading={isProcessing}
              color={Colors.actionPrimary}
              icon={<Ionicons name="cash-outline" size={20} color="#FFFFFF" />}
            />
          </View>
          </MobileCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.space4, gap: spacing.space4 },

  balancePill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.bgPrimarySubtle,
    borderWidth: 1, borderColor: Colors.palette.primary,
    borderRadius: 20, paddingHorizontal: spacing.space3, paddingVertical: 7,
  },
  balancePillText: { ...typeScale.bodySM, color: Colors.textMuted },
  balancePillAmount: { color: Colors.textPrimary, fontWeight: "700" },

  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.statusWarningBg,
    borderWidth: 1, borderColor: Colors.palette.amber,
    borderRadius: 12, padding: 14,
  },
  infoText: { flex: 1, ...typeScale.bodySM, color: Colors.statusWarning, lineHeight: 18 },

  section: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 0,
  },
  sectionTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary, marginBottom: spacing.space3,
  },

  currencyLocked: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5, borderColor: Colors.borderSubtle,
    borderRadius: 12, paddingHorizontal: spacing.space4, paddingVertical: 13,
    backgroundColor: Colors.bgSurface,
  },
  currencyLockedText: {
    ...typeScale.labelMD,
    color: Colors.textMuted,
  },

  noMargin: { marginBottom: 0 },

  summaryCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.statusSuccessBg,
    borderWidth: 1, borderColor: Colors.palette.green,
    borderRadius: 12, padding: 14,
  },
  summaryText: { flex: 1, ...typeScale.bodySM, color: Colors.textMuted, lineHeight: 18 },
  summaryHighlight: { color: Colors.textPrimary, fontWeight: "700" },

  messageCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    borderRadius: 12, padding: 14, borderWidth: 1,
  },
  messageError: {
    backgroundColor: Colors.statusDangerBg,
    borderColor: Colors.palette.error,
  },
  messageSuccess: {
    backgroundColor: Colors.statusSuccessBg,
    borderColor: Colors.palette.green,
  },
  messageText: { flex: 1, ...typeScale.bodySM, lineHeight: 18 },
  messageTextError: { color: Colors.statusDanger },
  messageTextSuccess: { color: Colors.statusSuccess },

  submitWrap: {
    paddingTop: spacing.space3,
    paddingBottom: spacing.scrollBottomPadding,
  },
});
