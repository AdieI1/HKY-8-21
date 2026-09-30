import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../../context/ThemeContext";
import { getCurrentUser, getSavedUser, updateDriverProfile, resolveAvatarUrl, API_URL } from "../../../services/api";

const defaultAvatar = require("../../../assets/images/defaultavatar.png");

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { theme, darkMode } = useTheme();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);

  // Phone edit state
  const [phone, setPhone] = useState("");
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);

  const loadProfile = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const cached = await getSavedUser();
      if (cached) {
        setUser(cached);
        setPhone(cached?.phone || "");
      }

      const fresh = await getCurrentUser().catch(() => null);
      if (fresh) {
        // If driver relation not attached, fetch driver record directly
        if (!fresh.driver && fresh.user_id) {
          try {
            const token = await AsyncStorage.getItem("auth_token");
            const res = await fetch(`${API_URL}/drivers`, {
              headers: { Accept: "application/json", Authorization: `Bearer ${token}` }
            });
            const drivers = await res.json();
            const list = Array.isArray(drivers) ? drivers : Array.isArray(drivers?.data) ? drivers.data : [];
            const myDriver = list.find((d) => String(d.user_id) === String(fresh.user_id));
            if (myDriver) {
              fresh.driver = myDriver;
              await AsyncStorage.setItem("auth_user", JSON.stringify(fresh));
            }
          } catch {}
        }

        setUser(fresh);
        setPhone(fresh?.phone || "");
        setImgError(false);
      }
    } catch (err) {
      console.log("Failed to load driver profile:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile(true);
    }, [loadProfile])
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile(true);
  };

  const handlePickImage = async (useCamera = false) => {
    setPhotoPickerVisible(false);
    try {
      const permission = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          `Please grant ${useCamera ? "camera" : "photo library"} access in device settings to update your profile photo.`
        );
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setUploadingPhoto(true);

        const updatedUser = await updateDriverProfile(user?.user_id, {
          photo: {
            uri: asset.uri,
            fileName: asset.fileName || "driver-avatar.jpg",
            mimeType: asset.mimeType || "image/jpeg",
          },
        });

        setImgError(false);
        setUser(updatedUser);
        Alert.alert("Success", "Profile photo updated successfully!");
      }
    } catch (err) {
      console.log("Error updating photo:", err);
      Alert.alert("Upload Error", err.message || "Could not upload profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSavePhone = async () => {
    const cleaned = phone.trim();
    if (!cleaned) {
      Alert.alert("Validation", "Phone number cannot be empty.");
      return;
    }

    if (!/^09\d{9}$/.test(cleaned)) {
      Alert.alert("Invalid Phone", "Please enter a valid 11-digit mobile number (e.g. 09123456789).");
      return;
    }

    setSavingPhone(true);
    try {
      const updatedUser = await updateDriverProfile(user?.user_id, {
        phone: cleaned,
      });

      setUser(updatedUser);
      setIsEditingPhone(false);
      Alert.alert("Success", "Contact number updated successfully! Dispatch team has been notified.");
    } catch (err) {
      console.log("Error saving phone:", err);
      Alert.alert("Save Error", err.message || "Failed to update phone number.");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleCancelPhone = () => {
    setPhone(user?.phone || "");
    setIsEditingPhone(false);
  };

  const [imgError, setImgError] = useState(false);
  const avatarUri = !imgError && user?.profile_photo_url ? resolveAvatarUrl(user.profile_photo_url) : null;
  const avatarSource = avatarUri
    ? {
        uri: avatarUri,
        headers: { "ngrok-skip-browser-warning": "true" },
      }
    : defaultAvatar;

  const licenseNumber =
    user?.driver?.license_number ||
    user?.license_number ||
    (user?.driver && typeof user.driver === "object" ? user.driver.license_number : null) ||
    null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER WITH SAFE AREA INSETS (PREVENTS TOP CUTOFF) */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.header,
            paddingTop: Math.max(insets.top, 16) + 6,
            height: 195 + Math.max(insets.top, 16),
          },
        ]}
      >
        <View style={[styles.headerBar, { backgroundColor: theme.card }]}>
          <Text style={[styles.headerTitle, { color: theme.primary }]}>
            Driver Profile
          </Text>

          <TouchableOpacity
            style={styles.settingsIconBtn}
            onPress={() => router.push("/settings")}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={22} color={theme.icon} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileInfo}>
          {/* TAP-TO-CHANGE AVATAR WITH CAMERA BADGE */}
          <TouchableOpacity
            onPress={() => setPhotoPickerVisible(true)}
            activeOpacity={0.8}
            style={styles.avatarWrapper}
          >
            <Image
              source={avatarSource}
              style={styles.profileImage}
              onError={() => setImgError(true)}
            />
            {uploadingPhoto ? (
              <View style={styles.avatarLoadingOverlay}>
                <ActivityIndicator size="small" color="#FFFFFF" />
              </View>
            ) : (
              <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={14} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.nameContainer}>
            <Text style={styles.name} numberOfLines={1}>
              {user?.full_name || "Driver"}
            </Text>

            <Text style={styles.email} numberOfLines={1}>
              {user?.email || "driver@hkytrucking.com"}
            </Text>

            {Boolean(licenseNumber) && (
              <View style={styles.licenseBadge}>
                <Ionicons name="card-outline" size={12} color="#FFFFFF" />
                <Text style={styles.licenseText}>
                  License: {licenseNumber}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* BODY CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
          />
        }
      >
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={23} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Personal Information
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* LICENSE NUMBER */}
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              License Number:
            </Text>
          </View>
          <View style={[styles.input, styles.lockedInput, { backgroundColor: theme.input }]}>
            <Text style={[styles.inputText, { color: theme.text }]}>
              {licenseNumber || "—"}
            </Text>
          </View>

          {/* PHONE NUMBER (EDITABLE) */}
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              Phone number:
            </Text>
            {!isEditingPhone && (
              <TouchableOpacity
                onPress={() => setIsEditingPhone(true)}
                style={styles.inlineEditBtn}
              >
                <Ionicons name="pencil" size={13} color={theme.primary} />
                <Text style={[styles.inlineEditText, { color: theme.primary }]}>
                  Edit Phone
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditingPhone ? (
            <View style={styles.phoneEditContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.textInput,
                  {
                    backgroundColor: theme.input,
                    color: theme.text,
                    borderColor: theme.primary,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
                placeholder="09XXXXXXXXX"
                placeholderTextColor={theme.secondaryText}
                autoFocus
              />

              <View style={styles.phoneActionRow}>
                <TouchableOpacity
                  style={[styles.smallCancelBtn, { borderColor: theme.border }]}
                  onPress={handleCancelPhone}
                  disabled={savingPhone}
                >
                  <Text style={[styles.smallCancelText, { color: theme.secondaryText }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallSaveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleSavePhone}
                  disabled={savingPhone}
                >
                  {savingPhone ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      <Text style={styles.smallSaveText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.input, { backgroundColor: theme.input }]}>
              <Text style={[styles.inputText, { color: theme.text }]}>
                {user?.phone || "No phone number registered"}
              </Text>
            </View>
          )}

          {/* FULL NAME */}
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              Full Name:
            </Text>
          </View>
          <View style={[styles.input, styles.lockedInput, { backgroundColor: theme.input }]}>
            <Text style={[styles.inputText, { color: theme.text }]}>
              {user?.full_name || "—"}
            </Text>
          </View>

          {/* GENDER */}
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              Gender:
            </Text>
          </View>
          <View style={[styles.genderInput, styles.lockedInput, { backgroundColor: theme.input }]}>
            <Text style={[styles.inputText, { color: theme.text }]}>
              {user?.gender || "Male"}
            </Text>
          </View>

          {/* DATE OF BIRTH */}
          <View style={styles.fieldHeaderRow}>
            <Text style={[styles.label, { color: theme.text }]}>
              Date of Birth:
            </Text>
          </View>
          <View style={[styles.dateContainer, styles.lockedInput, { backgroundColor: theme.input }]}>
            <View style={styles.calendarBox}>
              <Ionicons name="calendar-outline" size={18} color={theme.icon} />
            </View>
            <Text style={[styles.dateText, { color: theme.text }]}>
              {user?.date_of_birth || "Not set"}
            </Text>
          </View>

          {/* EDIT CONTACT BUTTON (IF NOT ALREADY IN EDIT MODE) */}
          {!isEditingPhone && (
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.primary }]}
              onPress={() => setIsEditingPhone(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="call-outline" size={20} color="#FFFFFF" />
              <Text style={styles.editText}>Update Contact Number</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* PHOTO PICKER MODAL */}
      <Modal
        visible={photoPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPhotoPickerVisible(false)}
        >
          <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Change Profile Picture
            </Text>

            <TouchableOpacity
              style={[styles.modalOption, { borderBottomColor: theme.border }]}
              onPress={() => handlePickImage(true)}
            >
              <Ionicons name="camera-outline" size={22} color={theme.primary} />
              <Text style={[styles.modalOptionText, { color: theme.text }]}>
                Take Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, { borderBottomColor: theme.border }]}
              onPress={() => handlePickImage(false)}
            >
              <Ionicons name="images-outline" size={22} color={theme.primary} />
              <Text style={[styles.modalOptionText, { color: theme.text }]}>
                Choose from Library
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelOption}
              onPress={() => setPhotoPickerVisible(false)}
            >
              <Text style={[styles.modalCancelText, { color: theme.secondaryText }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 12,
  },
  headerBar: {
    height: 48,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  settingsIconBtn: {
    position: "absolute",
    right: 12,
    top: 13,
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    marginLeft: 4,
  },
  avatarWrapper: {
    position: "relative",
  },
  profileImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 43,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  nameContainer: {
    marginLeft: 14,
    flex: 1,
  },
  name: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },
  email: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    marginTop: 2,
  },
  licenseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    gap: 4,
  },
  licenseText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  content: {
    paddingBottom: 110,
    paddingTop: 12,
  },
  infoCard: {
    borderRadius: 12,
    marginHorizontal: 12,
    paddingBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  sectionHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginBottom: 8,
  },
  fieldHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 5,
  },
  label: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  inlineEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  inlineEditText: {
    fontSize: 12,
    fontWeight: "700",
  },
  lockedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  input: {
    minHeight: 40,
    borderRadius: 7,
    marginHorizontal: 14,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  textInput: {
    borderWidth: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  lockedInput: {
    opacity: 0.92,
  },
  genderInput: {
    height: 40,
    width: 140,
    borderRadius: 7,
    marginHorizontal: 14,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  dateContainer: {
    height: 40,
    borderRadius: 7,
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  calendarBox: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
  },
  inputText: {
    fontSize: 13,
    fontWeight: "600",
  },
  phoneEditContainer: {
    marginHorizontal: 0,
  },
  phoneActionRow: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginTop: 8,
    gap: 8,
    justifyContent: "flex-end",
  },
  smallCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  smallCancelText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  smallSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    justifyContent: "center",
  },
  smallSaveText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },
  editButton: {
    height: 46,
    borderRadius: 9,
    marginHorizontal: 14,
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    gap: 6,
  },
  editText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  complianceCard: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginHorizontal: 14,
    marginTop: 16,
    alignItems: "flex-start",
    gap: 8,
  },
  complianceText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 14,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalCancelOption: {
    paddingVertical: 14,
    alignItems: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
  },
});