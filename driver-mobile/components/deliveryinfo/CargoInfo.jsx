import React from "react";
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
} from "react-native";

export default function CargoInfo({ delivery }) {
    const request = delivery?.request;
    const vehicle = delivery?.vehicle;

    const itemName =
        request?.item_name ||
        request?.cargo_name ||
        request?.cargo_type ||
        "Not provided";

    const cargoType =
        request?.cargo_type ||
        "Not provided";

    const weight =
        request?.weight !== null &&
        request?.weight !== undefined &&
        request?.weight !== ""
            ? `${request.weight} kg`
            : "Not provided";

    const fragility =
        request?.fragility ||
        request?.fragility_status ||
        null;

    const vehicleName =
        vehicle?.vehicle_name ||
        vehicle?.model ||
        vehicle?.vehicle_model ||
        vehicle?.name ||
        "Vehicle assigned";

    const plateNumber =
        vehicle?.plate_number ||
        vehicle?.plate_no ||
        vehicle?.license_plate ||
        vehicle?.plate ||
        "";

    const vehicleDisplay = plateNumber
        ? `${vehicleName} - ${plateNumber}`
        : vehicleName;

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Cargo Details</Text>

            <View style={styles.divider} />

            <Text style={styles.info}>
                <Text style={styles.bold}>Item Name: </Text>
                {itemName}
            </Text>

            <Text style={styles.info}>
                <Text style={styles.bold}>Type: </Text>
                {cargoType}
            </Text>

            <Text style={styles.info}>
                <Text style={styles.bold}>Weight: </Text>
                {weight}
            </Text>

            {fragility && (
                <Text style={styles.info}>
                    <Text style={styles.bold}>Fragility: </Text>

                    <Text style={styles.fragile}>
                        {fragility}
                    </Text>

                    {String(fragility).toLowerCase() === "fragile" && (
                        <Text style={styles.warning}> ⚠</Text>
                    )}
                </Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.vehicle}>
                <Text style={styles.bold}>
                    Vehicle assigned:{" "}
                </Text>
                {vehicleDisplay}
            </Text>

            <TouchableOpacity
                onPress={() => {
                    // Add your navigation here
                }}
            >
                <Text style={styles.link}>
                    View Vehicle Information
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
        marginBottom: 16,
    },

    title: {
        fontSize: 21,
        fontWeight: "700",
        color: "#282932",
    },

    divider: {
        height: 1,
        backgroundColor: "#C8C9D0",
        marginVertical: 8,
    },

    info: {
        fontSize: 14,
        color: "#34353D",
        lineHeight: 18,
        marginBottom: 3,
    },

    bold: {
        fontWeight: "700",
        color: "#292A32",
    },

    warning: {
        color: "#E5A72B",
        fontSize: 15,
    },

    fragile: {
        color: "#F24848",
    },

    vehicle: {
        fontSize: 14,
        color: "#34353D",
        marginBottom: 8,
    },

    link: {
        color: "#F24848",
        textDecorationLine: "underline",
        fontWeight: "600",
        fontSize: 14,
        marginTop: 7,
    },
});
