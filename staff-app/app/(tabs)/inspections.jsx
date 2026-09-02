import { useState } from "react";

import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import InspectionCard from "@/components/InspectionCard";
import InspectionHeader from "@/components/InspectionHeader";
export default function Inspections() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("All Records");

  const inspections = [
    {
      id: 1,
      vehicle: "ABC-1234",
      vehicleType: "FUSO - 10 Wheeler",
      time: "10:30 AM",
      inspectionType: "Pre-Trip",
      status: "Pending",
      image: require("../../assets/images/truckpic.jpg"),
    },
    {
      id: 2,
      vehicle: "ABC-1234",
      vehicleType: "FUSO - 10 Wheeler",
      time: "09:30 AM",
      inspectionType: "Post-Trip",
      status: "Pending",
      image: require("../../assets/images/truckpic.jpg"),
    },
    {
      id: 3,
      vehicle: "ABC-1234",
      vehicleType: "FUSO - 10 Wheeler",
      time: "09:25 AM",
      inspectionType: "Pre-Trip",
      status: "Pending",
      image: require("../../assets/images/truckpic.jpg"),
    },
    {
      id: 4,
      vehicle: "ABC-1234",
      vehicleType: "FUSO - 10 Wheeler",
      time: "09:20 AM",
      inspectionType: "Post-Trip",
      status: "Pending",
      image: require("../../assets/images/truckpic.jpg"),
    },
    {
      id: 5,
      vehicle: "ABC-1234",
      vehicleType: "FUSO - 10 Wheeler",
      time: "10:30 AM",
      inspectionType: "Pre-Trip",
      status: "Pending",
      image: require("../../assets/images/truckpic.jpg"),
    },
    {
      id: 6,
      vehicle: "ABC-1234",
      vehicleType: "FUSO - 10 Wheeler",
      time: "10:15 AM",
      inspectionType: "Post-Trip",
      status: "Pending",
      image: require("../../assets/images/truckpic.jpg"),
    },
    {
      id: 7,
      vehicle: "ABC-1234",
      vehicleType: "FUSO - 10 Wheeler",
      time: "10:00 AM",
      inspectionType: "Pre-Trip",
      status: "Pending",
      image: require("../../assets/images/truckpic.jpg"),
    },
    {
      id: 8,
      vehicle: "ABC-1234",
      vehicleType: "FUSO - 10 Wheeler",
      time: "09:45 AM",
      inspectionType: "Post-Trip",
      status: "Pending",
      image: require("../../assets/images/truckpic.jpg"),
    },
  ];

  const filteredInspections =
    activeTab === "All Records"
      ? inspections
      : inspections.filter(
          (item) => item.inspectionType === activeTab
        );

  return (
    <View style={styles.screen}>

      {/* =================================
          HEADER
      ================================= */}

      <InspectionHeader />


      {/* =================================
          OVERLAPPING CONTENT
      ================================= */}

      <View style={styles.panel}>

        {/* =================================
            TABS
        ================================= */}

        <View style={styles.tabsContainer}>

          <Tab
            title="All Records"
            active={activeTab === "All Records"}
            onPress={() => setActiveTab("All Records")}
          />

          <Tab
            title="Pre-Trip"
            active={activeTab === "Pre-Trip"}
            onPress={() => setActiveTab("Pre-Trip")}
          />

          <Tab
            title="Post-Trip"
            active={activeTab === "Post-Trip"}
            onPress={() => setActiveTab("Post-Trip")}
          />

        </View>


        {/* =================================
            DATE
        ================================= */}

        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Today Sept 1, 2026
          </Text>
        </View>


        {/* =================================
            CARDS
        ================================= */}

        <ScrollView
          style={styles.cardList}
          contentContainerStyle={styles.cardListContent}
          showsVerticalScrollIndicator={false}
        >

          {filteredInspections.map((inspection) => (
            <InspectionCard
              key={inspection.id}
              image={inspection.image}
              vehicle={inspection.vehicle}
              vehicleType={inspection.vehicleType}
              time={inspection.time}
              inspectionType={inspection.inspectionType}
              status={inspection.status}
              onPress={() => {
                  router.push("/pre-inspection");
                }}
            />
          ))}

        </ScrollView>

      </View>

    </View>
  );
}


/* =========================================
   TAB
========================================= */

function Tab({ title, active, onPress }) {
  return (
    <Text
      onPress={onPress}
      style={[
        styles.tabText,
        active && styles.tabTextActive,
      ]}
    >
      {title}
    </Text>
  );
}


/* =========================================
   STYLES
========================================= */

const styles = StyleSheet.create({

  screen: {
    flex: 1,
    backgroundColor: "#E5E7F0",
  },


  /* =================================
     OVERLAPPING PANEL
  ================================= */

  panel: {
    flex: 1,
    marginTop: -82,
    marginHorizontal: 10,
    backgroundColor: "#F5F7FF",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    elevation: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    zIndex: 20,
  },


  /* =================================
     TABS
  ================================= */

  tabsContainer: {
    height: 43,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#F5F7FF",

    borderBottomWidth: 1,

    borderBottomColor: "#D0D2DA",

    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,

    overflow: "hidden",
  },

  tabText: {
    flex: 1,

    height: 43,

    textAlign: "center",

    textAlignVertical: "center",

    color: "#898A91",

    fontSize: 14,

    fontWeight: "400",
  },

  tabTextActive: {
    color: "#E53935",

    borderBottomWidth: 2,

    borderBottomColor: "#E53935",
  },


  /* =================================
     DATE
  ================================= */

  dateContainer: {
    height: 43,

    justifyContent: "center",

    paddingHorizontal: 12,

    backgroundColor: "#F5F7FF",
  },

  dateText: {
    color: "#4E5058",

    fontSize: 15,

    fontWeight: "700",
  },


  /* =================================
     CARD LIST
  ================================= */

  cardList: {
    flex: 1,

    backgroundColor: "#F5F7FF",

    paddingHorizontal: 8,
  },

  cardListContent: {
    paddingTop: 2,

    paddingBottom: 100,
  },

});