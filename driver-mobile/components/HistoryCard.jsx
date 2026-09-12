import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function HistoryCard({ delivery }) {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <Text style={styles.customer}>
          {delivery.customer}
        </Text>

        <Text style={styles.date}>
          {delivery.date}
        </Text>
      </View>

      <Text style={styles.details}>
        <Text style={styles.bold}>Cargo type:</Text>{" "}
        {delivery.cargo}
      </Text>

      <Text style={styles.details}>
        <Text style={styles.bold}>Weight:</Text>{" "}
        {delivery.weight}
      </Text>

      <View style={styles.divider} />

      <View style={styles.locationRow}>
        <Ionicons
          name="location"
          size={18}
          color="#F24848"
        />

        <Text style={styles.location}>
          <Text style={styles.bold}>
            Pick-up location:
          </Text>{" "}
          {delivery.pickup}
        </Text>
      </View>

      <View style={styles.locationRow}>
        <Ionicons
          name="location"
          size={18}
          color="#F24848"
        />

        <Text style={styles.location}>
          <Text style={styles.bold}>
            Drop-off location:
          </Text>{" "}
          {delivery.dropoff}
        </Text>
      </View>

      <Text style={styles.ratingLabel}>
        Customer Rating:{" "}
        <Text style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              style={{
                color:
                  delivery.rating && star <= delivery.rating
                    ? "#F29A38"
                    : "#C8C9D0",
              }}
            >
              ★
            </Text>
          ))}
        </Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F4F5FC",
    borderRadius: 9,
    marginBottom: 13,
    paddingTop: 10,
    overflow: "hidden",
    elevation: 2,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 10,
  },

  customer: {
    color: "#D62B2B",
    fontSize: 19,
    fontWeight: "800",
    flex: 1,
  },

  date: {
    color: "#555660",
    fontSize: 10,
    marginTop: 3,
  },

  details: {
    color: "#30313A",
    fontSize: 11,
    marginLeft: 10,
    marginTop: 3,
  },

  bold: {
    fontWeight: "700",
    color: "#292A32",
  },

  divider: {
    height: 1,
    backgroundColor: "#C8C9D0",
    marginTop: 8,
    marginBottom: 6,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 10,
    marginTop: 4,
  },

  location: {
    color: "#555660",
    fontSize: 11,
    lineHeight: 15,
    marginLeft: 5,
    flex: 1,
  },

  ratingLabel: {
    color: "#292A32",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 10,
  },

  stars: {
    fontSize: 16,
    letterSpacing: 1,
  },
});