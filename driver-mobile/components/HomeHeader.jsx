import {
    StyleSheet,
    View,
    Text,
    Image,
    TouchableOpacity,
    Platform,
    StatusBar,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../src/context/ThemeContext";
import { resolveAvatarUrl, getCurrentUser, getSavedUser } from "../services/api";

const defaultAvatar = require("../assets/images/defaultavatar.png");

export default function HomeHeader() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const { theme } = useTheme();

    const topInset = Math.max(
        insets.top,
        Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0
    );

    const [user, setUser] = useState(null);
    const [imgError, setImgError] = useState(false);

    const loadUser = useCallback(async () => {
        try {
            const saved = await getSavedUser();
            if (saved) {
                setUser(saved);
                setImgError(false);
            }

            const fresh = await getCurrentUser().catch(() => null);
            if (fresh) {
                setUser(fresh);
                setImgError(false);
            }
        } catch (error) {
            console.log("HEADER USER ERROR:", error);
        }
    }, []);

    useEffect(() => {
        if (isFocused) {
            loadUser();
        }
    }, [isFocused, loadUser]);

    const getFirstName = () => {
        if (!user?.full_name) {
            return "Driver";
        }
        return user.full_name.trim().split(" ")[0];
    };

    const avatarUri = !imgError && user?.profile_photo_url ? resolveAvatarUrl(user.profile_photo_url) : null;

    return (
        <View
            style={[
                styles.header,
                {
                    backgroundColor: theme.header,
                    paddingTop: topInset,
                    height: 75 + topInset,
                },
            ]}
        >
            <StatusBar
                barStyle="light-content"
                backgroundColor={theme.header}
                translucent
            />
            <View style={styles.headerContent}>
                <View style={styles.userContainer}>
                    <Image
                        source={
                            avatarUri
                                ? {
                                      uri: avatarUri,
                                      headers: { "ngrok-skip-browser-warning": "true" },
                                  }
                                : defaultAvatar
                        }
                        style={styles.avatar}
                        onError={() => setImgError(true)}
                    />

                    <View>
                        <Text style={styles.welcome}>
                            Welcome!
                        </Text>

                        <Text style={styles.name}>
                            {getFirstName()}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => router.push("/settings")}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="settings-outline"
                        size={28}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 18,
        borderBottomLeftRadius: 15,
        borderBottomRightRadius: 15,
        justifyContent: "flex-end",
    },

    headerContent: {
        height: 75,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    userContainer: {
        flexDirection: "row",
        alignItems: "center",
    },

    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        marginRight: 12,
        backgroundColor: "#E2E4EE",
    },

    welcome: {
        color: "#FFFFFF",
        fontSize: 18,
        fontWeight: "700",
    },

    name: {
        color: "#FFFFFF",
        fontSize: 14,
        marginTop: 2,
    },

    settingsButton: {
        padding: 4,
    },
});