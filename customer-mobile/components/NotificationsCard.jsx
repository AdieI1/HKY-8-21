import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

const TYPE_CONFIG = {
  delivery_delay: {
    icon: "alert-circle",
    color: "#DC2626",
    badgeBg: "#FEF2F2",
    badgeBorder: "#FCA5A5",
  },
  delivery_relief: {
    icon: "shield-checkmark",
    color: "#D97706",
    badgeBg: "#FFFBEB",
    badgeBorder: "#FCD34D",
  },
  delivery_reschedule: {
    icon: "calendar",
    color: "#7C3AED",
    badgeBg: "#F5F3FF",
    badgeBorder: "#DDD6FE",
  },
  request_approved: {
    icon: "checkmark-circle",
    color: "#16A34A",
    badgeBg: "#F0FDF4",
    badgeBorder: "#BBF7D0",
  },
  delivery_status: {
    icon: "navigate-circle",
    color: "#2563EB",
    badgeBg: "#EFF6FF",
    badgeBorder: "#BFDBFE",
  },
  default: {
    icon: "notifications",
    color: "#E53935",
    badgeBg: "#FEF2F2",
    badgeBorder: "#FECACA",
  },
};

function formatDisplayTime(rawTime) {
  if (!rawTime) return "Recently";
  const date = new Date(rawTime);
  if (isNaN(date.getTime())) return String(rawTime);

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  });
}

export default function NotificationCard({ notification, onViewDetails }) {
  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.default;
  const timeText = formatDisplayTime(notification.time || notification.created_at);

  return (
    <View style={[styles.card, !notification.is_read && styles.unreadCard]}>
      <View style={styles.titleRow}>
        <View style={[styles.iconWrapper, { backgroundColor: config.badgeBg, borderColor: config.badgeBorder }]}>
          <Ionicons name={config.icon} size={18} color={config.color} />
        </View>

        <Text style={[styles.title, { color: config.color }]}>
          {notification.title}
        </Text>
      </View>

      <View style={styles.divider} />

      {Boolean(notification.message) && (
        <Text style={styles.message}>
          {notification.message}
        </Text>
      )}

      {Boolean(notification.cargo) && (
        <Text style={styles.cargo}>
          Cargo: {notification.cargo}
        </Text>
      )}

      {Boolean(notification.route) && (
        <View style={styles.locationRow}>
          <Ionicons name="location" size={14} color="#F24848" />
          <Text style={styles.location}>{notification.route}</Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <Text style={styles.time}>{timeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F8F9FD",
    borderRadius: 12,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E1E3EB",
  },
  unreadCard: {
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#E1E3EB",
  },
  message: {
    color: "#374151",
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 10,
    marginHorizontal: 14,
  },
  cargo: {
    color: "#4B5260",
    fontSize: 13,
    marginTop: 6,
    marginHorizontal: 14,
    fontWeight: "600",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginHorizontal: 14,
  },
  location: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 5,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 12,
  },
  time: {
    color: "#9CA3AF",
    fontSize: 11.5,
    fontWeight: "500",
  },
});