/**
 * Onboarding (v2 "Navy Health")
 *
 * Three full-bleed slides using onboardingbg1/2/3.png as backgrounds, with
 * the white logo and caption text overlaid as separate layers (flexible across
 * device sizes, text stays crisp/translatable).
 *
 * Chrome:
 *   - Skip (top-right) — hidden on the last slide
 *   - 3-segment progress indicator (active color: red → amber → green by slide)
 *   - Back / Next, and Back / Start on the final slide
 *
 * On Skip or Start the first-launch flag is persisted and the user routes
 * to the sign-in screen.
 */

import React, { useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Image,
  ImageBackground,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ImageSourcePropType,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { markOnboardingSeen } from "@/utils/appStorage";
import { fontFamily } from "@/tokens/typography";
import { radius } from "@/tokens/radius";

// ─── Assets ───────────────────────────────────────────────────────────────────
const LOGO_WHITE = require("@/assets/images/logo-white.png");

interface Slide {
  key: string;
  bg: ImageSourcePropType;
  caption: string;
  /** Active-indicator color for this slide (red → amber → green). */
  accent: string;
}

const SLIDES: Slide[] = [
  {
    key: "s1",
    bg: require("@/assets/images/onboardingbg1.png"),
    caption: "Your health is a collective\neffort but yours especially",
    accent: "#D60A1D",
  },
  {
    key: "s2",
    bg: require("@/assets/images/onboardingbg2.png"),
    caption: "Parenting and childcare\nis a healthy choice",
    accent: "#F59E0B",
  },
  {
    key: "s3",
    bg: require("@/assets/images/onboardingbg3.png"),
    caption: "Taking care of your health\nshould be a top priority",
    accent: "#00E600",
  },
];

export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const finish = useCallback(async () => {
    await markOnboardingSeen();
    router.replace("/");
  }, [router]);

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
      setIndex(clamped);
    },
    []
  );

  const onNext = useCallback(() => {
    if (isLast) {
      finish();
    } else {
      goTo(index + 1);
    }
  }, [isLast, index, goTo, finish]);

  const onBack = useCallback(() => {
    if (index > 0) goTo(index - 1);
  }, [index, goTo]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex(i);
    },
    [width]
  );

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <ImageBackground
            source={item.bg}
            style={{ width, height }}
            resizeMode="cover"
          >
            {/* Bottom gradient overlay for legibility */}
            <LinearGradient
              colors={["transparent", "rgba(0,18,51,0.85)", "rgba(0,18,51,0.98)"]}
              locations={[0.45, 0.7, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* White logo — top-left, respects safe area */}
            <Image
              source={LOGO_WHITE}
              style={[styles.logo, { top: insets.top + 20 }]}
              resizeMode="contain"
              accessible={false}
            />

            {/* Caption text — bottom third */}
            <View style={[styles.captionWrap, { bottom: height * 0.18 }]}>
              <Text style={styles.caption} allowFontScaling={false}>
                {item.caption}
              </Text>
            </View>
          </ImageBackground>
        )}
      />

      {/* Skip (top-right) — hidden on the last slide */}
      {!isLast && (
        <Pressable
          onPress={finish}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          style={[styles.skip, { top: insets.top + 12 }]}
        >
          <Text style={styles.skipText} allowFontScaling={false}>
            Skip
          </Text>
        </Pressable>
      )}

      {/* Bottom control bar */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
        {/* Progress indicator — 3 segments */}
        <View style={styles.dots}>
          {SLIDES.map((s, i) => {
            const active = i === index;
            return (
              <View
                key={s.key}
                style={[
                  styles.dot,
                  active
                    ? { width: 32, backgroundColor: s.accent }
                    : { width: 28, backgroundColor: "rgba(255,255,255,0.25)" },
                ]}
              />
            );
          })}
        </View>

        {/* Nav row */}
        <View style={styles.navRow}>
          {index > 0 ? (
            <Pressable
              onPress={onBack}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Previous slide"
              style={styles.navBtn}
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
              <Text style={styles.navText} allowFontScaling={false}>
                Back
              </Text>
            </Pressable>
          ) : (
            <View style={styles.navBtn} />
          )}

          <Pressable
            onPress={onNext}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Start" : "Next slide"}
            style={styles.navBtn}
          >
            <Text
              style={[
                styles.navText,
                isLast && { color: "#00E600", fontFamily: fontFamily.medium },
              ]}
              allowFontScaling={false}
            >
              {isLast ? "Start" : "Next"}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#001233",
  },
  logo: {
    position: "absolute",
    left: 24,
    width: 120,
    height: 80,
  },
  captionWrap: {
    position: "absolute",
    left: 24,
    right: 24,
  },
  caption: {
    color: "#FFFFFF",
    fontFamily: fontFamily.bold,
    fontSize: 26,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  skip: {
    position: "absolute",
    right: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    color: "#FFFFFF",
    fontFamily: fontFamily.medium,
    fontSize: 14,
    opacity: 0.9,
  },
  controls: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
  },
  dots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    height: 6,
    borderRadius: radius.radiusFull,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 72,
    minHeight: 44,
    justifyContent: "center",
  },
  navText: {
    color: "#FFFFFF",
    fontFamily: fontFamily.regular,
    fontSize: 15,
  },
});
