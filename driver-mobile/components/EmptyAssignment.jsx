import { StyleSheet, View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../src/context/ThemeContext";

export default function EmptyAssignment() {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons
        name="document-text-outline"
        size={70}
        color={theme.icon}
      />

      <Text style={[styles.title, { color: theme.text }]}>
        No Assignments
      </Text>

      <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
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
  },

  subtitle: {
    marginTop: 6,
    fontSize: 15,
  },
});