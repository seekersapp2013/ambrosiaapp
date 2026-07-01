/**
 * ProviderCard
 * Reusable card for a single booking provider.
 * Used in the provider browser (providers.tsx) and search results.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ProviderData {
  subscriber: {
    _id: string;
    userId: string;
    jobTitle: string;
    specialization: string;
    oneOnOnePrice?: number;
    groupSessionPrice?: number;
    sessionPrice: number;
    aboutUser: string;
    offerDescription: string;
    xLink?: string;
    linkedInLink?: string;
    openHours: Record<
      string,
      { start: string; end: string; available: boolean }
    >;
    isActive: boolean;
  };
  profile: {
    name?: string;
    username?: string;
    avatar?: string;
  } | null;
}

interface ProviderCardProps {
  provider: ProviderData;
  onPress: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function availableDaysCount(
  openHours: Record<string, { available: boolean }>
): number {
  return Object.values(openHours).filter((d) => d.available).length;
}

function formatPrice(amount: number): string {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}k`;
  return `$${amount}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ProviderCard({ provider, onPress }: ProviderCardProps) {
  const { subscriber, profile } = provider;
  const name = profile?.name ?? profile?.username ?? "Provider";
  const price = subscriber.oneOnOnePrice ?? subscriber.sessionPrice;
  const daysAvailable = availableDaysCount(subscriber.openHours);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={`View profile of ${name}`}
    >
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {profile?.avatar ? (
            <Image
              source={{ uri: profile.avatar }}
              style={styles.avatar}
              resizeMode="cover"
              accessibilityLabel={`${name} profile photo`}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.avatarInitial} allowFontScaling={false}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          {/* Active indicator dot */}
          <View style={styles.activeDot} />
        </View>

        {/* Name + title */}
        <View style={styles.headerInfo}>
          <Text style={styles.name} numberOfLines={1} allowFontScaling={false}>
            {name}
          </Text>
          <Text
            style={styles.jobTitle}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {subscriber.jobTitle}
          </Text>
          {/* Specialization badge */}
          <View style={styles.specBadge}>
            <Text style={styles.specText} numberOfLines={1} allowFontScaling={false}>
              {subscriber.specialization}
            </Text>
          </View>
        </View>

        {/* Price */}
        <View style={styles.priceWrap}>
          <Text style={styles.price} allowFontScaling={false}>
            {formatPrice(price)}
          </Text>
          <Text style={styles.priceSub} allowFontScaling={false}>
            / hr
          </Text>
        </View>
      </View>

      {/* ── About ───────────────────────────────────────────────────── */}
      <Text style={styles.about} numberOfLines={2} allowFontScaling={false}>
        {subscriber.aboutUser}
      </Text>

      {/* ── Divider ─────────────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Meta row ────────────────────────────────────────────────── */}
      <View style={styles.meta}>
        {/* Days available */}
        <View style={styles.metaItem}>
          <Ionicons
            name="calendar-outline"
            size={13}
            color={Colors.iconSecondary}
          />
          <Text style={styles.metaText} allowFontScaling={false}>
            {daysAvailable}d/wk
          </Text>
        </View>

        {/* Group price */}
        {subscriber.groupSessionPrice && (
          <View style={styles.metaItem}>
            <Ionicons
              name="people-outline"
              size={13}
              color={Colors.iconSecondary}
            />
            <Text style={styles.metaText} allowFontScaling={false}>
              {formatPrice(subscriber.groupSessionPrice)} group
            </Text>
          </View>
        )}

        {/* Social links */}
        {(subscriber.xLink || subscriber.linkedInLink) && (
          <View style={styles.metaItem}>
            {subscriber.xLink && (
              <Ionicons
                name="logo-twitter"
                size={13}
                color={Colors.iconSecondary}
              />
            )}
            {subscriber.linkedInLink && (
              <Ionicons
                name="logo-linkedin"
                size={13}
                color={Colors.iconSecondary}
              />
            )}
          </View>
        )}

        {/* Spacer + CTA chip */}
        <View style={{ flex: 1 }} />
        <View style={styles.viewBtn}>
          <Text style={styles.viewBtnText} allowFontScaling={false}>
            View Details
          </Text>
          <Ionicons
            name="chevron-forward"
            size={11}
            color={Colors.actionPrimary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgElevated,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: spacing.space4,
    marginBottom: spacing.space3,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.space3,
    marginBottom: spacing.space3,
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: Colors.borderFilled,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.bgPrimaryMid,
    borderWidth: 2,
    borderColor: Colors.borderFilled,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    ...typeScale.headingMD,
    color: Colors.actionPrimary,
    fontWeight: "700",
  },
  activeDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.statusSuccess,
    borderWidth: 2,
    borderColor: Colors.bgElevated,
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  name: {
    ...typeScale.headingSM,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  jobTitle: {
    ...typeScale.bodySM,
    fontSize: 12,
    color: Colors.textMuted,
  },
  specBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgPrimarySubtle,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 2,
  },
  specText: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.actionPrimary,
  },
  priceWrap: {
    alignItems: "flex-end",
    gap: 1,
    flexShrink: 0,
  },
  price: {
    ...typeScale.headingMD,
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  priceSub: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },

  // About
  about: {
    ...typeScale.bodySM,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.space3,
  },

  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginBottom: spacing.space3,
  },

  // Meta
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.space3,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    ...typeScale.caption,
    color: Colors.textMuted,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: Colors.bgPrimarySubtle,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
    borderRadius: radius.radiusFull,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.actionPrimary,
  },
});
