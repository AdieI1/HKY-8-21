import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function SuccessRequest({ onViewDelivery, onReturnHome }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Delivery Requested!</Text>

        <Text style={styles.subtitle}>
          Your request has been sent.
        </Text>

        <View style={styles.successIcon}>
          <Text style={styles.check}>✓</Text>
        </View>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={onViewDelivery}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>View Delivery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={onReturnHome}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
    justifyContent: "center",
    alignItems: "center",
  },

  content: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: width * 0.08,
  },

  title: {
    fontSize: width * 0.055,
    fontWeight: "800",
    color: "#54B934",
    textAlign: "center",
  },

  subtitle: {
    fontSize: width * 0.032,
    color: "#54B934",
    marginTop: 5,
    textAlign: "center",
  },

  successIcon: {
    width: width * 0.25,
    height: width * 0.25,
    borderRadius: width * 0.125,
    borderWidth: 8,
    borderColor: "#54B934",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: height * 0.06,
  },

  check: {
    fontSize: width * 0.15,
    fontWeight: "800",
    color: "#54B934",
    marginTop: -5,
  },

  viewButton: {
    width: "85%",
    height: 48,
    borderRadius: 9,
    backgroundColor: "#54B934",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  homeButton: {
    width: "85%",
    height: 48,
    borderRadius: 9,
    backgroundColor: "#88889F",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: width * 0.037,
    fontWeight: "800",
  },
});