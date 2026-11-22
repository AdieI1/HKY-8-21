import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function VehicleInfoModal({
  visible,
  onClose,
  vehicle = {},
}) {
  if (!vehicle) return null;

  const model = vehicle.model || vehicle.vehicle_model || vehicle.name || "Assigned Truck";
  const brand = vehicle.brand || "";
  const yearModel = vehicle.year_model || "";
  const plateNumber = vehicle.plate_number || vehicle.plate_no || vehicle.license_plate || "N/A";
  const vehicleType = vehicle.vehicle_type || "Wing Van";
  const capacity = vehicle.capacity ? `${Number(vehicle.capacity).toLocaleString()} kg` : "—";
  const fuelType = vehicle.fuel_type ? String(vehicle.fuel_type).toUpperCase() : "DIESEL";
  const odometer = vehicle.odometer_reading
    ? `${Number(vehicle.odometer_reading).toLocaleString()} km`
    : vehicle.mileage
    ? `${Number(vehicle.mileage).toLocaleString()} km`
    : "—";
  const color = vehicle.color || "—";
  const condition = vehicle.condition || "Operational";
  const photoUrl = vehicle.photo_url || (vehicle.photo ? `http://localhost:8000/storage/${vehicle.photo}` : null);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="truck" size={20} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Vehicle Specifications</Text>
                <Text style={styles.headerSub}>Assigned Fleet Details</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            {/* Vehicle Photo (if available) */}
            {photoUrl ? (
              <View style={styles.photoContainer}>
                <Image
                  source={{ uri: photoUrl }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            {/* Main Title Card */}
            <View style={styles.titleCard}>
              <View style={styles.titleCardTop}>
                <Text style={styles.vehicleName}>
                  {brand ? `${brand} ` : ""}{model}{yearModel ? ` (${yearModel})` : ""}
                </Text>
              </View>

              <View style={styles.plateRow}>
                <View style={styles.plateBadge}>
                  <Text style={styles.plateText}>{plateNumber}</Text>
                </View>
                <Text style={styles.vehicleTypeTag}>{vehicleType}</Text>
              </View>
            </View>

            {/* Technical Specifications */}
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeading}>Technical Specifications</Text>
              <View style={styles.divider} />

              <SpecRow
                icon="speedometer-outline"
                label="Odometer / Mileage"
                value={odometer}
              />
              <SpecRow
                icon="scale-outline"
                label="Load Capacity"
                value={capacity}
              />
              <SpecRow
                icon="flame-outline"
                label="Fuel Type"
                value={fuelType}
              />
              <SpecRow
                icon="color-palette-outline"
                label="Vehicle Color"
                value={color}
              />
              <SpecRow
                icon="shield-checkmark-outline"
                label="Condition"
                value={condition}
              />
              {vehicle.registration_valid_until || vehicle.expiration_date ? (
                <SpecRow
                  icon="document-text-outline"
                  label="Registration Expiry"
                  value={vehicle.registration_valid_until || vehicle.expiration_date}
                />
              ) : null}
              {vehicle.insurance_provider ? (
                <SpecRow
                  icon="umbrella-outline"
                  label="Insurance Provider"
                  value={vehicle.insurance_provider}
                />
              ) : null}
            </View>

            {/* Dispatch Inspection Notice */}
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={18} color="#0369A1" />
              <Text style={styles.noticeText}>
                Always perform the Pre-Trip Vehicle Checklist before departure.
                Ensure tire pressure, fluid levels, and emergency kits are inspected.
              </Text>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              style={styles.bottomCloseButton}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.bottomCloseText}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SpecRow({ icon, label, value }) {
  return (
    <View style={styles.specRow}>
      <View style={styles.specLabelRow}>
        <Ionicons name={icon} size={16} color="#64748B" />
        <Text style={styles.specLabel}>{label}</Text>
      </View>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "flex-end",
  },
  modal: {
    maxHeight: "85%",
    backgroundColor: "#F1F3F9",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#951F21",
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerSub: {
    fontSize: 11.5,
    color: "rgba(255, 255, 255, 0.8)",
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  photoContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  photo: {
    width: "100%",
    height: 160,
  },
  titleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  titleCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  vehicleName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    flex: 1,
  },
  plateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  plateBadge: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateText: {
    color: "#F8FAFC",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  vehicleTypeTag: {
    color: "#64748B",
    fontSize: 12.5,
    fontWeight: "600",
  },
  specsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 10,
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  specLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  specLabel: {
    fontSize: 12.5,
    color: "#64748B",
  },
  specValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0F9FF",
    borderWidth: 1,
    borderColor: "#BAE6FD",
    padding: 10,
    borderRadius: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 11.5,
    color: "#0369A1",
    lineHeight: 16,
  },
  bottomCloseButton: {
    backgroundColor: "#951F21",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  bottomCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
