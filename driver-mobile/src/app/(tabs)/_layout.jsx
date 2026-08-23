import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { getMyNotifications } from "../../../services/api";

const READ_STORAGE_KEY = "@driver_read_notifications";
const SEEN_STORAGE_KEY = "@driver_seen_notifications";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const [unreadCount, setUnreadCount] = useState(0);

  const checkNotifications = async () => {
    try {
      const [list, savedRead, savedSeen] = await Promise.all([
        getMyNotifications().catch(() => []),
        AsyncStorage.getItem(READ_STORAGE_KEY),
        AsyncStorage.getItem(SEEN_STORAGE_KEY),
      ]);

      const readIds = new Set(savedRead ? JSON.parse(savedRead) : []);
      const seenIds = new Set(savedSeen ? JSON.parse(savedSeen) : []);
      const notifications = Array.isArray(list) ? list : [];

      const unread = notifications.filter((n) => !readIds.has(n.id));
      setUnreadCount(unread.length);

      const newItems = notifications.filter((n) => !seenIds.has(n.id));
      if (newItems.length > 0) {
        try {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        for (const item of newItems) {
          seenIds.add(item.id);
        }
        await AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...seenIds]));
      }
    } catch {}
  };

  useEffect(() => {
    checkNotifications();
    const interval = setInterval(checkNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E53935",
        tabBarInactiveTintColor: "#767A8C",
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 60 + insets.bottom,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: "#14103C",
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        sceneContainerStyle: {
          backgroundColor: "#EDEDED",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) => (
            <Ionicons name="cube" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarBadge: unreadCount > 0 ? "" : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#E53935",
            minWidth: 8,
            maxWidth: 8,
            height: 8,
            borderRadius: 4,
            marginTop: 4,
            marginLeft: 2,
          },
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications" size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}