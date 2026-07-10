/**
 * settings.tsx  —  Provider Settings
 * Reached via the gear icon on My Sessions.
 *
 * Tab 1 — Profile:  job title · work hours · pricing · bio · social links
 *                   (ProviderSubscriptionForm with updateSubscriber)
 * Tab 2 — Bookings: confirmation type · buffer time · cancellation policy
 *                   (BookingSettingsForm)
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
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";
import { AppBackground } from "@/components/AppBackground";
import { MobileCard } from "@/components/MobileCard";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { PrimaryButton } from "@/components/ui/Button";
import { BookingSettingsForm } from "@/components/booking/BookingSettingsForm";
import { ProviderSubscriptionForm } from "@/components/booking/ProviderSubscriptionForm";

type TabKey = "profile" | "bookings";

const TABS: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "profile",  label: "Profile",          icon: "person-circle-outline" },
  { key: "bookings", label: "Booking Settings",  icon: "calendar-outline" },
];

export default function ProviderSettingsScreen() {
  const router       = useRouter();
  const subscription = useQuery(api.bookingSubscribers.getMySubscription);
  const isProvider   = !!subscription?.isActive;

  const [activeTab,   setActiveTab]   = useState<TabKey>("profile");
  const [savedBanner, setSavedBanner] = useState(false);

  function showSaved() {
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  }

  // ── Not-a-provider gate ────────────────────────────────────────────────────
  if (subscription !== undefined && !isProvider) {
    return (
      <AppBackground>
        <ScreenHeader title="Provider Settings" onBack={() => router.replace("/(tabs)/booking" as any)} />
        <MobileCard>
          <View style={styles.gateWrap}>
            <View style={styles.gateIconWrap}>
              <Ionicons name="settings-outline" size={44} color={Colors.iconSecondary} />
            </View>
            <Text style={styles.gateTitle} allowFontScaling={false}>
              Provider Account Required
            </Text>
            <Text style={styles.gateSub} allowFontScaling={false}>
              Provider settings are only available once you have an active provider profile.
            </Text>
            <PrimaryButton
              label="Become a Provider"
              onPress={() => router.push("/(tabs)/booking/become-provider" as any)}
              icon={<Ionicons name="ribbon-outline" size={18} color="#FFF" />}
              style={{ marginTop: spacing.space3, width: "100%" }}
              accessibilityLabel="Set up your provider profile"
            />
          </View>
        </MobileCard>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScreenHeader title="Provider Settings" onBack={() => router.replace("/(tabs)/booking" as any)} />

      {/* ── Saved banner ─────────────────────────────────────────── */}
      {savedBanner && (
        <View style={styles.savedBanner}>
          <Ionicons name="checkmark-circle-outline" size={16} color={Colors.statusSuccess} />
          <Text style={styles.savedBannerText} allowFontScaling={false}>
            Changes saved successfully
          </Text>
        </View>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, active && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={active ? Colors.actionPrimary : Colors.iconDisabled}
              />
              <Text
                style={[styles.tabLabel, active && styles.tabLabelActive]}
                allowFontScaling={false}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ──────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <MobileCard>

          {/* ── Profile tab ──────────────────────────────────────── */}
          {activeTab === "profile" && (
            <>
              <View style={styles.sectionIntro}>
                <Ionicons name="person-circle-outline" size={20} color={Colors.actionPrimary} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.sectionIntroTitle} allowFontScaling={false}>
                    Provider Profile
                  </Text>
                  <Text style={styles.sectionIntroSub} allowFontScaling={false}>
                    Update your work hours, pricing, bio and social links.
                  </Text>
                </View>
              </View>

              <ProviderSubscriptionForm
                onSuccess={showSaved}
                onCancel={() => router.back()}
              />
            </>
          )}

          {/* ── Booking settings tab ─────────────────────────────── */}
          {activeTab === "bookings" && (
            <>
              <View style={styles.sectionIntro}>
                <Ionicons name="calendar-outline" size={20} color={Colors.actionPrimary} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.sectionIntroTitle} allowFontScaling={false}>
                    Booking Settings
                  </Text>
                  <Text style={styles.sectionIntroSub} allowFontScaling={false}>
                    Confirmation type, buffer time, cancellation policy and session instructions.
                  </Text>
                </View>
              </View>

              <BookingSettingsForm onSaved={showSaved} />
            </>
          )}

        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },

  // Saved banner
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    backgroundColor: Colors.statusSuccessBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.statusSuccess,
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space3,
  },
  savedBannerText: {
    ...typeScale.labelSM,
    color: Colors.statusSuccess,
    fontWeight: "600",
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: Colors.bgBase,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingHorizontal: spacing.space2,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.space3,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {
    borderBottomColor: Colors.actionPrimary,
  },
  tabLabel: {
    ...typeScale.labelSM,
    color: Colors.iconDisabled,
    fontSize: 12,
  },
  tabLabelActive: {
    color: Colors.actionPrimary,
    fontWeight: "600",
  },

  // Section intro
  sectionIntro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space5,
    paddingBottom: spacing.space4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    marginBottom: spacing.space2,
  },
  sectionIntroTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  sectionIntroSub: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  // Provider gate
  gateWrap: {
    alignItems: "center",
    paddingVertical: spacing.space10,
    paddingHorizontal: spacing.space6,
    gap: spacing.space3,
  },
  gateIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.space2,
  },
  gateTitle: {
    ...typeScale.headingMD,
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  gateSub: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
});
