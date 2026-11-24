import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Animated,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { setNotificationHandler } from "expo-notifications/build/NotificationsHandler";
import scheduleNotificationAsync from "expo-notifications/build/scheduleNotificationAsync";
import setNotificationChannelAsync from "expo-notifications/build/setNotificationChannelAsync";
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from "expo-notifications/build/NotificationPermissions";
import { addNotificationResponseReceivedListener } from "expo-notifications/build/NotificationsEmitter";
import { AndroidImportance } from "expo-notifications/build/NotificationChannelManager.types";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCustomerNotifications,
  getSavedUser,
  getToken,
  markNotificationRead,
} from "../services/api";

const CHANNEL_ID = "hjy-customer-alerts-silent";
const PREF_NOTIF_KEY = "@customer_pref_notifications";
const POLL_INTERVAL_MS = 6000;
const AUTO_DISMISS_MS = 5500;

if (Platform.OS !== "web") {
  try {
    setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Ignore if unavailable
  }
}

async function setupLocalNotifications() {
  if (Platform.OS === "web") return false;
  try {
    if (Platform.OS === "android") {
      await setNotificationChannelAsync(CHANNEL_ID, {
        name: "HJY Shipment Updates",
        importance: AndroidImportance.HIGH,
        sound: null,
        enableVibrate: true,
        vibrationPattern: [0, 180],
      });
    }
    const { status: existing } = await getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export default function CustomerNotificationManager() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [banner, setBanner] = useState(null);
  const slideAnim = useRef(new Animated.Value(-140)).current;
  const dismissTimerRef = useRef(null);
  const seenIdsRef = useRef(null);
  const activeUserKeyRef = useRef(null);
  const permissionGrantedRef = useRef(false);
  const isPollingRef = useRef(false);

  const hideBanner = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    Animated.timing(slideAnim, {
      toValue: -160,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setBanner(null);
    });
  }, [slideAnim]);

  const showBanner = useCallback(
    (item) => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
      setBanner(item);
      slideAnim.setValue(-140);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 11,
      }).start();

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }

      dismissTimerRef.current = setTimeout(() => {
        hideBanner();
      }, AUTO_DISMISS_MS);
    },
    [hideBanner, slideAnim]
  );

  const triggerOsPopup = useCallback(async (item) => {
    if (Platform.OS === "web") return;
    try {
      if (!permissionGrantedRef.current) {
        permissionGrantedRef.current = await setupLocalNotifications();
      }
      if (!permissionGrantedRef.current) return;

      await scheduleNotificationAsync({
        content: {
          title: `HJY Trucking • ${item.title}`,
          body: item.body,
          sound: false,
          data: { id: item.id, type: item.type },
          ...(Platform.OS === "android" ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: null,
      });
    } catch {
      // In-app banner still displays cleanly
    }
  }, []);

  const checkNotifications = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const token = await getToken();
      if (!token) {
        seenIdsRef.current = null;
        activeUserKeyRef.current = null;
        return;
      }

      // Respect customer Settings -> Notifications toggle
      const prefVal = await AsyncStorage.getItem(PREF_NOTIF_KEY).catch(() => null);
      if (prefVal === "false") {
        return;
      }

      if (!permissionGrantedRef.current) {
        permissionGrantedRef.current = await setupLocalNotifications();
      }

      const user = await getSavedUser().catch(() => null);
      const userId = user?.user_id || user?.id || "customer";
      const storageKey = `@hjy_customer_seen_notifs_${userId}`;

      const res = await getCustomerNotifications();
      const list = Array.isArray(res?.notifications)
        ? res.notifications
        : Array.isArray(res)
        ? res
        : [];

      if (!seenIdsRef.current || activeUserKeyRef.current !== storageKey) {
        let stored = [];
        try {
          const raw = await AsyncStorage.getItem(storageKey);
          stored = raw ? JSON.parse(raw) : [];
        } catch {
          stored = [];
        }
        const baseline = new Set(Array.isArray(stored) ? stored : []);
        list.forEach((n) => {
          const nid = n?.id ?? n?.notification_id;
          if (nid != null) baseline.add(String(nid));
        });
        seenIdsRef.current = baseline;
        activeUserKeyRef.current = storageKey;
        await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(baseline).slice(-200))).catch(() => {});
        return;
      }

      const seen = seenIdsRef.current;
      const fresh = [];
      for (const n of list) {
        const nid = n?.id ?? n?.notification_id;
        if (nid == null) continue;
        const key = String(nid);
        if (seen.has(key)) continue;
        seen.add(key);
        if (!n.is_read) {
          fresh.push(n);
        }
      }

      if (fresh.length === 0) return;

      await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(seen).slice(-200))).catch(() => {});

      const toDisplay = fresh.slice(0, 3);
      for (const n of toDisplay) {
        const formatted = {
          id: n.id ?? n.notification_id,
          type: n.type || "delivery_status",
          title: n.title || "Shipment Update",
          body: n.message || "",
          accent: n.color || "#C53030",
        };
        await triggerOsPopup(formatted);
        showBanner(formatted);
      }
    } catch {
      // Silent network ignore
    } finally {
      isPollingRef.current = false;
    }
  }, [showBanner, triggerOsPopup]);

  useEffect(() => {
    checkNotifications();

    const interval = setInterval(() => {
      if (AppState.currentState === "active") {
        checkNotifications();
      }
    }, POLL_INTERVAL_MS);

    const appStateSub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkNotifications();
      }
    });

    let responseSub = null;
    if (Platform.OS !== "web") {
      try {
        responseSub = addNotificationResponseReceivedListener((response) => {
          const data = response?.notification?.request?.content?.data || {};
          if (data?.id) {
            markNotificationRead(data.id).catch(() => {});
          }
          const t = String(data?.type || "").toLowerCase();
          if (t.includes("delivery")) {
            router.push("/(tabs)/deliveries");
          } else {
            router.push("/(tabs)/notifications");
          }
        });
      } catch {
        // Ignore
      }
    }

    return () => {
      clearInterval(interval);
      appStateSub.remove();
      responseSub?.remove?.();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [checkNotifications, router]);

  if (!banner) return null;

  const handleBannerPress = () => {
    const target = banner;
    hideBanner();
    if (target.id) {
      markNotificationRead(target.id).catch(() => {});
    }
    const t = String(target.type || "").toLowerCase();
    if (t.includes("delivery")) {
      router.push("/(tabs)/deliveries");
    } else {
      router.push("/(tabs)/notifications");
    }
  };

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          top: Math.max(insets.top, 12) + 6,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={handleBannerPress}
        style={[styles.card, { borderLeftColor: banner.accent || "#C53030" }]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${banner.accent || "#C53030"}18` }]}>
          <Ionicons name="notifications" size={20} color={banner.accent || "#C53030"} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {banner.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {banner.body}
          </Text>
        </View>
        <Pressable onPress={hideBanner} hitSlop={10} style={styles.closeBtn}>
          <Ionicons name="close" size={18} color="#94A3B8" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 14,
    right: 14,
    zIndex: 9999,
    elevation: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  body: {
    fontSize: 12,
    color: "#475569",
    marginTop: 2,
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
