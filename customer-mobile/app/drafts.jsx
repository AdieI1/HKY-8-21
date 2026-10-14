import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import AppHeader from "../components/AppHeader";
import DraftCard from "../components/DraftCard";
import { getDrafts, deleteDraft } from "../services/drafts";
import { useTheme } from "../context/ThemeContext";

export default function Drafts() {
  const insets = useSafeAreaInsets();
  const { isDark, colors } = useTheme();

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAllDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const items = await getDrafts();
      setDrafts(items);
    } catch (err) {
      console.log("Error loading drafts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllDrafts();
    }, [loadAllDrafts])
  );

  const continueDraft = (draft) => {
    router.replace({
      pathname: "/(tabs)/home",
      params: {
        openDraftId: draft.id,
      },
    });
  };

  const removeDraft = (draftId) => {
    Alert.alert(
      "Delete Draft",
      "Are you sure you want to delete this draft?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteDraft(draftId);
            setDrafts((previous) =>
              previous.filter((draft) => draft.id !== draftId)
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* APP HEADER */}
      <AppHeader />

      {/* DRAFT HEADER */}
      <View style={[styles.titleRow, { backgroundColor: isDark ? colors.card : "#F1F2FA", borderBottomColor: colors.cardBorder, borderBottomWidth: isDark ? 1 : 0 }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>Drafts</Text>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Unfinished Delivery Requests
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.sortButton, { backgroundColor: isDark ? colors.cardBorder : "#D8DFF5" }]}
          activeOpacity={0.7}
        >
          <Text style={[styles.sortText, { color: isDark ? "#93C5FD" : "#3456A1" }]}>
            Sort
          </Text>

          <Ionicons
            name="chevron-down"
            size={14}
            color={isDark ? "#93C5FD" : "#3456A1"}
          />
        </TouchableOpacity>
      </View>

      {/* DRAFT LIST */}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { backgroundColor: colors.bg }]}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadAllDrafts}
            colors={["#DC2626"]}
            tintColor="#DC2626"
          />
        }
      >
        {drafts.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: colors.bg }]}>
            <Ionicons
              name="document-outline"
              size={42}
              color={colors.textSubtle}
            />

            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              You currently do not have Drafts
              {"\n"}
              right now.
            </Text>
          </View>
        ) : (
          drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              onContinue={() =>
                continueDraft(draft)
              }
              onDelete={() =>
                removeDraft(draft.id)
              }
            />
          ))
        )}
      </ScrollView>

      {/* EXACT SAME BOTTOM NAV AS _layout.jsx */}
      <View
        style={[
          styles.bottomNav,
          {
            height: 60 + insets.bottom,
            paddingBottom: insets.bottom,
            backgroundColor: colors.navBg,
            borderTopColor: colors.navBorder,
          },
        ]}
      >
        {/* HOME */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => router.push("/home")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="home"
            size={22}
            color="#767A8C"
          />

          <Text style={styles.navText}>
            Home
          </Text>
        </TouchableOpacity>

        {/* DELIVERIES */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push("/deliveries")
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="cube"
            size={22}
            color="#767A8C"
          />

          <Text style={styles.navText}>
            Deliveries
          </Text>
        </TouchableOpacity>

        {/* NOTIFICATIONS */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push("/notifications")
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="notifications"
            size={22}
            color="#767A8C"
          />

          <Text style={styles.navText}>
            Notifications
          </Text>
        </TouchableOpacity>

        {/* PROFILE */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() =>
            router.push("/profile")
          }
          activeOpacity={0.7}
        >
          <Ionicons
            name="person"
            size={22}
            color="#767A8C"
          />

          <Text style={styles.navText}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDEDED",
  },

  titleRow: {
    height: 48,
    backgroundColor: "#F1F2FA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#D62B2B",
  },

  subtitle: {
    fontSize: 8,
    color: "#9A9CAB",
    marginTop: -1,
  },

  sortButton: {
    height: 28,
    paddingHorizontal: 9,
    borderRadius: 5,
    backgroundColor: "#D8DFF5",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  sortText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3456A1",
  },

  content: {
    flexGrow: 1,
    padding: 9,
    paddingBottom: 85,
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
  },

  emptyText: {
    textAlign: "center",
    fontSize: 15,
    color: "#3E4050",
    lineHeight: 22,
    marginTop: 10,
  },

  /* SAME BASE SETTINGS AS _layout.jsx */
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,

    backgroundColor: "#FFFFFF",

    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",

    borderTopWidth: 0,

    elevation: 12,

    shadowColor: "#14103C",
    shadowOpacity: 0.15,
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowRadius: 10,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
    width: "25%",
  },

  navText: {
    color: "#767A8C",
    fontSize: 12,
  },
});