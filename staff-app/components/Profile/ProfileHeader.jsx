import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ProfileHeader({
  name = "John Staff",
  email = "john_staff@gmail.com",
  avatar = require("@/assets/images/staffpic.jpg"),
  onBack,
  onSettingsPress,
}) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/(tabs)/home");
    }
  };

  return (
    <LinearGradient
      colors={["#4F0A11", "#9E1E21"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      {/* Top Bar */}
      <View style={styles.topBar}>
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

        <Text style={styles.topBarTitle}>User Profile</Text>

        <Pressable
          style={({ pressed }) => [
            styles.settingsButton,
            pressed && styles.pressed,
          ]}
          onPress={onSettingsPress}
        >
          <Ionicons
            name="settings-outline"
            size={22}
            color="#C52227"
          />
        </Pressable>
      </View>

      {/* User Info Section */}
      <View style={styles.userSection}>
        <Image
          source={avatar}
          style={styles.avatar}
          resizeMode="cover"
        />

        <View style={styles.userInfo}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
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
    paddingHorizontal: 7,
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
    fontSize: 18,
    fontWeight: "700",
  },

  settingsButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },

  pressed: {
    opacity: 0.7,
  },

  userSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    paddingHorizontal: 4,
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  userInfo: {
    marginLeft: 16,
    flex: 1,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "700",
    marginBottom: 3,
  },

  email: {
    color: "#F0D8D9",
    fontSize: 13,
    fontWeight: "400",
  },
});
