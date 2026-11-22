import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function SaveMessage() {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons
          name="checkmark"
          size={20}
          color="#FFFFFF"
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Request saved to drafts
        </Text>

        <Text style={styles.subtitle}>
          You can continue it anytime from Drafts.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 105,
    left: 15,
    right: 15,
    minHeight: 65,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 8,
    zIndex: 2000,
  },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#35A853",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  textContainer: {
    flex: 1,
  },

  title: {
    fontSize: 14,
    fontWeight: "800",
    color: "#292A32",
  },

  subtitle: {
    fontSize: 11,
    color: "#777987",
    marginTop: 2,
  },
});