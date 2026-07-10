/**
 * useThemedStyles
 *
 * Creates a memoized StyleSheet that rebuilds only when the theme changes.
 * This is the recommended pattern for components that need theme-aware
 * static styles (colors in StyleSheet.create).
 *
 * Usage:
 *   function MyComponent() {
 *     const C = useColors();
 *     const styles = useThemedStyles(C, (colors) => ({
 *       card: {
 *         backgroundColor: colors.bgSurface,
 *         borderColor: colors.borderSubtle,
 *       },
 *     }));
 *     return <View style={styles.card} />;
 *   }
 *
 * The factory function receives the full themed color set and returns
 * a style definition object. The resulting stylesheet is memoized on
 * the `isDark` boolean, so it only recalculates on theme toggle.
 */

import { useMemo } from "react";
import { StyleSheet } from "react-native";
import type { ThemeColors } from "@/tokens/colors";

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (
  colors: ThemeColors & { isDark: boolean; isLight: boolean }
) => T;

export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  colors: ThemeColors & { isDark: boolean; isLight: boolean },
  factory: StyleFactory<T>
): T {
  return useMemo(
    () => StyleSheet.create(factory(colors)),
    // Only rebuild when the theme actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colors.isDark]
  );
}
