import React from 'react';
import { Image, ImageSourcePropType } from 'react-native';

interface AppLogoProps {
  size?: number;
  /** @deprecated kept for backward compatibility; glow is handled by the parent. */
  showGlow?: boolean;
  /** Override the logo asset (e.g. a white variant). Defaults to the red logo. */
  source?: ImageSourcePropType;
  /** When the logo includes the wordmark, width ≠ height. Pass to override aspect. */
  width?: number;
  height?: number;
}

const RED_LOGO = require('../assets/images/logo.png');

export function AppLogo({ size = 48, source, width, height }: AppLogoProps) {
  return (
    <Image
      source={source ?? RED_LOGO}
      style={{
        width: width ?? size,
        height: height ?? size,
        backgroundColor: 'transparent',
      }}
      resizeMode="contain"
    />
  );
}
