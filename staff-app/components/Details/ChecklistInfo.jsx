import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";

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

export default function ChecklistInfo({ items = CHECKLIST }) {
  const { theme } = useTheme();
  const displayItems = Array.isArray(items) && items.length > 0 ? items : CHECKLIST;

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderTopWidth: 0 }]}>
      {displayItems.map((item, index) => (
        <View
          key={index}
          style={[styles.item, index < displayItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}
        >
          <Text style={[styles.label, { color: theme.textSecondary }]}>
            {item.label}
          </Text>

          <Text style={[styles.status, item.status === "Issue" && styles.statusIssue]}>
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

  statusIssue: {
    color: "#EA580C",
  },
});