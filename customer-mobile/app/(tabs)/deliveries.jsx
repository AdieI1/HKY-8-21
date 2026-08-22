import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import DeliveryCard from "../../components/DeliveryCard";

const { width, height } = Dimensions.get("window");

export default function Deliveries() {
  const [selectedTab, setSelectedTab] = useState("active");
  const [showSort, setShowSort] = useState(false);
  const [sortOption, setSortOption] = useState("Sort");

  const sortOptions = [
    "Date",
    "A-Z",
    "Fragility",
    "Distance (Short - Long)",
    "Distance (Long - Short)",
  ];

  const deliveries = [
    {
      id: "1",
      cargoName: "Electronics Cargo",
      cargo: "Electronics",
      status: "intransit",
      route: "Port Area - Malaybalay",
      date: "March 30, 2026",
      driver: "John Jones",
      vehicle: "Fuso FJ 2828R",
      plate: "XYZ 1213",
      distance: "20 km",
    },

    {
      id: "2",
      cargoName: "Electronics Cargo",
      cargo: "Electronics",
      status: "delivered",
      route: "Port Area - Malaybalay",
      date: "March 28, 2026",
      driver: "John Jones",
      vehicle: "Fuso FJ 2828R",
      plate: "XYZ 1213",
      distance: "20 km",
    },
  ];

  const activeDeliveries = deliveries.filter(
    (item) => item.status !== "delivered"
  );

  const historyDeliveries = deliveries.filter(
    (item) => item.status === "delivered"
  );

  const displayedDeliveries =
    selectedTab === "active"
      ? activeDeliveries
      : historyDeliveries;

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* HEADER */}
      <AppHeader
        icon="document-text-outline"
        iconSize={30}
      />

      {/* BODY */}
      <View style={styles.body}>

        <View style={styles.card}>
          <View style={styles.cardContent}>

            {/* TITLE */}
            <View style={styles.headerRow}>
              <Text style={styles.Deliveries}>
                Deliveries
              </Text>

              <TouchableOpacity
                style={styles.sort}
                onPress={() => setShowSort(!showSort)}
              >
                <Text style={styles.sorttxt}>
                  {sortOption}
                </Text>

                <Ionicons
                  name="chevron-down"
                  size={14}
                  color="#0C56AD"
                />
              </TouchableOpacity>
            </View>

            {/* SORT DROPDOWN */}
            {showSort && (
              <View style={styles.dropdown}>
                {sortOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSortOption(item);
                      setShowSort(false);
                    }}
                  >
                    <Text style={styles.dropdownText}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.divider} />

            {/* TABS */}
            <View style={styles.tabRow}>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  selectedTab === "active" &&
                    styles.tabActive,
                ]}
                onPress={() => setSelectedTab("active")}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === "active" &&
                      styles.tabTextActive,
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  selectedTab === "history" &&
                    styles.tabActive,
                ]}
                onPress={() => setSelectedTab("history")}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === "history" &&
                      styles.tabTextActive,
                  ]}
                >
                  History
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </View>

        {/* DELIVERY CARDS */}
        <ScrollView
          style={styles.deliveryList}
          contentContainerStyle={styles.deliveryContent}
          showsVerticalScrollIndicator={false}
        >
          {displayedDeliveries.length > 0 ? (
            displayedDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onReview={() =>
                  console.log(
                    "Review:",
                    delivery.id
                  )
                }
              />
            ))
          ) : (
            <View style={styles.messageContainer}>
              <Text style={styles.message}>
                {selectedTab === "active"
                  ? "You have no active deliveries yet"
                  : "You don’t have any deliveries in your history"}
              </Text>
            </View>
          )}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },

  body: {
    flex: 1,
  },

  card: {
    backgroundColor: "#FFFFFF",
  },

  cardContent: {
    paddingHorizontal: width * 0.04,
    paddingTop: height * 0.02,
    paddingBottom: height * 0.015,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  Deliveries: {
    fontSize: width * 0.07,
    fontWeight: "bold",
    color: "#E53935",
    lineHeight: width * 0.08,
  },

  sort: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#DCE3F1",

    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.03,

    borderRadius: 12,
  },

  sorttxt: {
    color: "#3B5BDB",
    fontSize: width * 0.035,
    fontWeight: "600",
    marginRight: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "#CFCFCF",
    marginVertical: height * 0.015,
  },

  tabRow: {
    flexDirection: "row",
    gap: width * 0.03,
  },

  tabButton: {
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.05,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },

  tabActive: {
    backgroundColor: "#34B352",
  },

  tabText: {
    fontSize: width * 0.04,
    color: "#666",
    fontWeight: "500",
  },

  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  deliveryList: {
    flex: 1,
    backgroundColor: "#EDEEF5",
  },

  deliveryContent: {
    paddingHorizontal: width * 0.025,
    paddingTop: height * 0.015,
    paddingBottom: height * 0.12,
  },

  messageContainer: {
    marginTop: height * 0.03,
    alignItems: "center",
  },

  message: {
    color: "#666",
    fontSize: width * 0.04,
    textAlign: "center",
  },

  dropdown: {
    position: "absolute",
    top: height * 0.065,
    right: width * 0.04,

    backgroundColor: "#FFFFFF",

    borderRadius: 10,

    width: width * 0.6,

    paddingVertical: 6,

    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,

    elevation: 5,

    zIndex: 1000,
  },

  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  dropdownText: {
    fontSize: width * 0.035,
    color: "#333",
  },
});