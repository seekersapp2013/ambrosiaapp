import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { AppBackground } from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { AppInput } from "@/components/ui/Input";
import { BaseCard } from "@/components/ui/Card";
import { MobileCard, useCardInsets } from "@/components/MobileCard";
import { OTPInput } from "@/components/ui/Input";
import { formatAmount } from "@/utils/currency";
import { getBankLogoUrl } from "@/utils/paystackBanking";
import { verifyPin } from "@/utils/pinHash";

export default function WithdrawScreen() {
  const router = useRouter();
  const C = useColors();

  // ── Convex ────────────────────────────────────────────────────────────────
  const walletData = useQuery(
    (api as any)["wallets/getWalletBalance"].getWalletBalance,
    {},
  );
  const linkedAccounts = useQuery(
    (api as any)["wallets/bankAccounts"].getWithdrawalBankAccounts,
  );
  const profile = useQuery(api.profiles.getMyProfile);
  const processWithdrawal = useAction(
    (api as any)["wallets/withdrawFunds"].processWithdrawal,
  );

  // ── Form state ────────────────────────────────────────────────────────────
  const [amount, setAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // ── PIN modal state ───────────────────────────────────────────────────────
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const cardInsets = useCardInsets();

  // ── Derived ───────────────────────────────────────────────────────────────
  const ngnBalance =
    (walletData?.balances as Record<string, number> | undefined)?.NGN ?? 0;
  const parsedAmount = parseFloat(amount);
  const hasAmount = !!parsedAmount && parsedAmount > 0;
  const hasSufficientFunds = parsedAmount <= ngnBalance;
  const selectedAccount =
    Array.isArray(linkedAccounts)
      ? linkedAccounts.find((a: any) => a._id === selectedAccountId)
      : null;
  const canProceed =
    hasAmount && hasSufficientFunds && !!selectedAccount && !isProcessing;

  // PIN validation — only active once all 4 digits are entered
  const pinComplete = pin.length === 4;
  const pinValid = pinComplete && !!profile?.pinHash && verifyPin(pin, profile.pinHash);
  const pinInvalid = pinComplete && !pinValid;

  // ── Handlers ──────────────────────────────────────────────────────────────

  // Step 1: validate form, open PIN modal
  const handlePressWithdraw = () => {
    if (!hasAmount) {
      Alert.alert("Invalid Amount", "Please enter a valid amount greater than zero.");
      return;
    }
    if (!hasSufficientFunds) {
      Alert.alert("Insufficient Balance", "You don't have enough NGN in your wallet.");
      return;
    }
    if (!selectedAccount) {
      Alert.alert(
        "No Account Selected",
        "Please select a bank account to withdraw to, or link one first.",
      );
      return;
    }
    setPin("");
    setPinModalVisible(true);
  };

  // Step 2: PIN already verified reactively — just call action
  const handleConfirmPin = async () => {
    if (!pinValid || !selectedAccount) return;

    setPinModalVisible(false);
    setIsProcessing(true);
    try {
      await processWithdrawal({
        amount: parsedAmount,
        currency: "NGN",
        bankAccountId: selectedAccount._id,
        pin,
      });
      Alert.alert(
        "Withdrawal Submitted",
        `Your withdrawal of ${formatAmount(parsedAmount, "NGN")} has been submitted to ${selectedAccount.bankName}. Processing may take a few hours.`,
        [{ text: "OK", onPress: () => router.replace("/(tabs)/wallet") }],
      );
      setAmount("");
      setSelectedAccountId(null);
    } catch (err: any) {
      Alert.alert("Withdrawal Failed", err.message || "Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelPin = () => {
    setPinModalVisible(false);
    setPin("");
  };

  return (
    <AppBackground style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <MobileCard>
            <ScreenHeader
              title="Withdraw Funds"
              onBack={() => router.replace("/(tabs)/wallet")}
            />
            {/* ── Balance pill ─────────────────────────────────────────── */}
            {walletData !== undefined && (
              <View style={styles.balancePill}>
                <Ionicons name="wallet-outline" size={14} color={C.actionPrimary} />
                <Text style={[styles.balancePillText, { color: C.textMuted }]}>
                  NGN Balance:{" "}
                  <Text style={[styles.balancePillAmount, { color: C.textPrimary }]}>
                    {formatAmount(ngnBalance, "NGN")}
                  </Text>
                </Text>
              </View>
            )}

            {/* ── Info banner ──────────────────────────────────────────── */}
            <View style={styles.infoCard}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={C.statusWarning}
              />
              <Text style={[styles.infoText, { color: C.statusWarning }]}>
                Withdrawals are processed in Nigerian Naira (NGN) only and typically
                arrive within 1–3 business days.
              </Text>
            </View>

            {/* ── Amount ───────────────────────────────────────────────── */}
            <BaseCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Amount (₦)</Text>
              <AppInput
                value={amount}
                onChangeText={(v) => setAmount(v)}
                placeholder="0.00"
                keyboardType="decimal-pad"
                returnKeyType="done"
                editable={!isProcessing}
                autoFocus
                error={
                  hasAmount && !hasSufficientFunds
                    ? "Insufficient NGN balance"
                    : undefined
                }
                hint={
                  walletData !== undefined
                    ? `Available: ${formatAmount(ngnBalance, "NGN")}`
                    : undefined
                }
                containerStyle={styles.noMargin}
              />
            </BaseCard>

            {/* ── Bank Account Selection ───────────────────────────────── */}
            <BaseCard style={styles.section}>
              <View style={styles.sectionRow}>
                <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Withdraw To</Text>
                <TouchableOpacity
                  onPress={() => router.push("/auth/ManageBankAccountsScreen" as any)}
                  style={styles.manageBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="pencil-outline" size={14} color={C.actionPrimary} />
                  <Text style={[styles.manageBtnText, { color: C.actionPrimary }]}>Manage</Text>
                </TouchableOpacity>
              </View>

              {linkedAccounts === undefined ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={C.textMuted} />
                  <Text style={[typeScale.bodySM, { color: C.textMuted }]}>
                    Loading accounts...
                  </Text>
                </View>
              ) : linkedAccounts.length === 0 ? (
                <TouchableOpacity
                  onPress={() => router.push("/auth/ManageBankAccountsScreen" as any)}
                  style={styles.emptyAccountBtn}
                >
                  <Ionicons name="add-circle-outline" size={24} color={C.actionPrimary} />
                  <Text style={[styles.emptyAccountTitle, { color: C.actionPrimary }]}>Link a Bank Account</Text>
                  <Text style={[styles.emptyAccountSub, { color: C.textMuted }]}>
                    You need to link a bank account before withdrawing
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.accountList}>
                  {linkedAccounts.map((acc: any) => {
                    const isSelected = selectedAccountId === acc._id;
                    return (
                      <TouchableOpacity
                        key={acc._id}
                        onPress={() => setSelectedAccountId(acc._id)}
                        style={[
                          styles.accountRow,
                          isSelected && styles.accountRowSelected,
                        ]}
                        activeOpacity={0.8}
                      >
                        <BankLogo slug={acc.bankSlug} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              typeScale.labelMD,
                              { color: isSelected ? C.textPrimary : C.textSecondary },
                            ]}
                          >
                            {acc.bankName}
                          </Text>
                          <Text style={[typeScale.caption, { color: C.textMuted, marginTop: 2 }]}>
                            {acc.accountNumber} · {acc.accountName}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={C.actionPrimary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </BaseCard>

            {/* ── Summary ──────────────────────────────────────────────── */}
            {canProceed && (
              <View style={styles.summaryCard}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={C.statusSuccess}
                />
                <Text style={[styles.summaryText, { color: C.textMuted }]}>
                  Withdrawing{" "}
                  <Text style={[styles.summaryHighlight, { color: C.textPrimary }]}>
                    {formatAmount(parsedAmount, "NGN")}
                  </Text>{" "}
                  to{" "}
                  <Text style={[styles.summaryHighlight, { color: C.textPrimary }]}>{selectedAccount.bankName}</Text>.
                  Remaining balance:{" "}
                  <Text style={[styles.summaryHighlight, { color: C.textPrimary }]}>
                    {formatAmount(ngnBalance - parsedAmount, "NGN")}
                  </Text>
                  .
                </Text>
              </View>
            )}

            {/* ── Submit ───────────────────────────────────────────────── */}
            <View style={styles.submitWrap}>
              <PrimaryButton
                label={
                  isProcessing
                    ? "Processing..."
                    : hasAmount && canProceed
                    ? `Withdraw ${formatAmount(parsedAmount, "NGN")}`
                    : "Withdraw NGN"
                }
                onPress={handlePressWithdraw}
                disabled={!canProceed}
                loading={isProcessing}
                color={C.actionPrimary}
                icon={<Ionicons name="cash-outline" size={20} color="#FFFFFF" />}
              />
            </View>
          </MobileCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── PIN Confirmation Modal ─────────────────────────────────────────── */}
      <Modal
        visible={pinModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelPin}
      >
        <View style={styles.modalOverlay}>
          <MobileCard style={[styles.pinSheet, { marginHorizontal: cardInsets.left }]}>
            {/* Header */}
            <View style={styles.pinSheetHeader}>
              <View style={styles.pinIconWrap}>
                <Ionicons name="lock-closed" size={24} color={C.actionPrimary} />
              </View>
              <Text style={[styles.pinTitle, { color: C.textPrimary }]}>Confirm Withdrawal</Text>
              <Text style={[styles.pinSubtitle, { color: C.textMuted }]}>
                Enter your 4-digit transaction PIN to authorise this withdrawal
              </Text>
            </View>

            {/* PIN input */}
            <OTPInput
              value={pin}
              onChange={(v) => setPin(v)}
              length={4}
              error={pinInvalid}
              success={pinValid}
              containerStyle={styles.pinInput}
            />

            {/* Inline PIN status */}
            {pinComplete && (
              <View style={styles.pinStatusRow}>
                <Ionicons
                  name={pinValid ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={pinValid ? C.statusSuccess : C.statusDanger}
                />
                <Text
                  style={[
                    styles.pinStatusText,
                    { color: pinValid ? C.statusSuccess : C.statusDanger },
                  ]}
                >
                  {pinValid ? "PIN correct" : "Incorrect PIN — try again"}
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.pinActions}>
              <TouchableOpacity
                onPress={handleCancelPin}
                style={styles.pinCancelBtn}
              >
                <Text style={[styles.pinCancelText, { color: C.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <PrimaryButton
                label="Confirm"
                onPress={handleConfirmPin}
                disabled={!pinValid}
                style={styles.pinConfirmBtn}
                icon={<Ionicons name="checkmark" size={18} color="#FFFFFF" />}
              />
            </View>
          </MobileCard>
        </View>
      </Modal>
    </AppBackground>
  );
}

// ── BankLogo sub-component ────────────────────────────────────────────────────

function BankLogo({ slug, size = 36 }: { slug?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const C = useColors();
  if (!slug || failed) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: C.bgElevated,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="business-outline" size={size * 0.55} color={C.textMuted} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: getBankLogoUrl(slug) }}
      style={{ width: size, height: size, borderRadius: size / 4 }}
      onError={() => setFailed(true)}
      resizeMode="contain"
    />
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.space4, gap: spacing.space4 },

  // Balance pill
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.bgPrimarySubtle,
    borderWidth: 1,
    borderColor: Colors.palette.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.space3,
    paddingVertical: 7,
  },
  balancePillText: { ...typeScale.bodySM, color: Colors.textMuted },
  balancePillAmount: { color: Colors.textPrimary, fontWeight: "700" },

  // Info banner
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusWarningBg,
    borderWidth: 1,
    borderColor: Colors.palette.amber,
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    flex: 1,
    ...typeScale.bodySM,
    color: Colors.statusWarning,
    lineHeight: 18,
  },

  // Sections
  section: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 0,
  },
  sectionTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    marginBottom: spacing.space3,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.space3,
  },
  noMargin: { marginBottom: 0 },

  // Manage button
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  manageBtnText: {
    ...typeScale.labelSM,
    color: Colors.actionPrimary,
  },

  // Loading row
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.space3,
  },

  // Empty account prompt
  emptyAccountBtn: {
    alignItems: "center",
    gap: 6,
    padding: spacing.space4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.actionPrimary,
    borderStyle: "dashed",
    backgroundColor: Colors.bgPrimarySubtle,
  },
  emptyAccountTitle: {
    ...typeScale.labelMD,
    color: Colors.actionPrimary,
  },
  emptyAccountSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
    textAlign: "center",
  },

  // Account list
  accountList: { gap: spacing.space2 },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.space3,
    backgroundColor: Colors.bgSurface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
  },
  accountRowSelected: {
    backgroundColor: Colors.bgPrimarySubtle,
    borderColor: Colors.actionPrimary,
  },

  // Summary
  summaryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space2,
    backgroundColor: Colors.statusSuccessBg,
    borderWidth: 1,
    borderColor: Colors.palette.green,
    borderRadius: 12,
    padding: 14,
  },
  summaryText: {
    flex: 1,
    ...typeScale.bodySM,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  summaryHighlight: { color: Colors.textPrimary, fontWeight: "700" },

  // Submit
  submitWrap: {
    paddingTop: spacing.space3,
    paddingBottom: spacing.scrollBottomPadding,
  },

  // PIN modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  pinSheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.palette.redT25,
    paddingHorizontal: spacing.space6,
    paddingTop: spacing.space6,
    paddingBottom: spacing.space8,
    gap: spacing.space4,
  },
  pinSheetHeader: {
    alignItems: "center",
    gap: spacing.space2,
  },
  pinIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.bgPrimarySubtle,
    borderWidth: 1,
    borderColor: Colors.palette.redT25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.space2,
  },
  pinTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    textAlign: "center",
  },
  pinSubtitle: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },

  // PIN summary row
  pinSummaryRow: {
    flexDirection: "row",
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
  },
  pinSummaryDivider: {
    width: 1,
    backgroundColor: Colors.borderSubtle,
  },
  pinSummaryLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  pinSummaryValue: {
    ...typeScale.labelMD,
    color: Colors.textPrimary,
  },

  // PIN input
  pinInput: {
    alignSelf: "center",
  },
  // PIN status
  pinStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: -spacing.space2,
  },
  pinStatusText: {
    ...typeScale.bodySM,
    fontWeight: "600",
  },

  // PIN actions
  pinActions: {
    flexDirection: "row",
    gap: spacing.space3,
    marginTop: spacing.space2,
  },
  pinCancelBtn: {
    flex: 1,
    height: 56,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    alignItems: "center",
    justifyContent: "center",
  },
  pinCancelText: {
    ...typeScale.labelLG,
    color: Colors.textSecondary,
  },
  pinConfirmBtn: {
    flex: 2,
  },
});
