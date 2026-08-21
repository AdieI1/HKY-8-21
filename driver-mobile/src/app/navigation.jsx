import { StyleSheet, View, Text, Modal } from "react-native";
import { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import NavigationInfoSheet from "../../components/navigation/NavigationInfoSheet";
import NavigationHeader from "../../components/navigation/NavigationHeader";
import NavigationRoutePreview from "../../components/navigation/NavigationRoutePreview";
import NavigationMap from "../../components/navigation/NavigationMap";
import PostTripCheck from "../../components/navigation/PostTripCheck";

export default function Navigation() {
  const router = useRouter();

  const [navigationState, setNavigationState] = useState("preview");
  const [showPostTripCheck, setShowPostTripCheck] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const delivery = {
    requestId: "RQ00001",
    driver: "Christopher Lee",
    contact: "09674209607",
    balance: "₱2,500",
    cargo: "Electronics",
    weight: "6700kg",
    pickup: "Port Area, Cagayan De Oro City, Misamis Oriental",
    dropoff: "544F+XW9, Malaybalay City, Bukidnon",
    distance: "10 km",
    eta: "2hrs and 30mins",
    startingOdometer: "124,000",
    startingFuel: "100",
    vehicle: "FUSO FJ 2828R",
  };

  useEffect(() => {
    if (navigationState !== "completed") return;

    setShowCompleted(true);

    const timer = setTimeout(() => {
      setShowCompleted(false);
      setShowPostTripCheck(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigationState]);

  const handlePostTripConfirm = (postTripData) => {
    console.log("POST TRIP DATA:", postTripData);

    setShowPostTripCheck(false);

    router.replace({
      pathname: "/(tabs)/home",
      params: {
        completed: "1",
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.container}>
        <NavigationHeader navigationState={navigationState} />

        <View style={styles.mapContainer}>
          <NavigationMap />
        </View>

        {!showPostTripCheck && (
          <>
            <NavigationRoutePreview
              delivery={delivery}
              navigationState={navigationState}
            />

            <NavigationInfoSheet
              delivery={delivery}
              navigationState={navigationState}
              setNavigationState={setNavigationState}
            />
          </>
        )}

        {showCompleted && (
          <View style={styles.completedMessage}>
            <Text style={styles.completedTitle}>
              Delivery Completed!
            </Text>

            <Text style={styles.completedText}>
              Opening post-trip check...
            </Text>
          </View>
        )}

        <Modal
          visible={showPostTripCheck}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {}}
        >
          <PostTripCheck
            delivery={delivery}
            onConfirm={handlePostTripConfirm}
            onReportIssue={() => {
              console.log("POST TRIP ISSUE");
            }}
          />
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DDE0EE",
  },

  mapContainer: {
    flex: 1,
  },

  completedMessage: {
    position: "absolute",
    top: 75,
    left: 48,
    right: 48,
    backgroundColor: "#F1F2FA",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 20,
    elevation: 10,
    zIndex: 20,
  },

  completedTitle: {
    color: "#3D9B58",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center",
  },

  completedText: {
    color: "#777987",
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});