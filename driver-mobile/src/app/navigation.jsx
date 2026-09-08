import {
  StyleSheet,
  View,
  Text,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import NavigationInfoSheet from "../../components/navigation/NavigationInfoSheet";
import NavigationHeader from "../../components/navigation/NavigationHeader";
import NavigationRoutePreview from "../../components/navigation/NavigationRoutePreview";
import NavigationMap from "../../components/navigation/NavigationMap";
import {
  getDelivery,
  saveDeliveryChecklist,
  updateDeliveryLocation,
  updateDriverDeliveryStatus,
  clearActiveAcceptedDeliveryId,
} from "../../services/api";

const statusToNavigationState = (status) => {
  const states = {
    assigned: "preview",
    accepted: "in_transit_pickup",
    arrived_pickup: "arrived_pickup",
    loading_cargo: "loading",
    out_for_delivery: "in_transit_dropoff",
    arrived_dropoff: "arrived_dropoff",
    unloading_cargo: "unloading",
    returning_to_hq: "completed",
    completed: "completed",
  };

  return states[status] || "preview";
};

const formatMoney = (value) =>
  `₱${Number(value || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Navigation() {
  const router = useRouter();
  const { deliveryId } = useLocalSearchParams();

  const [navigationState, setNavigationState] = useState("preview");
  const [showCompleted, setShowCompleted] = useState(false);
  const [backendDelivery, setBackendDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeHazardAlert, setActiveHazardAlert] = useState(null);
  const [routeMetrics, setRouteMetrics] = useState(null);

  useEffect(() => {
    let active = true;

    getDelivery(deliveryId)
      .then((data) => {
        if (!active) return;
        setBackendDelivery(data);
        setNavigationState(statusToNavigationState(data.status));
      })
      .catch((error) => {
        Alert.alert(
          "Unable to Load Navigation",
          error?.message || "Could not connect to the server.",
          [{ text: "Go Back", onPress: () => router.back() }]
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [deliveryId, router]);

  const delivery = useMemo(() => {
    if (!backendDelivery) return null;

    const request = backendDelivery.request || {};
    const vehicle = backendDelivery.vehicle || {};
    const customer = request.customer || {};
    const assignedDriver = backendDelivery.driver?.user || {};
    const preTrip = backendDelivery.checklists?.find(
      (entry) => entry.type === "pre_trip"
    );
    const totalPrice = Number(request.total_price || 0);
    const paidAmount = Number(backendDelivery.trip_cost || 0);
    const distance = Number(request.distance_km || 0);

    return {
      requestId: `RQ${String(request.request_id || "").padStart(5, "0")}`,
      tripTicketNo: `TT-${String(backendDelivery.delivery_id).padStart(6, "0")}`,
      date: backendDelivery.trip_date
        ? new Date(`${backendDelivery.trip_date}T00:00:00`).toLocaleDateString()
        : backendDelivery.created_at
          ? new Date(backendDelivery.created_at).toLocaleDateString()
          : "",
      driver: assignedDriver.full_name || "",
      contact: customer.phone || "",
      balance: formatMoney(Math.max(totalPrice - paidAmount, 0)),
      cargo: request.cargo_type || "",
      cargoDescription: request.cargo_type || "",
      clientName: customer.full_name || "",
      weight: request.weight ? `${request.weight}kg` : "",
      pickup: request.pickup_address || "",
      dropoff: request.dropoff_address || "",
      distance: routeMetrics?.distanceKm
        ? `${routeMetrics.distanceKm} km`
        : distance
          ? `${distance} km`
          : "—",
      eta: routeMetrics?.durationMins
        ? `${routeMetrics.durationMins} mins`
        : distance
          ? `${Math.max(Math.round((distance / 40) * 60), 1)} mins`
          : "—",
      startingOdometer:
        preTrip?.starting_odometer || vehicle.odometer_reading || "",
      startingFuel: preTrip?.starting_fuel || "",
      fuelIssued: backendDelivery.fuel_issued || "",
      fuelReceiptNo: backendDelivery.fuel_receipt_no || "",
      vehicle: [vehicle.brand, vehicle.model, vehicle.plate_number]
        .filter(Boolean)
        .join(" • "),
      fragility: request.fragility || "",
      remarks: backendDelivery.remarks || "N/A",
    };
  }, [backendDelivery, routeMetrics]);

  useEffect(() => {
    if (navigationState !== "completed") return;

    clearActiveAcceptedDeliveryId().catch(() => {});
    setShowCompleted(true);

    const timer = setTimeout(() => {
      setShowCompleted(false);
      router.replace({
        pathname: "/(tabs)/home",
        params: { completed: "1" },
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigationState]);

  const handleStatusChange = async (status) => {
    const updated = await updateDriverDeliveryStatus(deliveryId, status);
    setBackendDelivery(updated);
  };

  const handleLocationChange = useCallback(
    (coordinate) => {
      updateDeliveryLocation(
        deliveryId,
        coordinate.latitude,
        coordinate.longitude
      ).catch((error) => {
        console.log("LOCATION SYNC ERROR:", error);
      });
    },
    [deliveryId]
  );

  if (loading || !delivery) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#B91F27" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.container}>
        <NavigationHeader navigationState={navigationState} />

        <View style={styles.mapContainer}>
          <NavigationMap
            delivery={backendDelivery}
            navigationState={navigationState}
            onLocationChange={handleLocationChange}
            onHazardAlert={setActiveHazardAlert}
            onRouteMetrics={setRouteMetrics}
          />

          {activeHazardAlert && (
            <View style={styles.hazardBanner}>
              <View style={styles.hazardHeader}>
                <Ionicons name="warning" size={16} color="#EF4444" />
                <Text style={styles.hazardTitle}>
                  HAZARD AHEAD ({activeHazardAlert.distanceKm} km)
                </Text>
                <TouchableOpacity
                  onPress={() => setActiveHazardAlert(null)}
                  style={styles.hazardClose}
                >
                  <Ionicons name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.hazardName} numberOfLines={1}>
                {activeHazardAlert.name}
              </Text>
              <Text style={styles.hazardAdvisory} numberOfLines={2}>
                {activeHazardAlert.advisory}
              </Text>
            </View>
          )}
        </View>

        <NavigationRoutePreview
          delivery={delivery}
          navigationState={navigationState}
        />

        <NavigationInfoSheet
          delivery={delivery}
          navigationState={navigationState}
          setNavigationState={setNavigationState}
          onStatusChange={handleStatusChange}
        />

        {showCompleted && (
          <View style={styles.completedMessage}>
            <Text style={styles.completedTitle}>Delivery Completed!</Text>
            <Text style={styles.completedText}>
              Returning to Home...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DDE0EE",
  },

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  mapContainer: {
    flex: 1,
  },

  hazardBanner: {
    position: "absolute",
    top: 10,
    left: 16,
    right: 16,
    backgroundColor: "#1F2937",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 15,
  },

  hazardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  hazardTitle: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 6,
    flex: 1,
    letterSpacing: 0.5,
  },

  hazardClose: {
    padding: 2,
  },

  hazardName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },

  hazardAdvisory: {
    color: "#D1D5DB",
    fontSize: 11,
    lineHeight: 15,
  },

  completedMessage: {
    position: "absolute",
    top: 75,
    left: 48,
    right: 48,
    backgroundColor: "#F1F2FA",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    elevation: 10,
    zIndex: 20,
  },

  completedTitle: {
    color: "#3D9B58",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  completedText: {
    color: "#777987",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
