import { StyleSheet, Text, View } from "react-native";

const CHECKLIST = [
  {
    label: "Vehicle Inspection Conducted",
    status: "Good",
  },
  {
    label: "Valid Drivers License",
    status: "Good",
  },
  {
    label: "OR/CR Available",
    status: "Good",
  },
  {
    label: "Tires Checked",
    status: "Good",
  },
  {
    label: "Operational Lights and Signals",
    status: "Good",
  },
  {
    label: "Fire Extinguisher Available",
    status: "Good",
  },
  {
    label: "Complete Emergency Tools",
    status: "Good",
  },
  {
    label: "PPE Available",
    status: "Good",
  },
];

export default function ChecklistInfo() {
  return (
    <View style={styles.container}>
      {CHECKLIST.map((item, index) => (
        <View
          key={index}
          style={styles.item}
        >
          <Text style={styles.label}>
            {item.label}
          </Text>

          <Text style={styles.status}>
            {item.status}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 9,
    backgroundColor: "#F5F7FF",
    paddingHorizontal: 11,
  },

  item: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  label: {
    flex: 1,
    color: "#555861",
    fontSize: 11,
  },

  status: {
    width: 45,
    color: "#399641",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
  },
});