import {
    StyleSheet,
    View,
    ImageBackground,
    FlatList,
    Text,
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
    getMyDeliveries,
    getDelivery,
    getActiveAcceptedDeliveryId,
    setActiveAcceptedDeliveryId,
    clearActiveAcceptedDeliveryId,
} from "../../../services/api";

export default function Home() {
    const { theme, darkMode } = useTheme();
    const [showSuccess, setShowSuccess] = useState(false);
    const [assignments, setAssignments] = useState([]);
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

            const [savedUser, deliveries, savedActiveId] = await Promise.all([
                getSavedUser(),
                getMyDeliveries().catch(() => []),
                getActiveAcceptedDeliveryId().catch(() => null),
            ]);

            const activeInProgress = Array.isArray(deliveries)
                ? deliveries.find((d) =>
                      [
                          "accepted",
                          "arrived_pickup",
                          "loading_cargo",
                          "out_for_delivery",
                          "arrived_dropoff",
                          "unloading_cargo",
                      ].includes(d?.status)
                  )
                : null;

            const activeJob =
                activeInProgress ||
                (savedActiveId && Array.isArray(deliveries)
                    ? deliveries.find(
                          (d) =>
                              String(d?.delivery_id) === String(savedActiveId) &&
                              !["completed", "rejected"].includes(d?.status)
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
                          !["completed", "rejected"].includes(delivery?.status)
                  )
                : [];

            const formattedAssignments = deliveryList.map((delivery) => {
                const request = delivery?.request;
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
});