import {StyleSheet,View,Text,ScrollView,TouchableOpacity,} from "react-native";
import { useMemo, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

import HomeHeader from "../../../components/HomeHeader";
import HistoryCard from "../../../components/HistoryCard";

export default function History() {
  const [sortOption, setSortOption] = useState("Newest");
  const [sortVisible, setSortVisible] = useState(false);

  const deliveries = [
    {
      id: "1",
      customer: "Stark Enterprises",
      cargo: "Construction",
      weight: "10,700kg",
      pickup:
        "Gusa Purok 3A, Cagayan De Oro City",
      dropoff:
        "Zone 7, GHQ8+QMR, Molugan, City of El Salvador, 9017 Misamis Oriental",
      date: "March 26 2027",
      dateValue: new Date("2027-03-26"),
    },

    {
      id: "2",
      customer: "Sean Benedict",
      cargo: "Furniture",
      weight: "12,700kg",
      pickup:
        "HQMC+666, Villanueva, Misamis Oriental",
      dropoff:
        "Zone 7, GHQ8+QMR, Molugan, City of El Salvador, 9017 Misamis Oriental",
      date: "March 25 2027",
      dateValue: new Date("2027-03-25"),
    },

    {
      id: "3",
      customer: "Baxter Enterprises",
      cargo: "Electronics",
      weight: "15,700kg",
      pickup:
        "C3 road, Hinaplanon, Iligan City, 9200 Lanao del Norte",
      dropoff:
        "Zone 7, GHQ8+QMR, Molugan, City of El Salvador, 9017 Misamis Oriental",
      date: "March 25 2027",
      dateValue: new Date("2027-03-25"),
    },
  ];

  const sortedDeliveries = useMemo(() => {
    const sorted = [...deliveries];

    if (sortOption === "Newest") {
      sorted.sort(
        (a, b) =>
          b.dateValue.getTime() -
          a.dateValue.getTime()
      );
    }

    if (sortOption === "Oldest") {
      sorted.sort(
        (a, b) =>
          a.dateValue.getTime() -
          b.dateValue.getTime()
      );
    }

    if (sortOption === "A-Z") {
      sorted.sort((a, b) =>
        a.customer.localeCompare(b.customer)
      );
    }

    if (sortOption === "Z-A") {
      sorted.sort((a, b) =>
        b.customer.localeCompare(a.customer)
      );
    }

    return sorted;
  }, [sortOption]);

  const selectSort = (option) => {
    setSortOption(option);
    setSortVisible(false);
  };

  return (
    <View style={styles.container}>
      <HomeHeader />

      <View style={styles.titleRow}>
        <Text style={styles.title}>
          Delivery History
        </Text>

        <TouchableOpacity
          style={styles.sortButton}
          activeOpacity={0.7}
          onPress={() => setSortVisible(!sortVisible)}
        >
          <Text style={styles.sortText}>
            Sort
          </Text>

          <Ionicons
            name={
              sortVisible
                ? "chevron-up"
                : "chevron-down"
            }
            size={15}
            color="#53629B"
          />
        </TouchableOpacity>

        {sortVisible && (
          <View style={styles.sortMenu}>
            <Text style={styles.menuTitle}>
              Sort by
            </Text>

            <TouchableOpacity
              style={styles.sortOption}
              activeOpacity={0.7}
              onPress={() => selectSort("Newest")}
            >
              <Text
                style={[
                  styles.optionText,
                  sortOption === "Newest" &&
                    styles.selectedText,
                ]}
              >
                Newest
              </Text>

              {sortOption === "Newest" && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="#F24848"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              activeOpacity={0.7}
              onPress={() => selectSort("Oldest")}
            >
              <Text
                style={[
                  styles.optionText,
                  sortOption === "Oldest" &&
                    styles.selectedText,
                ]}
              >
                Oldest
              </Text>

              {sortOption === "Oldest" && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="#F24848"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              activeOpacity={0.7}
              onPress={() => selectSort("A-Z")}
            >
              <Text
                style={[
                  styles.optionText,
                  sortOption === "A-Z" &&
                    styles.selectedText,
                ]}
              >
                A-Z
              </Text>

              {sortOption === "A-Z" && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="#F24848"
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sortOption}
              activeOpacity={0.7}
              onPress={() => selectSort("Z-A")}
            >
              <Text
                style={[
                  styles.optionText,
                  sortOption === "Z-A" &&
                    styles.selectedText,
                ]}
              >
                Z-A
              </Text>

              {sortOption === "Z-A" && (
                <Ionicons
                  name="checkmark"
                  size={18}
                  color="#F24848"
                />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {sortedDeliveries.map((delivery) => (
          <HistoryCard
            key={delivery.id}
            delivery={delivery}
          />
        ))}
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
    shadowOffset: {
      width: 0,
      height: 3,
    },
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
});