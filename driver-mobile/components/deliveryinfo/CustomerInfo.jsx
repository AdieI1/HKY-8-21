import React from "react";
import {
    StyleSheet,
    View,
    Text,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";

export default function CustomerInfo({ delivery }) {
    const request = delivery?.request;
    const customer = request?.customer;

    // Request ID from backend
    const requestId =
        request?.request_id ||
        request?.request_number ||
        request?.reference_number ||
        "Not provided";

    // Customer name from backend
    const customerName =
        customer?.full_name ||
        customer?.name ||
        customer?.customer_name ||
        "Customer";

    // Customer contact number from backend
    const contactNumber =
        customer?.phone_number ||
        customer?.contact_number ||
        customer?.phone ||
        customer?.mobile_number ||
        "Not provided";

    // Payment information
    const paymentTerm = request?.payment_term;

    const totalPrice =
        request?.total_price !== null &&
        request?.total_price !== undefined
            ? Number(request.total_price)
            : 0;

    const tripCost =
        delivery?.trip_cost !== null &&
        delivery?.trip_cost !== undefined
            ? Number(delivery.trip_cost)
            : 0;

    // Calculate remaining balance for downpayment
    let remainingBalance = 0;

    if (paymentTerm === "downpayment") {
        remainingBalance = Math.max(
            totalPrice - tripCost,
            0
        );
    }

    const formattedBalance =
        remainingBalance > 0
            ? `₱${remainingBalance.toLocaleString(
                  "en-PH",
                  {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                  }
              )}`
            : "₱0";

    return (
        <View style={styles.card}>

            {/* Request ID */}
            <View style={styles.requestRow}>
                <Ionicons
                    name="reader-outline"
                    size={17}
                    color="#F24848"
                />

                <Text style={styles.requestText}>
                    Request ID: {requestId}
                </Text>
            </View>

            {/* Receiving Contact Person */}
            {request?.receiver_name ? (
                <View style={styles.receiverBox}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="person-circle-outline" size={17} color="#DE2226" />
                        <Text style={styles.receiverLabel}>RECEIVING CONTACT PERSON:</Text>
                    </View>
                    <Text style={styles.receiverNameText}>{request.receiver_name}</Text>
                    {request.receiver_phone ? (
                        <Text style={styles.receiverPhoneText}>
                            <Text style={styles.bold}>Phone:</Text> {request.receiver_phone}
                        </Text>
                    ) : null}
                </View>
            ) : null}

            {/* Customer name */}
            <Text style={[styles.customerName, request?.receiver_name ? { fontSize: 13, color: "#6B7280", marginTop: 6 } : null]}>
                {request?.receiver_name ? `Booked by Customer: ${customerName}` : customerName}
            </Text>

            {/* Contact number */}
            <Text style={styles.contact}>
                <Text style={styles.bold}>
                    {request?.receiver_name ? "Customer Phone:" : "Contact Number:"}
                </Text>{" "}
                {contactNumber}
            </Text>

            <View style={styles.divider} />

            {/* Remaining balance */}
            {paymentTerm === "downpayment" && (
                <View style={styles.balanceRow}>
                    <Ionicons
                        name="warning-outline"
                        size={18}
                        color="#F24848"
                    />

                    <Text style={styles.balanceText}>
                        Collect remaining balance:{" "}
                        <Text style={styles.balance}>
                            {formattedBalance}
                        </Text>
                    </Text>
                </View>
            )}

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

    requestRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    requestText: {
        fontSize: 14,
        color: "#30313A",
        marginLeft: 5,
    },

    receiverBox: {
        backgroundColor: "#FFFFFF",
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#FCA5A5",
        padding: 10,
        marginTop: 8,
        marginBottom: 4,
    },

    receiverLabel: {
        fontSize: 11,
        fontWeight: "800",
        color: "#DC2626",
        letterSpacing: 0.5,
    },

    receiverNameText: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1E293B",
        marginTop: 2,
    },

    receiverPhoneText: {
        fontSize: 13,
        color: "#475569",
        marginTop: 3,
    },

    customerName: {
        fontSize: 22,
        fontWeight: "700",
        color: "#282932",
        marginTop: 4,
    },

    contact: {
        fontSize: 13,
        color: "#4C4D55",
        marginTop: 5,
    },

    bold: {
        fontWeight: "700",
        color: "#292A32",
    },

    divider: {
        height: 1,
        backgroundColor: "#C8C9D0",
        marginVertical: 8,
    },

    balanceRow: {
        flexDirection: "row",
        alignItems: "center",
    },

    balanceText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
        color: "#292A32",
        marginLeft: 6,
    },

    balance: {
        color: "#3E8C22",
        fontWeight: "700",
    },
});
