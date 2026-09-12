import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const pfpplaceholder = require("../assets/images/profilepic.png");

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "#F2A900" },
  approved: { label: "Approved", color: "#D9A51E" },
  dispatched: { label: "Dispatched", color: "#A64DE8" },
  assigned: { label: "Dispatched", color: "#A64DE8" },
  accepted: { label: "In Transit", color: "#4B88E8" },
  arrived_pickup: { label: "Arrived at Pickup", color: "#4B88E8" },
  loading_cargo: { label: "Loading Cargo", color: "#34B352" },
  out_for_delivery: { label: "On Delivery", color: "#4B88E8" },
  arrived_dropoff: { label: "Arrived at Drop-off", color: "#4B88E8" },
  unloading_cargo: { label: "Unloading Cargo", color: "#34B352" },
  returning_to_hq: { label: "Returning to HQ", color: "#4B88E8" },
  delivered: { label: "Delivered", color: "#45B84A" },
  completed: { label: "Complete", color: "#45B84A" },
  rejected: { label: "Rejected", color: "#C62828" },
};

const MAJOR_STEPS = [
  { key: "dispatched", label: "Dispatched" },
  { key: "in_transit", label: "In Transit" },
  { key: "arrived_pickup", label: "Arrived at Pick-up" },
  { key: "on_delivery", label: "On Delivery" },
  { key: "arrived_dropoff", label: "Arrived at Drop-off" },
  { key: "returning_to_hq", label: "Returning to HQ" },
  { key: "complete", label: "Complete" },
];

function getProgressInfo(statusKey) {
  switch (statusKey) {
    case "dispatched":
    case "assigned":
      return { stepIndex: 0, minorStatus: null };
    case "accepted":
    case "in_transit":
      return { stepIndex: 1, minorStatus: null };
    case "arrived_pickup":
      return { stepIndex: 2, minorStatus: null };
    case "loading_cargo":
    case "loading":
      return { stepIndex: 2, minorStatus: "loading cargo" };
    case "out_for_delivery":
    case "on_delivery":
      return { stepIndex: 3, minorStatus: null };
    case "arrived_dropoff":
      return { stepIndex: 4, minorStatus: null };
    case "unloading_cargo":
    case "unloading":
      return { stepIndex: 4, minorStatus: "unloading cargo" };
    case "returning_to_hq":
    case "returning":
      return { stepIndex: 5, minorStatus: null };
    case "delivered":
    case "completed":
      return { stepIndex: 6, minorStatus: null };
    default:
      return { stepIndex: -1, minorStatus: null };
  }
}

