import { LinearGradient } from "expo-linear-gradient";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function InspectionHeader() {
  return (
    <LinearGradient
      colors={["#4F0A11", "#9E1E21"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.header}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          Vehicle Inspection
        </Text>

        <Text style={styles.subtitle}>
          Inspection Assignments.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 210,
    width: "100%",
    paddingTop: 45,
    paddingHorizontal: 16,
    zIndex: 10,
  },

  content: {
    width: "100%",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },

  subtitle: {
    color: "#F0D8D9",
    fontSize: 13,
    fontWeight: "400",
  },
});