import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import InspectionCard from "@/components/InspectionCard";
import InspectionHeader from "@/components/InspectionHeader";
import { getDeliveries, resolveImageUrl } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const DEFAULT_IMAGE = require("../../assets/images/truckpic.jpg");

export default function Inspections() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState(params?.tab || "All Inspections");
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const todayDateStr = useMemo(() => {
    const now = new Date();
    const month = now.toLocaleDateString("en-US", { month: "short" });
    const day = now.getDate();
    const year = now.getFullYear();
    return `Today ${month} ${day}, ${year}`;
  }, []);

  const loadData = useCallback(async () => {
    try {
      const deliveryList = await getDeliveries().catch(() => []);
      const deliveries = Array.isArray(deliveryList) ? deliveryList : [];

      const pendingPreTrip = deliveries.filter(
        (d) =>
          !d?.checklists?.some((c) => c.type === "pre_trip") &&
          ["assigned", "pending", "accepted"].includes(d?.status)
      );

      const pendingPostTrip = deliveries.filter(
        (d) =>
          d?.checklists?.some((c) => c.type === "pre_trip") &&
          !d?.checklists?.some((c) => c.type === "post_trip") &&
          ["in_transit", "arrived", "delivered", "returning_to_hq", "accepted", "completed"].includes(d?.status)
      );

      const formatItem = (d, type) => {
        const vehicle = d?.vehicle;
        let brandModel = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ");
        brandModel = brandModel.replace(/^(\w+)\s+\1/i, "$1").trim();

        const plate = vehicle?.plate_number || `Delivery #${d?.delivery_id}`;
        const typeStr = brandModel || (vehicle?.type ? `${vehicle.type}` : "FUSO - Truck");

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
        const timeStr = dateObj.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        const resolvedUrl = resolveImageUrl(vehicle?.photo_url || vehicle?.photo);
        const imageSource = resolvedUrl ? { uri: resolvedUrl } : DEFAULT_IMAGE;

        return {
          id: d?.delivery_id,
          vehicle: plate,
          vehicleType: typeStr,
          time: `${dateStr} • ${timeStr}`,
          inspectionType: type,
          status: "Pending",
          image: imageSource,
          delivery: d,
        };
      };

      const preTripItems = pendingPreTrip.map((d) => formatItem(d, "Pre-Trip"));
      const postTripItems = pendingPostTrip.map((d) => formatItem(d, "Post-Trip"));

      setInspections([...preTripItems, ...postTripItems]);
    } catch (error) {
      console.log("LOAD INSPECTIONS ERROR:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 6000);
    return () => clearInterval(interval);
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const filteredInspections =
    activeTab === "All Inspections"
      ? inspections
      : inspections.filter((item) => item.inspectionType === activeTab);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* =================================
          HEADER
      ================================= */}
      <InspectionHeader />

      {/* =================================
          OVERLAPPING CONTENT
      ================================= */}
      <View
        style={[
          styles.panel,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            borderWidth: darkMode ? 1 : 0,
          },
        ]}
      >
        {/* =================================
            TABS
        ================================= */}
        <View
          style={[
            styles.tabsContainer,
            {
              backgroundColor: theme.surface,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Tab
            title="All Inspections"
            active={activeTab === "All Inspections"}
            onPress={() => setActiveTab("All Inspections")}
            activeColor={theme.primary}
            inactiveColor={theme.secondaryText}
          />

          <Tab
            title="Pre-Trip"
            active={activeTab === "Pre-Trip"}
            onPress={() => setActiveTab("Pre-Trip")}
            activeColor={theme.primary}
            inactiveColor={theme.secondaryText}
          />

          <Tab
            title="Post-Trip"
            active={activeTab === "Post-Trip"}
            onPress={() => setActiveTab("Post-Trip")}
            activeColor={theme.primary}
            inactiveColor={theme.secondaryText}
          />
        </View>

        {/* =================================
            DATE
        ================================= */}
        <View style={[styles.dateContainer, { backgroundColor: theme.surface }]}>
          <Text style={[styles.dateText, { color: theme.text }]}>{todayDateStr}</Text>
        </View>

        {/* =================================
            CARDS
        ================================= */}
        <ScrollView
          style={[styles.cardList, { backgroundColor: theme.surface }]}
          contentContainerStyle={styles.cardListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#E53935"
              colors={["#E53935"]}
            />
          }
        >
          {loading && inspections.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E53935" />
            </View>
          ) : filteredInspections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={46} color="#45B63A" />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Pending Inspections</Text>
              <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                {activeTab === "All Inspections"
                  ? "There are no pending inspections to be conducted."
                  : `There are no pending ${activeTab.toLowerCase()} inspections.`}
              </Text>
            </View>
          ) : (
            filteredInspections.map((inspection) => (
              <InspectionCard
                key={`${inspection.id}-${inspection.inspectionType}`}
                image={inspection.image}
                vehicle={inspection.vehicle}
                vehicleType={inspection.vehicleType}
                time={inspection.time}
                inspectionType={inspection.inspectionType}
                status={inspection.status}
                onPress={() => {
                  router.push({
                    pathname: "/pre-inspection",
                    params: {
                      deliveryId: String(inspection.id),
                      type: inspection.inspectionType === "Post-Trip" ? "post_trip" : "pre_trip",
                      inspectionType: inspection.inspectionType,
                    },
                  });
                }}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

/* =========================================
   TAB
========================================= */
function Tab({ title, active, onPress, activeColor, inactiveColor }) {
  return (
    <Text
      onPress={onPress}
      style={[
        styles.tabText,
        {
          color: active ? activeColor || "#E53935" : inactiveColor || "#898A91",
          borderBottomWidth: active ? 2 : 0,
          borderBottomColor: active ? activeColor || "#E53935" : "transparent",
        },
      ]}
    >
      {title}
    </Text>
  );
}

/* =========================================
   STYLES
========================================= */
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E5E7F0",
  },

  panel: {
    flex: 1,
    marginTop: -82,
    marginHorizontal: 10,
    backgroundColor: "#F5F7FF",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    zIndex: 20,
  },

  tabsContainer: {
    height: 43,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FF",
    borderBottomWidth: 1,
    borderBottomColor: "#D0D2DA",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
  },

  tabText: {
    flex: 1,
    height: 43,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#898A91",
    fontSize: 14,
    fontWeight: "400",
  },

  tabTextActive: {
    color: "#E53935",
    borderBottomWidth: 2,
    borderBottomColor: "#E53935",
  },

  dateContainer: {
    height: 43,
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "#F5F7FF",
  },

  dateText: {
    color: "#4E5058",
    fontSize: 15,
    fontWeight: "700",
  },

  cardList: {
    flex: 1,
    backgroundColor: "#F5F7FF",
    paddingHorizontal: 8,
  },

  cardListContent: {
    paddingTop: 2,
    paddingBottom: 100,
  },

  loadingContainer: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2D35",
    marginTop: 10,
    marginBottom: 4,
  },

  emptySubtitle: {
    fontSize: 12.5,
    color: "#7E808C",
    textAlign: "center",
    lineHeight: 18,
  },
});