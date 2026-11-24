import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useRouter } from "expo-router";
import HomeHeader from "../../../components/HomeHeader";
import NotificationCard from "../../../components/NotificationCard";
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

export default function Notifications() {
  const router = useRouter();
  const { theme } = useTheme();
  const [filter, setFilter] = useState("All");
  const [rawNotifications, setRawNotifications] = useState([]);
  const [readIds, setReadIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);

  const loadNotifications = useCallback(async (isRefresh = false, isSilent = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!isSilent) {
        setLoading(true);
      }

      const readKey = await getReadStorageKey();
      const [data, savedRead] = await Promise.all([
        getMyNotifications().catch(() => []),
        AsyncStorage.getItem(readKey),
      ]);

      const parsedRead = savedRead ? JSON.parse(savedRead) : [];
      const notifs = Array.isArray(data) ? data : [];
      setRawNotifications(notifs);
      setReadIds(new Set((Array.isArray(parsedRead) ? parsedRead : []).map(String)));
    } catch (err) {
      console.log("LOAD NOTIFICATIONS ERROR:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const markAsRead = useCallback(async (id) => {
    if (!id) return;
    const key = String(id);
    setReadIds((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      getReadStorageKey().then((storageKey) => {
        AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(next).slice(-300))).catch(() => {});
      });
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(async () => {
    const allIds = rawNotifications.map((n) => String(n.id)).filter(Boolean);
    const merged = new Set([...readIds, ...allIds]);
    setReadIds(merged);
    const storageKey = await getReadStorageKey();
    await AsyncStorage.setItem(storageKey, JSON.stringify(Array.from(merged).slice(-300))).catch(() => {});
  }, [rawNotifications, readIds]);

  const handleOpenNotification = useCallback(
    (notif) => {
      markAsRead(notif.id);
      if (notif.isInspectionCleared && notif.deliveryId) {
        router.push({
          pathname: "/pretripcheck",
          params: { deliveryId: String(notif.deliveryId) },
        });
      } else if (!notif.isRating && notif.deliveryId) {
        router.push({
          pathname: "/deliverydetails",
          params: { deliveryId: String(notif.deliveryId) },
        });
      }
    },
    [markAsRead, router]
  );

  useFocusEffect(
    useCallback(() => {
      loadNotifications(false, rawNotifications.length > 0);
    }, [loadNotifications, rawNotifications.length])
  );

  // Periodic auto-update every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      loadNotifications(false, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Tick for updating relative time strings every 10s
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const getNotificationSection = (createdAt) => {
    if (!createdAt) return "Today";
    const date = new Date(createdAt);
    const now = Date.now();
    const diff = Math.max(0, now - date.getTime());
    const totalMinutes = Math.floor(diff / 60000);

    // Today: under 1 hour
    if (totalMinutes < 60) return "Today";

    // Earlier: 1 hour up to 24 hours
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) return "Earlier";

    // Yesterday: 1 or more days ago
    return "Yesterday";
  };

  const getNotificationTime = (createdAt) => {
    if (!createdAt) return "Just now";
    const date = new Date(createdAt);
    const now = Date.now();
    const diff = now - date.getTime();
    if (diff < 0 && diff > -120000) return "Just now";

    const totalSeconds = Math.max(0, Math.floor(diff / 1000));
    if (totalSeconds < 10) return "Just now";
    if (totalSeconds < 60) return `${totalSeconds}s ago`;

    const mins = Math.floor(totalSeconds / 60);
    if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;

    const days = Math.floor(hours / 24);
    return days === 1 ? "Yesterday" : `${days} days ago`;
  };

  const unreadCount = useMemo(
    () => rawNotifications.filter((n) => n?.id && !readIds.has(String(n.id))).length,
    [rawNotifications, readIds]
  );

  const groupedNotifications = useMemo(() => {
    const list = rawNotifications.map((n) => ({
      ...n,
      read: readIds.has(String(n.id)),
      time: getNotificationTime(n.createdAt),
    }));

    const filtered = filter === "Unread" ? list.filter((n) => !n.read) : list;
    const groups = { Today: [], Earlier: [], Yesterday: [] };

    filtered.forEach((n) => {
      const section = getNotificationSection(n.createdAt);
      if (groups[section]) {
        groups[section].push(n);
      } else {
        groups.Yesterday.push(n);
      }
    });

    return groups;
  }, [rawNotifications, readIds, filter]);

  const hasAnyNotification =
    groupedNotifications.Today.length > 0 ||
    groupedNotifications.Earlier.length > 0 ||
    groupedNotifications.Yesterday.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <HomeHeader />

      <View style={[styles.titleRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.primary }]}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: theme.primary }}>
              Mark all read
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.filterRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={filter === "All" ? [styles.activeFilter, { backgroundColor: theme.primary }] : styles.filterButton}
          onPress={() => setFilter("All")}
        >
          <Text style={filter === "All" ? styles.activeFilterText : [styles.filterText, { color: theme.secondaryText }]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={filter === "Unread" ? [styles.activeFilter, { backgroundColor: theme.primary }] : styles.filterButton}
          onPress={() => setFilter("Unread")}
        >
          <Text style={filter === "Unread" ? styles.activeFilterText : [styles.filterText, { color: theme.secondaryText }]}>
            {unreadCount > 0 ? `Unread (${unreadCount})` : "Unread"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >
          {groupedNotifications.Today.length > 0 && (
            <>
              <Text style={[styles.dateTitle, { color: theme.primary }]}>Today</Text>
              {groupedNotifications.Today.map((n) => (
                <NotificationCard key={n.id} notification={n} onPress={() => handleOpenNotification(n)} />
              ))}
            </>
          )}

          {groupedNotifications.Earlier.length > 0 && (
            <>
              <Text style={[styles.dateTitle, { color: theme.primary }]}>Earlier</Text>
              {groupedNotifications.Earlier.map((n) => (
                <NotificationCard key={n.id} notification={n} onPress={() => handleOpenNotification(n)} />
              ))}
            </>
          )}

          {groupedNotifications.Yesterday.length > 0 && (
            <>
              <Text style={[styles.dateTitle, { color: theme.primary }]}>Yesterday</Text>
              {groupedNotifications.Yesterday.map((n) => (
                <NotificationCard key={n.id} notification={n} onPress={() => handleOpenNotification(n)} />
              ))}
            </>
          )}

          {!hasAnyNotification && (
            <View style={styles.empty}>
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color={theme.secondaryText}
              />
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>No notifications</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleRow: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  filterRow: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    borderBottomWidth: 1,
  },
  activeFilter: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 15,
  },
  activeFilterText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  filterButton: {
    paddingVertical: 4,
    marginRight: 15,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 100,
  },
  dateTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 7,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
});