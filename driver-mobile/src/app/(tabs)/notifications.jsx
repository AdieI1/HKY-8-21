import {StyleSheet,View,Text,ScrollView,TouchableOpacity,} from "react-native";
import { useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

import HomeHeader from "../../../components/HomeHeader";
import NotificationCard from "../../../components/NotificationCard";

export default function Notifications() {
  const [filter, setFilter] = useState("All");

  const now = Date.now();

  const notifications = [
    {
      id: "1",
      type: "New Assignment!",
      driver: "Christopher Lee",
      cargo: "Electronics",
      weight: "6,700kg",
      location: "Port Area - Malaybalay",
      createdAt: new Date(
        now - 6 * 60 * 1000
      ).toISOString(),
      read: false,
    },
    {
      id: "2",
      type: "New Assignment!",
      driver: "Christopher Lee",
      cargo: "Electronics",
      weight: "6,700kg",
      location: "Port Area - Malaybalay",
      createdAt: new Date(
        now - 2 * 60 * 60 * 1000
      ).toISOString(),
      read: true,
    },
    {
      id: "3",
      type: "New Assignment!",
      driver: "Christopher Lee",
      cargo: "Electronics",
      weight: "6,700kg",
      location: "Port Area - Malaybalay",
      createdAt: new Date(
        now - 24 * 60 * 60 * 1000
      ).toISOString(),
      read: true,
    },
  ];

  const getNotificationTime = (createdAt) => {
    const difference =
      Date.now() - new Date(createdAt).getTime();

    const minutes = Math.floor(
      difference / (1000 * 60)
    );

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes} mins ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    }

    const days = Math.floor(hours / 24);

    if (days === 1) {
      return "Yesterday";
    }

    return `${days} days ago`;
  };

  const getNotificationSection = (createdAt) => {
    const difference =
      Date.now() - new Date(createdAt).getTime();

    const minutes = Math.floor(
      difference / (1000 * 60)
    );

    if (minutes < 60) {
      return "Today";
    }

    const notificationDate = new Date(createdAt);
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isYesterday =
      notificationDate.getFullYear() ===
        yesterday.getFullYear() &&
      notificationDate.getMonth() ===
        yesterday.getMonth() &&
      notificationDate.getDate() ===
        yesterday.getDate();

    if (isYesterday) {
      return "Yesterday";
    }

    return "Earlier";
  };

  const groupedNotifications = useMemo(() => {
    const filteredNotifications =
      filter === "Unread"
        ? notifications.filter(
            (notification) => !notification.read
          )
        : notifications;

    const groups = {
      Today: [],
      Earlier: [],
      Yesterday: [],
    };

    filteredNotifications.forEach((notification) => {
      const section = getNotificationSection(
        notification.createdAt
      );

      groups[section].push({
        ...notification,
        time: getNotificationTime(
          notification.createdAt
        ),
      });
    });

    return groups;
  }, [filter]);

  return (
    <View style={styles.container}>
      <HomeHeader />

      <View style={styles.titleRow}>
        <Text style={styles.title}>
          Notifications
        </Text>

      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={
            filter === "All"
              ? styles.activeFilter
              : styles.filterButton
          }
          onPress={() => setFilter("All")}
        >
          <Text
            style={
              filter === "All"
                ? styles.activeFilterText
                : styles.filterText
            }
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            filter === "Unread"
              ? styles.activeFilter
              : styles.filterButton
          }
          onPress={() => setFilter("Unread")}
        >
          <Text
            style={
              filter === "Unread"
                ? styles.activeFilterText
                : styles.filterText
            }
          >
            Unread
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {groupedNotifications.Today.length > 0 && (
          <>
            <Text style={styles.dateTitle}>
              Today
            </Text>

            {groupedNotifications.Today.map(
              (notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              )
            )}
          </>
        )}

        {groupedNotifications.Earlier.length > 0 && (
          <>
            <Text style={styles.dateTitle}>
              Earlier
            </Text>

            {groupedNotifications.Earlier.map(
              (notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              )
            )}
          </>
        )}

        {groupedNotifications.Yesterday.length > 0 && (
          <>
            <Text style={styles.dateTitle}>
              Yesterday
            </Text>

            {groupedNotifications.Yesterday.map(
              (notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                />
              )
            )}
          </>
        )}

        {groupedNotifications.Today.length === 0 &&
          groupedNotifications.Earlier.length === 0 &&
          groupedNotifications.Yesterday.length === 0 && (
            <View style={styles.empty}>
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color="#999BA5"
              />

              <Text style={styles.emptyText}>
                No notifications
              </Text>
            </View>
          )}
      </ScrollView>
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

  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D8DDF5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },

  sortText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#53629B",
    marginRight: 4,
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