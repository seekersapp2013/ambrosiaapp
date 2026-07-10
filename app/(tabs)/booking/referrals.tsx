/**
 * referrals.tsx
 * Route: /(tabs)/booking/referrals
 *
 * Tab 1 (everyone):  "My Referrals"      → PatientReferralsList
 * Tab 2 (providers): "Referral Mgmt"     → ExpertReferralsList
 *
 * Providers also get a "Create Referral" FAB that opens the
 * StandaloneReferralCreationForm in a BottomSheet — no completed
 * booking required.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PatientReferralsList } from "@/components/booking/PatientReferralsList";
import { ExpertReferralsList } from "@/components/booking/ExpertReferralsList";
import { StandaloneReferralCreationForm } from "@/components/booking/StandaloneReferralCreationForm";

type TabKey = "patient" | "expert";

export default function ReferralsScreen() {
  const router = useRouter();
  const C = useColors();
  const [activeTab,       setActiveTab]       = useState<TabKey>("patient");
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [createSuccess,   setCreateSuccess]   = useState(false);

  const subscription = useQuery(api.bookingSubscribers.getMySubscription, {});
  const isProvider   = !!subscription?.isActive;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "patient", label: "My Referrals" },
    ...(isProvider ? [{ key: "expert" as TabKey, label: "Referral Mgmt" }] : []),
  ];

  function handleCreateSuccess() {
    setShowCreateSheet(false);
    setCreateSuccess(true);
    // Switch to Referral Mgmt tab so provider sees the new referral
    if (isProvider) setActiveTab("expert");
    setTimeout(() => setCreateSuccess(false), 3000);
  }

  return (
    <AppBackground>
      <ScreenHeader
        title="Referrals"
        onBack={() => router.replace("/(tabs)/booking" as any)}
        trailing={
          isProvider ? (
            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => setShowCreateSheet(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Create a new referral"
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.createBtnText} allowFontScaling={false}>New</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Success banner */}
        {createSuccess && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={16} color={Colors.statusSuccess} />
            <Text style={styles.successBannerText} allowFontScaling={false}>
              Referral sent! The patient has been notified.
            </Text>
          </View>
        )}

        <MobileCard>
          {/* Tab bar */}
          <View style={[styles.tabBar, { borderBottomColor: C.borderSubtle }]}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, active && { borderBottomColor: C.actionPrimary }]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[styles.tabText, { color: C.textMuted }, active && { color: C.actionPrimary, fontWeight: "700" }]}
                    allowFontScaling={false}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Content */}
          {activeTab === "patient" && <PatientReferralsList />}
          {activeTab === "expert"  && isProvider && <ExpertReferralsList />}
        </MobileCard>
      </ScrollView>

      {/* ── Standalone referral creation sheet ─────────────────────── */}
      <BottomSheet
        visible={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title="Create Referral"
      >
        <StandaloneReferralCreationForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateSheet(false)}
        />
      </BottomSheet>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },

  // Create button in header
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.actionPrimary,
  },
  createBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },

  // Success banner
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    backgroundColor: Colors.statusSuccessBg,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.greenBorder,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
    marginBottom: spacing.space3,
  },
  successBannerText: {
    ...typeScale.bodySM,
    color: Colors.statusSuccess,
    flex: 1,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: spacing.space3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.space3,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { ...typeScale.labelSM },
});
