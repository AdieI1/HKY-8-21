import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

export default function ReportMessage() {
  return (
    <View style={styles.message}>
      <View style={styles.iconCircle}>
        <Ionicons
          name="checkmark"
          size={21}
          color="#FFFFFF"
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          Inspection Complete!
        </Text>

        <Text style={styles.description}>
          The issue has been reported to the admin and will be addressed promptly.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    message: {
    position: "absolute",
    top: 82,
    left: 51,
    right: 23,
    minHeight: 73,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#42B84A",
    backgroundColor: "#F9FBFF",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
    paddingRight: 12,
    zIndex: 50,
    elevation: 7,
    shadowColor: "#000",
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.16,
    shadowRadius: 4,
  },

  iconCircle: {
    width: 33,
    height: 33,
    borderRadius: 17,
    backgroundColor: "#42B84A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  textContainer: {
    flex: 1,
    justifyContent: "center",
  },

  title: {
    color: "#278F34",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },

  description: {
    color: "#65666D",
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 16,
  },
});