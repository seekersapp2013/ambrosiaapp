import React from 'react';
import { Image } from 'react-native';

interface AppLogoProps {
  size?: number;
  showGlow?: boolean;
}

export function AppLogo({ size = 48 }: AppLogoProps) {
  return (
    <Image
      source={require('../assets/images/logo.png')}
      style={{ width: size, height: size, backgroundColor: 'transparent' }}
      resizeMode="contain"
    />
  );
}
