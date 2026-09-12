import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";

export default function Profile() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBar}>
        
          <Text style={styles.headerTitle}>
            Driver Profile
          </Text>
        </View>

        <View style={styles.profileInfo}>
          <Image
            source={require("../../../assets/images/profilepic.png")}
            style={styles.profileImage}
          />

          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              John Jones
            </Text>

            <Text style={styles.email}>
              christlee@gmail.com
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <View style={styles.infoCard}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="person-add"
              size={25}
              color="#D62B2B"
            />

            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.label}>
            Phone number:
          </Text>

          <View style={styles.input}>
            <Text style={styles.inputText}>
              09674209607
            </Text>
          </View>

          <Text style={styles.label}>
            First Name:
          </Text>

          <View style={styles.input}>
            <Text style={styles.inputText}>
              Christopher
            </Text>
          </View>

          <Text style={styles.label}>
            Last Name:
          </Text>

          <View style={styles.input}>
            <Text style={styles.inputText}>
              Lee
            </Text>
          </View>

          <Text style={styles.label}>
            Gender:
          </Text>

          <View style={styles.genderInput}>
            <Text style={styles.inputText}>
              Male
            </Text>
          </View>

          <Text style={styles.label}>
            Date of Birth:
          </Text>

          <View style={styles.dateContainer}>
            <View style={styles.calendarBox}>
              <Ionicons
                name="calendar-outline"
                size={25}
                color="#353842"
              />
            </View>

            <Text style={styles.dateText}>
              05/16/98
            </Text>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.8}
          >
            <Ionicons
              name="create-outline"
              size={29}
              color="#FFFFFF"
            />

            <Text style={styles.editText}>
              Edit Profile
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DDE0EE",
  },

  header: {
    height: 215,
    backgroundColor: "#A91F24",
    paddingTop: 17,
    paddingHorizontal: 11,
  },

  headerBar: {
    height: 48,
    backgroundColor: "#F4F5FC",
    borderRadius: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    color: "#D62B2B",
    fontSize: 21,
    fontWeight: "800",
  },

  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 28,
    marginLeft: 1,
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  nameContainer: {
    marginLeft: 12,
  },

  name: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
  },

  email: {
    color: "#FFFFFF",
    fontSize: 13,
    marginTop: 2,
  },

  content: {
    paddingBottom: 100,
  },

  infoCard: {
    backgroundColor: "#F4F5FC",
    borderRadius: 9,
    marginHorizontal: 11,
    marginTop: 0,
    paddingBottom: 16,
    overflow: "hidden",
  },

  sectionHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
  },

  sectionTitle: {
    color: "#303746",
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 6,
  },

  divider: {
    height: 1,
    backgroundColor: "#C7C9D1",
    marginBottom: 9,
  },

  label: {
    color: "#303746",
    fontSize: 15,
    fontWeight: "700",
    marginHorizontal: 11,
    marginTop: 8,
    marginBottom: 4,
  },

  input: {
    height: 36,
    backgroundColor: "#D8DAE3",
    borderRadius: 6,
    marginHorizontal: 11,
    justifyContent: "center",
    paddingHorizontal: 9,
  },

  genderInput: {
    height: 36,
    width: 140,
    backgroundColor: "#D8DAE3",
    borderRadius: 6,
    marginHorizontal: 11,
    justifyContent: "center",
    paddingHorizontal: 9,
  },

  inputText: {
    color: "#5C5E68",
    fontSize: 12,
  },

  dateContainer: {
    height: 36,
    backgroundColor: "#D8DAE3",
    borderRadius: 6,
    marginHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  calendarBox: {
    width: 37,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  dateText: {
    color: "#5C5E68",
    fontSize: 12,
    marginLeft: 2,
  },

  editButton: {
    height: 48,
    backgroundColor: "#E02E2E",
    borderRadius: 9,
    marginHorizontal: 10,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },

  editText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginLeft: 6,
  },
});