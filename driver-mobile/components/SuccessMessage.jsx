import {
  StyleSheet,
  View,
  Text,
} from "react-native";
import { useEffect } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function SuccessMessage({ onHide }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onHide) {
        onHide();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [onHide]);

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
          Delivery Completed
        </Text>

        <Text style={styles.message}>
          Good job! Please wait for your next assignment.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 70,
    left: 20,
    right: 20,
    zIndex: 100,
    elevation: 10,
    backgroundColor: "#F1F2FA",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#3D9B58",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  textContainer: {
    flex: 1,
  },

  title: {
    fontSize: 14,
    fontWeight: "900",
    color: "#3D9B58",
  },

  message: {
    fontSize: 11,
    color: "#777987",
    marginTop: 3,
  },
});