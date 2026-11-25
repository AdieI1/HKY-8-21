import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import Ionicons from "@expo/vector-icons/Ionicons";
import { saveDeliveryChecklist } from "../services/api";

const STAGE_CONFIG = {
  pre_loading: {
    title: "Pre-Loading Cargo Check",
    subtitle: "Verify cargo condition & truck bed before loading",
    icon: "cube-outline",
    confirmLabel: "Confirm & Start Loading",
    locationLabel: "Pick-up",
    items: [
      { id: "manifest_verified", label: "Cargo matches item name, type & quantity" },
      { id: "packaging_intact", label: "Packaging & labels intact (no pre-existing damage)" },
      { id: "handling_checked", label: "Fragile / special handling requirements verified" },
      { id: "cargo_bay_ready", label: "Cargo bay is clean, dry & ready for loading" },
      { id: "securing_gear_ready", label: "Straps, ropes & protective tarps ready" },
    ],
  },
  post_loading: {
    title: "Post-Loading Cargo Check",
    subtitle: "Confirm cargo is loaded safely & secured for transit",
    icon: "shield-checkmark-outline",
    confirmLabel: "Confirm & Depart to Drop-off",
    locationLabel: "Pick-up",
    items: [
      { id: "all_items_loaded", label: "All cargo items completely loaded" },
      { id: "weight_balanced", label: "Cargo weight evenly distributed & balanced" },
      { id: "cargo_secured", label: "Cargo tightly strapped & secured against shifting" },
      { id: "cargo_protected", label: "Fragile items protected & weather-covered" },
      { id: "doors_locked_sealed", label: "Cargo doors, locks & seals closed securely" },
    ],
  },
  pre_unloading: {
    title: "Pre-Unloading Cargo Check",
    subtitle: "Inspect cargo condition upon arrival before unloading",
    icon: "clipboard-outline",
    confirmLabel: "Confirm & Start Unloading",
    locationLabel: "Drop-off",
    items: [
      { id: "seal_locks_intact", label: "Cargo doors, locks & seals intact upon arrival" },
      { id: "no_transit_shift", label: "Cargo remained stable with no major shifting" },
      { id: "no_transit_damage", label: "No visible transit damage, leaks or moisture" },
      { id: "unload_area_safe", label: "Drop-off unloading area is safe & accessible" },
      { id: "receiver_present", label: "Customer or authorized receiver present" },
    ],
  },
  post_unloading: {
    title: "Post-Unloading Cargo Check",
    subtitle: "Verify complete & safe cargo handover before POD",
    icon: "checkmark-done-outline",
    confirmLabel: "Confirm & Proceed to POD",
    locationLabel: "Drop-off",
    items: [
      { id: "all_items_unloaded", label: "All cargo items completely unloaded" },
      { id: "good_condition_handover", label: "Cargo handed over in good condition" },
      { id: "cargo_bay_empty", label: "Cargo bay checked & confirmed completely empty" },
      { id: "securing_gear_stowed", label: "Straps & securing equipment stowed back" },
      { id: "receiver_acknowledged", label: "Cargo condition confirmed with receiver" },
    ],
  },
};

