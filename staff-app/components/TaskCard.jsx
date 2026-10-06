import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

const FALLBACK_IMAGE = require("../assets/images/truckpic.jpg");

export default function TaskCard({
  image,
  vehicle = "ABC - 1234",
  type = "10 wheeler - Fuso",
  date,
  time = "10:30 AM",
  inspectionType,
  onPress,
}) {
  const { theme } = useTheme();
  const [imgError, setImgError] = useState(false);
  const imageSource = !imgError && image ? image : FALLBACK_IMAGE;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { borderBottomColor: theme.border },
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
    >
      {/* LEFT SIDE */}
      <View style={styles.leftSection}>
        <Image
          source={imageSource}
          onError={() => setImgError(true)}
          style={styles.vehicleImage}
          resizeMode="cover"
        />

        <View style={styles.vehicleInfo}>
          <View style={styles.nameRow}>
            <Text style={[styles.vehicleName, { color: theme.text }]} numberOfLines={1}>
              {vehicle}
            </Text>
            {Boolean(inspectionType) && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      inspectionType === "Pre-Trip" ? "#EFF6FF" : "#ECFDF5",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        inspectionType === "Pre-Trip" ? "#2563EB" : "#059669",
                    },
                  ]}
                >
                  {inspectionType}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.vehicleType, { color: theme.secondaryText }]} numberOfLines={1}>
            {type}
          </Text>
        </View>
      </View>

      {/* DATE & TIME */}
      <View style={styles.dateTimeContainer}>
        {Boolean(date) && (
          <Text style={[styles.dateText, { color: theme.secondaryText }]}>
            {date}
          </Text>
        )}
        <Text style={[styles.timeText, { color: theme.secondaryText }]}>
          {time}
        </Text>
      </View>
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
    backgroundColor: "#E2E8F0",
  },

  vehicleInfo: {
    flex: 1,
    justifyContent: "center",
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },

  vehicleName: {
    fontSize: 15,
    fontWeight: "700",
  },

  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },

  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  vehicleType: {
    fontSize: 11.5,
  },

  dateTimeContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
    marginLeft: 8,
  },

  dateText: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },

  timeText: {
    fontSize: 10,
    fontWeight: "500",
  },
});