/**
 * AuthScaffold — shared chrome for auth & registration screens (v2 "Navy Health").
 *
 * Per brand-design-guide Phase 8/9:
 *   - navy gradient background (#011B45 → #001233)
 *   - a photographic header band (doctor photo) with the red Ambrosia logo + tagline
 *   - scrollable content area below for the form
 *
 * The header image bleeds to the top edge; the logo sits over the lower-left of it.
 * Keyboard-aware scroll so inputs aren't hidden.
 *
 * Usage:
 *   <AuthScaffold>
 *     <SignInForm />
 *   </AuthScaffold>
 *
 *   // custom header height / hide the photo:
 *   <AuthScaffold headerHeight={220} showHeaderImage>
 *     ...
 *   </AuthScaffold>
 */

import React from "react";
import {
  View,
  Image,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StyleProp,
  ViewStyle,
  ImageSourcePropType,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { spacing } from "@/tokens/spacing";

// Red logo + wordmark + tagline used across auth/registration (navy backgrounds).
const RED_LOGO = require("@/assets/images/logo.png");

interface AuthScaffoldProps {
  children: React.ReactNode;
  /** Optional photographic header image. If omitted, only the logo band shows. */
  headerImage?: ImageSourcePropType;
  /** Show the red logo band. Default true. */
  showLogo?: boolean;
  /** How the logo aligns in its band. Default 'left'. */
  logoAlign?: "left" | "center";
  headerHeight?: number;
  logoWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
}

export function AuthScaffold({
  children,
  headerImage,
  showLogo = true,
  logoAlign = "left",
  headerHeight = 200,
  logoWidth = 150,
  contentStyle,
  scrollable = true,
}: AuthScaffoldProps) {
  const C = useColors();
  const insets = useSafeAreaInsets();

  const Header = (
    <View
      style={[
        styles.headerWrap,
        { minHeight: headerImage ? headerHeight : undefined, paddingTop: insets.top },
      ]}
    >
      {headerImage && (
        <>
          <Image source={headerImage} style={styles.headerImage} resizeMode="cover" />
          <LinearGradient
            colors={["transparent", C.palette.navyBase]}
            style={styles.headerFade}
            pointerEvents="none"
          />
        </>
      )}
      {showLogo && (
        <View
          style={[
            styles.logoWrap,
            logoAlign === "center" && styles.logoWrapCenter,
          ]}
        >
          <Image
            source={RED_LOGO}
            style={{ width: logoWidth, height: logoWidth * 0.55 }}
            resizeMode="contain"
            accessibilityLabel="Ambrosia"
          />
        </View>
      )}
    </View>
  );

  const Content = (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  const body = scrollable ? (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + spacing.space12 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {Header}
      {Content}
    </ScrollView>
  ) : (
    <View style={styles.flex}>
      {Header}
      {Content}
    </View>
  );

  return (
    <LinearGradient
      colors={C.palette.gradientBackground as string[]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.root}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {body}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerWrap: {
    width: "100%",
    position: "relative",
    justifyContent: "flex-end",
  },
  headerImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  headerFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  logoWrap: {
    paddingHorizontal: spacing.space4,
    paddingVertical: spacing.space4,
  },
  logoWrapCenter: {
    alignItems: "center",
  },
  content: {
    paddingHorizontal: spacing.space4,
    paddingTop: spacing.space4,
  },
});
