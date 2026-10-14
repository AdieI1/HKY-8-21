import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

export default function OverviewSection({
  distanceKm = 0,
  weightKg = 0,
  pricing,
  reviewVisible = false,
  reviewDetails,
  onCloseReview,
  onConfirm,
  submitting,
}) {
  const { colors, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [activeInfo, setActiveInfo] = useState("");
  const fees = pricing || {
    distanceFee: Number(distanceKm || 0) * 80,
    weightFee: Number(weightKg || 0),
    laborFee: 800,
    total: Number(distanceKm || 0) * 80 + Number(weightKg || 0) + 800,
  };

  const openInfo = (text) => {
    setActiveInfo(text);
    setModalVisible(true);
  };

  const rows = [
    ["Distance", `${Number(distanceKm || 0).toFixed(2)} km`, "Road distance calculated through OSRM."],
    ["Distance Fee", money(fees.distanceFee), "Distance fee is ₱80 per kilometer."],
    ["Weight Fee", money(fees.weightFee), "Weight fee is ₱1 per kilogram."],
    ["Labor Fee", money(fees.laborFee), "Labor fee covers loading and unloading."],
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
      <View style={styles.headerTop}>
        <View style={styles.iconBox}>
          <Ionicons name="cube-outline" size={width * 0.05} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Delivery Overview</Text>
          <Text style={[styles.note, { color: isDark ? "#F87171" : "#E53935" }]}>Press the ? icon for pricing details</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      {rows.map(([label, value, info]) => (
        <TouchableOpacity key={label} style={styles.row} onPress={() => openInfo(info)}>
          <View style={styles.leftGroup}>
            <Ionicons name="help-circle-outline" size={width * 0.045} color={isDark ? "#F87171" : "#E53935"} style={styles.iconSpacing} />
            <Text style={[styles.item, { color: colors.text }]}>{label}: {value}</Text>
          </View>
        </TouchableOpacity>
      ))}
      <Text style={[styles.total, { color: isDark ? "#EF4444" : "#E53935" }]}>Total Expenses: {money(fees.total)}</Text>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={[styles.overlay, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.modalBox, { backgroundColor: colors.modalBg, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <Text style={[styles.modalText, { color: colors.text }]}>{activeInfo}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.close}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewVisible} transparent animationType="fade" onRequestClose={onCloseReview}>
        <View style={[styles.overlay, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.reviewBox, { backgroundColor: colors.modalBg, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <Text style={styles.reviewTitle}>Review Request Details</Text>
            <Text style={[styles.reviewLine, { color: colors.text }]}>
              Service: {reviewDetails?.serviceType === "stuffing" ? "Container Stuffing (Loading)" : reviewDetails?.serviceType === "pulling" ? "Container Pull-Out / Pulling" : "Standard Delivery"}
            </Text>
            {reviewDetails?.containerNumber ? (
              <Text style={[styles.reviewLine, { color: colors.text }]}>
                Container #: {reviewDetails.containerNumber} {reviewDetails?.sealNumber ? `(Seal: ${reviewDetails.sealNumber})` : ""}
              </Text>
            ) : null}
            <Text style={[styles.reviewLine, { color: colors.text }]}>Cargo: {reviewDetails?.cargo || "N/A"}</Text>
            <Text style={[styles.reviewLine, { color: colors.text }]}>Fragility: {reviewDetails?.fragility || "N/A"}</Text>
            <Text style={[styles.reviewLine, { color: colors.text }]}>Weight: {weightKg || 0} kg</Text>
            <Text style={[styles.reviewLine, { color: colors.text }]}>Pick-up: {reviewDetails?.pickup || "N/A"}</Text>
            <Text style={[styles.reviewLine, { color: colors.text }]}>Drop-off: {reviewDetails?.dropoff || "N/A"}</Text>
            {reviewDetails?.receiverName ? (
              <Text style={[styles.reviewLine, { color: colors.text }]}>
                Receiver: {reviewDetails.receiverName}{reviewDetails.receiverPhone ? ` (${reviewDetails.receiverPhone})` : ""}
              </Text>
            ) : null}
            <Text style={[styles.reviewTotal, { color: isDark ? "#EF4444" : "#E53935" }]}>Total: {money(fees.total)}</Text>
            <View style={styles.reviewActions}>
              <TouchableOpacity style={[styles.cancelButton, { backgroundColor: isDark ? "#334155" : "#9E9E9E" }]} onPress={onCloseReview}>
                <Text style={styles.cancelText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={onConfirm} disabled={submitting}>
                <Text style={styles.confirmText}>{submitting ? "Submitting..." : "Confirm"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", padding: width * 0.04, borderRadius: width * 0.04, marginBottom: height * 0.015 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: height * 0.008 },
  headerText: { flex: 1 },
  iconBox: { backgroundColor: "#2196F3", padding: width * 0.025, borderRadius: width * 0.03, marginRight: width * 0.025 },
  title: { fontSize: width * 0.04, fontWeight: "700", color: "#E53935" },
  note: { fontSize: width * 0.03, color: "#E53935", marginTop: height * 0.002 },
  divider: { height: 1, backgroundColor: "#eee", marginBottom: height * 0.01 },
  row: { marginBottom: height * 0.006 },
  leftGroup: { flexDirection: "row", alignItems: "center" },
  iconSpacing: { marginRight: width * 0.015 },
  item: { fontSize: width * 0.035, color: "#333" },
  total: { marginTop: height * 0.008, fontWeight: "700", color: "#E53935", fontSize: width * 0.038 },
  overlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.35)" },
  modalBox: { backgroundColor: "#fff", padding: width * 0.05, borderRadius: width * 0.04, width: width * 0.8 },
  modalText: { fontSize: width * 0.035, marginBottom: height * 0.015, color: "#333" },
  close: { textAlign: "center", color: "#E53935", fontWeight: "700", fontSize: width * 0.04 },
  reviewBox: { backgroundColor: "#fff", padding: width * 0.05, borderRadius: width * 0.04, width: width * 0.9, maxHeight: height * 0.8 },
  reviewTitle: { color: "#E53935", fontWeight: "800", fontSize: width * 0.05, marginBottom: 14 },
  reviewLine: { color: "#333", fontSize: width * 0.034, marginBottom: 8 },
  reviewTotal: { color: "#E53935", fontWeight: "800", fontSize: width * 0.042, marginTop: 8 },
  reviewActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelButton: { flex: 1, padding: 12, alignItems: "center", borderRadius: 10, backgroundColor: "#9E9E9E" },
  confirmButton: { flex: 1, padding: 12, alignItems: "center", borderRadius: 10, backgroundColor: "#E53935" },
  cancelText: { color: "#fff", fontWeight: "700" },
  confirmText: { color: "#fff", fontWeight: "700" },
});
