import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function SuccessCard({
  title = "Inspection Completed",
  message = "The vehicle inspection has been successfully completed and recorded.",
  onClose,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="checkmark"
          size={22}
          color="#FFFFFF"
        />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>
          {title}
        </Text>

        <Text style={styles.message}>
          {message}
        </Text>
      </View>

      {onClose && (
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons
            name="close"
            size={18}
            color="#5E6068"
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",

    top: 82,
    left: 34,
    right: 34,

    minHeight: 64,

    backgroundColor: "#F7FFF8",

    borderWidth: 1,
    borderColor: "#72C47A",

    borderRadius: 7,

    flexDirection: "row",
    alignItems: "center",

    paddingHorizontal: 12,
    paddingVertical: 9,

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowRadius: 6,

    elevation: 6,

    zIndex: 100,
  },

  iconContainer: {
    width: 32,
    height: 32,

    borderRadius: 16,

    backgroundColor: "#42A94B",

    justifyContent: "center",
    alignItems: "center",

    marginRight: 10,
  },

  textContainer: {
    flex: 1,
  },

  title: {
    color: "#31903A",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },

  message: {
    color: "#5E6068",
    fontSize: 11,
    lineHeight: 15,
  },

  closeButton: {
    width: 28,
    height: 28,

    justifyContent: "center",
    alignItems: "center",

    marginLeft: 5,
  },
});