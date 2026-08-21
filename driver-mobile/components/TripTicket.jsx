import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function TripTicket({
  visible,
  onClose,
  delivery = {},
}) {
  const ticket = {
    tripTicketNo:
      delivery.tripTicketNo ||
      delivery.requestId ||
      "RQ000001",

    date: delivery.date || "",
    driverName: delivery.driver || "",
    truckNo: delivery.vehicle || "",
    clientName: delivery.clientName || "",
    cargoDescription:
      delivery.cargoDescription || "",
    origin: delivery.pickup || "",
    destination: delivery.dropoff || "",
    odometerIn:
      delivery.startingOdometer || "",
    fuelIssued:
      delivery.fuelIssued || "",
    fuelReceiptNo:
      delivery.fuelReceiptNo || "",
    remarks: delivery.remarks || "",
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                Trip Ticket
              </Text>

              <Text style={styles.headerSub}>
                {ticket.tripTicketNo}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={25}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Text style={styles.company}>
              HJY TRUCKING SERVICES
            </Text>

            <Text style={styles.companyInfo}>
              536 Block 1 Puntod, Cagayan de Oro City
            </Text>

            <Text style={styles.companyInfo}>
              Cel#: 0917-718-7659
            </Text>

            <Text style={styles.companyInfo}>
              PLDT Tel No. (088) 880-7532
            </Text>

            <Text style={styles.ticketTitle}>
              TRIP TICKET
            </Text>

            <View style={styles.table}>
              <TicketRow
                label="Trip Ticket No."
                value={ticket.tripTicketNo}
              />

              <TicketRow
                label="Date"
                value={ticket.date}
              />

              <TicketRow
                label="Driver Name"
                value={ticket.driverName}
              />

              <TicketRow
                label="Truck No./Plate No."
                value={ticket.truckNo}
              />

              <TicketRow
                label="Client Name"
                value={ticket.clientName}
              />

              <TicketRow
                label="Cargo Description"
                value={ticket.cargoDescription}
              />

              <TicketRow
                label="Origin (Pick-up Point)"
                value={ticket.origin}
              />

              <TicketRow
                label="Destination"
                value={ticket.destination}
              />

              <TicketRow
                label="Odometer Reading In"
                value={
                  ticket.odometerIn
                    ? `${ticket.odometerIn} km`
                    : ""
                }
              />

              <TicketRow
                label="Fuel Issued"
                value={
                  ticket.fuelIssued
                    ? `${ticket.fuelIssued} L`
                    : ""
                }
              />

              <TicketRow
                label="Fuel Receipt No."
                value={ticket.fuelReceiptNo}
              />

              <TicketRow
                label="Remarks"
                value={ticket.remarks}
              />
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TicketRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>
        {label}
      </Text>

      <Text style={styles.rowValue}>
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modal: {
    height: "91%",
    backgroundColor: "#F1F2FA",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
  },

  header: {
    height: 64,
    backgroundColor: "#B91F27",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  headerSub: {
    color: "#F8DADB",
    fontSize: 11,
    marginTop: 2,
  },

  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  company: {
    textAlign: "center",
    fontSize: 17,
    fontWeight: "900",
    color: "#202128",
  },

  companyInfo: {
    textAlign: "center",
    fontSize: 10,
    color: "#555761",
    marginTop: 2,
  },

  ticketTitle: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "900",
    color: "#202128",
    marginTop: 14,
    marginBottom: 10,
  },

  table: {
    borderWidth: 1,
    borderColor: "#55565D",
    backgroundColor: "#FFFFFF",
  },

  row: {
    minHeight: 30,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#77787E",
  },

  rowLabel: {
    width: "49%",
    paddingHorizontal: 7,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#25262D",
  },

  rowValue: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: "#77787E",
    paddingHorizontal: 7,
    paddingVertical: 6,
    fontSize: 11,
    color: "#3E3F47",
  },

});