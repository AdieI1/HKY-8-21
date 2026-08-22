import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
const { width, height } = Dimensions.get("window");

const pfpplaceholder = require("../assets/images/profilepic.png");

export default function AppHeader({
  name = "Justine Montefalco.",
  icon = "document-text-outline",
  onIconPress,
}) {
  return (
    <LinearGradient
      colors={["#4F0A11", "#9E1E21"]}
      style={styles.header}
    >
      <View style={styles.profileContainer}>
        <Image
          source={pfpplaceholder}
          style={styles.pfp}
        />

        <View>
          <Text style={styles.welcome}>
            Welcome!
          </Text>

          <Text style={styles.name}>
            {name}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.headerIcon}
        onPress={() => router.push("/drafts")}
      >
        <Ionicons
          name={icon}
          size={27}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: height * 0.035,
    paddingHorizontal: width * 0.03,
    paddingBottom: height * 0.025,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  pfp: {
    width: width * 0.14,
    height: width * 0.14,
    borderRadius: width * 0.07,
  },

  welcome: {
    color: "#FFFFFF",
    fontSize: width * 0.045,
    fontWeight: "500",
    marginLeft: width * 0.025,
  },

  name: {
    color: "#FFFFFF",
    fontSize: width * 0.045,
    fontWeight: "700",
    marginLeft: width * 0.025,
  },

  headerIcon: {
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
});