import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import HomeHeader from "../../../components/HomeHeader";
import HistoryCard from "../../../components/HistoryCard";
import EmptyAssignment from "../../../components/EmptyAssignment";
import { getMyDeliveries } from "../../../services/api";

const SORT_OPTIONS = ["Newest", "Oldest", "A-Z", "Z-A"];

export default function History() {
  const [sortOption, setSortOption] = useState("Newest");
  const [sortVisible, setSortVisible] = useState(false);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const deliveries = await getMyDeliveries();
      const list = Array.isArray(deliveries)
        ? deliveries.filter((d) => d?.status === "completed")
        : [];

      const formatted = list.map((delivery) => {
        const req = delivery?.request || {};
        const customer = req.customer || {};
        const reviews = delivery?.reviews || [];
        const review = reviews.length > 0 ? reviews[0] : null;
        const rating = review
          ? Number(review.driver_rating ?? review.overall_rating ?? 0)
          : null;

        const dateRaw =
          delivery?.end_time ||
          delivery?.updated_at ||
          delivery?.trip_date ||
          delivery?.created_at;
        const dateObj = dateRaw ? new Date(dateRaw) : new Date();
        const validDate = !isNaN(dateObj.getTime());

        return {
          id: String(delivery.delivery_id),
          customer: customer.full_name || "Customer",
          cargo: req.cargo_type || "Cargo",
          weight: req.weight != null ? `${req.weight}kg` : "—",
          pickup: req.pickup_address || "—",
          dropoff: req.dropoff_address || "—",
          date: validDate
            ? dateObj.toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "—",
          dateValue: validDate ? dateObj : new Date(0),
          rating: rating && rating > 0 ? rating : null,
          delivery,
        };
      });

      setCompletedDeliveries(formatted);
    } catch (err) {
      console.log("FETCH HISTORY ERROR:", err);
      setCompletedDeliveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory(false);
    }, [fetchHistory])
  );

  const sortedDeliveries = useMemo(() => {
    const sorted = [...completedDeliveries];
    if (sortOption === "Newest") {
      sorted.sort((a, b) => b.dateValue.getTime() - a.dateValue.getTime());
    } else if (sortOption === "Oldest") {
      sorted.sort((a, b) => a.dateValue.getTime() - b.dateValue.getTime());
    } else if (sortOption === "A-Z") {
      sorted.sort((a, b) => a.customer.localeCompare(b.customer));
    } else if (sortOption === "Z-A") {
      sorted.sort((a, b) => b.customer.localeCompare(a.customer));
    }
    return sorted;
  }, [completedDeliveries, sortOption]);

  const selectSort = (option) => {
    setSortOption(option);
    setSortVisible(false);
  };

  return (
    <View style={styles.container}>
      <HomeHeader />

      <View style={styles.titleRow}>
        <Text style={styles.title}>Delivery History</Text>

        <TouchableOpacity
          style={styles.sortButton}
          activeOpacity={0.7}
          onPress={() => setSortVisible(!sortVisible)}
        >
          <Text style={styles.sortText}>Sort</Text>
          <Ionicons
            name={sortVisible ? "chevron-up" : "chevron-down"}
            size={15}
            color="#53629B"
          />
        </TouchableOpacity>

        {sortVisible && (
          <View style={styles.sortMenu}>
            <Text style={styles.menuTitle}>Sort by</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.sortOption}
                activeOpacity={0.7}
                onPress={() => selectSort(opt)}
              >
                <Text
                  style={[
                    styles.optionText,
                    sortOption === opt && styles.selectedText,
                  ]}
                >
                  {opt}
                </Text>
                {sortOption === opt && (
                  <Ionicons name="checkmark" size={18} color="#F24848" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B91F27" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchHistory(true)}
              tintColor="#B91F27"
              colors={["#B91F27"]}
            />
          }
        >
          {sortedDeliveries.length > 0 ? (
            sortedDeliveries.map((delivery) => (
              <HistoryCard key={delivery.id} delivery={delivery} />
            ))
          ) : (
            <EmptyAssignment />
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
    height: 51,
    backgroundColor: "#F4F5FC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    position: "relative",
    zIndex: 10,
  },
  title: {
    fontSize: 21,
    fontWeight: "800",
    color: "#D62B2B",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D8DDF5",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 20,
  },
  sortText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#53629B",
    marginRight: 4,
  },
  sortMenu: {
    position: "absolute",
    top: 44,
    right: 12,
    width: 170,
    backgroundColor: "#F4F5FC",
    borderRadius: 9,
    paddingVertical: 7,
    elevation: 8,
    zIndex: 100,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#292A32",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sortOption: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  optionText: {
    fontSize: 14,
    color: "#44454C",
  },
  selectedText: {
    color: "#F24848",
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 9,
    paddingTop: 9,
    paddingBottom: 100,
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
});