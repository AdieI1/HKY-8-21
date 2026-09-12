import { Ionicons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const { width, height } = Dimensions.get("window");

export default function DeliverySection({ pickup, dropoff, onOpenMap }) {

  const handleOpenMap = (type) => {
    if (onOpenMap) onOpenMap(type);
  };

  return (
    <View style={styles.card}>

      <Text style={styles.title}>Delivery Location</Text> 
      <View style={styles.divider} />

      <Text style={styles.label}>Select Pick-up address</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => handleOpenMap("pickup")}
      >
        <View style={styles.row}>
          <Ionicons name="location-sharp" size={18} color="#E53935" />
          <Text style={styles.text}>
            {pickup?.address ? pickup.address : "Tap to select pickup location"}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>Set Drop-off address</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => handleOpenMap("dropoff")}
      >
        <View style={styles.row}>
          <Ionicons name="location-sharp" size={18} color="#E53935" />
          <Text style={styles.text}>
            {dropoff?.address ? dropoff.address : "Tap to select drop-off location"}
          </Text>
        </View>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: width * 0.04,
    borderRadius: width * 0.04,
    marginBottom: height * 0.015,
  },

  title: {
    fontSize: width * 0.04,
    fontWeight: "700",
    color: "#E53935",
    marginBottom: height * 0.01,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginBottom: height * 0.01,
  },

  label: {
    fontSize: width * 0.032,
    color: "#777",
    marginBottom: 4,
  },

  input: {
    backgroundColor: "#F1F2F4",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.03,
    borderRadius: width * 0.03,
    marginBottom: height * 0.012,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  text: {
    fontSize: width * 0.035,
    color: "#777",
    marginLeft: 8,
    flex: 1,
  },
});