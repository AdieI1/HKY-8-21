import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

export default function DraftCard({
  draft,
  onContinue,
  onDelete,
}) {
  const { isDark, colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.top}>
        <View style={[styles.iconBox, { backgroundColor: isDark ? "#450A0A" : "#FEE2E2" }]}>
          <Ionicons
            name="cube-outline"
            size={24}
            color="#DC2626"
          />
        </View>

        <View style={styles.main}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {draft.title || "Cargo Delivery"}
            </Text>

            <TouchableOpacity
              style={styles.moreButton}
              onPress={onDelete}
              activeOpacity={0.6}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.textSubtle}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.dateTag}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {draft.date}
              </Text>
            </View>

            <View style={[styles.fragilePill, { backgroundColor: isDark ? "#450A0A" : "#FEF2F2" }]}>
              <Text style={styles.fragile}>
                {draft.type || "Normal"}
              </Text>
            </View>
          </View>

          <View style={[styles.routeBox, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]}>
            <View style={styles.routeRow}>
              <Ionicons
                name="location"
                size={16}
                color="#DC2626"
              />
              <Text style={[styles.route, { color: colors.text }]} numberOfLines={1}>
                {draft.pickup || "Pickup Location"}
              </Text>
            </View>

            <View style={styles.routeArrow}>
              <Ionicons
                name="arrow-down"
                size={14}
                color={colors.textSubtle}
              />
            </View>

            <View style={styles.routeRow}>
              <Ionicons
                name="navigate"
                size={16}
                color="#059669"
              />
              <Text style={[styles.route, { color: colors.text }]} numberOfLines={1}>
                {draft.destination || "Destination Location"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.divider }]} />

      <View style={styles.bottom}>
        <View style={styles.saved}>
          <Ionicons
            name="time-outline"
            size={16}
            color={colors.textMuted}
          />
          <Text style={[styles.savedText, { color: colors.textMuted }]}>
            Saved {draft.savedTime || "recently"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>
            Continue
          </Text>
          <Ionicons
            name="arrow-forward"
            size={16}
            color="#FFFFFF"
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    overflow: "hidden",
  },
  top: {
    flexDirection: "row",
    padding: 16,
    alignItems: "flex-start",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  main: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  dateTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: 13,
    fontWeight: "500",
  },
  fragilePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fragile: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "700",
  },
  routeBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeArrow: {
    paddingLeft: 2,
    marginVertical: 2,
  },
  route: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  moreButton: {
    padding: 4,
  },
  divider: {
    height: 1,
  },
  bottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  savedText: {
    fontSize: 13,
    fontWeight: "500",
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: "#DC2626",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  continueText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});