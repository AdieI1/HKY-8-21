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
import { getCurrentUser, getSavedUser, getMyRewardStatus, updateDriverProfile, resolveAvatarUrl, setDriverDutyStatus, getMyLeaves, submitDriverLeave, cancelDriverLeave, API_URL } from "../../../services/api";

const defaultAvatar = require("../../../assets/images/defaultavatar.png");

const getLocalDateString = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const LEAVE_TYPE_OPTIONS = [
  { key: "sick_leave", label: "Sick Leave" },
  { key: "emergency_absence", label: "Emergency Absence" },
  { key: "day_off", label: "Day Off" },
  { key: "vacation", label: "Vacation" },
];

const DUTY_BADGE_MAP = {
  available: { label: "On Duty (Available)", bg: "#DCFCE7", text: "#15803D" },
  busy: { label: "On Active Delivery", bg: "#DBEAFE", text: "#1D4ED8" },
  pending_leave: { label: "Leave Pending Review", bg: "#FEF3C7", text: "#B45309" },
  on_leave: { label: "On Approved Leave", bg: "#FFEDD5", text: "#C2410C" },
  off_duty: { label: "Off Duty", bg: "#F1F5F9", text: "#475569" },
  offline: { label: "Off Duty", bg: "#F1F5F9", text: "#475569" },
};

