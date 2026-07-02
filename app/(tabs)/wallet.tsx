import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { AppBackground } from "@/components/AppBackground";
import { TopNav } from "@/components/TopNav";
import { AppLoader } from "@/components/AppLoader";
import { PrimaryButton } from "@/components/ui/Button";
import { TransactionCard, EmptyStateCard } from "@/components/ui/Card";
import { useRouter } from "expo-router";
import { MobileCard } from "@/components/MobileCard";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";
import {
  CURRENCIES, Currency, CURRENCY_SYMBOLS, CURRENCY_LABELS, formatAmount,
} from "@/utils/currency";

// Deep blue tile background — kept as a one-off decorative value
const TILE_BG = "#0d1f3c";
const TILE_BORDER = "rgba(59,130,246,0.18)";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "numeric", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

// ── Transaction type → design token mapping ───────────────────────────────────
const TX_COLOR: Record<string, string> = {
  deposit:    Colors.statusSuccess,
  withdrawal: Colors.actionPrimary,
  transfer:   Colors.statusInfo,
};
const TX_ICON_BG: Record<string, string> = {
  deposit:    Colors.statusSuccessBg,
  withdrawal: Colors.bgPrimaryMid,
  transfer:   Colors.statusInfoBg,
};
const TX_ICON: Record<string, "arrow-down" | "arrow-up" | "swap-horizontal"> = {
  deposit:    "arrow-down",
  withdrawal: "arrow-up",
  transfer:   "swap-horizontal",
};

