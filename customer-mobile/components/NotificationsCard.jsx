import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function NotificationCard({ notification, onViewDetails }) {
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Ionicons
          name="happy-outline"
          size={20}
          color="#E53935"
        />

        <Text style={styles.title}>
          {notification.title}
        </Text>
      </View>

      <View style={styles.divider} />

      <Text style={styles.cargo}>
        Cargo: {notification.cargo}
      </Text>

      <View style={styles.locationRow}>
        <Ionicons
          name="location"
          size={14}
          color="#F24848"
        />

        <Text style={styles.location}>
          {notification.route}
        </Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.time}>
          {notification.time}
        </Text>

        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F8F9FD",
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E1E3EB",
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  title: {
    flex: 1,
    marginLeft: 8,
    color: "#E53935",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },

  divider: {
    height: 1,
    backgroundColor: "#E1E3EB",
  },

  cargo: {
    color: "#4B5260",
    fontSize: 15,
    marginTop: 10,
    marginHorizontal: 14,
    fontWeight: "600",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginHorizontal: 14,
  },

  location: {
    color: "#303744",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 12,
  },

  time: {
    color: "#707784",
    fontSize: 12,
  },

  viewDetails: {
    color: "#E53935",
    fontSize: 12,
    textDecorationLine: "underline",
    fontWeight: "600",
  },
});