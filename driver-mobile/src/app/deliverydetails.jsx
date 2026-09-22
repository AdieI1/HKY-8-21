import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";

import CustomerInfo from "../../components/deliveryinfo/CustomerInfo";
import CargoInfo from "../../components/deliveryinfo/CargoInfo";
import RouteInfo from "../../components/deliveryinfo/RouteInfo";
import StrandedVehicleInfo from "../../components/deliveryinfo/StrandedVehicleInfo";

import { getDelivery } from "../../services/api";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

export default function DeliveryDetails() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0
  );

  const deliveryId = params.deliveryId;

  const [delivery, setDelivery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDelivery = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!deliveryId) {
        throw new Error(
          "No delivery ID was provided."
        );
      }

      const data = await getDelivery(deliveryId);

      setDelivery(data);
    } catch (err) {
      console.error(
        "LOAD DELIVERY DETAILS ERROR:",
        err
      );

      setError(err);
    } finally {
      setLoading(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    loadDelivery();
  }, [loadDelivery]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#951F21"
          />

          <Text style={styles.loadingText}>
            Loading delivery...
          </Text>
        </View>
      </View>
    );
  }

  if (error || !delivery) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={styles.center}>
          <Ionicons
            name="alert-circle"
            size={50}
            color="#951F21"
          />

          <Text style={styles.errorTitle}>
            Unable to Load Delivery
          </Text>

          <Text style={styles.errorText}>
            {error?.message ||
              "Delivery not found."}
          </Text>

          <TouchableOpacity
            style={styles.errorBackButton}
            onPress={() => router.back()}
          >
            <Text style={styles.errorBackText}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#951F21"
        translucent
      />
      <View
        style={[
          styles.header,
          {
            paddingTop: topInset,
            height: 60 + topInset,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTitle}>
            <Ionicons
              name="cube-outline"
              size={30}
              color="#FFFFFF"
            />

            <Text style={styles.title}>
              Delivery Details
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace("/(tabs)/home");
              }
            }}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={29}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <StrandedVehicleInfo
          delivery={delivery}
        />

        <CustomerInfo
          delivery={delivery}
        />

        <CargoInfo
          delivery={delivery}
        />

        <RouteInfo
          delivery={delivery}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DDE0EE",
  },

  header: {
    backgroundColor: "#951F21",
    justifyContent: "flex-end",
  },

  headerContent: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },

  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginLeft: 8,
  },

  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    padding: 16,
    paddingBottom: 30,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  loadingText: {
    marginTop: 12,
    color: "#555",
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginTop: 12,
  },

  errorText: {
    color: "#777",
    textAlign: "center",
    marginTop: 8,
  },

  errorBackButton: {
    backgroundColor: "#951F21",
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },

  errorBackText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});