import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function NotificationCard({
  notification,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        !notification.read && styles.unreadCard,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.assignmentRow}>
          <Ionicons
            name="bus-outline"
            size={17}
            color="#F24848"
          />

          <Text style={styles.assignmentText}>
            {notification.type}
          </Text>
        </View>

        <Text style={styles.time}>
          {notification.time}
        </Text>
      </View>

      <Text style={styles.driverName}>
        {notification.driver}
      </Text>

      <Text style={styles.details}>
        Cargo type: {notification.cargo}
      </Text>

      <Text style={styles.details}>
        Weight: {notification.weight}
      </Text>

      <View style={styles.divider} />

      <View style={styles.locationRow}>
        <Ionicons
          name="location"
          size={17}
          color="#F24848"
        />

        <Text style={styles.location}>
          Pick-up location: {notification.location}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F4F5FC",
    borderRadius: 10,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 3,
  },

  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: "#F24848",
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
  },

  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  assignmentText: {
    color: "#D62B2B",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },

  time: {
    fontSize: 9,
    color: "#666873",
  },

  driverName: {
    color: "#D62B2B",
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 8,
    marginTop: 2,
  },

  details: {
    color: "#30313A",
    fontSize: 10,
    marginLeft: 8,
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#C8C9D0",
    marginTop: 8,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  location: {
    color: "#3D3E46",
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 4,
    flex: 1,
  },
});