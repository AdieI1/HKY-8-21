import { Ionicons } from "@expo/vector-icons";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

export default function DetailsInfo({
  date,
  time,
  inspectionType,
  status,
}) {
  const { theme, darkMode } = useTheme();
  const hasIssues = String(status || "").toLowerCase().includes("issues");

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.infoBox}>
        <View style={styles.labelRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Date and Time
          </Text>
        </View>

        <Text style={[styles.value, { color: theme.text }]}>
          {date}
        </Text>

        <Text style={[styles.value, { color: theme.textSecondary }]}>
          {time}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.infoBox}>
        <View style={styles.labelRow}>
          <Ionicons
            name="walk-outline"
            size={16}
            color={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Inspection Type
          </Text>
        </View>

        <View style={[styles.typeBadge, darkMode && { backgroundColor: "rgba(37, 99, 235, 0.2)", borderColor: "#3B82F6" }]}>
          <Text style={[styles.typeText, darkMode && { color: "#60A5FA" }]}>
            {inspectionType}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.infoBox}>
        <View style={styles.labelRow}>
          <Ionicons
            name="checkmark-circle-outline"
            size={16}
            color={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Status
          </Text>
        </View>

        <View style={[
          styles.statusBadge,
          hasIssues && styles.statusBadgeIssue,
          darkMode && (hasIssues ? { backgroundColor: "rgba(234, 88, 12, 0.2)", borderColor: "#FB923C" } : { backgroundColor: "rgba(34, 197, 94, 0.2)", borderColor: "#4ADE80" })
        ]}>
          <Text style={[
            styles.statusText,
            hasIssues && styles.statusTextIssue,
            darkMode && (hasIssues ? { color: "#FB923C" } : { color: "#4ADE80" })
          ]}>
            {status}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 54,
    marginHorizontal: 9,
    backgroundColor: "#F5F7FF",
    borderWidth: 1,
    borderColor: "#D2D5DF",
    flexDirection: "row",
    alignItems: "center",
  },

  infoBox: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 5,
    justifyContent: "center",
  },

  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#C9CCD6",
  },

  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  label: {
    color: "#777A83",
    fontSize: 8,
    marginLeft: 3,
  },

  value: {
    color: "#555861",
    fontSize: 9,
    textAlign: "center",
    lineHeight: 13,
  },

  typeBadge: {
    alignSelf: "center",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#4D88FF",
    borderRadius: 3,
    backgroundColor: "#EDF4FF",
  },

  typeText: {
    color: "#2874E8",
    fontSize: 9,
    fontWeight: "600",
  },

  statusBadge: {
    alignSelf: "center",
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#76D47E",
    borderRadius: 3,
    backgroundColor: "#F0FFF1",
  },

  statusBadgeIssue: {
    borderColor: "#FDBA74",
    backgroundColor: "#FFF7ED",
  },

  statusText: {
    color: "#3DAA4B",
    fontSize: 9,
    fontWeight: "600",
  },

  statusTextIssue: {
    color: "#EA580C",
  },
});