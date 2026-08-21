import {
    StyleSheet,
    View,
    ImageBackground,
    FlatList,
    Text,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import HomeHeader from "../../../components/HomeHeader";
import AssignmentCard from "../../../components/AssignmentCard";
import EmptyAssignment from "../../../components/EmptyAssignment";
import SuccessMessage from "../../../components/SuccessMessage";

import {
    getCurrentUser,
    getMyDeliveries,
} from "../../../services/api";

export default function Home() {
    const [showSuccess, setShowSuccess] = useState(false);

    const [assignments, setAssignments] = useState([]);

    const [loading, setLoading] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    const loadAssignments = async () => {
        try {
            console.log("=================================");
            console.log("LOADING DRIVER ASSIGNMENTS...");
            console.log("=================================");

            setLoading(true);

            /*
             * Get the currently logged-in driver.
             *
             * The user was already saved during login,
             * so this should return:
             *
             * {
             *   user_id: 3,
             *   full_name: "Alec Jude Jaraula",
             *   role: {
             *      role_id: 3,
             *      role_name: "Driver"
             *   }
             * }
             */
            const user = await getCurrentUser();

            console.log("CURRENT USER:", user);

            /*
             * Get deliveries assigned to the driver.
             */
            const deliveries = await getMyDeliveries();

            console.log(
                "MY DELIVERIES:",
                deliveries
            );

            /*
             * Make sure we always have an array.
             */
            const deliveryList = Array.isArray(deliveries)
                ? deliveries
                : [];

            /*
             * Convert backend delivery data into
             * the format expected by AssignmentCard.
             */
            const formattedAssignments =
                deliveryList.map((delivery) => {
                    const request = delivery?.request;

                    return {
                        id: String(
                            delivery?.delivery_id
                        ),

                        deliveryId:
                            delivery?.delivery_id,

                        /*
                         * Driver name
                         */
                        driver:
                            delivery?.driver?.user
                                ?.full_name ||
                            user?.full_name ||
                            "Driver",

                        /*
                         * Cargo / item
                         */
                        item:
                            request?.cargo_type ||
                            "Cargo",

                        cargo:
                            request?.cargo_type ||
                            "Unknown",

                        /*
                         * Weight
                         */
                        weight:
                            request?.weight != null
                                ? `${request.weight}kg`
                                : "",

                        /*
                         * Pickup -> Dropoff
                         */
                        route:
                            request?.pickup_address &&
                            request?.dropoff_address
                                ? `${request.pickup_address} - ${request.dropoff_address}`
                                : "Route unavailable",

                        /*
                         * Distance
                         */
                        distance:
                            request?.distance_km != null
                                ? `${request.distance_km} km`
                                : "",

                        /*
                         * Delivery status
                         */
                        status:
                            delivery?.status ||
                            "Pending",

                        /*
                         * Keep original backend
                         * delivery object in case
                         * another screen needs it.
                         */
                        delivery: delivery,
                    };
                });

            console.log(
                "FORMATTED ASSIGNMENTS:",
                formattedAssignments
            );

            /*
             * Put assignments into state.
             */
            setAssignments(
                formattedAssignments
            );
        } catch (error) {
            console.log(
                "LOAD ASSIGNMENTS ERROR:",
                error
            );

            /*
             * Important:
             *
             * Even if the backend request fails,
             * stop the loading spinner.
             */
            setAssignments([]);

            Alert.alert(
                "Unable to Load Assignments",
                error?.message ||
                    "Could not connect to the server."
            );
        } finally {
            /*
             * ALWAYS stop loading.
             *
             * This prevents the screen from being
             * stuck forever on:
             *
             * Loading assignments...
             */
            setLoading(false);
        }
    };

    /*
     * Reload assignments whenever the Home
     * screen becomes active.
     */
    useFocusEffect(
        useCallback(() => {
            loadAssignments();
        }, [])
    );

    /*
     * Pull-to-refresh
     */
    const handleRefresh = async () => {
        try {
            setRefreshing(true);

            await loadAssignments();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* =========================
                HOME HEADER
            ========================= */}

            <HomeHeader />

            {/* =========================
                SUCCESS MESSAGE
            ========================= */}

            {showSuccess && (
                <SuccessMessage
                    onHide={() =>
                        setShowSuccess(false)
                    }
                />
            )}

            {/* =========================
                ASSIGNMENTS HEADER
            ========================= */}

            <View
                style={
                    styles.assignmentHeader
                }
            >
                <Ionicons
                    name="document-text"
                    size={28}
                    color="#F24848"
                />

                <Text
                    style={
                        styles.assignmentTitle
                    }
                >
                    Assignments
                </Text>
            </View>

            {/* =========================
                ASSIGNMENTS BODY
            ========================= */}

            <ImageBackground
                source={require("../../../assets/images/truckbg.png")}
                style={styles.body}
                imageStyle={styles.image}
            >
                {/* Background overlay */}
                <View
                    style={styles.overlay}
                />

                {/* =========================
                    LOADING
                ========================= */}

                {loading ? (
                    <View
                        style={
                            styles.loadingContainer
                        }
                    >
                        <ActivityIndicator
                            size="large"
                            color="#F24848"
                        />

                        <Text
                            style={
                                styles.loadingText
                            }
                        >
                            Loading assignments...
                        </Text>
                    </View>
                ) : (
                    /* =========================
                       ASSIGNMENT LIST
                    ========================= */

                    <FlatList
                        data={assignments}

                        keyExtractor={(item) =>
                            String(item.id)
                        }

                        renderItem={({ item }) => (
                            <AssignmentCard
                                assignment={item}
                            />
                        )}

                        ListEmptyComponent={
                            <EmptyAssignment />
                        }

                        contentContainerStyle={
                            styles.list
                        }

                        showsVerticalScrollIndicator={
                            false
                        }

                        refreshControl={
                            <RefreshControl
                                refreshing={
                                    refreshing
                                }
                                onRefresh={
                                    handleRefresh
                                }
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
        backgroundColor: "#FFFFFF",
    },

    assignmentHeader: {
        flexDirection: "row",
        alignItems: "center",

        backgroundColor: "#F5F5F5",

        paddingHorizontal: 20,
        paddingVertical: 14,

        borderBottomWidth: 1,
        borderBottomColor: "#E8E8E8",
    },

    assignmentTitle: {
        fontSize: 24,
        fontWeight: "700",

        color: "#F24848",

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

        backgroundColor:
            "rgba(236,238,245,0.88)",
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

        color: "#555",

        fontSize: 15,
    },
});