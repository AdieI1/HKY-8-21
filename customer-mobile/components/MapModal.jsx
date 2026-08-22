import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

const { width, height } = Dimensions.get("window");

const MINDANAO_REGION = {
  latitude: 7.1907,
  longitude: 125.4553,
  latitudeDelta: 3.0,
  longitudeDelta: 3.0,
};

export default function MapModal({ visible, onClose, onConfirm, mode }) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState("");

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const mapRef = useRef(null);
  const cacheRef = useRef({});
  const lastRequestTime = useRef(0);

  const isInsideMindanao = (lat, lng) => {
    return (
      (lat >= 5.0 && lat <= 9.8 && lng >= 122.5 && lng <= 126.8) ||
      (lat >= 8.8 && lat <= 10.3 && lng >= 125.5 && lng <= 127.3) ||
      (lat >= 6.0 && lat <= 8.5 && lng >= 121.7 && lng <= 123.2)
    );
  };

  useEffect(() => {
    if (visible) {
      setSelectedPoint(null);
      setSelectedAddress("");
      setSearch("");
      setResults([]);
    }
  }, [mode, visible]);

  const handleSearch = async () => {
    const key = search.trim().toLowerCase();
    if (key.length < 3 || loading) return;

    if (cacheRef.current[key]) {
      setResults(cacheRef.current[key]);
      return;
    }

    const now = Date.now();
    if (now - lastRequestTime.current < 1000) return;
    lastRequestTime.current = now;

    setLoading(true);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          key + " Philippines"
        )}&format=json&limit=5`,
        {
          headers: {
            "User-Agent": "HJYTruckingApp/1.0",
          },
        }
      );

      const data = await res.json();
      cacheRef.current[key] = data;
      setResults(data);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlace = (place) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);

    if (!isInsideMindanao(lat, lon)) return;

    const point = {
      latitude: lat,
      longitude: lon,
      address: place.display_name,
    };

    setSelectedPoint(point);
    setSelectedAddress(place.display_name);
    setResults([]);

    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  };

  const handleMapPress = async (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    if (!isInsideMindanao(latitude, longitude)) return;

    const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    let addr = cacheRef.current[cacheKey];

    if (!addr) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            "User-Agent": "HJYTruckingApp/1.0",
          },
        }
      );

      const data = await res.json();
      addr = data.display_name || "Selected location";
      cacheRef.current[cacheKey] = addr;
    }

    setSelectedPoint({ latitude, longitude, address: addr });
    setSelectedAddress(addr);
  };

  const handleUseCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        alert("Permission to access location was denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      if (!isInsideMindanao(latitude, longitude)) {
        alert("Location is outside Mindanao");
        return;
      }

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        {
          headers: {
            "User-Agent": "HJYTruckingApp/1.0",
          },
        }
      );

      const data = await res.json();
      const addr = data.display_name || "Current location";

      const point = {
        latitude,
        longitude,
        address: addr,
      };

      setSelectedPoint(point);
      setSelectedAddress(addr);

      mapRef.current?.animateToRegion({
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });

    } catch (err) {
      console.log(err);
    }
  };

  const handleConfirm = () => {
    if (!selectedPoint) return;

    onConfirm({
      type: mode,
      data: selectedPoint,
    });

    onClose();
  };

  if (!visible) return null;

  const headerTitle =
    mode === "pickup"
      ? "Tap to select pick-up location"
      : "Tap to select drop off location";

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1 }}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={width * 0.055} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerText}>{headerTitle}</Text>
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <Ionicons
              name="location-outline"
              size={width * 0.055}
              color="#E53935"
              style={styles.locationIcon}
            />

            <TextInput
              placeholder="Search Maps..."
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
              placeholderTextColor="#999"
            />

            <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
              <Text style={styles.searchBtnText}>
                {loading ? "..." : "Search"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.resultsContainer}>
            {results.map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleSelectPlace(item)}
                style={styles.resultItem}
              >
                <Text numberOfLines={1}>{item.display_name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* MAP */}
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={MINDANAO_REGION}
          onPress={handleMapPress}
        >
          {selectedPoint && <Marker coordinate={selectedPoint} />}
        </MapView>

        {/* USE CURRENT LOCATION */}
        <TouchableOpacity
          onPress={handleUseCurrentLocation}
          style={styles.currentLocationFloating}
        >
          <Text style={styles.currentLocationText}>
            Use Current Location
          </Text>
        </TouchableOpacity>

        {/* CONFIRM */}
        <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
          <Text style={styles.confirmText}>Confirm Location</Text>
        </TouchableOpacity>

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: height * 0.06,
    left: width * 0.05,
    right: width * 0.05,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: height * 0.009,
    paddingHorizontal: width * 0.04,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
    elevation: 6,
  },

  backBtn: {
    backgroundColor: "#ED4C44",
    padding: width * 0.025,
    borderRadius: 10,
  },

  headerText: {
    flex: 1,
    fontSize: width * 0.045,
    fontWeight: "600",
    color: "#E53935",
    textAlign: "center",
  },

  searchContainer: {
    position: "absolute",
    bottom: height * 0.22,
    left: width * 0.06,
    right: width * 0.06,
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingHorizontal: width * 0.035,
    paddingVertical: height * 0.005,
    zIndex: 20,
    elevation: 5,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  locationIcon: {
    marginRight: width * 0.02,
  },

  searchInput: {
    flex: 1,
    fontSize: width * 0.04,
  },

  searchBtn: {
    backgroundColor: "#ED4C44",
    paddingHorizontal: width * 0.035,
    paddingVertical: height * 0.01,
    borderRadius: 10,
    marginLeft: width * 0.02,
  },

  searchBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: width * 0.035,
  },

  resultsContainer: {
    marginTop: height * 0.01,
    maxHeight: height * 0.2,
  },

  resultItem: {
    paddingVertical: height * 0.012,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  currentLocationFloating: {
    position: "absolute",
    bottom: height * 0.13,
    left: width * 0.06,
    right: width * 0.06,
    backgroundColor: "#ED4C44",
    paddingVertical: height * 0.022,
    borderRadius: 14,
    alignItems: "center",
    zIndex: 10,
    elevation: 5
  },

  currentLocationText: {
    color: "#fff",
    fontSize: width * 0.050,
    fontWeight: "600",
  },

  confirmBtn: {
    position: "absolute",
    bottom: height * 0.04,
    left: width * 0.06,
    right: width * 0.06,
    backgroundColor: "#ED4C44",
    padding: height * 0.022,
    borderRadius: 14,
    alignItems: "center",
    zIndex: 10,
  },

  confirmText: {
    color: "#fff",
    fontSize: width * 0.055,
    fontWeight: "bold",
  },
});