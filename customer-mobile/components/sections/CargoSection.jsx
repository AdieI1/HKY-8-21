import { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function CargoSection({ onChange }) {
  const [cargoName, setCargoName] = useState("");
  const [cargoType, setCargoType] = useState(null);
  const [fragility, setFragility] = useState(null);
  const [weight, setWeight] = useState("");

  const [modalVisible, setModalVisible] = useState(false);
  const [activeField, setActiveField] = useState(null);

  const cargoOptions = [
    "Electronics",
    "General Goods",
    "Construction",
    "Furniture",
    "Perishable Goods",
  ];

  const fragilityOptions = [
    "Fragile",
    "Standard",
    "Perishable",
  ];

  useEffect(() => {
    onChange?.({ cargoName, cargoType, fragility, weight });
  }, [cargoName, cargoType, fragility, weight, onChange]);

  const openModal = (field) => {
    setActiveField(field);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setActiveField(null);
  };

  const handleSelect = (value) => {
    if (activeField === "cargo") setCargoType(value);
    if (activeField === "fragility") setFragility(value);
    closeModal();
  };

  const getOptions = () => {
    return activeField === "cargo"
      ? cargoOptions
      : fragilityOptions;
  };

  const getModalTitle = () => {
    if (activeField === "cargo") return "Select Cargo Type";
    if (activeField === "fragility") return "Select Cargo Fragility";
    return "";
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cargo Information</Text>

      <View style={styles.divider} />

      {/* Cargo Name */}
      <TextInput
        style={styles.input}
        placeholder="Enter Cargo Name"
        placeholderTextColor="#888"
        value={cargoName}
        onChangeText={setCargoName}
      />

      {/* Cargo Type */}
      <TouchableOpacity
        style={styles.input}
        onPress={() => openModal("cargo")}
      >
        <Text
          style={
            cargoType ? styles.value : styles.placeholder
          }
        >
          {cargoType || "Select Cargo Type"}
        </Text>
      </TouchableOpacity>

      {/* Fragility */}
      <TouchableOpacity
        style={styles.input}
        onPress={() => openModal("fragility")}
      >
        <Text
          style={
            fragility ? styles.value : styles.placeholder
          }
        >
          {fragility || "Select Cargo Fragility"}
        </Text>
      </TouchableOpacity>

      {/* Weight */}
      <View style={styles.weightContainer}>
        <TextInput
          style={styles.weightInput}
          placeholder="Enter Cargo Weight"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={weight}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9]/g, "");
            setWeight(cleaned);
          }}
        />

        <Text
          style={[
            styles.kg,
            weight ? styles.kgActive : null,
          ]}
        >
          kg
        </Text>
      </View>

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>
              {getModalTitle()}
            </Text>

            <FlatList
              data={getOptions()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.optionText}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancel}>
                Cancel
              </Text>
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
    marginBottom: height * 0.01,
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginBottom: height * 0.01,
  },

  input: {
    backgroundColor: "#F1F2F4",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.03,
    borderRadius: width * 0.03,
    marginBottom: height * 0.012,
    fontSize: width * 0.035,
    color: "#111",
  },

  placeholder: {
    color: "#888",
    fontSize: width * 0.035,
  },

  value: {
    color: "#111",
    fontWeight: "500",
    fontSize: width * 0.035,
  },

  weightContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F2F4",
    borderRadius: width * 0.03,
    paddingHorizontal: width * 0.03,
  },

  weightInput: {
    flex: 1,
    paddingVertical: height * 0.015,
    fontSize: width * 0.035,
    color: "#111",
  },

  kg: {
    color: "#999",
    fontWeight: "600",
    marginLeft: width * 0.01,
    fontSize: width * 0.035,
  },

  kgActive: {
    color: "#555",
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  modalBox: {
    backgroundColor: "#fff",
    padding: width * 0.05,
    borderTopLeftRadius: width * 0.05,
    borderTopRightRadius: width * 0.05,
    maxHeight: height * 0.6,
  },

  modalTitle: {
    fontSize: width * 0.04,
    fontWeight: "700",
    marginBottom: height * 0.01,
    color: "#111",
  },

  option: {
    paddingVertical: height * 0.018,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },

  optionText: {
    fontSize: width * 0.035,
    color: "#111",
  },

  cancel: {
    textAlign: "center",
    marginTop: height * 0.015,
    color: "#E53935",
    fontWeight: "600",
    fontSize: width * 0.04,
  },
});