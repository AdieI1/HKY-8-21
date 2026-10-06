import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

function OverviewItem({
  icon,
  iconColor,
  number,
  title,
  subtitle,
  onPress,
  titleColor,
  subtitleColor,
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

      <Text style={[styles.itemTitle, { color: titleColor || "#292929" }]}>{title}</Text>

      {Boolean(subtitle) && (
        <Text style={[styles.itemSubtitle, { color: subtitleColor || "#777777" }]}>{subtitle}</Text>
      )}
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
  pendingChecks,
  preTripChecks = 2,
  checksCompleted = 3,
  issuesReported = 1,
  preTripSubtitle = "2 Pre-trip | 3 Post-trip",
  onPressPreTrip,
  onPressCompleted,
  onPressIssues,
}) {
  const { theme, darkMode } = useTheme();
  const totalPending = typeof pendingChecks === "number" ? pendingChecks : preTripChecks;

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: darkMode ? 1 : 0 }]}>
      <Text style={[styles.heading, { color: theme.primary }]}>{"Today's Overview"}</Text>

      <View style={styles.statsContainer}>
        <OverviewItem
          icon="bus-outline"
          iconColor="#4B7EFF"
          number={totalPending}
          title="Pending Checks"
          subtitle={preTripSubtitle}
          onPress={onPressPreTrip}
          titleColor={theme.text}
          subtitleColor={theme.secondaryText}
        />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <OverviewItem
          icon="checkmark-done"
          iconColor="#45B63A"
          number={checksCompleted}
          title="Checks Completed"
          subtitle=""
          onPress={onPressCompleted}
          titleColor={theme.text}
          subtitleColor={theme.secondaryText}
        />

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <OverviewItem
          icon="warning"
          iconColor="#E53935"
          number={issuesReported}
          title="Issues Reported"
          subtitle="to admin for action"
          onPress={onPressIssues}
          titleColor={theme.text}
          subtitleColor={theme.secondaryText}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 10,
    borderRadius: 12,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowRadius: 7,
    elevation: 10,
    zIndex: 30,
  },

  heading: {
    fontSize: 18,
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
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "700",
  },

  itemTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 0,
  },

  itemSubtitle: {
    fontSize: 9.5,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 11,
    marginTop: 2,
    paddingHorizontal: 2,
  },

  divider: {
    width: 1,
    marginVertical: 2,
  },
});