import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

const FALLBACK_AVATAR = require("../assets/images/staffpic.jpg");

export default function Header({
  name = "Inspector",
  avatar,
  unreadCount = 0,
  onNotificationPress,
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatar]);

  const imageSource =
    !imgError && avatar
      ? typeof avatar === "string"
        ? { uri: avatar }
        : avatar
      : FALLBACK_AVATAR;

  return (
    <View style={styles.container}>

      {/* Left side */}
      <View style={styles.leftSection}>

        {/* Staff Profile Picture */}
        <View style={styles.avatarWrapper}>
          <Image
            source={imageSource}
            onError={() => setImgError(true)}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>

        {/* Name */}
        <View style={styles.nameContainer}>
          <Text style={styles.welcomeText}>
            Welcome Inspector!
          </Text>

          <Text style={styles.nameText} numberOfLines={1}>
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
          size={22}
          color="#FFFFFF"
        />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
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

  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    marginRight: 10,
    overflow: "hidden",
    backgroundColor: "#7D1518",
  },

  avatar: {
    width: "100%",
    height: "100%",
  },

  nameContainer: {
    justifyContent: "center",
    maxWidth: 220,
  },

  welcomeText: {
    color: "#F0D8D9",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
    lineHeight: 18,
    textTransform: "uppercase",
  },

  nameText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },

  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.3,
    borderColor: "rgba(255, 255, 255, 0.6)",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FACC15",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#9E1E21",
  },

  badgeText: {
    color: "#1E293B",
    fontSize: 10,
    fontWeight: "800",
  },

  notificationPressed: {
    opacity: 0.7,
  },
});