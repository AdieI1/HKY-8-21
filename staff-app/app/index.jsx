import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { login, getRememberedEmail, setRememberedEmail } from "../services/api";

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

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

      await login(email, password);
      await setRememberedEmail(rememberMe ? email.trim() : null);

      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Login Failed", error?.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
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
});