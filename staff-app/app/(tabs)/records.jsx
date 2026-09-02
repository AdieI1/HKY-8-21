import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import SearchBar from "@/components/Records/SearchBar";
import VehicleRecords from "@/components/Records/VehicleRecords";

const TABS = ["All Records", "Pre-Trip", "Post-Trip", "Issues"];

const FILTERS = [
  { label: "Status", icon: "checkmark-circle-outline" },
  { label: "Date", icon: "calendar-outline" },
  { label: "A-Z", icon: "text-outline" },
  { label: "Latest", icon: "arrow-down-outline" },
  { label: "Oldest", icon: "arrow-up-outline" },
  { label: "Z-A", icon: "text-outline" },
];

const RECORDS = [
  {
    id: 1,
    date: "Today Sept 1, 2026",
    dateValue: 202609011030,
    vehicle: "ABC-1234",
    type: "FUSO - 10 Wheeler",
    time: "10:30 AM",
    inspectionType: "Pre-Trip",
    status: "Completed",
    image: require("../../assets/images/truckpic.jpg"),
  },
  {
    id: 2,
    date: "Today Sept 1, 2026",
    dateValue: 202609010930,
    vehicle: "ABC-1234",
    type: "FUSO - 10 Wheeler",
    time: "09:30 AM",
    inspectionType: "Post-Trip",
    status: "Completed with issues",
    image: require("../../assets/images/truckpic.jpg"),
  },
  {
    id: 3,
    date: "Today Sept 1, 2026",
    dateValue: 202609010925,
    vehicle: "ABC-1234",
    type: "FUSO - 10 Wheeler",
    time: "09:25 AM",
    inspectionType: "Pre-Trip",
    status: "Completed",
    image: require("../../assets/images/truckpic.jpg"),
  },
  {
    id: 4,
    date: "Today Sept 1, 2026",
    dateValue: 202609010920,
    vehicle: "ABC-1234",
    type: "FUSO - 10 Wheeler",
    time: "09:20 AM",
    inspectionType: "Post-Trip",
    status: "Completed",
    image: require("../../assets/images/truckpic.jpg"),
  },
  {
    id: 5,
    date: "August 31, 2026",
    dateValue: 202608311030,
    vehicle: "ABC-1234",
    type: "FUSO - 10 Wheeler",
    time: "10:30 AM",
    inspectionType: "Pre-Trip",
    status: "Completed",
    image: require("../../assets/images/truckpic.jpg"),
  },
  {
    id: 6,
    date: "August 31, 2026",
    dateValue: 202608310945,
    vehicle: "ABC-1234",
    type: "FUSO - 10 Wheeler",
    time: "09:45 AM",
    inspectionType: "Post-Trip",
    status: "Completed with issues",
    image: require("../../assets/images/truckpic.jpg"),
  },
  {
    id: 7,
    date: "August 31, 2026",
    dateValue: 202608310850,
    vehicle: "XYZ-5678",
    type: "FUSO - 6 Wheeler",
    time: "08:50 AM",
    inspectionType: "Pre-Trip",
    status: "Completed",
    image: require("../../assets/images/truckpic.jpg"),
  },
];

