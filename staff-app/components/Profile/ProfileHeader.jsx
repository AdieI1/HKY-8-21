import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "../../context/ThemeContext";

const FALLBACK_AVATAR = require("@/assets/images/staffpic.jpg");

export default function ProfileHeader({
  name = "Inspector Staff",
  email = "staff@hjytrucking.com",
  role = "Inspector",
  avatar,
  avatarLoading = false,
  onAvatarPress,
  onBack,
  onSettingsPress,
}) {
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [avatar]);

  const imageSource =
    !imgError && avatar
      ? typeof avatar === "string"
        ? { uri: avatar }
        : avatar
      : FALLBACK_AVATAR;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/(tabs)/home");
    }
  };

  const { theme } = useTheme();

  return (
    <LinearGradient
      colors={theme?.header || ["#4F0A11", "#9E1E21"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: theme?.surface, borderColor: theme?.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          onPress={handleBack}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        <Text style={[styles.topBarTitle, { color: theme?.primary || "#C52227" }]}>Inspector Profile</Text>

        <View style={styles.topBarSpacer} />
      </View>

      {/* User Info Section */}
      <View style={styles.userSection}>
        <Pressable
          style={({ pressed }) => [
            styles.avatarContainer,
            pressed && styles.pressed,
          ]}
          onPress={onAvatarPress}
        >
          <Image
            source={imageSource}
            onError={() => setImgError(true)}
            style={styles.avatar}
            resizeMode="cover"
          />

          {avatarLoading ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator size="small" color="#FFFFFF" />
            </View>
          ) : (
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          )}
        </Pressable>

        <View style={styles.userInfo}>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.email} numberOfLines={1}>{email}</Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#FACC15" />
            <Text style={styles.roleText}>{role}</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 45,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },

  topBar: {
    height: 46,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  backButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#E32E2E",
    justifyContent: "center",
    alignItems: "center",
  },

  topBarTitle: {
    color: "#C52227",
    fontSize: 17,
    fontWeight: "700",
  },

  topBarSpacer: {
    width: 32,
    height: 32,
  },

  pressed: {
    opacity: 0.75,
  },

  userSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    paddingHorizontal: 4,
  },

  avatarContainer: {
    position: "relative",
  },

  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    backgroundColor: "#7D1518",
  },

  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 43,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E32E2E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  userInfo: {
    marginLeft: 16,
    flex: 1,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
    marginBottom: 2,
  },

  email: {
    color: "#F0D8D9",
    fontSize: 13,
    fontWeight: "400",
    marginBottom: 6,
  },

  roleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },

  roleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
