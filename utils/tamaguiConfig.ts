import { createTamagui, createFont } from "tamagui";
import { config } from "@tamagui/config/v3";

// Use system fonts to avoid fontfaceobserver 6000ms timeout on web
const systemFont = createFont({
  family:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  size: config.fonts.body.size,
  lineHeight: config.fonts.body.lineHeight,
  weight: config.fonts.body.weight,
  letterSpacing: config.fonts.body.letterSpacing,
});

// Created once at module level — isolated here so it doesn't block _layout.tsx
export const tamaguiConfig = createTamagui({
  ...config,
  fonts: {
    ...config.fonts,
    body: systemFont,
    heading: systemFont,
  },
});
