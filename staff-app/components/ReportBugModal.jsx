import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { reportBug } from "../services/api";

const CATEGORIES = [
  "Inspection & Checklist",
  "Camera & Photo Upload",
  "Records & History",
  "Network & Sync",
  "App UI / Display",
  "Other Issue",
];

export default function ReportBugModal({ visible, onClose }) {
  const { theme } = useTheme();
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert("Required", "Please describe the problem you encountered.");
      return;
    }

    try {
      setSubmitting(true);
      await reportBug({
        category,
        description: description.trim(),
        deviceInfo: "Inspector Staff App (Mobile)",
      });
      Alert.alert(
        "Bug Report Submitted",
        "Thank you! Your feedback has been logged and our tech team has been notified.",
        [{ text: "OK", onPress: onClose }]
      );
      setDescription("");
      setCategory(CATEGORIES[0]);
    } catch {
      Alert.alert("Error", "Could not submit bug report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {/* Header */}
          <View
            style={[
              styles.header,
              { backgroundColor: theme.surface, borderBottomColor: theme.border },
            ]}
          >
            <View style={styles.titleWrap}>
              <View style={styles.iconCircle}>
                <Ionicons name="bug-outline" size={18} color="#C52227" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Report a Bug</Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: theme.border },
                pressed && styles.pressed,
              ]}
              onPress={onClose}
            >
              <Ionicons name="close" size={20} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.label, { color: theme.secondaryText }]}>
              Issue Category
            </Text>
            <View style={styles.categoriesWrap}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryChip,
                    { borderColor: theme.border, backgroundColor: theme.cardSecondary },
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: theme.secondaryText },
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: theme.secondaryText, marginTop: 12 }]}>
              Description *
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: theme.cardSecondary,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="What happened? Steps to reproduce the issue..."
              placeholderTextColor={theme.secondaryText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
            />

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                submitting && styles.disabledBtn,
                pressed && styles.pressed,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={17} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
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
  card: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 18,
  },
  contentContainer: {
    paddingTop: 16,
    paddingBottom: 20,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  categoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryChipActive: {
    backgroundColor: "#C52227",
    borderColor: "#C52227",
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  categoryChipTextActive: {
    color: "#FFFFFF",
  },
  textArea: {
    minHeight: 110,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
  },
  submitBtn: {
    height: 48,
    backgroundColor: "#C52227",
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.75,
  },
});
