import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { login } from "../services/api";
import ErrorModal from "../components/ErrorModal";
import SweetToast from "../components/SweetToast";

const { width, height } = Dimensions.get("window");
const truckBg = require("../assets/images/mobileTruckBackground.png");

export default function LoginScreen() {
  const [secure, setSecure] = useState(true);
  const [remember, setRemember] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Feedback states
  const [errorModal, setErrorModal] = useState({ visible: false, message: "" });
  const [toastMessage, setToastMessage] = useState("");

  const router = useRouter();

  const handleLogin = async () => {
    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setErrorModal({
        visible: true,
        message: "Please enter your username or email address.",
      });
      return;
    }

    if (!password) {
      setErrorModal({
        visible: true,
        message: "Please enter your password.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const data = await login(trimmedUser, password);

      if (data?.requires_verification) {
        setErrorModal({
          visible: true,
          message:
            "Your account is created, but your email is not verified yet. Please enter the verification code sent to your email.",
        });
        setTimeout(() => {
          router.push({
            pathname: "/email-verification",
            params: {
              email: data?.user?.email || "",
              username: data?.user?.username || trimmedUser,
            },
          });
        }, 1500);
        return;
      }

      setToastMessage("Login successful! Welcome back.");
      setTimeout(() => {
        router.replace("/(tabs)/home");
      }, 800);
    } catch (error) {
      setErrorModal({
        visible: true,
        message: error?.message || "Invalid username or password. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={truckBg} style={styles.background}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Main Content Form */}
            <View style={styles.container}>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>
                Let us keep your shipments moving.
              </Text>

              {/* Username / Email */}
              <TextInput
                placeholder="Username or Email"
                placeholderTextColor="#bbb"
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />

              {/* Password */}
              <View style={styles.passwordContainer}>
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#bbb"
                  secureTextEntry={secure}
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setSecure(!secure)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={secure ? "eye-off" : "eye"}
                    size={20}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </View>

              {/* Remember me */}
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRemember(!remember)}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {remember && <View style={styles.checked} />}
                </View>
                <Text style={styles.rememberText}>Remember me</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.button, submitting && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {submitting ? "Logging in..." : "Login"}
                </Text>
              </TouchableOpacity>

              {/* Links row: Create account and Forgot password */}
              <View style={styles.linksRow}>
                <TouchableOpacity onPress={() => router.push("/create-account")}>
                  <Text style={styles.linkText}>Create account</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/forgotPassword")}>
                  <Text style={styles.linkText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Custom Error Modal */}
        <ErrorModal
          visible={errorModal.visible}
          message={errorModal.message}
          onClose={() => setErrorModal({ visible: false, message: "" })}
        />

        {/* Sweet Toast Feedback */}
        <SweetToast
          visible={Boolean(toastMessage)}
          message={toastMessage}
          onDismiss={() => setToastMessage("")}
        />
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: Math.max(height * 0.13, 70),
  },
  container: {
    width: "100%",
  },
  title: {
    color: "#fff",
    fontSize: width * 0.085,
    fontWeight: "bold",
    marginBottom: 6,
  },
  subtitle: {
    color: "#ccc",
    marginBottom: 24,
    fontSize: 14,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#fff",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: "#fff",
    fontSize: 15,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 2,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checked: {
    width: 10,
    height: 10,
    backgroundColor: "#E53935",
    borderRadius: 2,
  },
  rememberText: {
    color: "#ccc",
    fontSize: 13,
  },
  button: {
    backgroundColor: "#e11d2e",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#e11d2e",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 16,
  },
  linkText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});