import React, { useState } from "react";
import {View,Text,TextInput,TouchableOpacity,StyleSheet,ImageBackground,Dimensions,Alert,} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router'
import { login } from '../services/api'

const { width, height } = Dimensions.get("window");

const truckBg = require('../assets/images/mobileTruckBackground.png');

export default function LoginScreen() {
  const [secure, setSecure] = useState(true);
  const [remember, setRemember] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter()

  const handleLogin = async () => {
    try {
      setSubmitting(true);
      await login(username.trim(), password);

      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Login Failed", error?.message || "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ImageBackground source={truckBg} style={styles.background}>
      
      {/* Back button */}
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} >
        <Ionicons name="arrow-back" size={36} color="#fff" />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.container}>
        <Text style={styles.title}>Welcome Back!</Text>
        <Text style={styles.subtitle}> Let us keep your shipments moving.
        </Text>

        {/* Email */}
        <TextInput
          placeholder="Username"
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
          <TouchableOpacity onPress={() => setSecure(!secure)}>
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
        >
          <View style={styles.checkbox}>
            {remember && <View style={styles.checked} />}
          </View>
          <Text style={styles.rememberText}>Remember me</Text>
        </TouchableOpacity>

        {/* Button */}
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? "Logging in..." : "Login"}</Text>
        </TouchableOpacity>

        {/* Forgot password */}
        <TouchableOpacity onPress={() => router.push("/forgotPassword")}>
          <Text style={styles.forgot}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },


  backBtn: {
    position: "absolute",
    top: height * 0.06,
    left: 20,
    zIndex: 10,
  },

  container: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
    paddingBottom: height * 0.08,
  },

  title: {
    color: "#fff",
    fontSize: width * 0.08,
    fontWeight: "bold",
  },

  subtitle: {
    color: "#ccc",
    marginBottom: 20,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 15,
    color: "#fff",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F7373C'
  },

  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F7373C'
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    color: "#fff",
  },

  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },

  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: "#fff",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  checked: {
    width: 10,
    height: 10,
    backgroundColor: "#fff",
  },

  rememberText: {
    color: "#ccc",
  },

  button: {
    backgroundColor: "#e11d2e",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  forgot: {
    color: "#ccc",
    textAlign: "center",
  },
});