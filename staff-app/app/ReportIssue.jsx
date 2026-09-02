import { Ionicons } from "@expo/vector-icons";

import { LinearGradient } from "expo-linear-gradient";

import { useRouter } from "expo-router";

import {
    Pressable,

    ScrollView,

    StyleSheet,

    Text,

    View,
} from "react-native";

import ReportVehicleCard from "@/components/ReportIssue/ReportVehicleCard";

import ReportIssueForm from "@/components/ReportIssue/ReportIssueForm";

export default function ReportIssue() {

  const router = useRouter();

  return (

    <View style={styles.screen}>

      {/* =================================
          HEADER
      ================================= */}

      <LinearGradient

        colors={["#4F0A11", "#9E1E21"]}

        start={{ x: 0, y: 0 }}

        end={{ x: 0, y: 1 }}

        style={styles.header}

      >

        <Pressable

          style={styles.backButton}

          onPress={() => router.back()}

        >

          <Ionicons

            name="arrow-back"

            size={28}

            color="#FFFFFF"

          />

        </Pressable>

        <View style={styles.headerTextContainer}>

          <Text style={styles.headerTitle}>

            Report Issue

          </Text>

          <Text style={styles.headerSubtitle}>

            Report any damage or operational{"\n"}

            issue/s found during inspection

          </Text>

        </View>

      </LinearGradient>


      {/* =================================
          CONTENT
      ================================= */}

      <ScrollView

        style={styles.scrollView}

        contentContainerStyle={styles.content}

        showsVerticalScrollIndicator={false}

        keyboardShouldPersistTaps="handled"

      >

        {/* =================================
            REPORT CARD
        ================================= */}

        <View style={styles.reportCard}>

          {/* VEHICLE INFORMATION */}

          <ReportVehicleCard

            image={require("../assets/images/truckpic.jpg")}

            vehicle="ABC - 1234"

            vehicleType="10 Wheeler - FUSO"

            odometer="67,000 km"

          />


          {/* ISSUE FORM */}

          <ReportIssueForm />

        </View>

      </ScrollView>

    </View>

  );

}

const styles = StyleSheet.create({

  /* =================================
     SCREEN
  ================================= */

  screen: {

    flex: 1,

    backgroundColor: "#E5E7F0",

  },


  /* =================================
     HEADER
  ================================= */

  header: {

    height: 120,

    paddingTop: 43,

    paddingHorizontal: 18,

    flexDirection: "row",

    alignItems: "center",

    zIndex: 5,

  },

  backButton: {

    width: 40,

    height: 40,

    justifyContent: "center",

    alignItems: "center",

    marginRight: 18,

  },

  headerTextContainer: {

    flex: 1,

  },

  headerTitle: {

    color: "#FFFFFF",

    fontSize: 20,

    fontWeight: "700",

    marginBottom: 4,

  },

  headerSubtitle: {

    color: "#F4D9D9",

    fontSize: 11,

    lineHeight: 14,

  },


  /* =================================
     SCROLL
  ================================= */

  scrollView: {

    flex: 1,

  },

  content: {

    paddingHorizontal: 9,

    paddingTop: 0,

    paddingBottom: 20,

  },


  /* =================================
     REPORT CARD
  ================================= */

  reportCard: {

    backgroundColor: "#F7F8FD",

    borderRadius: 8,

    marginTop: -9,

    paddingHorizontal: 17,

    paddingTop: 22,

    paddingBottom: 14,

    shadowColor: "#000",

    shadowOffset: {

      width: 0,

      height: 3,

    },

    shadowOpacity: 0.12,

    shadowRadius: 5,

    elevation: 4,

  },

});