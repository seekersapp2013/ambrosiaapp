import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  FlatList,
  Modal,
} from "react-native";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { PrimaryButton } from "@/components/ui/Button";
import { getBankLogoUrl, sortBanksWithPopularFirst, type BankOption } from "@/utils/paystackBanking";

type VerifyStatus = "idle" | "resolving" | "registering" | "success" | "error";

export default function LinkBank() {
  const listBanks = useAction(api.paystack.listNigerianBanks);
  const resolveAccount = useAction(api.paystack.resolveAccountNumber);
  const createRecipient = useAction(api.paystack.createTransferRecipient);
  const addAccount = useMutation(api["wallets/bankAccounts"].addWithdrawalBankAccount);
  const removeAccount = useMutation(api["wallets/bankAccounts"].removeWithdrawalBankAccount);
  const linkedAccounts = useQuery(api["wallets/bankAccounts"].getWithdrawalBankAccounts);

  const [banks, setBanks] = useState<BankOption[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankOption | null>(null);
  const [bankSearch, setBankSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [recipientCode, setRecipientCode] = useState<string | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("idle");
  const [verifyError, setVerifyError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBanksLoading(true);
    listBanks({})
      .then((result) => setBanks(sortBanksWithPopularFirst(result)))
      .catch(() => Alert.alert("Error", "Failed to load banks. Please try again."))
      .finally(() => setBanksLoading(false));
  }, []);

  useEffect(() => {
    if (accountNumber.length === 10 && selectedBank) {
      verifyAccountNumber();
    } else if (accountNumber.length < 10) {
      setAccountName("");
      setRecipientCode(null);
      setVerifyStatus("idle");
      setVerifyError("");
    }
  }, [accountNumber, selectedBank]);

  const verifyAccountNumber = useCallback(async () => {
    if (!selectedBank || accountNumber.length !== 10) return;
    setVerifyStatus("resolving");
    setAccountName("");
    setRecipientCode(null);
    setVerifyError("");
    try {
      const resolved = await resolveAccount({ accountNumber, bankCode: selectedBank.code });
      setAccountName(resolved.accountName);
      setVerifyStatus("registering");
      const recipient = await createRecipient({
        accountName: resolved.accountName,
        accountNumber,
        bankCode: selectedBank.code,
      });
      setRecipientCode(recipient.recipientCode);
      setVerifyStatus("success");
    } catch (err: any) {
      setVerifyStatus("error");
      setVerifyError(err.message || "Could not verify account");
    }
  }, [selectedBank, accountNumber]);

  const handleSelectBank = (bank: BankOption) => {
    setSelectedBank(bank);
    setDropdownOpen(false);
    setBankSearch("");
    if (accountNumber.length === 10) {
      setAccountName("");
      setRecipientCode(null);
      setVerifyStatus("idle");
    }
  };

  const handleAddAccount = async () => {
    if (!selectedBank || verifyStatus !== "success" || !accountName || !recipientCode) return;
    setSubmitting(true);
    try {
      await addAccount({
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        bankSlug: selectedBank.slug,
        accountNumber,
        accountName,
        recipientCode,
      });
      setSelectedBank(null);
      setAccountNumber("");
      setAccountName("");
      setRecipientCode(null);
      setVerifyStatus("idle");
      Alert.alert("Success", "Bank account linked successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to link account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = (id: Id<"bank_accounts">) => {
    Alert.alert("Remove Account", "Are you sure you want to remove this bank account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeAccount({ bankAccountId: id });
          } catch (err: any) {
            Alert.alert("Error", err.message || "Failed to remove account.");
          }
        },
      },
    ]);
  };

  const filteredBanks = bankSearch
    ? banks.filter((b) => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
    : banks;

  const canSubmit =
    selectedBank !== null &&
    verifyStatus === "success" &&
    accountName.length > 0 &&
    recipientCode !== null &&
    !submitting;

  return (
    <View style={styles.root}>

      {/* ── Linked Accounts ─────────────────────────────────────────────── */}
      {linkedAccounts && linkedAccounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Linked Accounts</Text>
          {linkedAccounts.map((acc: any, i: number) => (
            <LinkedAccountRow
              key={acc._id}
              account={acc}
              isLast={i === linkedAccounts.length - 1}
              onRemove={() => handleRemove(acc._id as Id<"bank_accounts">)}
            />
          ))}
        </View>
      )}

      {/* ── Divider between sections ─────────────────────────────────────── */}
      {linkedAccounts && linkedAccounts.length > 0 && (
        <View style={styles.divider} />
      )}

      {/* ── Add New Account ──────────────────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Bank Account</Text>

        {/* Bank Selector */}
        <Text style={styles.fieldLabel}>Bank</Text>
        <TouchableOpacity
          onPress={() => setDropdownOpen(true)}
          style={[styles.selectorButton, dropdownOpen && styles.selectorButtonActive]}
          disabled={banksLoading}
          activeOpacity={0.8}
        >
          {banksLoading ? (
            <ActivityIndicator size="small" color={Colors.actionPrimary} style={{ flex: 1 }} />
          ) : selectedBank ? (
            <View style={styles.selectedBankRow}>
              <BankLogo slug={selectedBank.slug} size={26} />
              <Text style={[typeScale.labelMD, { color: Colors.textPrimary, flex: 1 }]}>
                {selectedBank.name}
              </Text>
            </View>
          ) : (
            <Text style={[typeScale.bodyMD, { color: Colors.textDisabled, flex: 1 }]}>
              Select a bank...
            </Text>
          )}
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Account Number */}
        <Text style={styles.fieldLabel}>Account Number</Text>
        <View style={[styles.inputRow, !selectedBank && styles.inputRowDisabled]}>
          <TextInput
            style={[styles.input, { color: Colors.textPrimary }]}
            value={accountNumber}
            onChangeText={(v) => setAccountNumber(v.replace(/\D/g, "").slice(0, 10))}
            keyboardType="number-pad"
            placeholder="10-digit account number"
            placeholderTextColor={Colors.textDisabled}
            maxLength={10}
            editable={!!selectedBank}
          />
          <VerifyIndicator status={verifyStatus} />
        </View>
        {verifyStatus === "error" && (
          <Text style={styles.verifyMsg_error}>{verifyError}</Text>
        )}
        {verifyStatus === "resolving" && (
          <Text style={styles.verifyMsg_warn}>Verifying account...</Text>
        )}
        {verifyStatus === "registering" && (
          <Text style={styles.verifyMsg_info}>Registering for transfers...</Text>
        )}

        {/* Verified Account Name */}
        {verifyStatus === "success" && accountName ? (
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={16} color={Colors.statusSuccess} />
            <Text style={[typeScale.labelMD, { color: Colors.statusSuccess, flex: 1 }]}>
              {accountName}
            </Text>
          </View>
        ) : null}

        {/* Submit */}
        <PrimaryButton
          label={submitting ? "Linking..." : "Link Account"}
          onPress={handleAddAccount}
          disabled={!canSubmit}
          loading={submitting}
          icon={<Ionicons name="link-outline" size={18} color="#FFFFFF" />}
          style={{ marginTop: spacing.space4 }}
        />
      </View>

      {/* ── Bank Picker Modal ────────────────────────────────────────────── */}
      <Modal visible={dropdownOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[typeScale.headingMD, { color: Colors.textPrimary }]}>
                Select Bank
              </Text>
              <TouchableOpacity
                onPress={() => { setDropdownOpen(false); setBankSearch(""); }}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: Colors.textPrimary }]}
                value={bankSearch}
                onChangeText={setBankSearch}
                placeholder="Search banks..."
                placeholderTextColor={Colors.textDisabled}
                autoFocus
              />
              {bankSearch.length > 0 && (
                <TouchableOpacity onPress={() => setBankSearch("")}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* List */}
            <FlatList
              data={filteredBanks}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = selectedBank?.code === item.code;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelectBank(item)}
                    style={[styles.bankItem, isSelected && styles.bankItemSelected]}
                    activeOpacity={0.75}
                  >
                    <BankLogo slug={item.slug} size={32} />
                    <Text
                      style={[
                        typeScale.bodyMD,
                        {
                          flex: 1,
                          marginLeft: 12,
                          color: isSelected ? Colors.actionPrimary : Colors.textPrimary,
                          fontWeight: isSelected ? "700" : "400",
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={Colors.actionPrimary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 32, alignItems: "center" }}>
                  <Text style={[typeScale.bodyMD, { color: Colors.textMuted }]}>
                    No banks found
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BankLogo({ slug, size = 32 }: { slug?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!slug || failed) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: Colors.bgElevated,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Ionicons name="business-outline" size={size * 0.55} color={Colors.textMuted} />
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

function VerifyIndicator({ status }: { status: VerifyStatus }) {
  if (status === "resolving")
    return <ActivityIndicator size="small" color={Colors.statusWarning} />;
  if (status === "registering")
    return <ActivityIndicator size="small" color={Colors.statusInfo} />;
  if (status === "success")
    return <Ionicons name="checkmark-circle" size={20} color={Colors.statusSuccess} />;
  if (status === "error")
    return <Ionicons name="close-circle" size={20} color={Colors.statusDanger} />;
  return null;
}

function LinkedAccountRow({
  account,
  isLast,
  onRemove,
}: {
  account: any;
  isLast: boolean;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.linkedRow, !isLast && styles.linkedRowBorder]}>
      <BankLogo slug={account.bankSlug} size={36} />
      <View style={{ flex: 1 }}>
        <Text style={[typeScale.labelMD, { color: Colors.textPrimary }]}>
          {account.accountName}
        </Text>
        <Text style={[typeScale.caption, { color: Colors.textMuted, marginTop: 2 }]}>
          {account.bankName} · {account.accountNumber}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onRemove}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.removeBtn}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.statusDanger} />
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { gap: 0 },

  section: {
    paddingVertical: spacing.space4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },
  sectionTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    marginBottom: spacing.space4,
  },
  fieldLabel: {
    ...typeScale.bodySM,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: 6,
  },

  // Bank selector
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space3,
    paddingVertical: 13,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    minHeight: 50,
    marginBottom: spacing.space4,
  },
  selectorButtonActive: {
    borderColor: Colors.actionPrimary,
    backgroundColor: Colors.bgPrimarySubtle,
  },
  selectedBankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },

  // Account number input
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space3,
    paddingVertical: 13,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    gap: 8,
    marginBottom: 4,
  },
  inputRowDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    ...typeScale.bodyMD,
    padding: 0,
  },

  // Verify status messages
  verifyMsg_error: {
    ...typeScale.caption,
    color: Colors.statusDanger,
    marginTop: 4,
    marginBottom: spacing.space2,
  },
  verifyMsg_warn: {
    ...typeScale.caption,
    color: Colors.statusWarning,
    marginTop: 4,
    marginBottom: spacing.space2,
  },
  verifyMsg_info: {
    ...typeScale.caption,
    color: Colors.statusInfo,
    marginTop: 4,
    marginBottom: spacing.space2,
  },

  // Verified account name row
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.space3,
    paddingHorizontal: spacing.space3,
    paddingVertical: 10,
    backgroundColor: Colors.statusSuccessBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.palette.green,
  },

  // Linked account rows
  linkedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: spacing.space3,
  },
  linkedRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  removeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.statusDangerBg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Bank picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: Colors.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.palette.redT25,
    maxHeight: "82%",
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    margin: spacing.space3,
    paddingHorizontal: spacing.space3,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.bgElevated,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    ...typeScale.bodyMD,
    padding: 0,
  },
  bankItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.space4,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  bankItemSelected: {
    backgroundColor: Colors.bgPrimarySubtle,
  },
});
