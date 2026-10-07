import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { navigateToNotificationTarget } from "@/utils/notificationNavigation";

// Dynamically import expo-notifications to avoid crashes on Web platform
let Notifications: typeof import("expo-notifications") | null = null;
if (Platform.OS === "android" || Platform.OS === "ios") {
  try {
    Notifications = require("expo-notifications");
  } catch (err) {
    console.warn("expo-notifications module not loaded:", err);
  }
}

// Configure foreground presentation behavior if module available
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    } as any),
  });
}

export function useDeviceNotifications() {
  const router = useRouter();
  const recentUnread = useQuery(api.notifications.getRecentUnreadNotifications, { limit: 5 });
  const savePushToken = useMutation(api.notifications.savePushToken);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const previousNotifIdsRef = useRef<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!Notifications || Platform.OS === "web") return;

    async function setupDeviceNotifications() {
      try {
        // 1. Configure Android Notification Channel
        if (Platform.OS === "android") {
          await Notifications!.setNotificationChannelAsync("default", {
            name: "Ambrosia Notifications",
            importance: Notifications!.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#C62229",
            sound: "default",
          });
        }

        // 2. Request Notification Permissions
        const { status: existingStatus } = await Notifications!.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== "granted") {
          const { status } = await Notifications!.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus === "granted") {
          // 3. Register Expo Push Token for Backend Delivery
          try {
            const tokenData = await Notifications!.getExpoPushTokenAsync();
            if (tokenData?.data) {
              await savePushToken({ pushToken: tokenData.data });
            }
          } catch (e) {
            console.log("Push token registration skipped or unavailable:", e);
          }
        }
      } catch (err) {
        console.warn("Error setting up device notifications:", err);
      }
    }

    setupDeviceNotifications();

    // 4. Attach OS Notification Tray Tap Listener
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data && (data._id || data.type)) {
          navigateToNotificationTarget(
            router,
            data as any,
            undefined,
            (id) => {
              markAsRead({ notificationId: id as any }).catch(() => {});
            }
          );
        }
      }
    );

    return () => {
      responseSubscription.remove();
    };
  }, [router, savePushToken, markAsRead]);

  // 5. Watcher: Present incoming unread notifications on the device notification tray
  useEffect(() => {
    if (!Notifications || !recentUnread || Platform.OS === "web") return;

    if (!isInitializedRef.current) {
      // First load: prime the set with current unread IDs so we don't spam existing notifications
      previousNotifIdsRef.current = new Set(recentUnread.map((n) => n._id));
      isInitializedRef.current = true;
      return;
    }

    // Trigger local notification for any new unread notification
    for (const notif of recentUnread) {
      if (!previousNotifIdsRef.current.has(notif._id)) {
        previousNotifIdsRef.current.add(notif._id);

        Notifications.scheduleNotificationAsync({
          content: {
            title: notif.title,
            body: (notif as any).message || (notif as any).body || "",
            data: {
              _id: notif._id,
              type: notif.type,
              metadata: (notif as any).metadata,
              relatedContentType: (notif as any).relatedContentType,
              relatedContentId: (notif as any).relatedContentId,
            },
            sound: "default",
          },
          trigger: null, // Display immediately in device tray
        }).catch((err) => console.error("Failed to present device notification:", err));
      }
    }
  }, [recentUnread]);
}
