import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const FALLBACK_IMAGE = require("../../assets/images/truckpic.jpg");

export default function DetailsCard({
  image,
  vehicle,
  type,
  odometer,
  onPress,
}) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);
  const imageSource = !imgError && image ? image : FALLBACK_IMAGE;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push("/(tabs)/records");
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.pressed,
      ]}
      onPress={handlePress}
    >
      <Image
        source={imageSource}
        onError={() => setImgError(true)}
        style={styles.image}
      />

      <View style={styles.info}>
        <Text style={styles.vehicle}>
          {vehicle}
        </Text>

        <Text style={styles.type}>
          {type}
        </Text>

        <Text style={styles.odometer}>
          Odometer: {odometer}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 81,
    marginHorizontal: 9,
    marginTop: 0,
    padding: 6,
    borderRadius: 7,
    backgroundColor: "#F5F7FF",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D2D5DF",
  },

  pressed: {
    opacity: 0.75,
  },

  image: {
    width: 88,
    height: 69,
    borderRadius: 5,
    resizeMode: "cover",
  },

  info: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },

  vehicle: {
    color: "#454750",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },

  type: {
    color: "#6B6D76",
    fontSize: 11,
    marginBottom: 4,
  },

  odometer: {
    color: "#6B6D76",
    fontSize: 11,
  },
});