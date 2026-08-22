import { Ionicons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width, height } = Dimensions.get("window");

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    color: "#F2A900",
  },
  approved: {
    label: "Approved",
    color: "#D9A51E",
  },
  dispatched: {
    label: "Dispatched",
    color: "#A64DE8",
  },
  intransit: {
    label: "In Transit",
    color: "#4B88E8",
  },
  delivered: {
    label: "Delivered",
    color: "#45B84A",
  },
};

export default function ActiveDeliveryCard({
  delivery,
  onViewDetails,
}) {
  const status =
    STATUS_CONFIG[delivery.status] ||
    STATUS_CONFIG.pending;

  return (
    <View style={styles.card}>
      {/* TITLE */}
      <Text style={styles.title}>
        Active Deliveries
      </Text>

      <View style={styles.divider} />

      {/* CARGO */}
      <View style={styles.deliveryRow}>
        <View style={styles.boxIcon}>
          <Ionicons
            name="cube"
            size={34}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.cargoInfo}>
          <Text style={styles.cargoName}>
            {delivery.cargoName || "Electronics Cargo"}
          </Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              Status:
            </Text>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: status.color },
              ]}
            >
              <Text style={styles.statusText}>
                {status.label}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={onViewDetails}
          activeOpacity={0.7}
        >
          <Text style={styles.viewDetails}>
            View details
          </Text>
        </TouchableOpacity>
      </View>

      {/* DATE */}
      <Text style={styles.date}>
        <Text style={styles.dateBold}>
          Date requested:
        </Text>{" "}
        {delivery.date || "3/30/2026"}
      </Text>

      <View style={styles.divider} />

      {/* ROUTE */}
      <View style={styles.routeRow}>
        <Ionicons
          name="location"
          size={22}
          color="#F24848"
        />

        <Text style={styles.route}>
          {delivery.route || "Port Area - Malaybalay"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: height * 0.02,
    overflow: "hidden",
  },

  title: {
    color: "#DE2226",
    fontSize: width * 0.065,
    fontWeight: "900",
    paddingHorizontal: width * 0.03,
    paddingTop: height * 0.015,
  },

  divider: {
    height: 1,
    backgroundColor: "#D9DCE3",
    marginTop: height * 0.01,
  },

  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: width * 0.03,
    paddingTop: height * 0.015,
  },

  boxIcon: {
    width: width * 0.16,
    height: width * 0.16,
    borderRadius: 5,
    backgroundColor: "#4D8BEA",
    alignItems: "center",
    justifyContent: "center",
  },

  cargoInfo: {
    flex: 1,
    marginLeft: width * 0.025,
  },

  cargoName: {
    color: "#273342",
    fontSize: width * 0.045,
    fontWeight: "800",
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  statusLabel: {
    color: "#273342",
    fontSize: width * 0.033,
    fontWeight: "600",
  },

  statusBadge: {
    marginLeft: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },

  statusText: {
    color: "#FFFFFF",
    fontSize: width * 0.029,
    fontWeight: "700",
  },

  viewDetails: {
    color: "#E53935",
    fontSize: width * 0.032,
    fontWeight: "600",
    textDecorationLine: "underline",
    marginLeft: 5,
  },

  date: {
    color: "#555D68",
    fontSize: width * 0.032,
    marginHorizontal: width * 0.03,
    marginTop: height * 0.012,
    marginBottom: height * 0.008,
  },

  dateBold: {
    fontWeight: "600",
    color: "#273342",
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: width * 0.03,
    paddingVertical: height * 0.012,
  },

  route: {
    color: "#273342",
    fontSize: width * 0.043,
    fontWeight: "700",
    marginLeft: 6,
  },
});