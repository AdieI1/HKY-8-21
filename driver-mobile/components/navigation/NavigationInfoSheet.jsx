import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useEffect, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import NavigationActions from "./NavigationActions";
import TripTicket from "../TripTicket";
import ProofOfDeliveryModal from "../ProofOfDeliveryModal";
import DeliveryPermitsModal from "../DeliveryPermitsModal";
import CargoChecklistModal from "../CargoChecklistModal";
import { formatShortAddress } from "../../utils/address";

const SCREEN_HEIGHT = Dimensions.get("window").height;
// Cap expanded sheet cleanly below Header + RoutePreview + Weather row (~195px top clearance)
const SHEET_HEIGHT = Math.min(Math.max(SCREEN_HEIGHT * 0.65, 450), SCREEN_HEIGHT - 195);
const DEFAULT_PEEK_HEIGHT = 72;
const SHEET_CLOSED = Math.max(SHEET_HEIGHT - DEFAULT_PEEK_HEIGHT, 160);

export default function NavigationInfoSheet({
  delivery,
  navigationState,
  setNavigationState,
  onDeliveryCompleted,
  onStatusChange,
  onDeliveryUpdated,
  onPodVisibilityChange,
  onConfirmHqArrival,
  isNearHq = false,
  hqDistanceMeters = null,
}) {
  const insets = useSafeAreaInsets();
  const peekHeight = 62;
  const sheetClosed = Math.max(SHEET_HEIGHT - peekHeight, 160);

  const translateY = useRef(new Animated.Value(0)).current;
  const currentTranslateY = useRef(0);
  const dragStartY = useRef(0);
  const isCollapsedRef = useRef(false);
  const sheetClosedRef = useRef(sheetClosed);
  sheetClosedRef.current = sheetClosed;

  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const id = translateY.addListener(({ value }) => {
      currentTranslateY.current = value;
    });
    return () => {
      translateY.removeListener(id);
    };
  }, [translateY]);

  const [ticketVisible, setTicketVisible] =
    useState(false);
  const [podVisible, setPodVisible] =
    useState(false);
  const [permitsVisible, setPermitsVisible] =
    useState(false);
  const [cargoChecklistStage, setCargoChecklistStage] =
    useState(null);

  const updatePodVisible = (nextVisible) => {
    setPodVisible(nextVisible);
    onPodVisibilityChange?.(nextVisible);
  };

  const handleCargoChecklistSuccess = async (stage, updatedDelivery) => {
    setCargoChecklistStage(null);
    if (updatedDelivery && onDeliveryUpdated) {
      onDeliveryUpdated(updatedDelivery);
    }

    try {
      if (stage === "pre_loading") {
        if (onStatusChange) {
          await onStatusChange("loading_cargo");
        }
        setNavigationState("loading");
      } else if (stage === "post_loading") {
        if (onStatusChange) {
          await onStatusChange("out_for_delivery");
        }
        setNavigationState("in_transit_dropoff");
      } else if (stage === "pre_unloading") {
        if (onStatusChange) {
          await onStatusChange("unloading_cargo");
        }
        setNavigationState("unloading");
      } else if (stage === "post_unloading") {
        updatePodVisible(true);
      }
    } catch (err) {
      Alert.alert(
        "Unable to Update Delivery",
        err?.message || "Checklist was saved, but status update failed. Please tap the button again."
      );
    }
  };

  const openSheet = () => {
    isCollapsedRef.current = false;
    setIsCollapsed(false);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  const closeSheet = () => {
    isCollapsedRef.current = true;
    setIsCollapsed(true);
    Animated.spring(translateY, {
      toValue: sheetClosedRef.current,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  const panHandlersRef = useRef({});
  panHandlersRef.current = {
    onGrant: () => {
      translateY.stopAnimation((val) => {
        dragStartY.current = typeof val === "number" ? val : currentTranslateY.current;
      });
    },
    onMove: (_, gesture) => {
      const limit = sheetClosedRef.current || SHEET_CLOSED;
      const next = Math.max(0, Math.min(limit, dragStartY.current + gesture.dy));
      translateY.setValue(next);
    },
    onRelease: (_, gesture) => {
      if (Math.abs(gesture.dy) < 5 && Math.abs(gesture.dx) < 5) {
        if (isCollapsedRef.current) {
          openSheet();
        } else {
          closeSheet();
        }
        return;
      }

      const closedLimit = sheetClosedRef.current || SHEET_CLOSED;
      const finalY = Math.max(0, Math.min(closedLimit, dragStartY.current + gesture.dy));

      if (gesture.vy > 0.35 || gesture.dy > 45) {
        closeSheet();
      } else if (gesture.vy < -0.35 || gesture.dy < -45) {
        openSheet();
      } else if (finalY > closedLimit / 2) {
        closeSheet();
      } else {
        openSheet();
      }
    },
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 3,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (...args) => panHandlersRef.current.onGrant?.(...args),
      onPanResponderMove: (...args) => panHandlersRef.current.onMove?.(...args),
      onPanResponderRelease: (...args) => panHandlersRef.current.onRelease?.(...args),
    })
  ).current;

  return (
    <>
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [
              {
                translateY,
              },
            ],
          },
        ]}
      >
        <View
          style={styles.handleArea}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />
          <View style={styles.handleHeaderRow}>
            <Text style={styles.requestLabel}>
              {delivery.requestId} • {isCollapsed ? "Drag up for trip details" : "Drag down to view map"}
            </Text>
            <Ionicons
              name={isCollapsed ? "chevron-up" : "chevron-down"}
              size={18}
              color="#64748B"
            />
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >

          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.customerName}>
                {delivery.customerName || delivery.clientName || "Customer"}
              </Text>
              <Text style={styles.contact}>
                {delivery.customerPhone || delivery.contact || "—"}
              </Text>
              {(delivery.receiverName || delivery.receiverPhone) &&
                (delivery.receiverName !== (delivery.customerName || delivery.clientName) ||
                  delivery.receiverPhone !== (delivery.customerPhone || delivery.contact)) && (
                <Text style={[styles.contact, { fontSize: 11.5, marginTop: 2, color: "#4B5563" }]}>
                  Receiver: {delivery.receiverName || "Same as Customer"}
                  {delivery.receiverPhone ? ` • ${delivery.receiverPhone}` : ""}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="warning" size={17} color="#D62B2B" />
            <Text style={styles.warningText}>Remaining balance: {delivery.balance}</Text>
          </View>

          <View style={styles.routeItem}>
            <View style={styles.routeIcon}>
              <Ionicons name="location" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>PICK-UP</Text>
              <Text style={styles.routeValue} numberOfLines={1} ellipsizeMode="tail">
                {formatShortAddress(delivery.pickup)}
              </Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeItem}>
            <View style={styles.routeIcon}>
              <Ionicons name="location" size={16} color="#FFFFFF" />
            </View>
            <View style={styles.routeText}>
              <Text style={styles.routeLabel}>DROP-OFF</Text>
              <Text style={styles.routeValue} numberOfLines={1} ellipsizeMode="tail">
                {formatShortAddress(delivery.dropoff)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.tripInfo}>
            <View style={styles.tripInfoItem}>
              <Text style={styles.tripLabel}>DISTANCE</Text>
              <Text style={styles.tripValue}>{delivery.distance}</Text>
            </View>
            <View style={styles.tripInfoItem}>
              <Text style={styles.tripLabel}>ETA</Text>
              <Text style={styles.tripValue}>{delivery.eta}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Text style={styles.tripSectionTitle}>TRIP INFORMATION</Text>

          <View style={styles.startingInfoRow}>
            <View style={styles.startingInfoItem}>
              <Text style={styles.tripLabel}>STARTING ODOMETER</Text>
              <Text style={styles.tripValue}>
                {delivery.startingOdometer !== null && delivery.startingOdometer !== undefined && delivery.startingOdometer !== ""
                  ? `${Number(delivery.startingOdometer).toLocaleString()} km`
                  : "—"}
              </Text>
            </View>
            <View style={styles.startingInfoItem}>
              <Text style={styles.tripLabel}>STARTING FUEL</Text>
              <Text style={styles.tripValue}>
                {delivery.startingFuel !== null && delivery.startingFuel !== undefined && delivery.startingFuel !== ""
                  ? `${Number(delivery.startingFuel).toLocaleString()} L`
                  : "—"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <TouchableOpacity
              style={[styles.ticketButton, { flex: 1.1, marginTop: 0 }]}
              onPress={() => setTicketVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text-outline" size={16} color="#FFFFFF" />
              <Text style={styles.ticketButtonText}>Trip Ticket</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ticketButton, { flex: 1.2, marginTop: 0, backgroundColor: "#0284C7" }]}
              onPress={() => setPermitsVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color="#FFFFFF" />
              <Text style={styles.ticketButtonText}>Permits</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.ticketButton, { flex: 1, marginTop: 0, backgroundColor: "#DC2626" }]}
              onPress={() => {
                const targetId = delivery?.delivery_id || delivery?.id;
                router.push({
                  pathname: "/reportissue",
                  params: targetId ? { deliveryId: String(targetId) } : {},
                });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="warning-outline" size={16} color="#FFFFFF" />
              <Text style={styles.ticketButtonText}>Report</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={[styles.footerActions, { paddingBottom: Math.max(insets.bottom > 0 ? 10 : 12, 12) }]}>
          <NavigationActions
            navigationState={navigationState}
            setNavigationState={setNavigationState}
            onDeliveryCompleted={onDeliveryCompleted}
            onStatusChange={onStatusChange}
            onRequestProofOfDelivery={() => updatePodVisible(true)}
            onRequestCargoChecklist={(stage) => setCargoChecklistStage(stage)}
            onConfirmHqArrival={onConfirmHqArrival}
            isNearHq={isNearHq}
            hqDistanceMeters={hqDistanceMeters}
            delivery={delivery}
          />
        </View>
      </Animated.View>

      <TripTicket
        visible={ticketVisible}
        onClose={() => setTicketVisible(false)}
        delivery={delivery}
      />

      <DeliveryPermitsModal
        visible={permitsVisible}
        onClose={() => setPermitsVisible(false)}
        delivery={delivery}
      />

      <CargoChecklistModal
        visible={Boolean(cargoChecklistStage)}
        stage={cargoChecklistStage}
        delivery={delivery}
        onClose={() => setCargoChecklistStage(null)}
        onSuccess={handleCargoChecklistSuccess}
      />

      <ProofOfDeliveryModal
        visible={podVisible}
        onClose={() => updatePodVisible(false)}
        delivery={delivery}
        onSuccess={(updatedDelivery) => {
          updatePodVisible(false);
          if (onDeliveryUpdated && updatedDelivery) {
            onDeliveryUpdated(updatedDelivery);
          }
          if (updatedDelivery?.status === "returning_to_hq" && !updatedDelivery?.hq_arrived_at) {
            setNavigationState("returning_to_hq");
            return;
          }
          setNavigationState("completed");
          if (onDeliveryCompleted) {
            onDeliveryCompleted(updatedDelivery);
          }
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    backgroundColor: "#F1F2FA",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 12,
  },
  handleArea: {
    minHeight: 56,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E5F0",
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#A9AAB2",
    marginBottom: 8,
  },
  handleHeaderRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  footerActions: {
    paddingHorizontal: 18,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#E2E5F0",
    backgroundColor: "#F1F2FA",
  },
  requestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  requestLabel: { fontSize: 12, color: "#777987", fontWeight: "600" },
  requestId: { fontSize: 12, color: "#30323B", fontWeight: "700" },
  customerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#A91F24",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  customerName: { fontSize: 18, fontWeight: "800", color: "#292A32" },
  contact: { fontSize: 12, color: "#777987", marginTop: 1 },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDE4E4",
    borderRadius: 8,
    padding: 7,
    marginBottom: 8,
  },
  warningText: { fontSize: 12, fontWeight: "700", color: "#A91F24", marginLeft: 7 },
  routeItem: { flexDirection: "row", alignItems: "center" },
  routeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#D62B2B",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  routeText: { flex: 1 },
  routeLabel: { fontSize: 9, fontWeight: "800", color: "#777987" },
  routeValue: { fontSize: 13, fontWeight: "700", color: "#30323B", marginTop: 1 },
  routeLine: { width: 2, height: 12, backgroundColor: "#B5B6BE", marginLeft: 13 },
  divider: { height: 1, backgroundColor: "#D0D1D8", marginVertical: 7 },
  tripInfo: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  tripInfoItem: { width: "45%" },
  tripLabel: { fontSize: 9, color: "#777987", fontWeight: "800" },
  tripValue: { fontSize: 14, fontWeight: "800", color: "#30323B", marginTop: 1 },
  tripSectionTitle: { fontSize: 10, color: "#30313A", fontWeight: "900", marginBottom: 5 },
  startingInfoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  startingInfoItem: { width: "45%" },
  ticketButton: {
    height: 40,
    backgroundColor: "#B91F27",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  ticketButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "900", marginLeft: 7 },
});