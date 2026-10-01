import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { getRouteWeather } from "../../services/api";

const DEFAULT_HQ = { lat: 8.4542, lng: 124.6319 };
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function WeatherRouteAdvisory({
  delivery,
  currentLocation,
  navigationState,
}) {
  const [advisory, setAdvisory] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Drag-and-drop position handler
  const pan = useRef(new Animated.ValueXY({ x: 14, y: 70 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger drag if movement is intentional (> 4px) to preserve button clicks
        return Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Extract destination coordinates depending on active leg
  const routeTarget = useMemo(() => {
    if (!delivery) return null;
    const request = delivery.request || delivery;

    const isPickupLeg =
      navigationState === "preview" ||
      navigationState === "in_transit_pickup" ||
      navigationState === "arrived_pickup";

    const targetLat = isPickupLeg
      ? Number(request.pickup_latitude || delivery.pickup_latitude || DEFAULT_HQ.lat)
      : Number(request.delivery_latitude || delivery.delivery_latitude || DEFAULT_HQ.lat);

    const targetLng = isPickupLeg
      ? Number(request.pickup_longitude || delivery.pickup_longitude || DEFAULT_HQ.lng)
      : Number(request.delivery_longitude || delivery.delivery_longitude || DEFAULT_HQ.lng);

    const originLat = currentLocation?.latitude || DEFAULT_HQ.lat;
    const originLng = currentLocation?.longitude || DEFAULT_HQ.lng;

    return {
      originLat,
      originLng,
      targetLat,
      targetLng,
      legName: isPickupLeg ? "Pickup Point" : "Drop-off Location",
    };
  }, [delivery, currentLocation, navigationState]);

  const fetchWeatherAdvisory = useCallback(async () => {
    if (!routeTarget) return;
    try {
      const data = await getRouteWeather(
        routeTarget.originLat,
        routeTarget.originLng,
        routeTarget.targetLat,
        routeTarget.targetLng
      );

      if (data?.summary) {
        setAdvisory(data.summary);
      }
    } catch (err) {
      console.warn("WeatherRouteAdvisory fetch error:", err);
    }
  }, [routeTarget]);

  useEffect(() => {
    fetchWeatherAdvisory();
    // Refresh weather every 15 minutes during trip
    const timer = setInterval(fetchWeatherAdvisory, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchWeatherAdvisory]);

  // If no adverse condition or rain, do not display
  if (!advisory || !advisory.has_rain_ahead) {
    return null;
  }

  const isSevere = advisory.worst_severity === "severe";
  const speedLimit = advisory.recommended_speed_limit || 50;

  const iconName = isSevere
    ? "weather-lightning-rainy"
    : advisory.worst_condition?.toLowerCase().includes("drizzle")
    ? "weather-partly-rainy"
    : "weather-pouring";

  // Draggable style transformation
  const draggableStyle = {
    transform: [{ translateX: pan.x }, { translateY: pan.y }],
  };

  return (
    <Animated.View
      style={[
        styles.dragWrapper,
        draggableStyle,
        isCollapsed ? styles.collapsedWrapper : styles.expandedWrapper,
      ]}
      {...panResponder.panHandlers}
    >
      {isCollapsed ? (
        /* ── Collapsed Compact View (Red & White Pill) ── */
        <TouchableOpacity
          style={[styles.collapsedPill, isSevere ? styles.pillSevere : styles.pillNormal]}
          onPress={() => setIsCollapsed(false)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={iconName}
            size={16}
            color="#DC2626"
            style={{ marginRight: 2 }}
          />
          <Text style={styles.collapsedTitle} numberOfLines={1}>
            {advisory.worst_condition} • Max {speedLimit} km/h
          </Text>
          <View style={styles.toggleIconBtn}>
            <Ionicons name="chevron-down" size={14} color="#DC2626" />
          </View>
        </TouchableOpacity>
      ) : (
        /* ── Expanded Full Card (White & Red Theme) ── */
        <View style={[styles.card, isSevere ? styles.cardSevere : styles.cardNormal]}>
          {/* Subtle Drag Handle Indicator */}
          <View style={styles.dragHandle} />

          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons name={iconName} size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerLabel}>
                  {isSevere ? "SEVERE WEATHER WARNING" : "WEATHER ADVISORY"}
                </Text>
                <Text style={styles.conditionTitle} numberOfLines={1}>
                  {advisory.worst_condition} ({advisory.location_context})
                </Text>
              </View>
            </View>

            {/* View Less Toggle Button (No X button) */}
            <TouchableOpacity
              style={styles.collapseBtn}
              onPress={() => setIsCollapsed(true)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              title="View Less"
            >
              <Ionicons name="chevron-up" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Advisory description */}
          <Text style={styles.advisoryText} numberOfLines={2}>
            {advisory.driver_advisory}
          </Text>

          {/* Footer: Red Speed Limit Pill + Drag Hint */}
          <View style={styles.footerRow}>
            <View style={styles.speedPill}>
              <Ionicons name="speedometer-outline" size={13} color="#FFFFFF" />
              <Text style={styles.speedPillText}>REC. SPEED: {speedLimit} KM/H</Text>
            </View>

            <Text style={styles.dragHintText}>
              <Ionicons name="hand-right-outline" size={10} color="#94A3B8" /> Drag to move
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  dragWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 99,
    elevation: 10,
  },
  expandedWrapper: {
    width: SCREEN_WIDTH - 28,
  },
  collapsedWrapper: {
    alignSelf: "flex-start",
  },

  /* ── Full Card (White & Red Theme) ── */
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingTop: 8,
    paddingBottom: 11,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  cardNormal: {
    borderColor: "#FECACA", // Soft Red Border
  },
  cardSevere: {
    borderColor: "#DC2626", // Bold Red Border
  },

  dragHandle: {
    width: 32,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 6,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEE2E2", // Soft pastel red
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#DC2626", // Brand Red
    letterSpacing: 0.5,
  },
  conditionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A", // Dark Slate Text
    marginTop: 1,
  },

  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  advisoryText: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 16,
    marginBottom: 8,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  speedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DC2626", // Red speed limit badge
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  speedPillText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  dragHintText: {
    fontSize: 10,
    color: "#94A3B8",
    fontStyle: "italic",
  },

  /* ── Collapsed View (White & Red Pill) ── */
  collapsedPill: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 6,
  },
  pillNormal: {
    borderColor: "#FECACA",
  },
  pillSevere: {
    borderColor: "#DC2626",
    backgroundColor: "#FFF5F5",
  },
  collapsedTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#1E293B",
  },
  toggleIconBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
});
