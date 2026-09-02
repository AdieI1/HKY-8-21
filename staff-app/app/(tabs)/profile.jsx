import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import ProfileHeader from "@/components/Profile/ProfileHeader";
import ProfileInfo from "@/components/Profile/ProfileInfo";

export default function Profile() {
  const user = {
    name: "John Staff",
    email: "john_staff@gmail.com",
    phoneNumber: "09674209607",
    firstName: "Christopher",
    lastName: "Lee",
    gender: "09674209607",
    dateOfBirth: "05/16/98",
    avatar: require("@/assets/images/staffpic.jpg"),
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader
          name={user.name}
          email={user.email}
          avatar={user.avatar}
          onSettingsPress={() => {
            console.log("Settings pressed");
          }}
        />

        <ProfileInfo
          phoneNumber={user.phoneNumber}
          firstName={user.firstName}
          lastName={user.lastName}
          gender={user.gender}
          dateOfBirth={user.dateOfBirth}
          onEditProfile={() => {
            console.log("Edit Profile pressed");
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F8FD",
  },

  scrollView: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
  },
});