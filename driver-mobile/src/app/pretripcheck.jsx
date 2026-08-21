import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  getDelivery,
  saveDeliveryChecklist,
} from "../../services/api";

export default function PreTripCheck() {
  const { deliveryId } = useLocalSearchParams();
  const [checkedItems, setCheckedItems] = useState({});
  const [delivery, setDelivery] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    getDelivery(deliveryId)
      .then((data) => {
        if (!active) return;

        setDelivery(data);

        const savedChecklist = data?.checklists?.find(
          (entry) => entry.type === "pre_trip"
        );

        if (savedChecklist?.items) {
          setCheckedItems(savedChecklist.items);
        }
      })
      .catch((error) => {
        Alert.alert(
          "Unable to Load Trip Ticket",
          error?.message || "Could not connect to the server."
        );
      });

    return () => {
      active = false;
    };
  }, [deliveryId]);

  const request = delivery?.request;
  const vehicle = delivery?.vehicle;

  const ticket = {
    ticketNo: delivery?.delivery_id
      ? `TT-${String(delivery.delivery_id).padStart(6, "0")}`
      : "",
    date: delivery?.created_at
      ? new Date(delivery.created_at).toLocaleDateString()
      : "",
    driver: delivery?.driver?.user?.full_name || "",
    truck: [vehicle?.brand, vehicle?.model].filter(Boolean).join(" "),
    plate: vehicle?.plate_number || "",
    client: request?.customer?.full_name || "",
    cargo: request?.cargo_type || "",
    origin: request?.pickup_address || "",
    destination: request?.dropoff_address || "",
    fuelIssued: "",
    fuelReceipt: "",
    remarks: request?.fragility
      ? `${request.fragility} fragility cargo`
      : "",
  };

  const checklist = [
    "Driver's License Valid",
    "OR/CR Available",
    "Vehicle Inspection Conducted",
    "Tires Checked",
    "Lights and Signals Operational",
    "Fire Extinguisher Available",
    "Emergency Tools Complete",
    "PPE Available",
  ];

  const toggleCheck = (item) => {
    setCheckedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const allChecked = checklist.every((item) => checkedItems[item]);

  const handleStartDelivery = async () => {
    try {
      setSubmitting(true);

      await saveDeliveryChecklist(deliveryId, {
        type: "pre_trip",
        items: checkedItems,
        starting_odometer: vehicle?.odometer_reading || null,
      });

      router.push({
        pathname: "/navigation",
        params: { deliveryId: String(deliveryId) },
      });
    } catch (error) {
      Alert.alert(
        "Unable to Start Delivery",
        error?.message || "Could not save the checklist."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Ionicons
            name="document-text-outline"
            size={27}
            color="#FFFFFF"
          />
          <Text style={styles.title}>Trip Ticket</Text>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="arrow-back"
            size={27}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.card}>
          {/* TRIP INFORMATION */}
          <Text style={styles.cardTitle}>TRIP INFORMATION</Text>

          <InfoRow label="Trip Ticket No." value={ticket.ticketNo} />
          <InfoRow label="Date" value={ticket.date} />
          <InfoRow label="Driver Name" value={ticket.driver} />
          <InfoRow label="Truck No." value={ticket.truck} />
          <InfoRow label="Plate No." value={ticket.plate} />
          <InfoRow label="Client Name" value={ticket.client} />
          <InfoRow label="Cargo Description" value={ticket.cargo} />
          <InfoRow
            label="Origin (Pick-up Point)"
            value={ticket.origin}
          />
          <InfoRow label="Destination" value={ticket.destination} />
          <InfoRow label="Fuel Issued" value={ticket.fuelIssued} />
          <InfoRow
            label="Fuel Receipt No."
            value={ticket.fuelReceipt}
          />
          <InfoRow label="Remarks" value={ticket.remarks} />

          <View style={styles.divider} />

          {/* CHECKLIST */}
          <Text style={styles.cardTitle}>
            CHECKLIST BEFORE DEPARTURE
          </Text>

          <Text style={styles.instructionText}>
            Complete all required checks before starting the delivery.
          </Text>

          {checklist.map((item) => (
            <CheckItem
              key={item}
              label={item}
              checked={checkedItems[item]}
              onPress={() => toggleCheck(item)}
            />
          ))}

          {/* BUTTONS */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.reportButton}
              activeOpacity={0.8}
            >
              <Ionicons
                name="warning-outline"
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.buttonText}>
                Report an Issue
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.startButton,
                (!allChecked || submitting) && styles.startButtonDisabled,
              ]}
              disabled={!allChecked || submitting}
              onPress={handleStartDelivery}
              activeOpacity={0.8}
            >
              <Ionicons
                name="car-outline"
                size={19}
                color="#FFFFFF"
              />
              <Text style={styles.buttonText}>
                Start Delivery
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* INFO ROW */

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>
        {value || "—"}
      </Text>
    </View>
  );
}

/* CHECKBOX */

function CheckItem({ label, checked, onPress }) {
  return (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          checked && styles.checkboxChecked,
        ]}
      >
        {checked && (
          <Ionicons
            name="checkmark"
            size={15}
            color="#FFFFFF"
          />
        )}
      </View>

      <Text style={styles.checkText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* STYLES */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DDE0EE",
  },

  header: {
    height: 66,
    backgroundColor: "#B91F27",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 12,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#F1F2FA",
    borderRadius: 10,
    padding: 15,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#30313A",
    marginBottom: 9,
    letterSpacing: 0.2,
  },

  infoRow: {
    minHeight: 31,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#D6D7DE",
  },

  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: "#3E3F47",
    fontWeight: "600",
  },

  infoValue: {
    flex: 1,
    fontSize: 13,
    color: "#30313A",
    textAlign: "right",
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: "#C9CAD2",
    marginVertical: 13,
  },

  instructionText: {
    fontSize: 12,
    color: "#686A74",
    marginBottom: 7,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 37,
  },

  checkbox: {
    width: 19,
    height: 19,
    borderWidth: 1,
    borderColor: "#777987",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    borderRadius: 2,
  },

  checkboxChecked: {
    backgroundColor: "#B91F27",
    borderColor: "#B91F27",
  },

  checkText: {
    flex: 1,
    fontSize: 14,
    color: "#42434B",
  },

  buttonRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
  },

  reportButton: {
    flex: 1,
    height: 49,
    borderRadius: 9,
    backgroundColor: "#A5A6AD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  startButton: {
    flex: 1,
    height: 49,
    borderRadius: 9,
    backgroundColor: "#F24848",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  startButtonDisabled: {
    backgroundColor: "#C9C9C9",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
});