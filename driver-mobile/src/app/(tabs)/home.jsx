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
import { useState, useCallback, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import HomeHeader from "../../../components/HomeHeader";
import AssignmentCard from "../../../components/AssignmentCard";
import EmptyAssignment from "../../../components/EmptyAssignment";
import SuccessMessage from "../../../components/SuccessMessage";
import { getSavedUser, getMyDeliveries } from "../../../services/api";

export default function Home() {
    const [showSuccess, setShowSuccess] = useState(false);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadAssignments = useCallback(async (isRefresh = false, isSilent = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else if (!isSilent) {
                setLoading(true);
            }

            const [savedUser, deliveries] = await Promise.all([
                getSavedUser(),
                getMyDeliveries().catch(() => []),
            ]);

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
                    item: request?.cargo_type || "Cargo",
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
            loadAssignments(false, assignments.length > 0);
        }, [loadAssignments, assignments.length])
    );

    // Auto-reload assignments in real time every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            loadAssignments(false, true);
        }, 5000);
        return () => clearInterval(interval);
    }, [loadAssignments]);

    const handleRefresh = async () => {
        await loadAssignments(true, false);
    };

    return (
        <View style={styles.container}>
            <HomeHeader />

            {showSuccess && (
                <SuccessMessage onHide={() => setShowSuccess(false)} />
            )}

            <View style={styles.assignmentHeader}>
                <Ionicons name="document-text" size={28} color="#F24848" />
                <Text style={styles.assignmentTitle}>Assignments</Text>
            </View>

            <ImageBackground
                source={require("../../../assets/images/truckbg.png")}
                style={styles.body}
                imageStyle={styles.image}
            >
                <View style={styles.overlay} />

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#F24848" />
                        <Text style={styles.loadingText}>
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
                                tintColor="#F24848"
                                colors={["#F24848"]}
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
        backgroundColor: "rgba(236,238,245,0.88)",
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