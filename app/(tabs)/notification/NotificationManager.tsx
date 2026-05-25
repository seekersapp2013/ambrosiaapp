/**
 * NotificationManager
 * Navigation shell that switches between NotificationsScreen and
 * NotificationSettingsScreen.
 */

import React, { useState } from "react";
import { NotificationsScreen } from "./NotificationsScreen";
import { NotificationSettingsScreen } from "./NotificationSettingsScreen";

type View = "notifications" | "settings";

interface NotificationManagerProps {
  onBack: () => void;
  highlightNotificationId?: string;
}

export function NotificationManager({
  onBack,
  highlightNotificationId,
}: NotificationManagerProps) {
  const [currentView, setCurrentView] = useState<View>("notifications");

  const handleBack = () => {
    if (currentView === "settings") {
      setCurrentView("notifications");
    } else {
      onBack();
    }
  };

  if (currentView === "settings") {
    return <NotificationSettingsScreen onBack={handleBack} />;
  }

  return (
    <NotificationsScreen
      onBack={handleBack}
      onOpenSettings={() => setCurrentView("settings")}
      highlightNotificationId={highlightNotificationId}
    />
  );
}
