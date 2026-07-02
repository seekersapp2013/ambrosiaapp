/**
 * notification/index.tsx
 * Expo Router entry point for the notification screen.
 */

import React from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigationHistory } from "@/context/NavigationHistoryContext";
import { NotificationManager } from "./NotificationManager";

export default function NotificationScreen() {
  const router = useRouter();
  const history = useNavigationHistory();
  const params = useLocalSearchParams<{ highlightId?: string }>();

  return (
    <NotificationManager
      onBack={() => history.goBack(router, "/(tabs)/for-you")}
      highlightNotificationId={params.highlightId}
    />
  );
}
