import {
    Image,

    StyleSheet,

    Text,

    View,
} from "react-native";

export default function ReportVehicleCard({

  image,

  vehicle,

  vehicleType,

  odometer,

}) {

  return (

    <View style={styles.card}>

      <Image

        source={image}

        style={styles.vehicleImage}

      />

      <View style={styles.vehicleInfo}>

        <Text style={styles.vehicleName}>

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

  );

}

const styles = StyleSheet.create({

  card: {

    width: "100%",

    minHeight: 94,

    borderWidth: 1,

    borderColor: "#D2D6E0",

    borderRadius: 7,

    backgroundColor: "#F8F9FD",

    padding: 7,

    flexDirection: "row",

    alignItems: "center",

  },

  vehicleImage: {

    width: 106,

    height: 78,

    borderRadius: 5,

    resizeMode: "cover",

  },

  vehicleInfo: {

    flex: 1,

    marginLeft: 11,

    justifyContent: "center",

  },

  vehicleName: {

    color: "#454750",

    fontSize: 17,

    fontWeight: "700",

    marginBottom: 3,

  },

  vehicleType: {

    color: "#7D7F88",

    fontSize: 13,

    marginBottom: 6,

  },

  odometer: {

    color: "#7D7F88",

    fontSize: 11,

  },

});