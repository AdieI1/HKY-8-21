import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View, } from "react-native";

const { width, height } = Dimensions.get("window");

export default function OverviewSection() {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeInfo, setActiveInfo] = useState("");

  const total = 12400;

  const openInfo = (text) => {
    setActiveInfo(text);
    setModalVisible(true);
  };

  return (
    <View style={styles.card}>
      {/* title and subtitle */}
      <View style={styles.headerTop}>
        <View style={styles.iconBox}>
          <Ionicons name="cube-outline"size={width * 0.05}color="#fff"/>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.title}>Delivery Overview</Text>
          <Text style={styles.note}>
            Press the "?" icon for pricing details
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* cost details */}

      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          openInfo("Distance fee is based on total kilometers traveled.")
        }
      >
        <View style={styles.leftGroup}>
          <Ionicons
            name="help-circle-outline"
            size={width * 0.045}
            color="#E53935"
            style={styles.iconSpacing}
          />
          <Text style={styles.item}>Distance: </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          openInfo("Labor fee covers loading and unloading of cargo.")
        }
      >
        <View style={styles.leftGroup}>
          <Ionicons
            name="help-circle-outline"
            size={width * 0.045}
            color="#E53935"
            style={styles.iconSpacing}
          />
          <Text style={styles.item}>Labor Fee: ₱800</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          openInfo("Distance fee is calculated per kilometer.")
        }
      >
        <View style={styles.leftGroup}>
          <Ionicons
            name="help-circle-outline"
            size={width * 0.045}
            color="#E53935"
            style={styles.iconSpacing}
          />
          <Text style={styles.item}>Distance Fee:</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          openInfo("Weight fee depends on total cargo weight.")
        }
      >
        <View style={styles.leftGroup}>
          <Ionicons
            name="help-circle-outline"
            size={width * 0.045}
            color="#E53935"
            style={styles.iconSpacing}
          />
          <Text style={styles.item}>Weight Fee:</Text>
        </View>
      </TouchableOpacity>

      {/* total expenses */}
      <Text style={styles.total}>
        Total Expenses: 
      </Text>

      {/* MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalText}>{activeInfo}</Text>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.close}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: width * 0.04,
    borderRadius: width * 0.04,
    marginBottom: height * 0.015,
  },

  title: {
    fontSize: width * 0.04,
    fontWeight: "700",
    color: "#E53935",
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: height * 0.008,
  },

  headerText: {
    flex: 1,
  },

  iconBox: {
    backgroundColor: "#2196F3",
    padding: width * 0.025,
    borderRadius: width * 0.03,
    marginRight: width * 0.025,
  },

  note: {
    fontSize: width * 0.03,
    color: "#E53935",
    marginTop: height * 0.002,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginBottom: height * 0.01,
  },

  row: {
    marginBottom: height * 0.006,
  },

  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconSpacing: {
    marginRight: width * 0.015,
  },

  item: {
    fontSize: width * 0.035,
    color: "#333",
  },

  total: {
    marginTop: height * 0.008,
    fontWeight: "700",
    color: "#E53935",
    fontSize: width * 0.038,
  },

  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalBox: {
    backgroundColor: "#fff",
    padding: width * 0.05,
    borderRadius: width * 0.04,
    width: width * 0.8,
  },

  modalText: {
    fontSize: width * 0.035,
    marginBottom: height * 0.015,
    color: "#333",
  },

  close: {
    textAlign: "center",
    color: "#E53935",
    fontWeight: "700",
    fontSize: width * 0.04,
  },
});