import {
    StyleSheet,
    Text,
    View,
    ImageBackground,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import AppLoadingScreen from "../../components/AppLoadingScreen";
import PasswordStrengthMeter from "../../components/PasswordStrengthMeter";

import {
    login,
    getToken,
    getDelivery,
    getMyDeliveries,
    getActiveAcceptedDeliveryId,
    setActiveAcceptedDeliveryId,
    clearActiveAcceptedDeliveryId,
    changeDriverPassword,
} from "../../services/api";

const loginbg = require("../../assets/images/loginbg.png");

export default function Index() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    // OWASP Enforced First-Login Password Rotation State
    const [mustChangePasswordModal, setMustChangePasswordModal] = useState(false);
    const [tempPasswordUsed, setTempPasswordUsed] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);

    const resumeDeliveryIfActive = async (deliveryId) => {
        if (!deliveryId) return false;
        try {
            const delivery = await getDelivery(deliveryId);
            if (!delivery || ["completed", "returning_to_hq", "rejected"].includes(delivery.status)) {
                await clearActiveAcceptedDeliveryId();
                return false;
            }
            await setActiveAcceptedDeliveryId(delivery.delivery_id);
            const hasPreTrip = delivery?.checklists?.some((e) => e.type === "pre_trip");
            const hasAdvanced = delivery?.status && !["assigned", "pending"].includes(delivery.status);

            if (hasPreTrip || hasAdvanced) {
                router.replace({
                    pathname: "/navigation",
                    params: { deliveryId: String(deliveryId) },
                });
            } else {
                router.replace({
                    pathname: "/pretripcheck",
                    params: { deliveryId: String(deliveryId) },
                });
            }
            return true;
        } catch {
            return false;
        }
    };

    const navigateAfterLogin = async () => {
        const [activeId, deliveries] = await Promise.all([
            getActiveAcceptedDeliveryId().catch(() => null),
            getMyDeliveries().catch(() => []),
        ]);

        const activeInProgress = Array.isArray(deliveries)
            ? deliveries.find((d) =>
                  [
                      "accepted",
                      "arrived_pickup",
                      "loading_cargo",
                      "out_for_delivery",
                      "arrived_dropoff",
                      "unloading_cargo",
                  ].includes(d?.status)
              )
            : null;

        const targetId = activeInProgress?.delivery_id || activeId;
        if (targetId) {
            const resumed = await resumeDeliveryIfActive(targetId);
            if (resumed) return;
        }

        router.replace("/(tabs)/home");
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
            await changeDriverPassword(tempPasswordUsed, newPassword, confirmNewPassword);
            Alert.alert(
                "Password Set Successfully!",
                "Your account is now activated with your permanent password. Proceeding to dashboard...",
                [
                    {
                        text: "Continue",
                        onPress: async () => {
                            setMustChangePasswordModal(false);
                            await navigateAfterLogin();
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

    useEffect(() => {
        let active = true;
        const checkAutoLogin = async () => {
            const minWaitPromise = new Promise((resolve) => setTimeout(resolve, 1400));
            try {
                const token = await getToken();
                if (!token) {
                    await minWaitPromise;
                    if (active) setIsCheckingAuth(false);
                    return;
                }

                const [activeId, deliveries] = await Promise.all([
                    getActiveAcceptedDeliveryId().catch(() => null),
                    getMyDeliveries().catch(() => []),
                ]);

                const activeInProgress = Array.isArray(deliveries)
                    ? deliveries.find((d) =>
                          [
                              "accepted",
                              "arrived_pickup",
                              "loading_cargo",
                              "out_for_delivery",
                              "arrived_dropoff",
                              "unloading_cargo",
                          ].includes(d?.status)
                      )
                    : null;

                await minWaitPromise;
                if (!active) return;

                const targetId = activeInProgress?.delivery_id || activeId;
                if (targetId) {
                    const resumed = await resumeDeliveryIfActive(targetId);
                    if (resumed || !active) return;
                }

                if (active) {
                    router.replace("/(tabs)/home");
                }
            } catch (err) {
                console.log("AUTO-LOGIN CHECK ERROR:", err);
                await minWaitPromise;
                if (active) setIsCheckingAuth(false);
            }
        };

        checkAutoLogin();
        return () => {
            active = false;
        };
    }, []);

    const handleLogin = async () => {
        setLoginError("");

        // EMPTY EMAIL
        if (!email.trim()) {
            setLoginError("Please enter your email.");
            return;
        }

        // EMPTY PASSWORD
        if (!password) {
            setLoginError("Please enter your password.");
            return;
        }

        try {
            setLoading(true);

            const data = await login(
                email.trim(),
                password
            );

            if (!data?.token) {
                setLoginError("Provided credentials are incorrect.");
                return;
            }

            // OWASP Enforced First-Login Password Rotation
            if (data?.must_change_password || data?.user?.must_change_password) {
                setTempPasswordUsed(password);
                setMustChangePasswordModal(true);
                return;
            }

            await navigateAfterLogin();

        } catch (error) {
            const msg = String(error?.message || "").toLowerCase();
            if (msg.includes("network request failed") || msg.includes("failed to fetch")) {
                setLoginError("Unable to connect to the server.");
            } else {
                setLoginError("Provided credentials are incorrect.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (isCheckingAuth) {
        return <AppLoadingScreen />;
    }

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
                                onChangeText={(val) => {
                                    setEmail(val);
                                    if (loginError) setLoginError("");
                                }}
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
                                onChangeText={(val) => {
                                    setPassword(val);
                                    if (loginError) setLoginError("");
                                }}
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

                        {loginError ? (
                            <Text style={styles.errorText}>{loginError}</Text>
                        ) : null}

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

            {/* FIRST-TIME LOGIN PASSWORD ROTATION MODAL (OWASP COMPLIANT) */}
            <Modal
                visible={mustChangePasswordModal}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {}}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <View style={styles.passwordModalCard}>
                        <View style={styles.securityHeader}>
                            <View style={styles.shieldIconWrap}>
                                <Ionicons name="shield-checkmark" size={28} color="#E53935" />
                            </View>
                            <Text style={styles.securityTitle}>Security Setup Required</Text>
                            <Text style={styles.securityDesc}>
                                You logged in using a temporary password. To protect your account and complete onboarding, please set your confidential permanent password.
                            </Text>
                        </View>

                        <Text style={styles.fieldLabel}>Enter new password</Text>
                        <View style={styles.modalInputWrap}>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Enter new password"
                                placeholderTextColor="#8E8E93"
                                secureTextEntry={!showNewPassword}
                                value={newPassword}
                                onChangeText={setNewPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowNewPassword((p) => !p)}
                                style={styles.eyeBtn}
                            >
                                <Ionicons
                                    name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color="#C9C9C9"
                                />
                            </TouchableOpacity>
                        </View>

                        {/* Password Strength Meter */}
                        <PasswordStrengthMeter password={newPassword} />

                        <Text style={styles.fieldLabel}>Confirm Password</Text>
                        <View style={styles.modalInputWrap}>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="Confirm Password"
                                placeholderTextColor="#8E8E93"
                                secureTextEntry={!showConfirmNewPassword}
                                value={confirmNewPassword}
                                onChangeText={setConfirmNewPassword}
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirmNewPassword((p) => !p)}
                                style={styles.eyeBtn}
                            >
                                <Ionicons
                                    name={showConfirmNewPassword ? "eye-outline" : "eye-off-outline"}
                                    size={20}
                                    color="#C9C9C9"
                                />
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.changeSubmitBtn,
                                changingPassword && styles.disabledButton,
                            ]}
                            onPress={handleChangePasswordSubmit}
                            disabled={changingPassword}
                        >
                            {changingPassword ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.changeSubmitText}>
                                    Save & Activate Account
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
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

    errorText: {
        color: "#FF6B6B",
        fontSize: 13,
        fontWeight: "500",
        textAlign: "center",
        marginTop: -6,
        marginBottom: 4,
    },

    submitButton: {
        marginTop: 22,
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
        borderColor: "rgba(229,57,53,0.5)",
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
        width: 54,
        height: 54,
        borderRadius: 27,
        backgroundColor: "rgba(229,57,53,0.12)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 10,
        borderWidth: 1,
        borderColor: "rgba(229,57,53,0.3)",
    },
    securityTitle: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
        textAlign: "center",
        marginBottom: 8,
    },
    badgeRow: {
        marginTop: 4,
        marginBottom: 8,
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
        textAlign: "center",
        lineHeight: 18,
    },
    fieldLabel: {
        color: "#E2E8F0",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.5,
        marginBottom: 6,
    },
    modalInputWrap: {
        height: 48,
        backgroundColor: "#2B2D33",
        borderWidth: 1,
        borderColor: "#4B4E56",
        borderRadius: 12,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        marginBottom: 14,
    },
    modalInput: {
        flex: 1,
        fontSize: 14,
        color: "#FFFFFF",
    },
    eyeBtn: {
        padding: 6,
    },
    changeSubmitBtn: {
        marginTop: 10,
        height: 50,
        backgroundColor: "#E53935",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    changeSubmitText: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
    },
});