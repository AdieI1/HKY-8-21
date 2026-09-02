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
import { getCurrentCustomer, getSavedUser, logout, updateCustomerProfile } from "../../services/api";

const { width, height } = Dimensions.get("window");
const pfpplaceholder = require("../../assets/images/profilepic.png");

const Profile = () => {
  const router = useRouter();
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
    const nameParts = String(user.full_name || user.username || "").trim().split(/\s+/);
    setFirstName(nameParts[0] || "");
    setLastName(nameParts.slice(1).join(" ") || "");
    setPhone(user.phone || "");
    setGender(user.gender || "Male");
    setDob(user.date_of_birth || "05/16/98");
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getSavedUser().then((user) => {
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
        setSelectedPhoto(result.assets[0]);
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
    Alert.alert("Settings", "Account Options", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login-page");
        },
      },
    ]);
  };

  const avatarUri = selectedPhoto?.uri || customer.profile_photo_url;
  const displayName = customer.full_name || customer.username || "Customer";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* GRADIENT HEADER */}
        <LinearGradient colors={["#4F0A11", "#9E1E21"]} style={styles.container}>
          {/* HEADER BAR */}
          <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>User Profile</Text>

            <TouchableOpacity onPress={handleSettingsPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="settings-outline" size={26} color="#CA2A30" />
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
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#CA2A30" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.divider} />

          {/* PHONE NUMBER */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.valueRow}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, "").slice(0, 11))}
                  keyboardType="phone-pad"
                  placeholder="09817281099"
                  placeholderTextColor="#777987"
                />
              ) : (
                <Text style={styles.valueText}>{phone || "N/A"}</Text>
              )}
            </View>
          </View>

          {/* FIRST NAME */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>First Name</Text>
            <View style={styles.valueRow}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First Name"
                  placeholderTextColor="#777987"
                />
              ) : (
                <Text style={styles.valueText}>{firstName || "N/A"}</Text>
              )}
            </View>
          </View>

          {/* LAST NAME */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Last Name</Text>
            <View style={styles.valueRow}>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last Name"
                  placeholderTextColor="#777987"
                />
              ) : (
                <Text style={styles.valueText}>{lastName || "N/A"}</Text>
              )}
            </View>
          </View>

          {/* GENDER */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Gender</Text>
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
              <View style={styles.valueRow}>
                <Text style={styles.valueText}>{gender || "N/A"}</Text>
              </View>
            )}
          </View>

          {/* DATE OF BIRTH */}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity
              onPress={() => isEditing && setShowDatePicker(true)}
              activeOpacity={isEditing ? 0.7 : 1}
              style={styles.valueRow}
            >
              <Ionicons name="calendar-outline" size={16} color="#555" style={{ marginRight: 6 }} />
              <Text style={styles.valueText}>{dob || "05/16/98"}</Text>
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
            <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={styles.editText}>Edit Profile</Text>
            </TouchableOpacity>
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
  editBtn: { marginTop: height * 0.025, backgroundColor: "#E53935", paddingVertical: 14, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  editText: { color: "#fff", fontSize: width * 0.04, fontWeight: "600", marginLeft: 6 },
  buttonGroup: { marginTop: height * 0.025, gap: 10 },
  saveBtn: { backgroundColor: "#2E7D32", paddingVertical: 14, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: width * 0.04, fontWeight: "600", marginLeft: 6 },
  cancelBtn: { backgroundColor: "#ECEFF1", paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  cancelBtnText: { color: "#546E7A", fontSize: width * 0.04, fontWeight: "600" },
});