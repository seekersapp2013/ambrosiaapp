/**
 * referrals.tsx
 * Route: /(tabs)/booking/referrals
 *
 * Tab 1 (everyone):  "My Referrals"      → PatientReferralsList
 * Tab 2 (providers): "Referral Mgmt"     → ExpertReferralsList
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
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PatientReferralsList } from "@/components/booking/PatientReferralsList";
import { ExpertReferralsList } from "@/components/booking/ExpertReferralsList";

type TabKey = "patient" | "expert";

export default function ReferralsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("patient");

  const subscription = useQuery(api.bookingSubscribers.getMySubscription, {});
  const isProvider   = !!subscription?.isActive;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "patient", label: "My Referrals" },
    ...(isProvider ? [{ key: "expert" as TabKey, label: "Referral Mgmt" }] : []),
  ];

  return (
    <AppBackground>
      <ScreenHeader
        title="Referrals"
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <MobileCard>
          {/* Tab bar */}
          <View style={styles.tabBar}>
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text
                    style={[styles.tabText, active && styles.tabTextActive]}
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
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: spacing.space3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.space3,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: Colors.actionPrimary },
  tabText: { ...typeScale.labelSM, color: Colors.textMuted },
  tabTextActive: { color: Colors.actionPrimary, fontWeight: "700" },
});
