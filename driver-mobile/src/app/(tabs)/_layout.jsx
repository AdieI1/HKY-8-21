import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMyNotifications, getSavedUser } from "../../../services/api";

import { useTheme } from "../../context/ThemeContext";

const getReadStorageKey = async () => {
  try {
    const user = await getSavedUser();
    const uid = user?.user_id || user?.id || "default";
    return `@driver_read_notifications_${uid}`;
  } catch {
    return "@driver_read_notifications_default";
  }
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);

  const checkNotifications = useCallback(async () => {
    try {
      const readKey = await getReadStorageKey();
      const [list, savedRead] = await Promise.all([
        getMyNotifications().catch(() => []),
        AsyncStorage.getItem(readKey),
      ]);

      const readIds = new Set(savedRead ? JSON.parse(savedRead) : []);
      const notifications = Array.isArray(list) ? list : [];

      const unread = notifications.filter((n) => n?.id && !readIds.has(String(n.id)));
      setUnreadCount(unread.length);
    } catch {}
  }, []);

  useEffect(() => {
    checkNotifications();
    const interval = setInterval(checkNotifications, 5000);
    return () => clearInterval(interval);
  }, [checkNotifications]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.icon,
        tabBarStyle: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 60 + insets.bottom,
          backgroundColor: theme.tabBar,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 12,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        sceneContainerStyle: {
          backgroundColor: theme.background,
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
        listeners={{
          tabPress: () => {
            checkNotifications();
          },
        }}
        options={{
          title: "Notifications",
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#E53935",
            color: "#FFFFFF",
            fontSize: 10,
            fontWeight: "700",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            lineHeight: 16,
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