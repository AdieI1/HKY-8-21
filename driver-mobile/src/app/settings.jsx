import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ImageBackground,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useTheme } from "../context/ThemeContext";
import { logout } from "../../services/api";

export default function Settings() {
  const { darkMode, toggleDarkMode, theme } =
    useTheme();

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background },
      ]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: theme.header },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Settings
        </Text>
      </View>

      <View style={styles.content}>
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.icon },
          ]}
        >
          GENERAL
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
          <TouchableOpacity
            style={styles.row}
            onPress={() => {}}
          >
            <View style={styles.leftSide}>
              <Ionicons
                name="notifications"
                size={21}
                color={theme.icon}
              />

              <Text
                style={[
                  styles.rowText,
                  { color: theme.text },
                ]}
              >
                Notifications
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={theme.icon}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.rowDivider,
              { backgroundColor: theme.border },
            ]}
          />

          <View style={styles.row}>
            <View style={styles.leftSide}>
              <Ionicons
                name="moon"
                size={21}
                color={theme.icon}
              />

              <Text
                style={[
                  styles.rowText,
                  { color: theme.text },
                ]}
              >
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
              thumbColor={
                darkMode ? "#273142" : "#FFFFFF"
              }
            />
          </View>

          <View
            style={[
              styles.rowDivider,
              { backgroundColor: theme.border },
            ]}
          />

          <TouchableOpacity
            style={styles.row}
            onPress={() => {}}
          >
            <View style={styles.leftSide}>
              <Ionicons
                name="person-add"
                size={21}
                color={theme.icon}
              />

              <Text
                style={[
                  styles.rowText,
                  { color: theme.text },
                ]}
              >
                Switch Account
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={theme.icon}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.rowDivider,
              { backgroundColor: theme.border },
            ]}
          />

          <TouchableOpacity
            style={styles.row}
            onPress={handleLogout}
          >
            <View style={styles.leftSide}>
              <Ionicons
                name="log-out"
                size={22}
                color={theme.icon}
              />

              <Text
                style={[
                  styles.rowText,
                  { color: "#E02E2E" },
                ]}
              >
                Log out
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={theme.icon}
            />
          </TouchableOpacity>
        </View>

        <Text
          style={[
            styles.sectionTitle,
            styles.feedbackTitle,
            { color: theme.icon },
          ]}
        >
          FEEDBACK
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
          <TouchableOpacity
            style={styles.row}
            onPress={() => {}}
          >
            <View style={styles.leftSide}>
              <Ionicons
                name="warning-outline"
                size={21}
                color={theme.icon}
              />

              <Text
                style={[
                  styles.rowText,
                  { color: theme.text },
                ]}
              >
                Report a Bug
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={theme.icon}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.rowDivider,
              { backgroundColor: theme.border },
            ]}
          />

          <TouchableOpacity
            style={styles.row}
            onPress={() => {}}
          >
            <View style={styles.leftSide}>
              <Ionicons
                name="paper-plane-outline"
                size={21}
                color={theme.icon}
              />

              <Text
                style={[
                  styles.rowText,
                  { color: theme.text },
                ]}
              >
                View Customer Feedbacks
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color={theme.icon}
            />
          </TouchableOpacity>
        </View>
      </View>
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
  },

  backButton: {
    marginRight: 12,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },

  content: {
    paddingHorizontal: 19,
    paddingTop: 20,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginLeft: 1,
    marginBottom: 5,
  },

  sectionCard: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: "hidden",
    elevation: 4,
  },

  row: {
    height: 43,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },

  leftSide: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  rowText: {
    fontSize: 15,
    marginLeft: 9,
  },

  rowDivider: {
    height: 1,
  },

  feedbackTitle: {
    marginTop: 31,
  },
});