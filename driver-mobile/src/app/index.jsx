import {
    StyleSheet,
    Text,
    View,
    ImageBackground,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";

import { login } from "../../services/api";

const loginbg = require("../../assets/images/loginbg.png");

export default function Index() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        console.log("================================");
        console.log("LOGIN BUTTON PRESSED");
        console.log("EMAIL:", email);
        console.log("PASSWORD LENGTH:", password.length);
        console.log("================================");

        // EMPTY EMAIL
        if (!email.trim()) {
            Alert.alert(
                "Login Required",
                "Please enter your email."
            );
            return;
        }

        // EMPTY PASSWORD
        if (!password) {
            Alert.alert(
                "Login Required",
                "Please enter your password."
            );
            return;
        }

        try {
            setLoading(true);

            console.log("CALLING BACKEND LOGIN...");

            const data = await login(
                email.trim(),
                password
            );

            console.log("BACKEND LOGIN SUCCESS");
            console.log("USER:", data.user);
            console.log("TOKEN EXISTS:", !!data.token);

            if (!data?.token) {
                throw new Error(
                    "Backend did not return an authentication token."
                );
            }

            /*
             * ONLY navigate after the backend
             * successfully authenticated the user.
             */
            router.replace("/(tabs)/home");

        } catch (error) {
            console.error(
                "BACKEND LOGIN FAILED:",
                error
            );

            Alert.alert(
                "Login Failed",
                error?.message ||
                    "Unable to connect to the server."
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <ImageBackground
                source={loginbg}
                style={styles.background}
                resizeMode="cover"
            >
                <View style={styles.content}>
                    <BlurView
                        intensity={50}
                        tint="dark"
                        style={styles.container}
                    >
                        <View style={styles.header}>
                            <Text style={styles.headerText}>
                                Driver Login
                            </Text>
                        </View>

                        <View style={styles.subheader}>
                            <Text style={styles.subheaderText}>
                                Enter Username and Password
                            </Text>
                        </View>

                        {/* EMAIL */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="Email"
                                placeholderTextColor="#9D9D9D"
                                style={styles.input}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoCorrect={false}
                                editable={!loading}
                            />
                        </View>

                        {/* PASSWORD */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="Password"
                                placeholderTextColor="#9D9D9D"
                                style={styles.input}
                                secureTextEntry={!showPassword}
                                value={password}
                                onChangeText={setPassword}
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                            />

                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() =>
                                    setShowPassword(
                                        !showPassword
                                    )
                                }
                                disabled={loading}
                            >
                                <Ionicons
                                    name={
                                        showPassword
                                            ? "eye-outline"
                                            : "eye-off-outline"
                                    }
                                    size={22}
                                    color="#8C8C8C"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* LOGIN BUTTON */}
                        <TouchableOpacity
                            style={[
                                styles.submitButton,
                                loading &&
                                    styles.disabledButton,
                            ]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <View
                                    style={
                                        styles.loadingRow
                                    }
                                >
                                    <ActivityIndicator
                                        size="small"
                                        color="#FFFFFF"
                                    />

                                    <Text
                                        style={
                                            styles.submitText
                                        }
                                    >
                                        Logging in...
                                    </Text>
                                </View>
                            ) : (
                                <Text
                                    style={
                                        styles.submitText
                                    }
                                >
                                    Submit
                                </Text>
                            )}
                        </TouchableOpacity>
                    </BlurView>
                </View>
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
        width: "100%",
        height: "100%",
    },

    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 15,
    },

    container: {
        width: "100%",
        maxWidth: 360,
        paddingHorizontal: 25,
        paddingVertical: 45,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: "rgba(18,18,28,0.35)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.15)",
    },

    header: {
        marginBottom: 5,
    },

    headerText: {
        fontSize: 38,
        fontWeight: "700",
        color: "#FFFFFF",
    },

    subheader: {
        marginBottom: 28,
    },

    subheaderText: {
        fontSize: 17,
        color: "#C9C9C9",
    },

    inputContainer: {
        height: 50,
        backgroundColor: "#3A3C42",
        borderWidth: 1.3,
        borderColor: "#E53935",
        borderRadius: 25,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 15,
        marginBottom: 18,

        shadowColor: "#E53935",
        shadowOpacity: 0.35,
        shadowRadius: 8,
        shadowOffset: {
            width: 0,
            height: 0,
        },

        elevation: 5,
    },

    input: {
        flex: 1,
        fontSize: 15,
        color: "#FFFFFF",
    },

    submitButton: {
        marginTop: 28,
        height: 52,
        backgroundColor: "#E53935",
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
    },

    disabledButton: {
        opacity: 0.6,
    },

    loadingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },

    submitText: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "700",
    },
});