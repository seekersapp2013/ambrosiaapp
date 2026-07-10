import React, { useState } from "react";
import {
  View,
  Text,
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
import { ProviderSubscriptionForm } from "@/components/booking/ProviderSubscriptionForm";

// ─── What's Next checklist items ─────────────────────────────────────────────
const WHATS_NEXT = [
  { icon: "checkmark-circle-outline" as const, text: "Your provider profile is now live and discoverable." },
  { icon: "calendar-outline"          as const, text: "Clients can browse your availability and book sessions." },
  { icon: "wallet-outline"            as const, text: "Payments are deposited to your wallet after each session." },
  { icon: "settings-outline"          as const, text: "Head to Booking Settings to configure confirmation mode and buffer times." },
  { icon: "people-outline"            as const, text: "Create events to host group sessions with multiple clients." },
  { icon: "git-network-outline"       as const, text: "Refer clients to other providers and earn a 10% commission." },
];

export default function BecomeProviderScreen() {
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  const mySubscription = useQuery(api.bookingSubscribers.getMySubscription);
  const isEditing      = !!mySubscription;

  const headerTitle = isEditing ? "Edit Provider Profile" : "Become a Provider";

  if (showSuccess) {
    return (
      <AppBackground>
        <ScreenHeader
          title="All set!"
          onBack={() => router.push("/(tabs)/booking" as any)}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <MobileCard>
            {/* Success hero */}
            <View style={styles.successHero}>
              <View style={styles.successIconCircle}>
                <Ionicons name="ribbon" size={52} color={Colors.actionPrimary} />
              </View>
              <Text style={styles.successTitle} allowFontScaling={false}>
                {isEditing ? "Profile Updated!" : "You're now a Provider!"}
              </Text>
              <Text style={styles.successSubtitle} allowFontScaling={false}>
                {isEditing
                  ? "Your provider profile has been updated successfully."
                  : "Your profile is live. Clients can now find and book sessions with you."}
              </Text>
            </View>

            {/* What's next checklist */}
            {!isEditing && (
              <View style={styles.whatsNextCard}>
                <Text style={styles.whatsNextTitle} allowFontScaling={false}>
                  What's Next
                </Text>
                {WHATS_NEXT.map((item, i) => (
                  <View key={i} style={styles.checklistRow}>
                    <View style={styles.checklistIconWrap}>
                      <Ionicons name={item.icon} size={16} color={Colors.actionPrimary} />
                    </View>
                    <Text style={styles.checklistText} allowFontScaling={false}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* CTA buttons */}
            <View style={styles.ctaBtns}>
              <PrimaryButton
                label="Go to My Bookings"
                onPress={() => router.push("/(tabs)/booking" as any)}
                icon={<Ionicons name="calendar-outline" size={18} color="#FFFFFF" />}
                accessibilityLabel="Go to booking hub"
              />
              {!isEditing && (
                <PrimaryButton
                  label="Configure Settings"
                  onPress={() => router.push("/(tabs)/booking/settings" as any)}
                  icon={<Ionicons name="settings-outline" size={18} color="#FFFFFF" />}
                  color={Colors.statusInfo}
                  style={styles.settingsBtn}
                  accessibilityLabel="Open booking settings"
                />
              )}
            </View>
          </MobileCard>
        </ScrollView>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <ScreenHeader
        title={headerTitle}
        onBack={() => router.replace("/(tabs)/booking" as any)}
      />

      {/* Single screen-level ScrollView — form content renders flat inside MobileCard */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <MobileCard>
          {/* Intro strip — only shown for new providers */}
          {!isEditing && (
            <View style={styles.introStrip}>
              <View style={styles.introIconWrap}>
                <Ionicons name="ribbon-outline" size={28} color={Colors.actionPrimary} />
              </View>
              <View style={styles.introText}>
                <Text style={styles.introTitle} allowFontScaling={false}>
                  Share your expertise
                </Text>
                <Text style={styles.introSubtitle} allowFontScaling={false}>
                  Set your schedule, pricing, and profile — then start accepting bookings.
                </Text>
              </View>
            </View>
          )}

          <ProviderSubscriptionForm
            onSuccess={() => setShowSuccess(true)}
            onCancel={() => router.back()}
          />
        </MobileCard>
      </ScrollView>
    </AppBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: { paddingBottom: spacing.scrollBottomPadding },

  // Intro strip
  introStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space4,
    padding: spacing.space4,
    backgroundColor: Colors.bgPrimarySubtle,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderFilled,
  },
  introIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.radiusMD,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  introText: { flex: 1, gap: 3 },
  introTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  introSubtitle: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    lineHeight: 18,
  },

  // Success hero
  successHero: {
    alignItems: "center",
    paddingTop: spacing.space8,
    paddingBottom: spacing.space6,
    paddingHorizontal: spacing.space4,
    gap: spacing.space3,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 2,
    borderColor: Colors.borderFilled,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.space2,
  },
  successTitle: {
    ...typeScale.headingLG,
    color: Colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  successSubtitle: {
    ...typeScale.bodyMD,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },

  // What's next
  whatsNextCard: {
    marginHorizontal: spacing.space4,
    marginBottom: spacing.space5,
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    gap: spacing.space3,
  },
  whatsNextTitle: {
    ...typeScale.headingSM,
    color: Colors.textPrimary,
    fontWeight: "700",
    marginBottom: spacing.space2,
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
  },
  checklistIconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.radiusSM,
    backgroundColor: Colors.bgPrimaryMid,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checklistText: {
    ...typeScale.bodySM,
    color: Colors.textMuted,
    flex: 1,
    lineHeight: 18,
  },

  // CTA buttons
  ctaBtns: {
    paddingHorizontal: spacing.space4,
    paddingBottom: spacing.space6,
    gap: spacing.space3,
  },
  settingsBtn: { marginTop: spacing.space1 },
});
