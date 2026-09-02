import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const FALLBACK_IMAGE = require("../../assets/images/truckpic.jpg");

export default function VehicleInspectionCard({
  image,
  vehicle = "ABC - 1234",
  vehicleType = "10 Wheeler - FUSO",
  odometer = "67,000 km",
  completed = 0,
  total = 8,
  photoUploaded = false,
  loading = false,
}) {
  const [imgError, setImgError] = useState(false);
  const imageSource = !imgError && image ? image : FALLBACK_IMAGE;
  /*
    Total requirements:
    - Checklist items
    - Photo upload
  */

  const totalRequirements = total + 1;

  const completedRequirements =
    completed + (photoUploaded ? 1 : 0);

  const progress =
    totalRequirements > 0
      ? Math.min(
          completedRequirements / totalRequirements,
          1
        )
      : 0;

  if (loading) {
    return (
      <View style={styles.card}>

        <View style={styles.loadingImage} />

        <View style={styles.loadingInfo}>
          <View style={styles.loadingLineLarge} />
          <View style={styles.loadingLineMedium} />
          <View style={styles.loadingLineSmall} />
        </View>

        <View style={styles.progressSection}>
          <View style={styles.loadingProgressLabel} />
          <View style={styles.loadingProgressBar} />
        </View>

      </View>
    );
  }

  return (
    <View style={styles.card}>

      {/* VEHICLE INFORMATION */}

      <View style={styles.vehicleSection}>

        <Image
          source={imageSource}
          onError={() => setImgError(true)}
          style={styles.vehicleImage}
          resizeMode="cover"
        />

        <View style={styles.vehicleInfo}>

          <Text style={styles.vehicle}>
            {vehicle}
          </Text>

          <Text style={styles.vehicleType}>
            {vehicleType}
          </Text>

          <Text style={styles.odometer}>
            Odometer: {odometer}
          </Text>

        </View>

      </View>


      {/* PROGRESS BAR */}

      <View style={styles.progressSection}>

        <Text style={styles.progressTitle}>
          Inspection Progress
        </Text>

        <View style={styles.progressBarBackground}>

          <View
            style={[
              styles.progressBar,
              {
                width: `${progress * 100}%`,
              },
            ]}
          />

        </View>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({

  card: {
    backgroundColor: "#F5F7FF",
    borderWidth: 1,
    borderColor: "#D5D8E2",
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },

  vehicleSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  vehicleImage: {
    width: 92,
    height: 68,
    borderRadius: 5,
    backgroundColor: "#D0D0D0",
  },

  vehicleInfo: {
    flex: 1,
    marginLeft: 9,
    justifyContent: "center",
  },

  vehicle: {
    color: "#42434B",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },

  vehicleType: {
    color: "#55565D",
    fontSize: 11.5,
    marginBottom: 3,
  },

  odometer: {
    color: "#777982",
    fontSize: 10.5,
  },

  progressSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#D2D4DB",
  },

  progressTitle: {
    color: "#4E5058",
    fontSize: 11.5,
    fontWeight: "700",
    marginBottom: 6,
  },

  progressBarBackground: {
    height: 7,
    width: "100%",
    backgroundColor: "#C5C7CB",
    borderRadius: 5,
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#E32E2E",
    borderRadius: 5,
  },

  /* LOADING */

  loadingImage: {
    width: 92,
    height: 68,
    borderRadius: 5,
    backgroundColor: "#D9DADE",
  },

  loadingInfo: {
    position: "absolute",
    left: 109,
    top: 12,
  },

  loadingLineLarge: {
    width: 100,
    height: 13,
    borderRadius: 4,
    backgroundColor: "#D9DADE",
    marginBottom: 7,
  },

  loadingLineMedium: {
    width: 130,
    height: 9,
    borderRadius: 4,
    backgroundColor: "#D9DADE",
    marginBottom: 7,
  },

  loadingLineSmall: {
    width: 95,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D9DADE",
  },

  loadingProgressLabel: {
    width: 120,
    height: 9,
    borderRadius: 4,
    backgroundColor: "#D9DADE",
    marginBottom: 6,
  },

  loadingProgressBar: {
    width: "100%",
    height: 7,
    borderRadius: 5,
    backgroundColor: "#D9DADE",
  },

});