export default function WalletScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const walletData = useQuery((api as any)["wallets/getWalletBalance"].getWalletBalance, {});
  const transactions = useQuery(
    (api as any)["wallets/getTransactionHistory"].getTransactionHistory,
    { limit: 50 },
  );

  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const balances = walletData?.balances as Record<string, number> | undefined;
  const primaryCurrency = (walletData?.primaryCurrency ?? "USD") as Currency;
  const activeCurrency: Currency = selectedCurrency ?? primaryCurrency;

  React.useEffect(() => {
    if (walletData?.primaryCurrency && !selectedCurrency) {
      setSelectedCurrency(walletData.primaryCurrency as Currency);
    }
  }, [walletData?.primaryCurrency]);

  if (walletData === undefined) return <AppLoader />;

  return (
    <AppBackground>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MobileCard style={styles.cardOverride}>
        {/* Top nav */}
        <TopNav />

        {/* Currency dropdown */}
        <View style={styles.dropdownWrap}>
          <Text style={styles.dropdownLabel}>Select Currency to View</Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setDropdownOpen((v) => !v)}
            activeOpacity={0.85}
          >
            <Text style={styles.dropdownBtnText}>
              {CURRENCY_SYMBOLS[activeCurrency]}{"  "}{activeCurrency} — {CURRENCY_LABELS[activeCurrency]}
            </Text>
            <Ionicons
              name={dropdownOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textMuted}
            />
          </TouchableOpacity>

          {dropdownOpen && (
            <View style={styles.dropdownList}>
              {CURRENCIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.dropdownItem, activeCurrency === c && styles.dropdownItemActive]}
                  onPress={() => { setSelectedCurrency(c); setDropdownOpen(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dropdownItemSymbol}>{CURRENCY_SYMBOLS[c]}</Text>
                  <View style={styles.dropdownItemInfo}>
                    <Text style={styles.dropdownItemCode}>{c}</Text>
                    <Text style={styles.dropdownItemName}>{CURRENCY_LABELS[c]}</Text>
                  </View>
                  {activeCurrency === c && (
                    <Ionicons name="checkmark" size={16} color={Colors.actionPrimary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceCardLabel}>Current Balance</Text>
          <View style={styles.balanceTile}>
            <Text style={styles.tileCurrencyName}>{CURRENCY_LABELS[activeCurrency]}</Text>
            <Text style={styles.tileAmount}>
              {CURRENCY_SYMBOLS[activeCurrency]}
              {(balances?.[activeCurrency] ?? 0).toLocaleString("en-US", {
                minimumFractionDigits: 2, maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Fund Wallet — green */}
        <View style={styles.btnWrap}>
          <PrimaryButton
            label="Fund Wallet"
            onPress={() => {
              history.push("/(tabs)/wallet");
              router.push("/(tabs)/deposit");
            }}
            color={Colors.statusSuccess}
            icon={<Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />}
          />
        </View>

        {/* Transfer + Withdraw row */}
        <View style={styles.btnRow}>
          <PrimaryButton
            label="Transfer"
            onPress={() => {
              history.push("/(tabs)/wallet");
              router.push("/(tabs)/transfer");
            }}
            style={styles.btnHalf}
            color={Colors.statusInfo}
            icon={<Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />}
          />
          <PrimaryButton
            label="Withdraw"
            onPress={() => {
              history.push("/(tabs)/wallet");
              router.push("/(tabs)/withdraw");
            }}
            style={styles.btnHalf}
            color={Colors.actionPrimary}
            icon={<Ionicons name="cash-outline" size={18} color="#FFFFFF" />}
          />
        </View>

        {/* Recent Transactions */}
        <View style={styles.txSection}>
          <View style={styles.txHeader}>
            <Ionicons name="time-outline" size={16} color={Colors.actionPrimary} />
            <Text style={styles.txHeaderText}>Recent Transactions</Text>
          </View>

          {transactions === undefined ? (
            <ActivityIndicator color={Colors.actionPrimary} style={{ marginTop: 24 }} />
          ) : (transactions as any[]).length === 0 ? (
            <EmptyStateCard
              icon="receipt-outline"
              title="No transactions yet"
              subtitle="Your transaction history will appear here"
            />
          ) : (
            (transactions as any[]).map((tx) => {
              const txColor = TX_COLOR[tx.type] ?? Colors.textMuted;
              const txBg    = TX_ICON_BG[tx.type] ?? Colors.bgElevated;
              const txIcon  = TX_ICON[tx.type] ?? "swap-horizontal";
              const sign    = tx.type === "deposit" ? "+" : "-";
              const counterparty = tx.isIncoming
                ? (tx.fromUser?.username ? `From: @${tx.fromUser.username}` : undefined)
                : (tx.toUser?.username   ? `To: @${tx.toUser.username}`     : undefined);

              return (
                <TransactionCard
                  key={tx._id}
                  icon={txIcon}
                  iconColor={txColor}
                  iconBg={txBg}
                  title={tx.description}
                  subtitle={counterparty}
                  timestamp={formatDate(tx.createdAt)}
                  amount={`${sign}${formatAmount(tx.amount, tx.currency)}`}
                  amountColor={txColor}
                  status={tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  statusColor={tx.status === "completed" ? Colors.statusSuccess : Colors.statusWarning}
                  statusBg={tx.status === "completed" ? Colors.statusSuccessBg : Colors.statusWarningBg}
                />
              );
            })
          )}
        </View>
        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },
  cardOverride: { paddingBottom: spacing.space4 },

  // Currency dropdown
  dropdownWrap: {
    paddingHorizontal: spacing.space4,
    marginBottom: spacing.space4,
    zIndex: 10,
  },
  dropdownLabel: {
    ...typeScale.caption,
    color: Colors.textMuted,
    fontWeight: "500",
    marginBottom: 6,
  },
  dropdownBtn: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5, borderColor: Colors.borderDefault,
    borderRadius: 12, paddingHorizontal: spacing.space4, paddingVertical: 12,
  },
  dropdownBtnText: {
    ...typeScale.labelMD,
    color: Colors.textSecondary,
  },
  dropdownList: {
    position: "absolute", top: 72, left: 0, right: 0,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1, borderColor: Colors.borderDefault,
    borderRadius: 12, overflow: "hidden",
    zIndex: 100,
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

  // Title
  titleBlock: {
    alignItems: "center",
    paddingTop: 56, paddingBottom: spacing.space6,
  },
  pageTitle: {
    ...typeScale.headingXL,
    color: Colors.textPrimary,
  },
  pageSubtitle: {
    ...typeScale.bodyMD,
    color: Colors.textMuted, marginTop: 4,
  },

  // Balance card
  balanceCard: {
    marginHorizontal: spacing.space4, marginBottom: spacing.space5,
    backgroundColor: Colors.bgElevated,
    borderRadius: 20,
    borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: spacing.space4, gap: 10,
  },
  balanceCardLabel: {
    ...typeScale.bodySM,
    color: Colors.textMuted, fontWeight: "500", marginBottom: 4,
  },
  balanceTile: {
    backgroundColor: TILE_BG,
    borderRadius: 12,
    borderWidth: 1, borderColor: TILE_BORDER,
    paddingHorizontal: spacing.space4, paddingVertical: 14,
  },
  tileCurrencyName: {
    ...typeScale.bodySM,
    color: Colors.textMuted, fontWeight: "500", marginBottom: 6,
  },
  tileAmount: {
    ...typeScale.displayLarge,
    color: Colors.textPrimary,
  },

  // Buttons
  btnWrap: {
    marginHorizontal: spacing.space4, marginBottom: spacing.space3,
  },
  btnRow: {
    flexDirection: "row", gap: spacing.space3,
    marginHorizontal: spacing.space4, marginBottom: spacing.space3,
  },
  btnHalf: { flex: 1 },

  // Transactions
  txSection: { paddingHorizontal: spacing.space4, marginTop: spacing.space2 },
  txHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 6, marginBottom: spacing.space3,
  },
  txHeaderText: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
  },
});
