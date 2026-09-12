import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");
const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

export default function PaymentSection({ onChange, total = 0 }) {
  const [paymentTerm, setPaymentTerm] = useState("full");
  const [method, setMethod] = useState(null);
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    onChange?.({ paymentTerm, method, total, receipt });
  }, [paymentTerm, method, total, receipt, onChange]);

  const chooseReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) setReceipt(result.assets[0]);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Payment Terms</Text>
      <TouchableOpacity style={styles.row} onPress={() => setPaymentTerm("half")}>
        <View style={[styles.radio, paymentTerm === "half" && styles.active]} />
        <View>
          <Text style={styles.text}>Pay Down-payment (50%)</Text>
          {paymentTerm === "half" && (
            <Text style={styles.highlight}>Bill: {money(total / 2)}</Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => setPaymentTerm("full")}>
        <View style={[styles.radio, paymentTerm === "full" && styles.active]} />
        <Text style={styles.text}>Pay Full-payment ({money(total)})</Text>
      </TouchableOpacity>

      <View style={styles.divider} />
      <Text style={styles.title}>Payment Methods</Text>
      <TouchableOpacity style={styles.row} onPress={() => setMethod("bank")}>
        <View style={[styles.radio, method === "bank" && styles.active]} />
        <Text style={styles.text}>Pay through Bank Transfer</Text>
      </TouchableOpacity>

      {method === "bank" && (
        <View style={styles.bankBox}>
          <Text style={styles.bankTitle}>Bank Details</Text>
          <Text style={styles.bankText}>Bank Name:</Text>
          <Text style={styles.bankText}>Account Name:</Text>
          <Text style={styles.bankText}>Account Number:</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={chooseReceipt}>
            {receipt?.uri ? (
              <Image source={{ uri: receipt.uri }} style={styles.receiptImage} />
            ) : (
              <Text style={styles.uploadText}>Upload Bank Transfer Photo</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.row} onPress={() => setMethod("cash")}>
        <View style={[styles.radio, method === "cash" && styles.active]} />
        <Text style={styles.text}>Pay in Cash</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", padding: width * 0.04, borderRadius: width * 0.04, marginBottom: height * 0.015 },
  title: { fontSize: width * 0.04, fontWeight: "700", color: "#E53935", marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  radio: { width: 18, height: 18, borderRadius: 10, borderWidth: 2, borderColor: "#999", marginRight: 10, marginTop: 3 },
  active: { borderColor: "#3286E8", backgroundColor: "#3286E8" },
  text: { fontSize: width * 0.035, color: "#444" },
  highlight: { color: "#E53935", fontWeight: "700", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#ddd", marginVertical: 10 },
  bankBox: { marginTop: 6, backgroundColor: "#fff", padding: 10, borderRadius: 10 },
  bankTitle: { fontWeight: "700", marginBottom: 6 },
  bankText: { fontSize: width * 0.032, marginBottom: 2 },
  uploadBox: { marginTop: 10, height: 100, borderRadius: 10, borderWidth: 1, borderColor: "#ccc", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  uploadText: { color: "#777" },
  receiptImage: { width: "100%", height: "100%", resizeMode: "cover" },
});
