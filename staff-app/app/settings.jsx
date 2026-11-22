import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { useTheme } from "../context/ThemeContext";
import ChangePasswordModal from "../components/Profile/ChangePasswordModal";
import ReportBugModal from "../components/ReportBugModal";
import { changeStaffPassword, getCurrentUser, getSavedUser, logout } from "../services/api";

export default function Settings() {
  const router = useRouter();
  const { darkMode, toggleDarkMode, theme } = useTheme();

  const [notificationSounds, setNotificationSounds] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [bugModalVisible, setBugModalVisible] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem("staff_notification_sounds").then((val) => {
      if (val !== null) {
        setNotificationSounds(val === "true");
      }
    });

    (async () => {
      const user = (await getCurrentUser().catch(() => null)) || (await getSavedUser().catch(() => null));
      if (user?.user_id) {
        setUserId(user.user_id);
      }
    })();
  }, []);

  const handleToggleSounds = async () => {
    const nextVal = !notificationSounds;
    setNotificationSounds(nextVal);
    await AsyncStorage.setItem("staff_notification_sounds", String(nextVal));
  };

  const handleChangePassword = async (newPassword) => {
    if (!userId) {
      throw new Error("User account not loaded yet.");
    }
    await changeStaffPassword(userId, newPassword);
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Temporary Cache",
      "This will clear temporary storage and cached media. You will remain logged in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem("cached_reports");
              Alert.alert("Success", "Temporary cache cleared successfully.");
            } catch {
              Alert.alert("Error", "Could not clear cache.");
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of your Inspector / Staff account?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logout();
            } catch (err) {
              console.log("LOGOUT ERROR:", err);
            } finally {
              router.replace("/");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </Pressable>

        <Text style={[styles.topBarTitle, { color: theme.text }]}>Settings</Text>

        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* PREFERENCES */}
        <Text style={[styles.sectionHeader, { color: theme.secondaryText }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Notification Sounds */}
          <View style={[styles.row, { borderBottomColor: theme.border }]}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="volume-high-outline" size={20} color="#3B82F6" />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Notification Sounds</Text>
                <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
                  Play audio alerts for incoming inspection tasks
                </Text>
              </View>
            </View>

            <Switch
              value={notificationSounds}
              onValueChange={handleToggleSounds}
              trackColor={{ false: "#CBD5E1", true: "#C52227" }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Dark Mode */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: darkMode ? "#3730A3" : "#FEF3C7" }]}>
                <Ionicons
                  name={darkMode ? "moon" : "sunny"}
                  size={20}
                  color={darkMode ? "#A5B4FC" : "#D97706"}
                />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Dark Mode</Text>
                <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
                  {darkMode ? "Dark theme active across all pages" : "Light theme active"}
                </Text>
              </View>
            </View>

            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: "#CBD5E1", true: "#C52227" }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* SECURITY & ACCOUNT */}
        <Text style={[styles.sectionHeader, { color: theme.secondaryText }]}>SECURITY</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#DC2626" />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Change Password</Text>
                <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
                  Update your account access password
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={theme.secondaryText} />
          </Pressable>
        </View>

        {/* SUPPORT */}
        <Text style={[styles.sectionHeader, { color: theme.secondaryText }]}>SUPPORT & FEEDBACK</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Report Bug */}
          <Pressable
            style={({ pressed }) => [
              styles.actionRow,
              { borderBottomWidth: 1, borderBottomColor: theme.border },
              pressed && styles.pressed,
            ]}
            onPress={() => setBugModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="bug-outline" size={20} color="#EA580C" />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Report a Bug</Text>
                <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
                  Report checklist or system glitches
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={theme.secondaryText} />
          </Pressable>

          {/* Clear Cache */}
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
            onPress={handleClearCache}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.iconWrap, { backgroundColor: "#F3F4F6" }]}>
                <Ionicons name="trash-outline" size={20} color="#4B5563" />
              </View>
              <View>
                <Text style={[styles.rowTitle, { color: theme.text }]}>Clear App Cache</Text>
                <Text style={[styles.rowSubtitle, { color: theme.secondaryText }]}>
                  Free up local device space
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={theme.secondaryText} />
          </Pressable>
        </View>

        {/* LOGOUT BUTTON */}
        <View style={styles.logoutWrapper}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutBtn,
              pressed && styles.pressed,
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </Pressable>
        </View>

        <Text style={[styles.footerText, { color: theme.secondaryText }]}>
          HJY Logistics Staff App • v1.0.0
        </Text>
      </ScrollView>

      {/* Modals */}
      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        onChangePassword={handleChangePassword}
      />

      <ReportBugModal
        visible={bugModalVisible}
        onClose={() => setBugModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#C52227",
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 10,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutWrapper: {
    marginTop: 14,
  },
  logoutBtn: {
    height: 50,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1.2,
    borderColor: "#FECACA",
  },
  logoutBtnText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "700",
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 12,
  },
  pressed: {
    opacity: 0.75,
  },
});
