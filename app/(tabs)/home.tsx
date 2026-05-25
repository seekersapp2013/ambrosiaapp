import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import {
  ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, StyleSheet, View as RNView,
} from "react-native";
import { View, Text, H1 } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect } from "react";
import { decrypt } from "@/utils/encryption";
import * as Clipboard from "expo-clipboard";
import { verifyPin } from "@/utils/pinHash";
import { AppLogo } from "@/components/AppLogo";
import { Colors } from "@/constants/Colors";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { useRouter } from "expo-router";
import { NotificationBanner } from "./notification/NotificationBanner";

export default function HomeScreen() {
  const router = useRouter();
  const viewer = useQuery(api.users.viewer);
  const recentUnread = useQuery(api.notifications.getRecentUnreadNotifications, { limit: 5 });
  const unreadCount  = useQuery(api.notifications.getUnreadCount);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [decryptedPrivateKey, setDecryptedPrivateKey] = useState("");
  const [decryptedMnemonic, setDecryptedMnemonic] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [showPinModal, setShowPinModal] = useState(false);

  useEffect(() => {
    if (viewer) {
      if (viewer.walletPrivateKey) {
        try { setDecryptedPrivateKey(decrypt(viewer.walletPrivateKey)); } catch {}
      }
      if (viewer.walletMnemonic) {
        try { setDecryptedMnemonic(decrypt(viewer.walletMnemonic)); } catch {}
      }
    }
  }, [viewer]);

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", `${label} copied to clipboard`);
  };

  const toggleWalletDetails = () => {
    if (!showWalletDetails) {
      setPinInput("");
      setShowPinModal(true);
    } else {
      setShowWalletDetails(false);
    }
  };

  const handlePinSubmit = () => {
    if (!viewer?.transactionPin) {
      Alert.alert("Error", "No PIN found for this account");
      setShowPinModal(false);
      return;
    }
    if (pinInput.length !== 4) {
      Alert.alert("Invalid PIN", "Please enter a 4-digit PIN");
      return;
    }
    if (verifyPin(pinInput, viewer.transactionPin)) {
      setShowWalletDetails(true);
      setShowPinModal(false);
      setPinInput("");
    } else {
      Alert.alert("Incorrect PIN", "The PIN you entered is incorrect. Please try again.");
      setPinInput("");
    }
  };

  return (
    <AppBackground>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <MobileCard>
        {/* ── Header ── */}
        <View
          backgroundColor={Colors.surface}
          borderBottomWidth={1}
          borderBottomColor={Colors.redBorder}
          paddingVertical="$3"
          paddingHorizontal="$4"
        >
          <View flexDirection="row" alignItems="center" gap="$3">
            <AppLogo size={40} showGlow />
            <View flex={1}>
              <H1 color={Colors.textPrimary} fontSize={20} fontWeight="700">
                Ambrosia
              </H1>
              <Text color={Colors.textMuted} fontSize={11} lineHeight={14}>
                A Safe Haven For Health Information
              </Text>
              <Text color={Colors.textDim} fontSize={12}>
                {viewer?.displayName || viewer?.email}
              </Text>
            </View>
            {/* Notification bell */}
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/notification")}
              style={styles.bellBtn}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color={Colors.textSecondary} />
              {(unreadCount ?? 0) > 0 && (
                <RNView style={styles.bellBadge}>
                  <Text color="#fff" fontSize={9} fontWeight="700">
                    {(unreadCount ?? 0) > 99 ? "99+" : unreadCount}
                  </Text>
                </RNView>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Notification Banner ── */}
        {recentUnread && recentUnread.length > 0 && (
          <NotificationBanner
            notifications={recentUnread}
            onNotificationClick={(id) =>
              router.push({ pathname: "/(tabs)/notification", params: { highlightId: id } })
            }
            onNotificationDismiss={() => {}}
            onDismiss={() => router.push("/(tabs)/notification")}
          />
        )}

        {/* ── Content ── */}
        <View padding="$4">

          {/* Welcome Card — blue tint */}
          <View style={styles.welcomeCard} marginBottom="$3">
            <View style={styles.welcomeCardAccent} />
            <Text color={Colors.textPrimary} fontSize={18} fontWeight="700" marginBottom="$2">
              Welcome back!
            </Text>
            <Text color={Colors.textSecondary} fontSize={14} lineHeight={20} marginBottom="$2">
              You're successfully signed in. Your dashboard and health tools will appear here.
            </Text>

            {viewer?.phone && (
              <View marginBottom="$2">
                <Text color={Colors.textMuted} fontSize={13}>
                  Phone: <Text color={Colors.textSecondary}>{viewer.phone}</Text>
                </Text>
              </View>
            )}

            {viewer?.username && (
              <View marginBottom="$2">
                <Text color={Colors.textMuted} fontSize={13}>
                  Username: <Text color={Colors.textSecondary}>{viewer.username}</Text>
                </Text>
              </View>
            )}

            {viewer?.interests && viewer.interests.length > 0 && (
              <View>
                <Text color={Colors.textMuted} fontSize={13} marginBottom="$2">
                  Your Interests:
                </Text>
                <View flexDirection="row" flexWrap="wrap" gap="$2">
                  {viewer.interests.map((interest) => (
                    <View key={interest} style={styles.interestTag}>
                      <Text color={Colors.primaryCoral} fontSize={12} fontWeight="500">
                        {interest}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Wallet Card — red/gold tint */}
          {viewer?.walletAddress && (
            <View style={styles.walletCard} marginBottom="$3">
              <View style={styles.walletCardAccent} />

              <View flexDirection="row" alignItems="center" gap="$2" marginBottom="$3">
                <View style={styles.walletIconBadge}>
                  <Ionicons name="wallet" size={18} color={Colors.primaryGold} />
                </View>
                <Text color={Colors.textPrimary} fontSize={17} fontWeight="700">
                  Wallet Information
                </Text>
              </View>

              {/* Wallet Address */}
              <View style={styles.fieldRow} marginBottom="$3">
                <View flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={4}>
                  <Text color={Colors.textMuted} fontSize={12} fontWeight="600" style={styles.fieldLabel}>
                    WALLET ADDRESS
                  </Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(viewer.walletAddress!, "Wallet Address")}
                    style={styles.copyBtn}
                  >
                    <Ionicons name="copy-outline" size={14} color={Colors.blue} />
                    <Text color={Colors.blue} fontSize={11} fontWeight="600">Copy</Text>
                  </TouchableOpacity>
                </View>
                <Text color={Colors.textSecondary} fontSize={12} numberOfLines={1} ellipsizeMode="middle">
                  {viewer.walletAddress}
                </Text>
              </View>

              {/* Private Key */}
              <View style={styles.fieldRow} marginBottom="$3">
                <View flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={4}>
                  <Text color={Colors.textMuted} fontSize={12} fontWeight="600" style={styles.fieldLabel}>
                    PRIVATE KEY
                  </Text>
                  {decryptedPrivateKey && showWalletDetails && (
                    <TouchableOpacity
                      onPress={() => copyToClipboard(decryptedPrivateKey, "Private Key")}
                      style={styles.copyBtn}
                    >
                      <Ionicons name="copy-outline" size={14} color={Colors.blue} />
                      <Text color={Colors.blue} fontSize={11} fontWeight="600">Copy</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text color={Colors.textSecondary} fontSize={12} numberOfLines={1} ellipsizeMode="middle">
                  {showWalletDetails && decryptedPrivateKey ? decryptedPrivateKey : "••••••••••••••••"}
                </Text>
              </View>

              {/* Recovery Phrase */}
              <View style={styles.fieldRow} marginBottom="$3">
                <View flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={4}>
                  <Text color={Colors.textMuted} fontSize={12} fontWeight="600" style={styles.fieldLabel}>
                    RECOVERY PHRASE
                  </Text>
                  {decryptedMnemonic && showWalletDetails && (
                    <TouchableOpacity
                      onPress={() => copyToClipboard(decryptedMnemonic, "Recovery Phrase")}
                      style={styles.copyBtn}
                    >
                      <Ionicons name="copy-outline" size={14} color={Colors.blue} />
                      <Text color={Colors.blue} fontSize={11} fontWeight="600">Copy</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text color={Colors.textSecondary} fontSize={11} numberOfLines={showWalletDetails ? undefined : 2}>
                  {showWalletDetails && decryptedMnemonic
                    ? decryptedMnemonic
                    : "•••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••"}
                </Text>
              </View>

              {/* Reveal Button */}
              <TouchableOpacity onPress={toggleWalletDetails} style={styles.revealButton}>
                <Ionicons
                  name={showWalletDetails ? "eye-off-outline" : "eye-outline"}
                  size={16}
                  color={Colors.primary}
                />
                <Text color={Colors.primary} fontSize={14} fontWeight="600" marginLeft={8}>
                  {showWalletDetails ? "Hide Sensitive Details" : "Reveal Sensitive Details"}
                </Text>
              </TouchableOpacity>

              {/* Security Notice */}
              <View style={styles.securityNotice}>
                <Ionicons name="shield-checkmark-outline" size={15} color={Colors.primaryGold} />
                <Text color={Colors.textSecondary} fontSize={11} lineHeight={16} flex={1} marginLeft={8}>
                  Wallet details are encrypted and cannot be changed after creation
                </Text>
              </View>
            </View>
          )}
        </View>
        </MobileCard>
      </ScrollView>

      {/* ── PIN Modal ── */}
      <Modal visible={showPinModal} transparent animationType="fade" onRequestClose={() => setShowPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Your PIN</Text>
            <Text style={styles.modalSubtitle}>
              Enter your 4-digit transaction PIN to reveal sensitive wallet details
            </Text>
            <TextInput
              style={styles.pinInput}
              value={pinInput}
              onChangeText={(text) => setPinInput(text.replace(/[^0-9]/g, "").slice(0, 4))}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor={Colors.textFaint}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => { setShowPinModal(false); setPinInput(""); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handlePinSubmit}
                disabled={pinInput.length !== 4}
              >
                <Text style={styles.modalConfirmText}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  // Welcome card — blue accent
  welcomeCard: {
    backgroundColor: Colors.blueSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
    padding: 20,
    overflow: "hidden",
    position: "relative",
  },
  welcomeCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.blue,
    opacity: 0.6,
  },

  // Interest tags — coral
  interestTag: {
    backgroundColor: "rgba(215,93,100,0.12)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(215,93,100,0.3)",
  },

  // Wallet card — red/gold accent
  walletCard: {
    backgroundColor: Colors.redSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    padding: 20,
    overflow: "hidden",
    position: "relative",
  },
  walletCardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primaryGold,
    opacity: 0.7,
  },
  walletIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.goldSurface,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  // Field rows
  fieldRow: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  fieldLabel: {
    letterSpacing: 0.6,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.blueSurface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.blueBorder,
  },

  // Reveal button
  revealButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: Colors.redSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.redBorderActive,
    marginBottom: 12,
  },

  // Security notice — gold
  securityNotice: {
    backgroundColor: Colors.goldSurface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: Colors.redBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  pinInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.redBorder,
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: Colors.textPrimary,
    textAlign: "center",
    letterSpacing: 8,
    marginBottom: 24,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center" },
  modalCancelButton: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.borderNeutral,
  },
  modalCancelText: { color: Colors.textSecondary, fontSize: 15, fontWeight: "600" },
  modalConfirmButton: { backgroundColor: Colors.primary },
  modalConfirmText: { color: Colors.textPrimary, fontSize: 15, fontWeight: "600" },

  // Notification bell
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
});
