import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

function OverviewItem({
  icon,
  iconColor,
  number,
  title,
  subtitle,
  onPress,
}) {
  const content = (
    <View style={styles.item}>
      <View
        style={[
          styles.iconCircle,
          {
            borderColor: iconColor,
          },
        ]}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>

      <Text
        style={[
          styles.number,
          {
            color: iconColor,
          },
        ]}
      >
        {number}
      </Text>

      <Text style={styles.itemTitle}>{title}</Text>

      <Text style={styles.itemSubtitle}>{subtitle}</Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        style={styles.pressableItem}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

export default function OverviewCard({
  preTripChecks = 2,
  checksCompleted = 3,
  issuesReported = 1,
  preTripSubtitle = "2 Pre-trip | 3 Post-trip",
  onPressPreTrip,
  onPressCompleted,
  onPressIssues,
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.heading}>{"Today's Overview"}</Text>

      <View style={styles.statsContainer}>
        <OverviewItem
          icon="bus-outline"
          iconColor="#4B7EFF"
          number={preTripChecks}
          title="Pre-Trip Check"
          subtitle={preTripSubtitle}
          onPress={onPressPreTrip}
        />

        <View style={styles.divider} />

        <OverviewItem
          icon="checkmark-done"
          iconColor="#45B63A"
          number={checksCompleted}
          title="Checks Completed"
          subtitle=""
          onPress={onPressCompleted}
        />

        <View style={styles.divider} />

        <OverviewItem
          icon="warning"
          iconColor="#E53935"
          number={issuesReported}
          title="Issues Reported"
          subtitle="to admin for further action"
          onPress={onPressIssues}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    backgroundColor: "#F5F7FF",
    borderRadius: 10,
    paddingTop: 7,
    paddingBottom: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.20,
    shadowOffset: {
        width: 0,
        height: 4,
    },
    shadowRadius: 7,
    elevation: 10,
    zIndex: 30,
 },

  heading: {
    color: "#E53935",
    fontSize: 19,
    fontWeight: "800",
    marginLeft: 14,
    marginBottom: 4,
  },

  statsContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 115,
  },

  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 3,
  },

  pressableItem: {
    flex: 1,
  },

  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },

  number: {
    fontSize: 43,
    lineHeight: 47,
    fontWeight: "600",
  },

  itemTitle: {
    color: "#292929",
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 0,
  },

  itemSubtitle: {
    color: "#777777",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 10,
    marginTop: 3,
    paddingHorizontal: 2,
  },

  divider: {
    width: 1,
    backgroundColor: "#C8C8C8",
    marginVertical: 2,
  },
});