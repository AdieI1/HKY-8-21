import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import InspectionChecklistCard from "@/components/preInspection/InspectionChecklistCard";
import VehicleInspectionCard from "@/components/preInspection/VehicleInspectionCard";
import {
  getDelivery,
  getDeliveries,
  saveChecklist,
  resolveImageUrl,
} from "../services/api";

const DEFAULT_TRUCK_IMAGE = require("../assets/images/truckpic.jpg");

export default function PreInspection() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [delivery, setDelivery] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 8 });

  const loadDetails = useCallback(async () => {
    try {
      let targetDeliveryId = params?.deliveryId;
      if (!targetDeliveryId) {
        const list = await getDeliveries().catch(() => []);
        const pending = list.find((d) => ["assigned", "pending"].includes(d?.status));
        if (pending) targetDeliveryId = pending.delivery_id;
      }

      if (targetDeliveryId) {
        const data = await getDelivery(targetDeliveryId);
        setDelivery(data);
      }
    } catch (error) {
      console.log("LOAD PRE-INSPECTION ERROR:", error);
    }
  }, [params?.deliveryId]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const handleCompleteInspection = async () => {
    if (progress.completed < progress.total) {
      Alert.alert(
        "Inspection Incomplete",
        `Please complete all checklist items (${progress.completed}/${progress.total}) before submitting.`
      );
      return;
    }

    const deliveryId = delivery?.delivery_id || params?.deliveryId;
    if (!deliveryId) {
      Alert.alert("Error", "No active delivery selected for inspection.");
      return;
    }

    try {
      setSubmitting(true);

      await saveChecklist(deliveryId, {
        type: "pre_trip",
        items: {
          vehicle_inspection: true,
          drivers_license: true,
          or_cr: true,
          tires: true,
          lights_signals: true,
          fire_extinguisher: true,
          emergency_tools: true,
          ppe: true,
        },
        starting_odometer: delivery?.vehicle?.odometer_reading || 0,
      });

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

  const handleProgressChange = useCallback((newProgress) => {
    setProgress((prev) => {
      if (
        prev.completed === newProgress?.completed &&
        prev.total === newProgress?.total
      ) {
        return prev;
      }
      return newProgress;
    });
  }, []);

  const vehicle = delivery?.vehicle;
  let brandModel = [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ");
  brandModel = brandModel.replace(/^(\w+)\s+\1/i, "$1").trim();

  const plateText = vehicle?.plate_number || "ABC - 1234";
  const typeText = brandModel || (vehicle?.type ? `${vehicle.type}` : "10 Wheeler - FUSO");
  const odoText = vehicle?.odometer_reading
    ? `${Number(vehicle.odometer_reading).toLocaleString()} km`
    : "67,000 km";
  const resolvedUrl = resolveImageUrl(vehicle?.photo_url || vehicle?.photo);
  const imageSource = resolvedUrl ? { uri: resolvedUrl } : DEFAULT_TRUCK_IMAGE;

  return (
    <View style={styles.screen}>
      {/* HEADER */}
      <LinearGradient
        colors={["#4F0A11", "#9E1E21"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Pre - Inspection</Text>
      </LinearGradient>

      {/* CONTENT */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <VehicleInspectionCard
          image={imageSource}
          vehicle={plateText}
          vehicleType={typeText}
          odometer={odoText}
          completed={progress.completed}
          total={progress.total}
        />

        <InspectionChecklistCard onProgressChange={handleProgressChange} />
      </ScrollView>

      {/* BOTTOM ACTIONS */}
      <View style={styles.bottomActions}>
        <Pressable
          style={({ pressed }) => [styles.reportButton, pressed && styles.buttonPressed]}
          onPress={() => {
            router.push("/ReportIssue");
          }}
          disabled={submitting}
        >
          <Ionicons name="warning" size={18} color="#E32E2E" />
          <Text style={styles.reportText}>Report Issue</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.completeButton,
            (pressed || submitting) && styles.buttonPressed,
          ]}
          onPress={handleCompleteInspection}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.completeText}>Complete Inspection</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E5E7F0",
  },
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
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 120,
  },
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
    borderWidth: 1,
    borderColor: "#E32E2E",
    borderRadius: 7,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  reportText: {
    color: "#E32E2E",
    fontSize: 11,
    fontWeight: "700",
  },
  completeButton: {
    height: 43,
    flex: 0.57,
    borderRadius: 7,
    backgroundColor: "#E32E2E",
    justifyContent: "center",
    alignItems: "center",
  },
  completeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.7,
  },
});