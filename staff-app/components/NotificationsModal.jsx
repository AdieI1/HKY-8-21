import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";

const getNotificationMeta = (type, darkMode) => {
  switch (type) {
    case "dispatch":
    case "delivery":
      return {
        icon: "car-outline",
        color: "#3B82F6",
        bg: darkMode ? "#1E293B" : "#EFF6FF",
      };
    case "incident":
    case "danger":
      return {
        icon: "warning-outline",
        color: "#EF4444",
        bg: darkMode ? "#3F1E1E" : "#FEF2F2",
      };
    case "inspection":
    case "checklist":
      return {
        icon: "clipboard-outline",
        color: "#10B981",
        bg: darkMode ? "#143322" : "#ECFDF5",
      };
    case "fuel":
      return {
        icon: "water-outline",
        color: "#F59E0B",
        bg: darkMode ? "#392A13" : "#FFFBEB",
      };
    case "maintenance":
      return {
        icon: "construct-outline",
        color: "#8B5CF6",
        bg: darkMode ? "#281D3E" : "#F5F3FF",
      };
    default:
      return {
        icon: "notifications-outline",
        color: "#C52227",
        bg: darkMode ? "#3B181A" : "#FEE2E2",
      };
  }
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return "";
  try {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
};

export default function NotificationsModal({
  visible,
  onClose,
  notifications = [],
  unreadCount = 0,
  loading = false,
  onMarkAsRead,
  onMarkAllAsRead,
}) {
  const { theme, darkMode } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheetContainer, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="notifications" size={18} color="#C52227" />
              </View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadChip}>
                  <Text style={styles.unreadChipText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <Pressable
                  style={({ pressed }) => [
                    styles.markAllBtn,
                    { backgroundColor: theme.cardSecondary },
                    pressed && styles.pressed,
                  ]}
                  onPress={onMarkAllAsRead}
                >
                  <Text style={[styles.markAllText, { color: theme.text }]}>Mark all read</Text>
                </Pressable>
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.closeBtn,
                  { backgroundColor: theme.cardSecondary },
                  pressed && styles.pressed,
                ]}
                onPress={onClose}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </Pressable>
            </View>
          </View>

          {/* Body */}
          {loading && notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="large" color="#C52227" />
              <Text style={[styles.loadingText, { color: theme.secondaryText }]}>Loading notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.cardSecondary }]}>
                <Ionicons
                  name="notifications-off-outline"
                  size={36}
                  color={theme.secondaryText}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>All Caught Up!</Text>
              <Text style={[styles.emptySubtitle, { color: theme.secondaryText }]}>
                You have no new notifications or alerts at this time.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {notifications.map((item) => {
                const meta = getNotificationMeta(item.type, darkMode);
                const isUnread = !item.is_read;

                return (
                  <Pressable
                    key={String(item.id || item.notification_id || Math.random())}
                    style={({ pressed }) => [
                      styles.card,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                      isUnread && {
                        borderColor: "#FECACA",
                        backgroundColor: darkMode ? "#2D1719" : "#FFFBFB",
                      },
                      pressed && styles.cardPressed,
                    ]}
                    onPress={() => onMarkAsRead?.(item.id || item.notification_id)}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: meta.bg },
                      ]}
                    >
                      <Ionicons
                        name={meta.icon}
                        size={20}
                        color={meta.color}
                      />
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
                          {item.title || "Notification"}
                        </Text>
                        <Text style={[styles.timeText, { color: theme.secondaryText }]}>
                          {formatTimeAgo(item.time || item.created_at)}
                        </Text>
                      </View>

                      {Boolean(item.message) && (
                        <Text style={[styles.cardMessage, { color: theme.secondaryText }]} numberOfLines={3}>
                          {item.message}
                        </Text>
                      )}
                    </View>

                    {isUnread && <View style={styles.unreadDot} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "82%",
    minHeight: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  unreadChip: {
    backgroundColor: "#C52227",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadChipText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  markAllBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "600",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 14,
    gap: 10,
  },
  card: {
    borderRadius: 12,
    padding: 13,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
  },
  cardPressed: {
    opacity: 0.8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    flex: 1,
    marginRight: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#DC2626",
    marginLeft: 8,
    marginTop: 6,
  },
  emptyWrap: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  pressed: {
    opacity: 0.6,
  },
});
