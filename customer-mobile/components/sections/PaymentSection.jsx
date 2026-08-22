import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, } from "react-native";

const { width, height } = Dimensions.get("window");

export default function PaymentSection({ onChange }) {
  const total = 12400;

  const [paymentTerm, setPaymentTerm] = useState("full");
  const [method, setMethod] = useState(null);

  useEffect(() => {
    onChange?.({ paymentTerm, method, total });
  }, [paymentTerm, method, onChange]);

  return (
    <View style={styles.card}>

      {/* PAYMENT TERMS */}
      <Text style={styles.title}>Payment Terms</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={() => setPaymentTerm("half")}
      >
        <View style={[styles.radio, paymentTerm === "half" && styles.active]} />

        <View>
          <Text style={styles.text}>Pay Down-payment (50%)</Text>
          {paymentTerm === "half" && (
            <Text style={styles.highlight}>Bill: </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() => setPaymentTerm("full")}
      >
        <View style={[styles.radio, paymentTerm === "full" && styles.active]} />
        <Text style={styles.text}>Pay Full-payment</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* PAYMENT METHOD */}
      <Text style={styles.title}>Payment Methods</Text>

      <TouchableOpacity
        style={styles.row}
        onPress={() => setMethod("bank")}
      >
        <View style={[styles.radio, method === "bank" && styles.active]} />
        <Text style={styles.text}>Pay through Bank Transfer</Text>
      </TouchableOpacity>

      {method === "bank" && (
        <View style={styles.bankBox}>
          <Text style={styles.bankTitle}>Bank Details</Text>

          <Text style={styles.bankText}>Bank Name:</Text>
          <Text style={styles.bankText}>Account Name:</Text>
          <Text style={styles.bankText}>Account Number:</Text>

          <View style={styles.uploadBox}>
            <Text style={{ color: "#777" }}>Upload Screenshot</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={styles.row}
        onPress={() => setMethod("cash")}
      >
        <View style={[styles.radio, method === "cash" && styles.active]} />
        <Text style={styles.text}>Pay in Cash</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    padding: width * 0.04,
    borderRadius: width * 0.04,
    marginBottom: height * 0.015,
  },

  title: {
    fontSize: width * 0.04,
    fontWeight: "700",
    color: "#E53935",
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  radio: {
    width: 18,
    height: 18,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#999",
    marginRight: 10,
    marginTop: 3,
  },

  active: {
    borderColor: "#3286E8",
    backgroundColor: "#3286E8",
  },

  text: {
    fontSize: width * 0.035,
    color: "#444",
  },

  highlight: {
    color: "#E53935",
    fontWeight: "700",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 10,
  },

  bankBox: {
    marginTop: 6,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 10,
  },

  bankTitle: {
    fontWeight: "700",
    marginBottom: 6,
  },

  bankText: {
    fontSize: width * 0.032,
    marginBottom: 2,
  },

  uploadBox: {
    marginTop: 10,
    height: 100,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
  },
});