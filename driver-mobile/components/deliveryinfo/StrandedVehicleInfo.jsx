import React from "react";
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Linking,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function StrandedVehicleInfo({ delivery }) {
    if (!delivery?.is_relief || !delivery?.cargo_loaded) {
        return null;
    }

    const breakdownAddress =
        delivery?.relief_origin_address ||
        "Breakdown location not specified";

    const strandedVehicle = delivery?.stranded_vehicle || delivery?.strandedVehicle;
    const vehicleBrand = strandedVehicle?.brand || "";
    const vehicleModelName = strandedVehicle?.model || "";
    const vehicleModel =
        vehicleBrand && vehicleModelName
            ? `${vehicleBrand} ${vehicleModelName}`
            : vehicleModelName ||
              vehicleBrand ||
              strandedVehicle?.vehicle_name ||
              "Disabled Vehicle";
    const plateNumber =
        strandedVehicle?.plate_number ||
        strandedVehicle?.plateNumber ||
        "No Plate";

    const strandedDriver = delivery?.stranded_driver || delivery?.strandedDriver;
    const driverUser = strandedDriver?.user;
    const driverName =
        driverUser?.full_name ||
        driverUser?.name ||
        strandedDriver?.full_name ||
        strandedDriver?.driver_name ||
        "Stranded Driver";
    const driverPhone =
        driverUser?.phone ||
        driverUser?.contact_number ||
        strandedDriver?.contact_number ||
        strandedDriver?.phone ||
        "Not provided";

    const handleCallDriver = () => {
        if (driverPhone && driverPhone !== "Not provided") {
            Linking.openURL(`tel:${driverPhone}`);
        }
    };

    return (
        <View style={styles.card}>
            {/* Header row */}
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <Ionicons
                        name="alert-circle"
                        size={18}
                        color="#F24848"
                    />
                    <Text style={styles.headerTitle}>
                        Disabled Vehicle &amp; Stranded Driver
                    </Text>
                </View>
                <View style={styles.reliefPill}>
                    <Text style={styles.reliefPillText}>
                        Relief
                    </Text>
                </View>
            </View>

            {/* Breakdown Location */}
            <Text style={styles.sectionHeading}>
                Breakdown / Pick-up Point:
            </Text>
            <Text style={styles.locationText}>
                {breakdownAddress}
            </Text>

            <View style={styles.divider} />

            {/* Vehicle Details */}
            <Text style={styles.detailRow}>
                <Text style={styles.bold}>Disabled Vehicle:</Text>{" "}
                {vehicleModel} ({plateNumber})
            </Text>

            {/* Driver Details */}
            <Text style={styles.detailRow}>
                <Text style={styles.bold}>Stranded Driver:</Text>{" "}
                {driverName}
            </Text>

            {/* Contact Details with Call Option */}
            <View style={styles.contactRow}>
                <Text style={styles.detailRow}>
                    <Text style={styles.bold}>Driver Contact:</Text>{" "}
                    {driverPhone}
                </Text>
                {driverPhone !== "Not provided" && (
                    <TouchableOpacity
                        style={styles.callButton}
                        onPress={handleCallDriver}
                        activeOpacity={0.8}
                    >
                        <Ionicons
                            name="call"
                            size={13}
                            color="#FFFFFF"
                        />
                        <Text style={styles.callButtonText}>
                            Call
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: "#F4F5FC",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: "#FCD34D",
    },

    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
    },

    headerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },

    headerTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: "#991B1B",
    },

    reliefPill: {
        backgroundColor: "#FEF3C7",
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: "#FCD34D",
    },

    reliefPillText: {
        fontSize: 11,
        fontWeight: "700",
        color: "#92400E",
    },

    sectionHeading: {
        fontSize: 12,
        fontWeight: "600",
        color: "#555",
        marginTop: 2,
    },

    locationText: {
        fontSize: 14,
        fontWeight: "700",
        color: "#282932",
        marginTop: 2,
        lineHeight: 19,
    },

    divider: {
        height: 1,
        backgroundColor: "#E2E4F0",
        marginVertical: 8,
    },

    detailRow: {
        fontSize: 13,
        color: "#30313A",
        marginBottom: 4,
    },

    bold: {
        fontWeight: "700",
        color: "#282932",
    },

    contactRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 2,
    },

    callButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        backgroundColor: "#16A34A",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },

    callButtonText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "700",
    },
});
