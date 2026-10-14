import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCurrentCustomer, getSavedUser, refreshCustomerProfile, logout, updateCustomerProfile } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";

const { width, height } = Dimensions.get("window");
const pfpplaceholder = require("../../assets/images/profilepic.png");

const Profile = () => {
  const router = useRouter();
  const { isDark, colors } = useTheme();
  const [customer, setCustomer] = useState(getCurrentCustomer() || {});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("05/16/98");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);


  const populateForm = (user) => {
    if (!user) return;
    const nameParts = String(user.full_name || "").trim().split(/\s+/);
    setFirstName(nameParts[0] || "");
    setLastName(nameParts.slice(1).join(" ") || "");
    setPhone(user.phone || "");
    setGender(user.gender || "Male");
    setDob(user.date_of_birth || "05/16/98");
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshCustomerProfile().then((user) => {
        if (active && user) {
          setCustomer(user);
          populateForm(user);
        }
      });
      return () => {
        active = false;
      };
    }, [])
  );

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera roll permission is needed to change your profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const picked = result.assets[0];
        setSelectedPhoto(picked);
        setSaving(true);
        try {
          const res = await updateCustomerProfile({
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            gender: gender,
            date_of_birth: dob,
            photo: picked,
          });
          if (res?.user) {
            setCustomer(res.user);
            populateForm(res.user);
          }
          Alert.alert("Success", "Profile photo updated successfully!");
        } catch (uploadErr) {
          Alert.alert("Upload Failed", uploadErr?.message || "Failed to update profile picture.");
        } finally {
          setSaving(false);
          setSelectedPhoto(null);
        }
      }
    } catch {
      Alert.alert("Error", "Failed to select image.");
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const mm = (selectedDate.getMonth() + 1).toString().padStart(2, "0");
      const dd = selectedDate.getDate().toString().padStart(2, "0");
      const yy = selectedDate.getFullYear().toString().slice(-2);
      setDob(`${mm}/${dd}/${yy}`);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert("Required Field", "Please enter your first name.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("Required Field", "Please enter your phone number.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        gender: gender.trim(),
        date_of_birth: dob.trim(),
      };
      if (selectedPhoto) {
        payload.photo = selectedPhoto;
      }

      const res = await updateCustomerProfile(payload);
      if (res?.user) {
        setCustomer(res.user);
        populateForm(res.user);
      }
      setSelectedPhoto(null);
      setIsEditing(false);
      Alert.alert("Success", "Your profile has been updated successfully.");
    } catch (error) {
      Alert.alert("Update Failed", error?.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    populateForm(customer);
    setSelectedPhoto(null);
    setIsEditing(false);
  };

  const handleSettingsPress = () => {
    router.push("/settings");
  };

  const avatarUri = selectedPhoto?.uri || customer.profile_photo_url;
  const displayName =
    customer.full_name && String(customer.full_name).trim().length > 0
      ? String(customer.full_name).trim()
      : "Customer";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ paddingBottom: 120, backgroundColor: colors.bg }}
      >
        {/* GRADIENT HEADER */}
        <LinearGradient colors={["#4F0A11", "#9E1E21"]} style={styles.container}>
          {/* HEADER BAR */}
          <View style={[styles.headerBar, { backgroundColor: isDark ? colors.card : "#FFFFFF", borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: isDark ? "#EF4444" : "#CA2A30" }]}>User Profile</Text>

            <TouchableOpacity onPress={handleSettingsPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="settings-outline" size={26} color={isDark ? "#EF4444" : "#CA2A30"} />
            </TouchableOpacity>
          </View>

          {/* PROFILE ROW */}
          <View style={styles.profileRow}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={styles.pfpWrapper}>
              <Image source={avatarUri ? { uri: avatarUri } : pfpplaceholder} style={styles.pfp} />
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <View style={styles.txtContainer}>
              <Text style={styles.welcome}>Welcome!</Text>
              <Text style={styles.Name}>{displayName}</Text>
              <Text style={styles.gmail}>{customer.email || "N/A"}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* PERSONAL INFORMATION CARD */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#CA2A30" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* PHONE NUMBER */}
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Phone number</Text>
            <View style={[styles.valueRow, { backgroundColor: isDark ? "#0F172A" : "#D2D6E0" }]}>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 11))}
                  keyboardType="phone-pad"
                  maxLength={11}
                  placeholder="09817281099"
                  placeholderTextColor={colors.textSubtle}
                />
              ) : (
                <Text style={[styles.valueText, { color: isDark ? "#F8FAFC" : "#444451" }]}>{phone || "N/A"}</Text>
              )}
            </View>
          </View>

          {/* FIRST NAME */}
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>First Name</Text>
            <View style={[styles.valueRow, { backgroundColor: isDark ? "#0F172A" : "#D2D6E0" }]}>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor={colors.textSubtle}
                />
              ) : (
                <Text style={[styles.valueText, { color: isDark ? "#F8FAFC" : "#444451" }]}>{firstName || "N/A"}</Text>
              )}
            </View>
          </View>

          {/* LAST NAME */}
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Last Name</Text>
            <View style={[styles.valueRow, { backgroundColor: isDark ? "#0F172A" : "#D2D6E0" }]}>
              {isEditing ? (
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor={colors.textSubtle}
                />
              ) : (
                <Text style={[styles.valueText, { color: isDark ? "#F8FAFC" : "#444451" }]}>{lastName || "N/A"}</Text>
              )}
            </View>
          </View>

          {/* GENDER */}
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Gender</Text>
            {isEditing ? (
              <View style={styles.genderRow}>
                {["Male", "Female"].map((g) => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setGender(g)}
                    style={[styles.genderChip, gender === g && styles.genderChipActive]}
                  >
                    <Text style={[styles.genderChipText, gender === g && styles.genderChipTextActive]}>{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={[styles.valueRow, { backgroundColor: isDark ? "#0F172A" : "#D2D6E0" }]}>
                <Text style={[styles.valueText, { color: isDark ? "#F8FAFC" : "#444451" }]}>{gender || "N/A"}</Text>
              </View>
            )}
          </View>

          {/* DATE OF BIRTH */}
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Date of Birth</Text>
            <TouchableOpacity
              onPress={() => isEditing && setShowDatePicker(true)}
              activeOpacity={isEditing ? 0.7 : 1}
              style={[styles.valueRow, { backgroundColor: isDark ? "#0F172A" : "#D2D6E0" }]}
            >
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.valueText, { color: isDark ? "#F8FAFC" : "#444451" }]}>{dob || "05/16/98"}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={new Date(1998, 4, 16)}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* ACTION BUTTONS */}
          {isEditing ? (
            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={saving} activeOpacity={0.85}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10, marginTop: height * 0.025 }}>
              <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={18} color="#fff" />
                <Text style={styles.editText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.settingsBtn,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => router.push("/settings")}
                activeOpacity={0.85}
              >
                <Ionicons name="settings-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.settingsBtnText, { color: colors.text }]}>Settings & Preferences</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

    </SafeAreaView>
  );
};

