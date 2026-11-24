import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../src/context/ThemeContext";

export default function NotificationCard({
  notification,
  onPress,
}) {
  const { theme, darkMode } = useTheme();
  const isUnread = notification.read === false;
  const iconName = notification.isRating
    ? "star"
    : notification.isInspectionCleared
    ? "checkmark-circle"
    : "bus-outline";
  const accentColor = notification.isInspectionCleared ? "#16A34A" : theme.primary;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: isUnread ? accentColor : theme.border,
          borderWidth: isUnread ? 1.5 : (darkMode ? 1 : 0),
          borderLeftWidth: isUnread ? 4 : (darkMode ? 1 : 0),
          borderLeftColor: isUnread ? accentColor : theme.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.assignmentRow}>
          <Ionicons
            name={iconName}
            size={17}
            color={accentColor}
          />

          <Text style={[styles.assignmentText, { color: accentColor }]}>
            {notification.type}
          </Text>

          {isUnread && (
            <View style={{ backgroundColor: accentColor, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginLeft: 6 }}>
              <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "800" }}>NEW</Text>
            </View>
          )}
        </View>

        <Text style={[styles.time, { color: theme.secondaryText }]}>
          {notification.time}
        </Text>
      </View>

      <Text style={[styles.driverName, { color: accentColor }]}>
        {notification.driver}
      </Text>

      <Text style={[styles.details, { color: theme.secondaryText }]}>
        {notification.isRating || notification.isInspectionCleared
          ? notification.cargo
          : `Cargo type: ${notification.cargo}`}
      </Text>

      <Text style={[styles.details, { color: theme.secondaryText }]}>
        {notification.isRating
          ? `Comments: ${notification.weight}`
          : notification.isInspectionCleared
          ? `Cargo: ${notification.weight}`
          : `Weight: ${notification.weight}`}
      </Text>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.locationRow}>
        <Ionicons
          name="location"
          size={17}
          color={accentColor}
        />

        <Text style={[styles.location, { color: theme.text }]}>
          {notification.isRating
            ? `Delivery location: ${notification.location}`
            : `Pick-up location: ${notification.location}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F4F5FC",
    borderRadius: 10,
    marginBottom: 15,
    overflow: "hidden",
    elevation: 3,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
  },

  assignmentRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  assignmentText: {
    color: "#D62B2B",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },

  time: {
    fontSize: 9,
    color: "#666873",
  },

  driverName: {
    color: "#D62B2B",
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 8,
    marginTop: 2,
  },

  details: {
    color: "#30313A",
    fontSize: 10,
    marginLeft: 8,
    marginTop: 1,
  },

  divider: {
    height: 1,
    backgroundColor: "#C8C9D0",
    marginTop: 8,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  location: {
    color: "#3D3E46",
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 4,
    flex: 1,
  },
});