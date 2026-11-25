import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import ActiveDeliveryCard from "../../components/ActiveDeliveryCard";
import AppHeader from "../../components/AppHeader";
import NoActiveDeliveryCard from "../../components/NoActiveDeliveryCard";
import RequestSheet from "../../components/RequestSheet";
import SaveMessage from "../../components/SaveMessage";
import { ActiveDeliveryCardSkeleton } from "../../components/SkeletonLoader";
import { getMyDeliveryRequests, getMyRewardStatus, getToken, logout } from "../../services/api";
import { formatDeliveryRequest, isActiveDelivery } from "../../services/deliveries";
import { getDraftById } from "../../services/drafts";
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");

const Home = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  const [showSheet, setShowSheet] = useState(false);
  const [activeDraft, setActiveDraft] = useState(null);
  const [showSaveMessage, setShowSaveMessage] =
    useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [vipReward, setVipReward] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      const [requests, rewardRes] = await Promise.all([
        getMyDeliveryRequests(),
        getMyRewardStatus().catch(() => null),
      ]);
      setDeliveries(requests.map(formatDeliveryRequest));
      if (rewardRes?.customer_vip) {
        setVipReward(rewardRes.customer_vip);
      }
    } catch (error) {
      if (error.message?.toLowerCase().includes("unauthenticated")) {
        await logout();
        router.replace("/login-page");
        return;
      }
      console.log("CUSTOMER DELIVERY SYNC ERROR:", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadDeliveries();
  }, [loadDeliveries]);

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

  const activeDeliveries = deliveries.filter(isActiveDelivery);
  const visibleActiveDeliveries = activeDeliveries.slice(0, 3);
  const hasMoreActiveDeliveries = activeDeliveries.length > 3;

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
    router.push({ pathname: "/deliveries", params: { tab: "active" } });
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
        <View
          style={[
            styles.body,
            styles.bodyContent,
            {
              backgroundColor: colors.bg,
              paddingBottom: 60 + insets.bottom + 12,
            },
          ]}
        >
          {/* REQUEST DELIVERY */}
          <View style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <Text style={[styles.requestHeader, { color: colors.text }]}>
              Request Delivery!
            </Text>

            <Text style={[styles.requestSubheader, { color: colors.textMuted }]}>
              Schedule a delivery quick and easy.
            </Text>

            {vipReward?.is_vip && (
              <View style={styles.vipHomeRow}>
                <View style={styles.vipBadgePill}>
                  <Ionicons name="ribbon" size={13} color="#92400E" />
                  <Text style={styles.vipBadgeText}>VIP • Rank #{vipReward.rank}</Text>
                </View>
                <View
                  style={[
                    styles.voucherStatusPill,
                    vipReward.available_this_month ? styles.voucherReadyPill : styles.voucherUsedPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.voucherStatusText,
                      vipReward.available_this_month ? styles.voucherReadyText : styles.voucherUsedText,
                    ]}
                  >
                    {vipReward.available_this_month
                      ? `₱${vipReward.voucher_amount} Off Voucher Ready (Min. ₱${Number(vipReward.min_trip_amount || 1500).toLocaleString("en-PH")})`
                      : `₱${vipReward.voucher_amount} Monthly Voucher Used`}
                  </Text>
                </View>
              </View>
            )}

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

          {/* ACTIVE DELIVERIES */}
          {loading && deliveries.length === 0 ? (
            <ActiveDeliveryCardSkeleton />
          ) : activeDeliveries.length > 0 ? (
            <View
              style={[
                styles.activeSectionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  borderWidth: isDark ? 1 : 0,
                },
              ]}
            >
              <View style={styles.activeHeaderRow}>
                <View style={styles.activeTitleRow}>
                  <Text style={styles.activeSectionTitle}>Active Deliveries</Text>
                  <View style={styles.activeCountBadge}>
                    <Text style={styles.activeCountText}>{activeDeliveries.length}</Text>
                  </View>
                </View>
                <Text style={[styles.activeCountSub, { color: colors.textMuted }]}>
                  {activeDeliveries.length === 1 ? "1 ongoing" : `${activeDeliveries.length} ongoing`}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.divider, marginTop: 10, marginBottom: 10 }]} />

              <ScrollView
                style={styles.activeListScroll}
                contentContainerStyle={styles.activeListContent}
                showsVerticalScrollIndicator={true}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={["#E53935"]}
                    tintColor="#E53935"
                  />
                }
              >
                {visibleActiveDeliveries.map((item) => (
                  <ActiveDeliveryCard
                    key={item.id}
                    delivery={item}
                    showHeader={false}
                    onViewDetails={handleViewDelivery}
                  />
                ))}
              </ScrollView>

              {hasMoreActiveDeliveries && (
                <TouchableOpacity
                  style={[
                    styles.seeMoreBtn,
                    {
                      backgroundColor: isDark ? colors.accentSoft : "#FEF2F2",
                      borderColor: isDark ? colors.danger : "#FECACA",
                    },
                  ]}
                  onPress={handleViewDelivery}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.seeMoreText, { color: isDark ? "#F87171" : "#DE2226" }]}>
                    See more ({activeDeliveries.length - 3} more)
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={isDark ? "#F87171" : "#DE2226"}
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <NoActiveDeliveryCard />
          )}
        </View>

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
              vipReward={vipReward}
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

  bodyContent: {
    paddingHorizontal: width * 0.04,
    paddingTop: width * 0.04,
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

  activeSectionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    paddingHorizontal: width * 0.04,
    paddingTop: width * 0.04,
    paddingBottom: width * 0.035,
    marginTop: height * 0.016,
  },

  activeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  activeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  activeSectionTitle: {
    color: "#DE2226",
    fontSize: width * 0.06,
    fontWeight: "900",
  },

  activeCountBadge: {
    backgroundColor: "#DE2226",
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  activeCountText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  activeCountSub: {
    fontSize: 12,
    fontWeight: "600",
  },

  activeListScroll: {
    flex: 1,
  },

  activeListContent: {
    paddingBottom: 4,
  },

  seeMoreBtn: {
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  seeMoreText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  vipHomeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  vipBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  vipBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#92400E",
  },
  voucherStatusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  voucherReadyPill: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  voucherUsedPill: {
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
  },
  voucherStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  voucherReadyText: {
    color: "#047857",
  },
  voucherUsedText: {
    color: "#64748B",
  },
});