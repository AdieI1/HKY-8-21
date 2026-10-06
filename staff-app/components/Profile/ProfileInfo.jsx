import React from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../context/ThemeContext";

export default function ProfileInfo({
  phoneNumber = "N/A",
  firstName = "Inspector",
  lastName = "Staff",
  gender = "Not specified",
  dateOfBirth = "N/A",
  role = "Staff / Inspector",
  status = "Active",
}) {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {/* Section Title */}
      <View style={styles.sectionTitleRow}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="person"
            size={18}
            color="#E32E2E"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Official Staff Information
        </Text>
      </View>

      <Text style={[styles.readOnlyNote, { color: theme.secondaryText }]}>
        Profile details are synchronized with HJY Logistics portal.
      </Text>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Role & Status Row */}
      <View style={styles.twoColRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Role:</Text>
          <View style={[styles.fieldBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <Text style={[styles.fieldText, { color: theme.text }]}>{role}</Text>
          </View>
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Status:</Text>
          <View style={[styles.fieldBox, styles.statusBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <View style={styles.statusDot} />
            <Text style={[styles.fieldText, styles.statusText]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Phone Number */}
      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Phone number:</Text>
        <View style={[styles.fieldBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
          <Text style={[styles.fieldText, { color: theme.text }]}>{phoneNumber || "Not set"}</Text>
        </View>
      </View>

      {/* First Name & Last Name */}
      <View style={styles.twoColRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>First Name:</Text>
          <View style={[styles.fieldBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <Text style={[styles.fieldText, { color: theme.text }]}>{firstName}</Text>
          </View>
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Last Name:</Text>
          <View style={[styles.fieldBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <Text style={[styles.fieldText, { color: theme.text }]}>{lastName || "—"}</Text>
          </View>
        </View>
      </View>

      {/* Gender & DOB */}
      <View style={styles.twoColRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Gender:</Text>
          <View style={[styles.fieldBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <Text style={[styles.fieldText, { color: theme.text }]}>{gender || "Not specified"}</Text>
          </View>
        </View>

        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Date of Birth:</Text>
          <View style={[styles.fieldBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <Text style={[styles.fieldText, { color: theme.text }]}>{dateOfBirth || "N/A"}</Text>
          </View>
        </View>
      </View>

      {/* Settings Navigation Shortcut */}
      <Pressable
        style={({ pressed }) => [
          styles.settingsBtn,
          { borderColor: theme.border, backgroundColor: theme.cardSecondary },
          pressed && styles.buttonPressed,
        ]}
        onPress={() => router.push("/settings")}
      >
        <Ionicons name="settings-outline" size={19} color={theme.text} />
        <Text style={[styles.settingsBtnText, { color: theme.text }]}>
          Open App Settings & Preferences
        </Text>
        <Ionicons name="chevron-forward" size={17} color={theme.secondaryText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -16,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 110,
    flex: 1,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconCircle: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  readOnlyNote: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 36,
  },

  divider: {
    height: 1,
    marginTop: 14,
    marginBottom: 14,
  },

  twoColRow: {
    flexDirection: "row",
    gap: 12,
  },

  fieldGroup: {
    marginBottom: 14,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 5,
  },

  fieldBox: {
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
  },

  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "flex-start",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },

  statusText: {
    color: "#16A34A",
    fontWeight: "700",
    fontSize: 12,
  },

  fieldText: {
    fontSize: 14,
    fontWeight: "500",
  },

  settingsBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 10,
  },

  settingsBtnText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginLeft: 10,
  },

  buttonPressed: {
    opacity: 0.75,
  },
});
