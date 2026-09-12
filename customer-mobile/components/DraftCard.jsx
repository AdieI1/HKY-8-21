import Ionicons from "@expo/vector-icons/Ionicons";
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function DraftCard({
  draft,
  onContinue,
  onDelete,
}) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.iconBox}>
          <Ionicons
            name="cube-outline"
            size={21}
            color="#F24848"
          />
        </View>

        <View style={styles.main}>
          <Text style={styles.title}>
            {draft.title}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons
              name="calendar-outline"
              size={10}
              color="#858797"
            />

            <Text style={styles.meta}>
              {draft.date}
            </Text>

            <Text style={styles.separator}>|</Text>

            <Text style={styles.fragile}>
              {draft.type}
            </Text>
          </View>

          <View style={styles.routeRow}>
            <Ionicons
              name="location"
              size={12}
              color="#F24848"
            />

            <Text
              style={styles.route}
              numberOfLines={1}
            >
              {draft.pickup}
            </Text>

            <Ionicons
              name="arrow-forward"
              size={11}
              color="#858797"
            />

            <Text
              style={styles.route}
              numberOfLines={1}
            >
              {draft.destination}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={onDelete}
          activeOpacity={0.7}
        >
          <Ionicons
            name="ellipsis-vertical"
            size={18}
            color="#77798A"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottom}>
        <View style={styles.saved}>
          <Ionicons
            name="time-outline"
            size={13}
            color="#858797"
          />

          <Text style={styles.savedText}>
            {draft.savedTime}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueText}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F8F8FC",
    borderRadius: 7,
    marginBottom: 10,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  top: {
    flexDirection: "row",
    padding: 10,
    minHeight: 74,
  },

  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: "#FDE4E4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  main: {
    flex: 1,
  },

  title: {
    fontSize: 13,
    fontWeight: "900",
    color: "#30313A",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },

  meta: {
    fontSize: 8,
    color: "#858797",
    marginLeft: 3,
  },

  separator: {
    fontSize: 8,
    color: "#858797",
    marginHorizontal: 4,
  },

  fragile: {
    fontSize: 8,
    color: "#F24848",
    fontWeight: "700",
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 4,
  },

  route: {
    maxWidth: "35%",
    fontSize: 9,
    color: "#77798A",
  },

  moreButton: {
    width: 25,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#D5D6DD",
  },

  bottom: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },

  saved: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  savedText: {
    fontSize: 8,
    color: "#858797",
  },

  continueButton: {
    minWidth: 59,
    height: 29,
    borderRadius: 5,
    backgroundColor: "#F24848",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },

  continueText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});