export default Profile;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#EDEDED" },
  container: { paddingTop: height * 0.02, paddingHorizontal: width * 0.05, paddingBottom: height * 0.05, borderBottomLeftRadius: width * 0.15, borderBottomRightRadius: width * 0.15 },
  headerBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: height * 0.03, paddingHorizontal: width * 0.04, paddingVertical: height * 0.012, backgroundColor: "#FFFFFF", borderRadius: width * 0.15 },
  headerTitle: { fontSize: width * 0.06, fontWeight: "700", color: "#CA2A30" },
  backBtn: { backgroundColor: "#E53935", padding: 8, borderRadius: 8 },
  profileRow: { flexDirection: "row", alignItems: "center" },
  pfpWrapper: { position: "relative" },
  pfp: { width: width * 0.26, height: width * 0.26, borderRadius: width * 0.13, backgroundColor: "#D0D0D0" },
  cameraBadge: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#CA2A30", borderRadius: 12, padding: 5, borderWidth: 2, borderColor: "#FFFFFF" },
  txtContainer: { marginLeft: width * 0.04, flex: 1 },
  welcome: { color: "#fff", fontSize: width * 0.04, fontWeight: "500" },
  Name: { color: "#fff", fontSize: width * 0.055, fontWeight: "600" },
  gmail: { color: "#fff", fontSize: width * 0.04, marginTop: 4, opacity: 0.9 },
  card: { backgroundColor: "#fff", marginHorizontal: width * 0.05, marginTop: -height * 0.04, borderRadius: 18, padding: width * 0.05, elevation: 6, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: width * 0.045, fontWeight: "700", color: "#273342" },
  divider: { height: 1, backgroundColor: "#CFCFCF", marginVertical: height * 0.015 },
  infoRow: { marginBottom: height * 0.02 },
  label: { fontSize: width * 0.04, color: "#273342", marginBottom: 4, fontWeight: "500" },
  valueRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#D2D6E0", borderRadius: 999, paddingVertical: height * 0.012, paddingHorizontal: width * 0.04 },
  valueText: { fontSize: width * 0.04, color: "#444451" },
  input: { flex: 1, fontSize: width * 0.04, color: "#222", padding: 0 },
  genderRow: { flexDirection: "row", gap: 10 },
  genderChip: { flex: 1, backgroundColor: "#D2D6E0", borderRadius: 999, paddingVertical: height * 0.012, alignItems: "center" },
  genderChipActive: { backgroundColor: "#CA2A30" },
  genderChipText: { fontSize: width * 0.04, color: "#444451", fontWeight: "600" },
  genderChipTextActive: { color: "#FFFFFF" },
  editBtn: { backgroundColor: "#E53935", paddingVertical: 14, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  editText: { color: "#fff", fontSize: width * 0.04, fontWeight: "600", marginLeft: 6 },
  settingsBtn: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", paddingVertical: 13, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  settingsBtnText: { color: "#334155", fontSize: width * 0.038, fontWeight: "600", marginLeft: 6 },
  buttonGroup: { marginTop: height * 0.025, gap: 10 },
  saveBtn: { backgroundColor: "#2E7D32", paddingVertical: 14, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: width * 0.04, fontWeight: "600", marginLeft: 6 },
  cancelBtn: { backgroundColor: "#ECEFF1", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  cancelBtnText: { color: "#546E7A", fontSize: width * 0.04, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", width: "100%", borderRadius: 20, padding: 20, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F0F0F0", paddingBottom: 12 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#222" },
  modalLabel: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 8 },
  modalCategoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalCatChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  modalCatChipActive: { backgroundColor: "#CA2A30", borderColor: "#CA2A30" },
  modalCatChipText: { fontSize: 12, color: "#4B5563", fontWeight: "600" },
  modalCatChipTextActive: { color: "#FFFFFF" },
  modalInput: { backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 12, fontSize: 14, color: "#111", height: 100, marginBottom: 16 },
  modalSubmitBtn: { backgroundColor: "#CA2A30", paddingVertical: 14, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  modalSubmitText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});