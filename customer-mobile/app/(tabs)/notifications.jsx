import { Ionicons } from "@expo/vector-icons";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppHeader from "../../components/AppHeader";
import NotificationCard from "../../components/NotificationsCard";

const { width, height } = Dimensions.get("window");

export default function Notifications() {
  const notifications = [
    {
      id: "1",
      title: "Your Delivery is now In Transit to Pickup!",
      cargo: "Electronics",
      route: "Port Area - Malaybalay",
      time: "10 sec ago",
    },

    {
      id: "2",
      title: "Your Delivery is now Approved",
      cargo: "Electronics",
      route: "Port Area - Malaybalay",
      time: "10 min ago",
    },

    {
      id: "3",
      title: "Your Delivery is now Approved",
      cargo: "Electronics",
      route: "Port Area - Malaybalay",
      time: "10 min ago",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* HEADER */}
      <AppHeader
        icon="document-text-outline"
        iconSize={27}
      />

      {/* BODY */}
      <View style={styles.body}>

        <View style={styles.titleRow}>
          <Text style={styles.pageTitle}>
            Notifications
          </Text>

          <TouchableOpacity style={styles.sortButton}>
            <Text style={styles.sortText}>
              Sort
            </Text>

            <Ionicons
              name="chevron-down"
              size={14}
              color="#315BB5"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        >
          {notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
            />
          ))}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#D7D9E4",
  },

  body: {
    flex: 1,
    backgroundColor: "#D7D9E4",
  },

  titleRow: {
    backgroundColor: "#F7F8FC",

    paddingHorizontal: width * 0.035,
    paddingVertical: height * 0.012,

    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pageTitle: {
    color: "#E53935",
    fontSize: width * 0.055,
    fontWeight: "800",
  },

  sortButton: {
    flexDirection: "row",
    alignItems: "center",

    backgroundColor: "#D5DDF3",

    paddingHorizontal: 10,
    paddingVertical: 5,

    borderRadius: 6,
  },

  sortText: {
    color: "#315BB5",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 3,
  },

  list: {
    padding: width * 0.03,
    paddingBottom: height * 0.05,
  },
});