export default function CargoChecklistModal({
  visible,
  stage,
  delivery,
  onClose,
  onSuccess,
}) {
  const config = STAGE_CONFIG[stage] || STAGE_CONFIG.pre_loading;

  const [itemStates, setItemStates] = useState({});
  const [photos, setPhotos] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setItemStates({});
      setPhotos([]);
      setRemarks("");
      setSubmitting(false);
    }
  }, [visible, stage]);

  // Recover photo if Android killed/recreated Activity while camera was open
  useEffect(() => {
    if (!visible || Platform.OS !== "android") return;
    let active = true;
    ImagePicker.getPendingResultAsync?.()
      .then((results) => {
        if (!active || !Array.isArray(results) || results.length === 0) return;
        const latest = results[0];
        if (latest && !latest.canceled && latest.assets?.[0]?.uri) {
          const asset = latest.assets[0];
          setPhotos((prev) => [
            ...prev.slice(0, 2),
            {
              uri: asset.uri,
              fileName: asset.fileName || `cargo-${stage}-${Date.now()}.jpg`,
              mimeType: asset.mimeType || "image/jpeg",
            },
          ]);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [visible, stage]);

  const deliveryId = delivery?.delivery_id || delivery?.id;
  const cargoName =
    delivery?.request?.item_name ||
    delivery?.cargo ||
    delivery?.request?.cargo_type ||
    "Cargo";
  const cargoType = delivery?.request?.cargo_type || delivery?.cargo || "General Cargo";
  const isDropoffStage = stage === "pre_unloading" || stage === "post_unloading";
  const locationText = isDropoffStage
    ? delivery?.dropoff || delivery?.request?.dropoff_address || "Drop-off Location"
    : delivery?.pickup || delivery?.request?.pickup_address || "Pick-up Location";

  const totalCount = config.items.length;

  const answeredCount = useMemo(
    () =>
      config.items.filter(
        (it) => itemStates[it.id] === "pass" || itemStates[it.id] === "issue"
      ).length,
    [config.items, itemStates]
  );

  const issueCount = useMemo(
    () => config.items.filter((it) => itemStates[it.id] === "issue").length,
    [config.items, itemStates]
  );

  const allAnswered = answeredCount === totalCount;
  const allPassed =
    allAnswered && config.items.every((it) => itemStates[it.id] === "pass");

  const handleToggleItem = (id, status) => {
    if (submitting) return;
    setItemStates((prev) => ({
      ...prev,
      [id]: prev[id] === status ? null : status,
    }));
  };

  const handleMarkAllGood = () => {
    if (submitting) return;
    const next = {};
    config.items.forEach((it) => {
      next[it.id] = "pass";
    });
    setItemStates(next);
  };

  const handleTakePhoto = async () => {
    if (photos.length >= 3) {
      Alert.alert("Limit Reached", "You can attach up to 3 photos per checklist.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera Permission Required",
          "Permission to access camera is required to take cargo proof photos."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.35,
        exif: false,
        base64: false,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        setPhotos((prev) => [
          ...prev,
          {
            uri: asset.uri,
            fileName: asset.fileName || `cargo-${stage}-${Date.now()}.jpg`,
            mimeType: asset.mimeType || "image/jpeg",
          },
        ]);
      }
    } catch {
      Alert.alert("Camera Error", "Could not capture photo. Please try again.");
    }
  };

  const handleRemovePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSubmit = allAnswered && photos.length > 0;

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!allAnswered) {
      Alert.alert(
        "Checklist Incomplete",
        `Please check all ${totalCount} cargo items before continuing.`
      );
      return;
    }

    if (photos.length === 0) {
      Alert.alert(
        "Photo Proof Required",
        "Please take at least one photo proof of the cargo condition before continuing."
      );
      return;
    }

    if (!deliveryId) {
      Alert.alert("Error", "Delivery reference not found.");
      return;
    }

    try {
      setSubmitting(true);

      const itemsPayload = {};
      config.items.forEach((it) => {
        itemsPayload[it.id] = itemStates[it.id] === "pass";
      });

      const payload = {
        type: stage,
        items: itemsPayload,
        photos,
      };

      if (remarks.trim()) {
        payload.remarks = remarks.trim();
      }

      const result = await saveDeliveryChecklist(deliveryId, payload);

      if (onSuccess) {
        await onSuccess(stage, result?.delivery || result);
      }
    } catch (err) {
      Alert.alert(
        "Checklist Failed",
        err?.message || "Could not save cargo checklist. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <View style={styles.iconBadge}>
                <Ionicons name={config.icon} size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.headerTitle}>{config.title}</Text>
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {config.subtitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              disabled={submitting}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Compact Cargo Summary Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="cube-outline" size={17} color="#B91F27" />
                <Text style={styles.infoLabel}>Cargo:</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {cargoName}
                  {cargoType && cargoType !== cargoName ? ` (${cargoType})` : ""}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={17} color="#B91F27" />
                <Text style={styles.infoLabel}>{config.locationLabel}:</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {locationText}
                </Text>
              </View>
            </View>

            {/* Checklist Header + Quick Shortcut */}
            <View style={styles.checklistHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>
                  Cargo Safety & Quality ({answeredCount}/{totalCount})
                </Text>
                <Text style={styles.sectionHelp}>
                  Tap ✓ for Good or ✕ if an issue is spotted.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.allGoodBtn, allPassed && styles.allGoodBtnActive]}
                onPress={handleMarkAllGood}
                activeOpacity={0.8}
                disabled={submitting}
              >
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={allPassed ? "#FFFFFF" : "#B91F27"}
                />
                <Text
                  style={[
                    styles.allGoodText,
                    allPassed && styles.allGoodTextActive,
                  ]}
                >
                  All Good
                </Text>
              </TouchableOpacity>
            </View>

            {/* Checklist Items Card */}
            <View style={styles.checklistCard}>
              {config.items.map((item, idx) => {
                const status = itemStates[item.id];
                const isPass = status === "pass";
                const isIssue = status === "issue";
                const isLast = idx === config.items.length - 1;

                return (
                  <View
                    key={item.id}
                    style={[styles.checkRow, !isLast && styles.checkRowBorder]}
                  >
                    <Text style={styles.checkLabel}>{item.label}</Text>

                    <View style={styles.checkActions}>
                      <TouchableOpacity
                        style={[
                          styles.checkBox,
                          isPass && styles.passBoxActive,
                        ]}
                        onPress={() => handleToggleItem(item.id, "pass")}
                        activeOpacity={0.75}
                        disabled={submitting}
                      >
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color={isPass ? "#FFFFFF" : "#9CA3AF"}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.checkBox,
                          isIssue && styles.issueBoxActive,
                        ]}
                        onPress={() => handleToggleItem(item.id, "issue")}
                        activeOpacity={0.75}
                        disabled={submitting}
                      >
                        <Ionicons
                          name="close"
                          size={15}
                          color={isIssue ? "#FFFFFF" : "#9CA3AF"}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Warning Notice if any item flagged as Issue */}
            {issueCount > 0 && (
              <View style={styles.issueNotice}>
                <Ionicons name="alert-circle" size={18} color="#B45309" />
                <Text style={styles.issueNoticeText}>
                  {issueCount} item{issueCount > 1 ? "s" : ""} flagged with an issue. Add remarks below so dispatch is informed.
                </Text>
              </View>
            )}

            {/* Required Cargo Photo Proof */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Cargo Photo Proof <Text style={styles.requiredTag}>*</Text>
              </Text>
              <Text style={styles.photoHelp}>
                Take at least 1 photo of the cargo / truck bay as proof ({photos.length}/3).
              </Text>

              {photos.length > 0 && (
                <View style={styles.photoGrid}>
                  {photos.map((p, idx) => (
                    <View key={`${p.uri}-${idx}`} style={styles.photoThumbWrap}>
                      <Image source={{ uri: p.uri }} style={styles.photoThumb} contentFit="cover" />
                      <TouchableOpacity
                        style={styles.removePhotoBtn}
                        onPress={() => handleRemovePhoto(idx)}
                        disabled={submitting}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {photos.length < 3 && (
                <TouchableOpacity
                  style={[styles.cameraButton, photos.length === 0 && styles.cameraButtonRequired]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                  disabled={submitting}
                >
                  <Ionicons name="camera" size={18} color="#B91F27" />
                  <Text style={styles.cameraButtonText}>
                    {photos.length === 0 ? "Take Photo Proof (Required)" : "Take Another Photo"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Optional Remarks */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Cargo Remarks <Text style={styles.optionalTag}>(Optional)</Text>
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Note any cargo condition details or concerns..."
                placeholderTextColor="#9CA3AF"
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!submitting}
              />
            </View>

            {/* Primary Confirm Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!canSubmit || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!canSubmit || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Saving Checklist...</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>{config.confirmLabel}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Secondary Cancel */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Back to Navigation</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#F9FAFB",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#951F21",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#FECACA",
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    gap: 7,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4B5563",
    width: 66,
  },
  infoValue: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  checklistHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  sectionHelp: {
    fontSize: 11.5,
    color: "#6B7280",
    marginTop: 2,
  },
  allGoodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#B91F27",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  allGoodBtnActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  allGoodText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#B91F27",
  },
  allGoodTextActive: {
    color: "#FFFFFF",
  },
  checklistCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 11,
    gap: 12,
  },
  checkRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    lineHeight: 18,
  },
  checkActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  passBoxActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981",
  },
  issueBoxActive: {
    backgroundColor: "#EF4444",
    borderColor: "#EF4444",
  },
  issueNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  issueNoticeText: {
    fontSize: 12,
    color: "#92400E",
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  optionalTag: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "400",
  },
  requiredTag: {
    fontSize: 13,
    color: "#DC2626",
    fontWeight: "700",
  },
  photoHelp: {
    fontSize: 11.5,
    color: "#6B7280",
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  photoThumbWrap: {
    width: 82,
    height: 82,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    position: "relative",
    backgroundColor: "#E5E7EB",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  cameraButtonRequired: {
    borderStyle: "dashed",
    borderColor: "#B91F27",
    backgroundColor: "#FEF2F2",
  },
  cameraButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91F27",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: "#111827",
  },
  textArea: {
    minHeight: 58,
  },
  submitButton: {
    backgroundColor: "#B91F27",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#B91F27",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#D1D5DB",
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600",
  },
});
