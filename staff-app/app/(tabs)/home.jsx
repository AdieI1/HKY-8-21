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
import {
  getDeliveries,
  getIncidentReports,
  getSavedUser,
  getCurrentUser,
  resolveImageUrl,
} from "../../services/api";

const DEFAULT_IMAGE = require("../../assets/images/truckpic.jpg");

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [userName, setUserName] = useState("Staff");
  const [userAvatar, setUserAvatar] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [overview, setOverview] = useState({
    preTripChecks: 0,
    postTripChecks: 0,
    checksCompleted: 0,
    issuesReported: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const [savedUser, currentUser, deliveryList, reports] = await Promise.all([
        getSavedUser().catch(() => null),
        getCurrentUser().catch(() => null),
        getDeliveries().catch(() => []),
        getIncidentReports().catch(() => []),
      ]);

      const activeUser = currentUser || savedUser;
      if (activeUser?.full_name) {
        setUserName(activeUser.full_name);
      }
      const rawPhoto = activeUser?.profile_photo_url || activeUser?.profile_photo_path;
      if (rawPhoto) {
        setUserAvatar(resolveImageUrl(rawPhoto));
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

      // Only count checks completed today (0 if none completed yet)
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const currentDay = now.getDate();

      const parseDateSafe = (dateString) => {
        if (!dateString) return null;
        const cleaned = String(dateString).replace(/\.\d+Z?$/, "").replace(/Z$/, "").replace("T", " ");
        const parts = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):?(\d{2})?)?/);
        return parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : new Date(dateString);
      };

      const completedToday = deliveries.filter((d) =>
        d?.checklists?.some((c) => {
          if (!c?.completed_at) return false;
          const dt = parseDateSafe(c.completed_at);
          return (
            dt &&
            dt.getFullYear() === currentYear &&
            dt.getMonth() === currentMonth &&
            dt.getDate() === currentDay
          );
        })
      ).length;

      setOverview({
        preTripChecks: pendingPreTrip.length,
        postTripChecks: pendingPostTrip.length,
        checksCompleted: completedToday,
        issuesReported: incidentList.length,
      });

      // Show only active deliveries needing inspection
      const activeInspections = [...pendingPreTrip, ...pendingPostTrip];

      const formattedTasks = activeInspections.map((d) => {
        const vehicle = d?.vehicle;
        let brandModel = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ");
        brandModel = brandModel.replace(/^(\w+)\s+\1/i, "$1").trim();

        const plate = vehicle?.plate_number || `Delivery #${d?.delivery_id}`;
        const typeStr = brandModel || (vehicle?.type ? `${vehicle.type}` : "Fuso - Truck");

        const timeStr = d?.created_at
          ? new Date(d.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "10:00 AM";

        const resolvedUrl = resolveImageUrl(vehicle?.photo_url || vehicle?.photo);
        const imageSource = resolvedUrl ? { uri: resolvedUrl } : DEFAULT_IMAGE;

        const isPost = d?.checklists?.some((c) => c.type === "pre_trip");

        return {
          id: d?.delivery_id,
          vehicle: plate,
          type: typeStr,
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
    console.log("Notifications pressed");
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
    <View style={styles.screen}>
      <LinearGradient
        colors={["#4F0A11", "#9E1E21"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]} style={styles.safeHeader}>
          <Header
            name={userName}
            avatar={userAvatar}
            onNotificationPress={handleNotificationPress}
          />
        </SafeAreaView>

        <View style={styles.overviewWrapper}>
          <OverviewCard
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

        <View style={styles.tasksCard}>
          <View style={styles.tasksHeader}>
            <Text style={styles.tasksTitle}>{"Today's Tasks"}</Text>
            <Text style={styles.viewAll} onPress={() => router.push("/(tabs)/inspections")}>
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
                <Text style={styles.emptyTitle}>All Caught Up!</Text>
                <Text style={styles.emptySubtitle}>
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
                  time={task.time}
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