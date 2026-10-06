import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

const FALLBACK_IMAGE = require("../../assets/images/truckpic.jpg");

export default function VehicleRecords({
  image,
  vehicle,
  type,
  time,
  inspectionType,
  status,
  onPress,
}) {
  const { theme, darkMode } = useTheme();
  const [imgError, setImgError] = useState(false);
  const imageSource = !imgError && image ? image : FALLBACK_IMAGE;
  const hasIssues = status === "Completed with issues";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.imageContainer}>
        <Image
          source={imageSource}
          onError={() => setImgError(true)}
          style={styles.image}
        />
      </View>

      <View style={styles.info}>
        <Text style={[styles.vehicle, { color: theme.text }]} numberOfLines={1}>
          {vehicle}
        </Text>

        <Text style={[styles.type, { color: theme.secondaryText }]} numberOfLines={1}>
          {type}
        </Text>

        <Text style={[styles.time, { color: theme.secondaryText }]}>
          {time}
        </Text>

        <Text
          style={[
            styles.inspectionType,
            inspectionType === "Post-Trip"
              ? styles.postTrip
              : styles.preTrip,
          ]}
        >
          {inspectionType}
        </Text>
      </View>

      <View style={styles.statusSection}>
        <View
          style={[
            styles.statusBadge,
            hasIssues
              ? darkMode
                ? { backgroundColor: "#3E2211", borderColor: "#7C3B14" }
                : styles.issueBadge
              : darkMode
              ? { backgroundColor: "#143322", borderColor: "#1F5938" }
              : styles.completedBadge,
          ]}
        >
          <Ionicons
            name={
              hasIssues
                ? "alert-circle-outline"
                : "checkmark-circle-outline"
            }
            size={13}
            color={
              hasIssues
                ? "#EA580C"
                : "#16A34A"
            }
          />

          <Text
            style={[
              styles.statusText,
              hasIssues
                ? styles.issueText
                : styles.completedText,
            ]}
          >
            {hasIssues ? (
              <>
                Completed
                {"\n"}
                with issues
              </>
            ) : (
              "Completed"
            )}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.secondaryText}
          style={styles.chevron}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 84,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 7,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1.5,
  },

  pressed: {
    opacity: 0.8,
  },

  imageContainer: {
    marginRight: 9,
  },

  image: {
    width: 68,
    height: 68,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },

  info: {
    flex: 1,
    justifyContent: "center",
  },

  vehicle: {
    fontSize: 14.5,
    fontWeight: "700",
    lineHeight: 18,
    marginBottom: 1,
  },

  type: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 1,
  },

  time: {
    fontSize: 11,
    lineHeight: 14,
    marginBottom: 2,
  },

  inspectionType: {
    fontSize: 10.5,
    fontWeight: "700",
    textDecorationLine: "underline",
    lineHeight: 13,
  },

  preTrip: {
    color: "#2563EB",
  },

  postTrip: {
    color: "#16A34A",
  },

  statusSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 6,
  },

  statusBadge: {
    minWidth: 80,
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },

  completedBadge: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  issueBadge: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
  },

  statusText: {
    fontSize: 9.5,
    fontWeight: "700",
    textAlign: "left",
    lineHeight: 11,
  },

  completedText: {
    color: "#16A34A",
  },

  issueText: {
    color: "#EA580C",
  },

  chevron: {
    marginLeft: 3,
  },
});