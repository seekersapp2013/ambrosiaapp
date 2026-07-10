import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQuery } from "convex/react";
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
import { MobileCard } from "@/components/MobileCard";
import {
  CURRENCIES, Currency, CURRENCY_SYMBOLS, CURRENCY_LABELS, formatAmount,
} from "@/utils/currency";

type SearchedUser = {
  username: string;
  name?: string;
  avatarUrl?: string | null;
};

export default function TransferScreen() {
  const C = useColors();
  const router = useRouter();

  // ── State ─────────────────────────────────────────────────────────────────
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("USD");
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const currencySynced = useRef(false);

  // ── Convex ────────────────────────────────────────────────────────────────
  const walletBalance = useQuery(
    (api as any)["wallets/getWalletBalance"].getWalletBalance,
    { currency: selectedCurrency },
  );
  const searchResults = useQuery(
    api.profiles.searchProfiles,
    searchQuery.trim().length >= 1 && !selectedUser ? { query: searchQuery.trim() } : "skip",
  );
  const transferFunds = useMutation(
    (api as any)["wallets/transferFunds"].transferFunds,
  );

  useEffect(() => {
    if (!currencySynced.current && walletBalance?.primaryCurrency) {
      const pc = walletBalance.primaryCurrency as Currency;
      if (CURRENCIES.includes(pc)) setSelectedCurrency(pc);
      currencySynced.current = true;
    }
  }, [walletBalance?.primaryCurrency]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const parsedAmount = parseFloat(transferAmount);
  const currentBalance =
    (walletBalance?.balances as Record<string, number> | undefined)?.[selectedCurrency] ?? 0;
  const hasAmount = !!parsedAmount && parsedAmount > 0;
  const hasSufficientFunds = parsedAmount <= currentBalance;
  const isValid = hasAmount && !!selectedUser && hasSufficientFunds;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUserSelect = (user: SearchedUser) => {
    setSelectedUser(user);
    setSearchQuery(user.username);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    setSearchQuery("");
    setMessage(null);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleTransfer = async () => {
    if (!isValid || !selectedUser) return;
    if (parsedAmount <= 0) {
      setMessage({ text: "Please enter a valid amount", isError: true });
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    try {
      const result = await transferFunds({
        recipientUsername: selectedUser.username,
        amount: parsedAmount,
        currency: selectedCurrency,
        description: `Transfer to @${selectedUser.username}`,
      });

      const successText =
        `Successfully sent ${formatAmount(parsedAmount, selectedCurrency)} to @${selectedUser.username}. ` +
        `New balance: ${formatAmount(result.senderNewBalance, result.currency)}`;

      setMessage({ text: successText, isError: false });
      setTransferAmount("");
      setSelectedUser(null);
      setSearchQuery("");
      setTimeout(() => router.replace("/(tabs)/wallet"), 2000);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Transfer failed";
      setMessage({ text: `Error: ${errMsg}`, isError: true });
    } finally {
      setIsProcessing(false);
    }
  };

  const showDropdown =
    !selectedUser &&
    searchQuery.trim().length >= 1 &&
    Array.isArray(searchResults) &&
    searchResults.length > 0;

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
              title="Transfer Funds"
              onBack={() => router.replace("/(tabs)/wallet")}
            />
          {/* Balance pill */}
          {walletBalance !== undefined && (
            <View style={[styles.balancePill, { backgroundColor: C.statusInfoBg, borderColor: C.palette.blue }]}>
              <Ionicons name="wallet-outline" size={14} color={C.statusInfo} />
              <Text style={[styles.balancePillText, { color: C.textMuted }]}>
                Available:{" "}
                <Text style={[styles.balancePillAmount, { color: C.textPrimary }]}>
                  {formatAmount(currentBalance, selectedCurrency)}
                </Text>
              </Text>
            </View>
          )}

          {/* Recipient search */}
          <BaseCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Search & Select Recipient</Text>
            <Text style={[styles.fieldLabel, { color: C.textMuted }]}>
              Search by username or name <Text style={[styles.required, { color: C.statusInfo }]}>*</Text>
            </Text>

            <View style={[styles.searchRow, { borderColor: C.borderDefault, backgroundColor: C.bgSurface }, selectedUser ? { borderColor: C.palette.blue, backgroundColor: C.statusInfoBg } : null]}>
              <Ionicons
                name={selectedUser ? "person-circle-outline" : "search-outline"}
                size={18}
                color={selectedUser ? C.statusInfo : C.textMuted}
                style={{ marginRight: spacing.space2 }}
              />
              <TextInput
                ref={searchInputRef}
                style={[styles.searchInline, { color: C.textPrimary }]}
                value={searchQuery}
                onChangeText={(v) => {
                  setSearchQuery(v);
                  if (selectedUser) setSelectedUser(null);
                  setMessage(null);
                }}
                placeholder="Search by username or name..."
                placeholderTextColor={C.textDisabled}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isProcessing}
              />
              {selectedUser && (
                <TouchableOpacity
                  onPress={handleClearUser}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={C.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Search results dropdown */}
            {showDropdown && (
              <View style={[styles.dropdownList, { backgroundColor: C.bgElevated, borderColor: C.borderDefault }]}>
                {(searchResults as any[]).slice(0, 8).map((user: any) => (
                  <TouchableOpacity
                    key={user._id ?? user.username}
                    style={styles.userItem}
                    onPress={() =>
                      handleUserSelect({
                        username: user.username,
                        name: user.name,
                        avatarUrl: user.avatarUrl,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {(user.name ?? user.username ?? "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={[styles.userUsername, { color: C.textPrimary }]}>@{user.username}</Text>
                      {user.name ? <Text style={[styles.userName, { color: C.textMuted }]}>{user.name}</Text> : null}
                    </View>
                    <Ionicons name="chevron-forward" size={14} color={C.textDisabled} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* No results */}
            {!selectedUser &&
              searchQuery.trim().length >= 1 &&
              Array.isArray(searchResults) &&
              searchResults.length === 0 && (
                <Text style={styles.noResults}>No users found for "{searchQuery}"</Text>
              )}

            {/* Selected user chip */}
            {selectedUser && (
              <View style={styles.selectedUserChip}>
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {(selectedUser.name ?? selectedUser.username ?? "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.userUsername, { color: C.textPrimary }]}>@{selectedUser.username}</Text>
                  {selectedUser.name ? <Text style={[styles.userName, { color: C.textMuted }]}>{selectedUser.name}</Text> : null}
                </View>
                <Ionicons name="checkmark-circle" size={18} color={C.statusSuccess} />
              </View>
            )}
          </BaseCard>

          {/* Currency */}
          <BaseCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>Currency</Text>
            <TouchableOpacity
              style={[styles.dropdownBtn, { borderColor: C.borderDefault, backgroundColor: C.bgSurface }]}
              onPress={() => setCurrencyDropdownOpen((v) => !v)}
              activeOpacity={0.85}
              disabled={isProcessing}
            >
              <Text style={[styles.dropdownBtnText, { color: C.textSecondary }]}>
                {CURRENCY_SYMBOLS[selectedCurrency]}{"  "}{selectedCurrency} — {CURRENCY_LABELS[selectedCurrency]}
              </Text>
              <Ionicons
                name={currencyDropdownOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color={C.textMuted}
              />
            </TouchableOpacity>

            {currencyDropdownOpen && (
              <View style={[styles.dropdownList, { backgroundColor: C.bgElevated, borderColor: C.borderDefault }]}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.dropdownItem, selectedCurrency === c && styles.dropdownItemActive]}
                    onPress={() => { setSelectedCurrency(c); setCurrencyDropdownOpen(false); }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropdownItemSymbol, { color: C.textPrimary }]}>{CURRENCY_SYMBOLS[c]}</Text>
                    <View style={styles.dropdownItemInfo}>
                      <Text style={[styles.dropdownItemCode, { color: C.textPrimary }]}>{c}</Text>
                      <Text style={[styles.dropdownItemName, { color: C.textMuted }]}>{CURRENCY_LABELS[c]}</Text>
                    </View>
                    {selectedCurrency === c && (
                      <Ionicons name="checkmark" size={16} color={C.statusInfo} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </BaseCard>

          {/* Amount */}
          <BaseCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textPrimary }]}>
              Amount ({CURRENCY_SYMBOLS[selectedCurrency]})
            </Text>
            <AppInput
              value={transferAmount}
              onChangeText={(v) => { setTransferAmount(v); setMessage(null); }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              returnKeyType="done"
              editable={!isProcessing}
              error={hasAmount && !hasSufficientFunds ? "Insufficient balance" : undefined}
              hint={walletBalance ? `Available: ${formatAmount(currentBalance, selectedCurrency)}` : undefined}
              containerStyle={styles.noMargin}
            />
          </BaseCard>

          {/* Status message */}
          {message && (
            <View style={[
              styles.messageCard,
              message.isError
                ? [styles.messageError, { backgroundColor: C.statusDangerBg, borderColor: C.palette.error }]
                : [styles.messageSuccess, { backgroundColor: C.statusSuccessBg, borderColor: C.palette.green }],
            ]}>
              <Ionicons
                name={message.isError ? "alert-circle-outline" : "checkmark-circle-outline"}
                size={16}
                color={message.isError ? C.statusDanger : C.statusSuccess}
              />
              <Text style={[
                styles.messageText,
                message.isError
                  ? [styles.messageTextError, { color: C.statusDanger }]
                  : [styles.messageTextSuccess, { color: C.statusSuccess }],
              ]}>
                {message.text}
              </Text>
            </View>
          )}

          {/* Submit button inside scroll — clears tab bar */}
          <View style={styles.submitWrap}>
            <PrimaryButton
              label={hasAmount && selectedUser ? `Transfer ${selectedCurrency}` : "Transfer"}
              onPress={handleTransfer}
              disabled={!isValid}
              loading={isProcessing}
              color={C.statusInfo}
              icon={<Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />}
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
    backgroundColor: Colors.statusInfoBg,
    borderWidth: 1, borderColor: Colors.palette.blue,
    borderRadius: 20, paddingHorizontal: spacing.space3, paddingVertical: 7,
  },
  balancePillText: { ...typeScale.bodySM, color: Colors.textMuted },
  balancePillAmount: { color: Colors.textPrimary, fontWeight: "700" },

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
  required: { color: Colors.statusInfo },

  // Recipient search row
  searchRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    borderRadius: 12, backgroundColor: Colors.bgSurface,
    paddingHorizontal: spacing.space3,
    height: 56,
  },
  searchRowSelected: {
    borderColor: Colors.palette.blue,
    backgroundColor: Colors.statusInfoBg,
  },
  searchInline: {
    flex: 1,
    ...typeScale.bodyMD,
    color: Colors.textPrimary,
    height: "100%",
  },

  // Search results dropdown
  dropdownList: {
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.borderDefault,
    borderRadius: 12, overflow: "hidden",
    marginTop: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  userItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: spacing.space4, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  userAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.statusInfoBg,
    borderWidth: 1, borderColor: Colors.palette.blue,
    justifyContent: "center", alignItems: "center",
  },
  userAvatarText: { ...typeScale.labelMD, color: Colors.statusInfo },
  userInfo: { flex: 1 },
  userUsername: { ...typeScale.labelMD, color: Colors.textPrimary },
  userName: { ...typeScale.caption, color: Colors.textMuted, marginTop: 1 },

  noResults: {
    ...typeScale.bodySM,
    color: Colors.textDisabled,
    marginTop: spacing.space2, textAlign: "center",
  },

  selectedUserChip: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginTop: 10,
    backgroundColor: Colors.statusInfoBg,
    borderWidth: 1, borderColor: Colors.palette.blue,
    borderRadius: 10, paddingHorizontal: spacing.space3, paddingVertical: 10,
  },

  // Currency dropdown
  dropdownBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    borderRadius: 12, paddingHorizontal: spacing.space4, paddingVertical: 13,
    backgroundColor: Colors.bgSurface,
  },
  dropdownBtnText: { ...typeScale.labelMD, color: Colors.textSecondary },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", gap: spacing.space3,
    paddingHorizontal: spacing.space4, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  dropdownItemActive: { backgroundColor: Colors.statusInfoBg },
  dropdownItemSymbol: {
    ...typeScale.headingSM,
    color: Colors.textPrimary, width: 24, textAlign: "center",
  },
  dropdownItemInfo: { flex: 1 },
  dropdownItemCode: { ...typeScale.labelMD, color: Colors.textPrimary },
  dropdownItemName: { ...typeScale.caption, color: Colors.textMuted, marginTop: 1 },

  noMargin: { marginBottom: 0 },

  // Status messages
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