export default function DeliveryCard({ delivery, onReview }) {
  const status = STATUS_CONFIG[delivery.status] || STATUS_CONFIG.pending;
  const assigned = !["pending", "approved", "rejected"].includes(delivery.status);
  const progressInfo = getProgressInfo(delivery.backendStatus || delivery.status);

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
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusText}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={13} color="#E53935" />
          <Text style={styles.routeText}>
            {delivery.route || "Route unavailable"}
          </Text>
        </View>
        <View style={styles.dateRow}>
          <Ionicons name="calendar-outline" size={13} color="#E53935" />
          <Text style={styles.dateText}>
            Date Requested: {delivery.date || "N/A"}
          </Text>
        </View>
      </View>

      <View style={styles.driverSection}>
        <View style={styles.driverInfo}>
          <Image source={pfpplaceholder} style={styles.driverImage} />
          <View>
            <Text style={styles.driverName}>
              {assigned ? delivery.driver || "Assigned Driver" : "To be Assigned"}
            </Text>
            <Text style={styles.driverLabel}>Driver</Text>
          </View>
        </View>

        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicle}>
            {assigned ? delivery.vehicle || "Assigned Vehicle" : "To be Assigned"}
          </Text>
          <Text style={styles.plate}>
            Plate Number: {delivery.plate || "N/A"}
          </Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressLabels}>
          {MAJOR_STEPS.map((step, idx) => (
            <Text
              key={step.key}
              style={[
                styles.progressLabel,
                idx <= progressInfo.stepIndex && styles.progressLabelActive,
              ]}
              numberOfLines={2}
            >
              {step.label}
            </Text>
          ))}
        </View>

        <View style={styles.progressLineContainer}>
          <View style={styles.progressLine} />
          {progressInfo.stepIndex > 0 && (
            <View
              style={[
                styles.progressLineActive,
                { width: `${(Math.min(progressInfo.stepIndex, 6) / 6) * 100}%` },
              ]}
            />
          )}

          {MAJOR_STEPS.map((step, idx) => (
            <ProgressDot
              key={step.key}
              active={progressInfo.stepIndex >= idx}
              completed={progressInfo.stepIndex > idx || (progressInfo.stepIndex === 6 && idx === 6)}
              isCurrent={progressInfo.stepIndex === idx && progressInfo.stepIndex !== 6}
            />
          ))}
        </View>

        <View style={styles.progressBottom}>
          {progressInfo.minorStatus ? (
            <View style={styles.glowingContainer}>
              <View style={styles.glowingDot} />
              <Text style={styles.glowingText}>{progressInfo.minorStatus}</Text>
            </View>
          ) : (
            <View style={styles.emptyBottom} />
          )}
        </View>
      </View>

      {delivery.status === "delivered" && (
        <View style={styles.reviewSection}>
          <View style={styles.reviewTitleRow}>
            <Ionicons name="star" size={18} color="#F2B632" />
            <Text style={styles.reviewTitle}>How was your delivery?</Text>
          </View>
          <TouchableOpacity
            style={styles.reviewBtn}
            onPress={() => onReview && onReview(delivery)}
            activeOpacity={0.75}
          >
            <Text style={styles.reviewBtnText}>
              {delivery.hasReviewed ? "Update review" : "Leave a review"}
            </Text>
            <Ionicons name="chevron-forward" size={13} color="#DE2226" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ProgressDot({ active, completed, isCurrent }) {
  return (
    <View
      style={[
        styles.dot,
        active && styles.dotActive,
        isCurrent && styles.dotCurrent,
      ]}
    >
      {completed && <Ionicons name="checkmark" size={9} color="#FFFFFF" />}
    </View>
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
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    color: "#777987",
    fontSize: 7.5,
    fontWeight: "500",
    width: `${100 / 7}%`,
    textAlign: "center",
    lineHeight: 10,
  },
  progressLabelActive: {
    color: "#273342",
    fontWeight: "700",
  },
  progressLineContainer: {
    height: 24,
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative",
    paddingHorizontal: 4,
  },
  progressLine: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 3,
    backgroundColor: "#C9CBD5",
    zIndex: 1,
  },
  progressLineActive: {
    position: "absolute",
    left: 8,
    height: 3,
    backgroundColor: "#34B352",
    zIndex: 2,
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#A9ACBA",
    borderWidth: 1.5,
    borderColor: "#A9ACBA",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  dotActive: {
    backgroundColor: "#34B352",
    borderColor: "#34B352",
  },
  dotCurrent: {
    backgroundColor: "#34B352",
    borderColor: "#34B352",
    shadowColor: "#34B352",
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  progressBottom: {
    minHeight: 22,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  glowingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(52, 179, 82, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(52, 179, 82, 0.35)",
  },
  glowingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34B352",
    marginRight: 6,
    shadowColor: "#34B352",
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  glowingText: {
    color: "#2E7D32",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "lowercase",
    textShadowColor: "rgba(52, 179, 82, 0.7)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  emptyBottom: {
    height: 6,
  },
  reviewSection: {
    borderTopWidth: 1,
    borderTopColor: "#E0E2E9",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  reviewTitle: {
    color: "#E53935",
    fontSize: 13.5,
    fontWeight: "800",
    marginLeft: 6,
  },
  reviewBtn: {
    backgroundColor: "#FEECEB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    flexDirection: "row",
    alignItems: "center",
  },
  reviewBtnText: {
    color: "#DE2226",
    fontSize: 12,
    fontWeight: "700",
    marginRight: 4,
  },
});