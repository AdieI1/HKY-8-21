import React from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { resolveStorageUrl } from "../../utils/imageUrl";

export default function ProofOfDeliveryCard({ delivery }) {
  const rawPhoto =
    delivery?.proof_of_delivery_url ||
    delivery?.proof_of_delivery_path ||
    delivery?.receipt_photo;
  const photoUrl = resolveStorageUrl(rawPhoto);

  if (!photoUrl && delivery?.status !== "completed") {
    return null;
  }

  const deliveredDate = delivery?.delivered_at
    ? new Date(delivery.delivered_at).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : delivery?.end_time
    ? new Date(delivery.end_time).toLocaleDateString([], {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Delivered";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <Ionicons name="shield-checkmark" size={18} color="#10B981" />
          <Text style={styles.title}>Proof of Delivery (POD)</Text>
        </View>
        <Text style={styles.dateText}>{deliveredDate}</Text>
      </View>

      <View style={styles.divider} />

      {photoUrl ? (
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photoUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageFooter}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.verifiedText}>Cargo Delivered & Verified</Text>
          </View>
        </View>
      ) : (
        <View style={styles.noPhotoBox}>
          <Ionicons name="image-outline" size={24} color="#9CA3AF" />
          <Text style={styles.noPhotoText}>No photo recorded</Text>
        </View>
      )}

      {delivery?.received_by ? (
        <View style={styles.infoRow}>
          <Text style={styles.bold}>Received By: </Text>
          <Text style={styles.infoValue}>{delivery.received_by}</Text>
        </View>
      ) : null}

      {delivery?.delivery_notes ? (
        <View style={styles.infoRow}>
          <Text style={styles.bold}>Notes: </Text>
          <Text style={styles.infoValue}>{delivery.delivery_notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  dateText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
    backgroundColor: "#1F2937",
  },
  image: {
    width: "100%",
    height: 180,
  },
  imageFooter: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  verifiedText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "600",
  },
  noPhotoBox: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    marginBottom: 10,
    gap: 4,
  },
  noPhotoText: {
    fontSize: 12,
    color: "#6B7280",
  },
  infoRow: {
    flexDirection: "row",
    marginTop: 6,
  },
  bold: {
    fontWeight: "600",
    fontSize: 13,
    color: "#4B5563",
  },
  infoValue: {
    fontSize: 13,
    color: "#111827",
    flex: 1,
  },
});
