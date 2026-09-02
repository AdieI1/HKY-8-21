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

import HomeHeader from "../../../components/HomeHeader";
import NotificationCard from "../../../components/NotificationCard";
import { getMyNotifications } from "../../../services/api";

const READ_STORAGE_KEY = "@driver_read_notifications";

export default function Notifications() {
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

      const [data, savedRead] = await Promise.all([
        getMyNotifications().catch(() => []),
        AsyncStorage.getItem(READ_STORAGE_KEY),
      ]);

      const parsedRead = savedRead ? JSON.parse(savedRead) : [];
      const notifs = Array.isArray(data) ? data : [];
      setRawNotifications(notifs);

      // Once the driver views the notifications, mark all as read/viewed
      const allIds = notifs.map((n) => n.id);
      const merged = new Set([...parsedRead, ...allIds]);
      setReadIds(merged);
      await AsyncStorage.setItem(READ_STORAGE_KEY, JSON.stringify([...merged]));
    } catch (err) {
      console.log("LOAD NOTIFICATIONS ERROR:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const groupedNotifications = useMemo(() => {
    const list = rawNotifications.map((n) => ({
      ...n,
      read: true,
      time: getNotificationTime(n.createdAt),
    }));

    const filtered = filter === "Unread" ? [] : list;
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
  }, [rawNotifications, filter]);

  const hasAnyNotification =
    groupedNotifications.Today.length > 0 ||
    groupedNotifications.Earlier.length > 0 ||
    groupedNotifications.Yesterday.length > 0;

  return (
    <View style={styles.container}>
      <HomeHeader />

      <View style={styles.titleRow}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={filter === "All" ? styles.activeFilter : styles.filterButton}
          onPress={() => setFilter("All")}
        >
          <Text style={filter === "All" ? styles.activeFilterText : styles.filterText}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={filter === "Unread" ? styles.activeFilter : styles.filterButton}
          onPress={() => setFilter("Unread")}
        >
          <Text style={filter === "Unread" ? styles.activeFilterText : styles.filterText}>
            Unread
          </Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B91F27" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNotifications(true)}
              tintColor="#B91F27"
              colors={["#B91F27"]}
            />
          }
        >
          {groupedNotifications.Today.length > 0 && (
            <>
              <Text style={styles.dateTitle}>Today</Text>
              {groupedNotifications.Today.map((n) => (
                <NotificationCard key={n.id} notification={n} />
              ))}
            </>
          )}

          {groupedNotifications.Earlier.length > 0 && (
            <>
              <Text style={styles.dateTitle}>Earlier</Text>
              {groupedNotifications.Earlier.map((n) => (
                <NotificationCard key={n.id} notification={n} />
              ))}
            </>
          )}

          {groupedNotifications.Yesterday.length > 0 && (
            <>
              <Text style={styles.dateTitle}>Yesterday</Text>
              {groupedNotifications.Yesterday.map((n) => (
                <NotificationCard key={n.id} notification={n} />
              ))}
            </>
          )}

          {!hasAnyNotification && (
            <View style={styles.empty}>
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color="#999BA5"
              />
              <Text style={styles.emptyText}>No notifications</Text>
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
    backgroundColor: "#DDE0EE",
  },
  titleRow: {
    height: 50,
    backgroundColor: "#F4F5FC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#D62B2B",
  },
  filterRow: {
    height: 35,
    backgroundColor: "#F4F5FC",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  activeFilter: {
    backgroundColor: "#F24848",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 15,
  },
  activeFilterText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  filterButton: {
    paddingVertical: 3,
    marginRight: 15,
  },
  filterText: {
    color: "#D62B2B",
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
    color: "#D62B2B",
    marginTop: 5,
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
    color: "#555",
    fontSize: 14,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    color: "#999BA5",
    fontSize: 14,
    marginTop: 8,
  },
});