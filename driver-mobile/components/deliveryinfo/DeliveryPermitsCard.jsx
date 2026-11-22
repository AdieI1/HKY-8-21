import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import DeliveryPermitsModal from "../DeliveryPermitsModal";
import { resolveStorageUrl } from "../../utils/imageUrl";

export default function DeliveryPermitsCard({ delivery }) {
  const [modalVisible, setModalVisible] = useState(false);

  const request = delivery?.request || {};

  const rawItemPermit =
    delivery?.item_permit_url ||
    request?.item_permit_url ||
    delivery?.itemPermitUrl ||
    request?.item_permit_path ||
    delivery?.item_permit_path ||
    null;

  const itemPermitUrl = resolveStorageUrl(rawItemPermit);

  const itemPermitType =
    delivery?.item_permit_type ||
    request?.item_permit_type ||
    delivery?.itemPermitType ||
    "Quarantine / Item Clearance";

  const rawAreaPermit =
    delivery?.area_permit_url ||
    delivery?.areaPermitUrl ||
    delivery?.area_permit_path ||
    request?.area_permit_url ||
    null;

  const areaPermitUrl = resolveStorageUrl(rawAreaPermit);

  const areaPermitType =
    delivery?.area_permit_type ||
    delivery?.areaPermitType ||
    "Mindanao Regional Route Pass";

  const hasItem = Boolean(itemPermitUrl);
  const hasArea = Boolean(areaPermitUrl);

  return (
    <>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.badgeRow}>
            <Ionicons name="shield-checkmark" size={18} color="#951F21" />
            <Text style={styles.title}>Delivery Permits & Clearances</Text>
          </View>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.viewButton}
            activeOpacity={0.8}
          >
            <Text style={styles.viewButtonText}>View All</Text>
            <Ionicons name="chevron-forward" size={14} color="#951F21" />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Item Permit Row */}
        <View style={styles.permitRow}>
          <View style={styles.permitIconBox}>
            <Ionicons name="cube-outline" size={20} color="#1E40AF" />
          </View>
          <View style={styles.permitDetails}>
            <Text style={styles.permitTitle}>Item Delivery Permit</Text>
            <Text style={styles.permitSubtitle} numberOfLines={1}>
              {hasItem ? itemPermitType : "Standard Non-Regulated Cargo"}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              hasItem ? styles.statusPillActive : styles.statusPillMuted,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                hasItem ? styles.statusTextActive : styles.statusTextMuted,
              ]}
            >
              {hasItem ? "Soft Copy" : "Exempt"}
            </Text>
          </View>
        </View>

        {/* Area Permit Row */}
        <View style={[styles.permitRow, { marginTop: 10 }]}>
          <View style={styles.permitIconBox}>
            <Ionicons name="map-outline" size={20} color="#047857" />
          </View>
          <View style={styles.permitDetails}>
            <Text style={styles.permitTitle}>Area / Route Permit</Text>
            <Text style={styles.permitSubtitle} numberOfLines={1}>
              {hasArea ? areaPermitType : "Open Route Clearance"}
            </Text>
          </View>
          <View
            style={[
              styles.statusPill,
              hasArea ? styles.statusPillActive : styles.statusPillMuted,
            ]}
          >
            <Text
              style={[
                styles.statusPillText,
                hasArea ? styles.statusTextActive : styles.statusTextMuted,
              ]}
            >
              {hasArea ? "Soft Copy" : "Open"}
            </Text>
          </View>
        </View>

        {/* Quick View Button */}
        <TouchableOpacity
          style={styles.openModalButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="document-attach-outline" size={16} color="#FFFFFF" />
          <Text style={styles.openModalButtonText}>
            Open Soft Copies for Inspection
          </Text>
        </TouchableOpacity>
      </View>

      <DeliveryPermitsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        delivery={delivery}
      />
    </>
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
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#951F21",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  permitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F9FAFB",
    padding: 10,
    borderRadius: 10,
  },
  permitIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  permitDetails: {
    flex: 1,
  },
  permitTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  permitSubtitle: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: "#DCFCE7",
  },
  statusPillMuted: {
    backgroundColor: "#E5E7EB",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusTextActive: {
    color: "#15803D",
  },
  statusTextMuted: {
    color: "#6B7280",
  },
  openModalButton: {
    marginTop: 12,
    backgroundColor: "#951F21",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  openModalButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
});
