import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import MapView, { Marker, Polyline, Callout } from "react-native-maps";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

import {
  DEFAULT_HQ_COORDINATES,
  fetchRoadRoute,
  getRouteWaypoints,
} from "../../src/utils/routeService";
import {
  DEFAULT_DANGER_ZONES,
  HAZARD_CATEGORIES,
  isZoneNearRoute,
  findNearestUpcomingHazard,
} from "../../src/utils/dangerZones";
import {
  STEEPNESS_CONFIG,
  fetchRouteSteepnessMobile,
} from "../../src/utils/routeElevation";

// Calculate bearing between two coordinates when device sensor heading is not available
function getBearing(startLat, startLng, destLat, destLng) {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export default function NavigationMap({
  delivery,
  navigationState,
  onLocationChange,
  onHazardAlert,
  onRouteMetrics,
}) {
  const mapRef = useRef(null);

  const [currentLocation, setCurrentLocation] = useState(null);
  const [heading, setHeading] = useState(0);
  const [isLocked, setIsLocked] = useState(true);
  const [roadCoordinates, setRoadCoordinates] = useState([]);
  const [steepnessSegments, setSteepnessSegments] = useState([]);
  const [routeInfo, setRouteInfo] = useState({ distanceKm: 0, durationMins: 0 });
  const [initialZoomDone, setInitialZoomDone] = useState(false);

  const prevLocationRef = useRef(null);

  // Extract Pickup & Dropoff coordinates
  const pickup = useMemo(() => {
    const lat = Number(delivery?.request?.pickup_lat);
    const lng = Number(delivery?.request?.pickup_lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
  }, [delivery]);

  const dropoff = useMemo(() => {
    const lat = Number(delivery?.request?.dropoff_lat);
    const lng = Number(delivery?.request?.dropoff_lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : null;
  }, [delivery]);

  // Determine current active navigation leg
  const routeWaypoints = useMemo(() => {
    return getRouteWaypoints(delivery, navigationState, currentLocation);
  }, [delivery, navigationState, currentLocation]);

  // 1. High-Frequency, Low-Latency Real-Time GPS Tracker (1.5s / 3m)
  useEffect(() => {
    let subscription;
    let mounted = true;

    const startTracking = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted || permission.status !== "granted") return;

      // Get fast initial position
      try {
        const initialLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (mounted && initialLoc?.coords) {
          const coord = {
            latitude: initialLoc.coords.latitude,
            longitude: initialLoc.coords.longitude,
          };
          setCurrentLocation(coord);
          onLocationChange?.(coord);
        }
      } catch (_) {}

      // Watch position with high frequency
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1500, // 1.5 seconds
          distanceInterval: 3, // 3 meters
        },
        (location) => {
          if (!mounted) return;
          const { latitude, longitude } = location.coords;
          const newCoord = { latitude, longitude };

          // Calculate device or velocity heading
          let calculatedHeading = location.coords.heading;
          if (calculatedHeading == null || calculatedHeading < 0) {
            if (prevLocationRef.current) {
              calculatedHeading = getBearing(
                prevLocationRef.current.latitude,
                prevLocationRef.current.longitude,
                latitude,
                longitude
              );
            } else {
              calculatedHeading = 0;
            }
          }

          prevLocationRef.current = newCoord;
          setHeading(calculatedHeading);
          setCurrentLocation(newCoord);
          onLocationChange?.(newCoord);

          // Check proximity to upcoming danger zones
          const nearbyHazard = findNearestUpcomingHazard(newCoord, DEFAULT_DANGER_ZONES, 1.8);
          onHazardAlert?.(nearbyHazard);
        }
      );
    };

    startTracking().catch((error) => {
      console.log("GPS NAVIGATION TRACKING ERROR:", error);
    });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [onLocationChange, onHazardAlert]);

  // 2. Fetch OSRM Road Route & Elevation Profile
  useEffect(() => {
    let active = true;
    const waypoints = routeWaypoints.waypoints;

    if (!waypoints || waypoints.length < 2) return;

    fetchRoadRoute(waypoints)
      .then(async (route) => {
        if (!active) return;
        setRoadCoordinates(route.coordinates);
        setRouteInfo({ distanceKm: route.distanceKm, durationMins: route.durationMins });
        onRouteMetrics?.(route);

        // Fetch elevation steepness segments if road coordinates are valid
        if (route.coordinates.length >= 2) {
          const steepnessData = await fetchRouteSteepnessMobile(route.coordinates);
          if (active && steepnessData?.segments?.length > 0) {
            setSteepnessSegments(steepnessData.segments);
          }
        }
      })
      .catch((err) => {
        console.warn("Error fetching road route:", err);
      });

    return () => {
      active = false;
    };
  }, [
    routeWaypoints.leg,
    routeWaypoints.destination?.latitude,
    routeWaypoints.destination?.longitude,
    currentLocation?.latitude ? Math.round(currentLocation.latitude * 200) : null,
    currentLocation?.longitude ? Math.round(currentLocation.longitude * 200) : null,
    pickup,
    dropoff,
  ]);

  // 3. GTA / FoodPanda Camera Lock Mode
  useEffect(() => {
    if (!currentLocation || !mapRef.current) return;

    if (isLocked) {
      mapRef.current.animateCamera(
        {
          center: currentLocation,
          pitch: 45, // 3D tilted GTA / FoodPanda angle
          heading: heading || 0, // Auto-rotate camera to vehicle heading
          zoom: 17, // Navigation zoom level
        },
        { duration: 800 }
      );
    } else if (!initialZoomDone && roadCoordinates.length > 1) {
      mapRef.current.fitToCoordinates(roadCoordinates, {
        edgePadding: { top: 90, right: 40, bottom: 250, left: 40 },
        animated: true,
      });
      setInitialZoomDone(true);
    }
  }, [currentLocation, heading, isLocked]);

  // Handler to re-lock camera to driver
  const handleRecenter = useCallback(() => {
    setIsLocked(true);
    if (currentLocation && mapRef.current) {
      mapRef.current.animateCamera(
        {
          center: currentLocation,
          pitch: 45,
          heading: heading || 0,
          zoom: 17,
        },
        { duration: 800 }
      );
    }
  }, [currentLocation, heading]);

  // Danger zones to show (zones near the route or nearby)
  const visibleDangerZones = useMemo(() => {
    if (roadCoordinates.length === 0) return DEFAULT_DANGER_ZONES.slice(0, 4);
    return DEFAULT_DANGER_ZONES.filter((zone) => isZoneNearRoute(zone, roadCoordinates, 4.0));
  }, [roadCoordinates]);

  const initialRegion = {
    latitude: currentLocation?.latitude || pickup?.latitude || DEFAULT_HQ_COORDINATES.latitude,
    longitude: currentLocation?.longitude || pickup?.longitude || DEFAULT_HQ_COORDINATES.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false} // Custom directional navigation arrow used instead
        showsCompass={false}
        showsScale={false}
        rotateEnabled={true}
        pitchEnabled={true}
        onPanDrag={() => {
          if (isLocked) setIsLocked(false);
        }}
      >
        {/* HQ Depot Marker */}
        <Marker
          coordinate={DEFAULT_HQ_COORDINATES}
          title="HJY Trucking HQ"
          description="Puntod, Cagayan de Oro City"
        >
          <View style={styles.depotMarker}>
            <Ionicons name="business" size={16} color="#FFFFFF" />
          </View>
        </Marker>

        {/* Pickup Marker */}
        {pickup && (
          <Marker
            coordinate={pickup}
            title="Pick-up Location"
            description={routeWaypoints.leg === "pickup" ? "Active Navigation Target" : "Pick-up Location"}
          >
            <View
              style={[
                styles.waypointMarker,
                {
                  backgroundColor: routeWaypoints.leg === "pickup" ? "#10B981" : "#6B7280",
                  borderColor: routeWaypoints.leg === "pickup" ? "#FFFFFF" : "#E5E7EB",
                  transform: [{ scale: routeWaypoints.leg === "pickup" ? 1.15 : 0.9 }],
                },
              ]}
            >
              <Ionicons name="cube" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}

        {/* Dropoff Marker */}
        {dropoff && (
          <Marker
            coordinate={dropoff}
            title="Drop-off Destination"
            description={routeWaypoints.leg === "dropoff" ? "Active Navigation Target" : "Drop-off Destination"}
          >
            <View
              style={[
                styles.waypointMarker,
                {
                  backgroundColor: routeWaypoints.leg === "dropoff" ? "#B91F27" : "#6B7280",
                  borderColor: routeWaypoints.leg === "dropoff" ? "#FFFFFF" : "#E5E7EB",
                  transform: [{ scale: routeWaypoints.leg === "dropoff" ? 1.15 : 0.9 }],
                },
              ]}
            >
              <Ionicons name="flag" size={16} color="#FFFFFF" />
            </View>
          </Marker>
        )}

        {/* Danger Zone Markers */}
        {visibleDangerZones.map((zone) => {
          const category = HAZARD_CATEGORIES[zone.category] || HAZARD_CATEGORIES.reported_incident;
          return (
            <Marker
              key={zone.id}
              coordinate={{ latitude: zone.lat, longitude: zone.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={[styles.hazardBadge, { backgroundColor: category.fillColor }]}>
                <Ionicons name={category.icon || "warning"} size={14} color="#FFFFFF" />
              </View>
              <Callout tooltip>
                <View style={styles.hazardCallout}>
                  <Text style={styles.hazardCalloutTitle}>{zone.name}</Text>
                  <Text style={styles.hazardCalloutType}>{category.label}</Text>
                  <Text style={styles.hazardCalloutDesc}>{zone.advisory}</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}

        {/* Base Road Polyline (Blue Highway Style) */}
        {roadCoordinates.length > 1 && (
          <Polyline
            coordinates={roadCoordinates}
            strokeColor="#1D4ED8"
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {/* Color-Coded Steepness Overlay Polylines */}
        {steepnessSegments.map((segment, idx) => {
          if (segment.category === "normal" || !segment.coordinates?.length) {
            return null;
          }
          const color =
            segment.category === "very_steep"
              ? STEEPNESS_CONFIG.very_steep.color
              : STEEPNESS_CONFIG.steep.color;
          return (
            <Polyline
              key={`steep-${idx}`}
              coordinates={segment.coordinates}
              strokeColor={color}
              strokeWidth={7}
              lineCap="round"
              lineJoin="round"
            />
          );
        })}

        {/* FoodPanda / GTA 3D Navigation Vehicle Arrow Marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            flat={true}
            rotation={heading}
          >
            <View style={styles.navArrowContainer}>
              <View style={styles.pulseRing} />
              <View style={styles.navArrowCore}>
                <Ionicons name="navigate" size={24} color="#2563EB" />
              </View>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Floating Re-Center / Camera Lock Button */}
      {!isLocked && (
        <TouchableOpacity
          style={styles.recenterButton}
          activeOpacity={0.8}
          onPress={handleRecenter}
        >
          <Ionicons name="locate" size={20} color="#FFFFFF" />
          <Text style={styles.recenterText}>Re-center</Text>
        </TouchableOpacity>
      )}

      {/* Floating 3D Navigation Status Pill */}
      {isLocked && (
        <View style={styles.lockedPill}>
          <View
            style={[
              styles.lockedPillDot,
              {
                backgroundColor: routeWaypoints.leg === "pickup" ? "#10B981" : "#EF4444",
              },
            ]}
          />
          <Text style={styles.lockedPillText}>
            {routeWaypoints.legTitle || "3D GPS Navigation Active"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },

  // 3D Directional Navigation Arrow Marker
  navArrowContainer: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(37, 99, 235, 0.22)",
    borderWidth: 1.5,
    borderColor: "rgba(37, 99, 235, 0.45)",
  },
  navArrowCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 6,
  },

  // Markers
  depotMarker: {
    backgroundColor: "#4B5563",
    padding: 7,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 4,
  },
  waypointMarker: {
    padding: 7,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    elevation: 5,
  },
  hazardBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  hazardCallout: {
    backgroundColor: "#1F2937",
    padding: 10,
    borderRadius: 8,
    maxWidth: 240,
  },
  hazardCalloutTitle: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 13,
  },
  hazardCalloutType: {
    color: "#FBBF24",
    fontSize: 11,
    marginTop: 2,
  },
  hazardCalloutDesc: {
    color: "#D1D5DB",
    fontSize: 11,
    marginTop: 4,
  },

  // Floating Controls
  recenterButton: {
    position: "absolute",
    bottom: 24,
    right: 18,
    backgroundColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 10,
  },
  recenterText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
  },

  lockedPill: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    zIndex: 10,
  },
  lockedPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  lockedPillText: {
    color: "#F1F5F9",
    fontSize: 11,
    fontWeight: "600",
  },
});
