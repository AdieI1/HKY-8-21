import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
  const [imgError, setImgError] = useState(false);
  const imageSource = !imgError && image ? image : FALLBACK_IMAGE;
  const hasIssues = status === "Completed with issues";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
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
        <Text style={styles.vehicle}>
          {vehicle}
        </Text>

        <Text style={styles.type}>
          {type}
        </Text>

        <Text style={styles.time}>
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
              ? styles.issueBadge
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
          color="#9CA3AF"
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
    opacity: 0.7,
  },

  imageContainer: {
    width: 90,
    height: 70,
    borderRadius: 6,
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  info: {
    flex: 1,
    marginLeft: 10,
    height: 70,
    justifyContent: "center",
  },

  vehicle: {
    color: "#1F2937",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },

  type: {
    color: "#6B7280",
    fontSize: 11,
    marginBottom: 1,
  },

  time: {
    color: "#6B7280",
    fontSize: 11,
    marginBottom: 2,
  },

  inspectionType: {
    fontSize: 11,
    fontWeight: "600",
    textDecorationLine: "underline",
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
    height: 70,
    paddingRight: 2,
    gap: 4,
  },

  statusBadge: {
    minHeight: 25,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 3,
  },

  completedBadge: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
  },

  issueBadge: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },

  statusText: {
    fontWeight: "600",
  },

  completedText: {
    color: "#16A34A",
    fontSize: 10.5,
  },

  issueText: {
    color: "#EA580C",
    fontSize: 8.5,
    lineHeight: 10.5,
    textAlign: "center",
  },

  chevron: {
    marginLeft: 2,
  },
});