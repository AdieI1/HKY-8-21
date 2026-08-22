import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const pfpplaceholder = require("../../assets/images/profilepic.png");

const Profile = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120, 
        }}
      >
        {/* gradient header */}
        <LinearGradient
          colors={["#4F0A11", "#9E1E21"]}
          style={styles.container}
        >
          {/* profile header bar */}
          <View style={styles.headerBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>User Profile</Text>

            <TouchableOpacity>
              <Ionicons
                name="settings-outline"
                size={29}
                color="#CA2A30"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.profileRow}>
            <Image source={pfpplaceholder} style={styles.pfp} />

            <View style={styles.txtContainer}>
              <Text style={styles.Name}>Justine Montefalco</Text>
              <Text style={styles.gmail}>Just_10@gmail.com</Text>
            </View>
          </View>
        </LinearGradient>

        {/* personal information card */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-outline" size={18} color="#CA2A30" />
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>
          </View>

          <View style={styles.divider} />

          <InfoRow label="Phone number" value="09674209607" />
          <InfoRow label="First Name" value="Justine" />
          <InfoRow label="Last Name" value="Montefalco" />
          <InfoRow label="Gender" value="Male" />
          <InfoRow
            label="Date of Birth"
            value="05/16/98"
            icon="calendar-outline"
          />

          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="create-outline" size={18} color="#fff" />
            <Text style={styles.editText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
{/* forda info row */}
const InfoRow = ({ label, value, icon }) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}</Text>

    <View style={styles.valueRow}>
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color="#555"
          style={{ marginRight: 6 }}
        />
      )}
      <Text style={styles.valueText}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },

  container: {
    paddingTop: height * 0.02,
    paddingHorizontal: width * 0.05,
    paddingBottom: height * 0.05,
    borderBottomLeftRadius: width * 0.15,
    borderBottomRightRadius: width * 0.15,
  },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: height * 0.03,
    paddingHorizontal: width * 0.04,
    paddingVertical: height * 0.012,
    backgroundColor: "#FFFFFF",
    borderRadius: width * 0.15,
  },

  headerTitle: {
    fontSize: width * 0.06,
    fontWeight: "700",
    color: "#CA2A30",
  },

  backBtn: {
    backgroundColor: "#E53935",
    padding: 8,
    borderRadius: 8,
  },

  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  pfp: {
    width: width * 0.26,
    height: width * 0.26,
    borderRadius: width * 0.13,
  },

  txtContainer: {
    marginLeft: width * 0.04,
  },

  Name: {
    color: "#fff",
    fontSize: width * 0.055,
    fontWeight: "600",
  },

  gmail: {
    color: "#fff",
    fontSize: width * 0.04,
    marginTop: 4,
    opacity: 0.9,
  },

  card: {
    backgroundColor: "#fff",
    marginHorizontal: width * 0.05,
    marginTop: -height * 0.04,

    borderRadius: 18,
    padding: width * 0.05,

    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  sectionTitle: {
    fontSize: width * 0.045,
    fontWeight: "700",
  },

  divider: {
    height: 1,
    backgroundColor: "#CFCFCF",
    marginVertical: height * 0.015,
  },

  infoRow: {
    marginBottom: height * 0.02,
  },

  label: {
    fontSize: width * 0.04,
    color: "#273342",
    marginBottom: 4,
    fontWeight: "500",
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D2D6E0",
    borderRadius: 999,
    paddingVertical: height * 0.012,
    paddingHorizontal: width * 0.04,
  },

  valueText: {
    fontSize: width * 0.04,
    color: "#444451",
  },

  editBtn: {
    marginTop: height * 0.025,
    backgroundColor: "#E53935",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  editText: {
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "600",
    marginLeft: 6,
  },
});