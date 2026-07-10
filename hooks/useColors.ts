/**
 * useColors
 *
 * Returns the correct color token set based on the active theme.
 * Use this instead of importing `Colors` directly in any component
 * that needs to respond to theme changes.
 *
 * Usage:
 *   const C = useColors();
 *   <View style={{ backgroundColor: C.bgSurface }} />
 */

import { useAppTheme } from "@/context/ThemeContext";
import { DarkColors, LightColors, type ThemeColors } from "@/tokens/colors";

type ThemedColors = ThemeColors & { isDark: boolean; isLight: boolean };

export function useColors(): ThemedColors {
  const { isDark, isLight } = useAppTheme();
  const base = isDark ? DarkColors : LightColors;
  return { ...base, isDark, isLight };
}
