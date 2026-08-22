import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ActiveDeliveryCard from "../../components/ActiveDeliveryCard";
import AppHeader from "../../components/AppHeader";
import NoActiveDeliveryCard from "../../components/NoActiveDeliveryCard";
import RequestSheet from "../../components/RequestSheet";
import SaveMessage from "../../components/SaveMessage";

const { width, height } = Dimensions.get("window");

const Home = () => {
  const router = useRouter();

  const [showSheet, setShowSheet] = useState(false);
  const [showSaveMessage, setShowSaveMessage] =
    useState(false);

  const translateY = useRef(
    new Animated.Value(height)
  ).current;

  const activeDelivery = {
    cargoName: "Electronics Cargo",
    status: "intransit",
    date: "3/30/2026",
    route: "Port Area - Malaybalay",
  };

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: showSheet ? 0 : height,
      duration: showSheet ? 300 : 250,
      useNativeDriver: true,
    }).start();
  }, [showSheet]);

  const openSheet = () => {
    setShowSheet(true);
  };

  const closeSheet = () => {
    setShowSheet(false);
  };

  const handleDraftSaved = () => {
    /*
     * Close the sheet first.
     */
    setShowSheet(false);

    /*
     * Show the message.
     */
    setShowSaveMessage(true);

    /*
     * Automatically hide it after 3 seconds.
     */
    setTimeout(() => {
      setShowSaveMessage(false);
    }, 3000);
  };

  const handleViewDelivery = () => {
    router.push("/deliveries");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <AppHeader
          icon="document-text-outline"
          iconSize={30}
        />

        {/* BODY */}
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* REQUEST DELIVERY */}
          <View style={styles.requestCard}>
            <Text style={styles.requestHeader}>
              Request Delivery!
            </Text>

            <Text style={styles.requestSubheader}>
              Schedule a delivery quick and easy.
            </Text>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.requestBtn}
              onPress={openSheet}
              activeOpacity={0.8}
            >
              <Ionicons
                name="car-outline"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.requestBtnText}>
                Create Request
              </Text>
            </TouchableOpacity>
          </View>

          {/* ACTIVE DELIVERY */}
          {activeDelivery ? (
            <ActiveDeliveryCard
              delivery={activeDelivery}
              onViewDetails={handleViewDelivery}
            />
          ) : (
            <NoActiveDeliveryCard />
          )}
        </ScrollView>

        {/* SAVE MESSAGE */}
        {showSaveMessage && <SaveMessage />}

        {/* BACKDROP */}
        {showSheet && (
          <TouchableOpacity
            activeOpacity={1}
            onPress={closeSheet}
            style={styles.backdrop}
          />
        )}

        {/* REQUEST SHEET */}
        {showSheet && (
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                transform: [
                  {
                    translateY,
                  },
                ],
              },
            ]}
          >
            <RequestSheet
              onClose={closeSheet}
              onDraftSaved={handleDraftSaved}
            />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Home;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },

  container: {
    flex: 1,
  },

  body: {
    flex: 1,
    backgroundColor: "#EDEEF5",
  },

  scrollContent: {
    padding: width * 0.04,
    paddingBottom: height * 0.04,
  },

  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: width * 0.05,
  },

  requestHeader: {
    fontSize: width * 0.07,
    fontWeight: "900",
    color: "#DE2226",
  },

  requestSubheader: {
    fontSize: width * 0.035,
    color: "#273342",
  },

  divider: {
    marginTop: height * 0.01,
    height: 1,
    backgroundColor: "#D1D1D1",
    width: "100%",
  },

  requestBtn: {
    marginTop: height * 0.02,
    backgroundColor: "#E53935",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  requestBtnText: {
    color: "#FFFFFF",
    fontSize: width * 0.045,
    fontWeight: "600",
    marginLeft: 5,
  },

  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.85,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 999,
    elevation: 20,
  },

  backdrop: {
    position: "absolute",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 998,
  },
});