import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { getScheduledDeliveryInfo } from "../../utils/schedule";

export default function DeliveryDetailsCard({ delivery, style }) {
  const { theme, darkMode } = useTheme();
  const request = delivery?.request;

  if (!request) return null;

  const scheduleInfo = getScheduledDeliveryInfo(delivery);

  const customerName =
    request?.customer?.full_name ||
    request?.customer?.name ||
    request?.receiver_name ||
    "—";
  const cargoName = request?.item_name || request?.cargo_name || "—";
  const cargoType = request?.cargo_type || "—";
  const weightText =
    request?.weight != null && request?.weight !== ""
      ? `${request.weight} kg`
      : null;
  const cargoTypeDisplay = weightText ? `${cargoType} (${weightText})` : cargoType;

  const pickupLocation =
    delivery?.is_relief && delivery?.cargo_loaded && delivery?.relief_origin_address
      ? delivery.relief_origin_address
      : request?.pickup_address || "—";
  const dropoffLocation = request?.dropoff_address || "—";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="cube-outline" size={15} color={theme.text} />
          <Text style={[styles.title, { color: theme.text }]}>
            Delivery Details
          </Text>
        </View>

        {scheduleInfo.isScheduled && (
          <View
            style={[
              styles.scheduleBadge,
              darkMode && { backgroundColor: "#3E2211", borderColor: "#7C3B14" },
            ]}
          >
            <Ionicons name="calendar-outline" size={11} color="#E87521" />
            <Text style={styles.scheduleBadgeText} numberOfLines={1}>
              {scheduleInfo.isFuture ? "Advance Inspection" : "Scheduled"}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {scheduleInfo.isScheduled && (
        <DetailRow
          label="Schedule"
          value={scheduleInfo.detailLabel}
          theme={theme}
          highlight
        />
      )}
      <DetailRow label="Customer" value={customerName} theme={theme} />
      <DetailRow label="Cargo Name" value={cargoName} theme={theme} />
      <DetailRow label="Cargo Type" value={cargoTypeDisplay} theme={theme} />
      <DetailRow label="Pick-up" value={pickupLocation} theme={theme} />
      <DetailRow label="Drop-off" value={dropoffLocation} theme={theme} isLast />
    </View>
  );
}

function DetailRow({ label, value, theme, isLast = false, highlight = false }) {
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          { color: highlight ? "#E87521" : theme.text },
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    backgroundColor: "#F5F7FF",
    borderWidth: 1,
    borderColor: "#D5D8E2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scheduleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#F0B889",
    backgroundColor: "#FFF0E4",
  },
  scheduleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E87521",
  },
  title: {
    color: "#27272E",
    fontSize: 13,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#DCDFE8",
    marginTop: 8,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: 6,
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B6D77",
    width: 78,
  },
  value: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "600",
    color: "#27272E",
    textAlign: "right",
    lineHeight: 15,
  },
});
