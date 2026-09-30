import React, { useState } from "react";
import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useTheme } from "../src/context/ThemeContext";
import { resolveAvatarUrl } from "../services/api";

const defaultAvatar = require("../assets/images/defaultavatar.png");

export default function AssignmentCard({ assignment }) {
    const { theme, darkMode } = useTheme();
    const [imgError, setImgError] = useState(false);
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

    const isRelief = Boolean(delivery?.is_relief);
    const cargoLoaded = Boolean(delivery?.cargo_loaded);

    const pickupAddress =
        isRelief && cargoLoaded && delivery?.relief_origin_address
            ? delivery.relief_origin_address
            : request?.pickup_address || "";

    const dropoffAddress =
        request?.dropoff_address || "";

    const shortPickup =
        getShortPickupAddress(pickupAddress);

    const shortDropoff =
        getShortDropoffAddress(dropoffAddress);

    const status = delivery?.status || assignment?.status;
    const isAcceptedOrActive = [
        "accepted",
        "arrived_pickup",
        "loading_cargo",
        "out_for_delivery",
        "arrived_dropoff",
        "unloading_cargo",
    ].includes(status);

    // ---------------------------------------------------------
    // ACTION HANDLER (View Details vs Continue Delivery)
    // ---------------------------------------------------------

    const handleAction = () => {
        const deliveryId = String(
            assignment?.deliveryId || delivery?.delivery_id || ""
        );
        if (!deliveryId) return;

        if (isAcceptedOrActive) {
            const hasPreTrip = delivery?.checklists?.some(
                (e) => e.type === "pre_trip"
            );
            if (hasPreTrip || (status && !["assigned", "pending"].includes(status))) {
                router.push({
                    pathname: "/navigation",
                    params: { deliveryId },
                });
            } else {
                router.push({
                    pathname: "/pretripcheck",
                    params: { deliveryId },
                });
            }
        } else {
            router.push({
                pathname: "/deliverydetails",
                params: { deliveryId },
            });
        }
    };

    const customerPhoto = !imgError && (customer?.profile_photo_url || customer?.profile_photo_path)
        ? resolveAvatarUrl(customer.profile_photo_url || customer.profile_photo_path)
        : null;

    return (
        <View style={[
            styles.card,
            {
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: darkMode ? 1 : 0,
            }
        ]}>

            {/* RELIEF REASSIGNMENT BADGE */}
            {isRelief && (
                <View style={[
                    styles.reliefBadge,
                    darkMode
                        ? (cargoLoaded ? { backgroundColor: "#451a03", borderColor: "#78350f" } : { backgroundColor: "#1e293b", borderColor: "#334155" })
                        : (!cargoLoaded && { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" })
                ]}>
                    <Ionicons
                        name={cargoLoaded ? "warning" : "information-circle"}
                        size={13}
                        color={cargoLoaded ? (darkMode ? "#FCD34D" : "#92400E") : (darkMode ? "#60A5FA" : "#1D4ED8")}
                    />
                    <Text style={[
                        styles.reliefBadgeText,
                        darkMode
                            ? { color: cargoLoaded ? "#FCD34D" : "#93C5FD" }
                            : (!cargoLoaded && { color: "#1D4ED8" })
                    ]}>
                        {cargoLoaded
                            ? "Relief Reassignment (Transshipment)"
                            : "Reassigned Delivery (Direct Pick-up)"}
                    </Text>
                </View>
            )}

            {/* CUSTOMER INFORMATION */}
            <View style={styles.topRow}>
                <Image
                    source={
                        customerPhoto
                            ? {
                                  uri: customerPhoto,
                                  headers: { "ngrok-skip-browser-warning": "true" },
                              }
                            : defaultAvatar
                    }
                    style={styles.avatar}
                    onError={() => setImgError(true)}
                />

                <View style={styles.customerContainer}>
                    <Text
                        style={[styles.customerName, { color: theme.primary }]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {getCustomerName()}
                    </Text>

                    <Text style={[styles.info, { color: theme.secondaryText }]}>
                        Itemname:{" "}
                        {request?.item_name || assignment?.item || "Not provided"}
                    </Text>

                    <Text style={[styles.info, { color: theme.secondaryText }]}>
                        Cargotype:{" "}
                        {request?.cargo_type || assignment?.cargo || "Not provided"}
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
                    style={[styles.location, { color: theme.secondaryText }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    <Text style={[styles.routeLabel, { color: theme.text }]}>
                        Delivery Route:{" "}
                    </Text>

                    {shortPickup} → {shortDropoff}
                </Text>

                <Text style={[styles.distance, { color: theme.secondaryText }]}>
                    {assignment?.distance || ""}
                </Text>
            </View>

            {/* DIVIDER */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* ACTION BUTTON */}
            <View style={styles.buttonRow}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: theme.primary }]}
                    onPress={handleAction}
                    activeOpacity={0.8}
                >
                    <Ionicons
                        name={isAcceptedOrActive ? "navigate-circle" : "document-text-outline"}
                        size={18}
                        color="#FFF"
                        style={{ marginRight: 6 }}
                    />
                    <Text style={styles.actionText}>
                        {isAcceptedOrActive ? "Continue Delivery" : "View Details"}
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

    reliefBadge: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FEF3C7",
        borderWidth: 1,
        borderColor: "#FCD34D",
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 8,
        marginBottom: 10,
        gap: 6,
    },

    reliefBadgeText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#92400E",
    },

    topRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
    },

    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: "#E2E4EE",
    },

    customerContainer: {
        flex: 1,
    },

    customerName: {
        color: "#F24848",
        fontSize: 20,
        fontWeight: "700",
    },

    info: {
        color: "#464646",
        fontSize: 13,
        marginTop: 2,
    },

    locationRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
    },

    location: {
        flex: 1,
        color: "#333",
        fontSize: 13,
        fontWeight: "600",
        marginLeft: 6,
    },

    routeLabel: {
        fontWeight: "700",
        color: "#1F2937",
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
        marginTop: 4,
    },

    actionButton: {
        backgroundColor: "#F24848",
        width: "100%",
        paddingVertical: 12,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },

    actionText: {
        color: "#FFF",
        fontWeight: "700",
        fontSize: 15,
    },
});
