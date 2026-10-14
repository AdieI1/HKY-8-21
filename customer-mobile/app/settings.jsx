import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import SweetToast from "../components/SweetToast";
import { useTheme } from "../context/ThemeContext";
import { logout, reportBug, submitReview } from "../services/api";

const { width, height } = Dimensions.get("window");

const PREF_NOTIF_KEY = "@customer_pref_notifications";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleDarkMode, colors } = useTheme();

  // Settings State
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Bug Modal State
  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [bugCategory, setBugCategory] = useState("Booking & Requests");
  const [bugDescription, setBugDescription] = useState("");
  const [submittingBug, setSubmittingBug] = useState(false);

  // Feedback Modal State
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [serviceRating, setServiceRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // SweetToast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg) => {
    setToastMessage(msg);
    setToastVisible(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const notifVal = await AsyncStorage.getItem(PREF_NOTIF_KEY);
        if (notifVal !== null) {
          setNotificationsEnabled(notifVal === "true");
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleToggleNotifications = async (val) => {
    setNotificationsEnabled(val);
    try {
      await AsyncStorage.setItem(PREF_NOTIF_KEY, String(val));
      showToast(val ? "Notifications turned on" : "Notifications turned off");
    } catch {
      // ignore
    }
  };

  const handleToggleDarkMode = async (val) => {
    await toggleDarkMode(val);
    showToast(val ? "Dark mode enabled" : "Light mode enabled");
  };

  const handleSwitchAccount = () => {
    Alert.alert(
      "Switch Account",
      "Do you want to log out and switch to another account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch",
          style: "default",
          onPress: async () => {
            await logout();
            router.replace("/login-page");
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
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

  // Bug Report Submission
  const handleSubmitBug = async () => {
    if (!bugDescription.trim()) {
      Alert.alert("Required", "Please describe the problem you encountered.");
      return;
    }

    try {
      setSubmittingBug(true);
      await reportBug({
        category: bugCategory,
        description: bugDescription.trim(),
        deviceInfo: `${Platform.OS} (Customer Mobile App)`,
      });

      setBugModalVisible(false);
      setBugDescription("");
      setBugCategory("Booking & Requests");
      showToast("Thank you! Your bug report has been submitted.");
    } catch (err) {
      Alert.alert("Submission Failed", err?.message || "Failed to submit bug report.");
    } finally {
      setSubmittingBug(false);
    }
  };

  // Service Feedback Photo Pick
  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Photo library permission is needed to attach a photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedPhoto(result.assets[0]);
      }
    } catch {
      Alert.alert("Error", "Could not pick photo.");
    }
  };

  // Service Feedback Submission
  const handleSubmitFeedback = async () => {
    if (serviceRating === 0) {
      Alert.alert("Rating Required", "Please tap a star to rate our service.");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await submitReview({
        overall_rating: serviceRating,
        driver_rating: serviceRating,
        comments: feedbackText.trim(),
        photo: selectedPhoto,
      });

      setFeedbackModalVisible(false);
      setServiceRating(5);
      setFeedbackText("");
      setSelectedPhoto(null);
      showToast("Thank you! Your review has been submitted.");
    } catch (err) {
      Alert.alert("Submission Failed", err?.message || "Failed to submit review.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <SweetToast
        visible={toastVisible}
        message={toastMessage}
        onHide={() => setToastVisible(false)}
      />

      {/* FULL-BLEED RED GRADIENT HEADER (NO MARGIN GAP ON TOP) */}
      <LinearGradient
        colors={["#4F0A11", "#9E1E21"]}
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Settings</Text>
      </LinearGradient>

      {/* BODY CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: 80 + insets.bottom },
        ]}
      >
        {/* GENERAL SECTION */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>GENERAL</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* NOTIFICATIONS */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
              <Text style={[styles.rowText, { color: colors.text }]}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: isDark ? "#334155" : "#CBD5E1", true: "#DC2626" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* DARK MODE */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="moon-outline" size={22} color={colors.textMuted} />
              <Text style={[styles.rowText, { color: colors.text }]}>Dark Mode</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: isDark ? "#334155" : "#CBD5E1", true: "#DC2626" }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* SWITCH ACCOUNT */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleSwitchAccount}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="people-outline" size={22} color={colors.textMuted} />
              <Text style={[styles.rowText, { color: colors.text }]}>Switch Account</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* LOG OUT */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="log-out-outline" size={22} color="#DC2626" />
              <Text style={[styles.rowText, { color: "#DC2626", fontWeight: "600" }]}>
                Log out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>

        {/* FEEDBACK SECTION */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted, marginTop: 28 }]}>FEEDBACK</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* REPORT A BUG */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setBugModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="warning-outline" size={22} color={colors.textMuted} />
              <Text style={[styles.rowText, { color: colors.text }]}>Report a Bug</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.divider }]} />

          {/* SEND FEEDBACK */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setFeedbackModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="paper-plane-outline" size={22} color={colors.textMuted} />
              <Text style={[styles.rowText, { color: colors.text }]}>Send Feedback</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* BOTTOM NAV */}
      <View
        style={[
          styles.bottomNav,
          {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: colors.navBg,
            borderTopColor: colors.navBorder,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/(tabs)/home")}
        >
          <Ionicons name="home-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/deliveries")}
        >
          <Ionicons name="car-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>Deliveries</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/notifications")}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.replace("/(tabs)/profile")}
        >
          <Ionicons name="person-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.navLabel, { color: colors.textMuted }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* ========================================================= */}
      {/* RATE OUR SERVICES MODAL                                   */}
      {/* ========================================================= */}
      <Modal
        visible={feedbackModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.feedbackCard, { backgroundColor: colors.modalBg, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            {/* CLOSE BUTTON */}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setFeedbackModalVisible(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>

            {/* MODAL TITLE */}
            <View style={styles.feedbackTitleRow}>
              <Ionicons name="star" size={24} color="#F59E0B" />
              <Text style={styles.feedbackTitle}>Rate our Services</Text>
            </View>

            {/* HOW'S OUR SERVICE? */}
            <Text style={[styles.feedbackPrompt, { color: colors.text }]}>Hows our service?</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setServiceRating(star)}
                  activeOpacity={0.7}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={star <= serviceRating ? "star" : "star-outline"}
                    size={36}
                    color={star <= serviceRating ? "#F59E0B" : isDark ? "#475569" : "#CBD5E1"}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.modalDivider, { backgroundColor: colors.divider }]} />

            {/* FEEDBACK INPUT */}
            <View style={styles.feedbackInputHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.feedbackInputLabel, { color: colors.text }]}>
                Feedback <Text style={[styles.optionalText, { color: colors.textSubtle }]}>Optional</Text>
              </Text>
            </View>

            <TextInput
              style={[
                styles.feedbackTextInput,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                  color: colors.text,
                },
              ]}
              placeholder="Tell use more..."
              placeholderTextColor={colors.textSubtle}
              multiline
              numberOfLines={4}
              value={feedbackText}
              onChangeText={setFeedbackText}
              textAlignVertical="top"
            />

            {/* ATTACH PHOTO */}
            <TouchableOpacity
              style={[
                styles.attachBtn,
                {
                  backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                  borderColor: colors.cardBorder,
                },
              ]}
              onPress={handlePickPhoto}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={20} color={colors.textMuted} />
              <Text style={[styles.attachBtnText, { color: colors.text }]}>
                Attach photo <Text style={[styles.optionalText, { color: colors.textSubtle }]}>Optional</Text>
              </Text>
            </TouchableOpacity>

            {/* PHOTO PREVIEW */}
            {selectedPhoto?.uri && (
              <View style={styles.photoPreviewRow}>
                <Image source={{ uri: selectedPhoto.uri }} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setSelectedPhoto(null)}
                >
                  <Ionicons name="close-circle" size={22} color="#DC2626" />
                </TouchableOpacity>
              </View>
            )}

            {/* SUBMIT REVIEW BUTTON */}
            <TouchableOpacity
              style={styles.submitReviewBtn}
              onPress={handleSubmitFeedback}
              disabled={submittingFeedback}
              activeOpacity={0.85}
            >
              {submittingFeedback ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitReviewBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================= */}
      {/* REPORT A BUG MODAL                                        */}
      {/* ========================================================= */}
      <Modal
        visible={bugModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setBugModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.modalBackdrop }]}>
          <View style={[styles.bugCard, { backgroundColor: colors.modalBg, borderColor: colors.cardBorder, borderWidth: isDark ? 1 : 0 }]}>
            <View style={[styles.bugHeader, { borderBottomColor: colors.divider }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="bug-outline" size={20} color="#DC2626" />
                <Text style={[styles.bugTitle, { color: colors.text }]}>Report an Issue / Bug</Text>
              </View>
              <TouchableOpacity onPress={() => setBugModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.55 }}>
              <Text style={[styles.bugLabel, { color: colors.text }]}>Issue Category</Text>
              <View style={styles.bugCategoryRow}>
                {[
                  "Booking & Requests",
                  "Tracking & Map",
                  "Profile & Account",
                  "Billing / Pricing",
                  "Other",
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.bugCatChip,
                      {
                        backgroundColor: bugCategory === cat ? (isDark ? "#7F1D1D" : "#FEE2E2") : colors.chipBg,
                        borderColor: bugCategory === cat ? "#DC2626" : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setBugCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.bugCatChipText,
                        {
                          color: bugCategory === cat ? (isDark ? "#FCA5A5" : "#DC2626") : colors.textMuted,
                          fontWeight: bugCategory === cat ? "700" : "600",
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.bugLabel, { color: colors.text, marginTop: 14 }]}>
                Describe the Problem
              </Text>
              <TextInput
                style={[
                  styles.bugInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="What happened? Please describe the issue in detail..."
                placeholderTextColor={colors.textSubtle}
                multiline
                numberOfLines={4}
                value={bugDescription}
                onChangeText={setBugDescription}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={styles.bugSubmitBtn}
                onPress={handleSubmitBug}
                disabled={submittingBug}
                activeOpacity={0.85}
              >
                {submittingBug ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={16}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.bugSubmitBtnText}>Submit Bug Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  navLabel: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },

  /* RATE OUR SERVICES MODAL */
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  feedbackCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
  },
  feedbackTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#DC2626",
    letterSpacing: -0.3,
  },
  feedbackPrompt: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  starBtn: {
    padding: 2,
  },
  modalDivider: {
    height: 1,
    marginVertical: 12,
  },
  feedbackInputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  feedbackInputLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  optionalText: {
    fontSize: 12,
    fontWeight: "400",
  },
  feedbackTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 85,
    marginBottom: 14,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  attachBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  photoPreviewRow: {
    position: "relative",
    width: 60,
    height: 60,
    marginBottom: 14,
  },
  photoPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#64748B",
  },
  removePhotoBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
  submitReviewBtn: {
    backgroundColor: "#48B02C",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#48B02C",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitReviewBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  /* BUG REPORT MODAL */
  bugCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    maxHeight: height * 0.8,
  },
  bugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  bugTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  bugLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  bugCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  bugCatChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  bugCatChipText: {
    fontSize: 12,
  },
  bugInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    minHeight: 80,
    marginBottom: 14,
  },
  bugSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DC2626",
    borderRadius: 10,
    paddingVertical: 12,
  },
  bugSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
