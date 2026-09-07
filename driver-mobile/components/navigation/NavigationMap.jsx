import React, { useEffect, useMemo, useRef, useState } from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { StyleSheet, View } from "react-native";
import * as Location from "expo-location";

const toCoordinate = (latitude, longitude) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { latitude: lat, longitude: lng };
};

export default function NavigationMap({ delivery, navigationState, onLocationChange }) {
  const mapRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  const pickup = useMemo(
    () =>
      toCoordinate(
        delivery?.request?.pickup_lat,
        delivery?.request?.pickup_lng
      ),
    [delivery]
  );

  const dropoff = useMemo(
    () =>
      toCoordinate(
        delivery?.request?.dropoff_lat,
        delivery?.request?.dropoff_lng
      ),
    [delivery]
  );

  const isDropoffLeg = [
    "in_transit_dropoff",
    "arrived_dropoff",
    "unloading",
    "returning_to_hq",
    "completed",
  ].includes(navigationState);

  useEffect(() => {
    let subscription;
    let mounted = true;

    const startTracking = async () => {
      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (!mounted || permission.status !== "granted") return;

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 10000,
          distanceInterval: 25,
        },
        (location) => {
          const coordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          setCurrentLocation(coordinate);
          onLocationChange?.(coordinate);
        }
      );
    };

    startTracking().catch((error) => {
      console.log("LOCATION TRACKING ERROR:", error);
    });

    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, [onLocationChange]);

  useEffect(() => {
    const coordinates = isDropoffLeg
      ? [currentLocation || pickup, dropoff].filter(Boolean)
      : [currentLocation, pickup].filter(Boolean);

    if (coordinates.length > 1) {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 90, right: 45, bottom: 250, left: 45 },
        animated: true,
      });
    } else if (coordinates.length === 1 && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: coordinates[0].latitude,
        longitude: coordinates[0].longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  }, [currentLocation, pickup, dropoff, isDropoffLeg]);

  const initialCoordinate = (isDropoffLeg ? dropoff : pickup) || pickup || dropoff || {
    latitude: 8.4542,
    longitude: 124.6319,
  };

  const routeCoordinates = isDropoffLeg
    ? [currentLocation || pickup, dropoff].filter(Boolean)
    : [currentLocation, pickup].filter(Boolean);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          ...initialCoordinate,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation
        followsUserLocation={false}
      >
        {pickup && (
          <Marker
            coordinate={pickup}
            title="Pickup"
            pinColor={!isDropoffLeg ? "#B91F27" : "#555555"}
          />
        )}
        {dropoff && (
          <Marker
            coordinate={dropoff}
            title="Drop-off"
            pinColor={isDropoffLeg ? "#B91F27" : "#555555"}
          />
        )}
        {routeCoordinates.length === 2 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#B91F27"
            strokeWidth={4}
          />
        )}
      </MapView>
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
});
