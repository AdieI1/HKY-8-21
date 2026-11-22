import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../src/context/ThemeContext";
import { resolveAvatarUrl } from "../services/api";

const defaultAvatar = require("../assets/images/defaultavatar.png");

export default function HistoryCard({ delivery }) {
  const { theme, darkMode } = useTheme();
  const [imgError, setImgError] = useState(false);

  const customerPhoto = !imgError && delivery?.customerPhoto
    ? resolveAvatarUrl(delivery.customerPhoto)
    : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: darkMode ? 1 : 0,
        }
      ]}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <Image
          source={
            customerPhoto
              ? {
                  uri: customerPhoto,
                  headers: { "ngrok-skip-browser-warning": "true" },
                }
              : defaultAvatar
          }
          style={styles.avatar}
          onError={() => setImgError(true)}
        />

        <View style={styles.customerInfo}>
          <Text style={[styles.customer, { color: theme.primary }]} numberOfLines={1}>
            {delivery.customer}
          </Text>

          <Text style={[styles.date, { color: theme.secondaryText }]}>
            {delivery.date}
          </Text>
        </View>
      </View>

      <Text style={[styles.details, { color: theme.secondaryText }]}>
        <Text style={[styles.bold, { color: theme.text }]}>Cargo type:</Text>{" "}
        {delivery.cargo}
      </Text>

      <Text style={[styles.details, { color: theme.secondaryText }]}>
        <Text style={[styles.bold, { color: theme.text }]}>Weight:</Text>{" "}
        {delivery.weight}
      </Text>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.locationRow}>
        <Ionicons
          name="location"
          size={18}
          color={theme.primary}
        />

        <Text style={[styles.location, { color: theme.secondaryText }]}>
          <Text style={[styles.bold, { color: theme.text }]}>
            Pick-up location:
          </Text>{" "}
          {delivery.pickup}
        </Text>
      </View>

      <View style={styles.locationRow}>
        <Ionicons
          name="location"
          size={18}
          color={theme.primary}
        />

        <Text style={[styles.location, { color: theme.secondaryText }]}>
          <Text style={[styles.bold, { color: theme.text }]}>
            Drop-off location:
          </Text>{" "}
          {delivery.dropoff}
        </Text>
      </View>

      <Text style={[styles.ratingLabel, { color: theme.text }]}>
        Customer Rating:{" "}
        <Text style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Text
              key={star}
              style={{
                color:
                  delivery.rating && star <= delivery.rating
                    ? "#F29A38"
                    : (darkMode ? "#4B4D58" : "#C8C9D0"),
              }}
            >
              ★
            </Text>
          ))}
        </Text>
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    marginBottom: 14,
    padding: 12,
    elevation: 2,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
    backgroundColor: "#E2E4EE",
  },

  customerInfo: {
    flex: 1,
    justifyContent: "center",
  },

  customer: {
    fontSize: 18,
    fontWeight: "800",
  },

  date: {
    fontSize: 11,
    marginTop: 2,
  },

  details: {
    fontSize: 12,
    marginTop: 3,
  },

  bold: {
    fontWeight: "700",
  },

  divider: {
    height: 1,
    marginTop: 10,
    marginBottom: 8,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 5,
  },

  location: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 6,
    flex: 1,
  },

  ratingLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 4,
  },

  stars: {
    fontSize: 16,
    letterSpacing: 1,
  },
});