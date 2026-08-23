import {StyleSheet,Text,View,ImageBackground,TouchableOpacity,Dimensions,Image,} from "react-native";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";


const { width, height } = Dimensions.get("window");

// Assets
const truckBg = require('../assets/images/mobileTruckBackground.png');
const Logo = require('../assets/images/HJYLOGO.png');

const GetStarted = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground source={truckBg} style={styles.container} resizeMode="cover">

        <View style={styles.content}>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image source={Logo} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={{ flex: 1 }} />

          {/* Text */}
          <View>
            <Text style={styles.title}>
              Reliable service{"\n"}you can count on.
            </Text>

            <Text style={styles.subtitle}>
              We deliver your cargo safely,{"\n"}on time, and with care.
            </Text>
          </View>

          {/* Bottom */}
          <View style={styles.bottom}>

            {/* Get Started Button */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push("/create-account")}
            >
              <Text style={styles.buttonText}>Get Started</Text>
              
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              onPress={() => router.push("/login-page")}
            >
              <Text style={styles.login}>
                Already have an account?{" "}
                <Text style={styles.loginBold}>Login</Text>
              </Text>
            </TouchableOpacity>

          </View>

        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

export default GetStarted;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#000",
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.06,
    paddingBottom: height * 0.04,
  },

  logoContainer: {
    alignItems: "center",
    marginTop: height * 0.04,
    width: width * 0.9,
    height: height * 0.3,
    justifyContent: "center",
  },

  title: {
    color: "#fff",
    fontSize: width * 0.07,
    fontWeight: "bold",
    marginBottom: height * 0.015,
  },
  subtitle: {
    color: "#ddd",
    fontSize: width * 0.04,
    marginBottom: height * 0.04,
  },

  bottom: {
    width: "100%",
  },

  button: {
    backgroundColor: "#DE2226",
    paddingVertical: height * 0.02,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: height * 0.015,
  },

  buttonText: {
    color: "#fff",
    fontSize: width * 0.045,
    fontWeight: "600",
  },

  login: {
    color: "#ccc",
    textAlign: "center",
    fontSize: width * 0.035,
  },

  loginBold: {
    color: "#fff",
    fontWeight: "bold",
  },
});