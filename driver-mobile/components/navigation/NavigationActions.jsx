import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useState } from "react";

import Ionicons from "@expo/vector-icons/Ionicons";

export default function NavigationActions({
  navigationState,
  setNavigationState,
  onDeliveryCompleted,
  onStatusChange,
}) {
  const [changing, setChanging] = useState(false);
  const getMainButtonText = () => {
    if (navigationState === "preview") {
      return "Start Navigation";
    }

    if (navigationState === "in_transit_pickup") {
      return "Arrived at Pickup";
    }

    if (navigationState === "arrived_pickup") {
      return "Start loading cargo";
    }

    if (navigationState === "loading") {
      return "Finished loading cargo";
    }

    if (navigationState === "in_transit_dropoff") {
      return "Arrived at Drop-off";
    }

    if (navigationState === "arrived_dropoff") {
      return "Start unloading cargo";
    }

    if (navigationState === "unloading") {
      return "Finish Delivery";
    }

    return "Delivery Completed";
  };

  const handleMainAction = async () => {
    const transitions = {
      preview: ["in_transit_pickup", "accepted"],
      in_transit_pickup: ["arrived_pickup", "arrived_pickup"],
      arrived_pickup: ["loading", "loading_cargo"],
      loading: ["in_transit_dropoff", "out_for_delivery"],
      in_transit_dropoff: ["arrived_dropoff", "arrived_dropoff"],
      arrived_dropoff: ["unloading", "unloading_cargo"],
      unloading: ["completed", "returning_to_hq"],
    };

    const transition = transitions[navigationState];
    if (!transition) return;

    try {
      setChanging(true);

      if (transition[1] && onStatusChange) {
        await onStatusChange(transition[1]);
      }

      setNavigationState(transition[0]);

      if (transition[0] === "completed" && onDeliveryCompleted) {
        onDeliveryCompleted();
      }
    } catch (error) {
      Alert.alert(
        "Unable to Update Delivery",
        error?.message || "Could not connect to the server."
      );
    } finally {
      setChanging(false);
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
        disabled={navigationState === "completed" || changing}
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