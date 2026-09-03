import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import SearchBar from "@/components/Records/SearchBar";
import VehicleRecords from "@/components/Records/VehicleRecords";
import { getDeliveries, getIncidentReports, resolveImageUrl } from "../../services/api";

const DEFAULT_IMAGE = require("../../assets/images/truckpic.jpg");
const TABS = ["All Records", "Pre-Trip", "Post-Trip", "Issues"];
const FILTERS = [
  { label: "Status", icon: "checkmark-circle-outline" },
  { label: "Date", icon: "calendar-outline" },
  { label: "A-Z", icon: "text-outline" },
  { label: "Latest", icon: "arrow-down-outline" },
  { label: "Oldest", icon: "arrow-up-outline" },
  { label: "Z-A", icon: "text-outline" },
];

const parseDateSafe = (dateString) => {
  if (!dateString) return new Date();
  const cleaned = String(dateString).replace(/\.\d+Z?$/, "").replace(/Z$/, "").replace("T", " ");
  const parts = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):?(\d{2})?)?/);
  if (parts) {
    return new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]), Number(parts[4] || 0), Number(parts[5] || 0), Number(parts[6] || 0));
  }
  const fallback = new Date(dateString);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
};

const formatRecordDate = (dateObj) => {
  const now = new Date();
  const isToday = dateObj.getFullYear() === now.getFullYear() && dateObj.getMonth() === now.getMonth() && dateObj.getDate() === now.getDate();
  const rawMonth = dateObj.toLocaleDateString("en-US", { month: "short" });
  const month = rawMonth === "Sep" ? "Sept" : rawMonth;
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();
  return isToday ? `Today ${month} ${day}, ${year}` : `${month} ${day}, ${year}`;
};

