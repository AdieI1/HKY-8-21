import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import TripTicket from "../TripTicket";

export default function PostTripCheck({
  delivery,
  onConfirm,
  onReportIssue,
}) {
  const [checks, setChecks] = useState({
    tires: false,
    fuel: false,
    engineOil: false,
    coolant: false,
    brakes: false,
    lights: false,
    cargoSecured: false,
    cargoCondition: false,
    emergencyKits: false,
    mirrors: false,
    permits: false,
  });

  const [endingOdometer, setEndingOdometer] =
    useState("");

  const [endingFuel, setEndingFuel] =
    useState("");

  const [ticketVisible, setTicketVisible] =
    useState(false);

  const toggleCheck = (name) => {
    setChecks((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const Checkbox = ({ name, label }) => (
    <TouchableOpacity
      style={styles.checkRow}
      onPress={() => toggleCheck(name)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.checkbox,
          checks[name] && styles.checkboxChecked,
        ]}
      >
        {checks[name] && (
          <Ionicons
            name="checkmark"
            size={13}
            color="#FFFFFF"
          />
        )}
      </View>

      <Text style={styles.checkLabel}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const handleConfirm = () => {
    onConfirm({
      checks,
      startingOdometer:
        delivery.startingOdometer,
      endingOdometer,
      startingFuel:
        delivery.startingFuel,
      endingFuel,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons
          name="car-outline"
          size={23}
          color="#FFFFFF"
        />

        <Text style={styles.headerTitle}>
          Post-Trip Check
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.vehicleRow}>
            <Text style={styles.vehicle}>
              Vehicle: {delivery.vehicle}
            </Text>

            <TouchableOpacity
              style={styles.ticketButton}
              onPress={() =>
                setTicketVisible(true)
              }
            >
              <Ionicons
                name="document-text-outline"
                size={17}
                color="#FFFFFF"
              />

              <Text style={styles.ticketButtonText}>
                View Trip Ticket
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.section}>
            Vehicle Checking:
          </Text>

          <Checkbox
            name="tires"
            label="Tires"
          />

          <Checkbox
            name="fuel"
            label="Fuel"
          />

          <Checkbox
            name="engineOil"
            label="Engine Oil"
          />

          <Checkbox
            name="coolant"
            label="Coolant"
          />

          <Checkbox
            name="brakes"
            label="Brakes"
          />

          <Checkbox
            name="lights"
            label="Lights"
          />

          <Text style={styles.section}>
            Cargo Checking:
          </Text>

          <Checkbox
            name="cargoSecured"
            label="Cargo Secured"
          />

          <Checkbox
            name="cargoCondition"
            label="Cargo Condition Checked"
          />

          <Text style={styles.section}>
            Safety Protocols:
          </Text>

          <Checkbox
            name="emergencyKits"
            label="Emergency Kits"
          />

          <Checkbox
            name="mirrors"
            label="Mirrors and Windshield Clear"
          />

          <Checkbox
            name="permits"
            label="Required Permits Verified"
          />

          <View style={styles.divider} />

          <Text style={styles.tripTitle}>
            END TRIP INFORMATION
          </Text>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>
                Starting Odometer
              </Text>

              <Text style={styles.value}>
                {delivery.startingOdometer} km
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.label}>
                Ending Odometer
              </Text>

              <TextInput
                style={styles.input}
                placeholder="124,200"
                keyboardType="numeric"
                value={endingOdometer}
                onChangeText={setEndingOdometer}
              />
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>
                Starting Fuel
              </Text>

              <Text style={styles.value}>
                {delivery.startingFuel} L
              </Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.label}>
                Ending Fuel
              </Text>

              <TextInput
                style={styles.input}
                placeholder="30"
                keyboardType="numeric"
                value={endingFuel}
                onChangeText={setEndingFuel}
              />
            </View>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.issueButton}
              onPress={onReportIssue}
            >
              <Text style={styles.buttonText}>
                Report an Issue
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
            >
              <Text style={styles.buttonText}>
                Confirm
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TripTicket
        visible={ticketVisible}
        onClose={() =>
          setTicketVisible(false)
        }
        delivery={delivery}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DDE0EE",
  },

  header: {
    height: 62,
    backgroundColor: "#B91F27",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 10,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  content: {
    padding: 10,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: "#F1F2FA",
    borderRadius: 9,
    padding: 13,
  },

  vehicleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  vehicle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    color: "#30313A",
  },

  ticketButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#B91F27",
    borderRadius: 7,
    paddingHorizontal: 9,
    paddingVertical: 8,
    marginLeft: 8,
  },

  ticketButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    marginLeft: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "#C9CAD2",
    marginVertical: 10,
  },

  section: {
    fontSize: 12,
    fontWeight: "900",
    color: "#30313A",
    marginTop: 4,
    marginBottom: 5,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 31,
  },

  checkbox: {
    width: 17,
    height: 17,
    borderWidth: 1,
    borderColor: "#777987",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  checkboxChecked: {
    backgroundColor: "#B91F27",
    borderColor: "#B91F27",
  },

  checkLabel: {
    fontSize: 12,
    color: "#4B4C55",
  },

  tripTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#30313A",
    marginBottom: 11,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  infoItem: {
    width: "47%",
  },

  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#30313A",
    marginBottom: 5,
  },

  value: {
    fontSize: 12,
    color: "#4B4C55",
  },

  input: {
    height: 36,
    borderWidth: 1,
    borderColor: "#C4C5CC",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    fontSize: 12,
    color: "#30313A",
  },

  buttons: {
    flexDirection: "row",
    gap: 9,
    marginTop: 10,
  },

  issueButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    backgroundColor: "#A5A6AD",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmButton: {
    flex: 1,
    height: 45,
    borderRadius: 8,
    backgroundColor: "#F24848",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
});