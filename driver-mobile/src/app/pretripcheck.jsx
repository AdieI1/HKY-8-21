import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { getDelivery } from "../../services/api";

export default function PreTripCheck() {
  const { deliveryId } = useLocalSearchParams();
  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const hasNavigated = useRef(false);

  const checkInspectionStatus = useCallback((data) => {
    if (!data || hasNavigated.current) return;

    // Check if pre-trip inspection is recorded or delivery status has advanced
    const hasPreTripChecklist = data?.checklists?.some(
      (entry) => entry.type === "pre_trip"
    );
    const hasAdvancedStatus =
      data?.status &&
      !["assigned", "pending"].includes(data.status);

    if (hasPreTripChecklist || hasAdvancedStatus) {
      hasNavigated.current = true;
      router.replace({
        pathname: "/navigation",
        params: { deliveryId: String(deliveryId) },
      });
    }
  }, [deliveryId]);

  useEffect(() => {
    let active = true;

    const fetchDetails = async (isInitial = false) => {
      try {
        const data = await getDelivery(deliveryId);
        if (!active) return;
        setDelivery(data);
        checkInspectionStatus(data);
      } catch (error) {
        console.log("LOAD TRIP TICKET ERROR:", error);
      } finally {
        if (active && isInitial) {
          setLoading(false);
        }
      }
    };

    fetchDetails(true);

    // Auto-detect / poll when staff completes vehicle inspection
    const pollInterval = setInterval(() => {
      if (!hasNavigated.current) {
        fetchDetails(false);
      }
    }, 2500);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [deliveryId, checkInspectionStatus]);

  const request = delivery?.request;
  const vehicle = delivery?.vehicle;

  const ticket = {
    ticketNo: delivery?.delivery_id
      ? `TT-${String(delivery.delivery_id).padStart(6, "0")}`
      : "—",
    date: delivery?.trip_date
      ? new Date(`${delivery.trip_date}T00:00:00`).toLocaleDateString()
      : delivery?.created_at
      ? new Date(delivery.created_at).toLocaleDateString()
      : "—",
    driver:
      delivery?.driver?.user?.full_name ||
      delivery?.driver?.user?.name ||
      "—",
    truck:
      [vehicle?.brand, vehicle?.model].filter(Boolean).join(" ") ||
      vehicle?.plate_number ||
      "—",
    plate: vehicle?.plate_number || "—",
    client:
      request?.customer?.full_name ||
      request?.customer?.name ||
      "—",
    cargo: request?.cargo_type || "—",
    origin: request?.pickup_address || "—",
    destination: request?.dropoff_address || "—",
    fuelIssued: delivery?.fuel_issued
      ? `${delivery.fuel_issued} L`
      : "—",
    fuelReceipt: delivery?.fuel_receipt_no || "—",
    fragility:
      { low: "Normal", medium: "Fragile", high: "Perishable" }[
        request?.fragility
      ] ||
      request?.fragility ||
      "—",
    remarks: delivery?.remarks || "N/A",
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* HEADER */}
      <LinearGradient
        colors={["#821418", "#9E1B22", "#6E1014"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="truck-fast-outline"
            size={27}
            color="#FFFFFF"
          />
          <Text style={styles.headerTitle}>Trip Ticket</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9E1B22" />
          <Text style={styles.loadingText}>Loading trip details...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* TRIP INFORMATION CARD */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>TRIP INFORMATION</Text>

            <InfoRow label="Trip Ticket No." value={ticket.ticketNo} />
            <InfoRow label="Date" value={ticket.date} />
            <InfoRow label="Driver Name" value={ticket.driver} />
            <InfoRow label="Truck No." value={ticket.truck} />
            <InfoRow label="Plate No." value={ticket.plate} />
            <InfoRow label="Client Name" value={ticket.client} />
            <InfoRow label="Cargo Description" value={ticket.cargo} />
            <InfoRow label="Origin (Pick-up Point)" value={ticket.origin} />
            <InfoRow label="Destination" value={ticket.destination} />
            <InfoRow label="Fuel Issued" value={ticket.fuelIssued} />
            <InfoRow label="Fuel Receipt No." value={ticket.fuelReceipt} />
            <InfoRow label="Cargo Fragility" value={ticket.fragility} />
            <InfoRow label="Remarks" value={ticket.remarks} isLast />
          </View>

          {/* WAITING FOR STAFF INSPECTION CARD */}
          <View style={styles.waitingCard}>
            <View style={styles.clockIconContainer}>
              <Ionicons
                name="time-outline"
                size={78}
                color="#DE7923"
              />
            </View>

            <Text style={styles.waitingTitle}>
              Please wait for the staff to finish{"\n"}vehicle inspection to start delivery.
            </Text>

            <Text style={styles.waitingSubtitle}>
              You will be notified once the inspection is complete.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/* INFO ROW COMPONENT */
function InfoRow({ label, value, isLast = false }) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={styles.infoValue}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {value || "—"}
      </Text>
    </View>
  );
}

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DCE0EC",
  },

  header: {
    height: 66,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  backButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#5B5E6D",
    fontSize: 14,
    fontWeight: "600",
  },

  content: {
    padding: 14,
    paddingBottom: 35,
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    paddingBottom: 10,
    shadowColor: "#1B2038",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },

  cardTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#282A34",
    marginBottom: 8,
    letterSpacing: 0.4,
  },

  infoRow: {
    minHeight: 33,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#ECEEF5",
    paddingVertical: 5,
  },

  infoRowLast: {
    borderBottomWidth: 0,
  },

  infoLabel: {
    flex: 1,
    fontSize: 12.5,
    color: "#4A4D59",
    fontWeight: "600",
  },

  infoValue: {
    flex: 1.2,
    fontSize: 12.5,
    color: "#282A34",
    textAlign: "right",
    fontWeight: "700",
  },

  waitingCard: {
    backgroundColor: "#FEF4E6",
    borderWidth: 1.5,
    borderColor: "#E5933A",
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    shadowColor: "#E5933A",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2,
  },

  clockIconContainer: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
  },

  waitingTitle: {
    fontSize: 16.5,
    fontWeight: "800",
    color: "#9A4B1B",
    textAlign: "center",
    marginTop: 14,
    marginBottom: 6,
    lineHeight: 23,
  },

  waitingSubtitle: {
    fontSize: 12.5,
    color: "#9C765C",
    textAlign: "center",
    lineHeight: 18,
  },
});