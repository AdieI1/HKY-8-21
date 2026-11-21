import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { login, getRememberedEmail, setRememberedEmail, changeStaffPassword } from "../services/api";

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // OWASP First-Login Password Rotation State
  const [mustChangePasswordModal, setMustChangePasswordModal] = useState(false);
  const [tempPasswordUsed, setTempPasswordUsed] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    getRememberedEmail().then((saved) => {
      if (saved) {
        setEmail(saved);
        setRememberMe(true);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim()) {
      Alert.alert("Required", "Please enter your email address.");
      return;
    }

    if (!password) {
      Alert.alert("Required", "Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const data = await login(email, password);
      await setRememberedEmail(rememberMe ? email.trim() : null);

      // OWASP Enforced First-Login Password Rotation
      if (data?.must_change_password || data?.user?.must_change_password) {
        setTempPasswordUsed(password);
        setMustChangePasswordModal(true);
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Login Failed", error?.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async () => {
    if (!newPassword.trim()) {
      Alert.alert("Required", "Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Password Too Short", "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }

    try {
      setChangingPassword(true);
      await changeStaffPassword(tempPasswordUsed, newPassword, confirmNewPassword);
      Alert.alert(
        "Password Set Successfully!",
        "Your account is now activated with your permanent password. Proceeding to workspace...",
        [
          {
            text: "Continue",
            onPress: () => {
              setMustChangePasswordModal(false);
              router.replace("/(tabs)/home");
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update password.");
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/loginbg.png")}
      style={styles.background}
      resizeMode="cover"
    >
      {/* Dark overlay */}
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.loginContainer}>

            {/* Heading */}
            <View style={styles.headingContainer}>
              <Text style={styles.title}>Good to see you!</Text>

              <Text style={styles.subtitle}>
                Sign in to continue to your workspace
              </Text>
            </View>

            {/* Email */}
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#9B9B9F"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />

            {/* Password */}
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#9B9B9F"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                editable={!loading}
              />

              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#77777C"
                />
              </Pressable>
            </View>

            {/* Remember Me */}
            <Pressable
              style={styles.rememberContainer}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={loading}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe && styles.checkboxChecked,
                ]}
              >
                {rememberMe && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color="#FFFFFF"
                  />
                )}
              </View>

              <Text style={styles.rememberText}>Remember me</Text>
            </Pressable>

            {/* Login Button */}
            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                (pressed || loading) && styles.loginButtonPressed,
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </Pressable>

            {/* Forgot Password */}
            <Pressable
              style={styles.forgotButton}
              onPress={() => {
                Alert.alert("Forgot Password", "Please contact your system administrator to reset your credentials.");
              }}
            >
              <Text style={styles.forgotText}>Forgot Password?</Text>
            </Pressable>

          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* OWASP First-Login Password Rotation Modal */}
      <Modal
        visible={mustChangePasswordModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ width: "100%", alignItems: "center" }}
          >
            <View style={styles.passwordModalCard}>
              <View style={styles.securityHeader}>
                <View style={styles.shieldIconWrap}>
                  <Ionicons name="shield-checkmark" size={26} color="#E53935" />
                </View>
                <Text style={styles.securityTitle}>Security Setup Required</Text>
                <View style={styles.badgeRow}>
                  <Text style={styles.owaspBadge}>OWASP ASVS STANDARD</Text>
                </View>
                <Text style={styles.securityDesc}>
                  You signed in with a temporary password. Under fleet security standards, you must set a new permanent password to activate your staff account.
                </Text>
              </View>

              {/* NEW PASSWORD */}
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.inputLabel}>New Password *</Text>
                <View style={styles.modalInputWrap}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Min. 6 characters"
                    placeholderTextColor="#77777C"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                    editable={!changingPassword}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#77777C"
                    />
                  </Pressable>
                </View>
              </View>

              {/* CONFIRM NEW PASSWORD */}
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.inputLabel}>Confirm Password *</Text>
                <View style={styles.modalInputWrap}>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Repeat new password"
                    placeholderTextColor="#77777C"
                    secureTextEntry={!showConfirmNewPassword}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    autoCapitalize="none"
                    editable={!changingPassword}
                  />
                  <Pressable
                    onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                    style={{ padding: 6 }}
                  >
                    <Ionicons
                      name={showConfirmNewPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#77777C"
                    />
                  </Pressable>
                </View>
              </View>

              {/* SUBMIT BUTTON */}
              <Pressable
                style={[
                  styles.modalSubmitButton,
                  changingPassword && { opacity: 0.7 },
                ]}
                onPress={handleChangePasswordSubmit}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Activate &amp; Continue</Text>
                )}
              </Pressable>

              {/* CANCEL */}
              <Pressable
                style={{ marginTop: 12, paddingVertical: 8, alignItems: "center" }}
                onPress={() => {
                  setMustChangePasswordModal(false);
                  setNewPassword("");
                  setConfirmNewPassword("");
                }}
                disabled={changingPassword}
              >
                <Text style={{ color: "#9B9B9F", fontSize: 13, fontWeight: "600" }}>Cancel &amp; Sign Out</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },

  safeArea: {
    flex: 1,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },

  loginContainer: {
    width: "100%",
    marginTop: 45,
  },

  headingContainer: {
    marginBottom: 17,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 31,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 2,
  },

  subtitle: {
    color: "#C9C9CC",
    fontSize: 15,
    fontWeight: "400",
  },

  input: {
    height: 40,
    backgroundColor: "#38393E",
    borderRadius: 7,
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 20,
  },

  passwordContainer: {
    height: 40,
    backgroundColor: "#38393E",
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 16,
    color: "#FFFFFF",
    fontSize: 14,
  },

  eyeButton: {
    width: 45,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  rememberContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  checkbox: {
    width: 20,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#8D8D92",
    backgroundColor: "#080808",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },

  checkboxChecked: {
    backgroundColor: "#E22F2F",
    borderColor: "#E22F2F",
  },

  rememberText: {
    color: "#FFFFFF",
    fontSize: 14,
  },

  loginButton: {
    height: 51,
    backgroundColor: "#E32E2E",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  loginButtonPressed: {
    opacity: 0.8,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
  },

  forgotButton: {
    alignSelf: "center",
    marginTop: 20,
    paddingVertical: 5,
  },

  forgotText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    textDecorationLine: "underline",
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  passwordModalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#18181f",
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(227,46,46,0.4)",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  securityHeader: {
    alignItems: "center",
    marginBottom: 18,
  },
  shieldIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(227,46,46,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(227,46,46,0.3)",
  },
  securityTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  badgeRow: {
    marginBottom: 10,
  },
  owaspBadge: {
    backgroundColor: "#16a34a",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  securityDesc: {
    color: "#A0A0A5",
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "center",
  },
  inputLabel: {
    color: "#E2E8F0",
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    backgroundColor: "#0d0d12",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2D2D3A",
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
  },
  modalSubmitButton: {
    marginTop: 10,
    height: 48,
    backgroundColor: "#E32E2E",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});