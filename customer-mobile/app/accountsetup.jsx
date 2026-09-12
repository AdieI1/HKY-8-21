import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { completeAccountSetup } from "../services/api";

const { width, height } = Dimensions.get("window");

const Defaultprofile = require("../assets/images/defaultavatar.png");
const PersonInfoIcon = require("../assets/images/personediticon.png");

const AccountSetup = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [Phone, setPhone] = useState("");
  const [Fname, setFname] = useState("");
  const [Lname, setLname] = useState("");

  const [Gender, setGender] = useState("");
  const [showGender, setShowGender] = useState(false);

  const [DOB, setDOB] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handlePhoneChange = (text) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    if (cleaned.length <= 11) setPhone(cleaned);
  };

  const handleContinue = async () => {
    try {
      const data = await completeAccountSetup(Fname, Lname, Phone);
      Alert.alert(
        "Account Ready",
        `Your username is ${data.username || params.username}. Use it when logging in.`
      );
      router.replace("/(tabs)/home");
    } catch (error) {
      Alert.alert("Unable to Save Account", error?.message || "Please complete the required fields.");
    }
  };

  const formatDate = (date) => {
    if (!(date instanceof Date)) return "Open Calendar";

    const mm = (date.getMonth() + 1).toString().padStart(2, "0");
    const dd = date.getDate().toString().padStart(2, "0");
    const yyyy = date.getFullYear();

    return `${mm}/${dd}/${yyyy}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.card}>
          <Text style={styles.Header}>Profile Setup</Text>
        </View>

        {/* PROFILE */}
        <View style={styles.avatarCard}>
          <View style={styles.profileWrapper}>
            <Image source={Defaultprofile} style={styles.profileImage} />
            <TouchableOpacity style={styles.addPhotoBtn}>
              <Ionicons name="add" size={width * 0.06} color="#CDD1E0" />
            </TouchableOpacity>
          </View>

          <View style={styles.InfoContainer}>
            <Text style={styles.title}>
              Lets finish setting up your profile!
            </Text>
            <Text style={styles.subtitle}>
              Tell us more about yourself!
            </Text>
          </View>
        </View>

        {/* PERSONAL INFO */}
        <View style={styles.InfoHeader}>

          <View style={styles.TextHeading}>
            <Image source={PersonInfoIcon} style={styles.InfoIcon} />
            <Text style={styles.headerText}>Personal Information</Text>
          </View>

          <View style={styles.divider} />

          {/* PHONE */}
          <Text style={styles.infoLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={Phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            maxLength={11}
          />

          {/* FIRST NAME */}
          <Text style={styles.infoLabel}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={Fname}
            onChangeText={setFname}
          />

          {/* LAST NAME */}
          <Text style={styles.infoLabel}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            value={Lname}
            onChangeText={setLname}
          />

          {/* GENDER */}
          <Text style={styles.infoLabel}>Gender</Text>

          <TouchableOpacity
            style={styles.inputDropdown}
            onPress={() => setShowGender(!showGender)}
          >
            <Text style={{ color: Gender ? "#000" : "#888", flex: 1 }}>
              {Gender || "Select Gender"}
            </Text>

            <Ionicons
              name={showGender ? "chevron-up" : "chevron-down"}
              size={18}
              color="#3A3A3B"
            />
          </TouchableOpacity>

          {showGender && (
            <View style={styles.dropdown}>
              <TouchableOpacity onPress={() => { setGender("Male"); setShowGender(false); }}>
                <Text style={styles.dropdownItem}>Male</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setGender("Female"); setShowGender(false); }}>
                <Text style={styles.dropdownItem}>Female</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* DATE OF BIRTH */}
          <Text style={styles.infoLabel}>Date of Birth</Text>

          <TouchableOpacity
            style={styles.calendar}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#3A3A3B" />
            <Text style={styles.calendarText}>
              {formatDate(DOB)}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={DOB instanceof Date ? DOB : new Date()}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);

                if (event.type === "set" && selectedDate instanceof Date) {
                  setDOB(selectedDate);
                }
              }}
            />
          )}

          {/* CONTINUE */}
          <TouchableOpacity
            style={styles.ContinueBtn}
            onPress={handleContinue}
          >
            <Text style={styles.Btntext}>Continue</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountSetup;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D6DAE8",
  },

  Header: {
    textAlign: "center",
    fontSize: width * 0.06,
    color: "#273342",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#E9ECF2",
    borderRadius: width * 0.03,
    padding: width * 0.04,
    alignItems: "center",
    margin: width * 0.04,
    elevation: 6,
  },

  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: width * 0.04,
    marginTop: height * 0.01,
  },

  profileWrapper: {
    position: "relative",
  },

  profileImage: {
    width: width * 0.28,
    height: width * 0.28,
    borderRadius: width * 0.14,
    borderWidth: 2,
    borderColor: "#8E94A3",
  },

  addPhotoBtn: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: width * 0.1,
    height: width * 0.1,
    backgroundColor: "#8E94A3",
    borderRadius: width * 0.05,
    justifyContent: "center",
    alignItems: "center",
  },

  InfoContainer: {
    flex: 1,
    marginLeft: width * 0.04,
  },

  title: {
    fontSize: width * 0.045,
    fontWeight: "bold",
    color: "#273342",
  },

  subtitle: {
    fontSize: width * 0.032,
    color: "#6E7384",
    marginTop: 4,
  },

  InfoHeader: {
    backgroundColor: "#E9ECF2",
    borderRadius: width * 0.03,
    padding: width * 0.04,
    margin: width * 0.04,
    elevation: 6,
  },

  TextHeading: {
    flexDirection: "row",
    alignItems: "center",
  },

  headerText: {
    fontSize: width * 0.042,
    fontWeight: "600",
    marginLeft: width * 0.02,
    color: "#2C2C2C",
  },

  InfoIcon: {
    width: width * 0.06,
    height: width * 0.06,
    resizeMode: "contain",
  },

  divider: {
    marginTop: height * 0.01,
    height: 1,
    backgroundColor: "#D1D1D1",
    width: "100%",
  },

  infoLabel: {
    marginTop: height * 0.015,
    marginBottom: 5,
    fontSize: width * 0.035,
    fontWeight: "600",
    color: "#273342",
  },

  input: {
    backgroundColor: "#D2D6E0",
    borderRadius: width * 0.02,
    padding: width * 0.035,
    fontSize: width * 0.035,
    color: "#3A3A3B",
    marginTop: 5,
  },

  inputDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D2D6E0",
    borderRadius: width * 0.02,
    padding: width * 0.035,
    marginTop: 5,
  },

  dropdown: {
    backgroundColor: "#D2D6E0",
    borderRadius: width * 0.02,
    marginTop: 5,
    padding: 10,
  },

  dropdownItem: {
    padding: 10,
    fontSize: width * 0.035,
    color: "#333",
  },

  calendar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D2D6E0",
    borderRadius: width * 0.02,
    padding: width * 0.035,
    marginTop: 5,
    gap: 10,
  },

  calendarText: {
    fontSize: width * 0.035,
    color: "#3A3A3B",
  },

  ContinueBtn: {
    backgroundColor: "#DE2226",
    padding: width * 0.035,
    borderRadius: width * 0.02,
    marginTop: 20,
    elevation: 3,
  },

  Btntext: {
    textAlign: "center",
    color: "#fff",
    fontSize: width * 0.04,
    fontWeight: "bold",
  },
});