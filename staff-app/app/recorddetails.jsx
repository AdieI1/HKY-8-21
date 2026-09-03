import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ChecklistInfo from "@/components/Details/ChecklistInfo";
import DetailsCard from "@/components/Details/DetailsCard";
import DetailsHeader from "@/components/Details/DetailsHeader";
import DetailsInfo from "@/components/Details/DetailsInfo";
import Photos from "@/components/Details/Photos";
import { getDeliveries, getDelivery, getIncidentReports, resolveImageUrl } from "../services/api";

const DEFAULT_IMAGE = require("../assets/images/truckpic.jpg");

const ITEM_LABELS = {
  exterior_condition: "Vehicle body and exterior condition",
  mirrors_windows: "Mirrors, windows and windshield",
  doors_locks: "Doors and locks secured",
  tire_wheel_condition: "Tire and wheel condition",
  tire_pressure: "Tire pressure",
  wheel_components: "Complete wheel components",
  headlights_exterior: "Headlights and exterior lights functional",
  brake_signal_lights: "Brake and signal lights working",
  hazard_reflectors: "Functional Hazard lights and reflectors",
  braking_system: "Braking system functional",
  steering_suspension: "Steering and suspension working",
  engine_performance: "Good engine performance",
  no_noises_warning: "No unusual noises, vibrations or warning indicators",
  no_fuel_leaks: "No visible fuel leaks",
  fire_extinguisher: "Fire extinguisher available",
  warning_triangle: "Warning triangle, reflective equipment available",
  emergency_safety_equip: "Emergency and safety equipment available",
  first_aid_kit: "First aid kit available",
  cargo_area_secured: "Cargo area secured",
  cargo_securing_equip: "Cargo securing equipment on board",
  no_cargo_damage: "No cargo area damage",
  vehicle_inspection: "Vehicle Inspection Conducted",
  drivers_license: "Valid Drivers License",
  or_cr: "OR/CR Available",
  tires: "Tires Checked",
  lights_signals: "Operational Lights and Signals",
  emergency_tools: "Complete Emergency Tools",
  ppe: "PPE Available",
};

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

