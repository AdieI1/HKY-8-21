import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { getFleetAvailabilityForecast } from "../../services/api";

const { width, height } = Dimensions.get("window");

export default function DeliverySection({ pickup, dropoff, onOpenMap, schedule, onScheduleChange }) {
  const [forecast, setForecast] = useState(null);

  useEffect(() => {
    getFleetAvailabilityForecast()
      .then((data) => setForecast(data))
      .catch(() => {});
  }, []);

  const handleOpenMap = (type) => {
    if (onOpenMap) onOpenMap(type);
  };

  const isScheduled = !!schedule?.isScheduled;

  const getTodayDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getFutureDate = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getFutureLabel = (daysAhead) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const blockedDates = forecast?.blocked_dates || [];
  const earliestDate = forecast?.earliest_available_date;
  const earliestLabel = forecast?.earliest_available_label;

  const dateOptions = [1, 2, 3, 4].map((dAhead) => {
    const val = getFutureDate(dAhead);
    const isBlocked = blockedDates.includes(val);
    const baseLabel = dAhead === 1 ? `Tomorrow (${getFutureLabel(1)})` : getFutureLabel(dAhead);
    return {
      label: isBlocked ? `${baseLabel} (Full)` : baseLabel,
      value: val,
      isBlocked,
    };
  });

  const properTimes = [
    "08:00 AM",
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "01:00 PM",
    "02:00 PM",
    "03:00 PM",
    "04:00 PM",
    "05:00 PM",
  ];

  return (
    <View style={styles.card}>

      <Text style={styles.title}>Delivery Location</Text> 
      <View style={styles.divider} />

      <Text style={styles.label}>Select Pick-up address</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => handleOpenMap("pickup")}
      >
        <View style={styles.row}>
          <Ionicons name="location-sharp" size={18} color="#E53935" />
          <Text style={styles.text}>
            {pickup?.address ? pickup.address : "Tap to select pickup location"}
          </Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>Set Drop-off address</Text>
      <TouchableOpacity
        style={styles.input}
        onPress={() => handleOpenMap("dropoff")}
      >
        <View style={styles.row}>
          <Ionicons name="location-sharp" size={18} color="#E53935" />
          <Text style={styles.text}>
            {dropoff?.address ? dropoff.address : "Tap to select drop-off location"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Delivery Timing / Scheduling */}
      <Text style={[styles.title, { marginTop: 8 }]}>Delivery Timing</Text>
      <View style={styles.divider} />

      {!isScheduled && (forecast?.available_drivers_now === 0 || blockedDates.includes(getTodayDate())) && (
        <View style={styles.demandAlert}>
          <Ionicons name="warning-outline" size={16} color="#B45309" />
          <View style={{ flex: 1 }}>
            <Text style={styles.demandAlertTitle}>High Fleet Demand Today</Text>
            <Text style={styles.demandAlertText}>
              All fleet drivers are currently on delivery trips. Scheduling for{" "}
              <Text style={{ fontWeight: "700" }}>{earliestLabel || "a future date"}</Text> locks in a confirmed slot.
            </Text>
          </View>
        </View>
      )}

      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !isScheduled && styles.toggleBtnActive]}
          onPress={() => onScheduleChange?.({ isScheduled: false, date: "", timeSlot: "" })}
        >
          <Ionicons name="flash-outline" size={16} color={!isScheduled ? "#fff" : "#666"} />
          <Text style={[styles.toggleBtnText, !isScheduled && styles.toggleBtnTextActive]}>
            Deliver Now
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBtn, isScheduled && styles.toggleBtnActive]}
          onPress={() => onScheduleChange?.({
            isScheduled: true,
            date: schedule?.date || earliestDate || getFutureDate(1),
            timeSlot: schedule?.timeSlot || "09:00 AM",
          })}
        >
          <Ionicons name="calendar-outline" size={16} color={isScheduled ? "#fff" : "#666"} />
          <Text style={[styles.toggleBtnText, isScheduled && styles.toggleBtnTextActive]}>
            Schedule for Later
          </Text>
        </TouchableOpacity>
      </View>

      {isScheduled && (
        <View style={styles.scheduleBox}>
          <Text style={styles.scheduleLabel}>Select Date</Text>
          <View style={styles.slotGrid}>
            {dateOptions.map((opt) => {
              const selected = schedule?.date === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.slotChip,
                    selected && styles.slotChipActive,
                    opt.isBlocked && styles.slotChipBlocked,
                  ]}
                  onPress={() => {
                    if (opt.isBlocked) {
                      Alert.alert(
                        "Date Fully Booked",
                        `All drivers are currently on long-haul routes on this date. Please select ${earliestLabel || "an available date"}.`
                      );
                      return;
                    }
                    onScheduleChange?.({ ...schedule, date: opt.value });
                  }}
                >
                  <Text
                    style={[
                      styles.slotChipText,
                      selected && styles.slotChipTextActive,
                      opt.isBlocked && styles.slotChipTextBlocked,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.scheduleLabel, { marginTop: 10 }]}>Preferred Delivery Time</Text>
          <View style={styles.timeGrid}>
            {properTimes.map((time) => {
              const selected = (schedule?.timeSlot || "09:00 AM") === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeChip, selected && styles.timeChipActive]}
                  onPress={() => onScheduleChange?.({ ...schedule, timeSlot: time })}
                >
                  <Ionicons
                    name={selected ? "time" : "time-outline"}
                    size={12}
                    color={selected ? "#E53935" : "#666"}
                  />
                  <Text style={[styles.timeChipText, selected && styles.timeChipTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.customTimeRow}>
            <Ionicons name="create-outline" size={15} color="#666" />
            <TextInput
              style={styles.customTimeInput}
              placeholder="Or enter custom time (e.g. 10:30 AM)"
              placeholderTextColor="#999"
              value={schedule?.timeSlot || ""}
              onChangeText={(text) => onScheduleChange?.({ ...schedule, timeSlot: text })}
            />
          </View>
        </View>
      )}

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

  label: {
    fontSize: width * 0.032,
    color: "#777",
    marginBottom: 4,
  },

  input: {
    backgroundColor: "#F1F2F4",
    paddingVertical: height * 0.015,
    paddingHorizontal: width * 0.03,
    borderRadius: width * 0.03,
    marginBottom: height * 0.012,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  text: {
    fontSize: width * 0.035,
    color: "#777",
    marginLeft: 8,
    flex: 1,
  },

  toggleRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },

  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: height * 0.012,
    backgroundColor: "#F1F2F4",
    borderRadius: width * 0.025,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  toggleBtnActive: {
    backgroundColor: "#E53935",
    borderColor: "#E53935",
  },

  toggleBtnText: {
    fontSize: width * 0.032,
    fontWeight: "600",
    color: "#555",
  },

  toggleBtnTextActive: {
    color: "#fff",
  },

  scheduleBox: {
    backgroundColor: "#FAFAFA",
    padding: width * 0.03,
    borderRadius: width * 0.025,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
  },

  scheduleLabel: {
    fontSize: width * 0.03,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
  },

  slotGrid: {
    flexDirection: "column",
    gap: 6,
  },

  slotChip: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },

  slotChipActive: {
    borderColor: "#E53935",
    backgroundColor: "#FFF5F5",
  },

  slotChipText: {
    fontSize: width * 0.03,
    color: "#444",
  },

  slotChipTextActive: {
    color: "#E53935",
    fontWeight: "600",
  },

  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },

  timeChip: {
    width: "31.5%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 7,
    borderRadius: 6,
  },

  timeChipActive: {
    borderColor: "#E53935",
    backgroundColor: "#FFF5F5",
  },

  timeChipText: {
    fontSize: width * 0.027,
    color: "#444",
  },

  timeChipTextActive: {
    color: "#E53935",
    fontWeight: "700",
  },

  customTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },

  customTimeInput: {
    flex: 1,
    fontSize: width * 0.03,
    color: "#222",
    padding: 0,
  },

  demandAlert: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 8,
  },

  demandAlertTitle: {
    fontSize: width * 0.03,
    fontWeight: "700",
    color: "#92400E",
    marginBottom: 2,
  },

  demandAlertText: {
    fontSize: width * 0.026,
    color: "#78350F",
    lineHeight: 16,
  },

  slotChipBlocked: {
    backgroundColor: "#F3F4F6",
    borderColor: "#E5E7EB",
    opacity: 0.65,
  },

  slotChipTextBlocked: {
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
});