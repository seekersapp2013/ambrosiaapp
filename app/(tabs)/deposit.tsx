import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { AppBackground } from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { AppInput, TextareaInput } from "@/components/ui/Input";
import { BaseCard } from "@/components/ui/Card";
import { MobileCard } from "@/components/MobileCard";
import {
  CURRENCIES, Currency, CURRENCY_SYMBOLS, CURRENCY_LABELS,
} from "@/utils/currency";export default function DepositScreen() {
  const router = useRouter();

  // ── Data ──────────────────────────────────────────────────────────────────
  const profile = useQuery(api.profiles.getMyProfile);
  const initializePayment = useAction(api.ercasPayActions.initializeDepositPayment);

  // ── Form state ────────────────────────────────────────────────────────────
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("NGN");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileName  = (profile?.name ?? (profile?.user as any)?.name ?? "").trim();
  const profileEmail = ((profile?.user as any)?.email ?? "").trim();
  const profilePhone = ((profile as any)?.phoneNumber ?? (profile?.user as any)?.phone ?? "").trim();

  useEffect(() => {
    if (profile?.primaryCurrency && CURRENCIES.includes(profile.primaryCurrency as Currency)) {
      setSelectedCurrency(profile.primaryCurrency as Currency);
    }
  }, [profile?.primaryCurrency]);

  const customerName  = profileName  || manualName.trim();
  const customerEmail = profileEmail || manualEmail.trim();
  const phoneNumber   = profilePhone || manualPhone.trim();

  // ── Validation ────────────────────────────────────────────────────────────
  const parsedAmount = parseFloat(amount);
  const hasAmount  = !!parsedAmount && parsedAmount > 0;
  const hasPhone   = phoneNumber.length > 0;
  const hasProfile = !!customerName && !!customerEmail;
  const isValid    = hasPhone && hasAmount && hasProfile;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    if (!isValid) return;
    if (!hasProfile) {
      Alert.alert(
        "Profile Incomplete",
        "Your name and email are required to process a deposit. Please complete your profile first.",
        [{ text: "OK" }],
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await initializePayment({
        amount: parsedAmount,
        currency: selectedCurrency,
        customerName,
        customerEmail,
        customerPhone: phoneNumber.trim(),
        paymentMethods: "card,bank-transfer,ussd,qrcode",
        description: description.trim() || `Wallet deposit — ${selectedCurrency} ${parsedAmount}`,
        feeBearer: "customer",
        redirectUrl: "https://ambrosia.app/callback",
      });

      if (result.requestSuccessful && result.responseBody?.checkoutUrl) {
        await Linking.openURL(result.responseBody.checkoutUrl);
        Alert.alert(
          "Payment Initiated",
          `Complete your payment in the browser. Your wallet will be credited automatically once payment is confirmed.\n\nRef: ${result.responseBody.transactionReference}`,
          [{ text: "Done", onPress: () => router.replace("/(tabs)/wallet") }],
        );
      } else {
        Alert.alert("Failed", result.responseMessage ?? "Could not initiate payment. Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const profileLoading = profile === undefined;

  return (
    <AppBackground style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <ScreenHeader
          title="Deposit Funds"
          onBack={() => router.replace("/(tabs)/wallet")}
        />

        {/* Scrollable form */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <MobileCard>
          {/* Profile incomplete warning */}
          {!profileLoading && (!customerName || !customerEmail || !phoneNumber) && (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={16} color={Colors.statusWarning} />
              <Text style={styles.warningText}>
                Please fill in the missing fields below to proceed with your deposit.
              </Text>
            </View>
          )}

          {/* Customer Information */}
          <BaseCard style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>

            {profileLoading ? (
              <ActivityIndicator size="small" color={Colors.textMuted} style={{ marginBottom: 12 }} />
            ) : !profileName ? (
              <AppInput
                label="Full Name *"
                value={manualName}
                onChangeText={setManualName}
                placeholder="Your full name"
                returnKeyType="next"
              />
            ) : null}

            {!profileLoading && !profileEmail ? (
              <AppInput
                label="Email Address *"
                value={manualEmail}
                onChangeText={setManualEmail}
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
              />
            ) : null}

            {!profileLoading && !profilePhone ? (
              <AppInput
                label="Phone Number *"
                value={manualPhone}
                onChangeText={setManualPhone}
                placeholder="08121303854"
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            ) : null}

            {!profileLoading && profileName && profileEmail && profilePhone && (
              <View style={styles.profileConfirm}>
                <Ionicons name="checkmark-circle" size={16} color={Colors.statusSuccess} />
                <Text style={styles.profileConfirmText}>Using details from your profile</Text>
              </View>
            )}
          </BaseCard>

          {/* Payment Details */}
          <BaseCard style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>

            <Text style={styles.fieldLabel}>Currency</Text>
            <TouchableOpacity
              style={styles.dropdownBtn}
              onPress={() => setCurrencyDropdownOpen((v) => !v)}
              activeOpacity={0.85}
            >
              <Text style={styles.dropdownBtnText}>
                {CURRENCY_SYMBOLS[selectedCurrency]}{"  "}{selectedCurrency} — {CURRENCY_LABELS[selectedCurrency]}
              </Text>
              <Ionicons
                name={currencyDropdownOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            {currencyDropdownOpen && (
              <View style={styles.dropdownList}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.dropdownItem, selectedCurrency === c && styles.dropdownItemActive]}
                    onPress={() => { setSelectedCurrency(c); setCurrencyDropdownOpen(false); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownItemSymbol}>{CURRENCY_SYMBOLS[c]}</Text>
                    <View style={styles.dropdownItemInfo}>
                      <Text style={styles.dropdownItemCode}>{c}</Text>
                      <Text style={styles.dropdownItemName}>{CURRENCY_LABELS[c]}</Text>
                    </View>
                    {selectedCurrency === c && (
                      <Ionicons name="checkmark" size={16} color={Colors.actionPrimary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <AppInput
              label={`Amount (${CURRENCY_SYMBOLS[selectedCurrency]}) *`}
              value={amount}
              onChangeText={setAmount}
              placeholder="100.00"
              keyboardType="decimal-pad"
              returnKeyType="done"
              containerStyle={styles.amountInput}
            />
          </BaseCard>

          {/* Additional Settings */}
          <BaseCard style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Settings</Text>
            <TextareaInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Payment description (optional)"
            />
          </BaseCard>

          {/* Summary */}
          {hasAmount && (
            <View style={styles.summaryCard}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.statusInfo} />
              <Text style={styles.summaryText}>
                You are depositing{" "}
                <Text style={styles.summaryHighlight}>
                  {CURRENCY_SYMBOLS[selectedCurrency]}
                  {parsedAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2, maximumFractionDigits: 2,
                  })}{" "}{selectedCurrency}
                </Text>
                . You'll be redirected to complete payment securely via ErcasPay.
              </Text>
            </View>
          )}

          {/* Submit button inside scroll — clears tab bar */}
          <View style={styles.submitWrap}>
            <PrimaryButton
              label={
                hasAmount
                  ? `Fund Wallet — ${CURRENCY_SYMBOLS[selectedCurrency]}${parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : "Fund Wallet"
              }
              onPress={handleDeposit}
              disabled={!isValid}
              loading={isSubmitting}
              color={Colors.statusSuccess}
              icon={<Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />}
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

  warningCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.statusWarningBg,
    borderWidth: 1, borderColor: Colors.palette.amber,
    borderRadius: 12, padding: 14,
  },
  warningText: { flex: 1, ...typeScale.bodySM, color: Colors.statusWarning, lineHeight: 18 },

  section: {
    flexDirection: "column",
    alignItems: "stretch",
    marginBottom: 0,
  },
  sectionTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary, marginBottom: spacing.space3,
  },
  fieldLabel: {
    ...typeScale.bodySM,
    fontWeight: "500",
    color: Colors.textMuted, marginBottom: 6,
  },

  profileConfirm: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4,
  },
  profileConfirmText: {
    ...typeScale.bodySM,
    color: Colors.statusSuccess, fontWeight: "500",
  },

  // Currency dropdown
  dropdownBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    borderRadius: 12, paddingHorizontal: spacing.space4, paddingVertical: 13,
    backgroundColor: Colors.bgSurface,
    marginBottom: spacing.space2,
  },
  dropdownBtnText: { ...typeScale.labelMD, color: Colors.textSecondary },
  dropdownList: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.borderDefault,
    borderRadius: 12, overflow: "hidden",
    marginBottom: spacing.space2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.space3,
    paddingHorizontal: spacing.space4, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  dropdownItemActive: { backgroundColor: Colors.bgPrimarySubtle },
  dropdownItemSymbol: {
    ...typeScale.headingSM,
    color: Colors.textPrimary, width: 24, textAlign: "center",
  },
  dropdownItemInfo: { flex: 1 },
  dropdownItemCode: { ...typeScale.labelMD, color: Colors.textPrimary },
  dropdownItemName: { ...typeScale.caption, color: Colors.textMuted, marginTop: 1 },

  amountInput: { marginTop: spacing.space3, marginBottom: 0 },

  summaryCard: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    backgroundColor: Colors.statusInfoBg,
    borderWidth: 1, borderColor: Colors.palette.blue,
    borderRadius: 12, padding: 14,
  },
  summaryText: { flex: 1, ...typeScale.bodySM, color: Colors.textMuted, lineHeight: 18 },
  summaryHighlight: { color: Colors.textPrimary, fontWeight: "700" },

  submitWrap: {
    paddingTop: spacing.space3,
    paddingBottom: spacing.scrollBottomPadding,
  },
});
