import React, { useEffect, useState } from "react";
import {
  Alert,
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
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import CustomerFeedbackModal from "../../components/CustomerFeedbackModal";
import { useTheme } from "../context/ThemeContext";
import { logout, reportBug } from "../../services/api";

export default function Settings() {
  const { darkMode, toggleDarkMode, theme } = useTheme();

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [bugCategory, setBugCategory] = useState("Navigation / GPS");
  const [bugDescription, setBugDescription] = useState("");
  const [submittingBug, setSubmittingBug] = useState(false);
  const [alertSoundsEnabled, setAlertSoundsEnabled] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("driver_alert_sounds").then((val) => {
      if (val !== null) {
        setAlertSoundsEnabled(val === "true");
      }
    });
  }, []);

  const toggleAlertSounds = async () => {
    const nextVal = !alertSoundsEnabled;
    setAlertSoundsEnabled(nextVal);
    await AsyncStorage.setItem("driver_alert_sounds", String(nextVal));
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of your driver account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.log("LOGOUT ERROR:", error);
          } finally {
            router.replace("/");
          }
        },
      },
    ]);
  };

  const handleSwitchAccount = () => {
    Alert.alert(
      "Switch Account",
      "You will be logged out of your current session so another driver can sign in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Switch Account",
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              console.log("SWITCH ACCOUNT ERROR:", error);
            } finally {
              router.replace("/");
            }
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Clear Cache",
      "This will clear temporary route files and image caches to free up device space.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("active_accepted_delivery_id");
              Alert.alert("Cache Cleared", "Temporary route and app cache cleared successfully.");
            } catch {
              Alert.alert("Error", "Could not clear cache.");
            }
          },
        },
      ]
    );
  };

  const handleSubmitBug = async () => {
    if (!bugDescription.trim()) {
      Alert.alert("Required", "Please describe what went wrong or how to reproduce the bug.");
      return;
    }
    try {
      setSubmittingBug(true);
      const osType = Platform.OS === "android" ? "Android" : Platform.OS === "ios" ? "iOS" : "Mobile";
      await reportBug({
        category: bugCategory,
        description: bugDescription.trim(),
        deviceInfo: `Driver Mobile App (${osType} • Navigation Console)`,
      });
      setBugModalVisible(false);
      setBugDescription("");
      Alert.alert(
        "Report Submitted",
        "Thank you! Your bug report has been forwarded to the IT dispatch operations team."
      );
    } catch (err) {
      Alert.alert("Error", err?.message || "Could not submit bug report. Please try again.");
    } finally {
      setSubmittingBug(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: theme.header }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* GENERAL SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.icon }]}>GENERAL</Text>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          {/* NOTIFICATIONS FEED LINK */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push("/(tabs)/notifications")}
            activeOpacity={0.7}
          >
            <View style={styles.leftSide}>
              <Ionicons name="notifications" size={21} color={theme.icon} />
              <Text style={[styles.rowText, { color: theme.text }]}>
                Notifications Feed
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.icon} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

          {/* AUDIO ALERTS SWITCH */}
          <View style={styles.row}>
            <View style={styles.leftSide}>
              <Ionicons name="volume-high" size={21} color={theme.icon} />
              <Text style={[styles.rowText, { color: theme.text }]}>
                Trip Alert Chimes
              </Text>
            </View>
            <Switch
              value={alertSoundsEnabled}
              onValueChange={toggleAlertSounds}
              trackColor={{
                false: "#C7CBD5",
                true: "#F87171",
              }}
              thumbColor={alertSoundsEnabled ? theme.primary : "#FFFFFF"}
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

          {/* DARK MODE SWITCH */}
          <View style={styles.row}>
            <View style={styles.leftSide}>
              <Ionicons name="moon" size={21} color={theme.icon} />
              <Text style={[styles.rowText, { color: theme.text }]}>
                Dark Mode
              </Text>
            </View>

            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{
                false: "#C7CBD5",
                true: "#6B6E7A",
              }}
              thumbColor={darkMode ? "#273142" : "#FFFFFF"}
            />
          </View>

          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

          {/* SWITCH ACCOUNT */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleSwitchAccount}
            activeOpacity={0.7}
          >
            <View style={styles.leftSide}>
              <Ionicons name="person-add" size={21} color={theme.icon} />
              <Text style={[styles.rowText, { color: theme.text }]}>
                Switch Account
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.icon} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

          {/* LOG OUT */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.leftSide}>
              <Ionicons name="log-out" size={22} color={theme.icon} />
              <Text style={[styles.rowText, { color: "#E02E2E" }]}>
                Log out
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.icon} />
          </TouchableOpacity>
        </View>

        {/* FEEDBACK SECTION */}
        <Text style={[styles.sectionTitle, styles.feedbackTitle, { color: theme.icon }]}>
          FEEDBACK & CUSTOMER RATINGS
        </Text>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          {/* VIEW CUSTOMER FEEDBACKS */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setFeedbackModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.leftSide}>
              <Ionicons name="star-outline" size={21} color="#F59E0B" />
              <Text style={[styles.rowText, { color: theme.text }]}>
                View Customer Feedbacks
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.icon} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

          {/* REPORT A BUG */}
          <TouchableOpacity
            style={styles.row}
            onPress={() => setBugModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.leftSide}>
              <Ionicons name="warning-outline" size={21} color={theme.icon} />
              <Text style={[styles.rowText, { color: theme.text }]}>
                Report an App Bug
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.icon} />
          </TouchableOpacity>
        </View>

        {/* STORAGE & SYSTEM SECTION */}
        <Text style={[styles.sectionTitle, styles.feedbackTitle, { color: theme.icon }]}>
          STORAGE & SYSTEM
        </Text>

        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          {/* CLEAR CACHE */}
          <TouchableOpacity
            style={styles.row}
            onPress={handleClearCache}
            activeOpacity={0.7}
          >
            <View style={styles.leftSide}>
              <Ionicons name="trash-bin-outline" size={20} color={theme.icon} />
              <Text style={[styles.rowText, { color: theme.text }]}>
                Clear Local Cache
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={theme.icon} />
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: theme.border }]} />

          {/* APP VERSION */}
          <View style={styles.row}>
            <View style={styles.leftSide}>
              <Ionicons name="information-circle-outline" size={21} color={theme.icon} />
              <Text style={[styles.rowText, { color: theme.text }]}>
                App Version
              </Text>
            </View>
            <Text style={[styles.versionText, { color: theme.secondaryText }]}>
              v1.0.4 (2026)
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* CUSTOMER FEEDBACK MODAL */}
      <CustomerFeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />

      {/* REPORT A BUG MODAL */}
      <Modal
        visible={bugModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBugModalVisible(false)}
      >
        <View style={styles.bugModalOverlay}>
          <View style={[styles.bugModalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.bugModalHeader}>
              <Text style={[styles.bugModalTitle, { color: theme.text }]}>
                Report an App Bug
              </Text>
              <TouchableOpacity onPress={() => setBugModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color={theme.icon} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.bugModalSubtitle, { color: theme.secondaryText }]}>
              Let us know what issue you encountered so our technical team can fix it quickly.
            </Text>

            {/* CATEGORIES */}
            <Text style={[styles.inputLabel, { color: theme.text }]}>Module:</Text>
            <View style={styles.categoryRow}>
              {["Navigation / GPS", "Trip Checklists", "Status Updates", "Other"].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: bugCategory === cat ? theme.primary : theme.input,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setBugCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: bugCategory === cat ? "#FFFFFF" : theme.text },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* DESCRIPTION */}
            <Text style={[styles.inputLabel, { color: theme.text }]}>Description:</Text>
            <TextInput
              style={[
                styles.bugTextInput,
                {
                  backgroundColor: theme.input,
                  color: theme.text,
                  borderColor: theme.border,
                },
              ]}
              multiline
              numberOfLines={4}
              placeholder="Explain what happened, what screen you were on, or any error message..."
              placeholderTextColor={theme.secondaryText}
              value={bugDescription}
              onChangeText={setBugDescription}
            />

            <View style={styles.bugActions}>
              <TouchableOpacity
                style={[styles.bugCancelBtn, { borderColor: theme.border }]}
                onPress={() => setBugModalVisible(false)}
              >
                <Text style={[styles.bugCancelText, { color: theme.secondaryText }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.bugSubmitBtn, { backgroundColor: theme.primary }]}
                onPress={handleSubmitBug}
                disabled={submittingBug}
              >
                <Ionicons name="send" size={15} color="#FFFFFF" />
                <Text style={styles.bugSubmitText}>
                  {submittingBug ? "Submitting..." : "Submit Report"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 69,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    elevation: 3,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  feedbackTitle: {
    marginTop: 22,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowText: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  versionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bugModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  bugModalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    elevation: 6,
  },
  bugModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bugModalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  bugModalSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bugTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 13.5,
    minHeight: 90,
    marginBottom: 18,
  },
  bugActions: {
    flexDirection: "row",
    gap: 10,
  },
  bugCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bugCancelText: {
    fontSize: 14,
    fontWeight: "700",
  },
  bugSubmitBtn: {
    flex: 1.6,
    height: 44,
    borderRadius: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bugSubmitText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});