export default function RecordDetails() {
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState("Checklist");
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);

  const loadRecord = useCallback(async () => {
    try {
      setLoading(true);
      let delivery = null;
      const targetDeliveryId = params?.deliveryId;

      if (targetDeliveryId) {
        delivery = await getDelivery(targetDeliveryId).catch(() => null);
      }

      if (!delivery) {
        const list = await getDeliveries().catch(() => []);
        delivery = list.find((d) => d?.checklists && d.checklists.length > 0) || list[0] || null;
      }

      if (!delivery) {
        setLoading(false);
        return;
      }

      const reports = await getIncidentReports().catch(() => []);
      const checklists = Array.isArray(delivery.checklists) ? delivery.checklists : [];

      let targetChecklist = null;
      if (params?.checklistId) {
        targetChecklist = checklists.find((c) => String(c.checklist_id) === String(params.checklistId));
      }
      if (!targetChecklist && params?.type) {
        targetChecklist = checklists.find((c) => c.type === params.type);
      }
      if (!targetChecklist) {
        targetChecklist = checklists[0] || null;
      }

      const vehicle = delivery.vehicle;
      let brandModel = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ").replace(/^(\w+)\s+\1/i, "$1").trim();
      const plate = vehicle?.plate_number || `Delivery #${delivery.delivery_id}`;
      const typeStr = brandModel || (vehicle?.type ? `${vehicle.type}` : "FUSO - 10 Wheeler");

      const completedAt = targetChecklist?.completed_at || targetChecklist?.created_at || delivery.created_at;
      const dateObj = parseDateSafe(completedAt);

      const rawMonth = dateObj.toLocaleDateString("en-US", { month: "short" });
      const month = rawMonth === "Sep" ? "Sept" : rawMonth;
      const dateStr = `${month} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
      const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      const isPost = targetChecklist?.type === "post_trip" || params?.type === "post_trip";
      const inspectionType = isPost ? "Post-Trip" : "Pre-Trip";

      const hasIncident = Array.isArray(reports) && reports.some((r) => String(r?.delivery_id) === String(delivery.delivery_id));
      const hasItemIssue = targetChecklist?.items && typeof targetChecklist.items === "object" && Object.values(targetChecklist.items).some((v) => v === false);
      const status = hasIncident || hasItemIssue ? "Completed with issues" : "Completed";

      const odoReading = targetChecklist?.starting_odometer || targetChecklist?.ending_odometer || vehicle?.odometer_reading;
      const odometer = odoReading ? `${Number(odoReading).toLocaleString()} km` : "67,000 km";

      const resolvedPhoto = resolveImageUrl(vehicle?.photo_url || vehicle?.photo);
      const image = resolvedPhoto ? { uri: resolvedPhoto } : DEFAULT_IMAGE;

      let checklistItems = null;
      if (targetChecklist?.items && typeof targetChecklist.items === "object") {
        checklistItems = Object.entries(targetChecklist.items).map(([key, val]) => ({
          label: ITEM_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          status: val === false ? "Issue" : "Good",
        }));
      }

      // Only include photos actually uploaded for this inspection (do not use vehicle photo)
      const photos = [];
      if (Array.isArray(targetChecklist?.photos)) {
        targetChecklist.photos.forEach((p) => {
          const resolved = resolveImageUrl(p);
          if (resolved) photos.push({ uri: resolved });
        });
      } else if (typeof targetChecklist?.photo === "string" && targetChecklist.photo) {
        const resolved = resolveImageUrl(targetChecklist.photo);
        if (resolved) photos.push({ uri: resolved });
      } else if (targetChecklist?.items?.photos && Array.isArray(targetChecklist.items.photos)) {
        targetChecklist.items.photos.forEach((p) => {
          const resolved = resolveImageUrl(p);
          if (resolved) photos.push({ uri: resolved });
        });
      }

      setRecord({
        vehicle: plate,
        type: typeStr,
        odometer,
        date: dateStr,
        time: timeStr,
        inspectionType,
        status,
        image,
        checklistItems,
        photos,
      });
    } catch (err) {
      console.log("LOAD RECORD DETAILS ERROR:", err);
    } finally {
      setLoading(false);
    }
  }, [params?.deliveryId, params?.checklistId, params?.type]);

  useFocusEffect(
    useCallback(() => {
      loadRecord();
    }, [loadRecord])
  );

  return (
    <View style={styles.screen}>
      <DetailsHeader />

      {loading && !record ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#E32E2E" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <DetailsCard
            image={record?.image || DEFAULT_IMAGE}
            vehicle={record?.vehicle || "ABC-1234"}
            type={record?.type || "FUSO - 10 Wheeler"}
            odometer={record?.odometer || "67,000 km"}
          />

          <DetailsInfo
            date={record?.date || "Sept 1, 2026"}
            time={record?.time || "10:30 AM"}
            inspectionType={record?.inspectionType || "Pre-Trip"}
            status={record?.status || "Completed"}
          />

          <View style={styles.tabs}>
            <View style={[styles.tab, activeTab === "Checklist" && styles.activeTab]}>
              <DetailsTab
                title="Checklist"
                active={activeTab === "Checklist"}
                onPress={() => setActiveTab("Checklist")}
              />
            </View>

            <View style={[styles.tab, activeTab === "Photos" && styles.activeTab]}>
              <DetailsTab
                title="Photos"
                active={activeTab === "Photos"}
                onPress={() => setActiveTab("Photos")}
              />
            </View>
          </View>

          {activeTab === "Checklist" ? (
            <ChecklistInfo items={record?.checklistItems} />
          ) : (
            <Photos photos={record?.photos} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

function DetailsTab({ title, active, onPress }) {
  return (
    <Pressable style={styles.tabButton} onPress={onPress}>
      <Text style={[styles.tabText, active && styles.activeTabText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E5E7F0",
  },
  loadingBox: {
    paddingTop: 80,
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 90,
  },
  tabs: {
    height: 43,
    marginHorizontal: 8,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#C8CBD5",
  },
  tab: {
    flex: 1,
    height: 43,
    position: "relative",
  },
  activeTab: {
    borderBottomWidth: 1,
    borderBottomColor: "#E32E2E",
  },
  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabText: {
    color: "#666872",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: "#E32E2E",
  },
});
