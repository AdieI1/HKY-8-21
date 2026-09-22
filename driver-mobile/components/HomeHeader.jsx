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
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function HomeHeader() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const topInset = Math.max(
        insets.top,
        Platform.OS === "android" ? StatusBar.currentHeight || 0 : 0
    );

    const [user, setUser] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const savedUser = await AsyncStorage.getItem(
                "auth_user"
            );

            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);

                console.log(
                    "HEADER SAVED USER:",
                    parsedUser
                );

                setUser(parsedUser);
            }
        } catch (error) {
            console.log(
                "HEADER USER ERROR:",
                error
            );
        }
    };

    /*
     * Example:
     *
     * "Alec Jude Jaraula"
     *
     * becomes:
     *
     * "Alec"
     */
    const getFirstName = () => {
        if (!user?.full_name) {
            return "Driver";
        }

        return user.full_name.trim().split(" ")[0];
    };

    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: topInset,
                    height: 75 + topInset,
                },
            ]}
        >
            <StatusBar
                barStyle="light-content"
                backgroundColor="#8B1E1E"
                translucent
            />
            <View style={styles.headerContent}>
                <View style={styles.userContainer}>
                    <Image
                        source={require("../assets/images/profilepic.png")}
                        style={styles.avatar}
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
                    onPress={() =>
                        router.push("/settings")
                    }
                >
                    <Ionicons
                        name="settings-outline"
                        size={30}
                        color="#FFFFFF"
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        backgroundColor: "#8B1E1E",
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
        position: "relative",
    },
});