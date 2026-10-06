import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

const FALLBACK_IMAGE = require("../assets/images/truckpic.jpg");

export default function InspectionCard({
  image,
  vehicle = "ABC-1234",
  vehicleType = "FUSO - 10 Wheeler",
  time = "10:30 AM",
  inspectionType = "Pre-Trip",
  status = "Pending",
  onPress,
}) {
  const { theme, darkMode } = useTheme();
  const [imgError, setImgError] = useState(false);
  const imageSource = !imgError && image ? image : FALLBACK_IMAGE;

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
    >
      {/* Truck Image */}
      <Image
        source={imageSource}
        onError={() => setImgError(true)}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Vehicle Details */}
      <View style={styles.infoContainer}>
        <Text style={[styles.vehicle, { color: theme.text }]} numberOfLines={1}>
          {vehicle}
        </Text>

        <Text style={[styles.vehicleType, { color: theme.secondaryText }]} numberOfLines={1}>
          {vehicleType}
        </Text>

        <Text style={[styles.time, { color: theme.secondaryText }]}>
          {time}
        </Text>

        <Text
          style={[
            styles.inspectionType,
            inspectionType === "Pre-Trip"
              ? styles.preTrip
              : styles.postTrip,
          ]}
        >
          {inspectionType}
        </Text>
      </View>

      {/* Status */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusBadge,
            darkMode && { backgroundColor: "#3E2211", borderColor: "#7C3B14" },
          ]}
        >
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color="#E87521"
          />

          <Text style={styles.statusText}>
            {status}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.secondaryText}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },

  image: {
    width: 96,
    height: 74,
    borderRadius: 6,
    backgroundColor: "#CCCCCC",
  },

  infoContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: "center",
  },

  vehicle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 1,
  },

  vehicleType: {
    fontSize: 11.5,
    marginBottom: 1,
  },

  time: {
    fontSize: 11.5,
    marginBottom: 1,
  },

  inspectionType: {
    fontSize: 11.5,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  preTrip: {
    color: "#3B82F6",
  },

  postTrip: {
    color: "#10B981",
  },

  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
    gap: 4,
  },

  statusBadge: {
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#F0B889",
    backgroundColor: "#FFF0E4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  statusText: {
    color: "#E87521",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
  },
});