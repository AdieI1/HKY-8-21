import React from "react";
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";

export default function AssignmentCard({ assignment }) {
    const delivery = assignment?.delivery;
    const request = delivery?.request;
    const customer = request?.customer;

    // ---------------------------------------------------------
    // CUSTOMER NAME
    // ---------------------------------------------------------

    const getCustomerName = () => {
        if (!customer) {
            return "Customer";
        }

        if (customer.full_name) {
            return customer.full_name;
        }

        if (customer.name) {
            return customer.name;
        }

        if (customer.first_name || customer.last_name) {
            return `${customer.first_name || ""} ${
                customer.last_name || ""
            }`.trim();
        }

        return "Customer";
    };

    // ---------------------------------------------------------
    // SHORT PICKUP ADDRESS
    // ---------------------------------------------------------

    const getShortPickupAddress = (address) => {
        if (!address) {
            return "Pickup";
        }

        const parts = address
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);

        return parts[0] || address;
    };

    // ---------------------------------------------------------
    // SHORT DROP-OFF ADDRESS
    // ---------------------------------------------------------

    const getShortDropoffAddress = (address) => {
        if (!address) {
            return "Drop-off";
        }

        const parts = address
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);

        const provinceIndex = parts.findIndex((part) => {
            const value = part.toLowerCase();

            return (
                value === "bukidnon" ||
                value === "misamis oriental"
            );
        });

        if (provinceIndex > 0) {
            return `${parts[provinceIndex - 1]}, ${parts[provinceIndex]}`;
        }

        // Fallback if province is not found
        if (parts.length >= 2) {
            return parts[0];
        }

        return address;
    };

    // ---------------------------------------------------------
    // GET ADDRESSES FROM BACKEND
    // ---------------------------------------------------------

    const pickupAddress =
        request?.pickup_address || "";

    const dropoffAddress =
        request?.dropoff_address || "";

    const shortPickup =
        getShortPickupAddress(pickupAddress);

    const shortDropoff =
        getShortDropoffAddress(dropoffAddress);

    // ---------------------------------------------------------
    // VIEW DETAILS
    // ---------------------------------------------------------

    const handleViewDetails = () => {
        router.push({
            pathname: "/deliverydetails",
            params: {
                deliveryId: String(
                    assignment?.deliveryId || ""
                ),
            },
        });
    };

    return (
        <View style={styles.card}>

            {/* CUSTOMER INFORMATION */}
            <View style={styles.topRow}>
                <Image
                    source={require("../assets/images/profilepic.png")}
                    style={styles.avatar}
                />

                <View style={styles.customerContainer}>
                    <Text
                        style={styles.customerName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {getCustomerName()}
                    </Text>

                    <Text style={styles.info}>
                        Itemname:{" "}
                        {assignment?.item || "Not provided"}
                    </Text>

                    <Text style={styles.info}>
                        Cargotype:{" "}
                        {assignment?.cargo || "Not provided"}
                    </Text>
                </View>
            </View>

            {/* DELIVERY ROUTE */}
            <View style={styles.locationRow}>
                <Ionicons
                    name="location"
                    size={18}
                    color="#EF4444"
                />

                <Text
                    style={styles.location}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    <Text style={styles.routeLabel}>
                        Delivery Route:{" "}
                    </Text>

                    {shortPickup} → {shortDropoff}
                </Text>

                <Text style={styles.distance}>
                    {assignment?.distance || ""}
                </Text>
            </View>

            {/* DIVIDER */}
            <View style={styles.divider} />

            {/* BUTTONS */}
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={styles.declineButton}
                    activeOpacity={0.8}
                >
                    <Text style={styles.declineText}>
                        Decline
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.viewButton}
                    onPress={handleViewDetails}
                    activeOpacity={0.8}
                >
                    <Text style={styles.viewText}>
                        View Details
                    </Text>
                </TouchableOpacity>
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#F6F8FF",
        borderRadius: 15,
        padding: 14,
        marginBottom: 18,
        elevation: 4,
    },

    topRow: {
        flexDirection: "row",
        marginBottom: 10,
    },

    avatar: {
        width: 45,
        height: 45,
        borderRadius: 25,
        marginRight: 12,
    },

    customerContainer: {
        flex: 1,
    },

    customerName: {
        fontSize: 22,
        fontWeight: "700",
        color: "#F24848",
    },

    info: {
        color: "#444",
        fontSize: 13,
    },

    locationRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    location: {
        flex: 1,
        marginLeft: 5,
        color: "#444",
        fontWeight: "500",
        fontSize: 13,
    },

    routeLabel: {
        fontWeight: "700",
        color: "#444",
    },

    distance: {
        color: "#666",
        fontSize: 12,
        marginLeft: 5,
    },

    divider: {
        height: 1,
        backgroundColor: "#D8D8D8",
        marginVertical: 10,
    },

    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },

    declineButton: {
        backgroundColor: "#5F616E",
        width: "47%",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },

    viewButton: {
        backgroundColor: "#F24848",
        width: "47%",
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: "center",
    },

    declineText: {
        color: "#FFF",
        fontWeight: "600",
    },

    viewText: {
        color: "#FFF",
        fontWeight: "700",
    },
});
