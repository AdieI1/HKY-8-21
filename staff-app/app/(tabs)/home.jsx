import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Header from "@/components/Header";
import OverviewCard from "@/components/OverviewCard";
import ReportMessage from "@/components/ReportMessage";
import SuccessCard from "@/components/SuccessCard";
import TaskCard from "@/components/TaskCard";
import NotificationsModal from "@/components/NotificationsModal";
import {
  getDeliveries,
  getIncidentReports,
  getSavedUser,
  getCurrentUser,
  getStaffNotifications,
  markStaffNotificationRead,
  markAllStaffNotificationsRead,
  resolveImageUrl,
} from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const DEFAULT_IMAGE = require("../../assets/images/truckpic.jpg");

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();

  const [userName, setUserName] = useState("Staff");
  const [userAvatar, setUserAvatar] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [overview, setOverview] = useState({
    preTripChecks: 0,
    postTripChecks: 0,
    checksCompleted: 0,
    issuesReported: 0,
  });

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [savedUser, currentUser, deliveryList, reports, notifsRes] = await Promise.all([
        getSavedUser().catch(() => null),
        getCurrentUser().catch(() => null),
        getDeliveries().catch(() => []),
        getIncidentReports().catch(() => []),
        getStaffNotifications().catch(() => ({ unread_count: 0, notifications: [] })),
      ]);

      const activeUser = currentUser || savedUser;
      if (activeUser?.full_name) {
        setUserName(activeUser.full_name);
      }
      const rawPhoto = activeUser?.profile_photo_url || activeUser?.profile_photo_path;
      if (rawPhoto) {
        setUserAvatar(resolveImageUrl(rawPhoto));
      }

      if (notifsRes) {
        const notifList = Array.isArray(notifsRes?.notifications) ? notifsRes.notifications : [];
        setNotifications(notifList);
        setUnreadCount(
          typeof notifsRes?.unread_count === "number"
            ? notifsRes.unread_count
            : notifList.filter((n) => !n.is_read).length
        );
      }

      const deliveries = Array.isArray(deliveryList) ? deliveryList : [];
      const incidentList = Array.isArray(reports) ? reports : [];

      const pendingPreTrip = deliveries.filter(
        (d) =>
          !d?.checklists?.some((c) => c.type === "pre_trip") &&
          ["assigned", "pending"].includes(d?.status)
      );

      const pendingPostTrip = deliveries.filter(
        (d) =>
          d?.checklists?.some((c) => c.type === "pre_trip") &&
          !d?.checklists?.some((c) => c.type === "post_trip") &&
          ["in_transit", "arrived", "delivered", "returning_to_hq", "completed"].includes(d?.status)
      );

      // Helper to accurately check if a timestamp occurred today in device local time
      const isToday = (dateString) => {
        if (!dateString) return false;
        const str = String(dateString).trim();
        const dt = new Date(str.includes(" ") && !str.includes("T") ? str.replace(" ", "T") : str);
        if (isNaN(dt.getTime())) return false;
        const now = new Date();
        return (
          dt.getFullYear() === now.getFullYear() &&
          dt.getMonth() === now.getMonth() &&
          dt.getDate() === now.getDate()
        );
      };

      // Count all checklists completed today across deliveries (resets to 0 daily at midnight)
      let completedToday = 0;
      deliveries.forEach((d) => {
        (d?.checklists || []).forEach((c) => {
          const timestamp = c?.completed_at || c?.created_at;
          if (timestamp && isToday(timestamp)) {
            completedToday++;
          }
        });
      });

      // Count only incidents reported today (resets to 0 daily at midnight)
      const issuesReportedToday = incidentList.filter((r) =>
        isToday(r?.reported_at || r?.created_at)
      ).length;

      setOverview({
        preTripChecks: pendingPreTrip.length,
        postTripChecks: pendingPostTrip.length,
        checksCompleted: completedToday,
        issuesReported: issuesReportedToday,
      });

      // Show active deliveries needing inspection
      const activeInspections = [...pendingPreTrip, ...pendingPostTrip];

      const formattedTasks = activeInspections.map((d) => {
        const vehicle = d?.vehicle;
        let brandModel = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ");
        brandModel = brandModel.replace(/^(\w+)\s+\1/i, "$1").trim();

        const plate = vehicle?.plate_number || `Delivery #${d?.delivery_id}`;
        const typeStr = brandModel || (vehicle?.type ? `${vehicle.type}` : "Fuso - Truck");

        const dateObj = d?.created_at
          ? new Date(
              String(d.created_at).includes(" ") && !String(d.created_at).includes("T")
                ? String(d.created_at).replace(" ", "T")
                : d.created_at
            )
          : new Date();

        const rawMonth = dateObj.toLocaleDateString("en-US", { month: "short" });
        const month = rawMonth === "Sep" ? "Sept" : rawMonth;
        const dateStr = `${month} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
        const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const resolvedUrl = resolveImageUrl(vehicle?.photo_url || vehicle?.photo);
        const imageSource = resolvedUrl ? { uri: resolvedUrl } : DEFAULT_IMAGE;

        const isPost = d?.checklists?.some((c) => c.type === "pre_trip");

        return {
          id: d?.delivery_id,
          vehicle: plate,
          type: typeStr,
          date: dateStr,
          time: timeStr,
          image: imageSource,
          delivery: d,
          inspectionType: isPost ? "Post-Trip" : "Pre-Trip",
        };
      });

      setTasks(formattedTasks);
    } catch (error) {
      console.log("LOAD STAFF HOME DATA ERROR:", error);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  useEffect(() => {
    const interval = setInterval(() => { loadData(); }, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleNotificationPress = () => {
    setNotificationsVisible(true);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markStaffNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id || n.notification_id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.log("MARK READ ERROR:", e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllStaffNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.log("MARK ALL READ ERROR:", e);
    }
  };

  const [showSuccess, setShowSuccess] = useState(false);
  useEffect(() => {
    if (params.inspectionCompleted === "true") {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        router.replace("/(tabs)/home");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [params.inspectionCompleted]);

  const [showReportMessage, setShowReportMessage] = useState(false);
  useEffect(() => {
    if (params.reportSubmitted === "true") {
      setShowReportMessage(true);
      const timer = setTimeout(() => {
        setShowReportMessage(false);
        router.replace("/(tabs)/home");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [params.reportSubmitted]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={theme.header || ["#4F0A11", "#9E1E21"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <Header
            name={userName}
            avatar={userAvatar}
            unreadCount={unreadCount}
            onNotificationPress={handleNotificationPress}
          />
        </SafeAreaView>

        <View style={styles.overviewWrapper}>
          <OverviewCard
            pendingChecks={overview.preTripChecks + overview.postTripChecks}
            preTripChecks={overview.preTripChecks}
            checksCompleted={overview.checksCompleted}
            issuesReported={overview.issuesReported}
            preTripSubtitle={`${overview.preTripChecks} Pre-trip | ${overview.postTripChecks} Post-trip`}
            onPressPreTrip={() => router.push("/(tabs)/inspections")}
            onPressCompleted={() => router.push("/(tabs)/records")}
            onPressIssues={() => router.push("/ReportIssue")}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.overviewSpacer} />

        <View style={[styles.tasksCard, { backgroundColor: theme.surface }]}>
          <View style={styles.tasksHeader}>
            <Text style={[styles.tasksTitle, { color: theme.text }]}>{"Today's Tasks"}</Text>
            <Text style={[styles.viewAll, { color: theme.primary }]} onPress={() => router.push("/(tabs)/inspections")}>
              View All
            </Text>
          </View>

          <ScrollView
            style={styles.tasksScroll}
            contentContainerStyle={styles.tasksList}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {tasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-circle-outline" size={46} color="#45B63A" />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>All Caught Up!</Text>
                <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                  There are no pending vehicle inspections assigned for today.
                </Text>
              </View>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  image={task.image}
                  vehicle={task.vehicle}
                  type={task.type}
                  date={task.date}
                  time={task.time}
                  inspectionType={task.inspectionType}
                  onPress={() =>
                    router.push({
                      pathname: "/pre-inspection",
                      params: {
                        deliveryId: String(task.id),
                        type: task.inspectionType === "Post-Trip" ? "post_trip" : "pre_trip",
                        inspectionType: task.inspectionType,
                      },
                    })
                  }
                />
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {showSuccess && <SuccessCard />}
      {showReportMessage && <ReportMessage />}

      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={notificationsLoading}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E5E7F0",
  },
  header: {
    minHeight: 220,
    position: "relative",
    zIndex: 10,
  },
  safeHeader: {
    width: "100%",
  },
  overviewWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -82,
    zIndex: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  overviewSpacer: {
    height: 105,
  },
  tasksCard: {
    height: 500,
    marginHorizontal: 10,
    marginTop: 8,
    backgroundColor: "#F5F7FF",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  tasksHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  tasksTitle: {
    color: "#50515A",
    fontSize: 17,
    fontWeight: "700",
  },
  viewAll: {
    color: "#E53935",
    fontSize: 12,
    textDecorationLine: "underline",
  },
  tasksScroll: {
    flex: 1,
  },
  tasksList: {
    width: "100%",
    paddingBottom: 5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: "#3F414D",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: "#7E828F",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});