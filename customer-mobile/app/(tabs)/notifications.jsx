import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import NotificationCard from "../../components/NotificationsCard";
import {
  getCustomerNotifications,
  getToken,
  logout,
  markAllNotificationsRead,
} from "../../services/api";

const { width, height } = Dimensions.get("window");

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortOrder, setSortOrder] = useState("newest"); // "newest" | "oldest"

  const fetchNotifications = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const data = await getCustomerNotifications();
      const list = data?.notifications || [];
      setNotifications(list);
    } catch (error) {
      if (error.message?.toLowerCase().includes("unauthenticated")) {
        await logout();
        router.replace("/login-page");
        return;
      }
      console.log("Failed to fetch customer notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      (async () => {
        const token = await getToken();
        if (!token) {
          if (isMounted) router.replace("/login-page");
          return;
        }
        if (isMounted) {
          await fetchNotifications();
        }
      })();

      const interval = setInterval(async () => {
        const token = await getToken();
        if (token) {
          fetchNotifications();
        }
      }, 12000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [fetchNotifications, router])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.log("Failed to mark notifications read:", err);
    }
  };

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"));
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    const timeA = new Date(a.time || a.created_at || 0).getTime();
    const timeB = new Date(b.time || b.created_at || 0).getTime();
    return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <AppHeader icon="document-text-outline" iconSize={27} />

      {/* BODY */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={styles.pageTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.markReadBtn}>
                <Text style={styles.markReadText}>Mark Read</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.sortButton} onPress={toggleSort}>
              <Text style={styles.sortText}>
                {sortOrder === "newest" ? "Newest" : "Oldest"}
              </Text>
              <Ionicons
                name={sortOrder === "newest" ? "arrow-down" : "arrow-up"}
                size={12}
                color="#315BB5"
              />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#E53935" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={["#E53935"]}
              />
            }
          >
            {sortedNotifications.length > 0 ? (
              sortedNotifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="notifications-off-outline"
                  size={52}
                  color="#9CA3AF"
                />
                <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                <Text style={styles.emptySubtitle}>
                  You'll be notified here of request approvals, driver assignments, delivery progress, and any route updates.
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#D7D9E4",
  },
  body: {
    flex: 1,
    backgroundColor: "#D7D9E4",
  },
  titleRow: {
    backgroundColor: "#F7F8FC",
    paddingHorizontal: width * 0.035,
    paddingVertical: height * 0.012,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    color: "#E53935",
    fontSize: width * 0.055,
    fontWeight: "800",
  },
  unreadBadge: {
    backgroundColor: "#E53935",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  markReadBtn: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  markReadText: {
    color: "#3730A3",
    fontSize: 12,
    fontWeight: "700",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D5DDF3",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  sortText: {
    color: "#315BB5",
    fontSize: 13,
    fontWeight: "700",
    marginRight: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  loadingText: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 12,
  },
  list: {
    padding: width * 0.03,
    paddingBottom: height * 0.05,
    minHeight: height * 0.6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: height * 0.12,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#374151",
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});