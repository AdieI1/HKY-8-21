import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import ReviewModal from "../../components/ReviewModal";
import { getMyDeliveryRequests, getToken, logout } from "../../services/api";
import { formatDeliveryRequest, isActiveDelivery } from "../../services/deliveries";

const { width, height } = Dimensions.get("window");

export default function Deliveries() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState("active");
  const [showSort, setShowSort] = useState(false);
  const [sortOption, setSortOption] = useState("Sort");
  const [deliveries, setDeliveries] = useState([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  const sortOptions = [
    "Date",
    "A-Z",
    "Fragility",
    "Distance (Short - Long)",
    "Distance (Long - Short)",
  ];

  const loadDeliveries = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const requests = await getMyDeliveryRequests();
      setDeliveries(
        requests
          .filter((request) => request.status !== "draft")
          .map(formatDeliveryRequest)
      );
    } catch (error) {
      if (error.message?.toLowerCase().includes("unauthenticated")) {
        await logout();
        router.replace("/login-page");
        return;
      }
      console.log("CUSTOMER DELIVERY SYNC ERROR:", error.message);
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
          await loadDeliveries();
        }
      })();

      const interval = setInterval(async () => {
        const token = await getToken();
        if (token) {
          loadDeliveries();
        }
      }, 10000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [loadDeliveries, router])
  );

  const activeDeliveries = deliveries.filter(isActiveDelivery);
  const historyDeliveries = deliveries.filter(
    (item) => ["delivered", "rejected"].includes(item.status)
  );

  const displayedDeliveries = useMemo(() => {
    const source = selectedTab === "active" ? activeDeliveries : historyDeliveries;
    const sorted = [...source];
    if (sortOption === "A-Z") sorted.sort((a, b) => a.cargoName.localeCompare(b.cargoName));
    if (sortOption === "Fragility") sorted.sort((a, b) => String(a.fragility).localeCompare(String(b.fragility)));
    if (sortOption === "Distance (Short - Long)") sorted.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    if (sortOption === "Distance (Long - Short)") sorted.sort((a, b) => parseFloat(b.distance) - parseFloat(a.distance));
    return sorted;
  }, [activeDeliveries, historyDeliveries, selectedTab, sortOption]);

  const handleOpenReview = (delivery) => {
    setSelectedDelivery(delivery);
    setReviewModalVisible(true);
  };

  const handleCloseReview = () => {
    setReviewModalVisible(false);
    setSelectedDelivery(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <AppHeader icon="document-text-outline" iconSize={30} />

      {/* BODY */}
      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.cardContent}>
            {/* TITLE */}
            <View style={styles.headerRow}>
              <Text style={styles.Deliveries}>Deliveries</Text>

              <TouchableOpacity
                style={styles.sort}
                onPress={() => setShowSort(!showSort)}
              >
                <Text style={styles.sorttxt}>{sortOption}</Text>
                <Ionicons name="chevron-down" size={14} color="#0C56AD" />
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
                    <Text style={styles.dropdownText}>{item}</Text>
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
                  selectedTab === "active" && styles.tabActive,
                ]}
                onPress={() => setSelectedTab("active")}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === "active" && styles.tabTextActive,
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  selectedTab === "history" && styles.tabActive,
                ]}
                onPress={() => setSelectedTab("history")}
              >
                <Text
                  style={[
                    styles.tabText,
                    selectedTab === "history" && styles.tabTextActive,
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
                onReview={handleOpenReview}
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

      {/* REVIEW MODAL */}
      <ReviewModal
        visible={reviewModalVisible}
        delivery={selectedDelivery}
        onClose={handleCloseReview}
        onSuccess={loadDeliveries}
      />
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