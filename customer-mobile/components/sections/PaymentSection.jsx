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
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const money = (value) => `₱${Number(value || 0).toLocaleString("en-PH")}`;

export default function PaymentSection({ value, onChange, total = 0 }) {
  const { colors, isDark } = useTheme();
  const [paymentTerm, setPaymentTerm] = useState(value?.paymentTerm || "full");
  const [method, setMethod] = useState(value?.method || null);
  const [receipt, setReceipt] = useState(value?.receipt || null);

  useEffect(() => {
    if (!value) return;
    if (value.paymentTerm !== undefined && value.paymentTerm !== paymentTerm) {
      setPaymentTerm(value.paymentTerm);
    }
    if (value.method !== undefined && value.method !== method) {
      setMethod(value.method);
    }
    if (value.receipt !== undefined && value.receipt !== receipt) {
      setReceipt(value.receipt);
    }
  }, [value?.paymentTerm, value?.method, value?.receipt]);

  const notifyChange = (key, val) => {
    const updated = {
      paymentTerm: key === "paymentTerm" ? val : paymentTerm,
      method: key === "method" ? val : method,
      receipt: key === "receipt" ? val : receipt,
      total,
    };
    if (key === "paymentTerm") setPaymentTerm(val);
    if (key === "method") setMethod(val);
    if (key === "receipt") setReceipt(val);
    onChange?.(updated);
  };

  const chooseReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      notifyChange("receipt", result.assets[0]);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
      <Text style={[styles.title, { color: colors.text }]}>Payment Terms</Text>
      <TouchableOpacity style={styles.row} onPress={() => notifyChange("paymentTerm", "half")}>
        <View style={[styles.radio, { borderColor: isDark ? colors.textMuted : "#999" }, paymentTerm === "half" && styles.active]} />
        <View>
          <Text style={[styles.text, { color: colors.text }]}>Pay Down-payment (50%)</Text>
          {paymentTerm === "half" && (
            <Text style={styles.highlight}>Bill: {money(total / 2)}</Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.row} onPress={() => notifyChange("paymentTerm", "full")}>
        <View style={[styles.radio, { borderColor: isDark ? colors.textMuted : "#999" }, paymentTerm === "full" && styles.active]} />
        <Text style={[styles.text, { color: colors.text }]}>Pay Full-payment ({money(total)})</Text>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      <Text style={[styles.title, { color: colors.text }]}>Payment Methods</Text>
      <TouchableOpacity style={styles.row} onPress={() => notifyChange("method", "bank")}>
        <View style={[styles.radio, { borderColor: isDark ? colors.textMuted : "#999" }, method === "bank" && styles.active]} />
        <Text style={[styles.text, { color: colors.text }]}>Pay through Bank Transfer</Text>
      </TouchableOpacity>

      {method === "bank" && (
        <View style={[styles.bankBox, { backgroundColor: isDark ? colors.inputBg : "#F9FAFB", borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          <Text style={[styles.bankTitle, { color: colors.text }]}>Bank Details</Text>
          <Text style={[styles.bankText, { color: colors.textMuted }]}>Bank: BDO Unibank</Text>
          <Text style={[styles.bankText, { color: colors.textMuted }]}>Account: HJY Trucking Services</Text>
          <Text style={[styles.bankText, { color: colors.textMuted }]}>Number: 0012-3456-7890</Text>
          <TouchableOpacity style={styles.uploadBtn} onPress={chooseReceipt}>
            <Text style={styles.uploadText}>{receipt ? "Change Receipt" : "Upload Receipt"}</Text>
          </TouchableOpacity>
          {receipt && (
            <Image source={{ uri: receipt.uri }} style={styles.receiptPreview} />
          )}
        </View>
      )}

      <TouchableOpacity style={styles.row} onPress={() => notifyChange("method", "cash")}>
        <View style={[styles.radio, { borderColor: isDark ? colors.textMuted : "#999" }, method === "cash" && styles.active]} />
        <Text style={[styles.text, { color: colors.text }]}>Pay with Cash upon Pickup</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginVertical: 10,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#999",
    marginRight: 10,
  },
  active: {
    borderColor: "#DE2226",
    backgroundColor: "#DE2226",
  },
  text: {
    fontSize: 14,
    color: "#333",
  },
  highlight: {
    fontSize: 12,
    color: "#DE2226",
    fontWeight: "600",
  },
  bankBox: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  bankTitle: {
    fontWeight: "700",
    marginBottom: 4,
    color: "#222",
  },
  bankText: {
    fontSize: 13,
    color: "#555",
    marginBottom: 2,
  },
  uploadBtn: {
    backgroundColor: "#DE2226",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  uploadText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  receiptPreview: {
    width: "100%",
    height: 120,
    borderRadius: 6,
    marginTop: 10,
  },
});
