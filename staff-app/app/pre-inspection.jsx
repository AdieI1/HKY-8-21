import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import InspectionChecklistCard, { CHECKLIST_CATEGORIES } from "@/components/preInspection/InspectionChecklistCard";
import VehicleInspectionCard from "@/components/preInspection/VehicleInspectionCard";
import {
  getDeliveries,
  getDelivery,
  resolveImageUrl,
  saveChecklist,
} from "../services/api";

const DEFAULT_TRUCK_IMAGE = require("../assets/images/truckpic.jpg");

export default function PreInspection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isPost = params?.type === "post_trip" || String(params?.inspectionType || "").toLowerCase().includes("post");

  const [delivery, setDelivery] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [itemStates, setItemStates] = useState({});
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [photos, setPhotos] = useState([]);
  const [progress, setProgress] = useState({ completed: 0, total: 21, defects: 0 });

  const loadDetails = useCallback(async () => {
    try {
      let targetDeliveryId = params?.deliveryId;
      if (!targetDeliveryId) {
        const list = await getDeliveries().catch(() => []);
        const pending = list.find((d) => ["assigned", "pending", "in_transit", "arrived"].includes(d?.status));
        if (pending) targetDeliveryId = pending.delivery_id;
      }

      if (targetDeliveryId) {
        const data = await getDelivery(targetDeliveryId);
        setDelivery(data);
        if (data?.vehicle?.odometer_reading) {
          setOdometer(String(data.vehicle.odometer_reading));
        }
      }
    } catch (error) {
      console.log("LOAD INSPECTION DETAILS ERROR:", error);
    }
  }, [params?.deliveryId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleItemChange = useCallback((id, status) => {
    setItemStates((prev) => ({
      ...prev,
      [id]: status,
    }));
  }, []);

  const handleProgressChange = useCallback((newProgress) => {
    setProgress(newProgress);
  }, []);

  const defectSeverity = useMemo(() => {
    if (progress.defects <= 2) return "Low";
    if (progress.defects <= 4) return "Medium";
    return "High";
  }, [progress.defects]);

  const getDefectLabels = useCallback(() => {
    const allItems = CHECKLIST_CATEGORIES.flatMap((c) => c.items);
    return allItems.filter((it) => itemStates[it.id] === "defect").map((it) => it.label);
  }, [itemStates]);

  const isAllAnswered = progress.completed === progress.total;
  const hasOdometer = odometer.trim().length > 0;
  const canComplete = isAllAnswered && hasOdometer && !submitting;
  const hasDefects = progress.defects > 0;
  const canReport = hasDefects && !submitting;

  const vehicle = delivery?.vehicle;
  let brandModel = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ").replace(/^(\w+)\s+\1/i, "$1").trim();
  const plateText = vehicle?.plate_number || "ABC - 1234";
  const typeText = brandModel || (vehicle?.type ? `${vehicle.type}` : "10 Wheeler - FUSO");
  const odoText = vehicle?.odometer_reading ? `${Number(vehicle.odometer_reading).toLocaleString()} km` : "67,000 km";
  const resolvedUrl = resolveImageUrl(vehicle?.photo_url || vehicle?.photo);
  const imageSource = resolvedUrl ? { uri: resolvedUrl } : DEFAULT_TRUCK_IMAGE;

  const handleReportIssue = () => {
    if (!canReport) return;
    const defectLabels = getDefectLabels();
    router.push({
      pathname: "/ReportIssue",
      params: {
        deliveryId: String(delivery?.delivery_id || params?.deliveryId || ""),
        vehicle: plateText,
        vehicleType: typeText,
        odometer: odoText,
        severity: defectSeverity,
        defectsSummary: defectLabels.join(", "),
        initialDescription: `Defects identified during inspection (${progress.defects}):\n- ${defectLabels.join("\n- ")}`,
      },
    });
  };

  const handleCompleteInspection = async () => {
    if (!canComplete) {
      if (!isAllAnswered) {
        Alert.alert("Checklist Incomplete", `Please answer all checklist items (${progress.completed}/${progress.total}) before completing.`);
      } else if (!hasOdometer) {
        Alert.alert("Odometer Required", `Please enter the ${isPost ? "ending" : "starting"} odometer reading.`);
      }
      return;
    }

    const deliveryId = delivery?.delivery_id || params?.deliveryId;
    if (!deliveryId) {
      Alert.alert("Error", "No active delivery selected for inspection.");
      return;
    }

    try {
      setSubmitting(true);
      const checklistItems = {};
      const allItems = CHECKLIST_CATEGORIES.flatMap((c) => c.items);
      allItems.forEach((it) => {
        checklistItems[it.id] = itemStates[it.id] === "pass";
      });

      const payload = {
        type: isPost ? "post_trip" : "pre_trip",
        items: checklistItems,
        photos,
      };

      if (!isPost) {
        payload.starting_odometer = Number(odometer) || 0;
        if (fuel) payload.starting_fuel = Number(fuel);
      } else {
        payload.ending_odometer = Number(odometer) || 0;
        if (fuel) payload.ending_fuel = Number(fuel);
      }

      await saveChecklist(deliveryId, payload);

      router.replace({
        pathname: "/(tabs)/home",
        params: {
          inspectionCompleted: "true",
        },
      });
    } catch (error) {
      Alert.alert("Submission Failed", error?.message || "Failed to complete inspection.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <LinearGradient colors={["#4F0A11", "#9E1E21"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{isPost ? "Post - Inspection" : "Pre - Inspection"}</Text>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <VehicleInspectionCard
          image={imageSource}
          vehicle={plateText}
          vehicleType={typeText}
          odometer={odoText}
          completed={progress.completed}
          total={progress.total}
        />

        <InspectionChecklistCard
          isPost={isPost}
          itemStates={itemStates}
          onItemChange={handleItemChange}
          odometer={odometer}
          onOdometerChange={setOdometer}
          fuel={fuel}
          onFuelChange={setFuel}
          photos={photos}
          onPhotosChange={setPhotos}
          onProgressChange={handleProgressChange}
        />
      </ScrollView>

      <View style={styles.bottomActions}>
        <Pressable
          style={({ pressed }) => [
            styles.reportButton,
            !canReport && styles.reportButtonDisabled,
            canReport && pressed && styles.buttonPressed,
          ]}
          onPress={handleReportIssue}
          disabled={!canReport}
        >
          <Ionicons name="warning" size={17} color={canReport ? "#E32E2E" : "#9CA3AF"} />
          <Text style={[styles.reportText, !canReport && styles.reportTextDisabled]}>Report Issue</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.completeButton,
            !canComplete && styles.completeButtonDisabled,
            canComplete && (pressed || submitting) && styles.buttonPressed,
          ]}
          onPress={handleCompleteInspection}
          disabled={!canComplete}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.completeText, !canComplete && styles.completeTextDisabled]}>Complete Inspection</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#E5E7F0" },
  header: {
    height: 98,
    paddingTop: 48,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    zIndex: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 28,
  },
  headerTitle: { color: "#FFFFFF", fontSize: 19, fontWeight: "700" },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 120 },
  bottomActions: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 18,
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "transparent",
  },
  reportButton: {
    height: 43,
    flex: 0.43,
    borderWidth: 1.5,
    borderColor: "#E32E2E",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  reportButtonDisabled: {
    borderColor: "#D1D5DB",
    backgroundColor: "#F3F4F6",
  },
  reportText: { color: "#E32E2E", fontSize: 11, fontWeight: "700" },
  reportTextDisabled: { color: "#9CA3AF" },
  completeButton: {
    height: 43,
    flex: 0.57,
    borderRadius: 7,
    backgroundColor: "#E32E2E",
    justifyContent: "center",
    alignItems: "center",
  },
  completeButtonDisabled: {
    backgroundColor: "#D1D5DB",
  },
  completeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  completeTextDisabled: { color: "#9CA3AF" },
  buttonPressed: { opacity: 0.7 },
});