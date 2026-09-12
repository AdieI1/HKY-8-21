import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import ProfileHeader from "@/components/Profile/ProfileHeader";
import ProfileInfo from "@/components/Profile/ProfileInfo";
import { getCurrentUser, getSavedUser, resolveImageUrl } from "../../services/api";

const DEFAULT_AVATAR = require("@/assets/images/staffpic.jpg");

export default function Profile() {
  const [user, setUser] = useState({
    name: "Mark Grayson",
    email: "staff@hjytrucking.com",
    phoneNumber: "09123456788",
    firstName: "Mark",
    lastName: "Grayson",
    gender: "Male",
    dateOfBirth: "N/A",
    avatar: DEFAULT_AVATAR,
  });

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
        name: active.full_name || "Staff",
        email: active.email || "",
        phoneNumber: active.phone || "",
        firstName: firstName,
        lastName: lastName,
        gender: active.gender || "Male",
        dateOfBirth: active.date_of_birth || "N/A",
        avatar: avatarSource,
      });
    } catch (e) {
      console.log("LOAD PROFILE ERROR:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={user.name}
          email={user.email}
          avatar={user.avatar}
          onSettingsPress={() => {
            console.log("Settings pressed");
          }}
        />

        <ProfileInfo
          phoneNumber={user.phoneNumber}
          firstName={user.firstName}
          lastName={user.lastName}
          gender={user.gender}
          dateOfBirth={user.dateOfBirth}
          onEditProfile={() => {
            console.log("Edit Profile pressed");
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F8FD",
  },

  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
  },
});