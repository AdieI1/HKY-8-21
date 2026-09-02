import { Ionicons } from "@expo/vector-icons";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ProfileInfo({
  phoneNumber = "09674209607",
  firstName = "Christopher",
  lastName = "Lee",
  gender = "09674209607",
  dateOfBirth = "05/16/98",
  onEditProfile,
}) {
  return (
    <View style={styles.card}>
      {/* Section Title */}
      <View style={styles.sectionTitleRow}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="person"
            size={18}
            color="#E32E2E"
          />
        </View>

        <Text style={styles.sectionTitle}>
          Personal Information
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Phone Number */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Phone number:</Text>
        <View style={styles.fieldBox}>
          <Text style={styles.fieldText}>{phoneNumber}</Text>
        </View>
      </View>

      {/* First Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>First Name:</Text>
        <View style={styles.fieldBox}>
          <Text style={styles.fieldText}>{firstName}</Text>
        </View>
      </View>

      {/* Last Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Last Name:</Text>
        <View style={styles.fieldBox}>
          <Text style={styles.fieldText}>{lastName}</Text>
        </View>
      </View>

      {/* Gender */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Gender:</Text>
        <View style={[styles.fieldBox, styles.halfBox]}>
          <Text style={styles.fieldText}>{gender}</Text>
        </View>
      </View>

      {/* Date of Birth */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Date of Birth:</Text>
        <View style={[styles.fieldBox, styles.dateBox]}>
          <View style={styles.calendarIconWrap}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color="#374151"
            />
          </View>
          <Text style={styles.fieldText}>{dateOfBirth}</Text>
        </View>
      </View>

      {/* Edit Profile Button */}
      <Pressable
        style={({ pressed }) => [
          styles.editButton,
          pressed && styles.buttonPressed,
        ]}
        onPress={onEditProfile}
      >
        <Ionicons
          name="create-outline"
          size={20}
          color="#FFFFFF"
        />
        <Text style={styles.editButtonText}>Edit Profile</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F7F8FD",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    marginTop: -16,
    paddingHorizontal: 18,
    paddingTop: 18,
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
    color: "#2C2E35",
    fontSize: 18,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#E2E5EE",
    marginTop: 12,
    marginBottom: 14,
  },

  fieldGroup: {
    marginBottom: 14,
  },

  fieldLabel: {
    color: "#1F2937",
    fontSize: 14.5,
    fontWeight: "700",
    marginBottom: 6,
  },

  fieldBox: {
    height: 42,
    backgroundColor: "#D2D6E0",
    borderRadius: 7,
    justifyContent: "center",
    paddingHorizontal: 14,
  },

  halfBox: {
    width: "48%",
  },

  dateBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  calendarIconWrap: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: "#4B5563",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },

  fieldText: {
    color: "#374151",
    fontSize: 13.5,
    fontWeight: "500",
  },

  editButton: {
    height: 48,
    backgroundColor: "#E32E2E",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.75,
  },
});
