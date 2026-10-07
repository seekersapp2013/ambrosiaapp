/**
 * GuestAuthModal
 * Non-intrusive prompt modal shown when an unauthenticated guest user
 * attempts to interact with engagement actions (like, clap, comment, bookmark, ask question).
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";

interface GuestAuthModalProps {
  visible: boolean;
  onClose: () => void;
  actionName?: string;
}

export function GuestAuthModal({
  visible,
  onClose,
  actionName = "engage",
}: GuestAuthModalProps) {
  const router = useRouter();
  const C = useColors();

  const handleSignIn = () => {
    onClose();
    router.push("/");
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      variant="dialog"
      title="Sign in to interact"
    >
      <View style={styles.container}>
        <View style={[styles.iconWrap, { backgroundColor: C.isDark ? "rgba(198,34,41,0.15)" : "rgba(198,34,41,0.10)" }]}>
          <Ionicons name="lock-closed" size={32} color={C.actionPrimary} />
        </View>

        <Text style={[styles.title, { color: C.textPrimary }]}>
          Join Ambrosia to {actionName}
        </Text>

        <Text style={[styles.description, { color: C.textSecondary }]}>
          Create a free account or sign in to {actionName}, follow creators, and participate in conversations.
        </Text>

        <View style={styles.buttonGroup}>
          <PrimaryButton label="Sign In / Register" onPress={handleSignIn} />
          <SecondaryButton label="Maybe Later" onPress={onClose} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.space4,
    gap: spacing.space3,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.space2,
  },
  title: {
    ...typeScale.headingMD,
    textAlign: "center",
    fontWeight: "700",
  },
  description: {
    ...typeScale.bodyMD,
    textAlign: "center",
    paddingHorizontal: spacing.space3,
    lineHeight: 22,
  },
  buttonGroup: {
    width: "100%",
    gap: spacing.space2,
    marginTop: spacing.space3,
  },
});
