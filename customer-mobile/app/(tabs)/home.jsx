import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { getMyDeliveryRequests, getToken, logout } from "../../services/api";
import { formatDeliveryRequest, isActiveDelivery } from "../../services/deliveries";
import { getDraftById } from "../../services/drafts";
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");

const Home = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { isDark, colors } = useTheme();

  const [showSheet, setShowSheet] = useState(false);
  const [activeDraft, setActiveDraft] = useState(null);
  const [showSaveMessage, setShowSaveMessage] =
    useState(false);
  const [deliveries, setDeliveries] = useState([]);

  const translateY = useRef(
    new Animated.Value(height)
  ).current;

  const lastOpenedDraftId = useRef(null);

  // Open specific draft if requested from Drafts screen
  useEffect(() => {
    if (params?.openDraftId && params.openDraftId !== lastOpenedDraftId.current) {
      lastOpenedDraftId.current = params.openDraftId;
      getDraftById(params.openDraftId).then((draft) => {
        if (draft) {
          setActiveDraft(draft);
          setShowSheet(true);
        }
      });
    }
  }, [params?.openDraftId]);

  const loadDeliveries = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const requests = await getMyDeliveryRequests();
      setDeliveries(requests.map(formatDeliveryRequest));
    } catch (error) {
      if (error.message?.toLowerCase().includes("unauthenticated")) {
        await logout();
        router.replace("/login-page");
        return;
      }
      console.log("CUSTOMER DELIVERY SYNC ERROR:", error.message);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      (async () => {
        const token = await getToken();
        if (!token) {
          if (isMounted) router.replace("/login-page");
          return;
        }
        if (isMounted) {
          await loadDeliveries();
        }
      })();

      const interval = setInterval(async () => {
        const token = await getToken();
        if (token) {
          loadDeliveries();
        }
      }, 10000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [loadDeliveries, router])
  );

  const activeDelivery = deliveries.find(isActiveDelivery) || null;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: showSheet ? 0 : height,
      duration: showSheet ? 300 : 250,
      useNativeDriver: true,
    }).start();
  }, [showSheet, translateY]);

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* HEADER */}
        <AppHeader
          icon="document-text-outline"
          iconSize={30}
        />

        {/* BODY */}
        <ScrollView
          style={[styles.body, { backgroundColor: colors.bg }]}
          contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.bg }]}
          showsVerticalScrollIndicator={false}
        >
          {/* REQUEST DELIVERY */}
          <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <Text style={[styles.requestHeader, { color: colors.text }]}>
              Request Delivery!
            </Text>

            <Text style={[styles.requestSubheader, { color: colors.textMuted }]}>
              Schedule a delivery quick and easy.
            </Text>

            <View style={[styles.divider, { backgroundColor: colors.divider }]} />

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
                Schedule Delivery
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
            onPress={() => {
              setActiveDraft(null);
              closeSheet();
            }}
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
              initialDraft={activeDraft}
              onClose={() => {
                setActiveDraft(null);
                closeSheet();
              }}
              onDraftSaved={handleDraftSaved}
              onRequestCreated={loadDeliveries}
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