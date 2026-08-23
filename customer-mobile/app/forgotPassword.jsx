import {View,Text,TextInput,TouchableOpacity,StyleSheet,ImageBackground,Dimensions,} from "react-native";
import React from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get("window");
const truckBg = require("../assets/images/mobileTruckBackground.png");

export default function ForgotPassword() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
    <ImageBackground source={truckBg} style={styles.background}>

      {/* Back button */}
      <TouchableOpacity
        onPress={() => router.back()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={36} color="#fff" />
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.container}>

        <Text style={styles.title}>
          Forgot Your {"\n"}Password?
        </Text>

        <Text style={styles.subtitle}>
          No problem. Just enter your email address{"\n"}
          to receive a reset link.
        </Text>

        {/* Email address */}
        <TextInput
          placeholder="Email Address"
          placeholderTextColor="#ccc"
          style={styles.input}
        />

        <TouchableOpacity style={styles.button}> 
            <Text style={styles.Submit}> Submit </Text>
        </TouchableOpacity>

      </View>
    </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

   safe: {
    flex: 1,
    backgroundColor: "#000",
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
    fontWeight: "bold",
    fontSize: width * 0.09,
  },

  subtitle: {
    marginTop: 5,
    color: "#A19898",
    fontSize: width * 0.04,
  },

  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    padding: 15,
    color: "#fff",
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#F7373C',
    marginBottom: 25
  },

  Submit: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },

  button: {
    backgroundColor: "#e11d2e",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  }
  
});