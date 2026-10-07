import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  Alert, KeyboardAvoidingView, Platform, TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useAction, useQuery } from "convex/react";
import * as Clipboard from "expo-clipboard";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { AppBackground } from "@/components/AppBackground";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { AppInput } from "@/components/ui/Input";
import { BaseCard } from "@/components/ui/Card";
import { MobileCard } from "@/components/MobileCard";

const COOLDOWN_SECONDS = 60;

export default function BankTransferScreen() {
  const router = useRouter();
  const C = useColors();

  // ── Data ────────────────────────────────────────────────────────────────
  const account = useQuery(
    (api as any)["wallets/dedicatedAccounts"].getMyDedicatedAccount,
    {},
  );
  const profile = useQuery(api.profiles.getMyProfile);
  const provision = useAction((api as any).paystackDva.provisionDedicatedAccount);
  const reconcile = useAction((api as any).paystackDva.reconcileDedicatedDeposits);

  // ── Profile prefill ───────────────────────────────────────────────────────
  const profileName = (profile?.name ?? (profile?.user as any)?.name ?? "").trim();
  const profileEmail = ((profile?.user as any)?.email ?? "").trim();
  const profilePhone = ((profile as any)?.phoneNumber ?? (profile?.user as any)?.phone ?? "").trim();

  const [firstFromProfile, lastFromProfile] = useMemo(() => {
    if (!profileName) return ["", ""];
    const parts = profileName.split(/\s+/);
    return [parts[0] ?? "", parts.slice(1).join(" ")];
  }, [profileName]);

  // ── KYC form state (only for fields we don't already have) ─────────────────
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bvn, setBvn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ── Manual reconcile state ──────────────────────────────────────────────────
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const resolvedFirst = firstFromProfile || firstName.trim();
  const resolvedLast = lastFromProfile || lastName.trim();
  const resolvedEmail = profileEmail || email.trim();
  const resolvedPhone = profilePhone || phone.trim();

  const bvnValid = /^\d{11}$/.test(bvn.trim());
  const kycValid =
    !!resolvedFirst && !!resolvedLast && !!resolvedEmail && !!resolvedPhone && bvnValid;

  const handleProvision = async () => {
    if (!kycValid) {
      Alert.alert("Missing details", "Please complete all fields. BVN must be 11 digits.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await provision({
        bvn: bvn.trim(),
        firstName: resolvedFirst,
        lastName: resolvedLast,
        phone: resolvedPhone,
        email: resolvedEmail,
      });
      // Clear the BVN from memory as soon as the request completes.
      setBvn("");
      Alert.alert(
        "Account Setup Started",
        result?.message ??
          "Your dedicated bank account is being created. It will appear here shortly.",
      );
    } catch (e: any) {
      Alert.alert("Could not create account", e?.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckPayment = async () => {
    if (cooldown > 0 || checking) return;
    setChecking(true);
    try {
      const result = await reconcile({});
      if (result?.status === "cooldown") {
        setCooldown(result.retryAfterSeconds ?? COOLDOWN_SECONDS);
        Alert.alert("Please wait", result.message);
      } else if (result?.status === "no_account") {
        Alert.alert("Not ready", result.message);
      } else {
        setCooldown(COOLDOWN_SECONDS);
        Alert.alert(
          result?.credited > 0 ? "Wallet Updated" : "No New Payments",
          result?.message ?? "",
        );
      }
    } catch (e: any) {
      Alert.alert("Check failed", e?.message ?? "Please try again shortly.");
    } finally {
      setChecking(false);
    }
  };

  const copy = async (value: string, label: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (account === undefined || profile === undefined) {
    return (
      <AppBackground style={{ flex: 1 }}>
        <View style={styles.center}>
          <ActivityIndicator color={C.actionPrimary} />
        </View>
      </AppBackground>
    );
  }

  const isActive = account && account.status === "active" && account.accountNumber;
  const isPending = account && account.status === "pending";

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
              title="Bank Transfer"
              onBack={() => router.replace("/(tabs)/wallet")}
            />

            {/* ── ACTIVE: show dedicated account details ─────────────────────── */}
            {isActive ? (
              <>
                <View style={[styles.infoBanner, { backgroundColor: C.statusInfoBg, borderColor: C.palette.blue }]}>
                  <Ionicons name="information-circle-outline" size={16} color={C.statusInfo} />
                  <Text style={[styles.infoText, { color: C.textMuted }]}>
                    Transfer money to this account from any Nigerian bank. Your NGN wallet
                    is credited automatically once the transfer is received.
                  </Text>
                </View>

                <BaseCard style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Your Dedicated Account</Text>

                  <DetailRow label="Account Name" value={account.accountName} C={C} onCopy={() => copy(account.accountName, "Account name")} />
                  <DetailRow label="Account Number" value={account.accountNumber} C={C} onCopy={() => copy(account.accountNumber, "Account number")} big />
                  <DetailRow label="Bank" value={account.bankName} C={C} />
                </BaseCard>

                <View style={styles.submitWrap}>
                  <PrimaryButton
                    label={
                      cooldown > 0
                        ? `I have made Payment (${cooldown}s)`
                        : "I have made Payment"
                    }
                    onPress={handleCheckPayment}
                    loading={checking}
                    disabled={cooldown > 0}
                    color={C.statusSuccess}
                    icon={<Ionicons name="refresh" size={18} color="#FFFFFF" />}
                  />
                  <Text style={[styles.helperText, { color: C.textMuted }]}>
                    Already sent money? Tap to check for your deposit. Payments usually
                    arrive automatically within a minute.
                  </Text>
                </View>
              </>
            ) : isPending ? (
              /* ── PENDING: account being created ──────────────────────────── */
              <BaseCard style={styles.section}>
                <View style={styles.pendingWrap}>
                  <ActivityIndicator color={C.actionPrimary} />
                  <Text style={[styles.pendingTitle, { color: C.textPrimary }]}>
                    Setting up your account
                  </Text>
                  <Text style={[styles.pendingText, { color: C.textMuted }]}>
                    We're creating your dedicated bank account with Paystack. This usually
                    takes a few seconds — your account details will appear here
                    automatically.
                  </Text>
                </View>
              </BaseCard>
            ) : (
              /* ── NO ACCOUNT: KYC form ────────────────────────────────────── */
              <>
                <View style={[styles.infoBanner, { backgroundColor: C.statusInfoBg, borderColor: C.palette.blue }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={C.statusInfo} />
                  <Text style={[styles.infoText, { color: C.textMuted }]}>
                    We'll create a dedicated NGN bank account for you to receive deposits.
                    Your BVN is sent securely to Paystack for verification and is never
                    stored by us.
                  </Text>
                </View>

                <BaseCard style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Verify Your Identity</Text>

                  {!firstFromProfile && (
                    <AppInput
                      label="First Name *"
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="First name"
                      returnKeyType="next"
                    />
                  )}
                  {!lastFromProfile && (
                    <AppInput
                      label="Last Name *"
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Last name"
                      returnKeyType="next"
                    />
                  )}
                  {!profileEmail && (
                    <AppInput
                      label="Email Address *"
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your@email.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      returnKeyType="next"
                    />
                  )}
                  {!profilePhone && (
                    <AppInput
                      label="Phone Number *"
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="08121303854"
                      keyboardType="phone-pad"
                      returnKeyType="next"
                    />
                  )}

                  <AppInput
                    label="BVN (Bank Verification Number) *"
                    value={bvn}
                    onChangeText={(t) => setBvn(t.replace(/\D/g, "").slice(0, 11))}
                    placeholder="11-digit BVN"
                    keyboardType="number-pad"
                    returnKeyType="done"
                    hint="Dial *565*0# on your registered line to get your BVN."
                    error={bvn.length > 0 && !bvnValid ? "BVN must be 11 digits" : undefined}
                  />

                  {(firstFromProfile || profileEmail || profilePhone) && (
                    <View style={styles.profileConfirm}>
                      <Ionicons name="checkmark-circle" size={16} color={C.statusSuccess} />
                      <Text style={[styles.profileConfirmText, { color: C.statusSuccess }]}>
                        Using details from your profile
                      </Text>
                    </View>
                  )}
                </BaseCard>

                <View style={styles.submitWrap}>
                  <PrimaryButton
                    label="Create Bank Account"
                    onPress={handleProvision}
                    loading={submitting}
                    disabled={!kycValid}
                    color={C.statusSuccess}
                    icon={<Ionicons name="business-outline" size={18} color="#FFFFFF" />}
                  />
                </View>
              </>
            )}
          </MobileCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

function DetailRow({
  label, value, C, onCopy, big,
}: {
  label: string;
  value: string;
  C: ReturnType<typeof useColors>;
  onCopy?: () => void;
  big?: boolean;
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: C.borderSubtle }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.detailLabel, { color: C.textMuted }]}>{label}</Text>
        <Text style={[big ? styles.detailValueBig : styles.detailValue, { color: C.textPrimary }]}>
          {value}
        </Text>
      </View>
      {onCopy && (
        <TouchableOpacity onPress={onCopy} hitSlop={8} style={styles.copyBtn} activeOpacity={0.7}>
          <Ionicons name="copy-outline" size={18} color={C.actionPrimary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.space4, gap: spacing.space4 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.space2,
    borderWidth: 1, borderRadius: 12, padding: 14,
  },
  infoText: { flex: 1, ...typeScale.bodySM, lineHeight: 18 },

  section: { flexDirection: "column", alignItems: "stretch", marginBottom: 0 },
  sectionTitle: { ...typeScale.headingMD, marginBottom: spacing.space3 },

  profileConfirm: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 4 },
  profileConfirmText: { ...typeScale.bodySM, fontWeight: "500" },

  detailRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1,
  },
  detailLabel: { ...typeScale.caption, marginBottom: 4 },
  detailValue: { ...typeScale.labelMD, fontWeight: "600" },
  detailValueBig: { ...typeScale.headingMD, fontWeight: "700", letterSpacing: 1 },
  copyBtn: { padding: 8 },

  pendingWrap: { alignItems: "center", gap: spacing.space3, paddingVertical: spacing.space4 },
  pendingTitle: { ...typeScale.headingSM },
  pendingText: { ...typeScale.bodySM, textAlign: "center", lineHeight: 18 },

  submitWrap: { paddingTop: spacing.space2, paddingBottom: spacing.scrollBottomPadding, gap: spacing.space3 },
  helperText: { ...typeScale.bodySM, textAlign: "center", lineHeight: 18 },
});
