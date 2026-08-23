import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import MapModal from "./MapModal";
import SuccessRequest from "./SuccessRequest";
import CargoSection from "./sections/CargoSection";
import DeliverySection from "./sections/DeliverySection";
import OverviewSection from "./sections/OverviewSection";
import PaymentSection from "./sections/PaymentSection";
import { createDeliveryRequest, getRouteDistance } from "../services/api";

const { width, height } = Dimensions.get("window");

export default function RequestSheet({
  onClose,
  onDraftSaved,
  onRequestCreated,
}) {
  const isSmallScreen = width < 360;

  const [mapVisible, setMapVisible] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const [requestComplete, setRequestComplete] =
    useState(false);

  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [cargo, setCargo] = useState({});
  const [payment, setPayment] = useState({});
  const [distanceKm, setDistanceKm] = useState(0);
  const [distanceLoading, setDistanceLoading] = useState(false);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const pricing = useMemo(() => {
    const distanceFee = Number(distanceKm || 0) * 80;
    const weightFee = Number(cargo.weight || 0);
    const laborFee = 800;
    return { distanceFee, weightFee, laborFee, total: distanceFee + weightFee + laborFee };
  }, [distanceKm, cargo.weight]);

  useEffect(() => {
    if (!pickup || !dropoff) {
      setDistanceKm(0);
      return;
    }

    let active = true;
    setDistanceLoading(true);
    getRouteDistance(pickup, dropoff)
      .then((distance) => active && setDistanceKm(distance))
      .catch((error) => active && Alert.alert("Unable to Calculate Distance", error.message))
      .finally(() => active && setDistanceLoading(false));

    return () => { active = false; };
  }, [pickup, dropoff]);

  const handleCargoChange = useCallback((value) => setCargo(value), []);
  const handlePaymentChange = useCallback((value) => setPayment(value), []);

  const buildPayload = (isDraft) => {
    const fragilityMap = {
      Normal: "low",
      Fragile: "medium",
      Perishable: "high",
    };
    const paymentTermMap = { half: "downpayment", full: "full" };
    const paymentMethodMap = { bank: "bank_transfer", cash: "cash" };

    return {
      item_name: cargo.cargoName || null,
      cargo_type: cargo.cargoType || null,
      fragility: fragilityMap[cargo.fragility] || null,
      weight: cargo.weight ? Number(cargo.weight) : null,
      pickup_address: pickup?.address || null,
      pickup_lat: pickup?.latitude ?? null,
      pickup_lng: pickup?.longitude ?? null,
      dropoff_address: dropoff?.address || null,
      dropoff_lat: dropoff?.latitude ?? null,
      dropoff_lng: dropoff?.longitude ?? null,
      distance_km: distanceKm,
      total_price: pricing.total,
      payment_term: paymentTermMap[payment.paymentTerm] || null,
      payment_method: paymentMethodMap[payment.method] || null,
      payment_receipt: payment.receipt || null,
      is_draft: isDraft,
    };
  };

  const openMap = (type) => {
    setActiveField(type);
    setMapVisible(true);
  };

  const handleConfirm = (payload) => {
    if (!payload) return;

    if (payload.type === "pickup") {
      setPickup(payload.data);
    }

    if (payload.type === "dropoff") {
      setDropoff(payload.data);
    }

    setMapVisible(false);
  };

  const handleComplete = () => {
    if (distanceLoading) {
      Alert.alert("Calculating Distance", "Please wait for the OSRM route calculation.");
      return;
    }
    setReviewVisible(true);
  };

  const handleConfirmRequest = async () => {
    try {
      setSubmitting(true);
      await createDeliveryRequest(buildPayload(false));
      setReviewVisible(false);
      setRequestComplete(true);
      onRequestCreated?.();
    } catch (error) {
      Alert.alert("Unable to Create Request", error?.message || "Complete all required fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDelivery = () => {
    onClose();
  };

  const handleReturnHome = () => {
    setRequestComplete(false);
    onClose();
  };

  const handleSaveDraft = async () => {
    try {
      setSubmitting(true);
      await createDeliveryRequest(buildPayload(true));

      if (onDraftSaved) {
        onDraftSaved();
      }

      onClose();
    } catch (error) {
      Alert.alert("Unable to Save Draft", error?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (requestComplete) {
    return (
      <View style={styles.container}>
        <SuccessRequest
          onViewDelivery={handleViewDelivery}
          onReturnHome={handleReturnHome}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeBtn}
        >
          <Text style={styles.closeText}>
            ✕
          </Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text
            style={[
              styles.title,
              isSmallScreen && { fontSize: 20 },
            ]}
          >
            Request Delivery
          </Text>

          <Text style={styles.subtitle}>
            Enter the required details to request a
            delivery.
          </Text>
        </View>

        <View style={styles.divider} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <CargoSection onChange={handleCargoChange} />

        <DeliverySection
          pickup={pickup}
          dropoff={dropoff}
          onOpenMap={openMap}
        />

        <OverviewSection
          distanceKm={distanceKm}
          weightKg={cargo.weight}
          pricing={pricing}
          reviewVisible={reviewVisible}
          reviewDetails={{
            cargo: cargo.cargoName || cargo.cargoType,
            fragility: cargo.fragility,
            pickup: pickup?.address,
            dropoff: dropoff?.address,
          }}
          onCloseReview={() => setReviewVisible(false)}
          onConfirm={handleConfirmRequest}
          submitting={submitting}
        />

        <PaymentSection onChange={handlePaymentChange} total={pricing.total} />

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleComplete}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryText}>
              Complete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={handleSaveDraft}
            disabled={submitting}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>
              Save as Draft
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MapModal
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        onConfirm={handleConfirm}
        mode={activeField}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    borderTopLeftRadius: width * 0.06,
    borderTopRightRadius: width * 0.06,
    overflow: "hidden",
  },

  headerContainer: {
    paddingTop: height * 0.02,
    paddingBottom: height * 0.0006,
    alignItems: "center",
  },

  headerCenter: {
    alignItems: "center",
    width: "100%",
    paddingHorizontal: width * 0.05,
  },

  closeBtn: {
    position: "absolute",
    right: 10,
    top: 10,
    padding: 6,
  },

  closeText: {
    fontSize: width * 0.05,
    color: "#999",
  },

  title: {
    fontSize: width * 0.065,
    fontWeight: "700",
    color: "#E53935",
    textAlign: "center",
  },

  subtitle: {
    fontSize: width * 0.03,
    color: "#555",
    marginTop: 4,
    textAlign: "center",
    marginBottom: 10,
  },

  divider: {
    height: 1,
    width: "100%",
    backgroundColor: "#d8d1d1",
    marginTop: height * 0.01,
  },

  scrollContent: {
    paddingHorizontal: width * 0.04,
    paddingTop: height * 0.01,
    paddingBottom: height * 0.08,
  },

  buttonContainer: {
    marginTop: height * 0.02,
    gap: 12,
  },

  primaryBtn: {
    backgroundColor: "#E53935",
    paddingVertical: height * 0.018,
    borderRadius: width * 0.03,
    alignItems: "center",
  },

  primaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: width * 0.04,
  },

  secondaryBtn: {
    backgroundColor: "#9E9E9E",
    paddingVertical: height * 0.018,
    borderRadius: width * 0.03,
    alignItems: "center",
  },

  secondaryText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: width * 0.04,
  },
});