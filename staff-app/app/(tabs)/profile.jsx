import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import ProfileHeader from "@/components/Profile/ProfileHeader";
import ProfileInfo from "@/components/Profile/ProfileInfo";
import { useTheme } from "../../context/ThemeContext";
import {
  getCurrentUser,
  getSavedUser,
  resolveImageUrl,
  updateStaffProfile,
} from "../../services/api";

const DEFAULT_AVATAR = require("@/assets/images/staffpic.jpg");

export default function Profile() {
  const router = useRouter();
  const { theme } = useTheme();

  const [user, setUser] = useState({
    id: null,
    name: "Staff Inspector",
    email: "staff@hjytrucking.com",
    phoneNumber: "N/A",
    firstName: "Staff",
    lastName: "Inspector",
    gender: "Not specified",
    dateOfBirth: "N/A",
    role: "Inspector",
    status: "Active",
    avatar: DEFAULT_AVATAR,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const [saved, current] = await Promise.all([
        getSavedUser().catch(() => null),
        getCurrentUser().catch(() => null),
      ]);
      const active = current || saved;
      if (!active) return;

      const nameParts = (active.full_name || "").trim().split(" ");
      const firstName = nameParts[0] || "Staff";
      const lastName = nameParts.slice(1).join(" ") || "";
      const rawPhoto = active.profile_photo_url || active.profile_photo_path;
      const avatarSource = rawPhoto
        ? { uri: resolveImageUrl(rawPhoto) }
        : DEFAULT_AVATAR;

      setUser({
        id: active.user_id,
        name: active.full_name || "Staff Inspector",
        email: active.email || "",
        phoneNumber: active.phone || "",
        firstName: firstName,
        lastName: lastName,
        gender: active.gender || "Not specified",
        dateOfBirth: active.date_of_birth || "N/A",
        role: active.role?.role_name || "Staff",
        status: active.status || "active",
        avatar: avatarSource,
      });
    } catch (e) {
      console.log("LOAD PROFILE ERROR:", e);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfile();
  }, [loadProfile]);

  // Profile photo picker
  const handlePickAvatar = async () => {
    Alert.alert(
      "Update Profile Photo",
      "Choose a source for your profile picture:",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "Permission Denied",
                "Camera access is required to take a new profile photo."
              );
              return;
            }
            const res = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!res.canceled && res.assets?.[0]) {
              await uploadAvatar(res.assets[0]);
            }
          },
        },
        {
          text: "Choose from Library",
          onPress: async () => {
            const { status } =
              await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== "granted") {
              Alert.alert(
                "Permission Denied",
                "Gallery access is required to select a profile photo."
              );
              return;
            }
            const res = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!res.canceled && res.assets?.[0]) {
              await uploadAvatar(res.assets[0]);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const uploadAvatar = async (asset) => {
    if (!user.id) {
      Alert.alert("Error", "User account not loaded yet.");
      return;
    }

    try {
      setAvatarLoading(true);
      await updateStaffProfile(user.id, {
        photo: {
          uri: asset.uri,
          fileName: asset.fileName || "profile.jpg",
          mimeType: asset.mimeType || "image/jpeg",
        },
      });

      await loadProfile();
      Alert.alert("Success", "Profile photo updated successfully!");
    } catch (err) {
      Alert.alert("Upload Failed", err.message || "Failed to update profile picture.");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#C52227"]}
          />
        }
      >
        <ProfileHeader
          name={user.name}
          email={user.email}
          role={user.role}
          avatar={user.avatar}
          avatarLoading={avatarLoading}
          onAvatarPress={handlePickAvatar}
          onSettingsPress={() => router.push("/settings")}
        />

        <ProfileInfo
          phoneNumber={user.phoneNumber}
          firstName={user.firstName}
          lastName={user.lastName}
          gender={user.gender}
          dateOfBirth={user.dateOfBirth}
          role={user.role}
          status={user.status}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
  },
});