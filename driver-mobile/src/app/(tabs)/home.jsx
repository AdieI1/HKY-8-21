import {
    StyleSheet,
    View,
    ImageBackground,
    FlatList,
    Text,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, useCallback, useEffect, useRef } from "react";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import HomeHeader from "../../../components/HomeHeader";
import AssignmentCard from "../../../components/AssignmentCard";
import EmptyAssignment from "../../../components/EmptyAssignment";
import SuccessMessage from "../../../components/SuccessMessage";
import { useTheme } from "../../context/ThemeContext";
import {
    getSavedUser,
    getCurrentUser,
    getMyDeliveries,
    getMyRewardStatus,
    setDriverDutyStatus,
    getDelivery,
    getActiveAcceptedDeliveryId,
    setActiveAcceptedDeliveryId,
    clearActiveAcceptedDeliveryId,
} from "../../../services/api";

export default function Home() {
    const { theme, darkMode } = useTheme();
    const [showSuccess, setShowSuccess] = useState(false);
    const [assignments, setAssignments] = useState([]);
    const [driverReward, setDriverReward] = useState(null);
    const [dutyStatus, setDutyStatus] = useState("off_duty");
    const [updatingDuty, setUpdatingDuty] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const isFocused = useIsFocused();
    const isFocusedRef = useRef(isFocused);
    isFocusedRef.current = isFocused;

    const loadAssignments = useCallback(async (isRefresh = false, isSilent = false, allowRedirect = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else if (!isSilent) {
                setLoading(true);
            }

            const [savedUser, freshUser, deliveries, savedActiveId, rewardRes] = await Promise.all([
                getSavedUser(),
                getCurrentUser().catch(() => null),
                getMyDeliveries().catch(() => []),
                getActiveAcceptedDeliveryId().catch(() => null),
                getMyRewardStatus().catch(() => null),
            ]);
            const resolvedDriverStatus =
                freshUser?.driver?.availability_status ||
                savedUser?.driver?.availability_status ||
                "off_duty";
            setDutyStatus(resolvedDriverStatus);
            if (rewardRes?.driver_reward) {
                setDriverReward(rewardRes.driver_reward);
            }

            const activeInProgress = Array.isArray(deliveries)
                ? deliveries.find(
                      (d) =>
                          [
                              "accepted",
                              "arrived_pickup",
                              "loading_cargo",
                              "out_for_delivery",
                              "arrived_dropoff",
                              "unloading_cargo",
                          ].includes(d?.status) ||
                          (d?.status === "returning_to_hq" && !d?.hq_arrived_at)
                  )
                : null;

            const activeJob =
                activeInProgress ||
                (savedActiveId && Array.isArray(deliveries)
                    ? deliveries.find(
                          (d) =>
                              String(d?.delivery_id) === String(savedActiveId) &&
                              !(
                                  ["completed", "rejected"].includes(d?.status) ||
                                  (d?.status === "returning_to_hq" && Boolean(d?.hq_arrived_at))
                              )
                      )
                    : null);

            if (activeJob) {
                await setActiveAcceptedDeliveryId(activeJob.delivery_id);
            }

            if (activeJob && allowRedirect && isFocusedRef.current) {
                const hasPreTrip = activeJob?.checklists?.some(
                    (e) => e.type === "pre_trip"
                );
                const hasAdvanced =
                    activeJob?.status &&
                    !["assigned", "pending"].includes(activeJob.status);

                if (hasPreTrip || hasAdvanced) {
                    router.replace({
                        pathname: "/navigation",
                        params: { deliveryId: String(activeJob.delivery_id) },
                    });
                    return;
                } else {
                    router.replace({
                        pathname: "/pretripcheck",
                        params: { deliveryId: String(activeJob.delivery_id) },
                    });
                    return;
                }
            }

            const deliveryList = Array.isArray(deliveries)
                ? deliveries.filter(
                      (delivery) =>
                          !(
                              ["completed", "rejected"].includes(delivery?.status) ||
                              (delivery?.status === "returning_to_hq" && Boolean(delivery?.hq_arrived_at))
                          )
                  )
                : [];

            const formattedAssignments = deliveryList.map((delivery) => {
                const request = delivery?.request;
                const hasPreTrip = Array.isArray(delivery?.checklists)
                    && delivery.checklists.some((c) => c?.type === "pre_trip");
                const isSavedAccepted =
                    savedActiveId != null &&
                    String(delivery?.delivery_id) === String(savedActiveId);
                return {
                    id: String(delivery?.delivery_id),
                    deliveryId: delivery?.delivery_id,
                    driver:
                        delivery?.driver?.user?.full_name ||
                        savedUser?.full_name ||
                        "Driver",
                    item:
                        request?.item_name ||
                        request?.cargo_name ||
                        request?.cargo_type ||
                        "Cargo",
                    cargo: request?.cargo_type || "Unknown",
                    weight: request?.weight != null ? `${request.weight}kg` : "",
                    route:
                        request?.pickup_address && request?.dropoff_address
                            ? `${request.pickup_address} - ${request.dropoff_address}`
                            : "Route unavailable",
                    distance:
                        request?.distance_km != null
                            ? `${request.distance_km} km`
                            : "",
                    status: delivery?.status || "Pending",
                    isAccepted: isSavedAccepted || hasPreTrip,
                    delivery: delivery,
                };
            });

            setAssignments(formattedAssignments);
        } catch (error) {
            console.log("LOAD ASSIGNMENTS ERROR:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadAssignments(false, assignments.length > 0, false);
        }, [loadAssignments, assignments.length])
    );

    // Auto-reload assignments in real time every 5 seconds (data only, no redirect)
    useEffect(() => {
        const interval = setInterval(() => {
            loadAssignments(false, true, false);
        }, 5000);
        return () => clearInterval(interval);
    }, [loadAssignments]);

    const handleRefresh = async () => {
        await loadAssignments(true, false, true);
    };

    const handleToggleDuty = async (nextStatus) => {
        try {
            setUpdatingDuty(true);
            const res = await setDriverDutyStatus(nextStatus);
            setDutyStatus(res?.driver?.availability_status || nextStatus);
        } catch (err) {
            Alert.alert("Duty Status", err?.message || "Could not update duty status.");
        } finally {
            setUpdatingDuty(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <HomeHeader />

            {showSuccess && (
                <SuccessMessage onHide={() => setShowSuccess(false)} />
            )}

            <View style={[
                styles.assignmentHeader,
                {
                    backgroundColor: theme.card,
                    borderBottomColor: theme.border,
                }
            ]}>
                <Ionicons name="document-text" size={26} color={theme.primary} />
                <Text style={[styles.assignmentTitle, { color: theme.primary }]}>Assignments</Text>
            </View>

            <View style={[
                styles.dutyBar,
                dutyStatus === "available"
                    ? styles.dutyBarOn
                    : dutyStatus === "on_leave" || dutyStatus === "pending_leave"
                    ? styles.dutyBarLeave
                    : styles.dutyBarOff,
            ]}>
                <View style={styles.dutyStatusLeft}>
                    <Ionicons
                        name={
                            dutyStatus === "available"
                                ? "radio-button-on"
                                : dutyStatus === "on_leave" || dutyStatus === "pending_leave"
                                ? "medkit"
                                : dutyStatus === "busy"
                                ? "car"
                                : "moon"
                        }
                        size={16}
                        color={
                            dutyStatus === "available"
                                ? "#047857"
                                : dutyStatus === "on_leave" || dutyStatus === "pending_leave"
                                ? "#B91C1C"
                                : dutyStatus === "busy"
                                ? "#1D4ED8"
                                : "#475569"
                        }
                    />
                    <Text style={styles.dutyStatusText}>
                        {dutyStatus === "available"
                            ? "On Duty • Ready for Dispatch"
                            : dutyStatus === "on_leave"
                            ? "On Approved Leave"
                            : dutyStatus === "pending_leave"
                            ? "Leave Pending Review"
                            : dutyStatus === "busy"
                            ? "On Active Delivery"
                            : "Off Duty (Hidden from Dispatch)"}
                    </Text>
                </View>

                {!["on_leave", "pending_leave", "busy", "offline"].includes(dutyStatus) && (
                    <TouchableOpacity
                        style={[
                            styles.dutyToggleBtn,
                            dutyStatus === "available" ? styles.dutyEndBtn : styles.dutyStartBtn,
                        ]}
                        disabled={updatingDuty}
                        onPress={() => handleToggleDuty(dutyStatus === "available" ? "off_duty" : "available")}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.dutyToggleText}>
                            {updatingDuty
                                ? "..."
                                : dutyStatus === "available"
                                ? "Go Off Duty"
                                : "Go On Duty"}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {driverReward?.is_top_driver && (
                <View style={styles.rewardBanner}>
                    <View style={styles.rewardBadgePill}>
                        <Ionicons name="trophy" size={14} color="#92400E" />
                        <Text style={styles.rewardBadgeText}>#1 Top Driver</Text>
                    </View>
                    <Text style={styles.rewardBonusText}>
                        ₱{Number(driverReward.bonus_amount || 1000).toLocaleString("en-PH")} Performance Bonus
                    </Text>
                </View>
            )}

            <ImageBackground
                source={require("../../../assets/images/truckbg.png")}
                style={styles.body}
                imageStyle={styles.image}
            >
                <View style={[
                    styles.overlay,
                    {
                        backgroundColor: darkMode
                            ? "rgba(28,29,35,0.92)"
                            : "rgba(236,238,245,0.88)"
                    }
                ]} />

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
                            Loading assignments...
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={assignments}
                        keyExtractor={(item) => String(item.id)}
                        renderItem={({ item }) => (
                            <AssignmentCard assignment={item} />
                        )}
                        ListEmptyComponent={<EmptyAssignment />}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                tintColor={theme.primary}
                                colors={[theme.primary]}
                            />
                        }
                    />
                )}
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    assignmentHeader: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    assignmentTitle: {
        fontSize: 22,
        fontWeight: "700",
        marginLeft: 10,
    },
    body: {
        flex: 1,
    },
    image: {
        opacity: 0.15,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    list: {
        padding: 16,
        paddingBottom: 120,
        flexGrow: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 12,
        fontSize: 15,
    },
    rewardBanner: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: "#FEF3C7",
        borderBottomWidth: 1,
        borderBottomColor: "#FDE68A",
    },
    rewardBadgePill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: "#FDE68A",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
    },
    rewardBadgeText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#92400E",
    },
    rewardBonusText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: "#047857",
    },
    dutyBar: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: "#E2E8F0",
        gap: 8,
    },
    dutyBarOn: {
        backgroundColor: "#ECFDF5",
    },
    dutyBarOff: {
        backgroundColor: "#F1F5F9",
    },
    dutyBarLeave: {
        backgroundColor: "#FEF2F2",
    },
    dutyStatusLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        flex: 1,
    },
    dutyStatusText: {
        fontSize: 12.5,
        fontWeight: "700",
        color: "#0F172A",
        flexShrink: 1,
    },
    dutyToggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    dutyStartBtn: {
        backgroundColor: "#16A34A",
    },
    dutyEndBtn: {
        backgroundColor: "#64748B",
    },
    dutyToggleText: {
        color: "#FFFFFF",
        fontSize: 11.5,
        fontWeight: "800",
    },
});