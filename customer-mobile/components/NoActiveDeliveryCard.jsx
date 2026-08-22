import { Ionicons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

export default function NoActiveDeliveryCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        Active Deliveries
      </Text>

      <View style={styles.divider} />

      <View style={styles.content}>
        <View style={styles.boxIcon}>
          <Ionicons
            name="cube-outline"
            size={32}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.header}>
            No active deliveries yet!
          </Text>

          <Text style={styles.subheader}>
            Tap "Create Request" to schedule your
            first delivery!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: width * 0.05,
    marginTop: height * 0.02,
  },

  title: {
    fontSize: width * 0.065,
    fontWeight: "900",
    color: "#DE2226",
  },

  divider: {
    height: 1,
    backgroundColor: "#D1D1D1",
    marginVertical: height * 0.012,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
  },

  boxIcon: {
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: 12,
    backgroundColor: "#3286E8",
    justifyContent: "center",
    alignItems: "center",
  },

  textContainer: {
    flex: 1,
    marginLeft: 10,
  },

  header: {
    fontSize: width * 0.045,
    fontWeight: "700",
    color: "#252B35",
  },

  subheader: {
    fontSize: width * 0.032,
    color: "#4E5966",
    marginTop: 3,
  },
});