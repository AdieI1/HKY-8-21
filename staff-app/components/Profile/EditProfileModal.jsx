import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function EditProfileModal({
  visible,
  onClose,
  initialData = {},
  onSave,
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("Male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setFirstName(initialData.firstName || "");
      setLastName(initialData.lastName || "");
      setPhone(initialData.phoneNumber || "");
      setGender(initialData.gender || "Male");
      setDateOfBirth(initialData.dateOfBirth && initialData.dateOfBirth !== "N/A" ? initialData.dateOfBirth : "");
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert("Required", "Please enter your first name.");
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^09\d{9}$/.test(trimmedPhone)) {
      Alert.alert(
        "Invalid Phone Number",
        "Phone number must start with 09 and be exactly 11 digits (e.g. 09123456789)."
      );
      return;
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      setSaving(true);
      await onSave({
        full_name: fullName,
        phone: trimmedPhone,
        gender,
        date_of_birth: dateOfBirth.trim() || null,
      });
      onClose();
    } catch (err) {
      Alert.alert("Update Failed", err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={styles.iconCircle}>
                <Ionicons name="person-outline" size={18} color="#C52227" />
              </View>
              <Text style={styles.title}>Edit Profile</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
          >
            {/* First Name & Last Name */}
            <View style={styles.twoCol}>
              <View style={[styles.fieldWrap, { flex: 1 }]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mark"
                  placeholderTextColor="#94A3B8"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={[styles.fieldWrap, { flex: 1 }]}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Grayson"
                  placeholderTextColor="#94A3B8"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Phone Number (09XXXXXXXXX)</Text>
              <TextInput
                style={styles.input}
                placeholder="09XXXXXXXXX"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={11}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            {/* Gender Selector */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Gender</Text>
              <View style={styles.genderOptions}>
                {["Male", "Female", "Other"].map((opt) => (
                  <Pressable
                    key={opt}
                    style={[
                      styles.genderChip,
                      gender === opt && styles.genderChipSelected,
                    ]}
                    onPress={() => setGender(opt)}
                  >
                    <Text
                      style={[
                        styles.genderChipText,
                        gender === opt && styles.genderChipTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Date of Birth */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
              />
            </View>

            {/* Save Button */}
            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                saving && styles.disabledBtn,
                pressed && styles.pressed,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  formScroll: {
    paddingHorizontal: 18,
  },
  formContent: {
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  input: {
    height: 46,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 14.5,
    color: "#0F172A",
  },
  genderOptions: {
    flexDirection: "row",
    gap: 10,
  },
  genderChip: {
    flex: 1,
    height: 42,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    justifyContent: "center",
    alignItems: "center",
  },
  genderChipSelected: {
    backgroundColor: "#C52227",
    borderColor: "#C52227",
  },
  genderChipText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#475569",
  },
  genderChipTextSelected: {
    color: "#FFFFFF",
  },
  saveBtn: {
    height: 48,
    backgroundColor: "#C52227",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15.5,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
});
