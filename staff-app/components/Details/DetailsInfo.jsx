import { Ionicons } from "@expo/vector-icons";
import {
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function DetailsInfo({
  date,
  time,
  inspectionType,
  status,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <View style={styles.labelRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color="#676A74"
          />

          <Text style={styles.label}>
            Date and Time
          </Text>
        </View>

        <Text style={styles.value}>
          {date}
        </Text>

        <Text style={styles.value}>
          {time}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoBox}>
        <View style={styles.labelRow}>
          <Ionicons
            name="walk-outline"
            size={16}
            color="#676A74"
          />

          <Text style={styles.label}>
            Inspection Type
          </Text>
        </View>

        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>
            {inspectionType}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.infoBox}>
        <View style={styles.labelRow}>
          <Ionicons
            name="checkmark-circle-outline"
            size={16}
            color="#676A74"
          />

          <Text style={styles.label}>
            Status
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
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

  statusText: {
    color: "#3DAA4B",
    fontSize: 9,
    fontWeight: "600",
  },
});