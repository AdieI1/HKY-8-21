import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

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
  const [imgError, setImgError] = useState(false);
  const imageSource = !imgError && image ? image : FALLBACK_IMAGE;

  return (
    <Pressable
      style={styles.card}
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
        <Text style={styles.vehicle}>
          {vehicle}
        </Text>

        <Text style={styles.vehicleType}>
          {vehicleType}
        </Text>

        <Text style={styles.time}>
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
        <View style={styles.statusBadge}>
          <Ionicons
            name="alert-circle-outline"
            size={15}
            color="#E87521"
          />

          <Text style={styles.statusText}>
            {status}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={22}
          color="#858585"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    height: 86,

    backgroundColor: "#F5F7FF",

    borderWidth: 1,
    borderColor: "#D5D8E2",

    borderRadius: 9,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 5,

    marginBottom: 8,
  },

  image: {
    width: 98,
    height: 76,

    borderRadius: 5,

    backgroundColor: "#CCCCCC",
  },

  infoContainer: {
    flex: 1,

    height: 76,

    marginLeft: 10,

    justifyContent: "center",
  },

  vehicle: {
    color: "#42434B",

    fontSize: 15,
    fontWeight: "700",

    marginBottom: 1,
  },

  vehicleType: {
    color: "#55565D",

    fontSize: 11.5,

    marginBottom: 1,
  },

  time: {
    color: "#55565D",

    fontSize: 11.5,

    marginBottom: 1,
  },

  inspectionType: {
    fontSize: 11.5,

    fontWeight: "700",

    textDecorationLine: "underline",
  },

  preTrip: {
    color: "#2D7DE9",
  },

  postTrip: {
    color: "#3C8D2C",
  },

  statusContainer: {
    height: 76,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    marginLeft: 5,
  },

  statusBadge: {
    height: 28,

    minWidth: 70,

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

    fontWeight: "500",

    marginLeft: 4,
  },
});