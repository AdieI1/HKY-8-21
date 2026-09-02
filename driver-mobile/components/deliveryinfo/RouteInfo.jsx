import React from "react";
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";

export default function RouteInfo({ delivery }) {
    const request = delivery?.request;

    // Pickup address from backend
    const pickupAddress =
        request?.pickup_address ||
        request?.pickup_location ||
        request?.pickup ||
        "Pickup address not provided";

    // Drop-off address from backend
    const dropoffAddress =
        request?.dropoff_address ||
        request?.dropoff_location ||
        request?.dropoff ||
        "Drop-off address not provided";

    // Distance from backend
    const distance =
        request?.distance_km !== null &&
        request?.distance_km !== undefined &&
        request?.distance_km !== ""
            ? `${request.distance_km} kilometers`
            : "Distance not provided";

    const handleAcceptAssignment = () => {
        router.push({
            pathname: "/pretripcheck",
            params: {
                deliveryId: String(
                    delivery?.delivery_id || ""
                ),
            },
        });
    };

    return (
        <View style={styles.card}>

            {/* Header */}
            <View style={styles.titleRow}>
                <Ionicons
                    name="location"
                    size={22}
                    color="#F24848"
                />

                <Text style={styles.title}>
                    Delivery Route
                </Text>
            </View>

            <View style={styles.divider} />

            {/* Pickup */}
            <Text style={styles.routeText}>
                <Text style={styles.bullet}>
                    •{" "}
                </Text>

                <Text style={styles.label}>
                    Pick-up:
                </Text>{" "}

                {pickupAddress}
            </Text>

            {/* Drop-off */}
            <Text style={styles.routeText}>
                <Text style={styles.bullet}>
                    •{" "}
                </Text>

                <Text style={styles.label}>
                    Drop-off:
                </Text>{" "}

                {dropoffAddress}
            </Text>

            {/* Distance */}
            <Text style={styles.routeText}>
                <Text style={styles.bullet}>
                    •{" "}
                </Text>

                <Text style={styles.label}>
                    Distance:
                </Text>{" "}

                {distance}
            </Text>

            {/* Accept Assignment */}
            <TouchableOpacity
                style={styles.acceptButton}
                onPress={handleAcceptAssignment}
                activeOpacity={0.8}
            >
                <Text style={styles.acceptText}>
                    Accept Assignment
                </Text>
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#F4F5FC",
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
    },

    titleRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    title: {
        fontSize: 21,
        fontWeight: "700",
        color: "#282932",
        marginLeft: 5,
    },

    divider: {
        height: 1,
        backgroundColor: "#C8C9D0",
        marginVertical: 8,
    },

    routeText: {
        fontSize: 14,
        color: "#34353D",
        lineHeight: 20,
        marginBottom: 5,
    },

    bullet: {
        color: "#F24848",
        fontWeight: "700",
    },

    label: {
        color: "#F24848",
        fontWeight: "700",
    },

    acceptButton: {
        backgroundColor: "#F24848",
        borderRadius: 11,
        height: 50,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 25,
        elevation: 3,
    },

    acceptText: {
        color: "#FFFFFF",
        fontSize: 20,
        fontWeight: "700",
    },
});
