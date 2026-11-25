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

import DeliveryDetailsCard from "@/components/preInspection/DeliveryDetailsCard";
import InspectionChecklistCard, { CHECKLIST_CATEGORIES } from "@/components/preInspection/InspectionChecklistCard";
import VehicleInspectionCard from "@/components/preInspection/VehicleInspectionCard";
import {
  getDeliveries,
  getDelivery,
  resolveImageUrl,
  saveChecklist,
} from "../services/api";
import { useTheme } from "../context/ThemeContext";

const DEFAULT_TRUCK_IMAGE = require("../assets/images/truckpic.jpg");

export default function PreInspection() {
  const router = useRouter();
  const { theme, darkMode } = useTheme();
  const params = useLocalSearchParams();
  const isPost = params?.type === "post_trip" || String(params?.inspectionType || "").toLowerCase().includes("post");

  const [delivery, setDelivery] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [itemStates, setItemStates] = useState({});
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ odometer: null, fuel: null });
  const [photos, setPhotos] = useState([]);
  const [progress, setProgress] = useState({ completed: 0, total: 21, defects: 0 });

  const loadDetails = useCallback(async () => {
    try {
      let targetDeliveryId = params?.deliveryId;
      if (!targetDeliveryId) {
        const list = await getDeliveries().catch(() => []);
        const pending = list.find(
          (d) =>
            Boolean(d?.driver_id && d?.vehicle_id) &&
            d?.fuel_issuance_status !== "pending" &&
            ["assigned", "accepted", "in_transit", "arrived"].includes(d?.status)
        );
        if (pending) targetDeliveryId = pending.delivery_id;
      }

      if (targetDeliveryId) {
        const data = await getDelivery(targetDeliveryId);
        setDelivery(data);
        if (!isPost) {
          if (data?.vehicle?.odometer_reading != null) {
            setOdometer(String(data.vehicle.odometer_reading));
          }
          setFuel("");
        } else {
          setOdometer("");
          setFuel("");
        }
      }
    } catch (error) {
      console.log("LOAD INSPECTION DETAILS ERROR:", error);
    }
  }, [params?.deliveryId, isPost]);

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

  const preTripChecklist = useMemo(
    () => (delivery?.checklists || []).find((c) => c.type === "pre_trip"),
    [delivery]
  );
  const startOdometerVal =
    delivery?.starting_odometer ??
    preTripChecklist?.starting_odometer ??
    (isPost ? (delivery?.vehicle?.odometer_reading ?? null) : null);
  const startFuelVal =
    delivery?.starting_fuel ??
    preTripChecklist?.starting_fuel ??
    delivery?.fuel_issued ??
    null;

  const parsedOdometer = odometer.trim().length > 0 ? Number(odometer) : NaN;
  const parsedFuel = fuel.trim().length > 0 ? Number(fuel) : NaN;

  const isAllAnswered = progress.completed === progress.total;
  const hasOdometer = !Number.isNaN(parsedOdometer) && parsedOdometer >= 0;
  const hasValidEndingOdometer =
    !isPost || startOdometerVal == null || parsedOdometer >= Number(startOdometerVal);
  const hasFuel = !isPost || (!Number.isNaN(parsedFuel) && parsedFuel >= 0);
  const canComplete = isAllAnswered && hasOdometer && hasValidEndingOdometer && hasFuel && !submitting;
  const hasDefects = progress.defects > 0;
  const canReport = hasDefects && !submitting;

  const vehicle = delivery?.vehicle;
  let brandModel = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ").replace(/^(\w+)\s+\1/i, "$1").trim();
  const plateText = vehicle?.plate_number || "ABC - 1234";
  const typeText = brandModel || (vehicle?.type ? `${vehicle.type}` : "10 Wheeler - FUSO");
  const odoText = vehicle?.odometer_reading != null ? `${Number(vehicle.odometer_reading).toLocaleString()} km` : "Not recorded yet";
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

  const submitInspection = async () => {
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
        payload.starting_odometer = parsedOdometer;
      } else {
        payload.ending_odometer = parsedOdometer;
        payload.ending_fuel = parsedFuel;
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

  const handleCompleteInspection = async () => {
    const nextErrors = { odometer: null, fuel: null };

    if (Number.isNaN(parsedOdometer)) {
      nextErrors.odometer = isPost ? "Ending odometer is required." : "Starting odometer is required.";
    } else if (parsedOdometer < 0) {
      nextErrors.odometer = "Odometer cannot be negative.";
    } else if (isPost && startOdometerVal != null && parsedOdometer < Number(startOdometerVal)) {
      nextErrors.odometer = `Must be at least ${Number(startOdometerVal).toLocaleString()} km.`;
    }

    if (isPost) {
      if (Number.isNaN(parsedFuel)) {
        nextErrors.fuel = "Ending fuel is required.";
      } else if (parsedFuel < 0) {
        nextErrors.fuel = "Fuel reading cannot be negative.";
      }
    }

    setFieldErrors(nextErrors);

    if (!isAllAnswered) {
      Alert.alert("Checklist Incomplete", `Please answer all checklist items (${progress.completed}/${progress.total}) before completing.`);
      return;
    }

    if (nextErrors.odometer) {
      const title =
        isPost && startOdometerVal != null && !Number.isNaN(parsedOdometer) && parsedOdometer < Number(startOdometerVal)
          ? "Invalid Ending Odometer"
          : "Odometer Required";
      const message =
        isPost && startOdometerVal != null && !Number.isNaN(parsedOdometer) && parsedOdometer < Number(startOdometerVal)
          ? `Ending odometer (${parsedOdometer.toLocaleString()} km) cannot be less than starting odometer (${Number(startOdometerVal).toLocaleString()} km).`
          : nextErrors.odometer;
      Alert.alert(title, message);
      return;
    }

    if (isPost && nextErrors.fuel) {
      Alert.alert("Ending Fuel Required", nextErrors.fuel);
      return;
    }

    if (isPost && startFuelVal != null && parsedFuel > Number(startFuelVal)) {
      Alert.alert(
        "Confirm Fuel Reading",
        `Ending fuel (${parsedFuel} L) is higher than starting/issued fuel (${Number(startFuelVal)} L). Continue anyway?`,
        [
          { text: "Fix Reading", style: "cancel" },
          { text: "Continue", onPress: () => submitInspection() },
        ]
      );
      return;
    }

    await submitInspection();
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={theme.header} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.header}>
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

        <DeliveryDetailsCard delivery={delivery} />

        <InspectionChecklistCard
          isPost={isPost}
          itemStates={itemStates}
          onItemChange={handleItemChange}
          odometer={odometer}
          onOdometerChange={(text) => {
            setOdometer(text);
            if (fieldErrors.odometer) {
              setFieldErrors((prev) => ({ ...prev, odometer: null }));
            }
          }}
          startingOdometer={startOdometerVal}
          fuel={fuel}
          onFuelChange={(text) => {
            setFuel(text);
            if (fieldErrors.fuel) {
              setFieldErrors((prev) => ({ ...prev, fuel: null }));
            }
          }}
          fuelReference={startFuelVal}
          fieldErrors={fieldErrors}
          photos={photos}
          onPhotosChange={setPhotos}
          onProgressChange={handleProgressChange}
        />
      </ScrollView>

      <View style={styles.bottomActions}>
        <Pressable
          style={({ pressed }) => [
            styles.reportButton,
            { backgroundColor: darkMode ? theme.surface : "#FFFFFF" },
            !canReport && (darkMode ? { backgroundColor: theme.surface, borderColor: theme.border } : styles.reportButtonDisabled),
            canReport && pressed && styles.buttonPressed,
          ]}
          onPress={handleReportIssue}
          disabled={!canReport}
        >
          <Ionicons name="warning" size={17} color={canReport ? "#E32E2E" : (darkMode ? theme.textSecondary : "#9CA3AF")} />
          <Text style={[styles.reportText, !canReport && { color: darkMode ? theme.textSecondary : "#9CA3AF" }]}>Report Issue</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.completeButton,
            !canComplete && (darkMode ? { backgroundColor: theme.border } : styles.completeButtonDisabled),
            canComplete && (pressed || submitting) && styles.buttonPressed,
          ]}
          onPress={handleCompleteInspection}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={[styles.completeText, !canComplete && { color: darkMode ? theme.textSecondary : "#9CA3AF" }]}>Complete Inspection</Text>
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