const LEAVE_STATUS_STYLES = {
  pending: { bg: "#FEF3C7", text: "#B45309", label: "Pending Review" },
  approved: { bg: "#DCFCE7", text: "#15803D", label: "Approved" },
  rejected: { bg: "#FEE2E2", text: "#B91C1C", label: "Rejected" },
  cancelled: { bg: "#F1F5F9", text: "#475569", label: "Cancelled" },
  completed: { bg: "#E0E7FF", text: "#4338CA", label: "Completed" },
};

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { theme, darkMode } = useTheme();

  const [user, setUser] = useState(null);
  const [driverReward, setDriverReward] = useState(null);
  const [myLeaves, setMyLeaves] = useState([]);
  const [dutyUpdating, setDutyUpdating] = useState(false);
  const [dutyFeedback, setDutyFeedback] = useState("");
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [leaveType, setLeaveType] = useState("sick_leave");
  const [startDate, setStartDate] = useState(() => getLocalDateString(0));
  const [endDate, setEndDate] = useState(() => getLocalDateString(0));
  const [leaveReason, setLeaveReason] = useState("");
  const [leaveAttachment, setLeaveAttachment] = useState(null);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const [cancellingLeaveId, setCancellingLeaveId] = useState(null);

  const refreshDutyAndLeaves = async () => {
    try {
      const [freshUser, leavesRes] = await Promise.all([
        getCurrentUser().catch(() => null),
        getMyLeaves().catch(() => []),
      ]);
      if (freshUser) setUser(freshUser);
      if (Array.isArray(leavesRes)) setMyLeaves(leavesRes);
    } catch {
      // keep existing profile state on transient error
    }
  };

  const handleToggleDutyStatus = async () => {
    const currentStatus = user?.driver?.availability_status || "off_duty";
    if (dutyUpdating || ["busy", "on_leave", "pending_leave"].includes(currentStatus)) {
      return;
    }
    const targetStatus = currentStatus === "available" ? "off_duty" : "available";
    setDutyUpdating(true);
    setDutyFeedback("");
    try {
      const res = await setDriverDutyStatus(targetStatus);
      setUser((prev) =>
        prev
          ? {
              ...prev,
              driver: res?.driver || { ...(prev.driver || {}), availability_status: targetStatus },
            }
          : prev
      );
      setDutyFeedback(
        targetStatus === "available"
          ? "You are now On Duty and open for dispatch."
          : "You are now Off Duty."
      );
      await refreshDutyAndLeaves();
    } catch (err) {
      setDutyFeedback(err?.message || "Failed to update duty status.");
    } finally {
      setDutyUpdating(false);
    }
  };

  const openLeaveRequestModal = (presetType = "sick_leave") => {
    const today = getLocalDateString(0);
    setLeaveType(presetType);
    setStartDate(today);
    setEndDate(today);
    setLeaveReason("");
    setLeaveAttachment(null);
    setLeaveError("");
    setLeaveModalVisible(true);
  };

  const pickLeaveAttachment = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm?.granted) {
        setLeaveError("Photo library permission is needed to attach a document.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
      });
      if (!res.canceled && res.assets?.length) {
        const asset = res.assets[0];
        setLeaveAttachment({
          uri: asset.uri,
          name: asset.fileName || `leave_${Date.now()}.jpg`,
          type: asset.mimeType || "image/jpeg",
        });
      }
    } catch {
      setLeaveError("Could not select image attachment.");
    }
  };

  const handleSubmitLeaveRequest = async () => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    const sDate = startDate.trim();
    const eDate = endDate.trim();
    const trimmedReason = leaveReason.trim();

    if (!datePattern.test(sDate) || !datePattern.test(eDate)) {
      setLeaveError("Use YYYY-MM-DD format for Start and End dates.");
      return;
    }
    if (eDate < sDate) {
      setLeaveError("End date must be on or after Start date.");
      return;
    }
    if (trimmedReason.length < 3) {
      setLeaveError("Please enter a brief reason (at least 3 characters).");
      return;
    }

    setSubmittingLeave(true);
    setLeaveError("");
    try {
      const res = await submitDriverLeave({
        leaveType,
        startDate: sDate,
        endDate: eDate,
        reason: trimmedReason,
        attachment: leaveAttachment,
      });
      if (res?.driver) {
        setUser((prev) => (prev ? { ...prev, driver: res.driver } : prev));
      }
      setLeaveModalVisible(false);
      setDutyFeedback(res?.message || "Leave request submitted.");
      await refreshDutyAndLeaves();
    } catch (err) {
      setLeaveError(err?.message || "Failed to submit leave request.");
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelLeaveRequest = async (leaveId) => {
    setCancellingLeaveId(leaveId);
    setDutyFeedback("");
    try {
      const res = await cancelDriverLeave(leaveId);
      setDutyFeedback(res?.message || "Leave request cancelled.");
      await refreshDutyAndLeaves();
    } catch (err) {
      setDutyFeedback(err?.message || "Unable to cancel leave request.");
    } finally {
      setCancellingLeaveId(null);
    }
  };
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

      const [fresh, rewardRes, leavesRes] = await Promise.all([
        getCurrentUser().catch(() => null),
        getMyRewardStatus().catch(() => null),
        getMyLeaves().catch(() => []),
      ]);
      if (rewardRes?.driver_reward) {
        setDriverReward(rewardRes.driver_reward);
      }
      if (Array.isArray(leavesRes)) {
        setMyLeaves(leavesRes);
      }
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

            <View style={styles.badgeRow}>
              {Boolean(licenseNumber) && (
                <View style={styles.licenseBadge}>
                  <Ionicons name="card-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.licenseText}>
                    License: {licenseNumber}
                  </Text>
                </View>
              )}
              {driverReward?.is_top_driver && (
                <View style={styles.topDriverBadge}>
                  <Ionicons name="trophy" size={12} color="#92400E" />
                  <Text style={styles.topDriverBadgeText}>#1 Top Driver</Text>
                </View>
              )}
            </View>
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
        {driverReward?.is_top_driver && (
          <View style={styles.rewardCard}>
            <View style={styles.rewardCardLeft}>
              <View style={styles.rewardIconWrap}>
                <Ionicons name="trophy" size={20} color="#B45309" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rewardCardTitle}>#1 Top Driver Recognition</Text>
                <Text style={styles.rewardCardSub}>
                  {driverReward.completed_deliveries || 0} completed deliveries • Top Leaderboard Rank
                </Text>
              </View>
            </View>
            <View style={styles.bonusPill}>
              <Text style={styles.bonusPillText}>
                +₱{Number(driverReward.bonus_amount || 1000).toLocaleString("en-PH")} Bonus
              </Text>
            </View>
          </View>
        )}
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

          {/* DUTY ATTENDANCE & SICK LEAVE / EMERGENCY ABSENCE */}
          {(() => {
            const dutyStatus = user?.driver?.availability_status || "off_duty";
            const badgeMeta = DUTY_BADGE_MAP[dutyStatus] || DUTY_BADGE_MAP.off_duty;
            const lockedFromDuty = ["busy", "on_leave", "pending_leave"].includes(dutyStatus);
            const isOnDuty = dutyStatus === "available";
            return (
              <View style={[styles.leaveCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.leaveHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.leaveTitle, { color: theme.text }]}>Duty & Leave Attendance</Text>
                    <Text style={[styles.leaveSubtitle, { color: theme.textSecondary }]}>
                      Go Off Duty after your shift or file Sick Leave / Emergency Absence.
                    </Text>
                  </View>
                  <View style={[styles.dutyStatusPill, { backgroundColor: badgeMeta.bg }]}>
                    <Text style={[styles.dutyStatusText, { color: badgeMeta.text }]}>{badgeMeta.label}</Text>
                  </View>
                </View>

                {dutyFeedback ? (
                  <Text style={[styles.dutyFeedbackText, { color: theme.primary }]}>{dutyFeedback}</Text>
                ) : null}

                <View style={styles.leaveActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.dutyToggleBtn,
                      {
                        backgroundColor: lockedFromDuty
                          ? "#CBD5E1"
                          : isOnDuty
                          ? "#F97316"
                          : "#16A34A",
                      },
                    ]}
                    disabled={dutyUpdating || lockedFromDuty}
                    onPress={handleToggleDutyStatus}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isOnDuty ? "moon-outline" : "checkmark-circle-outline"}
                      size={18}
                      color="#FFFFFF"
                    />
                    <Text style={styles.dutyToggleBtnText}>
                      {dutyUpdating
                        ? "Updating..."
                        : isOnDuty
                        ? "Go Off Duty"
                        : "Go On Duty"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.applyLeaveBtn, { borderColor: "#DC2626", backgroundColor: "#FEF2F2" }]}
                    onPress={() => openLeaveRequestModal("sick_leave")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="medkit-outline" size={18} color="#DC2626" />
                    <Text style={styles.applyLeaveBtnText}>Apply Leave / Absence</Text>
                  </TouchableOpacity>
                </View>

                {myLeaves.length > 0 && (
                  <View style={[styles.leaveHistoryBox, { borderTopColor: theme.border }]}>
                    <Text style={[styles.leaveHistoryHeading, { color: theme.textSecondary }]}>
                      Recent Leave Requests
                    </Text>
                    {myLeaves.slice(0, 4).map((lv) => {
                      const st = LEAVE_STATUS_STYLES[lv.status] || LEAVE_STATUS_STYLES.pending;
                      const typeLabel =
                        LEAVE_TYPE_OPTIONS.find((t) => t.key === lv.leave_type)?.label ||
                        lv.leave_type;
                      return (
                        <View
                          key={lv.leave_id}
                          style={[styles.leaveItemRow, { borderColor: theme.border }]}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={styles.leaveItemTop}>
                              <Text style={[styles.leaveItemType, { color: theme.text }]}>
                                {typeLabel}
                              </Text>
                              <View style={[styles.leaveStatusPill, { backgroundColor: st.bg }]}>
                                <Text style={[styles.leaveStatusText, { color: st.text }]}>
                                  {st.label}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.leaveItemDates, { color: theme.textSecondary }]}>
                              {lv.start_date} to {lv.end_date}
                            </Text>
                            {lv.reason ? (
                              <Text
                                style={[styles.leaveItemReason, { color: theme.textSecondary }]}
                                numberOfLines={2}
                              >
                                {lv.reason}
                              </Text>
                            ) : null}
                            {lv.review_notes ? (
                              <Text style={styles.leaveReviewNotes}>
                                Note: {lv.review_notes}
                              </Text>
                            ) : null}
                          </View>
                          {lv.status === "pending" && (
                            <TouchableOpacity
                              style={styles.cancelLeaveBtn}
                              disabled={cancellingLeaveId === lv.leave_id}
                              onPress={() => handleCancelLeaveRequest(lv.leave_id)}
                            >
                              <Text style={styles.cancelLeaveBtnText}>
                                {cancellingLeaveId === lv.leave_id ? "..." : "Cancel"}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })()}
        </View>
      </ScrollView>

      {/* LEAVE / EMERGENCY ABSENCE MODAL */}
      <Modal
        visible={leaveModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLeaveModalVisible(false)}
      >
        <View style={styles.leaveModalBackdrop}>
          <View style={[styles.leaveModalCard, { backgroundColor: theme.card }]}>
            <View style={styles.leaveModalHeader}>
              <Text style={[styles.leaveModalTitle, { color: theme.text }]}>
                Apply for Leave / Absence
              </Text>
              <TouchableOpacity onPress={() => setLeaveModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Leave Type</Text>
            <View style={styles.chipWrap}>
              {LEAVE_TYPE_OPTIONS.map((opt) => {
                const selected = leaveType === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.typeChip,
                      selected
                        ? { backgroundColor: theme.primary, borderColor: theme.primary }
                        : { backgroundColor: "transparent", borderColor: theme.border },
                    ]}
                    onPress={() => setLeaveType(opt.key)}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        { color: selected ? "#FFFFFF" : theme.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.quickDateRow}>
              <TouchableOpacity
                style={[styles.quickDateBtn, { borderColor: theme.border }]}
                onPress={() => {
                  const d = getLocalDateString(0);
                  setStartDate(d);
                  setEndDate(d);
                }}
              >
                <Text style={[styles.quickDateText, { color: theme.text }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateBtn, { borderColor: theme.border }]}
                onPress={() => {
                  const d = getLocalDateString(1);
                  setStartDate(d);
                  setEndDate(d);
                }}
              >
                <Text style={[styles.quickDateText, { color: theme.text }]}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateBtn, { borderColor: theme.border }]}
                onPress={() => {
                  setStartDate(getLocalDateString(0));
                  setEndDate(getLocalDateString(1));
                }}
              >
                <Text style={[styles.quickDateText, { color: theme.text }]}>Today–Tomorrow</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  Start Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={[
                    styles.leaveInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: darkMode ? "#1E293B" : "#F8FAFC" },
                  ]}
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  End Date (YYYY-MM-DD)
                </Text>
                <TextInput
                  style={[
                    styles.leaveInput,
                    { color: theme.text, borderColor: theme.border, backgroundColor: darkMode ? "#1E293B" : "#F8FAFC" },
                  ]}
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reason</Text>
            <TextInput
              style={[
                styles.leaveTextArea,
                { color: theme.text, borderColor: theme.border, backgroundColor: darkMode ? "#1E293B" : "#F8FAFC" },
              ]}
              value={leaveReason}
              onChangeText={setLeaveReason}
              placeholder="Explain why you need leave or emergency absence..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.attachBtn, { borderColor: theme.border }]}
              onPress={pickLeaveAttachment}
            >
              <Ionicons name="attach-outline" size={18} color={theme.primary} />
              <Text style={[styles.attachBtnText, { color: theme.text }]} numberOfLines={1}>
                {leaveAttachment ? `Attached: ${leaveAttachment.name}` : "Attach Med Cert / Proof (Optional)"}
              </Text>
            </TouchableOpacity>

            {leaveError ? <Text style={styles.leaveErrorText}>{leaveError}</Text> : null}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                onPress={() => setLeaveModalVisible(false)}
                disabled={submittingLeave}
              >
                <Text style={[styles.leaveModalCancelText, { color: theme.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleSubmitLeaveRequest}
                disabled={submittingLeave}
              >
                <Text style={styles.modalSubmitText}>
                  {submittingLeave ? "Submitting..." : "Submit Request"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  topDriverBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
    gap: 4,
  },
  topDriverBadgeText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "800",
  },
  rewardCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rewardCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  rewardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  rewardCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400E",
  },
  rewardCardSub: {
    fontSize: 11.5,
    color: "#B45309",
    marginTop: 2,
  },
  bonusPill: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bonusPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#047857",
  },
  leaveCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  leaveHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  leaveTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  leaveSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  dutyStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  dutyStatusText: {
    fontSize: 11,
    fontWeight: "800",
  },
  dutyFeedbackText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 10,
  },
  leaveActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  dutyToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
  },
  dutyToggleBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  applyLeaveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
  },
  applyLeaveBtnText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
  leaveHistoryBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  leaveHistoryHeading: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  leaveItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 10,
  },
  leaveItemTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  leaveItemType: {
    fontSize: 13,
    fontWeight: "700",
  },
  leaveStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  leaveStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  leaveItemDates: {
    fontSize: 12,
    marginTop: 3,
  },
  leaveItemReason: {
    fontSize: 12,
    marginTop: 2,
  },
  leaveReviewNotes: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 3,
  },
  cancelLeaveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  cancelLeaveBtnText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "700",
  },
  leaveModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    padding: 18,
  },
  leaveModalCard: {
    borderRadius: 16,
    padding: 18,
  },
  leaveModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  leaveModalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  quickDateRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  quickDateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickDateText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  leaveInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  leaveTextArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  leaveErrorText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  leaveModalCancelText: {
    fontSize: 14,
    fontWeight: "700",
  },
  modalSubmitBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
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