/**
 * Password — Sign-in entry point (v2 "Navy Health").
 *
 * Sign-in mode uses loginbg1.png as a full-bleed background image
 * (logo + doctor photo baked in) with Email + Password + "Sign in" CTA
 * floating on top. The form sits in the lower portion over navy.
 *
 * Sign-up mode (role selector → wizard) provides its own full-screen
 * chrome, so render it directly.
 */

import React, { useState } from "react";
import {
  View,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SignInWithPassword } from "./SignInWithPassword";
import { spacing } from "@/tokens/spacing";

const LOGIN_BG = require("@/assets/images/loginbg1.png");

export function Password() {
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const insets = useSafeAreaInsets();

  // Sign-up (role selector + wizard) provides its own full-screen chrome.
  if (flow === "signUp") {
    return <SignInWithPassword flow={flow} onFlowChange={setFlow} />;
  }

  return (
    <ImageBackground
      source={LOGIN_BG}
      style={styles.bg}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.space12 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Spacer — push the form below the baked-in header image area.
              ~45% of screen height gives room for the logo + doctor photo. */}
          <View style={styles.headerSpacer} />

          {/* Form area */}
          <View style={styles.formArea}>
            <SignInWithPassword flow={flow} onFlowChange={setFlow} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#001233",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerSpacer: {
    // Push form below the baked-in logo + doctor photo (~45% of screen)
    height: "42%",
  },
  formArea: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space4,
  },
});
