import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";

import Ionicons from "@expo/vector-icons/Ionicons";

export default function NavigationActions({
  navigationState,
  setNavigationState,
  onDeliveryCompleted,
  onStatusChange,
  onRequestProofOfDelivery,
  onRequestCargoChecklist,
  onConfirmHqArrival,
  isNearHq = false,
  hqDistanceMeters = null,
  delivery,
}) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);

  const hasChecklist = (type) =>
    Array.isArray(delivery?.checklists) &&
    delivery.checklists.some((c) => c?.type === type);
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
      return "Finish Delivery (Submit POD)";
    }

    if (navigationState === "returning_to_hq") {
      if (changing) {
        return "Confirming HQ Arrival...";
      }
      if (isNearHq) {
        return `Arrived at HJY Headquarters (${hqDistanceMeters ?? 0}m)`;
      }
      return "Arrived at HJY Headquarters";
    }

    return "Delivery Completed";
  };

  const handleMainAction = async () => {
    const requiredCargoStageByState = {
      arrived_pickup: "pre_loading",
      loading: "post_loading",
      arrived_dropoff: "pre_unloading",
      unloading: "post_unloading",
    };

    const requiredStage = requiredCargoStageByState[navigationState];
    if (requiredStage && !hasChecklist(requiredStage) && onRequestCargoChecklist) {
      onRequestCargoChecklist(requiredStage);
      return;
    }

    if (navigationState === "unloading") {
      if (onRequestProofOfDelivery) {
        onRequestProofOfDelivery();
        return;
      }
    }

    if (navigationState === "returning_to_hq") {
      if (!onConfirmHqArrival) return;
      try {
        setChanging(true);
        await onConfirmHqArrival();
      } catch (error) {
        Alert.alert(
          "Unable to Confirm HQ Arrival",
          error?.message || "Could not connect to the server."
        );
      } finally {
        setChanging(false);
      }
      return;
    }

    const transitions = {
      preview: ["in_transit_pickup", "accepted"],
      in_transit_pickup: ["arrived_pickup", "arrived_pickup"],
      arrived_pickup: ["loading", "loading_cargo"],
      loading: ["in_transit_dropoff", "out_for_delivery"],
      in_transit_dropoff: ["arrived_dropoff", "arrived_dropoff"],
      arrived_dropoff: ["unloading", "unloading_cargo"],
      unloading: ["completed", "completed"],
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
      if (error?.message?.toLowerCase().includes("pre-trip")) {
        Alert.alert(
          "Pre-Trip Checklist Required",
          "Please complete the vehicle pre-trip inspection before starting navigation.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Inspect Vehicle",
              onPress: () => {
                const targetId = delivery?.delivery_id || delivery?.id;
                router.push({
                  pathname: "/pretripcheck",
                  params: targetId ? { deliveryId: String(targetId) } : {},
                });
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Unable to Update Delivery",
          error?.message || "Could not connect to the server."
        );
      }
    } finally {
      setChanging(false);
    }
  };

  return (
    <View style={styles.actions}>
      {/* MAIN BUTTON */}
      <TouchableOpacity
        style={[
          styles.mainButton,
          navigationState === "returning_to_hq" && styles.returningButton,
          navigationState === "returning_to_hq" && isNearHq && styles.nearHqButton,
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
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 2,
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
  returningButton: {
    backgroundColor: "#EA580C",
  },
  nearHqButton: {
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#DCFCE7",
    elevation: 6,
  },

  mainButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});