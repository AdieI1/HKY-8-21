import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

const FALLBACK_IMAGE = require("../assets/images/truckpic.jpg");

export default function TaskCard({
  image,
  vehicle = "ABC - 1234",
  type = "10 wheeler - Fuso",
  time = "10:30 AM",
  onPress,
}) {
  const [imgError, setImgError] = useState(false);
  const imageSource = !imgError && image ? image : FALLBACK_IMAGE;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
    >

      {/* =================================
          LEFT SIDE
      ================================= */}
      <View style={styles.leftSection}>

        {/* Truck Image */}
        <Image
          source={imageSource}
          onError={() => setImgError(true)}
          style={styles.vehicleImage}
          resizeMode="cover"
        />

        {/* Vehicle Information */}
        <View style={styles.vehicleInfo}>

          <Text style={styles.vehicleName}>
            {vehicle}
          </Text>

          <Text style={styles.vehicleType}>
            {type}
          </Text>

        </View>

      </View>

      {/* =================================
          TIME
      ================================= */}
      <Text style={styles.time}>
        {time}
      </Text>

    </Pressable>
  );
}

const styles = StyleSheet.create({

  container: {
    minHeight: 82,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",

    paddingVertical: 10,

    borderBottomWidth: 1,

    borderBottomColor: "#C9C9C9",
  },

  containerPressed: {
    opacity: 0.75,
  },

  leftSection: {
    flexDirection: "row",

    alignItems: "center",

    flex: 1,
  },

  vehicleImage: {
    width: 72,

    height: 55,

    borderRadius: 6,

    marginRight: 10,
  },

  vehicleInfo: {
    flex: 1,

    justifyContent: "center",
  },

  vehicleName: {
    color: "#41434D",

    fontSize: 15,

    fontWeight: "700",

    marginBottom: 3,
  },

  vehicleType: {
    color: "#777A84",

    fontSize: 11,
  },

  time: {
    color: "#6D707B",

    fontSize: 11,

    marginLeft: 5,
  },
});