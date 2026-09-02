import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

export default function Header({
  name = "John Staff",
  avatar,
  onNotificationPress,
}) {
  return (
    <View style={styles.container}>

      {/* Left side */}
      <View style={styles.leftSection}>

        {/* Staff Profile Picture */}
        <Image
          source={
            avatar
              ? typeof avatar === "string"
                ? { uri: avatar }
                : avatar
              : require("../assets/images/staffpic.jpg")
          }
          style={styles.avatar}
          resizeMode="cover"
        />

        {/* Name */}
        <View style={styles.nameContainer}>
          <Text style={styles.welcomeText}>
            Welcome!
          </Text>

          <Text style={styles.nameText}>
            {name}
          </Text>
        </View>

      </View>

      {/* Notification Button */}
      <Pressable
        style={({ pressed }) => [
          styles.notificationButton,
          pressed && styles.notificationPressed,
        ]}
        onPress={onNotificationPress}
      >
        <Ionicons
          name="notifications-outline"
          size={23}
          color="#FFFFFF"
        />
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",

    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,

    marginRight: 10,
  },

  nameContainer: {
    justifyContent: "center",
  },

  welcomeText: {
    color: "#FFFFFF",

    fontSize: 17,
    fontWeight: "500",

    lineHeight: 20,
  },

  nameText: {
    color: "#FFFFFF",

    fontSize: 22,
    fontWeight: "700",

    lineHeight: 25,
  },

  notificationButton: {
    width: 36,
    height: 36,

    borderRadius: 18,

    borderWidth: 1.3,
    borderColor: "#FFFFFF",

    justifyContent: "center",
    alignItems: "center",
  },

  notificationPressed: {
    opacity: 0.7,
  },
});