export default function Records() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All Records");
  const [activeFilter, setActiveFilter] = useState("Latest");
  const [showFilter, setShowFilter] = useState(false);

  const records = useMemo(() => {
    let result = RECORDS.filter((record) => {
      const query = search.toLowerCase();

      const matchesSearch =
        record.vehicle.toLowerCase().includes(query) ||
        record.type.toLowerCase().includes(query);

      const matchesTab =
        activeTab === "All Records" ||
        record.inspectionType === activeTab ||
        (activeTab === "Issues" &&
          record.status === "Completed with issues");

      return matchesSearch && matchesTab;
    });

    result.sort((a, b) => {
      switch (activeFilter) {
        case "A-Z":
          return a.vehicle.localeCompare(b.vehicle);

        case "Z-A":
          return b.vehicle.localeCompare(a.vehicle);

        case "Oldest":
          return a.dateValue - b.dateValue;

        case "Status":
          return (
            Number(b.status.includes("issues")) -
            Number(a.status.includes("issues"))
          );

        case "Date":
        case "Latest":
        default:
          return b.dateValue - a.dateValue;
      }
    });

    return result;
  }, [search, activeTab, activeFilter]);

  const groupedRecords = records.reduce((groups, record) => {
    if (!groups[record.date]) {
      groups[record.date] = [];
    }

    groups[record.date].push(record);
    return groups;
  }, {});

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <LinearGradient
        colors={["#4F0A11", "#9E1E21"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Checklist Records</Text>

            <Text style={styles.subtitle}>
              {"View all previous vehicle inspections\nand reported issues."}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.filterButton,
              pressed && styles.pressed,
            ]}
            onPress={() => setShowFilter(true)}
          >
            <Ionicons
              name="filter"
              size={18}
              color="#FFFFFF"
            />
          </Pressable>
        </View>
      </LinearGradient>

      {/* SEARCH BAR */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
      />

      {/* CONTENT */}
      <View style={styles.content}>
        {/* TABS BAR (FLAT DIVIDER STYLE LIKE FIGMA) */}
        <View style={styles.tabsContainer}>
          {TABS.map((tab) => {
            const selected = activeTab === tab;

            return (
              <Pressable
                key={tab}
                style={styles.tab}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    selected && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>

                {selected && (
                  <View style={styles.activeLine} />
                )}
              </Pressable>
            );
          })}
        </View>

        {/* SCROLLABLE RECORDS */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {Object.keys(groupedRecords).length > 0 ? (
            Object.entries(groupedRecords).map(
              ([date, items]) => (
                <View key={date}>
                  <Text style={styles.dateHeader}>
                    {date}
                  </Text>

                  {items.map((record) => (
                    <VehicleRecords
                      key={record.id}
                      image={record.image}
                      vehicle={record.vehicle}
                      type={record.type}
                      time={record.time}
                      inspectionType={
                        record.inspectionType
                      }
                      status={record.status}
                      onPress={() => router.push("/recorddetails")}
                    />
                  ))}
                </View>
              )
            )
          ) : (
            <View style={styles.empty}>
              <Ionicons
                name="document-text-outline"
                size={42}
                color="#9CA3AF"
              />

              <Text style={styles.emptyTitle}>
                No Records Found
              </Text>

              <Text style={styles.emptyText}>
                Try changing your search or filter.
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* FILTER MODAL */}
      <Modal
        transparent
        visible={showFilter}
        animationType="fade"
        onRequestClose={() => setShowFilter(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setShowFilter(false)}
        >
          <Pressable
            style={styles.filterModal}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Filter & Sort
              </Text>

              <Pressable
                onPress={() => setShowFilter(false)}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color="#666872"
                />
              </Pressable>
            </View>

            {FILTERS.map((filter) => {
              const selected =
                activeFilter === filter.label;

              return (
                <Pressable
                  key={filter.label}
                  style={[
                    styles.filterOption,
                    selected && styles.selectedFilter,
                  ]}
                  onPress={() => {
                    setActiveFilter(filter.label);
                    setShowFilter(false);
                  }}
                >
                  <View style={styles.filterLeft}>
                    <Ionicons
                      name={filter.icon}
                      size={19}
                      color={
                        selected
                          ? "#E32E2E"
                          : "#777984"
                      }
                    />

                    <Text
                      style={[
                        styles.filterText,
                        selected && styles.selectedText,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </View>

                  {selected && (
                    <Ionicons
                      name="checkmark"
                      size={19}
                      color="#E32E2E"
                    />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F8",
  },

  header: {
    paddingTop: 46,
    paddingBottom: 38,
    paddingHorizontal: 16,
    zIndex: 10,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  headerTextWrap: {
    flex: 1,
    marginRight: 12,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
    letterSpacing: -0.3,
  },

  subtitle: {
    color: "#F3D8DA",
    fontSize: 12.5,
    lineHeight: 17,
  },

  filterButton: {
    width: 36,
    height: 36,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  pressed: {
    opacity: 0.65,
  },

  content: {
    flex: 1,
  },

  tabsContainer: {
    flexDirection: "row",
    height: 42,
    marginHorizontal: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E5EE",
  },

  tab: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  tabText: {
    color: "#71747E",
    fontSize: 13,
    fontWeight: "500",
  },

  activeTabText: {
    color: "#E32E2E",
    fontWeight: "700",
  },

  activeLine: {
    position: "absolute",
    bottom: -1,
    left: 4,
    right: 4,
    height: 2.5,
    backgroundColor: "#E32E2E",
    borderRadius: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },

  dateHeader: {
    color: "#1F2937",
    fontSize: 14.5,
    fontWeight: "700",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },

  empty: {
    alignItems: "center",
    paddingTop: 80,
  },

  emptyTitle: {
    color: "#4B5563",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },

  emptyText: {
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 4,
  },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },

  filterModal: {
    width: "84%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  modalHeader: {
    height: 45,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginBottom: 4,
  },

  modalTitle: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "700",
  },

  filterOption: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  selectedFilter: {
    backgroundColor: "#FEE2E2",
  },

  filterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  filterText: {
    color: "#4B5563",
    fontSize: 13,
  },

  selectedText: {
    color: "#E32E2E",
    fontWeight: "600",
  },
});