export default function Records() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(params?.tab || "All Records");
  const [activeFilter, setActiveFilter] = useState("Latest");
  const [showFilter, setShowFilter] = useState(false);
  const [rawRecords, setRawRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [deliveryList, reports] = await Promise.all([
        getDeliveries().catch(() => []),
        getIncidentReports().catch(() => []),
      ]);
      const deliveries = Array.isArray(deliveryList) ? deliveryList : [];
      const incidentList = Array.isArray(reports) ? reports : [];
      const issueDeliveryIds = new Set(incidentList.map((r) => String(r?.delivery_id || r?.delivery?.delivery_id)));

      const items = [];
      deliveries.forEach((d) => {
        const checklists = Array.isArray(d?.checklists) ? d.checklists : [];
        const vehicle = d?.vehicle;
        let brandModel = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ").replace(/^(\w+)\s+\1/i, "$1").trim();
        const plate = vehicle?.plate_number || `Delivery #${d?.delivery_id}`;
        const typeStr = brandModel || (vehicle?.type ? `${vehicle.type}` : "FUSO - Truck");
        const resolvedPhoto = resolveImageUrl(vehicle?.photo_url || vehicle?.photo);
        const imageSource = resolvedPhoto ? { uri: resolvedPhoto } : DEFAULT_IMAGE;
        const hasDeliveryIssue = issueDeliveryIds.has(String(d?.delivery_id));

        checklists.forEach((c) => {
          const completedAt = c?.completed_at || c?.created_at || d?.created_at;
          const dateObj = parseDateSafe(completedAt);
          const inspectionType = c?.type === "post_trip" ? "Post-Trip" : "Pre-Trip";
          const hasChecklistIssue = hasDeliveryIssue || (c?.items && typeof c.items === "object" && Object.values(c.items).some((v) => v === false));
          const status = hasChecklistIssue ? "Completed with issues" : "Completed";

          items.push({
            id: `${d?.delivery_id}-${c?.checklist_id || c?.type}`,
            deliveryId: d?.delivery_id,
            checklistId: c?.checklist_id,
            date: formatRecordDate(dateObj),
            dateValue: dateObj.getTime(),
            vehicle: plate,
            type: typeStr,
            time: dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            inspectionType,
            status,
            image: imageSource,
            checklist: c,
            delivery: d,
          });
        });
      });
      setRawRecords(items);
    } catch (error) {
      console.log("LOAD RECORDS ERROR:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const records = useMemo(() => {
    const query = search.trim().toLowerCase();
    let result = rawRecords.filter((record) => {
      const matchesSearch = !query || record.vehicle.toLowerCase().includes(query) || record.type.toLowerCase().includes(query) || record.inspectionType.toLowerCase().includes(query) || record.date.toLowerCase().includes(query);
      const matchesTab = activeTab === "All Records" || (activeTab === "Issues" ? record.status === "Completed with issues" : record.inspectionType === activeTab);
      return matchesSearch && matchesTab;
    });

    result.sort((a, b) => {
      switch (activeFilter) {
        case "A-Z": return a.vehicle.localeCompare(b.vehicle);
        case "Z-A": return b.vehicle.localeCompare(a.vehicle);
        case "Oldest": return a.dateValue - b.dateValue;
        case "Status": return Number(b.status.includes("issues")) - Number(a.status.includes("issues"));
        case "Date":
        case "Latest":
        default: return b.dateValue - a.dateValue;
      }
    });
    return result;
  }, [rawRecords, search, activeTab, activeFilter]);

  const groupedRecords = useMemo(() => {
    return records.reduce((groups, record) => {
      if (!groups[record.date]) groups[record.date] = [];
      groups[record.date].push(record);
      return groups;
    }, {});
  }, [records]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#4F0A11", "#9E1E21"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Checklist Records</Text>
            <Text style={styles.subtitle}>{"View all previous vehicle inspections\nand reported issues."}</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]} onPress={() => setShowFilter(true)}>
            <Ionicons name="filter" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </LinearGradient>

      <SearchBar value={search} onChangeText={setSearch} />

      <View style={styles.content}>
        <View style={styles.tabsContainer}>
          {TABS.map((tab) => {
            const selected = activeTab === tab;
            return (
              <Pressable key={tab} style={styles.tab} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, selected && styles.activeTabText]}>{tab}</Text>
                {selected && <View style={styles.activeLine} />}
              </Pressable>
            );
          })}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E32E2E" colors={["#E32E2E"]} />}
        >
          {loading && rawRecords.length === 0 ? (
            <View style={styles.loadingBox}><ActivityIndicator size="large" color="#E32E2E" /></View>
          ) : Object.keys(groupedRecords).length > 0 ? (
            Object.entries(groupedRecords).map(([date, items]) => (
              <View key={date}>
                <Text style={styles.dateHeader}>{date}</Text>
                {items.map((record) => (
                  <VehicleRecords
                    key={record.id}
                    image={record.image}
                    vehicle={record.vehicle}
                    type={record.type}
                    time={record.time}
                    inspectionType={record.inspectionType}
                    status={record.status}
                    onPress={() => router.push({ pathname: "/recorddetails", params: { deliveryId: String(record.deliveryId), checklistId: String(record.checklistId || ""), type: record.inspectionType === "Post-Trip" ? "post_trip" : "pre_trip" } })}
                  />
                ))}
              </View>
            ))
          ) : (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={42} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Records Found</Text>
              <Text style={styles.emptyText}>{search ? "No records match your search." : "No checklist records available."}</Text>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal transparent visible={showFilter} animationType="fade" onRequestClose={() => setShowFilter(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowFilter(false)}>
          <Pressable style={styles.filterModal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <Pressable onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={22} color="#666872" />
              </Pressable>
            </View>
            {FILTERS.map((filter) => {
              const selected = activeFilter === filter.label;
              return (
                <Pressable
                  key={filter.label}
                  style={[styles.filterOption, selected && styles.selectedFilter]}
                  onPress={() => { setActiveFilter(filter.label); setShowFilter(false); }}
                >
                  <View style={styles.filterLeft}>
                    <Ionicons name={filter.icon} size={19} color={selected ? "#E32E2E" : "#777984"} />
                    <Text style={[styles.filterText, selected && styles.selectedText]}>{filter.label}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark" size={19} color="#E32E2E" />}
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
  screen: { flex: 1, backgroundColor: "#F3F4F8" },
  header: { paddingTop: 46, paddingBottom: 38, paddingHorizontal: 16, zIndex: 10 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  headerTextWrap: { flex: 1, marginRight: 12 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "700", marginBottom: 4, letterSpacing: -0.3 },
  subtitle: { color: "#F3D8DA", fontSize: 12.5, lineHeight: 17 },
  filterButton: { width: 36, height: 36, borderWidth: 1.5, borderColor: "#FFFFFF", borderRadius: 18, justifyContent: "center", alignItems: "center", marginTop: 4 },
  pressed: { opacity: 0.65 },
  content: { flex: 1 },
  tabsContainer: { flexDirection: "row", height: 42, marginHorizontal: 16, marginTop: 8, borderBottomWidth: 1, borderBottomColor: "#E2E5EE" },
  tab: { flex: 1, height: "100%", justifyContent: "center", alignItems: "center", position: "relative" },
  tabText: { color: "#71747E", fontSize: 13, fontWeight: "500" },
  activeTabText: { color: "#E32E2E", fontWeight: "700" },
  activeLine: { position: "absolute", bottom: -1, left: 4, right: 4, height: 2.5, backgroundColor: "#E32E2E", borderRadius: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: 4, paddingBottom: 100 },
  loadingBox: { paddingTop: 60, alignItems: "center" },
  dateHeader: { color: "#1F2937", fontSize: 14.5, fontWeight: "700", marginHorizontal: 16, marginTop: 12, marginBottom: 8 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyTitle: { color: "#4B5563", fontSize: 15, fontWeight: "700", marginTop: 10 },
  emptyText: { color: "#9CA3AF", fontSize: 12, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" },
  filterModal: { width: "84%", backgroundColor: "#FFFFFF", borderRadius: 12, padding: 12, elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  modalHeader: { height: 45, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", marginBottom: 4 },
  modalTitle: { color: "#1F2937", fontSize: 16, fontWeight: "700" },
  filterOption: { height: 44, borderRadius: 8, paddingHorizontal: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  selectedFilter: { backgroundColor: "#FEE2E2" },
  filterLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  filterText: { color: "#4B5563", fontSize: 13 },
  selectedText: { color: "#E32E2E", fontWeight: "600" },
});