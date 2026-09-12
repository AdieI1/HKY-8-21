import {
  StyleSheet,
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRef, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import NavigationActions from "./NavigationActions";
import TripTicket from "../TripTicket";
import { formatShortAddress } from "../../utils/address";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = Math.min(Math.max(SCREEN_HEIGHT * 0.82, 570), SCREEN_HEIGHT - 30);
const SHEET_CLOSED = SHEET_HEIGHT - 40;

export default function NavigationInfoSheet({
  delivery,
  navigationState,
  setNavigationState,
  onDeliveryCompleted,
  onStatusChange,
}) {
  const translateY = useRef(
    new Animated.Value(0)
  ).current;

  const [ticketVisible, setTicketVisible] =
    useState(false);

  const openSheet = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  const closeSheet = () => {
    Animated.spring(translateY, {
      toValue: SHEET_CLOSED,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 5,

      onPanResponderMove: (_, gesture) => {
        const current =
          translateY.__getValue();

        const next = current + gesture.dy;

        if (
          next >= 0 &&
          next <= SHEET_CLOSED
        ) {
          translateY.setValue(next);
        }
      },

      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 50) {
          closeSheet();
        } else if (gesture.dy < -50) {
          openSheet();
        } else {
          const position =
            translateY.__getValue();

          if (
            position > SHEET_CLOSED / 2
          ) {
            closeSheet();
          } else {
            openSheet();
          }
        }
      },
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
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.requestRow}>
            <Text style={styles.requestLabel}>Request ID</Text>
            <Text style={styles.requestId}>{delivery.requestId}</Text>
          </View>

          <View style={styles.customerRow}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.customerName}>{delivery.driver}</Text>
              <Text style={styles.contact}>{delivery.contact}</Text>
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
              <Text style={styles.tripValue}>{delivery.startingOdometer || "124,000"} km</Text>
            </View>
            <View style={styles.startingInfoItem}>
              <Text style={styles.tripLabel}>STARTING FUEL</Text>
              <Text style={styles.tripValue}>{delivery.startingFuel || "100"} L</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.ticketButton}
            onPress={() => setTicketVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={18} color="#FFFFFF" />
            <Text style={styles.ticketButtonText}>View Trip Ticket</Text>
          </TouchableOpacity>

          <NavigationActions
            navigationState={navigationState}
            setNavigationState={setNavigationState}
            onDeliveryCompleted={onDeliveryCompleted}
            onStatusChange={onStatusChange}
          />
        </ScrollView>
      </Animated.View>

      <TripTicket
        visible={ticketVisible}
        onClose={() => setTicketVisible(false)}
        delivery={delivery}
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
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 5,
    backgroundColor: "#A9AAB2",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
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