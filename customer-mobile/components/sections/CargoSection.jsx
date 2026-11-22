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
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");

export default function CargoSection({ value, onChange }) {
  const { isDark, colors } = useTheme();
  const [cargoName, setCargoName] = useState(value?.cargoName || "");
  const [cargoType, setCargoType] = useState(value?.cargoType || null);
  const [fragility, setFragility] = useState(value?.fragility || null);
  const [weight, setWeight] = useState(value?.weight ? String(value.weight) : "");
  const [serviceType, setServiceType] = useState(value?.serviceType || "standard");
  const [containerNumber, setContainerNumber] = useState(value?.containerNumber || "");
  const [sealNumber, setSealNumber] = useState(value?.sealNumber || "");

  const [modalVisible, setModalVisible] = useState(false);
  const [activeField, setActiveField] = useState(null);

  // Synchronize when value changes from outside (e.g., draft loaded or restored)
  useEffect(() => {
    if (!value) return;
    if (value.cargoName !== undefined && value.cargoName !== cargoName) {
      setCargoName(value.cargoName || "");
    }
    if (value.cargoType !== undefined && value.cargoType !== cargoType) {
      setCargoType(value.cargoType || null);
    }
    if (value.fragility !== undefined && value.fragility !== fragility) {
      setFragility(value.fragility || null);
    }
    if (value.serviceType !== undefined && value.serviceType !== serviceType) {
      setServiceType(value.serviceType || "standard");
    }
    if (value.containerNumber !== undefined && value.containerNumber !== containerNumber) {
      setContainerNumber(value.containerNumber || "");
    }
    if (value.sealNumber !== undefined && value.sealNumber !== sealNumber) {
      setSealNumber(value.sealNumber || "");
    }
    if (value.weight !== undefined) {
      const w = value.weight ? String(value.weight) : "";
      if (w !== weight) {
        setWeight(w);
      }
    }
  }, [value?.cargoName, value?.cargoType, value?.fragility, value?.weight, value?.serviceType, value?.containerNumber, value?.sealNumber]);

  const notifyChange = (key, val) => {
    const updated = {
      cargoName: key === "cargoName" ? val : cargoName,
      cargoType: key === "cargoType" ? val : cargoType,
      fragility: key === "fragility" ? val : fragility,
      weight: key === "weight" ? val : weight,
      serviceType: key === "serviceType" ? val : serviceType,
      containerNumber: key === "containerNumber" ? val : containerNumber,
      sealNumber: key === "sealNumber" ? val : sealNumber,
    };
    if (key === "cargoName") setCargoName(val);
    if (key === "cargoType") setCargoType(val);
    if (key === "fragility") setFragility(val);
    if (key === "weight") setWeight(val);
    if (key === "serviceType") setServiceType(val);
    if (key === "containerNumber") setContainerNumber(val);
    if (key === "sealNumber") setSealNumber(val);
    onChange?.(updated);
  };

  const cargoOptions = [
    "Construction Materials & Parts",
    "Electronics & Devices",
    "Food & Perishables",
    "Vehicles & Automotive Parts",
    "Hardware & Industrial Tools",
    "Fitness & Gym Equipment",
    "Glassware & Ceramics",
    "Chemicals & Hazardous Goods",
    "Furniture & Household Goods",
    "General Cargo / Other",
  ];

  const fragilityOptions = [
    "Fragile",
    "Normal",
    "Perishable",
  ];

  const serviceOptions = [
    "Standard Delivery (Trucking)",
    "Container Stuffing (Loading into Container)",
    "Container Pulling (Depot / Port Pull-Out)",
  ];

  const getServiceLabel = (type) => {
    if (type === "stuffing") return "Container Stuffing (Loading into Container)";
    if (type === "pulling") return "Container Pulling (Depot / Port Pull-Out)";
    return "Standard Delivery (Trucking)";
  };

  const openModal = (field) => {
    setActiveField(field);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setActiveField(null);
  };

  const handleSelect = (selectedVal) => {
    if (activeField === "cargo") notifyChange("cargoType", selectedVal);
    if (activeField === "fragility") notifyChange("fragility", selectedVal);
    if (activeField === "service") {
      let key = "standard";
      if (selectedVal.includes("Stuffing")) key = "stuffing";
      else if (selectedVal.includes("Pulling")) key = "pulling";
      notifyChange("serviceType", key);
    }
    closeModal();
  };

  const getOptions = () => {
    if (activeField === "cargo") return cargoOptions;
    if (activeField === "fragility") return fragilityOptions;
    if (activeField === "service") return serviceOptions;
    return [];
  };

  const getModalTitle = () => {
    if (activeField === "cargo") return "Select Cargo Type";
    if (activeField === "fragility") return "Select Cargo Fragility";
    if (activeField === "service") return "Select Delivery Service Type";
    return "";
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
      <Text style={[styles.title, { color: colors.text }]}>Cargo Information</Text>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      {/* Service Type */}
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>Service Type</Text>
      <TouchableOpacity
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, borderWidth: isDark ? 1 : 0 }]}
        onPress={() => openModal("service")}
      >
        <Text style={[styles.value, { color: colors.text }]}>
          {getServiceLabel(serviceType)}
        </Text>
      </TouchableOpacity>

      {/* Conditional Container & Seal Numbers for Stuffing / Pulling */}
      {(serviceType === "stuffing" || serviceType === "pulling") && (
        <View style={[styles.containerBox, { backgroundColor: isDark ? "#1E293B" : "#F0F9FF", borderColor: isDark ? "#38BDF8" : "#BAE6FD" }]}>
          <Text style={[styles.containerBoxTitle, { color: isDark ? "#38BDF8" : "#0284C7" }]}>
            {serviceType === "stuffing" ? "Container Stuffing Details" : "Container Pull-Out Details"}
          </Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, borderWidth: isDark ? 1 : 0, marginBottom: 8 }]}
            placeholder="Container Number (e.g. MSCU1234567)"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="characters"
            value={containerNumber}
            onChangeText={(text) => notifyChange("containerNumber", text.toUpperCase())}
          />

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, borderWidth: isDark ? 1 : 0, marginBottom: 0 }]}
            placeholder="Seal Number (e.g. SL987654)"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="characters"
            value={sealNumber}
            onChangeText={(text) => notifyChange("sealNumber", text.toUpperCase())}
          />
        </View>
      )}

      {/* Cargo Name */}
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>Cargo Name</Text>
      <TextInput
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, borderWidth: isDark ? 1 : 0 }]}
        placeholder="Enter Cargo Name"
        placeholderTextColor={colors.textSubtle}
        value={cargoName}
        onChangeText={(text) => notifyChange("cargoName", text)}
      />

      {/* Cargo Type */}
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>Cargo Type</Text>
      <TouchableOpacity
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, borderWidth: isDark ? 1 : 0 }]}
        onPress={() => openModal("cargo")}
      >
        <Text
          style={[
            cargoType ? styles.value : styles.placeholder,
            { color: cargoType ? colors.text : colors.textSubtle },
          ]}
        >
          {cargoType || "Select Cargo Type"}
        </Text>
      </TouchableOpacity>

      {/* Fragility */}
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>Fragility</Text>
      <TouchableOpacity
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, borderWidth: isDark ? 1 : 0 }]}
        onPress={() => openModal("fragility")}
      >
        <Text
          style={[
            fragility ? styles.value : styles.placeholder,
            { color: fragility ? colors.text : colors.textSubtle },
          ]}
        >
          {fragility || "Select Cargo Fragility"}
        </Text>
      </TouchableOpacity>

      {/* Weight */}
      <Text style={[styles.fieldLabel, { color: colors.textSubtle }]}>Cargo Weight</Text>
      <View style={[styles.weightContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, borderWidth: isDark ? 1 : 0 }]}>
        <TextInput
          style={[styles.weightInput, { color: colors.text }]}
          placeholder="Enter Cargo Weight"
          placeholderTextColor={colors.textSubtle}
          keyboardType="numeric"
          value={weight}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^0-9]/g, "");
            notifyChange("weight", cleaned);
          }}
        />

        <Text
          style={[
            styles.kg,
            weight ? styles.kgActive : null,
            { color: weight ? colors.text : colors.textSubtle },
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
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {getModalTitle()}
            </Text>

            <FlatList
              data={getOptions()}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.optionItem, { borderBottomColor: colors.divider }]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={closeModal}
            >
              <Text style={styles.closeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: width * 0.04,
    padding: width * 0.04,
    marginBottom: height * 0.02,
    elevation: 3,
  },

  title: {
    fontSize: width * 0.045,
    fontWeight: "700",
    color: "#222",
  },

  divider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: height * 0.015,
  },

  fieldLabel: {
    fontSize: width * 0.032,
    fontWeight: "600",
    marginBottom: 4,
  },

  containerBox: {
    padding: width * 0.035,
    borderRadius: width * 0.03,
    borderWidth: 1,
    marginBottom: height * 0.015,
  },

  containerBoxTitle: {
    fontSize: width * 0.035,
    fontWeight: "700",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#F1F2F4",
    borderRadius: width * 0.025,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.015,
    marginBottom: height * 0.015,
    justifyContent: "center",
  },

  placeholder: {
    color: "#888",
    fontSize: width * 0.035,
  },

  value: {
    color: "#222",
    fontSize: width * 0.035,
    fontWeight: "500",
  },

  weightContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F2F4",
    borderRadius: width * 0.025,
    paddingHorizontal: width * 0.04,
  },

  weightInput: {
    flex: 1,
    paddingVertical: height * 0.015,
    fontSize: width * 0.035,
    color: "#222",
  },

  kg: {
    fontSize: width * 0.035,
    color: "#aaa",
    fontWeight: "600",
  },

  kgActive: {
    color: "#222",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },

  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: height * 0.5,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 15,
    color: "#222",
  },

  optionItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  optionText: {
    fontSize: 15,
    color: "#333",
  },

  closeBtn: {
    marginTop: 15,
    paddingVertical: 12,
    alignItems: "center",
  },

  closeText: {
    color: "#DE2226",
    fontWeight: "600",
  },
});