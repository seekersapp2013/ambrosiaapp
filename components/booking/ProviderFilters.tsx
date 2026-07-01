/**
 * ProviderFilters
 * Bottom-sheet filter panel for the provider browser.
 * Drives: specialization, jobTitle, minPrice, maxPrice, searchTerm.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { Colors } from "@/tokens/colors";
import { typeScale } from "@/tokens/typography";
import { spacing } from "@/tokens/spacing";
import { radius } from "@/tokens/radius";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface FilterState {
  specialization: string | undefined;
  jobTitle: string | undefined;
  minPrice: number | undefined;
  maxPrice: number | undefined;
}

export const DEFAULT_FILTERS: FilterState = {
  specialization: undefined,
  jobTitle:       undefined,
  minPrice:       undefined,
  maxPrice:       undefined,
};

interface ProviderFiltersProps {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (f: FilterState) => void;
}

// ─── Price option pills ───────────────────────────────────────────────────────
const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "Any price" },
  { label: "Under $50",  max: 50 },
  { label: "$50 – $100", min: 50,  max: 100 },
  { label: "$100 – $200",min: 100, max: 200 },
  { label: "$200+",      min: 200 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function ProviderFilters({
  visible,
  onClose,
  filters,
  onApply,
}: ProviderFiltersProps) {
  // Local draft state — only committed on "Apply"
  const [draft, setDraft] = useState<FilterState>(filters);

  // Fetch filter options from Convex
  const specializations = useQuery(api.bookingSubscribers.getSpecializations) ?? [];
  const jobTitles       = useQuery(api.bookingSubscribers.getJobTitles)       ?? [];

  // Reset draft when sheet opens so it reflects current applied filters
  const handleOpen = useCallback(() => {
    setDraft(filters);
  }, [filters]);

  // Which price range bucket is selected (if any)
  const activePriceIdx = PRICE_RANGES.findIndex(
    (r) => r.min === draft.minPrice && r.max === draft.maxPrice
  );

  function selectPrice(idx: number) {
    const r = PRICE_RANGES[idx];
    setDraft((d) => ({ ...d, minPrice: r.min, maxPrice: r.max }));
  }

  function resetAll() {
    setDraft({ ...DEFAULT_FILTERS });
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  // Count active filters for badge
  const activeCount = [
    draft.specialization,
    draft.jobTitle,
    draft.minPrice !== undefined || draft.maxPrice !== undefined,
  ].filter(Boolean).length;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filter Providers"
      dismissable
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Specialization ─────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Specialization</Text>
        <View style={styles.pillRow}>
          {/* "Any" option */}
          <TouchableOpacity
            style={[
              styles.pill,
              draft.specialization === undefined && styles.pillActive,
            ]}
            onPress={() => setDraft((d) => ({ ...d, specialization: undefined }))}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: draft.specialization === undefined }}
          >
            <Text
              style={[
                styles.pillText,
                draft.specialization === undefined && styles.pillTextActive,
              ]}
              allowFontScaling={false}
            >
              Any
            </Text>
          </TouchableOpacity>
          {specializations.map((spec) => (
            <TouchableOpacity
              key={spec}
              style={[
                styles.pill,
                draft.specialization === spec && styles.pillActive,
              ]}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  specialization: d.specialization === spec ? undefined : spec,
                }))
              }
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.specialization === spec }}
            >
              <Text
                style={[
                  styles.pillText,
                  draft.specialization === spec && styles.pillTextActive,
                ]}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {spec}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Job Title ──────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Job Title</Text>
        <View style={styles.pillRow}>
          <TouchableOpacity
            style={[
              styles.pill,
              draft.jobTitle === undefined && styles.pillActive,
            ]}
            onPress={() => setDraft((d) => ({ ...d, jobTitle: undefined }))}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: draft.jobTitle === undefined }}
          >
            <Text
              style={[
                styles.pillText,
                draft.jobTitle === undefined && styles.pillTextActive,
              ]}
              allowFontScaling={false}
            >
              Any
            </Text>
          </TouchableOpacity>
          {jobTitles.map((title) => (
            <TouchableOpacity
              key={title}
              style={[
                styles.pill,
                draft.jobTitle === title && styles.pillActive,
              ]}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  jobTitle: d.jobTitle === title ? undefined : title,
                }))
              }
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.jobTitle === title }}
            >
              <Text
                style={[
                  styles.pillText,
                  draft.jobTitle === title && styles.pillTextActive,
                ]}
                allowFontScaling={false}
                numberOfLines={1}
              >
                {title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Price range ────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Price Range</Text>
        <View style={styles.pillRow}>
          {PRICE_RANGES.map((range, idx) => (
            <TouchableOpacity
              key={range.label}
              style={[styles.pill, activePriceIdx === idx && styles.pillActive]}
              onPress={() => selectPrice(idx)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: activePriceIdx === idx }}
            >
              <Text
                style={[
                  styles.pillText,
                  activePriceIdx === idx && styles.pillTextActive,
                ]}
                allowFontScaling={false}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Active filter summary ───────────────────────────────── */}
        {activeCount > 0 && (
          <View style={styles.activeSummary}>
            <Ionicons name="options-outline" size={14} color={Colors.actionPrimary} />
            <Text style={styles.activeSummaryText} allowFontScaling={false}>
              {activeCount} filter{activeCount > 1 ? "s" : ""} applied
            </Text>
            <TouchableOpacity
              onPress={resetAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
            >
              <Text style={styles.clearText} allowFontScaling={false}>
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Buttons ────────────────────────────────────────────── */}
        <View style={styles.btnRow}>
          <SecondaryButton
            label="Reset"
            onPress={resetAll}
            style={styles.btnReset}
            accessibilityLabel="Reset all filters"
          />
          <PrimaryButton
            label={`Apply${activeCount > 0 ? ` (${activeCount})` : ""}`}
            onPress={handleApply}
            style={styles.btnApply}
            accessibilityLabel="Apply filters"
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.space6,
  },
  sectionLabel: {
    ...typeScale.labelSM,
    color: Colors.textSecondary,
    marginTop: spacing.space4,
    marginBottom: spacing.space2,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.space2,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.radiusFull,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  pillActive: {
    backgroundColor: Colors.bgPrimaryMid,
    borderColor: Colors.borderFilled,
  },
  pillText: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
  },
  pillTextActive: {
    color: Colors.actionPrimary,
    fontWeight: "600",
  },
  activeSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.space2,
    marginTop: spacing.space4,
    paddingVertical: spacing.space2,
    paddingHorizontal: spacing.space3,
    backgroundColor: Colors.bgPrimarySubtle,
    borderRadius: radius.radiusMD,
    borderWidth: 1,
    borderColor: Colors.borderFilled,
  },
  activeSummaryText: {
    ...typeScale.bodySM,
    color: Colors.actionPrimary,
    flex: 1,
  },
  clearText: {
    ...typeScale.labelSM,
    color: Colors.textMuted,
    textDecorationLine: "underline",
  },
  btnRow: {
    flexDirection: "row",
    gap: spacing.space3,
    marginTop: spacing.space5,
  },
  btnReset: {
    flex: 1,
  },
  btnApply: {
    flex: 2,
  },
});
