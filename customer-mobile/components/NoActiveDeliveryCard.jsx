import { Ionicons } from "@expo/vector-icons";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

const { width, height } = Dimensions.get("window");

export default function NoActiveDeliveryCard() {
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
      <Text style={styles.title}>
        Active Deliveries
      </Text>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.content}>
        <View style={styles.boxIcon}>
          <Ionicons
            name="cube-outline"
            size={32}
            color="#FFFFFF"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.header, { color: colors.text }]}>
            No active deliveries yet!
          </Text>

          <Text style={[styles.subheader, { color: colors.textMuted }]}>
            Tap Schedule Delivery to schedule your
            first delivery!
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 15,
    padding: width * 0.05,
    marginTop: height * 0.02,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  title: {
    fontSize: width * 0.065,
    fontWeight: "900",
    color: "#DE2226",
  },

  divider: {
    height: 1,
    marginVertical: height * 0.012,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
  },

  boxIcon: {
    backgroundColor: "#DE2226",
    borderRadius: 10,
    width: width * 0.17,
    height: width * 0.17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: width * 0.04,
  },

  textContainer: {
    flex: 1,
  },

  header: {
    fontSize: width * 0.045,
    fontWeight: "800",
  },

  subheader: {
    fontSize: width * 0.035,
    marginTop: 4,
  },
});