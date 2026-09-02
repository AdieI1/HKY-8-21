import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";

export default function NavigationHeader({
  navigationState,
}) {
  const getTitle = () => {
    if (navigationState === "preview") {
      return "Tracking";
    }

    if (navigationState === "in_transit_pickup") {
      return "Going to Pickup";
    }

    if (navigationState === "arrived_pickup") {
      return "Arrived at Pickup";
    }

    if (navigationState === "loading") {
      return "Loading Cargo";
    }

    if (navigationState === "in_transit_dropoff") {
      return "Going to Drop-off";
    }

    if (navigationState === "arrived_dropoff") {
      return "Arrived at Drop-off";
    }

    if (navigationState === "unloading") {
      return "Unloading Cargo";
    }

    if (navigationState === "completed") {
      return "Delivery Completed";
    }

    return "Tracking";
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons
          name="arrow-back"
          size={30}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <Text style={styles.title}>
        {getTitle()}
      </Text>

      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 62,
    width: "100%",
    backgroundColor: "#A91F24",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    elevation: 9999,
  },

  backButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },

  placeholder: {
    width: 42,
  },
});