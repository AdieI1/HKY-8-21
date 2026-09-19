import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ImageBackground,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const loadingBg = require("../assets/images/loadingbg.png");
const hjyLogo = require("../assets/images/hjylogo.png");

const { width } = Dimensions.get("window");

export default function AppLoadingScreen({ message }) {
  const insets = useSafeAreaInsets();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 950,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinAnimation.start();

    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ImageBackground
        source={loadingBg}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 24) + 20 }]}>
          {/* Top spacer */}
          <View style={styles.topSpacer} />

          {/* Center Content: Logo & Spinner */}
          <View style={styles.centerSection}>
            <Image
              source={hjyLogo}
              style={styles.logo}
              resizeMode="contain"
            />

            <View style={styles.spinnerContainer}>
              <Animated.View
                style={[
                  styles.spinnerRing,
                  {
                    transform: [{ rotate: spin }],
                  },
                ]}
              />
            </View>

            {message ? (
              <Text style={styles.messageText}>{message}</Text>
            ) : null}
          </View>

          {/* Bottom Branding Text */}
          <View style={styles.bottomSection}>
            <Text style={styles.footerText}>
              Official app for HJY Trucking{"\n"}Services Drivers
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#070B12",
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  topSpacer: {
    flex: 0.8,
  },
  centerSection: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  logo: {
    width: Math.min(width * 0.85, 330),
    height: 110,
    marginBottom: 60,
  },
  spinnerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 60,
    height: 60,
  },
  spinnerRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3.5,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderTopColor: "#FFFFFF",
    borderRightColor: "#E53935",
  },
  messageText: {
    marginTop: 18,
    color: "#E2E8F0",
    fontSize: 14,
    letterSpacing: 0.3,
    fontWeight: "500",
  },
  bottomSection: {
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 16,
  },
  footerText: {
    color: "#E6EDF5",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.25,
    opacity: 0.95,
  },
});
