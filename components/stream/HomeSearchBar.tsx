/**
 * HomeSearchBar
 * Search bar & category filter chips for the Home screen stream.
 */

import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export type SearchCategory = "all" | "article" | "reel" | "event" | "circle" | "provider" | "course";

interface CategoryChip {
  id: SearchCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const CATEGORIES: CategoryChip[] = [
  { id: "all", label: "All", icon: "sparkles-outline" },
  { id: "article", label: "Articles", icon: "newspaper-outline" },
  { id: "reel", label: "Pulses", icon: "play-circle-outline" },
  { id: "event", label: "Events", icon: "calendar-outline" },
  { id: "circle", label: "Circles", icon: "people-outline" },
  { id: "provider", label: "Providers", icon: "medical-outline" },
  { id: "course", label: "Courses", icon: "school-outline" },
];

interface HomeSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  selectedCategory: SearchCategory;
  onSelectCategory: (category: SearchCategory) => void;
  containerStyle?: ViewStyle;
  placeholder?: string;
}

export function HomeSearchBar({
  value,
  onChangeText,
  onClear,
  selectedCategory,
  onSelectCategory,
  containerStyle,
  placeholder = "Search articles, pulses, events, circles, providers…",
}: HomeSearchBarProps) {
  const C = useColors();
  const hasValue = value.trim().length > 0;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* ── Input box ── */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: C.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            borderColor: hasValue ? C.primary : C.borderSubtle,
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color={hasValue ? C.primary : C.textMuted} style={styles.searchIcon} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          style={[styles.input, { color: C.textPrimary }]}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search input"
        />

        {hasValue && (
          <TouchableOpacity onPress={onClear} style={styles.clearBtn} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Chips ── */}
      {hasValue && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
          style={styles.chipsScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => onSelectCategory(cat.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? C.primary
                      : C.isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(0,0,0,0.05)",
                    borderColor: isSelected ? C.primary : C.borderSubtle,
                  },
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Ionicons
                  name={cat.icon}
                  size={13}
                  color={isSelected ? "#fff" : C.textMuted}
                  style={styles.chipIcon}
                />
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? "#fff" : C.textMuted,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  chipsScroll: {
    marginTop: 8,
  },
  chipsContainer: {
    flexDirection: "row",
    gap: 6,
    paddingRight: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 12,
  },
});
