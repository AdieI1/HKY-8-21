import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

export default function NavigationActions({
  navigationState,
  setNavigationState,
  onDeliveryCompleted,
}) {
  const getMainButtonText = () => {
    if (navigationState === "preview") {
      return "Start Navigation";
    }

    if (navigationState === "in_transit_pickup") {
      return "Arrived at Pickup";
    }

    if (navigationState === "arrived_pickup") {
      return "Start Loading";
    }

    if (navigationState === "loading") {
      return "Finished Loading";
    }

    if (navigationState === "in_transit_dropoff") {
      return "Arrived at Drop-off";
    }

    if (navigationState === "arrived_dropoff") {
      return "Start Unloading";
    }

    if (navigationState === "unloading") {
      return "Finish Delivery";
    }

    return "Delivery Completed";
  };

  const handleMainAction = () => {
    if (navigationState === "preview") {
      setNavigationState("in_transit_pickup");
    } else if (navigationState === "in_transit_pickup") {
      setNavigationState("arrived_pickup");
    } else if (navigationState === "arrived_pickup") {
      setNavigationState("loading");
    } else if (navigationState === "loading") {
      setNavigationState("in_transit_dropoff");
    } else if (navigationState === "in_transit_dropoff") {
      setNavigationState("arrived_dropoff");
    } else if (navigationState === "arrived_dropoff") {
      setNavigationState("unloading");
    } else if (navigationState === "unloading") {
      setNavigationState("completed");

      // Tell Navigation.jsx that the delivery has finished
      if (onDeliveryCompleted) {
        onDeliveryCompleted();
      }
    }
  };

  const handleReportIssue = () => {
    console.log("Report Issue pressed");
  };

  const handleLongBreak = () => {
    console.log("Long Break pressed");
  };

  return (
    <View style={styles.actions}>

      {/* MAIN BUTTON */}

      <TouchableOpacity
        style={[
          styles.mainButton,
          navigationState === "completed" &&
            styles.completedButton,
        ]}
        onPress={handleMainAction}
        disabled={navigationState === "completed"}
      >
        <Text style={styles.mainButtonText}>
          {getMainButtonText()}
        </Text>

        {navigationState !== "completed" && (
          <Ionicons
            name="arrow-forward"
            size={20}
            color="#FFFFFF"
          />
        )}
      </TouchableOpacity>

      {/* SECONDARY BUTTONS */}

      <View style={styles.secondaryRow}>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleReportIssue}
        >
          <Ionicons
            name="warning-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.secondaryText}>
            Report Issue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleLongBreak}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color="#FFFFFF"
          />

          <Text style={styles.secondaryText}>
            Long Break
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 12,
  },

  mainButton: {
    height: 48,
    borderRadius: 9,
    backgroundColor: "#F24848",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 8,
  },

  completedButton: {
    backgroundColor: "#4E9F63",
  },

  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  secondaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },

  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 9,

    backgroundColor: "#A5A6AD",

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 7,
  },

  secondaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});