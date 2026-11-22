import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import DeliveryCard from "../../components/DeliveryCard";
import ReviewModal from "../../components/ReviewModal";
import {
  acceptDeliveryReschedule,
  cancelDeliveryOnAccident,
  getMyDeliveryRequests,
  getToken,
  logout,
} from "../../services/api";
import { formatDeliveryRequest, isActiveDelivery } from "../../services/deliveries";
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");

export default function Deliveries() {
  const router = useRouter();
  const { isDark, colors } = useTheme();
  const [selectedTab, setSelectedTab] = useState("active");
  const [showSort, setShowSort] = useState(false);
  const [sortOption, setSortOption] = useState("Sort");
  const [deliveries, setDeliveries] = useState([]);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);

  // Batch 3 Modals
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [selectedCancelDelivery, setSelectedCancelDelivery] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceiptDelivery, setSelectedReceiptDelivery] = useState(null);

  const sortOptions = [
    "Date",
    "A-Z",
    "Fragility",
    "Distance (Short - Long)",
    "Distance (Long - Short)",
  ];

  const loadDeliveries = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const requests = await getMyDeliveryRequests();
      setDeliveries(
        requests
          .filter((request) => request.status !== "draft")
          .map(formatDeliveryRequest)
      );
    } catch (error) {
      if (error.message?.toLowerCase().includes("unauthenticated")) {
        await logout();
        router.replace("/login-page");
        return;
      }
      console.log("Failed to load customer deliveries:", error);
    }
  }, [router]);

  const handleAcceptReschedule = async (delivery) => {
    if (!delivery.deliveryId) return;
    try {
      await acceptDeliveryReschedule(delivery.deliveryId, {
        selected_date: delivery.rescheduleProposedDate,
        selected_time_slot: delivery.rescheduleProposedTimeSlot,
      });
      Alert.alert(
        "Schedule Confirmed",
        `Your delivery has been confirmed for ${delivery.rescheduleProposedDate} at ${delivery.rescheduleProposedTimeSlot || "09:00 AM"}!`
      );
      loadDeliveries();
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to confirm reschedule.");
    }
  };

  const handleOpenCancel = (delivery) => {
    setSelectedCancelDelivery(delivery);
    setCancellationReason("");
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedCancelDelivery?.deliveryId) return;
    try {
      setCancelling(true);
      await cancelDeliveryOnAccident(
        selectedCancelDelivery.deliveryId,
        cancellationReason || "Cancelled by customer due to delivery accident/incident."
      );
      Alert.alert(
        "Delivery Cancelled",
        "Your delivery has been cancelled due to the accident. A refund request has been automatically queued for administrative review."
      );
      setCancelModalVisible(false);
      setSelectedCancelDelivery(null);
      await loadDeliveries();
    } catch (error) {
      Alert.alert("Cancellation Failed", error.message || "Could not cancel delivery.");
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenReceipt = (delivery) => {
    setSelectedReceiptDelivery(delivery);
    setReceiptModalVisible(true);
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      (async () => {
        const token = await getToken();
        if (!token) {
          if (isMounted) router.replace("/login-page");
          return;
        }
        if (isMounted) {
          await loadDeliveries();
        }
      })();

      const interval = setInterval(async () => {
        const token = await getToken();
        if (token) {
          loadDeliveries();
        }
      }, 10000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [loadDeliveries, router])
  );

  const activeDeliveries = deliveries.filter(isActiveDelivery);
  const historyDeliveries = deliveries.filter(
    (item) => ["delivered", "rejected", "cancelled"].includes(item.status) || item.backendStatus === "cancelled"
  );

  const displayedDeliveries = useMemo(() => {
    const source = selectedTab === "active" ? activeDeliveries : historyDeliveries;
    const sorted = [...source];
    if (sortOption === "A-Z") sorted.sort((a, b) => a.cargoName.localeCompare(b.cargoName));
    if (sortOption === "Fragility") sorted.sort((a, b) => String(a.fragility).localeCompare(String(b.fragility)));
    if (sortOption === "Distance (Short - Long)") sorted.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    if (sortOption === "Distance (Long - Short)") sorted.sort((a, b) => parseFloat(b.distance) - parseFloat(a.distance));
    return sorted;
  }, [activeDeliveries, historyDeliveries, selectedTab, sortOption]);

  const handleOpenReview = (delivery) => {
    setSelectedDelivery(delivery);
    setReviewModalVisible(true);
  };

  const handleCloseReview = () => {
    setReviewModalVisible(false);
    setSelectedDelivery(null);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* HEADER */}
      <AppHeader icon="document-text-outline" iconSize={30} />

      {/* BODY */}
      <View style={[styles.body, { backgroundColor: colors.bg }]}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          <View style={styles.cardContent}>
            {/* TITLE */}
            <View style={styles.headerRow}>
              <Text style={[styles.Deliveries, { color: colors.text }]}>Deliveries</Text>

              <TouchableOpacity
                style={[styles.sort, { backgroundColor: isDark ? colors.cardBorder : "#DCE3F1" }]}
                onPress={() => setShowSort(!showSort)}
              >
                <Text style={[styles.sorttxt, { color: isDark ? "#93C5FD" : "#3B5BDB" }]}>{sortOption}</Text>
                <Ionicons name="chevron-down" size={14} color={isDark ? "#93C5FD" : "#0C56AD"} />
              </TouchableOpacity>
            </View>

            {/* SORT DROPDOWN */}
            {showSort && (
              <View style={[styles.dropdown, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
                {sortOptions.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSortOption(item);
                      setShowSort(false);
                    }}
                  >
                    <Text style={[styles.dropdownText, { color: colors.text }]}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

            {/* TABS */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { backgroundColor: isDark ? colors.cardBorder : "#E0E0E0" },
                  selectedTab === "active" && styles.tabActive,
                ]}
                onPress={() => setSelectedTab("active")}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: selectedTab === "active" ? "#FFFFFF" : colors.textMuted },
                    selectedTab === "active" && styles.tabTextActive,
                  ]}
                >
                  Active
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  { backgroundColor: isDark ? colors.cardBorder : "#E0E0E0" },
                  selectedTab === "history" && styles.tabActive,
                ]}
                onPress={() => setSelectedTab("history")}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: selectedTab === "history" ? "#FFFFFF" : colors.textMuted },
                    selectedTab === "history" && styles.tabTextActive,
                  ]}
                >
                  History
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* DELIVERY CARDS */}
        <ScrollView
          style={[styles.deliveryList, { backgroundColor: colors.bg }]}
          contentContainerStyle={[styles.deliveryContent, { backgroundColor: colors.bg }]}
          showsVerticalScrollIndicator={false}
        >
          {displayedDeliveries.length > 0 ? (
            displayedDeliveries.map((delivery) => (
              <DeliveryCard
                key={delivery.id}
                delivery={delivery}
                onReview={handleOpenReview}
                onAcceptReschedule={handleAcceptReschedule}
                onCancelAccident={handleOpenCancel}
                onViewReceipt={handleOpenReceipt}
              />
            ))
          ) : (
            <View style={styles.messageContainer}>
              <Text style={styles.message}>
                {selectedTab === "active"
                  ? "You have no active deliveries yet"
                  : "You don’t have any deliveries in your history"}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      {/* ACCIDENT CANCELLATION MODAL */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.cancelModalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <View style={styles.cancelModalHeader}>
              <Ionicons name="warning" size={24} color="#DC2626" />
              <Text style={styles.cancelModalTitle}>Cancel Delivery Due to Accident</Text>
            </View>
            <Text style={[styles.cancelModalText, { color: colors.textMuted }]}>
              An accident or incident was reported for this shipment. If you proceed with cancellation, the delivery will terminate immediately and your payment will be placed under refund review.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Optional Cancellation Notes:</Text>
            <TextInput
              style={[styles.cancelInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, borderWidth: isDark ? 1 : 0 }]}
              placeholder="e.g. Cannot wait for replacement truck, goods perishable"
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={3}
              value={cancellationReason}
              onChangeText={setCancellationReason}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalSecondaryBtn, { backgroundColor: isDark ? colors.cardBorder : "#E2E8F0" }]}
                onPress={() => setCancelModalVisible(false)}
                disabled={cancelling}
              >
                <Text style={[styles.modalSecondaryText, { color: colors.text }]}>Keep Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDangerBtn}
                onPress={handleConfirmCancel}
                disabled={cancelling}
              >
                <Text style={styles.modalDangerText}>{cancelling ? "Cancelling..." : "Confirm Cancel"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* COLLECTION RECEIPT MODAL */}
      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.receiptModalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <View style={styles.receiptModalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="receipt" size={22} color="#2563EB" />
                <Text style={styles.receiptModalTitle}>Collection Receipt</Text>
              </View>
              <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.65 }}>
              <View style={styles.receiptSummaryCard}>
                <Text style={styles.receiptCompany}>HKY LOGISTICS CORPORATION</Text>
                <Text style={styles.receiptSubtitle}>Official Customer Collection Receipt</Text>

                <View style={styles.receiptDivider} />

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptField}>Receipt Number:</Text>
                  <Text style={styles.receiptValBold}>{selectedReceiptDelivery?.collectionReceiptNo || "N/A"}</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptField}>Amount Collected:</Text>
                  <Text style={styles.receiptAmount}>
                    ₱{Number(selectedReceiptDelivery?.collectionReceiptAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptField}>Payment Mode:</Text>
                  <Text style={styles.receiptVal}>{selectedReceiptDelivery?.collectionReceiptPaymentMode || "N/A"}</Text>
                </View>

                {selectedReceiptDelivery?.collectionReceiptIssuedAt ? (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptField}>Issued Date:</Text>
                    <Text style={styles.receiptVal}>
                      {new Date(selectedReceiptDelivery.collectionReceiptIssuedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                    </Text>
                  </View>
                ) : null}

                {selectedReceiptDelivery?.collectionReceiptNotes ? (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.receiptField}>Notes / Remarks:</Text>
                    <Text style={[styles.receiptVal, { marginTop: 2 }]}>{selectedReceiptDelivery.collectionReceiptNotes}</Text>
                  </View>
                ) : null}
              </View>

              {selectedReceiptDelivery?.collectionReceiptUrl ? (
                <View style={styles.receiptImageContainer}>
                  <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12, marginBottom: 6 }]}>Receipt Document / Attachment:</Text>
                  <Image
                    source={{ uri: selectedReceiptDelivery.collectionReceiptUrl }}
                    style={styles.receiptAttachmentImage}
                    resizeMode="contain"
                  />
                </View>
              ) : null}
            </ScrollView>

            <TouchableOpacity
              style={styles.receiptCloseBtn}
              onPress={() => setReceiptModalVisible(false)}
            >
              <Text style={styles.receiptCloseText}>Close Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REVIEW MODAL */}
      <ReviewModal
        visible={reviewModalVisible}
        delivery={selectedDelivery}
        onClose={handleCloseReview}
        onSuccess={loadDeliveries}
      />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },
  body: {
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
  },
  cardContent: {
    paddingHorizontal: width * 0.04,
    paddingTop: height * 0.02,
    paddingBottom: height * 0.015,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  Deliveries: {
    fontSize: width * 0.07,
    fontWeight: "bold",
    color: "#E53935",
    lineHeight: width * 0.08,
  },
  sort: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCE3F1",
    paddingVertical: height * 0.008,
    paddingHorizontal: width * 0.03,
    borderRadius: 12,
  },
  sorttxt: {
    color: "#3B5BDB",
    fontSize: width * 0.035,
    fontWeight: "600",
    marginRight: 3,
  },
  divider: {
    height: 1,
    backgroundColor: "#CFCFCF",
    marginVertical: height * 0.015,
  },
  tabRow: {
    flexDirection: "row",
    gap: width * 0.03,
  },
  tabButton: {
    paddingVertical: height * 0.01,
    paddingHorizontal: width * 0.05,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
  },
  tabActive: {
    backgroundColor: "#34B352",
  },
  tabText: {
    fontSize: width * 0.04,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  deliveryList: {
    flex: 1,
    backgroundColor: "#EDEEF5",
  },
  deliveryContent: {
    paddingHorizontal: width * 0.025,
    paddingTop: height * 0.015,
    paddingBottom: height * 0.12,
  },
  messageContainer: {
    marginTop: height * 0.03,
    alignItems: "center",
  },
  message: {
    color: "#666",
    fontSize: width * 0.04,
    textAlign: "center",
  },
  dropdown: {
    position: "absolute",
    top: height * 0.065,
    right: width * 0.04,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    width: width * 0.6,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dropdownText: {
    fontSize: width * 0.035,
    color: "#333",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: width * 0.05,
  },
  cancelModalBox: {
    width: "100%",
    borderRadius: 16,
    padding: 20,
    elevation: 6,
  },
  cancelModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  cancelModalTitle: {
    fontSize: width * 0.042,
    fontWeight: "800",
    color: "#DC2626",
    flex: 1,
  },
  cancelModalText: {
    fontSize: width * 0.033,
    lineHeight: 18,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: width * 0.033,
    fontWeight: "600",
    marginBottom: 6,
  },
  cancelInput: {
    borderRadius: 10,
    padding: 12,
    fontSize: width * 0.035,
    textAlignVertical: "top",
    minHeight: 80,
    marginBottom: 16,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSecondaryText: {
    fontSize: width * 0.035,
    fontWeight: "700",
  },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: "#DC2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalDangerText: {
    color: "#FFFFFF",
    fontSize: width * 0.035,
    fontWeight: "700",
  },
  receiptModalBox: {
    width: "100%",
    maxHeight: height * 0.85,
    borderRadius: 16,
    padding: 20,
    elevation: 6,
  },
  receiptModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  receiptModalTitle: {
    fontSize: width * 0.045,
    fontWeight: "800",
    color: "#2563EB",
  },
  receiptSummaryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  receiptCompany: {
    fontSize: width * 0.038,
    fontWeight: "900",
    color: "#1E293B",
    textAlign: "center",
  },
  receiptSubtitle: {
    fontSize: width * 0.028,
    color: "#64748B",
    textAlign: "center",
    marginTop: 2,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 12,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  receiptField: {
    fontSize: width * 0.032,
    color: "#64748B",
    fontWeight: "600",
  },
  receiptVal: {
    fontSize: width * 0.032,
    color: "#1E293B",
    fontWeight: "500",
  },
  receiptValBold: {
    fontSize: width * 0.034,
    color: "#1E293B",
    fontWeight: "700",
  },
  receiptAmount: {
    fontSize: width * 0.045,
    color: "#059669",
    fontWeight: "900",
  },
  receiptImageContainer: {
    marginTop: 10,
  },
  receiptAttachmentImage: {
    width: "100%",
    height: 220,
    borderRadius: 10,
    backgroundColor: "#000",
  },
  receiptCloseBtn: {
    marginTop: 16,
    backgroundColor: "#2563EB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  receiptCloseText: {
    color: "#FFFFFF",
    fontSize: width * 0.038,
    fontWeight: "700",
  },
});