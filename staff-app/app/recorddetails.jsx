import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import ChecklistInfo from "@/components/Details/ChecklistInfo";
import DetailsCard from "@/components/Details/DetailsCard";
import DetailsHeader from "@/components/Details/DetailsHeader";
import DetailsInfo from "@/components/Details/DetailsInfo";
import Photos from "@/components/Details/Photos";

export default function RecordDetails() {
  const [activeTab, setActiveTab] = useState("Checklist");

  const record = {
    vehicle: "ABC-1234",
    type: "FUSO - 10 Wheeler",
    odometer: "67,000 km",
    date: "Sept 1, 2026",
    time: "10:30 AM",
    inspectionType: "Pre-Trip",
    status: "Completed",
    image: require("../assets/images/truckpic.jpg"),
  };

  return (
    <View style={styles.screen}>
      <DetailsHeader />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <DetailsCard
          image={record.image}
          vehicle={record.vehicle}
          type={record.type}
          odometer={record.odometer}
        />

        <DetailsInfo
          date={record.date}
          time={record.time}
          inspectionType={record.inspectionType}
          status={record.status}
        />

        <View style={styles.tabs}>
          <View
            style={[
              styles.tab,
              activeTab === "Checklist" && styles.activeTab,
            ]}
          >
            <DetailsTab
              title="Checklist"
              active={activeTab === "Checklist"}
              onPress={() => setActiveTab("Checklist")}
            />
          </View>

          <View
            style={[
              styles.tab,
              activeTab === "Photos" && styles.activeTab,
            ]}
          >
            <DetailsTab
              title="Photos"
              active={activeTab === "Photos"}
              onPress={() => setActiveTab("Photos")}
            />
          </View>
        </View>

        {activeTab === "Checklist" ? (
          <ChecklistInfo />
        ) : (
          <Photos />
        )}
      </ScrollView>
    </View>
  );
}

function DetailsTab({ title, active, onPress }) {
  const { Pressable, Text } = require("react-native");

  return (
    <Pressable
      style={styles.tabButton}
      onPress={onPress}
    >
      <Text
        style={[
          styles.tabText,
          active && styles.activeTabText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E5E7F0",
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingBottom: 90,
  },

  tabs: {
    height: 43,
    marginHorizontal: 8,
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#C8CBD5",
  },

  tab: {
    flex: 1,
    height: 43,
    position: "relative",
  },

  activeTab: {
    borderBottomWidth: 1,
    borderBottomColor: "#E32E2E",
  },

  tabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  tabText: {
    color: "#666872",
    fontSize: 14,
    fontWeight: "600",
  },

  activeTabText: {
    color: "#E32E2E",
  },
});
