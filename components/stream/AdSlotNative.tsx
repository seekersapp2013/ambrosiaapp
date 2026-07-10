/**
 * AdSlotNative
 * Native ad slot — renders a "Sponsored" placeholder if the zone is active.
 * Returns null (zero height) when ads are disabled or the zone isn't found.
 *
 * ✅ Phase 0: Uses useColors() for theme-aware rendering.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useColors } from "@/hooks/useColors";

interface AdSlotNativeProps {
  zoneId: string;
}

export function AdSlotNative({ zoneId }: AdSlotNativeProps) {
  const C = useColors();
  const placements = useQuery(api.ads.getActivePlacements);

  // While loading, render nothing
  if (placements === undefined) return null;

  // Ads disabled globally or zone not found
  const zone = placements.find((p: any) => p.zoneId === zoneId);
  if (!zone) return null;

  return (
    <View
      style={[styles.container, { borderColor: C.borderSubtle, backgroundColor: C.bgSurface }]}
      accessibilityLabel="Sponsored content"
    >
      <View style={[styles.badge, { backgroundColor: C.bgElevated }]}>
        <Text style={[styles.badgeText, { color: C.textMuted }]}>Sponsored</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={[styles.placeholderText, { color: C.textMuted }]}>{zone.label ?? "Advertisement"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  badge: {
    alignSelf: "flex-end",
    borderBottomLeftRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  placeholder: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 13,
  },
});
