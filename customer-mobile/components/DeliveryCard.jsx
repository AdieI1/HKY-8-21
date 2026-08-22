import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const pfpplaceholder = require("../assets/images/profilepic.png");

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#F2A900", progress: 0 },
  approved: { label: "Approved", color: "#D9A51E", progress: 1 },
  dispatched: { label: "Dispatched", color: "#A64DE8", progress: 2 },
  intransit: { label: "In Transit", color: "#4B88E8", progress: 3 },
  delivered: { label: "Delivered", color: "#45B84A", progress: 4 },
};

export default function DeliveryCard({ delivery, onReview }) {
  const status =
    STATUS_CONFIG[delivery.status] || STATUS_CONFIG.pending;

  const assigned = [
    "dispatched",
    "intransit",
    "delivered",
  ].includes(delivery.status);

  const approved = [
    "approved",
    "dispatched",
    "intransit",
    "delivered",
  ].includes(delivery.status);

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.cargoRow}>
          <View style={styles.cargoIcon}>
            <Ionicons name="cube" size={16} color="#FFFFFF" />
          </View>

          <Text style={styles.cargoName}>
            {delivery.cargoName || delivery.cargo || "Cargo"}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: status.color },
          ]}
        >
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={13} color="#E53935" />
          <Text style={styles.routeText}>
            {delivery.route || "Pickup - Drop-off"}
          </Text>
        </View>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={13}
            color="#E53935"
          />
          <Text style={styles.dateText}>
            Date Requested: {delivery.date || "March 30, 2026"}
          </Text>
        </View>
      </View>

      <View style={styles.driverSection}>
        <View style={styles.driverInfo}>
          <Image source={pfpplaceholder} style={styles.driverImage} />

          <View>
            <Text style={styles.driverName}>
              {assigned
                ? delivery.driver || "John Jones"
                : "To be Assigned"}
            </Text>

            <Text style={styles.driverLabel}>Driver</Text>
          </View>
        </View>

        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicle}>
            {assigned
              ? delivery.vehicle || "Fuso FJ 2828R"
              : "Fuso FJ 2828R"}
          </Text>

          <Text style={styles.plate}>
            Plate Number: {delivery.plate || "XYZ 1213"}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>In Transit</Text>
          <Text style={styles.progressLabel}>Arrived at Pick-up</Text>
          <Text style={styles.progressLabel}>Arrived at Drop-off</Text>
          <Text style={styles.progressLabel}>Complete</Text>
        </View>

        <View style={styles.progressLineContainer}>
          <View style={styles.progressLine} />

          <ProgressDot
            active={status.progress >= 0}
            completed={status.progress > 0}
            color={status.color}
          />

          <ProgressDot
            active={status.progress >= 1}
            completed={status.progress > 1}
            color={status.color}
          />

          <ProgressDot
            active={status.progress >= 2}
            completed={status.progress > 2}
            color={status.color}
          />

          <ProgressDot
            active={status.progress >= 3}
            completed={status.progress >= 4}
            color={status.color}
          />
        </View>

        <View style={styles.progressBottom}>
          <Text style={styles.bottomLabel}>Arrived at Pick-up</Text>
          <Text style={styles.bottomLabel}>Arrived at Drop-off</Text>
        </View>
      </View>

      {delivery.status === "delivered" && (
        <View style={styles.reviewSection}>
          <View style={styles.reviewTitleRow}>
            <Ionicons name="star" size={17} color="#F2B632" />

            <Text style={styles.reviewTitle}>
              How was your delivery?
            </Text>
          </View>

          <TouchableOpacity onPress={onReview} activeOpacity={0.7}>
            <Text style={styles.reviewLink}>Leave a review</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ProgressDot({ active, completed, color }) {
  return (
    <View
      style={[
        styles.dot,
        active && {
          borderColor: color,
          backgroundColor: completed ? color : "#FFFFFF",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F7F8FC",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E1E3EB",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },

  cargoRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  cargoIcon: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: "#4D8BEA",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  cargoName: {
    color: "#E53935",
    fontSize: 17,
    fontWeight: "800",
  },

  statusBadge: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  routeSection: {
    paddingHorizontal: 16,
    paddingTop: 9,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E2E9",
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  routeText: {
    marginLeft: 7,
    color: "#30313A",
    fontSize: 13,
    fontWeight: "600",
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  dateText: {
    marginLeft: 7,
    color: "#555761",
    fontSize: 11,
  },

  driverSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  driverInfo: {
    flexDirection: "row",
    alignItems: "center",
  },

  driverImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },

  driverName: {
    color: "#30313A",
    fontSize: 13,
    fontWeight: "800",
  },

  driverLabel: {
    color: "#777987",
    fontSize: 11,
    marginTop: 2,
  },

  vehicleInfo: {
    alignItems: "flex-end",
  },

  vehicle: {
    color: "#E53935",
    fontSize: 13,
    fontWeight: "900",
  },

  plate: {
    color: "#777987",
    fontSize: 10,
    marginTop: 3,
  },

  progressSection: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },

  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  progressLabel: {
    color: "#555761",
    fontSize: 9,
    width: "25%",
    textAlign: "center",
  },

  progressLineContainer: {
    height: 24,
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
  },

  progressLine: {
    position: "absolute",
    left: 5,
    right: 5,
    height: 3,
    backgroundColor: "#C9CBD5",
  },

  dot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#A9ACBA",
    borderWidth: 2,
    borderColor: "#A9ACBA",
  },

  progressBottom: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 2,
  },

  bottomLabel: {
    color: "#777987",
    fontSize: 9,
  },

  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: "#E0E2E9",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  reviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  reviewTitle: {
    color: "#E53935",
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 6,
  },

  reviewLink: {
    color: "#E53935",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 23,
    marginTop: 4,
    textDecorationLine: "underline",
  },
});