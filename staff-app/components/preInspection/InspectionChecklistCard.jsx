import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import UploadPhoto from "../UploadPhoto";

export const CHECKLIST_CATEGORIES = [
  {
    category: "Vehicle Exterior",
    items: [
      { id: "exterior_condition", label: "Vehicle body and exterior condition" },
      { id: "mirrors_windows", label: "Mirrors, windows and windshield" },
      { id: "doors_locks", label: "Doors and locks secured" },
    ],
  },
  {
    category: "Tires and Wheels",
    items: [
      { id: "tire_wheel_condition", label: "Tire and wheel condition" },
      { id: "tire_pressure", label: "Tire pressure" },
      { id: "wheel_components", label: "Complete wheel components" },
    ],
  },
  {
    category: "Lights and Signals",
    items: [
      { id: "headlights_exterior", label: "Headlights and exterior lights functional" },
      { id: "brake_signal_lights", label: "Brake and signal lights working" },
      { id: "hazard_reflectors", label: "Functional Hazard lights and reflectors" },
    ],
  },
  {
    category: "Mechanical Condition",
    items: [
      { id: "braking_system", label: "Braking system functional" },
      { id: "steering_suspension", label: "Steering and suspension working" },
      { id: "engine_performance", label: "Good engine performance" },
      { id: "no_noises_warning", label: "No unusual noises, vibrations or warning indicators" },
      { id: "no_fuel_leaks", label: "No visible fuel leaks" },
    ],
  },
  {
    category: "Safety Equipment",
    items: [
      { id: "fire_extinguisher", label: "Fire extinguisher available" },
      { id: "warning_triangle", label: "Warning triangle, reflective equipment available" },
      { id: "emergency_safety_equip", label: "Emergency and safety equipment available" },
      { id: "first_aid_kit", label: "First aid kit available" },
    ],
  },
  {
    category: "Cargo/Load Area",
    items: [
      { id: "cargo_area_secured", label: "Cargo area secured" },
      { id: "cargo_securing_equip", label: "Cargo securing equipment on board" },
      { id: "no_cargo_damage", label: "No cargo area damage" },
    ],
  },
];

export default function InspectionChecklistCard({
  isPost = false,
  itemStates = {},
  onItemChange,
  odometer = "",
  onOdometerChange,
  fuel = "",
  onFuelChange,
  photos = [],
  onPhotosChange,
  onProgressChange,
}) {
  const allItems = useMemo(() => CHECKLIST_CATEGORIES.flatMap((c) => c.items), []);
  const totalCount = allItems.length;

  const completedCount = useMemo(() => {
    return allItems.filter((it) => itemStates[it.id] === "pass" || itemStates[it.id] === "defect").length;
  }, [allItems, itemStates]);

  const defectCount = useMemo(() => {
    return allItems.filter((it) => itemStates[it.id] === "defect").length;
  }, [allItems, itemStates]);

  useEffect(() => {
    onProgressChange?.({
      completed: completedCount,
      total: totalCount,
      defects: defectCount,
    });
  }, [completedCount, totalCount, defectCount, onProgressChange]);

  const toggleStatus = (id, targetStatus) => {
    const current = itemStates[id];
    onItemChange?.(id, current === targetStatus ? null : targetStatus);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Inspection Checklist</Text>
        <Text style={styles.count}>{completedCount}/{totalCount}</Text>
      </View>
      <View style={styles.divider} />

      {CHECKLIST_CATEGORIES.map((cat, catIndex) => (
        <View key={cat.category} style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>{cat.category}</Text>
            {catIndex === 0 && (
              <View style={styles.columnIndicators}>
                <Ionicons name="checkmark-circle-outline" size={17} color="#22C55E" />
                <Ionicons name="close-circle-outline" size={17} color="#EF4444" />
              </View>
            )}
          </View>

          {cat.items.map((item) => {
            const currentStatus = itemStates[item.id];
            const isPass = currentStatus === "pass";
            const isDefect = currentStatus === "defect";

            return (
              <View key={item.id} style={styles.checkItem}>
                <Text style={styles.checkText}>{item.label}</Text>
                <View style={styles.actionBoxes}>
                  <Pressable
                    style={[styles.box, isPass && styles.passBox]}
                    onPress={() => toggleStatus(item.id, "pass")}
                  >
                    {isPass && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                  </Pressable>

                  <Pressable
                    style={[styles.box, isDefect && styles.defectBox]}
                    onPress={() => toggleStatus(item.id, "defect")}
                  >
                    {isDefect && <Ionicons name="close" size={13} color="#FFFFFF" />}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      <View style={styles.inputSection}>
        <Text style={styles.inputLabel}>{isPost ? "Ending Odometer" : "Starting Odometer"}</Text>
        <TextInput
          style={styles.textInput}
          value={odometer}
          onChangeText={onOdometerChange}
          placeholder={isPost ? "Enter ending odometer (e.g. 68000)" : "Enter starting odometer (e.g. 67000)"}
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />

        <Text style={[styles.inputLabel, { marginTop: 12 }]}>{isPost ? "Ending Fuel Remaining" : "Starting Fuel Issued"}</Text>
        <TextInput
          style={styles.textInput}
          value={fuel}
          onChangeText={onFuelChange}
          placeholder={isPost ? "Enter ending fuel in liters (e.g. 50)" : "Enter starting fuel in liters (e.g. 100)"}
          placeholderTextColor="#9CA3AF"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.photoSection}>
        <UploadPhoto photos={photos} onPhotosChange={onPhotosChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#F5F7FF",
    borderWidth: 1,
    borderColor: "#D5D8E2",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingTop: 13,
    paddingBottom: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#27272E",
    fontSize: 13.5,
    fontWeight: "700",
  },
  count: {
    color: "#7E808A",
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#DCDFE8",
    marginVertical: 10,
  },
  categorySection: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryTitle: {
    color: "#1F2024",
    fontSize: 12.5,
    fontWeight: "700",
  },
  columnIndicators: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingRight: 3,
  },
  checkItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 32,
    paddingVertical: 3,
  },
  checkText: {
    flex: 1,
    color: "#4A4C56",
    fontSize: 11,
    lineHeight: 15,
    paddingRight: 10,
  },
  actionBoxes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingRight: 2,
  },
  box: {
    width: 19,
    height: 19,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: "#8E919B",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  passBox: {
    backgroundColor: "#22C55E",
    borderColor: "#22C55E",
  },
  defectBox: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  inputSection: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#DCDFE8",
  },
  inputLabel: {
    color: "#27272E",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 5,
  },
  textInput: {
    height: 38,
    borderWidth: 1,
    borderColor: "#D2D5DF",
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    fontSize: 12,
    color: "#1F2937",
  },
  photoSection: {
    marginTop: 10,
  },
});