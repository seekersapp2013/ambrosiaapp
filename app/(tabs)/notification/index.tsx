/**
 * notification/index.tsx
 * Expo Router entry point for the notification screen.
 */

import React from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { NotificationManager } from "./NotificationManager";

export default function NotificationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ highlightId?: string }>();

  return (
    <NotificationManager
      onBack={() => router.back()}
      highlightNotificationId={params.highlightId}
    />
  );
}
