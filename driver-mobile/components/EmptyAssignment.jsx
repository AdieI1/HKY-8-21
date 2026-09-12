import { StyleSheet, View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function EmptyAssignment() {
  return (
    <View style={styles.container}>
      <Ionicons
        name="document-text-outline"
        size={70}
        color="#C9C9C9"
      />

      <Text style={styles.title}>
        No Assignments
      </Text>

      <Text style={styles.subtitle}>
        You're all caught up.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 120,
  },

  title: {
    marginTop: 18,
    fontSize: 22,
    fontWeight: "700",
    color: "#666",
  },

  subtitle: {
    marginTop: 6,
    color: "#999",
    fontSize: 15,
  },
});